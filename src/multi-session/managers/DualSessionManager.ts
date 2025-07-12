/**
 * Dual Session Manager
 * Manages up to 2 concurrent Claude Code sessions
 * Claude Chat Extension
 */

import * as vscode from 'vscode';
import { Session, Message, ServiceMessage, SessionMode } from '../types/Session';
import { JsonlResponseMonitor } from '../monitors/JsonlResponseMonitor';
import { InteractiveCommandManager, UserResponse } from '../../interactive-commands';
import { ProcessSessionFactory } from './ProcessSessionManager';
import { OneShootProcessSessionFactory } from './OneShootProcessSessionManager';

export class DualSessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;
  private readonly maxSessions = 2;
  private readonly messageHistoryLimit = 100;
  private jsonlMonitor: JsonlResponseMonitor;
  private sessionMonitoringStatus: Map<string, boolean> = new Map(); // Отслеживание статуса мониторинга
  private interactiveCommandManager: InteractiveCommandManager;
  private processSessionFactory: typeof ProcessSessionFactory;
  
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
    
    // Инициализация фабрики процесс-сессий
    this.processSessionFactory = ProcessSessionFactory;
    
    this.setupTerminalEventListeners();
  }

  // Core Session Management
  async createSession(name?: string, mode: SessionMode = 'terminal'): Promise<Session> {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Maximum ${this.maxSessions} sessions allowed`);
    }

    const sessionId = this.generateSessionId();
    const sessionName = name || `Session ${this.sessions.size + 1}`;
    
    this.outputChannel.appendLine(`Creating session: ${sessionName} (${sessionId})`);

    const session: Session = {
      id: sessionId,
      name: sessionName,
      mode: mode,
      terminal: undefined,
      processSession: undefined,
      messages: [],
      status: 'creating',
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    this.sessions.set(sessionId, session);

    try {
      if (mode === 'terminal') {
        // Create VS Code terminal
        const terminal = await this.createTerminal(sessionName);
        session.terminal = terminal;
        session.status = 'starting';

        // Start Claude Code in terminal
        await this.startClaudeCode(session);
        
        // **НЕ запускаем JSONL мониторинг при создании - только после первого сообщения**
        this.sessionMonitoringStatus.set(sessionId, false);
        this.outputChannel.appendLine(`📡 JSONL monitoring will start after first message for session: ${sessionName}`);
      } else if (mode === 'process') {
        // Create process session
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const workingDirectory = workspaceFolder?.uri.fsPath || process.cwd();
        
        const processSession = this.processSessionFactory.create({
          sessionId: sessionId,
          sessionName: sessionName,
          workingDirectory: workingDirectory,
          outputChannel: this.outputChannel,
          debugMode: true // Enable visible Terminal.app for debugging Claudia approach
        });
        
        session.processSession = processSession;
        session.status = 'starting';
        
        // Setup process event handlers
        this.setupProcessEventHandlers(session);
        
        // Start process session
        await processSession.start();
        
        // Start Claude Code in process
        await this.startClaudeCodeInProcess(session);
      } else if (mode === 'oneshoot') {
        // Create OneShoot process session
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const workingDirectory = workspaceFolder?.uri.fsPath || process.cwd();
        
        const oneShootSession = OneShootProcessSessionFactory.create({
          sessionId: sessionId,
          sessionName: sessionName,
          workingDirectory: workingDirectory,
          outputChannel: this.outputChannel
        });
        
        session.oneShootSession = oneShootSession;
        session.status = 'starting';
        
        // Setup OneShoot event handlers
        this.setupOneShootEventHandlers(session);
        
        // OneShoot sessions are ready immediately (no persistent process)
        session.status = 'ready';
        this.fireEvent('sessionStatusChanged', sessionId, 'ready');
        
        this.outputChannel.appendLine(`OneShoot session ready: ${sessionName}`);
      }
      
      // Make this session active
      await this.switchToSession(sessionId);

      this.outputChannel.appendLine(`Session created successfully: ${sessionName} (${mode} mode)`);
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

    this.outputChannel.appendLine(`Closing session: ${session.name} (${sessionId}, ${session.mode} mode)`);

    if (session.mode === 'terminal') {
      // **Останавливаем JSONL мониторинг для закрываемой сессии**
      this.jsonlMonitor.stopMonitoring(sessionId);
      this.sessionMonitoringStatus.delete(sessionId);
      
      // Останавливаем мониторинг интерактивных команд
      if (session.terminal) {
        this.interactiveCommandManager.stopCommandTracking(sessionId, session.terminal);
        // Close terminal
        session.terminal.dispose();
      }
    } else if (session.mode === 'process' && session.processSession) {
      // Close process session
      await session.processSession.dispose();
    } else if (session.mode === 'oneshoot' && session.oneShootSession) {
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

    this.outputChannel.appendLine(`Switching to session: ${session.name} (${sessionId}, ${session.mode} mode)`);

    // Hide current active terminal if any
    const currentActiveSession = this.getActiveSession();
    if (currentActiveSession && currentActiveSession.id !== sessionId) {
      this.outputChannel.appendLine(`Hiding previous active session: ${currentActiveSession.name}`);
      // VS Code automatically manages terminal visibility, but we track the state
    }

    // Update last active time
    session.lastActiveAt = new Date();

    // Mode-specific switching logic
    if (session.mode === 'terminal') {
      // Critical: Show terminal and ensure it's focused
      if (session.terminal) {
        this.outputChannel.appendLine(`Showing terminal for session: ${session.name}`);
        session.terminal.show(true); // preserveFocus = true to ensure terminal gets focus

        // Additional show call for reliability (crucial for Claude CLI)
        await new Promise(resolve => setTimeout(resolve, 100));
        session.terminal.show(true);
      }
    } else if (session.mode === 'process') {
      // Process sessions don't have a visual terminal to show
      this.outputChannel.appendLine(`Switched to process session: ${session.name}`);
    }

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

    // Send message based on session mode
    if (session.mode === 'terminal') {
      // **ПОТОК 1: Extension → Terminal** 
      if (!session.terminal) {
        throw new Error(`Terminal not available for session ${sessionId}`);
      }
      
      // Send to VS Code terminal
      session.terminal.sendText(message, true);
      
      // Дополнительная гарантия Enter для Claude CLI с увеличенной паузой для длинных сообщений
      const delay = Math.max(500, message.length * 2); // Минимум 500ms, +2ms за символ
      this.outputChannel.appendLine(`⏰ Waiting ${delay}ms before additional Enter for message length: ${message.length}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      session.terminal.sendText('', true);
      
      // **ИСПРАВЛЕНИЕ ПРОБЛЕМЫ 2: Принудительное обновление терминала для длинных сообщений**
      if (message.length > 200) { // Для сообщений длиннее 200 символов
        this.outputChannel.appendLine(`🔄 Force refreshing terminal for long message (${message.length} chars)`);
        // Показать и сфокусировать терминал
        session.terminal.show(true);
      }
      
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
    } else if (session.mode === 'process' && session.processSession) {
      // **ПОТОК 1: Extension → Process (Terminal.app)**
      session.processSession.sendMessage(message);
      this.outputChannel.appendLine(`📤 Message sent to process session: ${session.name}`);
      
      // Для Process сессий используем прямое чтение из Terminal.app через AppleScript
      // НЕ используем JSONL мониторинг - читаем stdout напрямую
    } else if (session.mode === 'oneshoot' && session.oneShootSession) {
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
        
      } catch (error) {
        this.outputChannel.appendLine(`❌ OneShoot sendMessage error: ${error}`);
        // Error is already logged, OneShoot errors are handled internally
      }
    } else {
      throw new Error(`Invalid session mode or session not properly initialized: ${session.mode}`);
    }
      
    // Update last active time
    session.lastActiveAt = new Date();

    // Terminal-specific post-processing
    if (session.mode === 'terminal') {
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

    this.outputChannel.appendLine(`✅ Message sent to ${session.mode} session: ${session.name}`);
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

    if (session.mode === 'terminal') {
      if (!session.terminal) {
        throw new Error(`Terminal not available for session ${sessionId}`);
      }
      
      // Use interactive command manager
      if (this.interactiveCommandManager.isInteractiveCommand(slashCommand)) {
        this.outputChannel.appendLine(`🔄 Interactive command detected: ${slashCommand} - setting up response monitoring`);
        this.interactiveCommandManager.startCommandTracking(sessionId, slashCommand, session.terminal);
      }

      // Send to VS Code terminal
      session.terminal.sendText(slashCommand, false);
      await new Promise(resolve => setTimeout(resolve, 50));
      session.terminal.sendText('\r', false);
    } else if (session.mode === 'process' && session.processSession) {
      // Send to process session
      session.processSession.executeSlashCommand(slashCommand);
    } else if (session.mode === 'oneshoot' && session.oneShootSession) {
      // Send to OneShoot session
      session.oneShootSession.executeSlashCommand(slashCommand);
    } else {
      throw new Error(`Invalid session mode or session not properly initialized: ${session.mode}`);
    }
    
    // Update last active time
    session.lastActiveAt = new Date();

    this.outputChannel.appendLine(`✅ Slash command executed in ${session.mode} session: ${session.name}`);
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

    if (!session.terminal) {
      throw new Error(`Terminal not available for session ${response.sessionId}`);
    }
    
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

  // Session Health Monitoring
  async checkSessionHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();
    
    for (const [sessionId, session] of this.sessions) {
      try {
        let isHealthy = false;
        
        if (session.mode === 'terminal' && session.terminal) {
          // Check if terminal still exists and is healthy
          const pid = await session.terminal.processId;
          isHealthy = (pid !== undefined) && (session.status === 'ready' || session.status === 'starting');
        } else if (session.mode === 'process' && session.processSession) {
          // Check if process session is alive
          isHealthy = session.processSession.isAlive() && (session.status === 'ready' || session.status === 'starting');
        } else if (session.mode === 'oneshoot' && session.oneShootSession) {
          // OneShoot sessions are always healthy if they exist
          isHealthy = session.oneShootSession.isAlive() && (session.status === 'ready' || session.status === 'starting');
        }
        
        healthStatus.set(sessionId, isHealthy);
        
        if (!isHealthy) {
          this.outputChannel.appendLine(`Session ${session.name} (${sessionId}, ${session.mode}) appears unhealthy. Status: ${session.status}`);
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
      diagnostics.push(`    - Mode: ${session.mode}`);
      diagnostics.push(`    - Status: ${session.status}`);
      diagnostics.push(`    - Healthy: ${isHealthy ? '✅' : '❌'}`);
      
      if (session.mode === 'terminal' && session.terminal) {
        const pid = await session.terminal.processId;
        diagnostics.push(`    - Terminal PID: ${pid || 'Unknown'}`);
        diagnostics.push(`    - Terminal Name: ${session.terminal.name}`);
      } else if (session.mode === 'process' && session.processSession) {
        diagnostics.push(`    - Process Alive: ${session.processSession.isAlive() ? '✅' : '❌'}`);
      } else if (session.mode === 'oneshoot' && session.oneShootSession) {
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
    const { id: sessionId } = session;
    
    if (!session.terminal) {
      throw new Error('Terminal not available for session');
    }
    
    this.outputChannel.appendLine(`Starting Claude Code in session ${sessionId}`);
    
    try {
      // Send claude command with automatic Enter
      session.terminal.sendText('claude', true);
      
      // Update status to starting
      session.status = 'starting';
      this.fireEvent('sessionStatusChanged', sessionId, 'starting');
      
      // Give Claude time to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Send additional Enter to ensure Claude is ready (critical for Claude CLI)
      session.terminal.sendText('', true);
      
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

  // Process Session Event Handlers
  private setupProcessEventHandlers(session: Session): void {
    if (!session.processSession) {
      return;
    }
    
    session.processSession.onData = (data: string) => {
      this.handleProcessData(session.id, data);
    };
    
    session.processSession.onExit = (code: number | null, signal: string | null) => {
      this.handleProcessExit(session.id, code, signal);
    };
    
    session.processSession.onError = (error: Error) => {
      this.handleProcessError(session.id, error);
    };
    
    session.processSession.onInteractivePrompt = (prompt: string) => {
      this.handleProcessInteractivePrompt(session.id, prompt);
    };
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
  }

  private handleProcessData(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.outputChannel.appendLine(`⚠️ Received process data for unknown session: ${sessionId}`);
      return;
    }

    this.outputChannel.appendLine(`📨 Process data for session ${session.name}: ${data.substring(0, 100)}...`);

    // Parse potential Claude response from process data
    // Similar to handleResponseFromTerminal but for process mode
    try {
      // Try to detect Claude response patterns in the data
      if (this.isClaudeResponse(data)) {
        const response: Message = {
          id: this.generateMessageId(),
          content: data,
          timestamp: new Date(),
          type: 'assistant',
          sessionId: sessionId
        };

        session.messages.push(response);
        this.trimMessageHistory(session);
        session.lastActiveAt = new Date();

        this.fireEvent('messageReceived', sessionId, response);
      }
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error processing data from process session: ${error}`);
    }
  }

  private handleProcessExit(sessionId: string, code: number | null, signal: string | null): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.outputChannel.appendLine(`💀 Process session exited: ${session.name}, code=${code}, signal=${signal}`);
    
    session.status = 'closed';
    this.fireEvent('sessionStatusChanged', sessionId, 'closed');
    
    // Auto-cleanup if this was an unexpected exit
    if (code !== 0) {
      this.closeSession(sessionId).catch(console.error);
    }
  }

  private handleProcessError(sessionId: string, error: Error): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.outputChannel.appendLine(`❌ Process session error: ${session.name}, error=${error.message}`);
    
    session.status = 'error';
    this.fireEvent('sessionStatusChanged', sessionId, 'error');
  }

  private handleProcessInteractivePrompt(sessionId: string, prompt: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.outputChannel.appendLine(`🔄 Process interactive prompt: ${session.name}, prompt=${prompt}`);
    
    // Fire interactive input required event
    if (this.onInteractiveInputRequiredCallback) {
      this.onInteractiveInputRequiredCallback(sessionId, 'interactive', {}, prompt);
    }
  }

  private isClaudeResponse(data: string): boolean {
    // Simple heuristic to detect Claude responses
    // This can be enhanced based on Claude's output patterns
    return data.includes('Claude') || data.length > 50;
  }

  private async startClaudeCodeInProcess(session: Session): Promise<void> {
    if (!session.processSession) {
      throw new Error('Process session not available');
    }

    this.outputChannel.appendLine(`Claude Code process already started directly in process session ${session.id}`);
    
    try {
      // Update status
      session.status = 'starting';
      this.fireEvent('sessionStatusChanged', session.id, 'starting');
      
      // Update status to ready immediately as claude starts directly
      session.status = 'ready';
      this.fireEvent('sessionStatusChanged', session.id, 'ready');
      
      this.outputChannel.appendLine(`Claude Code ready in process session ${session.id}`);
      
    } catch (error) {
      session.status = 'error';
      this.fireEvent('sessionStatusChanged', session.id, 'error');
      throw error;
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
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to parse streaming JSON: ${error}`);
    }
  }

  private processAssistantStreamingMessage(sessionId: string, response: import('./OneShootProcessSessionManager').ClaudeJsonResponse): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (response.message.content && Array.isArray(response.message.content)) {
      for (const block of response.message.content) {
        if (block.type === 'tool_use') {
          // Complete all running tools before starting a new one
          this.completeAllRunningTools(sessionId);
          
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
          // Complete all running tools before showing text
          this.completeAllRunningTools(sessionId);
          
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
    if (!session || !session.pendingTools) return;

    const toolId = response.message.tool_use_id;
    const toolMessage = session.pendingTools.get(toolId);
    
    if (toolMessage && toolMessage.toolInfo) {
      toolMessage.toolInfo.status = response.message.is_error ? 'error' : 'completed';
      toolMessage.toolInfo.result = this.formatToolResult(response.message);
      toolMessage.toolInfo.endTime = new Date();
      
      // Update UI immediately
      this.fireEvent('messageReceived', sessionId, toolMessage);
      
      // Remove from pending
      session.pendingTools.delete(toolId);
      
      this.outputChannel.appendLine(`✅ Tool completed: ${toolMessage.toolInfo.name}`);
    }
  }


  private completeAllRunningTools(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.pendingTools) return;
    
    // Complete all running tools
    for (const [toolId, toolMessage] of session.pendingTools) {
      if (toolMessage.toolInfo?.status === 'running') {
        // Update status to completed
        toolMessage.toolInfo.status = 'completed';
        toolMessage.toolInfo.endTime = new Date();
        
        // Send update to webview
        this.fireEvent('messageReceived', sessionId, toolMessage);
        this.outputChannel.appendLine(`✅ Auto-completed tool: ${toolMessage.toolInfo.name}`);
        
        // Remove from pendingTools
        session.pendingTools.delete(toolId);
      }
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