/**
 * JsonlReader - Микрокласс для чтения JSONL логов Claude Code
 * Размер: <150 строк
 * Ответственность: Чтение и мониторинг JSONL файлов Claude
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface JsonlEntry {
    sessionId: string;
    timestamp: string;
    type: 'user' | 'assistant' | 'system';
    message: {
        id: string;
        role: string;
        content: Array<{
            type: string;
            text?: string;
        }>;
        usage?: {
            input_tokens: number;
            output_tokens: number;
        };
    };
}

export interface JsonlReadOptions {
    sessionId?: string;
    afterTimestamp?: Date;
    maxEntries?: number;
    watchForChanges?: boolean;
}

export class JsonlReader {
    private static readonly CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects');
    private static readonly PROJECT_NAME = '-Users-oleksandroliinyk-VSCODE-ClaudeCodeBridge';
    private watchHandles = new Map<string, fs.FSWatcher>();

    /**
     * Находит JSONL файл для сессии
     */
    async findSessionFile(sessionId: string): Promise<string | null> {
        const projectDir = path.join(JsonlReader.CLAUDE_DIR, JsonlReader.PROJECT_NAME);
        const sessionFile = path.join(projectDir, `${sessionId}.jsonl`);
        
        try {
            await fs.promises.access(sessionFile);
            return sessionFile;
        } catch {
            return null;
        }
    }

    /**
     * Находит самый свежий JSONL файл
     */
    async findLatestJsonlFile(): Promise<string | null> {
        const projectDir = path.join(JsonlReader.CLAUDE_DIR, JsonlReader.PROJECT_NAME);
        
        try {
            const files = await fs.promises.readdir(projectDir);
            const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
            
            if (jsonlFiles.length === 0) {return null;}
            
            // Сортируем по времени модификации
            const filesWithStats = await Promise.all(
                jsonlFiles.map(async (file) => {
                    const fullPath = path.join(projectDir, file);
                    const stats = await fs.promises.stat(fullPath);
                    return { file: fullPath, mtime: stats.mtime.getTime() };
                })
            );
            
            filesWithStats.sort((a, b) => b.mtime - a.mtime);
            return filesWithStats[0].file;
        } catch {
            return null;
        }
    }

    /**
     * Читает последние записи из JSONL файла
     */
    async readLastEntries(filePath: string, options: JsonlReadOptions = {}): Promise<JsonlEntry[]> {
        const maxEntries = options.maxEntries || 10;
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n');
        
        const entries: JsonlEntry[] = [];
        
        // Читаем с конца
        for (let i = lines.length - 1; i >= 0 && entries.length < maxEntries; i--) {
            const line = lines[i].trim();
            if (!line) {continue;}
            
            try {
                const data = JSON.parse(line);
                
                // Фильтруем по sessionId если указан
                if (options.sessionId && data.sessionId !== options.sessionId) {
                    continue;
                }
                
                // Фильтруем по времени если указано
                if (options.afterTimestamp && new Date(data.timestamp) <= options.afterTimestamp) {
                    continue;
                }
                
                const entry: JsonlEntry = {
                    sessionId: data.sessionId,
                    timestamp: data.timestamp,
                    type: data.type,
                    message: data.message
                };
                
                entries.unshift(entry); // Добавляем в начало для правильного порядка
            } catch (error) {
                console.warn('Failed to parse JSONL line:', error);
            }
        }
        
        return entries;
    }

    /**
     * Мониторит изменения в JSONL файле
     */
    watchFile(filePath: string, callback: (entries: JsonlEntry[]) => void): void {
        // Закрываем предыдущий watcher если есть
        this.stopWatching(filePath);
        
        const watcher = fs.watch(filePath, async (eventType) => {
            if (eventType === 'change') {
                try {
                    const entries = await this.readLastEntries(filePath, { maxEntries: 5 });
                    callback(entries);
                } catch (error) {
                    console.error('Error reading JSONL file:', error);
                }
            }
        });
        
        this.watchHandles.set(filePath, watcher);
    }

    /**
     * Останавливает мониторинг файла
     */
    stopWatching(filePath?: string): void {
        if (filePath) {
            const watcher = this.watchHandles.get(filePath);
            if (watcher) {
                watcher.close();
                this.watchHandles.delete(filePath);
            }
        } else {
            // Останавливаем все watchers
            for (const [, watcher] of this.watchHandles) {
                watcher.close();
            }
            this.watchHandles.clear();
        }
    }

    /**
     * Извлекает текст из сообщения
     */
    extractMessageText(entry: JsonlEntry): string {
        if (!entry.message?.content) {return '';}
        
        return entry.message.content
            .filter(c => c.type === 'text' && c.text)
            .map(c => c.text)
            .join('\n');
    }

    /**
     * Очищает ресурсы
     */
    dispose(): void {
        this.stopWatching();
    }
}