/**
 * Dual Session Manager
 * Manages up to 2 concurrent Claude Code sessions
 * Claude Chat Extension v0.4.0
 */

import * as vscode from 'vscode';
import { Session, Message } from '../types/Session';

export class DualSessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;
  private readonly maxSessions = 2;
  private readonly messageHistoryLimit = 100;
  
  // Event callbacks
  private onSessionCreatedCallback?: (session: Session) => void;
  private onSessionClosedCallback?: (sessionId: string) => void;
  private onSessionSwitchedCallback?: (sessionId: string) => void;
  private onSessionStatusChangedCallback?: (sessionId: string, status: Session['status']) => void;
  private onMessageReceivedCallback?: (sessionId: string, message: Message) => void;

  constructor(private outputChannel: vscode.OutputChannel) {
    this.setupTerminalEventListeners();
  }

  // Core Session Management
  async createSession(name?: string): Promise<Session> {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Maximum ${this.maxSessions} sessions allowed`);
    }

    const sessionId = this.generateSessionId();
    const sessionName = name || `Claude Chat ${this.sessions.size + 1}`;
    
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

    this.outputChannel.appendLine(`Sending message to session ${sessionId}: ${message}`);

    // Add message to history
    const messageObj: Message = {
      id: this.generateMessageId(),
      content: message,
      timestamp: new Date(),
      type: 'user',
      sessionId
    };

    session.messages.push(messageObj);
    this.trimMessageHistory(session);

    // Send to terminal
    await this.executeWithRetry(session.terminal, message);

    // Update last active time
    session.lastActiveAt = new Date();

    this.fireEvent('messageReceived', sessionId, messageObj);
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

  private async executeWithRetry(terminal: vscode.Terminal, command: string): Promise<void> {
    // Send command with auto-Enter
    terminal.sendText(command, true);
    
    // Critical: Additional Enter for Claude CLI
    await new Promise(resolve => setTimeout(resolve, 50));
    terminal.sendText('', true);
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
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  // Cleanup
  dispose(): void {
    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId).catch(console.error);
    }
    
    this.sessions.clear();
  }
}