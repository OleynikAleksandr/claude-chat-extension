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

// 🎨 Enhanced Service Information Types
export interface ServiceMessage {
  id: string;
  type: 'service';
  sessionId: string;
  timestamp: Date;
  toolUse: ToolUseItem[];
  thinking: string;
  usage: UsageInfo;
  status: ServiceStatus;
  duration?: number;
}

export interface ToolUseItem {
  id: string;
  name: string;
  input: any;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
  result?: any;
  error?: string;
}

export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  service_tier?: string;
  cost_estimate?: number;
}

export type ServiceStatus = 'initializing' | 'processing' | 'completed' | 'error';

// 🎨 Service Information Events
export interface ServiceInfoDetected {
  sessionId: string;
  serviceInfo: ServiceMessage;
}

export interface SessionConfig {
  enableMultiSession: boolean;
  maxSessions: number;
  defaultSessionName: string;
  autoSwitchTerminals: boolean;
  messageHistoryLimit: number;
}

// Webview ↔ Extension Communication
export type WebviewMessage = 
  | { command: 'createSession'; name?: string }
  | { command: 'switchSession'; sessionId: string }
  | { command: 'closeSession'; sessionId: string }
  | { command: 'sendMessage'; sessionId: string; message: string }
  | { command: 'renameSession'; sessionId: string; newName: string }
  | { command: 'getSessionState' }
  | { command: 'healthCheck' };

export type ExtensionMessage = 
  | { command: 'sessionsUpdated'; sessions: Omit<Session, 'terminal'>[] }
  | { command: 'activeSessionChanged'; sessionId: string }
  | { command: 'sessionStatusChanged'; sessionId: string; status: SessionStatus }
  | { command: 'messageReceived'; sessionId: string; message: Message }
  | { command: 'sessionCreated'; sessionId: string; session: Omit<Session, 'terminal'> }
  | { command: 'messageResponse'; sessionId: string; success: boolean; response?: Message; error?: string }
  | { command: 'healthCheckResult'; healthStatus: [string, boolean][] }
  | { command: 'serviceInfoReceived'; sessionId: string; serviceInfo: ServiceMessage }
  | { command: 'error'; message: string; sessionId?: string };

export interface SessionManagerEvents {
  sessionCreated: (session: Session) => void;
  sessionClosed: (sessionId: string) => void;
  sessionSwitched: (sessionId: string) => void;
  sessionStatusChanged: (sessionId: string, status: SessionStatus) => void;
  messageReceived: (sessionId: string, message: Message) => void;
}