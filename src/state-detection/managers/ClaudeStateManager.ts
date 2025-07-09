/**
 * Claude State Manager
 * Центральный менеджер для отслеживания состояний Claude Code
 */

import * as vscode from 'vscode';
import { 
    ClaudeCodeState, 
    StateDetectionEvent, 
    StateTransition, 
    StateDetectionConfig,
    StateChangeCallback,
    StateTransitionCallback
} from '../types/ClaudeState';
import { JsonlPatternDetector, JsonlEntry } from '../detectors/JsonlPatternDetector';

export class ClaudeStateManager {
    private outputChannel: vscode.OutputChannel;
    private patternDetector: JsonlPatternDetector;
    private config: StateDetectionConfig;
    
    // State tracking
    private currentStates: Map<string, ClaudeCodeState> = new Map();
    private lastStateChange: Map<string, Date> = new Map();
    
    // Callbacks
    private stateChangeCallbacks: StateChangeCallback[] = [];
    private stateTransitionCallbacks: StateTransitionCallback[] = [];
    
    // Timers
    private checkInterval: NodeJS.Timeout | null = null;
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(outputChannel: vscode.OutputChannel, config?: Partial<StateDetectionConfig>) {
        this.outputChannel = outputChannel;
        this.patternDetector = new JsonlPatternDetector(outputChannel);
        
        // Default configuration
        this.config = {
            readyTimeoutMs: 12000,       // 12 секунд после ответа = готов (увеличено для многочастных ответов)
            inactivityTimeoutMs: 30000,  // 30 секунд без активности = неактивен
            checkIntervalMs: 1000,       // Проверка каждую секунду
            debounceMs: 500,             // Дебаунс 500ms
            ...config
        };

        this.startPeriodicCheck();
        this.outputChannel.appendLine(`🚀 ClaudeStateManager initialized with config: ${JSON.stringify(this.config)}`);
    }

    /**
     * Обрабатывает новую JSONL запись
     */
    processJsonlEntry(entry: JsonlEntry): void {
        try {
            const event = this.patternDetector.analyzeEntry(entry);
            if (event) {
                this.handleStateEvent(event);
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error processing JSONL entry: ${error}`);
        }
    }

    /**
     * Обрабатывает событие изменения состояния
     */
    private handleStateEvent(event: StateDetectionEvent): void {
        const { sessionId, state } = event;
        const currentState = this.currentStates.get(sessionId);
        
        // Проверяем, нужно ли изменить состояние
        if (currentState !== state) {
            this.scheduleStateChange(event);
        }
    }

    /**
     * Планирует изменение состояния с дебаунсом
     */
    private scheduleStateChange(event: StateDetectionEvent): void {
        const { sessionId } = event;
        
        // Отменяем предыдущий таймер
        const existingTimer = this.debounceTimers.get(sessionId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Создаем новый таймер
        const timer = setTimeout(() => {
            this.executeStateChange(event);
            this.debounceTimers.delete(sessionId);
        }, this.config.debounceMs);

        this.debounceTimers.set(sessionId, timer);
    }

    /**
     * Выполняет изменение состояния
     */
    private executeStateChange(event: StateDetectionEvent): void {
        const { sessionId, state } = event;
        const previousState = this.currentStates.get(sessionId);
        
        // Обновляем состояние
        this.currentStates.set(sessionId, state);
        this.lastStateChange.set(sessionId, event.timestamp);

        this.outputChannel.appendLine(
            `🔄 State changed for session ${sessionId.substring(0, 8)}...: ${previousState || 'unknown'} → ${state}`
        );

        // Уведомляем подписчиков о изменении состояния
        this.stateChangeCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                this.outputChannel.appendLine(`❌ Error in state change callback: ${error}`);
            }
        });

        // Уведомляем о переходе состояния
        if (previousState && previousState !== state) {
            const transition: StateTransition = {
                from: previousState,
                to: state,
                timestamp: event.timestamp,
                trigger: this.determineTrigger(event),
                sessionId
            };

            this.stateTransitionCallbacks.forEach(callback => {
                try {
                    callback(transition);
                } catch (error) {
                    this.outputChannel.appendLine(`❌ Error in state transition callback: ${error}`);
                }
            });
        }
    }

    /**
     * Определяет триггер перехода состояния
     */
    private determineTrigger(event: StateDetectionEvent): string {
        const messageType = event.metadata?.messageType;
        
        switch (event.state) {
            case ClaudeCodeState.WORKING:
                return messageType === 'user' ? 'user_message' : 
                       messageType === 'assistant' ? 'assistant_activity' : 'tool_call';
            case ClaudeCodeState.READY:
                return 'activity_complete';
            default:
                return 'unknown';
        }
    }

    /**
     * Периодическая проверка состояний
     */
    private startPeriodicCheck(): void {
        this.checkInterval = setInterval(() => {
            this.checkForTimeouts();
        }, this.config.checkIntervalMs);
    }

    /**
     * Проверяет тайм-ауты и обновляет состояния
     */
    private checkForTimeouts(): void {
        const now = Date.now();
        
        for (const [sessionId, currentState] of this.currentStates) {
            const lastChange = this.lastStateChange.get(sessionId);
            if (!lastChange) continue;

            const timeSinceChange = now - lastChange.getTime();

            // Если в состоянии WORKING и нет активности - переходим в READY
            if (currentState === ClaudeCodeState.WORKING && 
                timeSinceChange > this.config.readyTimeoutMs) {
                
                const readyEvent: StateDetectionEvent = {
                    state: ClaudeCodeState.READY,
                    sessionId,
                    timestamp: new Date(),
                    metadata: { duration: timeSinceChange }
                };
                
                this.executeStateChange(readyEvent);
            }
        }
    }

    /**
     * Public API для получения состояния
     */
    getCurrentState(sessionId: string): ClaudeCodeState | null {
        return this.currentStates.get(sessionId) || null;
    }

    /**
     * Проверяет, активна ли сессия
     */
    isSessionActive(sessionId: string): boolean {
        const state = this.getCurrentState(sessionId);
        return state !== null && state === ClaudeCodeState.WORKING;
    }

    /**
     * Проверяет, готов ли Claude к новому запросу
     */
    isReadyForNewRequest(sessionId: string): boolean {
        const state = this.getCurrentState(sessionId);
        return state === ClaudeCodeState.READY || state === null;
    }

    /**
     * Подписка на изменения состояния
     */
    onStateChange(callback: StateChangeCallback): void {
        this.stateChangeCallbacks.push(callback);
    }

    /**
     * Подписка на переходы состояния
     */
    onStateTransition(callback: StateTransitionCallback): void {
        this.stateTransitionCallbacks.push(callback);
    }

    /**
     * Получает все текущие состояния
     */
    getAllStates(): Map<string, ClaudeCodeState> {
        return new Map(this.currentStates);
    }

    /**
     * Принудительно устанавливает состояние
     */
    forceState(sessionId: string, state: ClaudeCodeState): void {
        const event: StateDetectionEvent = {
            state,
            sessionId,
            timestamp: new Date(),
            metadata: { duration: 0 }
        };
        
        this.executeStateChange(event);
        this.outputChannel.appendLine(`🔧 Forced state change: ${sessionId.substring(0, 8)}... → ${state}`);
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        // Останавливаем периодическую проверку
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        // Отменяем все таймеры дебаунса
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();

        // Очищаем детектор паттернов
        this.patternDetector.dispose();

        // Очищаем состояния
        this.currentStates.clear();
        this.lastStateChange.clear();
        this.stateChangeCallbacks.length = 0;
        this.stateTransitionCallbacks.length = 0;

        this.outputChannel.appendLine(`🛑 ClaudeStateManager disposed`);
    }
}