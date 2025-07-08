/**
 * TerminalResponseReader - Микрокласс для чтения ответов из терминала
 * Размер: <150 строк
 * Ответственность: Извлечение ответов Claude Code через JSONL логи
 */

import * as vscode from 'vscode';
import { JsonlReader } from './JsonlReader';

export interface TerminalReadOptions {
    timeoutMs: number;
    maxRetries: number;
    expectedResponsePattern?: RegExp;
    stopOnPattern?: RegExp;
}

export interface TerminalReadResult {
    success: boolean;
    response: string;
    error?: string;
    duration: number;
    retries: number;
}

export class TerminalResponseReader {
    private static readonly DEFAULT_OPTIONS: TerminalReadOptions = {
        timeoutMs: 30000,
        maxRetries: 3,
        expectedResponsePattern: /[\s\S]+/,
        stopOnPattern: /\n\s*$/
    };

    private static readonly CLAUDE_PROMPT_PATTERNS = [
        />\s*$/,
        /claude\s*>\s*$/,
        /\$\s*$/,
        /claude-code\s*>\s*$/
    ];

    private readBuffer: string = '';
    private isReading: boolean = false;
    private options: TerminalReadOptions;
    private jsonlReader: JsonlReader;
    private lastMessageTimestamp?: Date;

    constructor(options: Partial<TerminalReadOptions> = {}) {
        this.options = { ...TerminalResponseReader.DEFAULT_OPTIONS, ...options };
        this.jsonlReader = new JsonlReader();
    }

    /**
     * Читает ответ из активного терминала
     */
    async readResponse(terminal: vscode.Terminal): Promise<TerminalReadResult> {
        const startTime = Date.now();
        let retries = 0;
        
        while (retries < this.options.maxRetries) {
            try {
                const result = await this.attemptRead(terminal);
                
                if (result.success) {
                    return {
                        ...result,
                        duration: Date.now() - startTime,
                        retries
                    };
                }
                
                retries++;
                if (retries < this.options.maxRetries) {
                    await this.delay(1000); // Пауза перед повтором
                }
                
            } catch (error) {
                retries++;
                if (retries >= this.options.maxRetries) {
                    return {
                        success: false,
                        response: '',
                        error: `Failed after ${retries} retries: ${error}`,
                        duration: Date.now() - startTime,
                        retries
                    };
                }
            }
        }

        return {
            success: false,
            response: '',
            error: `Max retries (${this.options.maxRetries}) exceeded`,
            duration: Date.now() - startTime,
            retries
        };
    }

    /**
     * Попытка чтения ответа
     */
    private async attemptRead(terminal: vscode.Terminal): Promise<TerminalReadResult> {
        if (this.isReading) {
            return {
                success: false,
                response: '',
                error: 'Already reading',
                duration: 0,
                retries: 0
            };
        }

        this.isReading = true;
        this.readBuffer = '';

        try {
            // Симулируем чтение через копирование содержимого терминала
            const response = await this.readTerminalContent(terminal);
            
            if (this.isValidResponse(response)) {
                return {
                    success: true,
                    response: this.cleanResponse(response),
                    duration: 0,
                    retries: 0
                };
            } else {
                return {
                    success: false,
                    response: '',
                    error: 'Invalid response format',
                    duration: 0,
                    retries: 0
                };
            }
        } finally {
            this.isReading = false;
        }
    }

    /**
     * Читает содержимое через JSONL логи
     * Использует JsonlReader для получения реальных ответов Claude
     */
    private async readTerminalContent(_terminal: vscode.Terminal): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Terminal read timeout'));
            }, this.options.timeoutMs);

            try {
                // Запоминаем текущее время для фильтрации
                const startTime = this.lastMessageTimestamp || new Date();
                
                // Находим последний JSONL файл
                const jsonlFile = await this.jsonlReader.findLatestJsonlFile();
                if (!jsonlFile) {
                    clearTimeout(timeout);
                    reject(new Error('No JSONL file found'));
                    return;
                }

                // Ждем появления нового ответа в JSONL
                let attempts = 0;
                const maxAttempts = Math.floor(this.options.timeoutMs / 500);
                
                const checkForResponse = async () => {
                    attempts++;
                    
                    // Читаем последние записи
                    const entries = await this.jsonlReader.readLastEntries(jsonlFile, {
                        afterTimestamp: startTime,
                        maxEntries: 10
                    });
                    
                    // Ищем ответ ассистента
                    const assistantEntry = entries.find(e => e.type === 'assistant');
                    
                    if (assistantEntry) {
                        clearTimeout(timeout);
                        this.lastMessageTimestamp = new Date(assistantEntry.timestamp);
                        const responseText = this.jsonlReader.extractMessageText(assistantEntry);
                        resolve(responseText);
                    } else if (attempts < maxAttempts) {
                        // Повторяем через 500ms
                        setTimeout(checkForResponse, 500);
                    } else {
                        clearTimeout(timeout);
                        reject(new Error('No response found in JSONL'));
                    }
                };
                
                // Начинаем проверку
                checkForResponse();
                
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Проверяет валидность ответа
     */
    private isValidResponse(response: string): boolean {
        if (!response || response.trim().length === 0) {
            return false;
        }

        // Проверяем соответствие ожидаемому паттерну
        if (this.options.expectedResponsePattern) {
            return this.options.expectedResponsePattern.test(response);
        }

        return true;
    }

    /**
     * Очищает ответ от служебной информации
     */
    private cleanResponse(response: string): string {
        let cleaned = response.trim();

        // Удаляем приглашения командной строки
        TerminalResponseReader.CLAUDE_PROMPT_PATTERNS.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });

        // Удаляем ANSI escape sequences
        cleaned = cleaned.replace(/\x1b\[[0-9;]*m/g, '');

        // Удаляем лишние пробелы
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
    }

    /**
     * Проверяет готовность терминала к чтению
     */
    isTerminalReady(terminal: vscode.Terminal): boolean {
        return terminal !== undefined && 
               terminal.exitStatus === undefined && 
               !this.isReading;
    }

    /**
     * Останавливает текущее чтение
     */
    stopReading(): void {
        this.isReading = false;
        this.readBuffer = '';
    }

    /**
     * Обновляет опции чтения
     */
    updateOptions(newOptions: Partial<TerminalReadOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Получает статус чтения
     */
    getReadingStatus(): { isReading: boolean; bufferSize: number } {
        return {
            isReading: this.isReading,
            bufferSize: this.readBuffer.length
        };
    }

    /**
     * Вспомогательная функция для задержки
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Очищает ресурсы
     */
    dispose(): void {
        this.stopReading();
        this.jsonlReader.dispose();
    }
}