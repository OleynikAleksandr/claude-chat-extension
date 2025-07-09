/**
 * Dual Session State Adapter
 * Адаптер для интеграции детекции состояний с DualSessionManager
 * Не изменяет существующий код, работает через события
 */

import * as vscode from 'vscode';
import { ClaudeStateDetectionFacade, ClaudeCodeState, StateDetectionEvent, StateTransition } from '../ClaudeStateDetectionFacade';
import { DualSessionManager } from '../../multi-session/managers/DualSessionManager';
import { Message } from '../../multi-session/types/Session';

export interface SessionStateInfo {
    sessionId: string;
    sessionName: string;
    state: ClaudeCodeState;
    isActive: boolean;
    isReadyForNewRequest: boolean;
    stateDescription: string;
    stateEmoji: string;
}

export interface StateUpdateCallback {
    (sessionStates: SessionStateInfo[]): void;
}

/**
 * Адаптер для интеграции системы детекции состояний с DualSessionManager
 */
export class DualSessionStateAdapter {
    private outputChannel: vscode.OutputChannel;
    private stateDetection: ClaudeStateDetectionFacade;
    private dualSessionManager: DualSessionManager;
    
    // Callbacks для уведомления UI
    private stateUpdateCallbacks: StateUpdateCallback[] = [];
    
    // Кэш информации о сессиях
    private sessionInfoCache: Map<string, SessionStateInfo> = new Map();

    constructor(
        outputChannel: vscode.OutputChannel,
        dualSessionManager: DualSessionManager
    ) {
        this.outputChannel = outputChannel;
        this.outputChannel.appendLine(`🔗 DualSessionStateAdapter constructor - about to register callback`);
        this.dualSessionManager = dualSessionManager;
        
        // Инициализируем систему детекции состояний
        this.stateDetection = new ClaudeStateDetectionFacade(outputChannel, {
            readyTimeoutMs: 12000,     // 12 секунд после ответа = готов (увеличено для многочастных ответов)
            inactivityTimeoutMs: 30000, // 30 секунд без активности = неактивен
            checkIntervalMs: 1000,      // Проверка каждую секунду
            debounceMs: 500            // Дебаунс 500ms
        });

        this.setupEventListeners();
        this.outputChannel.appendLine(`🔗 DualSessionStateAdapter initialized`);
    }

    /**
     * Настройка слушателей событий
     */
    private setupEventListeners(): void {
        // Слушаем события создания/изменения сессий из DualSessionManager
        this.dualSessionManager.onSessionCreated((session) => {
            this.outputChannel.appendLine(`🔗 DualSessionStateAdapter: onSessionCreated fired for ${session.id}`);
            this.handleSessionCreated(session);
        });

        this.dualSessionManager.onSessionClosed((sessionId) => {
            this.handleSessionClosed(sessionId);
        });

        this.dualSessionManager.onMessageReceived((sessionId, message) => {
            this.outputChannel.appendLine(`🔗 ADAPTER CALLBACK TRIGGERED: ${sessionId}, message type: ${message.type}`);
            this.handleMessageReceived(sessionId, message);
        });

        // Слушаем события изменения состояний
        this.stateDetection.onStateChange((event) => {
            this.handleStateChange(event);
        });

        this.stateDetection.onStateTransition((transition) => {
            this.handleStateTransition(transition);
        });
        
        this.outputChannel.appendLine(`🔗 DualSessionStateAdapter constructor - callback registered successfully`);
    }

    /**
     * Обработка создания новой сессии
     */
    private handleSessionCreated(session: any): void {
        const sessionInfo: SessionStateInfo = {
            sessionId: session.id,
            sessionName: session.name,
            state: ClaudeCodeState.READY,
            isActive: false,
            isReadyForNewRequest: true,
            stateDescription: this.stateDetection.getStateDescription(ClaudeCodeState.READY),
            stateEmoji: this.stateDetection.getStateEmoji(ClaudeCodeState.READY)
        };

        this.sessionInfoCache.set(session.id, sessionInfo);
        this.notifyStateUpdate();

        this.outputChannel.appendLine(
            `📝 Session created: ${session.name} (${session.id.substring(0, 8)}...) - state: READY`
        );
    }

    /**
     * Обработка закрытия сессии
     */
    private handleSessionClosed(sessionId: string): void {
        this.sessionInfoCache.delete(sessionId);
        this.notifyStateUpdate();

        this.outputChannel.appendLine(
            `🗑️ Session closed: ${sessionId.substring(0, 8)}... - removed from state tracking`
        );
    }

    /**
     * Обработка получения сообщения
     */
    private handleMessageReceived(sessionId: string, message: Message): void {
        this.outputChannel.appendLine(`🔗 DualSessionStateAdapter: Message received for ${sessionId}, type: ${message.type}`);
        
        // Преобразуем сообщение в формат для детекции состояний
        const jsonlEntry = this.convertMessageToJsonlEntry(sessionId, message);
        if (jsonlEntry) {
            this.outputChannel.appendLine(`🔗 Processing JSONL entry for state detection: ${JSON.stringify(jsonlEntry).substring(0, 200)}...`);
            this.stateDetection.processJsonlEntry(jsonlEntry);
        } else {
            this.outputChannel.appendLine(`🔗 Failed to convert message to JSONL entry`);
        }
    }

    /**
     * Преобразует Message в формат JSONL для анализа
     */
    private convertMessageToJsonlEntry(sessionId: string, message: Message): any {
        return {
            type: message.type,
            message: {
                role: message.type,
                content: message.content,
                // Можно добавить токены и модель если доступны
            },
            timestamp: message.timestamp.toISOString(),
            sessionId: sessionId,
            uuid: message.id
        };
    }

    /**
     * Обработка изменения состояния
     */
    private handleStateChange(event: StateDetectionEvent): void {
        const sessionInfo = this.sessionInfoCache.get(event.sessionId);
        if (sessionInfo) {
            const previousState = sessionInfo.state;
            
            // Обновляем информацию о состоянии
            sessionInfo.state = event.state;
            sessionInfo.isActive = this.stateDetection.isSessionActive(event.sessionId);
            sessionInfo.isReadyForNewRequest = this.stateDetection.isReadyForNewRequest(event.sessionId);
            sessionInfo.stateDescription = this.stateDetection.getStateDescription(event.state);
            sessionInfo.stateEmoji = this.stateDetection.getStateEmoji(event.state);

            // **ИНТЕГРАЦИЯ С PROCESSING STATUS BAR**
            // Останавливаем отслеживание ProcessingStatusBar при переходе в READY
            if (event.state === ClaudeCodeState.READY && previousState === ClaudeCodeState.WORKING) {
                const processingStatusManager = this.dualSessionManager.getProcessingStatusManager();
                processingStatusManager.stopProcessing(event.sessionId);
                this.outputChannel.appendLine(`📊 Stopped processing tracking for session ${event.sessionId} (state: WORKING → READY)`);
            }

            this.sessionInfoCache.set(event.sessionId, sessionInfo);
            this.notifyStateUpdate();

            this.outputChannel.appendLine(
                `🔄 State changed: ${sessionInfo.sessionName} → ${event.state} (${sessionInfo.stateDescription})`
            );
        }
    }

    /**
     * Обработка перехода состояния
     */
    private handleStateTransition(transition: StateTransition): void {
        this.outputChannel.appendLine(
            `🔀 State transition: ${transition.sessionId.substring(0, 8)}... ${transition.from} → ${transition.to} (${transition.trigger})`
        );
    }

    /**
     * Уведомляет подписчиков об обновлении состояний
     */
    private notifyStateUpdate(): void {
        const sessionStates = Array.from(this.sessionInfoCache.values());
        this.outputChannel.appendLine(`📡 notifyStateUpdate called with ${sessionStates.length} sessions, ${this.stateUpdateCallbacks.length} callbacks`);
        this.stateUpdateCallbacks.forEach((callback, index) => {
            try {
                this.outputChannel.appendLine(`📡 Executing state update callback ${index + 1}/${this.stateUpdateCallbacks.length}`);
                callback(sessionStates);
            } catch (error) {
                this.outputChannel.appendLine(`❌ Error in state update callback: ${error}`);
            }
        });
    }

    /**
     * Public API
     */

    /**
     * Получает информацию о состоянии сессии
     */
    getSessionState(sessionId: string): SessionStateInfo | null {
        return this.sessionInfoCache.get(sessionId) || null;
    }

    /**
     * Получает все состояния сессий
     */
    getAllSessionStates(): SessionStateInfo[] {
        return Array.from(this.sessionInfoCache.values());
    }

    /**
     * Проверяет, можно ли отправить сообщение в сессию
     */
    canSendMessage(sessionId: string): boolean {
        const sessionInfo = this.sessionInfoCache.get(sessionId);
        return sessionInfo ? sessionInfo.isReadyForNewRequest : false;
    }

    /**
     * Получает активные сессии
     */
    getActiveSessions(): SessionStateInfo[] {
        return Array.from(this.sessionInfoCache.values())
            .filter(info => info.isActive);
    }

    /**
     * Принудительно устанавливает состояние сессии
     */
    forceSessionState(sessionId: string, state: ClaudeCodeState): void {
        this.stateDetection.forceState(sessionId, state);
    }

    /**
     * Подписка на обновления состояний
     */
    onStateUpdate(callback: StateUpdateCallback): void {
        this.stateUpdateCallbacks.push(callback);
        
        // Сразу вызываем callback с текущими данными
        const sessionStates = Array.from(this.sessionInfoCache.values());
        callback(sessionStates);
    }

    /**
     * Получает статистику по состояниям
     */
    getStateStatistics(): { 
        total: number;
        active: number;
        ready: number;
        processing: number;
        byState: Record<ClaudeCodeState, number>;
    } {
        const allSessions = Array.from(this.sessionInfoCache.values());
        const byState = this.stateDetection.getStateStatistics();
        
        return {
            total: allSessions.length,
            active: allSessions.filter(s => s.isActive).length,
            ready: allSessions.filter(s => s.isReadyForNewRequest).length,
            processing: allSessions.filter(s => s.state === ClaudeCodeState.WORKING).length,
            byState
        };
    }

    /**
     * Получает DualSessionManager для внешнего использования
     */
    getDualSessionManager(): DualSessionManager {
        return this.dualSessionManager;
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        this.stateDetection.dispose();
        this.sessionInfoCache.clear();
        this.stateUpdateCallbacks.length = 0;
        
        this.outputChannel.appendLine(`🔗 DualSessionStateAdapter disposed`);
    }
}