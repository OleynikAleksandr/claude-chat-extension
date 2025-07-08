/**
 * JSONL Response Monitor - ПОТОК 2: Terminal → Extension
 * Независимый мониторинг ответов от Claude Code через JSONL файлы
 * Размер: <200 строк
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Message } from '../types/Session';

// Новый формат Claude Code JSONL
export interface ClaudeCodeJsonlEntry {
    type: 'user' | 'assistant';
    message?: {
        role: 'user' | 'assistant';
        content: Array<{
            type: 'text';
            text: string;
        }> | string;
    };
    timestamp: string;
    sessionId?: string;
}

// Старый формат для совместимости
export interface JsonlEntry {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
}

export interface ResponseDetected {
    sessionId: string;
    response: Message;
}

export class JsonlResponseMonitor {
    private watchers: Map<string, fs.FSWatcher> = new Map();
    private lastProcessedEntries: Map<string, number> = new Map();
    private onResponseCallback?: (data: ResponseDetected) => void;

    constructor(private outputChannel: vscode.OutputChannel) {}

    /**
     * Начать мониторинг для конкретной сессии
     */
    startMonitoring(sessionId: string, sessionName: string): void {
        // Каждый раз ищем самый свежий JSONL файл
        const jsonlPath = this.getJsonlPath();
        if (!jsonlPath) {
            this.outputChannel.appendLine(`❌ JSONL path not found for session ${sessionId}`);
            return;
        }

        this.outputChannel.appendLine(`📡 Starting JSONL monitoring for session: ${sessionName} (${sessionId})`);
        this.outputChannel.appendLine(`📂 Monitoring file: ${jsonlPath}`);
        
        // Останавливаем предыдущий watcher если есть
        this.stopMonitoring(sessionId);
        
        // Используем file watcher для отслеживания изменений САМОГО СВЕЖЕГО файла
        const watcher = fs.watch(jsonlPath, { persistent: false }, (eventType) => {
            if (eventType === 'change') {
                this.outputChannel.appendLine(`📂 JSONL file changed (${eventType}), checking for new responses...`);
                this.checkForNewResponses(sessionId, sessionName, jsonlPath);
            }
        });

        this.watchers.set(sessionId, watcher);
        this.lastProcessedEntries.set(sessionId, Date.now());
        
        this.outputChannel.appendLine(`✅ JSONL monitoring started for ${sessionName}`);
    }

    /**
     * Остановить мониторинг для сессии
     */
    stopMonitoring(sessionId: string): void {
        const watcher = this.watchers.get(sessionId);
        if (watcher) {
            watcher.close();
            this.watchers.delete(sessionId);
            this.lastProcessedEntries.delete(sessionId);
            this.outputChannel.appendLine(`📡 JSONL monitoring stopped for session: ${sessionId}`);
        }
    }

    /**
     * Установить callback для получения новых ответов
     */
    onResponse(callback: (data: ResponseDetected) => void): void {
        this.onResponseCallback = callback;
    }

    /**
     * Проверить новые ответы в JSONL файле
     */
    private async checkForNewResponses(sessionId: string, sessionName: string, jsonlPath: string): Promise<void> {
        try {
            if (!fs.existsSync(jsonlPath)) {
                return;
            }

            const content = await fs.promises.readFile(jsonlPath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());

            const lastProcessed = this.lastProcessedEntries.get(sessionId) || 0;
            const newEntries: JsonlEntry[] = [];

            for (const line of lines) {
                try {
                    const rawEntry = JSON.parse(line);
                    
                    // Пробуем новый формат Claude Code
                    if (this.isClaudeCodeFormat(rawEntry)) {
                        const entry = this.parseClaudeCodeEntry(rawEntry as ClaudeCodeJsonlEntry);
                        if (entry) {
                            const entryTime = new Date(rawEntry.timestamp).getTime();
                            
                            // Только новые записи после последней обработки
                            if (entryTime > lastProcessed && entry.role === 'assistant') {
                                newEntries.push(entry);
                                this.outputChannel.appendLine(`✅ Parsed Claude Code format entry: ${entry.content.substring(0, 100)}...`);
                            }
                        }
                    } 
                    // Пробуем старый формат для совместимости
                    else if (rawEntry.role && rawEntry.content) {
                        const entry = rawEntry as JsonlEntry;
                        const entryTime = entry.timestamp || Date.now();
                        
                        // Только новые записи после последней обработки
                        if (entryTime > lastProcessed && entry.role === 'assistant') {
                            newEntries.push(entry);
                            this.outputChannel.appendLine(`✅ Parsed legacy format entry: ${entry.content.substring(0, 100)}...`);
                        }
                    } else {
                        this.outputChannel.appendLine(`⚠️ Unknown JSONL format: ${JSON.stringify(rawEntry).substring(0, 200)}...`);
                    }
                } catch (parseError) {
                    this.outputChannel.appendLine(`❌ JSON parse error: ${parseError}`);
                    continue;
                }
            }

            // Обрабатываем новые ответы от assistant
            for (const entry of newEntries) {
                const responseMessage: Message = {
                    id: this.generateMessageId(),
                    content: entry.content,
                    timestamp: new Date(entry.timestamp || Date.now()),
                    type: 'assistant',
                    sessionId
                };

                this.outputChannel.appendLine(`📨 New response detected for ${sessionName}: ${entry.content.substring(0, 100)}...`);

                if (this.onResponseCallback) {
                    this.onResponseCallback({
                        sessionId,
                        response: responseMessage
                    });
                }
            }

            // Обновляем последнее время обработки
            if (newEntries.length > 0) {
                this.lastProcessedEntries.set(sessionId, Date.now());
            }

        } catch (error) {
            this.outputChannel.appendLine(`❌ Error checking JSONL responses: ${error}`);
        }
    }

    /**
     * Получить путь к JSONL файлу Claude Code (рекурсивный поиск)
     */
    private getJsonlPath(): string | null {
        const claudeDir = path.join(os.homedir(), '.claude', 'projects');
        if (!fs.existsSync(claudeDir)) {
            this.outputChannel.appendLine(`❌ Claude projects directory not found: ${claudeDir}`);
            return null;
        }

        try {
            // Рекурсивный поиск JSONL файлов во всех подпапках
            const allFiles: Array<{name: string, path: string, mtime: Date}> = [];
            
            const searchDir = (dir: string) => {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        searchDir(fullPath); // Рекурсивно ищем в подпапках
                    } else if (item.endsWith('.jsonl')) {
                        allFiles.push({
                            name: item,
                            path: fullPath,
                            mtime: stat.mtime
                        });
                    }
                }
            };

            searchDir(claudeDir);
            
            // Сортируем по времени модификации (самый новый первый)
            allFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            
            if (allFiles.length > 0) {
                this.outputChannel.appendLine(`✅ Found JSONL file: ${allFiles[0].path}`);
                return allFiles[0].path;
            } else {
                this.outputChannel.appendLine(`❌ No JSONL files found in ${claudeDir}`);
                return null;
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error searching for JSONL files: ${error}`);
            return null;
        }
    }

    /**
     * Проверить, является ли запись новым форматом Claude Code
     */
    private isClaudeCodeFormat(entry: any): boolean {
        return entry.type && (entry.type === 'assistant' || entry.type === 'user') && 
               entry.timestamp && entry.message;
    }

    /**
     * Парсинг записи нового формата Claude Code в старый формат
     */
    private parseClaudeCodeEntry(entry: ClaudeCodeJsonlEntry): JsonlEntry | null {
        if (!entry.message || entry.type !== 'assistant') {
            return null;
        }

        let content: string = '';
        
        // Обрабатываем content - может быть массивом объектов или строкой
        if (Array.isArray(entry.message.content)) {
            // Новый формат: content - массив объектов
            const textContent = entry.message.content
                .filter(item => item.type === 'text')
                .map(item => item.text)
                .join('\n');
            content = textContent;
        } else if (typeof entry.message.content === 'string') {
            // Старый формат: content - строка
            content = entry.message.content;
        }

        if (!content) {
            return null;
        }

        return {
            role: 'assistant',
            content: content,
            timestamp: new Date(entry.timestamp).getTime()
        };
    }

    /**
     * Генерировать уникальный ID сообщения
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        for (const [sessionId] of this.watchers) {
            this.stopMonitoring(sessionId);
        }
    }
}