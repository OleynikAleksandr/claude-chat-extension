/**
 * BidirectionalBridge - Класс-фасад для двусторонней связи с Claude Code
 * Размер: <200 строк
 * Ответственность: Координация между TerminalManager, ResponseParser и TerminalResponseReader
 */

import * as vscode from 'vscode';
import { TerminalManager } from '../terminalManager';
import { ResponseParser, ParsedResponse, ParsingOptions } from './ResponseParser';
import { TerminalResponseReader, TerminalReadOptions } from './TerminalResponseReader';
import { MessageResponsePayload } from '../types';

export interface BidirectionalOptions {
    parsing?: ParsingOptions;
    reading?: TerminalReadOptions;
    enableFallback?: boolean;
}

export interface BidirectionalResponse {
    success: boolean;
    parsedResponse?: ParsedResponse;
    rawResponse?: string;
    error?: string;
    metadata: {
        duration: number;
        retries: number;
        method: 'bidirectional' | 'fallback';
        timestamp: number;
    };
}

export class BidirectionalBridge {
    private terminalManager: TerminalManager;
    private responseParser: ResponseParser;
    private terminalReader: TerminalResponseReader;
    private options: BidirectionalOptions;

    constructor(terminalManager: TerminalManager, options: BidirectionalOptions = {}) {
        this.terminalManager = terminalManager;
        this.responseParser = new ResponseParser(options.parsing);
        this.terminalReader = new TerminalResponseReader(options.reading);
        this.options = {
            enableFallback: options.enableFallback ?? true,
            ...options
        };
    }

    /**
     * Главный метод для отправки сообщения и получения ответа
     */
    async sendMessageAndGetResponse(message: string): Promise<BidirectionalResponse> {
        const startTime = Date.now();
        
        try {
            // Сначала пробуем bidirectional подход
            const bidirectionalResult = await this.tryBidirectionalCommunication(message);
            
            if (bidirectionalResult.success) {
                return {
                    ...bidirectionalResult,
                    metadata: {
                        duration: Date.now() - startTime,
                        retries: bidirectionalResult.metadata.retries,
                        method: 'bidirectional',
                        timestamp: Date.now()
                    }
                };
            }

            // Если не удалось и включен fallback - используем старый метод
            if (this.options.enableFallback) {
                return await this.fallbackToTraditionalMethod(message, startTime);
            }

            throw new Error('Bidirectional communication failed and fallback is disabled');
            
        } catch (error) {
            return {
                success: false,
                error: `BidirectionalBridge error: ${error}`,
                metadata: {
                    duration: Date.now() - startTime,
                    retries: 0,
                    method: 'bidirectional',
                    timestamp: Date.now()
                }
            };
        }
    }

    /**
     * Попытка bidirectional коммуникации
     */
    private async tryBidirectionalCommunication(message: string): Promise<BidirectionalResponse> {
        // Получаем терминал с Claude Session (не просто любой терминал)
        const terminal = await this.getClaudeSessionTerminal();
        if (!terminal) {
            throw new Error('No active terminal found');
        }

        // Проверяем готовность терминала
        if (!this.terminalReader.isTerminalReady(terminal)) {
            throw new Error('Terminal is not ready for reading');
        }

        // Отправляем сообщение НАПРЯМУЮ в правильный терминал с автоматическим Enter
        terminal.sendText(message, true);
        
        // Имитируем успешную отправку для совместимости
        await new Promise(resolve => setTimeout(resolve, 100)); // Даем время на обработку

        // Читаем ответ
        const readResult = await this.terminalReader.readResponse(terminal);
        if (!readResult.success) {
            throw new Error(`Failed to read response: ${readResult.error}`);
        }

        // Парсим ответ
        const parsedResponse = this.responseParser.parseResponse(readResult.response);

        return {
            success: true,
            parsedResponse,
            rawResponse: readResult.response,
            metadata: {
                duration: readResult.duration,
                retries: readResult.retries,
                method: 'bidirectional',
                timestamp: Date.now()
            }
        };
    }

    /**
     * Fallback к традиционному методу
     */
    private async fallbackToTraditionalMethod(message: string, startTime: number): Promise<BidirectionalResponse> {
        const sendResult = await this.terminalManager.sendMessageToClaudeCli(message);
        
        if (!sendResult.success) {
            throw new Error(`Fallback method failed: ${sendResult.error?.message}`);
        }

        // Создаем фиктивный parsed response для совместимости
        const parsedResponse: ParsedResponse = {
            content: 'Message sent successfully (fallback mode)',
            isComplete: true,
            timestamp: Date.now(),
            responseType: 'system',
            metadata: {
                messageId: this.generateMessageId(),
                duration: Date.now() - startTime
            }
        };

        return {
            success: true,
            parsedResponse,
            rawResponse: 'Fallback method used',
            metadata: {
                duration: Date.now() - startTime,
                retries: 0,
                method: 'fallback',
                timestamp: Date.now()
            }
        };
    }

    /**
     * Конвертирует BidirectionalResponse в MessageResponsePayload для совместимости
     */
    toMessageResponsePayload(response: BidirectionalResponse): MessageResponsePayload {
        return {
            success: response.success,
            message: response.parsedResponse?.content || response.error || 'Unknown response',
            timestamp: response.metadata.timestamp,
            sessionId: response.parsedResponse?.metadata?.sessionId,
            messageType: response.parsedResponse?.responseType
        };
    }

    /**
     * Проверяет доступность bidirectional режима
     */
    async isBidirectionalModeAvailable(): Promise<boolean> {
        try {
            const terminal = await this.getClaudeSessionTerminal();
            return terminal !== null && this.terminalReader.isTerminalReady(terminal);
        } catch {
            return false;
        }
    }

    /**
     * Обновляет настройки парсинга
     */
    updateParsingOptions(options: Partial<ParsingOptions>): void {
        this.responseParser.updateOptions(options);
    }

    /**
     * Обновляет настройки чтения
     */
    updateReadingOptions(options: Partial<TerminalReadOptions>): void {
        this.terminalReader.updateOptions(options);
    }

    /**
     * Получает статистику работы
     */
    async getStatistics(): Promise<{
        parsingOptions: ParsingOptions;
        readerStatus: { isReading: boolean; bufferSize: number };
        terminalStatus: boolean;
    }> {
        const terminal = await this.getClaudeSessionTerminal();
        
        return {
            parsingOptions: this.responseParser.getOptions(),
            readerStatus: this.terminalReader.getReadingStatus(),
            terminalStatus: terminal !== null && this.terminalReader.isTerminalReady(terminal)
        };
    }

    /**
     * Останавливает текущие операции чтения
     */
    stopAllOperations(): void {
        this.terminalReader.stopReading();
    }

    /**
     * Очищает ресурсы
     */
    dispose(): void {
        this.stopAllOperations();
    }

    /**
     * Ищет терминал с Claude Session
     */
    private async getClaudeSessionTerminal(): Promise<vscode.Terminal | null> {
        const terminals = vscode.window.terminals;
        
        // Ищем терминал с паттерном "Claude Session:"
        for (const terminal of terminals) {
            if (terminal.name.startsWith('Claude Session:')) {
                return terminal;
            }
        }
        
        // Если не найден, попробуем через обычный метод
        return await this.terminalManager.getTerminal();
    }

    /**
     * Генерирует уникальный ID сообщения
     */
    private generateMessageId(): string {
        return `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}