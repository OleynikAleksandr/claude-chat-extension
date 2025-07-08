// Type-safe interfaces for webview-extension communication

// Message types from webview to extension
export interface WebviewToExtensionMessage {
    type: 'sendMessage' | 'getStatus' | 'clearHistory' | 'ping';
    payload?: any;
    messageId?: string;
}

export interface SendMessagePayload {
    text: string;
    timestamp: number;
    userId?: string;
}

export interface ClearHistoryPayload {
    confirm: boolean;
}

// Message types from extension to webview  
export interface ExtensionToWebviewMessage {
    type: 'messageResponse' | 'statusUpdate' | 'error' | 'pong' | 'historyCleared';
    payload?: any;
    messageId?: string;
}

export interface MessageResponsePayload {
    success: boolean;
    message?: string;
    error?: string;
    timestamp: number;
}

export interface StatusUpdatePayload {
    status: 'ready' | 'busy' | 'error' | 'disconnected';
    terminalActive: boolean;
    claudeCliRunning?: boolean;
    lastActivity?: number;
}

export interface ErrorPayload {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
}

// Terminal status interface
export interface TerminalStatus {
    hasActiveTerminal: boolean;
    terminalName?: string;
    claudeCliDetected: boolean;
    lastCommand?: string;
    pid?: number;
}

// Communication state
export interface CommunicationState {
    isConnected: boolean;
    lastPing?: number;
    messageQueue: PendingMessage[];
    retryCount: number;
}

export interface PendingMessage {
    id: string;
    message: WebviewToExtensionMessage;
    timestamp: number;
    retries: number;
    maxRetries: number;
}

// Error codes
export enum ErrorCode {
    NO_TERMINAL = 'NO_TERMINAL',
    TERMINAL_BUSY = 'TERMINAL_BUSY', 
    CLAUDE_CLI_NOT_FOUND = 'CLAUDE_CLI_NOT_FOUND',
    MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
    RATE_LIMITED = 'RATE_LIMITED',
    COMMUNICATION_ERROR = 'COMMUNICATION_ERROR',
    USER_CANCELLED = 'USER_CANCELLED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Configuration
export interface ChatConfig {
    maxMessageLength: number;
    messageTimeout: number;
    retryAttempts: number;
    pingInterval: number;
    autoDetectClaude: boolean;
}