/**
 * Dual Session Manager
 * Manages up to 2 concurrent Claude Code sessions
 * Claude Chat Extension v0.4.0
 */

import * as vscode from 'vscode';
import { Session, SessionStatus, Message, SessionManagerEvents } from '../types/Session';

export class DualSessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;
  private readonly maxSessions = 2;
  private readonly messageHistoryLimit = 100;
  private eventEmitter = new vscode.EventEmitter<keyof SessionManagerEvents>();

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
      await this.startClaudeCode(terminal);
      
      // Wait for Claude to be ready
      session.status = 'ready';
      
      // Make this session active
      await this.switchToSession(sessionId);

      this.outputChannel.appendLine(`Session created successfully: ${sessionName}`);
      this.eventEmitter.fire('sessionCreated', session);

      return session;
    } catch (error) {
      session.status = 'error';
      this.outputChannel.appendLine(`Failed to create session: ${error}`);
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

    this.eventEmitter.fire('sessionClosed', sessionId);
  }

  async switchToSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.outputChannel.appendLine(`Switching to session: ${session.name} (${sessionId})`);

    // Update last active time
    session.lastActiveAt = new Date();

    // Show terminal
    session.terminal.show();

    // Update active session
    this.activeSessionId = sessionId;

    this.eventEmitter.fire('sessionSwitched', sessionId);
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

    this.eventEmitter.fire('messageReceived', sessionId, messageObj);
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

  private async startClaudeCode(terminal: vscode.Terminal): Promise<void> {
    // Send claude command with automatic Enter
    terminal.sendText('claude', true);
    
    // Give Claude time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Send additional Enter to ensure Claude is ready
    terminal.sendText('', true);
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
        this.outputChannel.appendLine(`Terminal closed for session: ${session.name} (${sessionId})`);
        this.closeSession(sessionId).catch(error => {
          this.outputChannel.appendLine(`Error cleaning up closed session: ${error}`);
        });
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
  onSessionCreated(listener: (session: Session) => void): vscode.Disposable {
    return this.eventEmitter.event(listener as any);
  }

  onSessionClosed(listener: (sessionId: string) => void): vscode.Disposable {
    return this.eventEmitter.event(listener as any);
  }

  onSessionSwitched(listener: (sessionId: string) => void): vscode.Disposable {
    return this.eventEmitter.event(listener as any);
  }

  // Cleanup
  dispose(): void {
    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId).catch(console.error);
    }
    
    this.sessions.clear();
    this.eventEmitter.dispose();
  }
}