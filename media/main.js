// Enhanced Claude Chat WebView JavaScript with Type-Safe Communication
(function() {
    'use strict';

    // VS Code API
    const vscode = acquireVsCodeApi();

    // Communication constants
    const MESSAGE_TYPES = {
        // To extension
        SEND_MESSAGE: 'sendMessage',
        GET_STATUS: 'getStatus', 
        CLEAR_HISTORY: 'clearHistory',
        PING: 'ping',
        
        // From extension
        MESSAGE_RESPONSE: 'messageResponse',
        STATUS_UPDATE: 'statusUpdate',
        ERROR: 'error',
        PONG: 'pong',
        HISTORY_CLEARED: 'historyCleared'
    };

    const ERROR_CODES = {
        NO_TERMINAL: 'NO_TERMINAL',
        TERMINAL_BUSY: 'TERMINAL_BUSY',
        CLAUDE_CLI_NOT_FOUND: 'CLAUDE_CLI_NOT_FOUND',
        MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
        RATE_LIMITED: 'RATE_LIMITED',
        COMMUNICATION_ERROR: 'COMMUNICATION_ERROR',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    };

    // DOM Elements
    let messageInput = null;
    let sendButton = null;
    let clearButton = null;
    let chatMessages = null;
    let statusIndicator = null;
    let statusText = null;
    let typingIndicator = null;
    let loadingOverlay = null;
    let toastContainer = null;
    let charCount = null;
    let welcomeTime = null;

    // State
    let isLoading = false;
    let messageHistory = [];
    let pendingMessages = new Map();
    let commandQueue = [];
    let batchProcessing = false;
    let connectionStatus = 'disconnected';
    let lastPingTime = 0;
    let pingInterval = null;

    const STORAGE_KEY = 'claude-chat-history';
    const MAX_MESSAGE_LENGTH = 8000;
    const PING_INTERVAL = 10000; // 10 seconds
    const MESSAGE_TIMEOUT = 30000; // 30 seconds

    /**
     * Generate unique message ID
     */
    function generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Queue command for batch processing
     */
    function queueCommand(type, payload = {}) {
        commandQueue.push({ type, payload, timestamp: Date.now() });
        
        if (!batchProcessing) {
            processBatch();
        }
    }

    /**
     * Process command queue in batches
     */
    async function processBatch() {
        if (batchProcessing || commandQueue.length === 0) return;
        
        batchProcessing = true;
        
        try {
            while (commandQueue.length > 0) {
                const command = commandQueue.shift();
                await sendWithResponse(command.type, command.payload);
                
                // Small delay between commands to avoid overwhelming
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        } catch (error) {
            console.error('Batch processing error:', error);
        } finally {
            batchProcessing = false;
        }
    }

    /**
     * Send type-safe message to extension
     */
    function sendToExtension(type, payload = null, messageId = null) {
        const id = messageId || generateMessageId();
        const message = {
            type,
            payload,
            messageId: id
        };

        console.log('📤 Sending to extension:', message);
        vscode.postMessage(message);
        
        return id;
    }

    /**
     * Send message with response tracking
     */
    function sendWithResponse(type, payload = null, timeout = MESSAGE_TIMEOUT) {
        return new Promise((resolve, reject) => {
            const messageId = generateMessageId();
            
            console.log(`📤 sendWithResponse: type=${type}, messageId=${messageId}`);
            
            // Store pending message
            pendingMessages.set(messageId, {
                resolve,
                reject,
                timestamp: Date.now(),
                type
            });
            
            console.log(`📦 Stored pending message: ${messageId}`);
            console.log(`📦 Total pending messages: ${pendingMessages.size}`);

            // Set timeout
            const timeoutId = setTimeout(() => {
                if (pendingMessages.has(messageId)) {
                    console.warn(`⏱️ Message timeout: ${type} (${messageId})`);
                    pendingMessages.delete(messageId);
                    reject(new Error(`Message timeout: ${type}`));
                }
            }, timeout);

            // Send message
            sendToExtension(type, payload, messageId);
        });
    }

    /**
     * Handle messages from extension
     */
    function handleExtensionMessage(event) {
        const message = event.data;
        
        console.log('📥 Raw message from extension:', JSON.stringify(message));
        
        if (!message || !message.type) {
            console.warn('⚠️ Invalid message from extension:', message);
            return;
        }

        console.log('📥 Received from extension:', message);
        console.log('📥 Message ID:', message.messageId);
        console.log('📥 Pending messages:', Array.from(pendingMessages.keys()));

        // Handle response messages
        if (message.messageId && pendingMessages.has(message.messageId)) {
            console.log('✅ Found pending message for ID:', message.messageId);
            const pendingMessage = pendingMessages.get(message.messageId);
            pendingMessages.delete(message.messageId);
            
            if (message.type === MESSAGE_TYPES.ERROR) {
                console.log('❌ Rejecting with error:', message.payload);
                pendingMessage.reject(new Error(message.payload.message));
            } else {
                console.log('✅ Resolving with payload:', message.payload);
                pendingMessage.resolve(message.payload);
            }
            return;
        } else if (message.messageId) {
            console.warn('⚠️ No pending message found for ID:', message.messageId);
        }

        // Handle broadcast messages
        switch (message.type) {
            case MESSAGE_TYPES.STATUS_UPDATE:
                handleStatusUpdate(message.payload);
                break;
                
            case MESSAGE_TYPES.ERROR:
                handleError(message.payload);
                break;
                
            case MESSAGE_TYPES.PONG:
                handlePong(message.payload);
                break;
                
            case MESSAGE_TYPES.HISTORY_CLEARED:
                handleHistoryCleared(message.payload);
                break;
                
            case 'clearHistory':
                if (message.payload?.forced) {
                    clearChatHistory(true);
                }
                break;
                
            default:
                console.warn('🤷 Unknown message type from extension:', message.type);
        }
    }

    /**
     * Handle status update from extension
     */
    function handleStatusUpdate(payload) {
        const { status, terminalActive, claudeCliRunning } = payload;
        
        connectionStatus = status;
        
        let statusText = 'Неизвестно';
        let statusClass = 'unknown';
        
        switch (status) {
            case 'ready':
                statusText = terminalActive ? 'Готов' : 'Нет терминала';
                statusClass = terminalActive ? 'ready' : 'warning';
                break;
            case 'busy':
                statusText = 'Занято';
                statusClass = 'busy';
                break;
            case 'error':
                statusText = 'Ошибка';
                statusClass = 'error';
                break;
            case 'disconnected':
                statusText = 'Отключено';
                statusClass = 'disconnected';
                break;
        }
        
        updateStatus(statusClass, statusText);
        
        // Update send button state
        updateSendButtonState();
    }

    /**
     * Handle error from extension
     */
    function handleError(payload) {
        const { code, message, recoverable } = payload;
        
        console.error('❌ Extension error:', payload);
        
        let userMessage = message;
        let toastType = 'error';
        
        switch (code) {
            case ERROR_CODES.NO_TERMINAL:
                userMessage = 'Откройте терминал с Claude Code CLI';
                toastType = 'warning';
                break;
            case ERROR_CODES.MESSAGE_TOO_LONG:
                userMessage = `Сообщение слишком длинное (макс. ${MAX_MESSAGE_LENGTH} символов)`;
                toastType = 'warning';
                break;
            case ERROR_CODES.CLAUDE_CLI_NOT_FOUND:
                userMessage = 'Claude Code CLI не найден в терминале';
                toastType = 'warning';
                break;
        }
        
        showToast(userMessage, toastType);
        updateStatus('error', 'Ошибка');
        setLoadingState(false);
    }

    /**
     * Handle pong response
     */
    function handlePong(payload) {
        lastPingTime = payload.timestamp;
        connectionStatus = 'ready';
        console.log('🏓 Pong received, connection alive');
    }

    /**
     * Handle history cleared confirmation
     */
    function handleHistoryCleared(payload) {
        if (payload.success) {
            clearChatDisplay();
            showToast('История очищена', 'success');
        }
    }

    /**
     * Initialize the chat interface
     */
    function initializeChat() {
        try {
            console.log('🚀 Initializing Claude Chat interface...');
        console.log('🚀 VS Code API available:', !!vscode);
        console.log('🚀 Window object:', window);
        console.log('🚀 Document ready state:', document.readyState);
            
            // Get DOM elements
            messageInput = document.getElementById('messageInput');
            sendButton = document.getElementById('sendButton');
            clearButton = document.getElementById('clearButton');
            chatMessages = document.getElementById('chatMessages');
            statusIndicator = document.getElementById('statusIndicator');
            statusText = document.getElementById('statusText');
            typingIndicator = document.getElementById('typingIndicator');
            loadingOverlay = document.getElementById('loadingOverlay');
            toastContainer = document.getElementById('toastContainer');
            charCount = document.getElementById('charCount');
            welcomeTime = document.getElementById('welcomeTime');

            // Validate required elements
            if (!messageInput || !sendButton || !chatMessages) {
                throw new Error('Required DOM elements not found');
            }

            console.log('✅ DOM elements found successfully');

            // Setup event listeners
            setupEventListeners();

            // Initialize welcome message time
            if (welcomeTime) {
                welcomeTime.textContent = new Date().toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            // Load chat history
            loadChatHistory();

            // Focus input
            messageInput.focus();

            // Start ping mechanism
            startPingMechanism();

            // Request initial status with response tracking
            console.log('📊 Requesting initial status...');
            sendWithResponse(MESSAGE_TYPES.GET_STATUS)
                .then(status => {
                    console.log('📊 Initial status received:', status);
                })
                .catch(error => {
                    console.error('❌ Failed to get initial status:', error);
                    // Fallback to broadcast status request
                    sendToExtension(MESSAGE_TYPES.GET_STATUS);
                });

            console.log('🎉 Chat interface initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize chat:', error);
            showToast('Ошибка инициализации чата', 'error');
        }
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        console.log('🔗 Setting up event listeners...');

        // Send button click
        sendButton.addEventListener('click', handleSendMessage);

        // Clear button click
        if (clearButton) {
            clearButton.addEventListener('click', handleClearHistory);
        }

        // Input events
        messageInput.addEventListener('input', handleInputChange);
        messageInput.addEventListener('keydown', handleKeyDown);
        messageInput.addEventListener('paste', handlePaste);

        // Auto-resize textarea
        messageInput.addEventListener('input', autoResizeTextarea);

        // Message from extension
        console.log('🔗 Setting up window message listener...');
        window.addEventListener('message', handleExtensionMessage);
        console.log('🔗 Window message listener added');
        
        // Test that handler works
        console.log('🔗 Testing message handler with dummy event...');
        try {
            handleExtensionMessage({ data: { type: 'test', payload: 'test' } });
        } catch (e) {
            console.error('❌ Error in test handler:', e);
        }

        // Focus events
        messageInput.addEventListener('focus', () => {
            messageInput.parentElement.classList.add('focused');
        });

        messageInput.addEventListener('blur', () => {
            messageInput.parentElement.classList.remove('focused');
        });

        console.log('✅ Event listeners setup complete');
    }

    /**
     * Handle input changes
     */
    function handleInputChange() {
        const text = messageInput.value;
        const length = text.length;

        // Update character counter
        if (charCount) {
            charCount.textContent = length;
            
            // Color coding for character limit
            charCount.className = '';
            if (length > MAX_MESSAGE_LENGTH * 0.9) {
                charCount.classList.add('char-count-danger');
            } else if (length > MAX_MESSAGE_LENGTH * 0.7) {
                charCount.classList.add('char-count-warning');
            } else {
                charCount.classList.add('char-count-normal');
            }
        }

        // Update send button state
        updateSendButtonState();
    }

    /**
     * Update send button state
     */
    function updateSendButtonState() {
        const text = messageInput.value;
        const length = text.length;
        const canSend = text.trim().length > 0 && 
                       length <= MAX_MESSAGE_LENGTH && 
                       !isLoading && 
                       connectionStatus === 'ready';

        sendButton.disabled = !canSend;
        
        if (canSend) {
            sendButton.classList.add('ready');
        } else {
            sendButton.classList.remove('ready');
        }
    }

    /**
     * Handle keyboard events
     */
    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            if (event.shiftKey) {
                // Shift+Enter: new line (default behavior)
                return;
            } else {
                // Enter: send message
                event.preventDefault();
                handleSendMessage();
            }
        } else if (event.key === 'Escape') {
            // Clear input
            messageInput.value = '';
            handleInputChange();
            autoResizeTextarea();
        } else if (event.ctrlKey && event.key === 'k') {
            // Ctrl+K: clear history
            event.preventDefault();
            handleClearHistory();
        }
    }

    /**
     * Handle paste events
     */
    function handlePaste(event) {
        // Allow paste but validate length after
        setTimeout(() => {
            handleInputChange();
            autoResizeTextarea();
        }, 0);
    }

    /**
     * Auto-resize textarea
     */
    function autoResizeTextarea() {
        messageInput.classList.add('textarea-auto-resize');
        const newHeight = Math.min(messageInput.scrollHeight, 120);
        messageInput.style.height = newHeight + 'px'; // This is safe - just height value
    }

    /**
     * Handle send message
     */
    async function handleSendMessage() {
        const text = messageInput.value.trim();
        
        if (!text || isLoading || connectionStatus !== 'ready') {
            return;
        }

        if (text.length > MAX_MESSAGE_LENGTH) {
            showToast(`Сообщение слишком длинное (макс. ${MAX_MESSAGE_LENGTH} символов)`, 'warning');
            return;
        }

        try {
            console.log('📨 Sending message:', text);
            
            // Add message to UI immediately
            addMessageToChat('user', text);
            
            // Clear input
            messageInput.value = '';
            handleInputChange();
            autoResizeTextarea();
            
            // Set loading state
            setLoadingState(true);
            updateStatus('sending', 'Отправка...');
            
            // Send to extension with response tracking
            const response = await sendWithResponse(MESSAGE_TYPES.SEND_MESSAGE, {
                text: text,
                timestamp: Date.now()
            });

            console.log('✅ Message sent successfully:', response);
            showToast('Сообщение отправлено', 'success', 1000);
            
            // Update status after successful send
            updateStatus('ready', 'Готов');
            
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            showToast(error.message || 'Ошибка отправки сообщения', 'error');
            
            // Remove message from UI on error
            removeLastUserMessage();
            
        } finally {
            setLoadingState(false);
            sendToExtension(MESSAGE_TYPES.GET_STATUS); // Refresh status
        }
    }

    /**
     * Handle clear history
     */
    async function handleClearHistory() {
        if (!confirm('Очистить историю чата?')) {
            return;
        }

        try {
            await sendWithResponse(MESSAGE_TYPES.CLEAR_HISTORY, { confirm: true });
        } catch (error) {
            console.error('❌ Failed to clear history:', error);
            showToast('Ошибка очистки истории', 'error');
        }
    }

    /**
     * Add message to chat
     */
    function addMessageToChat(role, text, timestamp = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.setAttribute('role', 'article');
        messageDiv.setAttribute('aria-label', `${role === 'user' ? 'Пользователь' : 'Ассистент'} сообщение`);

        const time = timestamp ? new Date(timestamp) : new Date();
        const timeString = time.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            <div class="message-avatar" aria-hidden="true">
                <span class="avatar-icon">${role === 'user' ? '👤' : '🤖'}</span>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${role === 'user' ? 'Вы' : 'Claude'}</span>
                    <time class="message-time">${timeString}</time>
                </div>
                <div class="message-text">
                    <p>${escapeHtml(text)}</p>
                </div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        scrollToBottom();

        // Save to history
        messageHistory.push({
            role,
            text,
            timestamp: time.getTime()
        });
        
        saveChatHistory();
    }

    /**
     * Remove last user message (for error handling)
     */
    function removeLastUserMessage() {
        const messages = chatMessages.querySelectorAll('.message.user');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            lastMessage.remove();
            
            // Remove from history
            for (let i = messageHistory.length - 1; i >= 0; i--) {
                if (messageHistory[i].role === 'user') {
                    messageHistory.splice(i, 1);
                    break;
                }
            }
            saveChatHistory();
        }
    }

    /**
     * Clear chat display
     */
    function clearChatDisplay() {
        // Remove all messages except welcome
        const messages = chatMessages.querySelectorAll('.message:not(.welcome-message .message)');
        messages.forEach(msg => msg.remove());
        
        messageHistory = [];
        saveChatHistory();
    }

    /**
     * Clear chat history (can be called externally)
     */
    function clearChatHistory(forced = false) {
        if (forced) {
            clearChatDisplay();
            showToast('История чата очищена', 'success');
        } else {
            // Ask for confirmation
            if (confirm('Вы уверены, что хотите очистить историю чата?')) {
                clearChatDisplay();
                showToast('История чата очищена', 'success');
            }
        }
    }

    /**
     * Set loading state
     */
    function setLoadingState(loading) {
        isLoading = loading;
        
        updateSendButtonState();

        if (sendButton) {
            if (loading) {
                sendButton.querySelector('.button-text').textContent = 'Отправка...';
                sendButton.classList.add('loading');
            } else {
                sendButton.querySelector('.button-text').textContent = 'Отправить';
                sendButton.classList.remove('loading');
            }
        }

        if (loadingOverlay) {
            loadingOverlay.className = loading ? 'loading-visible' : 'loading-hidden';
            loadingOverlay.setAttribute('aria-hidden', !loading);
        }

        console.log(`🔄 Loading state: ${loading}`);
    }

    /**
     * Update status indicator
     */
    function updateStatus(status, text) {
        if (statusIndicator && statusText) {
            statusText.textContent = text;
            
            // Remove all status classes
            statusIndicator.className = 'status-indicator';
            
            // Add specific status class
            switch (status) {
                case 'ready':
                    statusIndicator.classList.add('status-ready');
                    break;
                case 'sending':
                case 'busy':
                    statusIndicator.classList.add('status-busy');
                    break;
                case 'error':
                    statusIndicator.classList.add('status-error');
                    break;
                case 'warning':
                    statusIndicator.classList.add('status-warning');
                    break;
                default:
                    statusIndicator.classList.add('status-disconnected');
            }
        }
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info', duration = 3000) {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');

        toastContainer.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('toast-slide-out');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toastContainer.removeChild(toast);
                    }
                }, 300);
            }
        }, duration);

        console.log(`🍞 Toast: ${type} - ${message}`);
    }

    /**
     * Scroll to bottom of chat
     */
    function scrollToBottom() {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    /**
     * Start ping mechanism
     */
    function startPingMechanism() {
        if (pingInterval) {
            clearInterval(pingInterval);
        }
        
        pingInterval = setInterval(() => {
            sendToExtension(MESSAGE_TYPES.PING);
        }, PING_INTERVAL);
    }

    /**
     * Load chat history from storage
     */
    function loadChatHistory() {
        try {
            const state = vscode.getState();
            const history = state?.messageHistory || [];
            
            history.forEach(msg => {
                addMessageToChat(msg.role, msg.text, msg.timestamp);
            });
            
            messageHistory = history;
            console.log(`📚 Loaded ${history.length} messages from history`);
            
        } catch (error) {
            console.error('❌ Failed to load chat history:', error);
        }
    }

    /**
     * Save chat history to storage
     */
    function saveChatHistory() {
        try {
            vscode.setState({
                messageHistory: messageHistory
            });
        } catch (error) {
            console.error('❌ Failed to save chat history:', error);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize when DOM is ready
    console.log('📍 Script loaded, readyState:', document.readyState);
    
    if (document.readyState === 'loading') {
        console.log('📍 Adding DOMContentLoaded listener');
        document.addEventListener('DOMContentLoaded', initializeChat);
    } else {
        console.log('📍 DOM already ready, initializing immediately');
        initializeChat();
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        if (pingInterval) {
            clearInterval(pingInterval);
        }
    });

})();