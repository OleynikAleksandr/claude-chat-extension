/**
 * Core types for Multi-Session Architecture
 * Claude Chat Extension
 */

import * as vscode from 'vscode';

export interface Session {
  id: string;
  name: string;
  terminal: vscode.Terminal;
  messages: Message[];
  status: SessionStatus;
  createdAt: Date;
  lastActiveAt: Date;
}

export type SessionStatus = 'creating' | 'starting' | 'ready' | 'error' | 'closed';

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  sessionId: string;
}

export interface SessionConfig {
  enableMultiSession: boolean;
  maxSessions: number;
  defaultSessionName: string;
  autoSwitchTerminals: boolean;
  messageHistoryLimit: number;
}

// Claude Code States (from state-detection module)
export type ClaudeCodeState = 'ready' | 'working';

export interface SessionStateData {
  state: ClaudeCodeState;
  stateDescription: string;
  stateEmoji: string;
  isReadyForNewRequest: boolean;
}

// Webview ↔ Extension Communication
export type WebviewMessage = 
  | { command: 'createSession'; name?: string }
  | { command: 'switchSession'; sessionId: string }
  | { command: 'closeSession'; sessionId: string }
  | { command: 'sendMessage'; sessionId: string; message: string }
  | { command: 'renameSession'; sessionId: string; newName: string }
  | { command: 'getSessionState' }
  | { command: 'getSessionStates' }
  | { command: 'healthCheck' }
  | { command: 'startProcessingTracking'; sessionId: string; messageId: string }
  | { command: 'stopProcessingTracking'; sessionId: string }
  | { command: 'interruptProcessing'; sessionId: string }
  | { command: 'getProcessingStatus'; sessionId: string }
  | { command: 'subscribeToProcessingStatus'; sessionId: string }
  | { command: 'unsubscribeFromProcessingStatus'; sessionId: string };

export type ExtensionMessage = 
  | { command: 'sessionsUpdated'; sessions: Omit<Session, 'terminal'>[] }
  | { command: 'activeSessionChanged'; sessionId: string }
  | { command: 'sessionStatusChanged'; sessionId: string; status: SessionStatus }
  | { command: 'messageReceived'; sessionId: string; message: Message }
  | { command: 'sessionCreated'; sessionId: string; session: Omit<Session, 'terminal'> }
  | { command: 'messageResponse'; sessionId: string; success: boolean; response?: Message; error?: string }
  | { command: 'healthCheckResult'; healthStatus: [string, boolean][] }
  | { command: 'sessionStatesUpdated'; sessionStates: Record<string, SessionStateData> }
  | { command: 'sessionStateChanged'; sessionId: string; sessionState: SessionStateData }
  | { command: 'processingStatusUpdate'; sessionId: string; processingSession: any }
  | { command: 'processingStatusResponse'; sessionId: string; processingSession?: any }
  | { command: 'error'; message: string; sessionId?: string };

export interface SessionManagerEvents {
  sessionCreated: (session: Session) => void;
  sessionClosed: (sessionId: string) => void;
  sessionSwitched: (sessionId: string) => void;
  sessionStatusChanged: (sessionId: string, status: SessionStatus) => void;
  messageReceived: (sessionId: string, message: Message) => void;
}