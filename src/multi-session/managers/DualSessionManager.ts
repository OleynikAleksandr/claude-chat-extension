/**
 * Dual Session Manager
 * Manages up to 2 concurrent Claude Code sessions
 * Claude Chat Extension
 */

import * as vscode from 'vscode';
import { Session, Message, ServiceMessage } from '../types/Session';
import { JsonlResponseMonitor } from '../monitors/JsonlResponseMonitor';
import { InteractiveCommandManager, UserResponse } from '../../interactive-commands';

export class DualSessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;
  private readonly maxSessions = 2;
  private readonly messageHistoryLimit = 100;
  private jsonlMonitor: JsonlResponseMonitor;
  private sessionMonitoringStatus: Map<string, boolean> = new Map(); // Отслеживание статуса мониторинга
  private interactiveCommandManager: InteractiveCommandManager;
  
  // Event callbacks
  private onSessionCreatedCallback?: (session: Session) => void;
  private onSessionClosedCallback?: (sessionId: string) => void;
  private onSessionSwitchedCallback?: (sessionId: string) => void;
  private onSessionStatusChangedCallback?: (sessionId: string, status: Session['status']) => void;
  private onMessageReceivedCallback?: (sessionId: string, message: Message) => void;
  private onServiceInfoReceivedCallback?: (sessionId: string, serviceInfo: ServiceMessage) => void;
  private onInteractiveInputRequiredCallback?: (sessionId: string, command: string, data: any, prompt: string) => void;

  constructor(private outputChannel: vscode.OutputChannel) {
    // **ПОТОК 2: Terminal → Extension**
    this.jsonlMonitor = new JsonlResponseMonitor(outputChannel);
    this.jsonlMonitor.onResponse((data) => {
      this.handleResponseFromTerminal(data.sessionId, data.response);
    });
    
    // 🔧 Обработка служебной информации от Claude Code
    this.jsonlMonitor.onServiceInfo((data) => {
      this.handleServiceInfoFromTerminal(data.sessionId, data.serviceInfo);
    });
    
    // Инициализация менеджера интерактивных команд
    this.interactiveCommandManager = new InteractiveCommandManager(outputChannel);
    
    // Подписка на события интерактивных команд
    this.interactiveCommandManager.onInputRequired((event) => {
      if (this.onInteractiveInputRequiredCallback) {
        this.onInteractiveInputRequiredCallback(event.sessionId, event.command, event.data, event.prompt);
      }
    });
    
    this.setupTerminalEventListeners();
  }

  // Core Session Management
  async createSession(name?: string): Promise<Session> {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Maximum ${this.maxSessions} sessions allowed`);
    }

    const sessionId = this.generateSessionId();
    const sessionName = name || `Session ${this.sessions.size + 1}`;
    
    this.outputChannel.appendLine(`Creating session: ${sessionName} (${sessionId})`);

    const session: Session = {
      id: sessionId,
      name: sessionName,
      terminal: null as any, // Will be created below
      messages: [],
      status: 'creating',
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    this.sessions.set(sessionId, session);

    try {
      // Create terminal
      const terminal = await this.createTerminal(sessionName);
      session.terminal = terminal;
      session.status = 'starting';

      // Start Claude Code
      await this.startClaudeCode(session);
      
      // Make this session active
      await this.switchToSession(sessionId);

      // **НЕ запускаем JSONL мониторинг при создании - только после первого сообщения**
      this.sessionMonitoringStatus.set(sessionId, false);
      this.outputChannel.appendLine(`📡 JSONL monitoring will start after first message for session: ${sessionName}`);

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

    // **Останавливаем JSONL мониторинг для закрываемой сессии**
    this.jsonlMonitor.stopMonitoring(sessionId);
    this.sessionMonitoringStatus.delete(sessionId);
    
    // Останавливаем мониторинг интерактивных команд
    this.interactiveCommandManager.stopCommandTracking(sessionId, session.terminal);

    // Close terminal
    session.terminal.dispose();
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

    this.outputChannel.appendLine(`Switching to session: ${session.name} (${sessionId})`);

    // Hide current active terminal if any
    const currentActiveSession = this.getActiveSession();
    if (currentActiveSession && currentActiveSession.id !== sessionId) {
      this.outputChannel.appendLine(`Hiding previous active session: ${currentActiveSession.name}`);
      // VS Code automatically manages terminal visibility, but we track the state
    }

    // Update last active time
    session.lastActiveAt = new Date();

    // Critical: Show terminal and ensure it's focused
    this.outputChannel.appendLine(`Showing terminal for session: ${session.name}`);
    session.terminal.show(true); // preserveFocus = true to ensure terminal gets focus

    // Additional show call for reliability (crucial for Claude CLI)
    await new Promise(resolve => setTimeout(resolve, 100));
    session.terminal.show(true);

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

    // 🚀 Proactive token initialization on EVERY user message
    this.outputChannel.appendLine(`🚀 User message in session ${sessionId} - updating tokens`);
    try {
      await this.jsonlMonitor.initializeSessionTokens(sessionId, session.name);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error updating session tokens: ${error}`);
    }

    // Fire event for user message
    this.fireEvent('messageReceived', sessionId, messageObj);

    // **ПОТОК 1: Extension → Terminal** 
    // Простая отправка сообщения в терминал с автоматическим Enter
    session.terminal.sendText(message, true);
    
    // Дополнительная гарантия Enter для Claude CLI с увеличенной паузой для длинных сообщений
    const delay = Math.max(500, message.length * 2); // Минимум 500ms, +2ms за символ
    this.outputChannel.appendLine(`⏰ Waiting ${delay}ms before additional Enter for message length: ${message.length}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    session.terminal.sendText('', true);
    
    // **ИСПРАВЛЕНИЕ ПРОБЛЕМЫ 1: Запуск JSONL мониторинга после первого сообщения**
    const isMonitoringStarted = this.sessionMonitoringStatus.get(sessionId);
    if (!isMonitoringStarted) {
      this.outputChannel.appendLine(`🚀 Starting JSONL monitoring after first message for session: ${session.name}`);
      this.sessionMonitoringStatus.set(sessionId, true);
      
      // Задержка перед поиском JSONL файла (Claude Code создает файл после обработки сообщения)
      this.outputChannel.appendLine(`⏳ Waiting 3 seconds for Claude Code to create new JSONL file...`);
      setTimeout(() => {
        this.jsonlMonitor.startMonitoring(session.id, session.name);
        this.outputChannel.appendLine(`✅ JSONL monitoring started with delay for session: ${session.name}`);
      }, 3000); // 3 секунды задержка
    }
    
    // **ИСПРАВЛЕНИЕ ПРОБЛЕМЫ 2: Принудительное обновление терминала для длинных сообщений**
    if (message.length > 200) { // Для сообщений длиннее 200 символов
      this.outputChannel.appendLine(`🔄 Force refreshing terminal for long message (${message.length} chars)`);
      
      // Показать и сфокусировать терминал
      session.terminal.show(true);
      
      // Дополнительная пауза для визуального обновления
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Принудительный фокус через команду VS Code
      try {
        await vscode.commands.executeCommand('workbench.action.terminal.focus');
        this.outputChannel.appendLine(`✅ Terminal focus command executed`);
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Terminal focus command failed: ${error}`);
      }
    }
    
    // Update last active time
    session.lastActiveAt = new Date();

    this.outputChannel.appendLine(`✅ Message sent to terminal: ${session.name}`);
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

    // Проверяем, является ли команда интерактивной
    if (this.interactiveCommandManager.isInteractiveCommand(slashCommand)) {
      this.outputChannel.appendLine(`🔄 Interactive command detected: ${slashCommand} - setting up response monitoring`);
      // Начинаем отслеживание интерактивной команды
      this.interactiveCommandManager.startCommandTracking(sessionId, slashCommand, session.terminal);
    }

    // **Прямое выполнение слэш-команды в терминале с принудительным Enter**
    // Отправляем команду без автоматического Enter
    session.terminal.sendText(slashCommand, false);
    
    // **Принудительная отправка Enter для выполнения команды**
    this.outputChannel.appendLine(`⏎ Sending Enter to execute command`);
    await new Promise(resolve => setTimeout(resolve, 50));
    session.terminal.sendText('\r', false);
    
    // Update last active time
    session.lastActiveAt = new Date();

    this.outputChannel.appendLine(`✅ Slash command executed in terminal: ${session.name}`);
  }

  /**
   * Обработка ответа пользователя на интерактивную команду
   */
  async handleInteractiveResponse(response: UserResponse): Promise<void> {
    const session = this.sessions.get(response.sessionId);
    if (!session) {
      throw new Error(`Session ${response.sessionId} not found`);
    }

    this.outputChannel.appendLine(`📝 Handling interactive response for session ${response.sessionId}: ${response.selection}`);

    // Получаем отформатированный ответ для терминала
    const terminalResponse = this.interactiveCommandManager.handleUserResponse(response);
    
    if (terminalResponse) {
      // Отправляем ответ в терминал
      session.terminal.sendText(terminalResponse, true); // true для автоматического Enter
      this.outputChannel.appendLine(`✅ Sent response to terminal: ${terminalResponse}`);
    } else {
      this.outputChannel.appendLine(`❌ Failed to handle interactive response`);
    }
  }

  /**
   * **ПОТОК 2: Terminal → Extension**
   * Обработка ответов, полученных от Claude Code через JSONL мониторинг
   */
  private handleResponseFromTerminal(sessionId: string, response: Message): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.outputChannel.appendLine(`⚠️ Received response for unknown session: ${sessionId}`);
      return;
    }

    this.outputChannel.appendLine(`📨 Processing response for session ${session.name}: ${response.content.substring(0, 100)}...`);

    // Добавляем ответ в историю сессии
    session.messages.push(response);
    this.trimMessageHistory(session);

    // Update last active time
    session.lastActiveAt = new Date();

    // Fire event для assistant message
    this.fireEvent('messageReceived', sessionId, response);

    this.outputChannel.appendLine(`✅ Response added to session: ${session.name}`);
  }

  /**
   * 🔧 Обработка служебной информации от Claude Code через JSONL мониторинг
   */
  private handleServiceInfoFromTerminal(sessionId: string, serviceInfo: ServiceMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.outputChannel.appendLine(`⚠️ Received service info for unknown session: ${sessionId}`);
      return;
    }

    this.outputChannel.appendLine(`🔧 New service info detected for ${session.name}: ${serviceInfo.toolUse.length} tools, status: ${serviceInfo.status}`);

    // Fire event для служебной информации
    this.fireEvent('serviceInfoReceived', sessionId, serviceInfo);
  }

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

  // Terminal Health Monitoring
  async checkSessionHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();
    
    for (const [sessionId, session] of this.sessions) {
      try {
        // Check if terminal still exists and is healthy
        const pid = await session.terminal.processId;
        const isHealthy = (pid !== undefined) && (session.status === 'ready' || session.status === 'starting');
        
        healthStatus.set(sessionId, isHealthy);
        
        if (!isHealthy) {
          this.outputChannel.appendLine(`Session ${session.name} (${sessionId}) appears unhealthy. PID: ${pid}, Status: ${session.status}`);
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
      const pid = await session.terminal.processId;
      
      diagnostics.push(`  • ${session.name} (${sessionId}):`);
      diagnostics.push(`    - Status: ${session.status}`);
      diagnostics.push(`    - Healthy: ${isHealthy ? '✅' : '❌'}`);
      diagnostics.push(`    - PID: ${pid || 'Unknown'}`);
      diagnostics.push(`    - Terminal Name: ${session.terminal.name}`);
      diagnostics.push(`    - Messages: ${session.messages.length}`);
      diagnostics.push(`    - Created: ${session.createdAt.toISOString()}`);
      diagnostics.push(`    - Last Active: ${session.lastActiveAt.toISOString()}`);
    }
    
    return diagnostics.join('\n');
  }

  // Private Methods
  private async createTerminal(name: string): Promise<vscode.Terminal> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    
    const terminal = vscode.window.createTerminal({
      name: `Claude Session: ${name}`,
      cwd: workspaceFolder?.uri.fsPath
    });

    // Show terminal immediately
    terminal.show();

    return terminal;
  }

  private async startClaudeCode(session: Session): Promise<void> {
    const { terminal, id: sessionId } = session;
    
    this.outputChannel.appendLine(`Starting Claude Code in session ${sessionId}`);
    
    try {
      // Send claude command with automatic Enter
      terminal.sendText('claude', true);
      
      // Update status to starting
      session.status = 'starting';
      this.fireEvent('sessionStatusChanged', sessionId, 'starting');
      
      // Give Claude time to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Send additional Enter to ensure Claude is ready (critical for Claude CLI)
      terminal.sendText('', true);
      
      // Wait a bit more for Claude to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update status to ready
      session.status = 'ready';
      this.fireEvent('sessionStatusChanged', sessionId, 'ready');
      
      this.outputChannel.appendLine(`Claude Code ready in session ${sessionId}`);
      
    } catch (error) {
      session.status = 'error';
      this.fireEvent('sessionStatusChanged', sessionId, 'error');
      throw error;
    }
  }


  private setupTerminalEventListeners(): void {
    vscode.window.onDidCloseTerminal((closedTerminal) => {
      this.onTerminalClosed(closedTerminal);
    });
  }

  private onTerminalClosed(closedTerminal: vscode.Terminal): void {
    // Find session with this terminal
    for (const [sessionId, session] of this.sessions) {
      if (session.terminal === closedTerminal) {
        this.outputChannel.appendLine(`Terminal closed by user for session: ${session.name} (${sessionId})`);
        
        // Mark session as closed but don't dispose terminal (already closed)
        session.status = 'closed';
        
        // Remove from sessions
        this.sessions.delete(sessionId);
        
        // Handle automatic session switching if this was the active session
        if (this.activeSessionId === sessionId) {
          this.outputChannel.appendLine(`Active session was closed, switching to another session...`);
          
          const remainingSessions = Array.from(this.sessions.keys());
          if (remainingSessions.length > 0) {
            // Automatically switch to the first available session
            this.switchToSession(remainingSessions[0]).then(() => {
              const newActiveSession = this.sessions.get(remainingSessions[0]);
              this.outputChannel.appendLine(`Auto-switched to session: ${newActiveSession?.name} (${remainingSessions[0]})`);
            }).catch(error => {
              this.outputChannel.appendLine(`Error auto-switching session: ${error}`);
              this.activeSessionId = null;
            });
          } else {
            this.activeSessionId = null;
            this.outputChannel.appendLine('No remaining sessions available');
          }
        }
        
        // Fire events
        this.fireEvent('sessionClosed', sessionId);
        this.fireEvent('sessionStatusChanged', sessionId, 'closed');
        
        break;
      }
    }
  }

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

  // Cleanup
  dispose(): void {
    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId).catch(console.error);
    }
    
    this.sessions.clear();
    
    // Dispose interactive command manager
    this.interactiveCommandManager.dispose();
  }
}