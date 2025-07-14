/**
 * OneShoot Session Manager
 * Manages up to 2 concurrent OneShoot Claude Code sessions
 * Claude Chat Extension
 */

import * as vscode from 'vscode';
import { Session, Message, ServiceMessage } from '../types/Session';
import { OneShootProcessSessionFactory } from './OneShootProcessSessionManager';
import { RawJsonOutputChannel } from '../../debug/RawJsonOutputChannel';

export class OneShootSessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;
  private readonly maxSessions = 2;
  private readonly messageHistoryLimit = 100;
  // 🔧 Terminal visibility state
  private showTerminal: boolean = false;
  // 📡 Raw JSON Output Channel for debugging
  private rawJsonOutputChannel: RawJsonOutputChannel | null = null;
  
  // Event callbacks
  private onSessionCreatedCallback?: (session: Session) => void;
  private onSessionClosedCallback?: (sessionId: string) => void;
  private onSessionSwitchedCallback?: (sessionId: string) => void;
  private onSessionStatusChangedCallback?: (sessionId: string, status: Session['status']) => void;
  private onMessageReceivedCallback?: (sessionId: string, message: Message) => void;
  private onServiceInfoReceivedCallback?: (sessionId: string, serviceInfo: ServiceMessage) => void;
  private onInteractiveInputRequiredCallback?: (sessionId: string, command: string, data: any, prompt: string) => void;

  constructor(private outputChannel: vscode.OutputChannel) {
  }

  // Core Session Management
  async createSession(name?: string, options?: { resumeSessionId?: string }): Promise<Session> {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Maximum ${this.maxSessions} sessions allowed`);
    }

    const sessionId = this.generateSessionId();
    const sessionName = name || `Session ${this.sessions.size + 1}`;
    
    this.outputChannel.appendLine(`Creating session: ${sessionName} (${sessionId})`);

    const session: Session = {
      id: sessionId,
      name: sessionName,
      oneShootSession: undefined,
      messages: [],
      status: 'creating',
      createdAt: new Date(),
      lastActiveAt: new Date(),
      lastCacheTokens: { creation: 0, read: 0 }  // Initialize token values
    };

    this.sessions.set(sessionId, session);

    try {
      // Create OneShoot process session
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const workingDirectory = workspaceFolder?.uri.fsPath || process.cwd();
      
      const oneShootSession = OneShootProcessSessionFactory.create({
        sessionId: sessionId,
        sessionName: sessionName,
        workingDirectory: workingDirectory,
        outputChannel: this.outputChannel,
        showTerminal: this.showTerminal,
        resumeSessionId: options?.resumeSessionId,
        rawJsonOutputChannel: this.rawJsonOutputChannel
      });
      
      session.oneShootSession = oneShootSession;
      session.status = 'starting';
      
      // Setup OneShoot event handlers
      this.setupOneShootEventHandlers(session);
      
      // OneShoot sessions are ready immediately (no persistent process)
      session.status = 'ready';
      this.fireEvent('sessionStatusChanged', sessionId, 'ready');
      
      this.outputChannel.appendLine(`OneShoot session ready: ${sessionName}`);
      
      // Make this session active
      await this.switchToSession(sessionId);

      this.outputChannel.appendLine(`Session created successfully: ${sessionName}`);
      this.fireEvent('sessionCreated', session);

      return session;
    } catch (error) {
      session.status = 'error';
      this.outputChannel.appendLine(`Failed to create session: ${error}`);
      this.fireEvent('sessionStatusChanged', sessionId, 'error');
      throw error;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.outputChannel.appendLine(`Closing session: ${session.name} (${sessionId})`);

    if (session.oneShootSession) {
      // Close OneShoot session
      await session.oneShootSession.dispose();
    }

    session.status = 'closed';

    // Remove from sessions
    this.sessions.delete(sessionId);

    // Switch to another session if this was active
    if (this.activeSessionId === sessionId) {
      const remainingSessions = Array.from(this.sessions.keys());
      if (remainingSessions.length > 0) {
        await this.switchToSession(remainingSessions[0]);
      } else {
        this.activeSessionId = null;
      }
    }

    this.fireEvent('sessionClosed', sessionId);
  }

  async switchToSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.outputChannel.appendLine(`Switching to session: ${session.name} (${sessionId}`);

    // Hide current active session if any
    const currentActiveSession = this.getActiveSession();
    if (currentActiveSession && currentActiveSession.id !== sessionId) {
      this.outputChannel.appendLine(`Hiding previous active session: ${currentActiveSession.name}`);
    }

    // Update last active time
    session.lastActiveAt = new Date();

    // Update active session
    this.activeSessionId = sessionId;

    this.outputChannel.appendLine(`Session successfully switched to: ${session.name} (${sessionId})`);
    this.fireEvent('sessionSwitched', sessionId);
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'ready') {
      throw new Error(`Session ${sessionId} is not ready (status: ${session.status})`);
    }

    this.outputChannel.appendLine(`📤 Sending message to session ${sessionId}: ${message}`);

    // Add user message to history
    const messageObj: Message = {
      id: this.generateMessageId(),
      content: message,
      timestamp: new Date(),
      type: 'user',
      sessionId
    };

    session.messages.push(messageObj);
    this.trimMessageHistory(session);

    // 🚀 Proactive token initialization removed - only OneShoot mode now

    // Fire event for user message
    this.fireEvent('messageReceived', sessionId, messageObj);

    // Send message - OneShoot only
    if (!session.oneShootSession) {
      throw new Error(`OneShoot session not properly initialized`);
    }
    
    // **ПОТОК 1: Extension → OneShoot Process (Streaming)**
    try {
      this.outputChannel.appendLine(`📤 Starting OneShoot message for session: ${session.name}`);
      
      // Setup streaming data handler
      session.oneShootSession.onData = (jsonLine: string) => {
        this.handleOneShootStreamingData(sessionId, jsonLine);
      };
      
      // Start streaming execution
      await session.oneShootSession.sendMessage(message);
      this.outputChannel.appendLine(`✅ OneShoot message completed for session: ${session.name}`);
      
      // 🎯 ИСПРАВЛЕНИЕ: Завершить все оставшиеся активные инструменты после завершения OneShoot
      this.completeAllPendingToolsForOneShoot(sessionId);
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ OneShoot sendMessage error: ${error}`);
      // Error is already logged, OneShoot errors are handled internally
    }
      
    // Update last active time
    session.lastActiveAt = new Date();

    this.outputChannel.appendLine(`✅ Message sent to session: ${session.name}`);
  }

  async executeSlashCommand(sessionId: string, slashCommand: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'ready') {
      throw new Error(`Session ${sessionId} is not ready (status: ${session.status})`);
    }

    this.outputChannel.appendLine(`⚡ Executing slash command in session ${sessionId}: ${slashCommand}`);

    if (!session.oneShootSession) {
      throw new Error(`OneShoot session not properly initialized`);
    }
    
    // Send to OneShoot session
    session.oneShootSession.executeSlashCommand(slashCommand);
    
    // Update last active time
    session.lastActiveAt = new Date();

    this.outputChannel.appendLine(`✅ Slash command executed in session: ${session.name}`);
  }

  /**
   * Обработка ответа пользователя на интерактивную команду
   */
  async handleInteractiveResponse(response: any): Promise<void> {
    const session = this.sessions.get(response.sessionId);
    if (!session) {
      throw new Error(`Session ${response.sessionId} not found`);
    }

    this.outputChannel.appendLine(`📝 Handling interactive response for session ${response.sessionId}: ${response.selection}`);

    // OneShoot mode doesn't support interactive responses
    this.outputChannel.appendLine(`⚠️ Interactive responses not supported in OneShoot mode`);
    
    // Interactive responses removed - only OneShoot mode now
    this.outputChannel.appendLine(`⚠️ Interactive responses not supported in OneShoot-only mode`);
  }

  /**
   * **ПОТОК 2: Terminal → Extension**
   * Обработка ответов, полученных от Claude Code через JSONL мониторинг
   * ⚠️ ТОЛЬКО для терминальных и процессных сессий, НЕ для OneShoot
   */

  // Getters
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  getActiveSession(): Session | null {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) || null : null;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  canCreateNewSession(): boolean {
    return this.sessions.size < this.maxSessions;
  }

  // Session Health Monitoring
  async checkSessionHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();
    
    for (const [sessionId, session] of this.sessions) {
      try {
        let isHealthy = false;
        
        if (session.oneShootSession) {
          // OneShoot sessions are always healthy if they exist
          isHealthy = session.oneShootSession.isAlive() && (session.status === 'ready' || session.status === 'starting');
        }
        
        healthStatus.set(sessionId, isHealthy);
        
        if (!isHealthy) {
          this.outputChannel.appendLine(`Session ${session.name} (${sessionId}) appears unhealthy. Status: ${session.status}`);
        }
      } catch (error) {
        this.outputChannel.appendLine(`Error checking health for session ${sessionId}: ${error}`);
        healthStatus.set(sessionId, false);
      }
    }
    
    return healthStatus;
  }

  async getSessionDiagnostics(): Promise<string> {
    const diagnostics: string[] = [];
    diagnostics.push(`=== Session Manager Diagnostics ===`);
    diagnostics.push(`Total sessions: ${this.sessions.size}/${this.maxSessions}`);
    diagnostics.push(`Active session: ${this.activeSessionId || 'None'}`);
    diagnostics.push(`Health check results:`);
    
    const healthStatus = await this.checkSessionHealth();
    
    for (const [sessionId, session] of this.sessions) {
      const isHealthy = healthStatus.get(sessionId) || false;
      
      diagnostics.push(`  • ${session.name} (${sessionId}):`);
      diagnostics.push(`    - Status: ${session.status}`);
      diagnostics.push(`    - Healthy: ${isHealthy ? '✅' : '❌'}`);
      
      if (session.oneShootSession) {
        diagnostics.push(`    - OneShoot Session ID: ${session.oneShootSession.getClaudeSessionId() || 'Not set'}`);
        diagnostics.push(`    - OneShoot Alive: ${session.oneShootSession.isAlive() ? '✅' : '❌'}`);
      }
      
      diagnostics.push(`    - Messages: ${session.messages.length}`);
      diagnostics.push(`    - Created: ${session.createdAt.toISOString()}`);
      diagnostics.push(`    - Last Active: ${session.lastActiveAt.toISOString()}`);
    }
    
    return diagnostics.join('\n');
  }

  // Private Methods


  private trimMessageHistory(session: Session): void {
    if (session.messages.length > this.messageHistoryLimit) {
      session.messages = session.messages.slice(-this.messageHistoryLimit);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Event handling
  private fireEvent(eventName: string, ...args: any[]): void {
    switch (eventName) {
      case 'sessionCreated':
        if (this.onSessionCreatedCallback) {
          this.onSessionCreatedCallback(args[0]);
        }
        break;
      case 'sessionClosed':
        if (this.onSessionClosedCallback) {
          this.onSessionClosedCallback(args[0]);
        }
        break;
      case 'sessionSwitched':
        if (this.onSessionSwitchedCallback) {
          this.onSessionSwitchedCallback(args[0]);
        }
        break;
      case 'sessionStatusChanged':
        if (this.onSessionStatusChangedCallback) {
          this.onSessionStatusChangedCallback(args[0], args[1]);
        }
        break;
      case 'messageReceived':
        if (this.onMessageReceivedCallback) {
          this.onMessageReceivedCallback(args[0], args[1]);
        }
        break;
      case 'serviceInfoReceived':
        if (this.onServiceInfoReceivedCallback) {
          this.onServiceInfoReceivedCallback(args[0], args[1]);
        }
        break;
    }
  }

  // OneShoot Session Event Handlers
  private setupOneShootEventHandlers(session: Session): void {
    if (!session.oneShootSession) {
      return;
    }
    
    session.oneShootSession.onData = (data: string) => {
      this.handleOneShootData(session.id, data);
    };
    
    session.oneShootSession.onExit = (code: number | null, signal: string | null) => {
      this.handleOneShootExit(session.id, code, signal);
    };
    
    session.oneShootSession.onError = (error: Error) => {
      this.handleOneShootError(session.id, error);
    };
    
    session.oneShootSession.onInteractivePrompt = (prompt: string) => {
      this.handleOneShootInteractivePrompt(session.id, prompt);
    };
    
    session.oneShootSession.onStatusBarUpdate = (json: any) => {
      this.handleOneShootStatusBarUpdate(session.id, json);
    };
  }

  // Event registration methods
  onSessionCreated(callback: (session: Session) => void): void {
    this.onSessionCreatedCallback = callback;
  }

  onSessionClosed(callback: (sessionId: string) => void): void {
    this.onSessionClosedCallback = callback;
  }

  onSessionSwitched(callback: (sessionId: string) => void): void {
    this.onSessionSwitchedCallback = callback;
  }

  onSessionStatusChanged(callback: (sessionId: string, status: Session['status']) => void): void {
    this.onSessionStatusChangedCallback = callback;
  }

  onMessageReceived(callback: (sessionId: string, message: Message) => void): void {
    this.onMessageReceivedCallback = callback;
  }

  onServiceInfoReceived(callback: (sessionId: string, serviceInfo: ServiceMessage) => void): void {
    this.onServiceInfoReceivedCallback = callback;
  }

  onInteractiveInputRequired(callback: (sessionId: string, command: string, data: any, prompt: string) => void): void {
    this.onInteractiveInputRequiredCallback = callback;
  }

  // OneShoot Session Data Handlers
  private handleOneShootData(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.outputChannel.appendLine(`⚠️ Received OneShoot data for unknown session: ${sessionId}`);
      return;
    }

    this.outputChannel.appendLine(`📨 OneShoot data for session ${session.name}: ${data.substring(0, 100)}...`);

    // OneShoot data is handled through sendMessage responses, not streaming
    // This is mainly for debugging
  }

  private handleOneShootExit(sessionId: string, code: number | null, signal: string | null): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.outputChannel.appendLine(`💀 OneShoot session exited: ${session.name}, code=${code}, signal=${signal}`);
    
    // OneShoot processes are expected to exit after each message
    // This is normal behavior, not an error
  }

  private handleOneShootError(sessionId: string, error: Error): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.outputChannel.appendLine(`❌ OneShoot session error: ${session.name}, error=${error.message}`);
    
    // 🚫 Special handling for context limit errors
    if (error.name === 'ContextLimitError') {
      // Send user-friendly message instead of generic error
      this.outputChannel.appendLine(`🚫 Context limit reached - sending user-friendly message`);
      
      const contextLimitMessage: Message = {
        id: this.generateMessageId(),
        content: error.message,
        timestamp: new Date(),
        type: 'assistant',
        sessionId: sessionId
      };
      
      // Add message to session and notify UI
      session.messages.push(contextLimitMessage);
      this.fireEvent('messageReceived', sessionId, contextLimitMessage);
      
      // Set session to ready state instead of error
      session.status = 'ready';
      this.fireEvent('sessionStatusChanged', sessionId, 'ready');
      return;
    }
    
    session.status = 'error';
    this.fireEvent('sessionStatusChanged', sessionId, 'error');
  }

  private handleOneShootInteractivePrompt(sessionId: string, prompt: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.outputChannel.appendLine(`🔄 OneShoot interactive prompt: ${session.name}, prompt=${prompt}`);
    
    // Fire interactive input required event
    if (this.onInteractiveInputRequiredCallback) {
      this.onInteractiveInputRequiredCallback(sessionId, 'interactive', {}, prompt);
    }
  }
  
  private handleOneShootStatusBarUpdate(sessionId: string, json: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.outputChannel.appendLine(`📊 OneShoot status bar update: ${json.type}`);
    
    // Save last result JSON for later use
    if (json.type === 'result') {
      (session as any).lastResultJson = json;
      this.outputChannel.appendLine(`💾 Saved result JSON for session ${sessionId}`);
    }
    
    // 🎯 ВАЖНО: НЕ отправляем serviceInfoReceived для каждого JSON сообщения
    // Это перезаписывало реальные usage данные пустыми значениями
    // Usage данные обрабатываются отдельно в handleOneShootUsageData
    
    // Отправляем serviceInfoReceived ТОЛЬКО для специфических типов сообщений,
    // которые требуют обновления статус-бара (например, tool_use)
    if (json.type === 'tool_use' || json.type === 'tool_result') {
      // Используем сохраненные значения токенов из сессии
      const serviceMessage: ServiceMessage = {
        id: this.generateMessageId(),
        type: 'service',
        sessionId: sessionId,
        timestamp: new Date(),
        toolUse: [],
        thinking: '',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          // 🎯 ВАЖНО: Используем сохраненные значения токенов, а не нули
          cache_creation_input_tokens: session.lastCacheTokens?.creation || 0,
          cache_read_input_tokens: session.lastCacheTokens?.read || 0
        },
        status: 'processing',
        rawJson: json // Pass the raw JSON for status bar
      };
      
      // Fire service info event with raw JSON
      this.fireEvent('serviceInfoReceived', sessionId, serviceMessage);
    }
  }

  private handleOneShootStreamingData(sessionId: string, jsonLine: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      const response = JSON.parse(jsonLine) as import('./OneShootProcessSessionManager').ClaudeJsonResponse;
      this.outputChannel.appendLine(`🔄 Streaming: ${response.type}${response.subtype ? '/' + response.subtype : ''}`);
      
      
      if (response.type === 'assistant' && response.message) {
        this.processAssistantStreamingMessage(sessionId, response);
      } else if (response.type === 'result' && response.message) {
        this.processToolResultStreaming(sessionId, response);
      }
      
      // 🎯 ИСПРАВЛЕНИЕ: Обработка usage данных для индикатора токенов OneShoot режима
      // Usage всегда находится внутри message для assistant сообщений
      if (response.type === 'assistant' && response.message && response.message.usage) {
        this.outputChannel.appendLine(`📊 Usage data found in message: ${JSON.stringify(response.message.usage)}`);
        this.handleOneShootUsageData(sessionId, response.message.usage);
      }
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to parse streaming JSON: ${error}`);
    }
  }

  /**
   * 🎯 ИСПРАВЛЕНИЕ: Обработка usage данных для OneShoot режима
   * Service tier validation
   */
  private handleOneShootUsageData(sessionId: string, usage: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Валидация токенов
    const validateTokenCount = (value: any): number => {
      return (typeof value === 'number' && !isNaN(value)) ? value : 0;
    };

    // 🎯 ИСПРАВЛЕНО: Передаем ОРИГИНАЛЬНЫЕ значения из Claude API, суммирование будет в UI
    const cacheCreationTokens = validateTokenCount(usage.cache_creation_input_tokens);
    const cacheReadTokens = validateTokenCount(usage.cache_read_input_tokens);
    const inputTokens = validateTokenCount(usage.input_tokens);
    const outputTokens = validateTokenCount(usage.output_tokens);

    // 🔧 ВАЖНО: Игнорируем записи с нулевыми токенами (промежуточные записи)
    if (cacheReadTokens === 0 && cacheCreationTokens === 0 && outputTokens === 0) {
      this.outputChannel.appendLine(`🔧 Skipping zero-token usage data`);
      return;
    }

    // 🎯 ЗАМЕНА ТОКЕНОВ: Заменяем старые значения новыми
    session.lastCacheTokens = {
      creation: cacheCreationTokens,
      read: cacheReadTokens
    };
    const totalCacheTokens = cacheCreationTokens + cacheReadTokens;
    this.outputChannel.appendLine(`💰 Updated cache tokens: ${totalCacheTokens} (${cacheCreationTokens} creation + ${cacheReadTokens} read)`);
    
    // Обновляем сессию в Map
    this.sessions.set(sessionId, session);

    // Создаем ServiceMessage с usage данными
    const serviceMessage: import('../types/Session').ServiceMessage = {
      id: this.generateMessageId(),
      type: 'service',
      sessionId: sessionId,
      timestamp: new Date(),
      toolUse: [], // Для usage данных инструменты не важны
      thinking: '',
      status: 'completed',
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        // 🎯 ВАЖНО: Передаем последние значения токенов
        cache_creation_input_tokens: session.lastCacheTokens?.creation || 0,
        cache_read_input_tokens: session.lastCacheTokens?.read || 0,
        service_tier: usage.service_tier || 'unknown'
      }
    };

    this.outputChannel.appendLine(`🔧 OneShoot usage data: ${cacheCreationTokens} creation + ${cacheReadTokens} read tokens (input: ${inputTokens}, output: ${outputTokens})`);

    // Fire event для служебной информации (аналогично терминальному режиму)
    this.fireEvent('serviceInfoReceived', sessionId, serviceMessage);
  }

  private processAssistantStreamingMessage(sessionId: string, response: import('./OneShootProcessSessionManager').ClaudeJsonResponse): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (response.message && response.message.content && Array.isArray(response.message.content)) {
      for (const block of response.message.content) {
        if (block.type === 'tool_use') {
          // DON'T auto-complete running tools - let them run naturally
          // this.completeAllRunningTools(sessionId); // REMOVED - this caused instant completion
          
          // Show tool immediately
          const toolMessage: Message = {
            id: this.generateMessageId(),
            content: this.formatToolUse(block),
            timestamp: new Date(),
            type: 'tool',
            sessionId: sessionId,
            toolInfo: {
              name: block.name,
              input: block.input,
              status: 'running',
              startTime: new Date()
            }
          };
          
          // Store for later result matching
          if (!session.pendingTools) {
            session.pendingTools = new Map();
          }
          session.pendingTools.set(block.id, toolMessage);
          
          session.messages.push(toolMessage);
          this.fireEvent('messageReceived', sessionId, toolMessage);
          this.outputChannel.appendLine(`🔧 Tool started: ${block.name}`);
          
        } else if (block.type === 'text' && block.text?.trim()) {
          // DON'T auto-complete running tools - let them run naturally
          // this.completeAllRunningTools(sessionId); // REMOVED - this caused instant completion
          
          // Show text immediately (no delay needed in streaming)
          const textMessage: Message = {
            id: this.generateMessageId(),
            content: block.text.trim(),
            timestamp: new Date(),
            type: 'assistant',
            sessionId: sessionId
          };
          
          session.messages.push(textMessage);
          this.fireEvent('messageReceived', sessionId, textMessage);
          this.outputChannel.appendLine(`💬 Assistant text received`);
        }
      }
    }
  }

  private processToolResultStreaming(sessionId: string, response: import('./OneShootProcessSessionManager').ClaudeJsonResponse): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.pendingTools || !response.message) return;

    const toolId = (response.message as any).tool_use_id;
    const toolMessage = session.pendingTools.get(toolId);
    
    if (toolMessage && toolMessage.toolInfo) {
      toolMessage.toolInfo.status = (response.message as any).is_error ? 'error' : 'completed';
      toolMessage.toolInfo.result = this.formatToolResult(response.message as any);
      toolMessage.toolInfo.endTime = new Date();
      
      // Update UI immediately
      this.fireEvent('messageReceived', sessionId, toolMessage);
      
      // Remove from pending
      session.pendingTools.delete(toolId);
      
      this.outputChannel.appendLine(`✅ Tool completed: ${toolMessage.toolInfo.name}`);
    }
  }


  // REMOVED: completeAllRunningTools function - caused instant tool completion
  // Tools now complete naturally when they receive actual results

  /**
   * 🎯 ИСПРАВЛЕНИЕ: Завершает все активные инструменты после завершения OneShoot сессии
   * Это специальная функция только для OneShoot режима - вызывается в конце сессии
   */
  private completeAllPendingToolsForOneShoot(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    
    this.outputChannel.appendLine(`🔍 DEBUG: completeAllPendingToolsForOneShoot called for session ${sessionId}`);
    this.outputChannel.appendLine(`🔍 DEBUG: session exists: ${!!session}`);
    this.outputChannel.appendLine(`🔍 DEBUG: session.pendingTools exists: ${!!session?.pendingTools}`);
    this.outputChannel.appendLine(`🔍 DEBUG: pendingTools size: ${session?.pendingTools?.size || 0}`);
    
    if (!session) {
      this.outputChannel.appendLine(`⚠️ No session found for ${sessionId}`);
      return;
    }
    
    // Если pendingTools не существует или пустой, всё равно нужно отправить финальный serviceInfo
    if (!session.pendingTools || session.pendingTools.size === 0) {
      this.outputChannel.appendLine(`📭 No pending tools to complete for ${sessionId}, sending final serviceInfo`);
    } else {
      this.outputChannel.appendLine(`🔄 OneShoot completed: Finishing ${session.pendingTools.size} remaining tools`);
      
      // Собираем все инструменты в массив для безопасной итерации
      const toolsToComplete = Array.from(session.pendingTools.entries());
      
      // Завершаем все оставшиеся инструменты
      for (const [toolId, toolMessage] of toolsToComplete) {
      this.outputChannel.appendLine(`🔍 DEBUG: Processing tool ${toolId}, status: ${toolMessage.toolInfo?.status}`);
      
      if (toolMessage.toolInfo && toolMessage.toolInfo.status === 'running') {
        toolMessage.toolInfo.status = 'completed';
        toolMessage.toolInfo.endTime = new Date();
        toolMessage.toolInfo.result = 'Tool completed with OneShoot session';
        
        // Обновляем UI - добавляем в основной массив сообщений
        const messageIndex = session.messages.findIndex(msg => 
          msg.id === toolMessage.id
        );
        
        if (messageIndex !== -1) {
          session.messages[messageIndex] = toolMessage;
          this.outputChannel.appendLine(`✅ Updated message in session.messages for tool: ${toolMessage.toolInfo.name}`);
        }
        
        // Обновляем UI
        this.fireEvent('messageReceived', sessionId, toolMessage);
        
        // Удаляем из pending сразу после обновления UI
        session.pendingTools.delete(toolId);
        
        this.outputChannel.appendLine(`✅ Force-completed and removed tool: ${toolMessage.toolInfo.name}`);
      } else {
        // Если инструмент не running, всё равно удаляем из pending
        session.pendingTools.delete(toolId);
        this.outputChannel.appendLine(`🔧 Removed non-running tool: ${toolMessage.toolInfo?.name || 'unknown'}`);
      }
    }
      
      this.outputChannel.appendLine(`🧹 All pending tools processed for OneShoot session`);
    }
    
    // Принудительно обновляем UI
    this.fireEvent('sessionUpdated', sessionId);
    this.outputChannel.appendLine(`🔄 Fired sessionUpdated event for ${sessionId}`);
    
    // 🔧 ИСПРАВЛЕНИЕ v0.11.28: Используем сохраненный result JSON если есть
    // Проверяем наличие сохраненного result JSON
    const lastResultJson = (session as any).lastResultJson;
    
    if (lastResultJson && lastResultJson.type === 'result') {
      // Если есть сохраненный result JSON, используем его
      const finalServiceInfo: ServiceMessage = {
        id: `svc_${Date.now()}_final`,
        type: 'service',
        sessionId: sessionId,
        timestamp: new Date(),
        toolUse: [], // Все инструменты завершены и удалены из pending
        thinking: '',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          // 🎯 ВАЖНО: Передаем последние значения токенов
          cache_creation_input_tokens: session.lastCacheTokens?.creation || 0,
          cache_read_input_tokens: session.lastCacheTokens?.read || 0
        },
        status: 'completed',
        rawJson: lastResultJson // Используем сохраненный result JSON
      };
      
      this.outputChannel.appendLine(`🔧 Sending final service info with saved result JSON`);
      this.fireEvent('serviceInfoReceived', sessionId, finalServiceInfo);
    } else {
      // Если нет result JSON, отправляем обычное сообщение
      const finalServiceInfo: ServiceMessage = {
        id: `svc_${Date.now()}_final`,
        type: 'service',
        sessionId: sessionId,
        timestamp: new Date(),
        toolUse: [],
        thinking: '',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          // 🎯 ВАЖНО: Передаем последние значения токенов
          cache_creation_input_tokens: session.lastCacheTokens?.creation || 0,
          cache_read_input_tokens: session.lastCacheTokens?.read || 0
        },
        status: 'completed'
      };
      
      this.outputChannel.appendLine(`🔧 Sending final service info: status = completed, no result JSON`);
      this.fireEvent('serviceInfoReceived', sessionId, finalServiceInfo);
    }
  }

  private formatToolUse(toolBlock: any): string {
    const params = Object.entries(toolBlock.input || {})
      .map(([key, value]) => {
        const valueStr = String(value);
        // Truncate very long values and add line breaks for readability
        if (valueStr.length > 80) {
          return `${key}: "${valueStr.substring(0, 80)}..."`;
        }
        return `${key}: "${value}"`;
      });
    
    // If parameters are too long, format with line breaks
    const paramStr = params.join(', ');
    if (paramStr.length > 100) {
      return `${toolBlock.name}(\n  ${params.join(',\n  ')}\n)`;
    }
    
    return `${toolBlock.name}(${paramStr})`;
  }

  private formatToolResult(resultMessage: any): string {
    if (resultMessage.is_error) {
      return `Error: ${resultMessage.content || 'Unknown error'}`;
    }
    
    if (resultMessage.content) {
      // Format output based on tool type
      const content = resultMessage.content;
      
      // For file lists, format as lines
      if (typeof content === 'string') {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length > 10) {
          return lines.slice(0, 10).join('\n') + `\n... +${lines.length - 10} lines (ctrl+r to expand)`;
        }
        return content;
      }
      
      return JSON.stringify(content, null, 2);
    }
    
    return 'Completed';
  }


  // Raw JSON Monitor methods
  toggleRawJsonOutputChannel(): boolean {
    if (!this.rawJsonOutputChannel) {
      this.rawJsonOutputChannel = new RawJsonOutputChannel();
    }

    let isActive: boolean;
    if (this.rawJsonOutputChannel.isMonitorActive()) {
      this.rawJsonOutputChannel.stop();
      isActive = false;
    } else {
      this.rawJsonOutputChannel.start();
      isActive = true;
    }

    // Update all existing OneShoot sessions with the OutputChannel
    this.sessions.forEach((session) => {
      if (session.oneShootSession) {
        session.oneShootSession.setRawJsonOutputChannel(isActive ? this.rawJsonOutputChannel : null);
        this.outputChannel.appendLine(`Updated RawJsonOutputChannel for session ${session.name}: ${isActive ? 'active' : 'inactive'}`);
      }
    });

    return isActive;
  }

  getRawJsonOutputChannel(): RawJsonOutputChannel | null {
    return this.rawJsonOutputChannel;
  }

  // Cleanup
  dispose(): void {
    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId).catch(console.error);
    }
    
    this.sessions.clear();
    
    // Stop and cleanup Raw JSON Output Channel
    if (this.rawJsonOutputChannel) {
      this.rawJsonOutputChannel.stop();
      // Don't null it - VS Code manages the disposal
    }
  }
}