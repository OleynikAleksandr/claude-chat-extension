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
    sessionId?: string;
    messageType?: string;
}

export interface StatusUpdatePayload {
    status: 'ready' | 'busy' | 'error' | 'disconnected';
    sessionActive: boolean;
    claudeCliRunning?: boolean;
    lastActivity?: number;
}

export interface ErrorPayload {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
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
 
    CLAUDE_CLI_NOT_FOUND = 'CLAUDE_CLI_NOT_FOUND',
    MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
    RATE_LIMITED = 'RATE_LIMITED',
    COMMUNICATION_ERROR = 'COMMUNICATION_ERROR',
    USER_CANCELLED = 'USER_CANCELLED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Real-time communication types
export interface ProcessedMessage {
    type: 'text' | 'thinking' | 'tool_use' | 'result' | 'error' | 'status' | 'unknown';
    data: any;
    timestamp: number;
    sessionId?: string;
    metadata?: {
        messageId?: string;
        role?: string;
        toolName?: string;
        contentType?: string;
        isFiltered?: boolean;
    };
}

export interface RealTimeResponse {
    success: boolean;
    message: ProcessedMessage;
    sessionId: string;
    executionId: string;
}

export interface BidirectionalSessionInfo {
    sessionId: string;
    isActive: boolean;
    processId?: number;
    startTime: number;
    messageCount: number;
    mode: 'oneshoot';
}

// Configuration
export interface ChatConfig {
    maxMessageLength: number;
    messageTimeout: number;
    retryAttempts: number;
    pingInterval: number;
    autoDetectClaude: boolean;
    realTimeEnabled?: boolean;
    streamJsonEnabled?: boolean;
    messageFiltering?: {
        filterThinking?: boolean;
        filterToolUse?: boolean;
        filterSystemMessages?: boolean;
    };
}