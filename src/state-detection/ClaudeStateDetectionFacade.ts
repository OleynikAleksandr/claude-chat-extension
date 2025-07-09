/**
 * Claude State Detection Facade
 * Фасад для интеграции системы детекции состояний с существующим кодом
 */

import * as vscode from 'vscode';
import { ClaudeStateManager } from './managers/ClaudeStateManager';
import { 
    ClaudeCodeState, 
    StateDetectionEvent, 
    StateTransition,
    StateDetectionConfig 
} from './types/ClaudeState';

export interface StateDetectionInterface {
    // Основные методы
    processJsonlEntry(entry: any): void;
    getCurrentState(sessionId: string): ClaudeCodeState | null;
    isSessionActive(sessionId: string): boolean;
    isReadyForNewRequest(sessionId: string): boolean;
    
    // События
    onStateChange(callback: (event: StateDetectionEvent) => void): void;
    onStateTransition(callback: (transition: StateTransition) => void): void;
    
    // Управление
    forceState(sessionId: string, state: ClaudeCodeState): void;
    dispose(): void;
}

/**
 * Фасад для системы детекции состояний Claude Code
 */
export class ClaudeStateDetectionFacade implements StateDetectionInterface {
    private stateManager: ClaudeStateManager;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel, config?: Partial<StateDetectionConfig>) {
        this.outputChannel = outputChannel;
        this.stateManager = new ClaudeStateManager(outputChannel, config);
        
        this.outputChannel.appendLine(`🎭 ClaudeStateDetectionFacade initialized`);
    }

    /**
     * Обрабатывает JSONL запись из существующих мониторов
     */
    processJsonlEntry(entry: any): void {
        try {
            // Нормализуем запись в нужный формат
            const normalizedEntry = this.normalizeJsonlEntry(entry);
            if (normalizedEntry) {
                this.stateManager.processJsonlEntry(normalizedEntry);
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error in facade processJsonlEntry: ${error}`);
        }
    }

    /**
     * Нормализует JSONL запись в ожидаемый формат
     */
    private normalizeJsonlEntry(entry: any): any {
        // Поддерживаем разные форматы JSONL записей
        try {
            // Формат из нашего JsonlResponseMonitor
            if (entry.type && entry.message && entry.timestamp && entry.sessionId) {
                return {
                    type: entry.type,
                    message: entry.message,
                    timestamp: entry.timestamp,
                    sessionId: entry.sessionId,
                    uuid: entry.uuid || entry.id || Date.now().toString(),
                    requestId: entry.requestId
                };
            }

            // Формат из Claude Code Usage Monitor
            if (entry.role && entry.content && entry.timestamp) {
                return {
                    type: entry.role === 'user' ? 'user' : 'assistant',
                    message: {
                        role: entry.role,
                        content: entry.content,
                        usage: entry.usage,
                        model: entry.model
                    },
                    timestamp: entry.timestamp,
                    sessionId: entry.sessionId || 'unknown',
                    uuid: entry.uuid || entry.id || Date.now().toString()
                };
            }

            // Другие форматы можно добавить здесь
            this.outputChannel.appendLine(`⚠️ Unknown JSONL format: ${JSON.stringify(entry).substring(0, 200)}...`);
            return null;

        } catch (error) {
            this.outputChannel.appendLine(`❌ Error normalizing JSONL entry: ${error}`);
            return null;
        }
    }

    /**
     * Получает текущее состояние для сессии
     */
    getCurrentState(sessionId: string): ClaudeCodeState | null {
        return this.stateManager.getCurrentState(sessionId);
    }

    /**
     * Проверяет активность сессии
     */
    isSessionActive(sessionId: string): boolean {
        return this.stateManager.isSessionActive(sessionId);
    }

    /**
     * Проверяет готовность к новому запросу
     */
    isReadyForNewRequest(sessionId: string): boolean {
        return this.stateManager.isReadyForNewRequest(sessionId);
    }

    /**
     * Подписка на изменения состояния
     */
    onStateChange(callback: (event: StateDetectionEvent) => void): void {
        this.stateManager.onStateChange(callback);
    }

    /**
     * Подписка на переходы состояния
     */
    onStateTransition(callback: (transition: StateTransition) => void): void {
        this.stateManager.onStateTransition(callback);
    }

    /**
     * Принудительно устанавливает состояние
     */
    forceState(sessionId: string, state: ClaudeCodeState): void {
        this.stateManager.forceState(sessionId, state);
    }

    /**
     * Получает человекочитаемое описание состояния
     */
    getStateDescription(state: ClaudeCodeState): string {
        switch (state) {
            case ClaudeCodeState.READY:
                return 'Готов к запросу';
            case ClaudeCodeState.WORKING:
                return 'Ассистент работает';
            default:
                return 'Неизвестное состояние';
        }
    }

    /**
     * Получает эмодзи для состояния
     */
    getStateEmoji(state: ClaudeCodeState): string {
        switch (state) {
            case ClaudeCodeState.READY:
                return '🟢';
            case ClaudeCodeState.WORKING:
                return '🔄';
            default:
                return '❓';
        }
    }

    /**
     * Получает все активные сессии
     */
    getActiveSessions(): { sessionId: string; state: ClaudeCodeState }[] {
        const allStates = this.stateManager.getAllStates();
        return Array.from(allStates.entries())
            .filter(([_, state]) => state === ClaudeCodeState.WORKING)
            .map(([sessionId, state]) => ({ sessionId, state }));
    }

    /**
     * Получает статистику состояний
     */
    getStateStatistics(): Record<ClaudeCodeState, number> {
        const allStates = this.stateManager.getAllStates();
        const stats: Record<ClaudeCodeState, number> = {
            [ClaudeCodeState.READY]: 0,
            [ClaudeCodeState.WORKING]: 0
        };

        for (const state of allStates.values()) {
            stats[state]++;
        }

        return stats;
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        this.stateManager.dispose();
        this.outputChannel.appendLine(`🎭 ClaudeStateDetectionFacade disposed`);
    }
}

// Экспортируем все необходимые типы и класы
export {
    ClaudeCodeState,
    StateDetectionEvent,
    StateTransition,
    StateDetectionConfig
} from './types/ClaudeState';