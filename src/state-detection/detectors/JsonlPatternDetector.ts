/**
 * JSONL Pattern Detector
 * Анализирует JSONL записи для определения паттернов активности Claude Code
 */

import * as vscode from 'vscode';
import { ClaudeCodeState, StateDetectionEvent, ActivityPattern } from '../types/ClaudeState';

export interface JsonlEntry {
    type: 'user' | 'assistant';
    message?: {
        role: 'user' | 'assistant';
        content: any;
        usage?: {
            input_tokens: number;
            output_tokens: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
        };
        model?: string;
    };
    timestamp: string;
    sessionId: string;
    uuid: string;
    requestId?: string;
}

export class JsonlPatternDetector {
    private outputChannel: vscode.OutputChannel;
    private patterns: Map<string, ActivityPattern> = new Map();
    
    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Анализирует JSONL запись и определяет состояние
     */
    analyzeEntry(entry: JsonlEntry): StateDetectionEvent | null {
        try {
            const sessionId = entry.sessionId;
            const timestamp = new Date(entry.timestamp);
            
            // Получаем или создаем паттерн для сессии
            let pattern = this.patterns.get(sessionId);
            if (!pattern) {
                pattern = this.createNewPattern(sessionId, timestamp);
                this.patterns.set(sessionId, pattern);
            }

            // Анализируем тип сообщения
            const state = this.determineStateFromEntry(entry, pattern);
            
            // Обновляем паттерн
            this.updatePattern(pattern, entry, timestamp);

            // Создаем событие
            const event: StateDetectionEvent = {
                state,
                sessionId,
                timestamp,
                metadata: this.extractMetadata(entry)
            };

            this.outputChannel.appendLine(
                `🔍 State detected: ${state} for session ${sessionId.substring(0, 8)}... at ${timestamp.toISOString()}`
            );

            return event;

        } catch (error) {
            this.outputChannel.appendLine(`❌ Error analyzing JSONL entry: ${error}`);
            return null;
        }
    }

    /**
     * Определяет состояние на основе JSONL записи
     */
    private determineStateFromEntry(entry: JsonlEntry, pattern: ActivityPattern): ClaudeCodeState {
        const now = new Date(entry.timestamp);
        
        switch (entry.type) {
            case 'user':
                // Пользователь отправил сообщение - Claude начинает работу
                this.outputChannel.appendLine(`📤 User message detected - transitioning to WORKING`);
                return ClaudeCodeState.WORKING;
                
            case 'assistant':
                // Claude работает (отвечает или выполняет действия)
                if (entry.message?.content) {
                    this.outputChannel.appendLine(`📨 Assistant activity detected - staying in WORKING`);
                    return ClaudeCodeState.WORKING;
                }
                break;
        }

        // Анализируем временные интервалы
        return this.analyzeTimingPatterns(pattern, now);
    }

    /**
     * Анализирует временные паттерны для определения состояния
     */
    private analyzeTimingPatterns(pattern: ActivityPattern, currentTime: Date): ClaudeCodeState {
        const timeSinceLastActivity = currentTime.getTime() - pattern.lastActivity.getTime();
        
        // Если прошло достаточно времени без активности - готов к запросу
        if (timeSinceLastActivity > 3000) { // 3 секунды
            this.outputChannel.appendLine(`⏰ No recent activity (${timeSinceLastActivity}ms) - transitioning to READY`);
            return ClaudeCodeState.READY;
        }

        // Если была недавняя активность - всё ещё работает
        this.outputChannel.appendLine(`🔄 Recent activity detected - staying in WORKING`);
        return ClaudeCodeState.WORKING;
    }

    /**
     * Создает новый паттерн для сессии
     */
    private createNewPattern(sessionId: string, timestamp: Date): ActivityPattern {
        return {
            sessionId,
            lastUserMessage: null,
            lastAssistantMessage: null,
            lastActivity: timestamp,
            currentState: ClaudeCodeState.READY,
            isActive: true,
            timeoutThreshold: 30000 // 30 секунд
        };
    }

    /**
     * Обновляет паттерн активности
     */
    private updatePattern(pattern: ActivityPattern, entry: JsonlEntry, timestamp: Date): void {
        pattern.lastActivity = timestamp;
        
        switch (entry.type) {
            case 'user':
                pattern.lastUserMessage = timestamp;
                break;
            case 'assistant':
                pattern.lastAssistantMessage = timestamp;
                break;
        }
    }

    /**
     * Извлекает метаданные из JSONL записи
     */
    private extractMetadata(entry: JsonlEntry): StateDetectionEvent['metadata'] {
        const usage = entry.message?.usage;
        return {
            messageType: entry.type,
            tokenUsage: usage ? {
                inputTokens: usage.input_tokens || 0,
                outputTokens: usage.output_tokens || 0,
                cacheCreationTokens: usage.cache_creation_input_tokens || 0,
                cacheReadTokens: usage.cache_read_input_tokens || 0
            } : undefined,
            model: entry.message?.model
        };
    }

    /**
     * Получает текущий паттерн для сессии
     */
    getPattern(sessionId: string): ActivityPattern | null {
        return this.patterns.get(sessionId) || null;
    }

    /**
     * Получает все активные паттерны
     */
    getAllPatterns(): ActivityPattern[] {
        return Array.from(this.patterns.values());
    }

    /**
     * Очищает старые паттерны
     */
    cleanupOldPatterns(maxAgeMs: number = 3600000): void { // 1 час
        const now = Date.now();
        const toDelete: string[] = [];

        for (const [sessionId, pattern] of this.patterns) {
            if (now - pattern.lastActivity.getTime() > maxAgeMs) {
                toDelete.push(sessionId);
            }
        }

        toDelete.forEach(sessionId => {
            this.patterns.delete(sessionId);
            this.outputChannel.appendLine(`🧹 Cleaned up old pattern for session ${sessionId.substring(0, 8)}...`);
        });
    }

    /**
     * Сброс состояния
     */
    dispose(): void {
        this.patterns.clear();
    }
}