/**
 * JSONL Response Monitor - ПОТОК 2: Terminal → Extension
 * Независимый мониторинг ответов от Claude Code через JSONL файлы
 * Размер: <200 строк
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Message, ServiceMessage, ServiceInfoDetected, ToolUseItem, UsageInfo } from '../types/Session';

// 🔧 Расширенный формат Claude Code JSONL для Enhanced ServiceInfo
export interface ClaudeCodeJsonlEntry {
    type: 'user' | 'assistant' | 'summary';
    message?: {
        id?: string;
        role: 'user' | 'assistant';
        model?: string;
        content: Array<{
            type: 'text' | 'tool_use' | 'thinking';
            text?: string;
            id?: string;
            name?: string;
            input?: any;
        }> | string;
        stop_reason?: string | null;
        stop_sequence?: string | null;
        usage?: {
            input_tokens: number;
            output_tokens: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
            service_tier?: string;
        };
    };
    timestamp: string;
    sessionId?: string;
    parentUuid?: string;
    version?: string;
}

// Старый формат для совместимости
export interface JsonlEntry {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
}

// 🔧 Формат summary записи при resume сессии
export interface SummaryEntry {
    type: 'summary';
    summary: string;
    leafUuid?: string;
}

export interface ResponseDetected {
    sessionId: string;
    response: Message;
}

// 🔧 Результат парсинга JSONL записи
export interface ParsedJsonlEntry {
    message?: JsonlEntry;
    serviceInfo?: ServiceMessage;
}

export class JsonlResponseMonitor {
    private watchers: Map<string, fs.FSWatcher> = new Map();
    private lastProcessedEntries: Map<string, number> = new Map();
    private onResponseCallback?: (data: ResponseDetected) => void;
    private onServiceInfoCallback?: (data: ServiceInfoDetected) => void;
    
    // 🔧 Оптимизация производительности
    private fileContentCache: Map<string, { content: string; mtime: number }> = new Map();
    private throttleTimers: Map<string, NodeJS.Timeout> = new Map();
    private readonly THROTTLE_DELAY = 200; // 200ms между обработками
    private readonly MAX_CACHE_SIZE = 10; // Максимальный размер кэша файлов

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
                this.outputChannel.appendLine(`📂 JSONL file changed (${eventType}), throttling check...`);
                this.throttledCheckForNewResponses(sessionId, sessionName, jsonlPath);
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
     * 🔧 Установить callback для получения служебной информации
     */
    onServiceInfo(callback: (data: ServiceInfoDetected) => void): void {
        this.onServiceInfoCallback = callback;
    }

    /**
     * 🔧 Throttled проверка новых ответов (производительность)
     */
    private throttledCheckForNewResponses(sessionId: string, sessionName: string, jsonlPath: string): void {
        // Очищаем предыдущий таймер
        const existingTimer = this.throttleTimers.get(sessionId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Устанавливаем новый таймер
        const timer = setTimeout(() => {
            this.checkForNewResponses(sessionId, sessionName, jsonlPath);
            this.throttleTimers.delete(sessionId);
        }, this.THROTTLE_DELAY);

        this.throttleTimers.set(sessionId, timer);
    }

    /**
     * Проверить новые ответы в JSONL файле
     */
    private async checkForNewResponses(sessionId: string, sessionName: string, jsonlPath: string): Promise<void> {
        try {
            if (!fs.existsSync(jsonlPath)) {
                return;
            }

            // 🔧 Используем кэширование для оптимизации
            const content = await this.getCachedFileContent(jsonlPath);
            if (!content) {
                return; // Файл не изменился
            }

            const lines = content.trim().split('\n').filter(line => line.trim());

            const lastProcessed = this.lastProcessedEntries.get(sessionId) || 0;
            const newMessages: JsonlEntry[] = [];
            const newServiceInfo: ServiceMessage[] = [];

            for (const line of lines) {
                try {
                    const rawEntry = JSON.parse(line);
                    
                    // Пропускаем summary записи (они появляются при resume сессии)
                    if (this.isSummaryFormat(rawEntry)) {
                        this.outputChannel.appendLine(`📝 Skipping summary entry: ${(rawEntry as SummaryEntry).summary}`);
                        continue;
                    }
                    
                    // Пробуем новый формат Claude Code
                    if (this.isClaudeCodeFormat(rawEntry)) {
                        const entryTime = new Date(rawEntry.timestamp).getTime();
                        
                        // Только новые записи после последней обработки
                        if (entryTime > lastProcessed && rawEntry.type === 'assistant') {
                            const parsed = this.parseClaudeCodeEntry(rawEntry as ClaudeCodeJsonlEntry, sessionId);
                            
                            // Обрабатываем обычные сообщения
                            if (parsed.message) {
                                newMessages.push(parsed.message);
                                this.outputChannel.appendLine(`✅ Parsed message: ${parsed.message.content.substring(0, 100)}...`);
                            }
                            
                            // Обрабатываем служебную информацию
                            if (parsed.serviceInfo) {
                                newServiceInfo.push(parsed.serviceInfo);
                                this.outputChannel.appendLine(`🔧 Parsed service info: ${parsed.serviceInfo.toolUse.length} tools, ${parsed.serviceInfo.usage.output_tokens} tokens`);
                            }
                        }
                    } 
                    // Пробуем старый формат для совместимости
                    else if (rawEntry.role && rawEntry.content) {
                        const entry = rawEntry as JsonlEntry;
                        const entryTime = entry.timestamp || Date.now();
                        
                        // Только новые записи после последней обработки
                        if (entryTime > lastProcessed && entry.role === 'assistant') {
                            newMessages.push(entry);
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

            // 🔧 Обрабатываем новые текстовые сообщения от assistant
            for (const entry of newMessages) {
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

            // 🔧 Обрабатываем новую служебную информацию
            for (const serviceInfo of newServiceInfo) {
                this.outputChannel.appendLine(`🔧 New service info detected for ${sessionName}: ${serviceInfo.toolUse.length} tools, status: ${serviceInfo.status}`);

                if (this.onServiceInfoCallback) {
                    this.onServiceInfoCallback({
                        sessionId,
                        serviceInfo
                    });
                }
            }

            // Обновляем последнее время обработки
            if (newMessages.length > 0 || newServiceInfo.length > 0) {
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
     * 🔧 Проверить, является ли запись summary форматом (при resume сессии)
     */
    private isSummaryFormat(entry: any): boolean {
        return entry.type === 'summary' && entry.summary && typeof entry.summary === 'string';
    }

    /**
     * 🔧 Парсинг записи нового формата Claude Code в два потока: message + serviceInfo
     */
    private parseClaudeCodeEntry(entry: ClaudeCodeJsonlEntry, sessionId: string): ParsedJsonlEntry {
        if (!entry.message || entry.type !== 'assistant') {
            return {};
        }

        const result: ParsedJsonlEntry = {};
        
        // Обрабатываем content - может быть массивом объектов или строкой
        if (Array.isArray(entry.message.content)) {
            // 🔧 ПОТОК 1: Извлекаем текстовые сообщения
            const textContent = entry.message.content
                .filter(item => item.type === 'text' && item.text)
                .map(item => item.text!)
                .join('\n');
            
            if (textContent.trim()) {
                result.message = {
                    role: 'assistant',
                    content: textContent,
                    timestamp: new Date(entry.timestamp).getTime()
                };
            }
            
            // 🔧 ПОТОК 2: Извлекаем служебную информацию
            const serviceInfo = this.extractServiceInfo(entry, sessionId);
            if (serviceInfo) {
                result.serviceInfo = serviceInfo;
            }
            
        } else if (typeof entry.message.content === 'string') {
            // Старый формат: content - строка
            result.message = {
                role: 'assistant',
                content: entry.message.content,
                timestamp: new Date(entry.timestamp).getTime()
            };
        }

        return result;
    }

    /**
     * 🔧 Извлечение служебной информации из JSONL записи
     */
    private extractServiceInfo(entry: ClaudeCodeJsonlEntry, sessionId: string): ServiceMessage | null {
        try {
            if (!entry.message || !Array.isArray(entry.message.content)) {
                return null;
            }

            // Извлекаем tool_use операции с валидацией
            const toolUseItems: ToolUseItem[] = entry.message.content
                .filter(item => item.type === 'tool_use')
                .map(item => {
                    // Валидируем обязательные поля
                    if (!item.name) {
                        this.outputChannel.appendLine(`⚠️ Tool use without name: ${JSON.stringify(item)}`);
                        return null;
                    }
                    
                    return {
                        id: item.id || this.generateId(),
                        name: item.name,
                        input: this.sanitizeInput(item.input),
                        status: 'running' as const,
                        duration: undefined,
                        result: undefined,
                        error: undefined
                    };
                })
                .filter(item => item !== null) as ToolUseItem[];

            // Извлекаем thinking процесс с валидацией
            const thinkingContent = entry.message.content
                .filter(item => item.type === 'thinking' && item.text && typeof item.text === 'string')
                .map(item => item.text!)
                .join('\n')
                .trim();

            // Извлекаем usage информацию с валидацией
            // 🎯 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Контекстное окно = cache_creation + cache_read
            const cacheCreationTokens = this.validateTokenCount(entry.message.usage?.cache_creation_input_tokens);
            const cacheReadTokens = this.validateTokenCount(entry.message.usage?.cache_read_input_tokens);
            const totalContextTokens = cacheCreationTokens + cacheReadTokens;

            const usage: UsageInfo = {
                input_tokens: this.validateTokenCount(entry.message.usage?.input_tokens),
                output_tokens: this.validateTokenCount(entry.message.usage?.output_tokens),
                cache_creation_input_tokens: cacheCreationTokens,
                cache_read_input_tokens: totalContextTokens, // Теперь это полный контекст!
                service_tier: this.validateServiceTier(entry.message.usage?.service_tier)
            };

            // Создаем служебную информацию только если есть что показать
            // 🔧 ВАЖНО: Игнорируем записи с cache_read_input_tokens = 0 (промежуточные записи)
            if ((toolUseItems.length > 0 || thinkingContent || usage.output_tokens > 0) && (usage.cache_read_input_tokens || 0) > 0) {
                // Определяем статус на основе stop_reason И наличия активных инструментов
                const status = this.determineStatusFromStopReasonAndTools(entry, toolUseItems);
                
                return {
                    id: this.generateId(),
                    type: 'service',
                    sessionId: sessionId,
                    timestamp: new Date(entry.timestamp),
                    toolUse: toolUseItems,
                    thinking: thinkingContent,
                    usage: usage,
                    status: status
                };
            }

            return null;
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error extracting service info: ${error}`);
            return null;
        }
    }

    /**
     * 🔧 Валидация и санитизация входных данных для tool_use
     */
    private sanitizeInput(input: any): any {
        if (!input) {return {};}
        
        try {
            // Проверяем на потенциально опасные данные
            if (typeof input === 'string') {
                return { raw: input.substring(0, 1000) }; // Ограничиваем длину
            }
            
            if (typeof input === 'object') {
                // Рекурсивно очищаем объект
                const sanitized: any = {};
                for (const [key, value] of Object.entries(input)) {
                    if (typeof value === 'string') {
                        sanitized[key] = value.substring(0, 1000);
                    } else if (typeof value === 'number' || typeof value === 'boolean') {
                        sanitized[key] = value;
                    } else if (Array.isArray(value)) {
                        sanitized[key] = value.slice(0, 100); // Ограничиваем массивы
                    } else {
                        sanitized[key] = String(value).substring(0, 500);
                    }
                }
                return sanitized;
            }
            
            return input;
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Error sanitizing input: ${error}`);
            return { error: 'Failed to sanitize input' };
        }
    }

    /**
     * 🔧 Валидация количества токенов
     */
    private validateTokenCount(count: number | undefined): number {
        if (count === undefined || count === null) {return 0;}
        if (typeof count !== 'number') {return 0;}
        if (count < 0) {return 0;}
        if (count > 1000000) {return 1000000;} // Максимальное разумное значение
        return Math.floor(count);
    }

    /**
     * 🔧 Валидация service tier
     */
    private validateServiceTier(tier: string | undefined): string | undefined {
        if (!tier || typeof tier !== 'string') {return undefined;}
        
        const validTiers = ['standard', 'premium', 'enterprise'];
        if (validTiers.includes(tier.toLowerCase())) {
            return tier.toLowerCase();
        }
        
        return undefined;
    }


    /**
     * 🔧 Упрощённый алгоритм: ТОЛЬКО completed при ожидании пользователя
     * По умолчанию ВСЕГДА processing, completed ТОЛЬКО при stop_reason: "end_turn"
     */
    private determineStatusFromStopReasonAndTools(
        entry: ClaudeCodeJsonlEntry, 
        toolUseItems: ToolUseItem[]
    ): 'processing' | 'completed' | 'initializing' {
        const stopReason = entry.message?.stop_reason;
        
        // 🔍 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ для отладки
        this.outputChannel.appendLine(`🔍 DEBUG: stop_reason value: "${stopReason}" (type: ${typeof stopReason})`);
        this.outputChannel.appendLine(`🔍 DEBUG: tools count: ${toolUseItems.length}`);
        this.outputChannel.appendLine(`🔍 DEBUG: stop_reason === "end_turn": ${stopReason === "end_turn"}`);
        this.outputChannel.appendLine(`🔍 DEBUG: stop_reason === null: ${stopReason === null}`);
        
        // ГЛАВНОЕ ПРАВИЛО: completed ТОЛЬКО когда ассистент ждёт ответ от пользователя
        // Проверяем разные варианты stop_reason для ожидания пользователя
        const isWaitingForUser = (
            stopReason === "end_turn" || 
            stopReason === null || 
            stopReason === "stop_sequence"
        ) && toolUseItems.length === 0;
        
        if (isWaitingForUser) {
            this.outputChannel.appendLine(`🔧 Status: COMPLETED (waiting for user, stop_reason: ${stopReason}, no tools)`);
            return 'completed';
        }
        
        // ВО ВСЕХ ОСТАЛЬНЫХ СЛУЧАЯХ - processing
        this.outputChannel.appendLine(`🔧 Status: PROCESSING (stop_reason: ${stopReason}, tools: ${toolUseItems.length})`);
        return 'processing';
    }

    /**
     * Генерировать уникальный ID сообщения
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * 🔧 Генерировать уникальный ID для служебных объектов
     */
    private generateId(): string {
        return `id_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * 🔧 Кэширование контента файла для оптимизации
     */
    private async getCachedFileContent(filePath: string): Promise<string | null> {
        try {
            const stats = await fs.promises.stat(filePath);
            const mtime = stats.mtime.getTime();
            
            // Проверяем кэш
            const cached = this.fileContentCache.get(filePath);
            if (cached && cached.mtime === mtime) {
                return cached.content; // Возвращаем кэшированное содержимое
            }
            
            // Читаем файл
            const content = await fs.promises.readFile(filePath, 'utf-8');
            
            // Управляем размером кэша
            if (this.fileContentCache.size >= this.MAX_CACHE_SIZE) {
                // Удаляем самый старый элемент
                const firstKey = this.fileContentCache.keys().next().value;
                if (firstKey) {
                    this.fileContentCache.delete(firstKey);
                }
            }
            
            // Кэшируем контент
            this.fileContentCache.set(filePath, { content, mtime });
            
            return content;
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Error caching file content: ${error}`);
            // Fallback: читаем файл напрямую
            try {
                return await fs.promises.readFile(filePath, 'utf-8');
            } catch (fallbackError) {
                this.outputChannel.appendLine(`❌ Fallback file read failed: ${fallbackError}`);
                return null;
            }
        }
    }

    /**
     * 🚀 Проактивное чтение текущего состояния JSONL для инициализации токенов
     * Вызывается при первом сообщении пользователя в сессии
     */
    async initializeSessionTokens(sessionId: string, sessionName: string): Promise<void> {
        try {
            // Поиск JSONL файла (скопировано из метода findJsonlPath)
            const claudeDir = path.join(os.homedir(), '.claude');
            if (!fs.existsSync(claudeDir)) {
                this.outputChannel.appendLine(`🔍 Claude directory not found - tokens will be initialized after first response`);
                return;
            }

            const allFiles: Array<{ name: string; path: string; mtime: Date }> = [];
            
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
            
            let jsonlPath: string | null = null;
            if (allFiles.length > 0) {
                jsonlPath = allFiles[0].path;
            }

            if (!jsonlPath || !fs.existsSync(jsonlPath)) {
                this.outputChannel.appendLine(`🔍 No JSONL file found for session ${sessionId} (${sessionName}) - tokens will be initialized after first response`);
                return;
            }

            this.outputChannel.appendLine(`🚀 Proactively reading JSONL for session ${sessionId}: ${jsonlPath}`);

            const content = await this.getCachedFileContent(jsonlPath);
            if (!content) {
                return;
            }

            const lines = content.trim().split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                return;
            }

            // Ищем последнюю запись assistant с токенами
            let latestServiceInfo: ServiceMessage | null = null;
            
            for (let i = lines.length - 1; i >= 0; i--) {
                try {
                    const rawEntry = JSON.parse(lines[i]);
                    
                    // Пропускаем summary записи при инициализации
                    if (this.isSummaryFormat(rawEntry)) {
                        continue;
                    }
                    
                    if (this.isClaudeCodeFormat(rawEntry) && rawEntry.type === 'assistant') {
                        const parsed = this.parseClaudeCodeEntry(rawEntry as ClaudeCodeJsonlEntry, sessionId);
                        
                        if (parsed.serviceInfo) {
                            latestServiceInfo = parsed.serviceInfo;
                            break; // Нашли последнюю запись с токенами
                        }
                    }
                } catch (parseError) {
                    continue; // Пропускаем некорректные строки
                }
            }

            // Если нашли служебную информацию - отправляем её с принудительным статусом processing
            if (latestServiceInfo) {
                this.outputChannel.appendLine(`✅ Initialized tokens for session ${sessionId}: ${latestServiceInfo.usage.cache_read_input_tokens || 0} cache tokens`);
                
                // 🔧 ВАЖНО: При инициализации ВСЕГДА устанавливаем processing, 
                // так как пользователь только что отправил сообщение
                const processingServiceInfo: ServiceMessage = {
                    ...latestServiceInfo,
                    status: 'processing',
                    timestamp: new Date() // Обновляем время
                };
                
                if (this.onServiceInfoCallback) {
                    this.onServiceInfoCallback({
                        sessionId,
                        serviceInfo: processingServiceInfo
                    });
                }
            }

        } catch (error) {
            this.outputChannel.appendLine(`❌ Error initializing session tokens: ${error}`);
        }
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        // Очищаем таймеры
        for (const [, timer] of this.throttleTimers) {
            clearTimeout(timer);
        }
        this.throttleTimers.clear();
        
        // Очищаем кэш
        this.fileContentCache.clear();
        
        // Останавливаем мониторинг
        for (const [sessionId] of this.watchers) {
            this.stopMonitoring(sessionId);
        }
    }
}