/**
 * Claude State Detection Types
 * Defines all types for Claude Code state detection system
 */

export enum ClaudeCodeState {
    READY = 'ready',         // Готов к запросу
    WORKING = 'working'      // Ассистент работает
}

export interface StateTransition {
    from: ClaudeCodeState;
    to: ClaudeCodeState;
    timestamp: Date;
    trigger: string; // Что вызвало переход
    sessionId: string;
}

export interface StateDetectionEvent {
    state: ClaudeCodeState;
    sessionId: string;
    timestamp: Date;
    metadata?: {
        messageType?: 'user' | 'assistant';
        tokenUsage?: {
            inputTokens: number;
            outputTokens: number;
            cacheCreationTokens?: number;
            cacheReadTokens?: number;
        };
        model?: string;
        duration?: number; // milliseconds
    };
}

export interface ActivityPattern {
    sessionId: string;
    lastUserMessage: Date | null;
    lastAssistantMessage: Date | null;
    lastActivity: Date;
    currentState: ClaudeCodeState;
    isActive: boolean;
    timeoutThreshold: number; // milliseconds
}

export interface StateDetectionConfig {
    // Время ожидания после которого считаем Claude готовым (ms)
    readyTimeoutMs: number;
    
    // Время ожидания после которого считаем сессию неактивной (ms)
    inactivityTimeoutMs: number;
    
    // Интервал проверки состояний (ms)
    checkIntervalMs: number;
    
    // Дебаунс для избежания частых переключений (ms)
    debounceMs: number;
}

export type StateChangeCallback = (event: StateDetectionEvent) => void;
export type StateTransitionCallback = (transition: StateTransition) => void;