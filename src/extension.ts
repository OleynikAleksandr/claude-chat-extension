import * as vscode from 'vscode';
import {
    WebviewToExtensionMessage,
    ExtensionToWebviewMessage,
    SendMessagePayload,
    MessageResponsePayload,
    StatusUpdatePayload,
    ErrorPayload,
    TerminalStatus,
    ErrorCode
} from './types';
import { TerminalManager, TerminalSelectionStrategy } from './terminalManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Claude Chat extension activation started!');
    
    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('Claude Chat');
    outputChannel.appendLine('🔥 Claude Chat Extension - Activation Started');
    outputChannel.appendLine(`Extension URI: ${context.extensionUri.toString()}`);
    outputChannel.show();

    // Register command to open chat
    const openChatCommand = vscode.commands.registerCommand('claudeChat.openChat', () => {
        outputChannel.appendLine('📂 Opening chat panel...');
        console.log('📂 Opening chat panel...');
        vscode.commands.executeCommand('workbench.view.extension.claude-chat-container');
    });

    // Initialize Terminal Manager
    outputChannel.appendLine('🔧 Initializing Terminal Manager...');
    const terminalManager = new TerminalManager({
        fallbackBehavior: 'ask_user',
        preferredTerminalNames: ['claude', 'claude-cli', 'claude-code', 'main'],
        maxRetryAttempts: 2
    });
    outputChannel.appendLine('✅ Terminal Manager initialized');

    // Register command to send message with enhanced terminal handling
    const sendMessageCommand = vscode.commands.registerCommand('claudeChat.sendMessage', async (message: string) => {
        try {
            const result = await terminalManager.sendMessageToClaudeCli(message);
            
            if (result.success) {
                vscode.window.showInformationMessage(`Message sent to Claude CLI: ${message}`);
            } else {
                const errorMsg = result.error?.message || 'Unknown error';
                vscode.window.showErrorMessage(`Failed to send message: ${errorMsg}`);
            }
        } catch (error) {
            console.error('Send message to Claude CLI failed:', error);
            vscode.window.showErrorMessage('Failed to send message to Claude CLI.');
        }
    });

    // Register webview provider with terminal manager
    outputChannel.appendLine('🌐 Creating webview provider...');
    const provider = new ClaudeChatViewProvider(context.extensionUri, terminalManager, outputChannel);
    
    outputChannel.appendLine('📝 Registering webview view provider...');
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('claudeChatView', provider)
    );
    outputChannel.appendLine('✅ Webview provider registered');

    // Register debug command for terminal status
    const debugTerminalsCommand = vscode.commands.registerCommand('claudeChat.debugTerminals', async () => {
        try {
            const allTerminals = await terminalManager.getAllTerminalsStatus();
            const statusInfo = allTerminals.map(({ terminal, status, health }) => 
                `${terminal.name}: Active=${status.hasActiveTerminal}, Claude=${status.claudeCliDetected}, Healthy=${health.isHealthy}`
            ).join('\n');
            
            vscode.window.showInformationMessage(
                `Terminal Status:\n${statusInfo}`,
                { modal: true }
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Debug failed: ${error}`);
        }
    });

    // Register quick send command
    const quickSendCommand = vscode.commands.registerCommand('claudeChat.quickSend', async () => {
        const input = await vscode.window.showInputBox({
            prompt: 'Введите сообщение для Claude',
            placeHolder: 'Ваше сообщение...',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Сообщение не может быть пустым';
                }
                if (value.length > 8000) {
                    return 'Сообщение слишком длинное (максимум 8000 символов)';
                }
                return null;
            }
        });

        if (input) {
            await vscode.commands.executeCommand('claudeChat.sendMessage', input.trim());
        }
    });

    // Register toggle panel command
    const togglePanelCommand = vscode.commands.registerCommand('claudeChat.togglePanel', async () => {
        await vscode.commands.executeCommand('workbench.view.extension.claude-chat-container');
    });

    // Register clear history command
    const clearHistoryCommand = vscode.commands.registerCommand('claudeChat.clearHistory', async () => {
        const result = await vscode.window.showWarningMessage(
            'Вы уверены, что хотите очистить историю чата?',
            { modal: true },
            'Да, очистить',
            'Отмена'
        );

        if (result === 'Да, очистить') {
            // Notify webview to clear history
            const webview = ClaudeChatViewProvider.getActiveWebview();
            if (webview) {
                await webview.postMessage({
                    type: 'clearHistory',
                    payload: { forced: true }
                });
            }
            vscode.window.showInformationMessage('История чата очищена');
        }
    });

    // Register show status command
    const showStatusCommand = vscode.commands.registerCommand('claudeChat.showStatus', async () => {
        try {
            const status = await terminalManager.getTerminalStatus(TerminalSelectionStrategy.CLAUDE_CLI);
            const versionInfo = await terminalManager.getClaudeCliVersion();
            
            const statusMessage = `Статус терминала:
• Активный терминал: ${status.hasActiveTerminal ? '✅ Да' : '❌ Нет'}
• Claude CLI запущен: ${status.claudeCliDetected ? '✅ Да' : '❌ Нет'}
• Имя терминала: ${status.terminalName || 'Не определено'}
• PID процесса: ${status.pid || 'Не определен'}
• Версия Claude CLI: ${versionInfo.version || 'Не определена'}`;

            vscode.window.showInformationMessage(statusMessage, { modal: true });
        } catch (error) {
            vscode.window.showErrorMessage(`Ошибка получения статуса: ${error}`);
        }
    });

    context.subscriptions.push(
        openChatCommand, 
        sendMessageCommand, 
        debugTerminalsCommand,
        quickSendCommand,
        togglePanelCommand,
        clearHistoryCommand,
        showStatusCommand
    );
    
    outputChannel.appendLine('🎊 All commands registered successfully!');
    outputChannel.appendLine('🚀 Claude Chat extension activation completed!');
    console.log('🚀 Claude Chat extension activation completed!');
}

export function deactivate() {}

class ClaudeChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'claudeChatView';
    public static currentPanel: vscode.WebviewPanel | undefined;
    private static terminalManager: TerminalManager;
    private static activeViewWebview: vscode.Webview | undefined;
    private static outputChannel: vscode.OutputChannel;
    private _webview: vscode.Webview | undefined;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        terminalManager: TerminalManager,
        outputChannel: vscode.OutputChannel
    ) {
        ClaudeChatViewProvider.terminalManager = terminalManager;
        ClaudeChatViewProvider.outputChannel = outputChannel;
        outputChannel.appendLine('🔧 ClaudeChatViewProvider constructor called');
    }

    public static getActiveWebview(): vscode.Webview | undefined {
        return ClaudeChatViewProvider.activeViewWebview;
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (ClaudeChatViewProvider.currentPanel) {
            ClaudeChatViewProvider.currentPanel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            ClaudeChatViewProvider.viewType,
            'Claude Chat',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        ClaudeChatViewProvider.currentPanel = panel;

        panel.webview.html = ClaudeChatViewProvider._getHtmlForWebview(panel.webview, extensionUri);

        // Create terminal manager for static context
        const staticTerminalManager = new TerminalManager({
            fallbackBehavior: 'ask_user',
            preferredTerminalNames: ['claude', 'claude-cli', 'claude-code', 'main']
        });

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async (message: WebviewToExtensionMessage) => {
                await ClaudeChatViewProvider.handleMessage(panel.webview, message, staticTerminalManager);
            }
        );

        // Reset when the panel is closed
        panel.onDidDispose(() => {
            ClaudeChatViewProvider.currentPanel = undefined;
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        ClaudeChatViewProvider.outputChannel.appendLine('🎯 resolveWebviewView called!');
        console.log('🎯 resolveWebviewView called!');

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        ClaudeChatViewProvider.outputChannel.appendLine('⚙️ Webview options set');

        ClaudeChatViewProvider.outputChannel.appendLine('📄 Setting webview HTML...');
        webviewView.webview.html = ClaudeChatViewProvider._getHtmlForWebview(webviewView.webview, this._extensionUri);
        ClaudeChatViewProvider.outputChannel.appendLine('✅ Webview HTML set');

        ClaudeChatViewProvider.outputChannel.appendLine('📨 Setting up message listener...');
        webviewView.webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
            ClaudeChatViewProvider.outputChannel.appendLine(`📩 Received message: ${message.type}`);
            await this.handleWebviewMessage(webviewView.webview, message);
        });
        
        // Store webview reference
        this._webview = webviewView.webview;
        ClaudeChatViewProvider.activeViewWebview = webviewView.webview;
        ClaudeChatViewProvider.outputChannel.appendLine('🔗 Webview reference stored');
        
        // Send initial status
        ClaudeChatViewProvider.outputChannel.appendLine('📊 Sending initial status...');
        this.sendStatusUpdate();
    }

    /**
     * Static message handler for panel webview
     */
    private static async handleMessage(webview: vscode.Webview, message: WebviewToExtensionMessage, terminalManager?: TerminalManager): Promise<void> {
        try {
            console.log('Received message from webview:', message.type);
            
            switch (message.type) {
                case 'sendMessage':
                    await ClaudeChatViewProvider.handleSendMessage(webview, message, terminalManager);
                    break;
                    
                case 'getStatus':
                    await ClaudeChatViewProvider.sendStatusUpdate(webview, terminalManager, message.messageId);
                    break;
                    
                case 'clearHistory':
                    await ClaudeChatViewProvider.handleClearHistory(webview, message);
                    break;
                    
                case 'ping':
                    await ClaudeChatViewProvider.handlePing(webview, message);
                    break;
                    
                default:
                    console.warn('Unknown message type:', message.type);
                    await ClaudeChatViewProvider.sendError(webview, {
                        code: ErrorCode.UNKNOWN_ERROR,
                        message: `Unknown message type: ${message.type}`,
                        recoverable: true
                    }, message.messageId);
            }
        } catch (error) {
            console.error('Error handling webview message:', error);
            await ClaudeChatViewProvider.sendError(webview, {
                code: ErrorCode.COMMUNICATION_ERROR,
                message: 'Failed to process message',
                details: error,
                recoverable: true
            }, message.messageId);
        }
    }

    /**
     * Instance message handler for view webview
     */
    private async handleWebviewMessage(webview: vscode.Webview, message: WebviewToExtensionMessage): Promise<void> {
        try {
            ClaudeChatViewProvider.outputChannel.appendLine(`🎯 Processing message: ${message.type} (ID: ${message.messageId})`);
            console.log('Received message from webview:', message.type);
            
            switch (message.type) {
                case 'sendMessage':
                    await this.handleSendMessage(webview, message);
                    break;
                    
                case 'getStatus':
                    ClaudeChatViewProvider.outputChannel.appendLine('📊 Handling getStatus request...');
                    await this.sendStatusUpdate(message.messageId);
                    ClaudeChatViewProvider.outputChannel.appendLine('✅ Status sent');
                    break;
                    
                case 'clearHistory':
                    await this.handleClearHistory(webview, message);
                    break;
                    
                case 'ping':
                    ClaudeChatViewProvider.outputChannel.appendLine('🏓 Handling ping request...');
                    await this.handlePing(webview, message);
                    ClaudeChatViewProvider.outputChannel.appendLine('🏓 Pong sent');
                    break;
                    
                default:
                    console.warn('Unknown message type:', message.type);
                    await this.sendError(webview, {
                        code: ErrorCode.UNKNOWN_ERROR,
                        message: `Unknown message type: ${message.type}`,
                        recoverable: true
                    }, message.messageId);
            }
        } catch (error) {
            console.error('Error handling webview message:', error);
            await this.sendError(webview, {
                code: ErrorCode.COMMUNICATION_ERROR,
                message: 'Failed to process message',
                details: error,
                recoverable: true
            }, message.messageId);
        }
    }
    
    /**
     * Static send message handler
     */
    private static async handleSendMessage(webview: vscode.Webview, message: WebviewToExtensionMessage, terminalManager?: TerminalManager): Promise<void> {
        ClaudeChatViewProvider.outputChannel.appendLine(`🎯 Static handleSendMessage started (ID: ${message.messageId})`);
        const payload = message.payload as SendMessagePayload;
        
        ClaudeChatViewProvider.outputChannel.appendLine(`📝 Payload text: "${payload?.text}" (length: ${payload?.text?.length || 0})`);
        
        if (!payload || !payload.text) {
            ClaudeChatViewProvider.outputChannel.appendLine(`❌ No payload or text (ID: ${message.messageId})`);
            await ClaudeChatViewProvider.sendError(webview, {
                code: ErrorCode.MESSAGE_TOO_LONG,
                message: 'Message text is required',
                recoverable: true
            }, message.messageId);
            return;
        }
        
        if (payload.text.length > 8000) {
            ClaudeChatViewProvider.outputChannel.appendLine(`❌ Message too long (ID: ${message.messageId})`);
            await ClaudeChatViewProvider.sendError(webview, {
                code: ErrorCode.MESSAGE_TOO_LONG,
                message: 'Message too long. Maximum length is 8000 characters',
                recoverable: true
            }, message.messageId);
            return;
        }
        
        ClaudeChatViewProvider.outputChannel.appendLine(`🔧 Starting terminal execution (ID: ${message.messageId})`);
        
        try {
            // Use terminal manager if available, otherwise fall back to old method
            if (terminalManager) {
                ClaudeChatViewProvider.outputChannel.appendLine(`🔌 Using terminal manager (ID: ${message.messageId})`);
                const result = await terminalManager.sendMessageToClaudeCli(payload.text);
                
                ClaudeChatViewProvider.outputChannel.appendLine(`📊 Terminal manager result: success=${result.success} (ID: ${message.messageId})`);
                
                if (!result.success) {
                    ClaudeChatViewProvider.outputChannel.appendLine(`❌ Terminal manager failed: ${result.error?.message} (ID: ${message.messageId})`);
                    await ClaudeChatViewProvider.sendError(webview, {
                        code: result.error?.code || ErrorCode.COMMUNICATION_ERROR,
                        message: result.error?.message || 'Failed to send message to Claude CLI',
                        recoverable: true
                    }, message.messageId);
                    return;
                }
                
                ClaudeChatViewProvider.outputChannel.appendLine(`✅ Terminal manager success, sending response (ID: ${message.messageId})`);
                // Send success response
                await ClaudeChatViewProvider.sendMessageResponse(webview, {
                    success: true,
                    message: 'Message sent to Claude CLI successfully',
                    timestamp: Date.now()
                }, message.messageId);
                
            } else {
                ClaudeChatViewProvider.outputChannel.appendLine(`🔄 Using fallback method (ID: ${message.messageId})`);
                // Fallback to old method
                const terminalStatus = await ClaudeChatViewProvider.getTerminalStatus();
                
                if (!terminalStatus.hasActiveTerminal) {
                    await ClaudeChatViewProvider.sendError(webview, {
                        code: ErrorCode.NO_TERMINAL,
                        message: 'No active terminal found. Please open a terminal with Claude Code CLI running.',
                        recoverable: true
                    }, message.messageId);
                    return;
                }
                
                // Execute command
                await vscode.commands.executeCommand('claudeChat.sendMessage', payload.text);
                
                // Send success response
                await ClaudeChatViewProvider.sendMessageResponse(webview, {
                    success: true,
                    message: 'Message sent successfully',
                    timestamp: Date.now()
                }, message.messageId);
            }
            
            ClaudeChatViewProvider.outputChannel.appendLine(`🎉 handleSendMessage completed successfully (ID: ${message.messageId})`);
            
        } catch (error) {
            ClaudeChatViewProvider.outputChannel.appendLine(`💥 handleSendMessage exception: ${error} (ID: ${message.messageId})`);
            await ClaudeChatViewProvider.sendError(webview, {
                code: ErrorCode.COMMUNICATION_ERROR,
                message: 'Failed to send message to terminal',
                details: error,
                recoverable: true
            }, message.messageId);
        }
    }

    /**
     * Instance send message handler
     */
    private async handleSendMessage(webview: vscode.Webview, message: WebviewToExtensionMessage): Promise<void> {
        ClaudeChatViewProvider.outputChannel.appendLine(`🚀 Instance handleSendMessage started (ID: ${message.messageId})`);
        try {
            await ClaudeChatViewProvider.handleSendMessage(webview, message, ClaudeChatViewProvider.terminalManager);
            ClaudeChatViewProvider.outputChannel.appendLine(`✅ Instance handleSendMessage completed (ID: ${message.messageId})`);
        } catch (error) {
            ClaudeChatViewProvider.outputChannel.appendLine(`❌ Instance handleSendMessage failed (ID: ${message.messageId}): ${error}`);
            throw error;
        }
    }
    
    /**
     * Handle clear history request
     */
    private async handleClearHistory(webview: vscode.Webview, message: WebviewToExtensionMessage): Promise<void> {
        const payload = message.payload;
        
        if (payload?.confirm) {
            // Send confirmation to webview
            await this.sendMessage(webview, {
                type: 'historyCleared',
                payload: { success: true },
                messageId: message.messageId
            });
        }
    }

    /**
     * Static clear history handler
     */
    private static async handleClearHistory(webview: vscode.Webview, message: WebviewToExtensionMessage): Promise<void> {
        const payload = message.payload;
        
        if (payload?.confirm) {
            // Send confirmation to webview
            await ClaudeChatViewProvider.sendMessage(webview, {
                type: 'historyCleared',
                payload: { success: true },
                messageId: message.messageId
            });
        }
    }
    
    /**
     * Handle ping request
     */
    private async handlePing(webview: vscode.Webview, message: WebviewToExtensionMessage): Promise<void> {
        await this.sendMessage(webview, {
            type: 'pong',
            payload: { timestamp: Date.now() },
            messageId: message.messageId
        });
    }

    /**
     * Static ping handler
     */
    private static async handlePing(webview: vscode.Webview, message: WebviewToExtensionMessage): Promise<void> {
        await ClaudeChatViewProvider.sendMessage(webview, {
            type: 'pong',
            payload: { timestamp: Date.now() },
            messageId: message.messageId
        });
    }
    
    /**
     * Get current terminal status with terminal manager support
     */
    private static async getTerminalStatus(terminalManager?: TerminalManager): Promise<TerminalStatus> {
        if (terminalManager) {
            return await terminalManager.getTerminalStatus(TerminalSelectionStrategy.CLAUDE_CLI);
        }
        
        // Fallback to old method
        const terminal = vscode.window.activeTerminal;
        
        if (!terminal) {
            return {
                hasActiveTerminal: false,
                claudeCliDetected: false
            };
        }
        
        // Basic detection
        const claudeCliDetected = terminal.name.toLowerCase().includes('claude');
        
        return {
            hasActiveTerminal: true,
            terminalName: terminal.name,
            claudeCliDetected,
            pid: await terminal.processId
        };
    }
    
    /**
     * Send status update to webview
     */
    private async sendStatusUpdate(messageId?: string): Promise<void> {
        if (!this._webview) {
            ClaudeChatViewProvider.outputChannel.appendLine('❌ No webview available for status update');
            return;
        }
        
        ClaudeChatViewProvider.outputChannel.appendLine('🔍 Getting terminal status...');
        const terminalStatus = await ClaudeChatViewProvider.getTerminalStatus(ClaudeChatViewProvider.terminalManager);
        
        const statusPayload: StatusUpdatePayload = {
            status: terminalStatus.hasActiveTerminal ? 'ready' : 'disconnected',
            terminalActive: terminalStatus.hasActiveTerminal,
            claudeCliRunning: terminalStatus.claudeCliDetected,
            lastActivity: Date.now()
        };
        
        ClaudeChatViewProvider.outputChannel.appendLine(`📤 Sending status: ${statusPayload.status} (ID: ${messageId})`);
        await this.sendMessage(this._webview, {
            type: 'statusUpdate',
            payload: statusPayload,
            messageId: messageId
        });
        ClaudeChatViewProvider.outputChannel.appendLine('✅ Status sent successfully');
    }

    /**
     * Static status update
     */
    private static async sendStatusUpdate(webview: vscode.Webview, terminalManager?: TerminalManager, messageId?: string): Promise<void> {
        const terminalStatus = await ClaudeChatViewProvider.getTerminalStatus(terminalManager);
        
        const statusPayload: StatusUpdatePayload = {
            status: terminalStatus.hasActiveTerminal ? 'ready' : 'disconnected',
            terminalActive: terminalStatus.hasActiveTerminal,
            claudeCliRunning: terminalStatus.claudeCliDetected,
            lastActivity: Date.now()
        };
        
        await ClaudeChatViewProvider.sendMessage(webview, {
            type: 'statusUpdate',
            payload: statusPayload,
            messageId: messageId
        });
    }
    
    /**
     * Send message response to webview (used for consistency)
     */
    public async sendMessageResponse(webview: vscode.Webview, payload: MessageResponsePayload, messageId?: string): Promise<void> {
        await this.sendMessage(webview, {
            type: 'messageResponse',
            payload,
            messageId
        });
        // Used for debugging
        console.log('Instance message response sent:', payload);
    }

    /**
     * Static message response
     */
    private static async sendMessageResponse(webview: vscode.Webview, payload: MessageResponsePayload, messageId?: string): Promise<void> {
        await ClaudeChatViewProvider.sendMessage(webview, {
            type: 'messageResponse',
            payload,
            messageId
        });
    }
    
    /**
     * Send error to webview
     */
    private async sendError(webview: vscode.Webview, payload: ErrorPayload, messageId?: string): Promise<void> {
        await this.sendMessage(webview, {
            type: 'error',
            payload,
            messageId
        });
    }

    /**
     * Static error sender
     */
    private static async sendError(webview: vscode.Webview, payload: ErrorPayload, messageId?: string): Promise<void> {
        await ClaudeChatViewProvider.sendMessage(webview, {
            type: 'error',
            payload,
            messageId
        });
    }
    
    /**
     * Send message to webview with error handling
     */
    private async sendMessage(webview: vscode.Webview, message: ExtensionToWebviewMessage): Promise<void> {
        try {
            ClaudeChatViewProvider.outputChannel.appendLine(`📤 Sending to webview: ${message.type} (ID: ${message.messageId})`);
            ClaudeChatViewProvider.outputChannel.appendLine(`📤 Full message: ${JSON.stringify(message)}`);
            await webview.postMessage(message);
            ClaudeChatViewProvider.outputChannel.appendLine('✅ Message sent successfully');
        } catch (error) {
            ClaudeChatViewProvider.outputChannel.appendLine(`❌ Failed to send message: ${error}`);
            console.error('Failed to send message to webview:', error);
        }
    }

    /**
     * Static message sender
     */
    private static async sendMessage(webview: vscode.Webview, message: ExtensionToWebviewMessage): Promise<void> {
        try {
            await webview.postMessage(message);
        } catch (error) {
            console.error('Failed to send message to webview:', error);
        }
    }
    
    private static _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="description" content="Claude Chat interface for VS Code">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleMainUri}" rel="stylesheet">
                <title>Claude Chat</title>
            </head>
            <body>
                <div class="chat-app" role="application" aria-label="Claude Chat Interface">
                    <header class="chat-header" role="banner">
                        <div class="chat-title">
                            <span class="chat-icon" aria-hidden="true">💬</span>
                            <h1 class="chat-heading">Claude Chat</h1>
                        </div>
                        <div class="chat-status" aria-live="polite">
                            <span class="status-indicator" id="statusIndicator" aria-label="Connection status"></span>
                            <span class="status-text" id="statusText">Ready</span>
                        </div>
                    </header>
                    
                    <main class="chat-main" role="main">
                        <div class="chat-messages" 
                             id="chatMessages" 
                             role="log" 
                             aria-label="Chat messages" 
                             aria-live="polite">
                            <div class="welcome-message">
                                <div class="message assistant" role="article" aria-label="Assistant message">
                                    <div class="message-avatar" aria-hidden="true">
                                        <span class="avatar-icon">🤖</span>
                                    </div>
                                    <div class="message-content">
                                        <div class="message-header">
                                            <span class="message-author">Claude</span>
                                            <time class="message-time" id="welcomeTime"></time>
                                        </div>
                                        <div class="message-text">
                                            <p>Привет! Я Claude Chat для VS Code. Напишите сообщение ниже, и я отправлю его в активный терминал с запущенным Claude Code CLI.</p>
                                            <p class="message-hint">💡 Используйте <kbd>Ctrl+Shift+C</kbd> для быстрого доступа к чату</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="typing-indicator loading-hidden" id="typingIndicator" aria-live="polite">
                            <div class="typing-avatar" aria-hidden="true">🤖</div>
                            <div class="typing-text">
                                <span>Claude печатает</span>
                                <div class="typing-dots" aria-hidden="true">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    </main>
                    
                    <footer class="chat-footer" role="contentinfo">
                        <div class="chat-input-container">
                            <div class="input-wrapper">
                                <label for="messageInput" class="sr-only">Введите ваше сообщение</label>
                                <textarea 
                                    id="messageInput" 
                                    class="chat-input" 
                                    placeholder="Введите сообщение для Claude..."
                                    rows="1"
                                    aria-label="Поле ввода сообщения"
                                    aria-describedby="inputHelp"
                                    maxlength="8000"
                                ></textarea>
                                <div class="input-controls">
                                    <button 
                                        id="clearButton" 
                                        class="control-button clear-button" 
                                        type="button"
                                        aria-label="Очистить историю чата"
                                        title="Очистить историю">
                                        🗑️
                                    </button>
                                    <button 
                                        id="sendButton" 
                                        class="control-button send-button" 
                                        type="submit"
                                        aria-label="Отправить сообщение"
                                        title="Отправить (Enter)">
                                        <span class="button-text">Отправить</span>
                                        <span class="button-icon" aria-hidden="true">📤</span>
                                    </button>
                                </div>
                            </div>
                            <div class="input-help" id="inputHelp">
                                <span class="help-text">Enter - отправить, Shift+Enter - новая строка</span>
                                <span class="char-counter">
                                    <span id="charCount">0</span>/8000
                                </span>
                            </div>
                        </div>
                    </footer>
                </div>
                
                <!-- Loading overlay -->
                <div class="loading-overlay loading-hidden" id="loadingOverlay" aria-hidden="true">
                    <div class="loading-content">
                        <div class="loading-spinner" aria-hidden="true"></div>
                        <span class="loading-text">Отправка сообщения...</span>
                    </div>
                </div>
                
                <!-- Toast notifications -->
                <div class="toast-container" id="toastContainer" aria-live="assertive" aria-atomic="true"></div>
                
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}