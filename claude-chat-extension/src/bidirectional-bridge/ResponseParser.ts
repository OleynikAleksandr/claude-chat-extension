/**
 * ResponseParser - Микрокласс для парсинга ответов Claude Code
 * Размер: <150 строк
 * Ответственность: Парсинг и обработка ответов из терминала
 */

export interface ParsedResponse {
    content: string;
    isComplete: boolean;
    timestamp: number;
    responseType: 'text' | 'thinking' | 'tool' | 'error' | 'system';
    metadata?: {
        sessionId?: string;
        messageId?: string;
        duration?: number;
    };
}

export interface ParsingOptions {
    filterThinking?: boolean;
    filterSystem?: boolean;
    extractMetadata?: boolean;
    timeoutMs?: number;
}

export class ResponseParser {
    private static readonly THINKING_MARKERS = [
        '<thinking>',
        '</thinking>',
        'Claude is thinking...',
        'I need to think about'
    ];

    private static readonly SYSTEM_MARKERS = [
        '🔄 ',
        '✅ ',
        '❌ ',
        '🔧 ',
        '📝 ',
        '🚀 '
    ];

    private static readonly ERROR_MARKERS = [
        'Error:',
        'error:',
        'ERROR:',
        'Failed:',
        'Exception:',
        'Warning:'
    ];

    private static readonly TOOL_MARKERS = [
        '<function_calls>',
        '</function_calls>',
        '<invoke',
        'tool_use',
        'function_result'
    ];

    private options: ParsingOptions;

    constructor(options: ParsingOptions = {}) {
        this.options = {
            filterThinking: options.filterThinking ?? false,
            filterSystem: options.filterSystem ?? true,
            extractMetadata: options.extractMetadata ?? true,
            timeoutMs: options.timeoutMs ?? 30000
        };
    }

    /**
     * Парсит текст ответа от Claude Code
     */
    parseResponse(rawText: string): ParsedResponse {
        const timestamp = Date.now();
        const responseType = this.detectResponseType(rawText);
        
        // Фильтрация по типу
        if (this.shouldFilterResponse(responseType)) {
            return {
                content: '',
                isComplete: true,
                timestamp,
                responseType,
                metadata: { messageId: this.generateMessageId() }
            };
        }

        const content = this.cleanResponse(rawText, responseType);
        const isComplete = this.isResponseComplete(content, responseType);
        const metadata = this.options.extractMetadata ? this.extractMetadata(rawText) : undefined;

        return {
            content,
            isComplete,
            timestamp,
            responseType,
            metadata
        };
    }

    /**
     * Определяет тип ответа
     */
    private detectResponseType(text: string): ParsedResponse['responseType'] {
        const lowerText = text.toLowerCase();

        // Проверка на ошибки
        if (ResponseParser.ERROR_MARKERS.some(marker => lowerText.includes(marker.toLowerCase()))) {
            return 'error';
        }

        // Проверка на системные сообщения
        if (ResponseParser.SYSTEM_MARKERS.some(marker => text.includes(marker))) {
            return 'system';
        }

        // Проверка на thinking
        if (ResponseParser.THINKING_MARKERS.some(marker => lowerText.includes(marker.toLowerCase()))) {
            return 'thinking';
        }

        // Проверка на tool usage
        if (ResponseParser.TOOL_MARKERS.some(marker => lowerText.includes(marker.toLowerCase()))) {
            return 'tool';
        }

        return 'text';
    }

    /**
     * Очищает ответ от служебных маркеров
     */
    private cleanResponse(text: string, responseType: ParsedResponse['responseType']): string {
        let cleaned = text.trim();

        // Удаляем системные маркеры
        if (responseType === 'system') {
            ResponseParser.SYSTEM_MARKERS.forEach(marker => {
                cleaned = cleaned.replace(new RegExp(marker, 'g'), '');
            });
        }

        // Удаляем thinking теги
        if (responseType === 'thinking') {
            cleaned = cleaned.replace(/<thinking>|<\/thinking>/g, '');
        }

        // Удаляем лишние пробелы и переносы
        cleaned = cleaned.replace(/\n\s*\n/g, '\n').trim();

        return cleaned;
    }

    /**
     * Проверяет завершенность ответа
     */
    private isResponseComplete(content: string, responseType: ParsedResponse['responseType']): boolean {
        // Системные сообщения всегда завершены
        if (responseType === 'system' || responseType === 'error') {
            return true;
        }

        // Thinking блоки должны быть закрыты
        if (responseType === 'thinking') {
            return !content.includes('<thinking>') || content.includes('</thinking>');
        }

        // Tool calls должны быть завершены
        if (responseType === 'tool') {
            return content.includes('</function_calls>') || content.includes('function_result');
        }

        // Текстовые ответы - проверяем на логическое завершение
        return content.length > 0 && !content.endsWith('...');
    }

    /**
     * Извлекает метаданные из ответа
     */
    private extractMetadata(text: string): ParsedResponse['metadata'] {
        const metadata: ParsedResponse['metadata'] = {
            messageId: this.generateMessageId()
        };

        // Извлекаем ID сессии если есть
        const sessionMatch = text.match(/session[_-]([a-zA-Z0-9]+)/i);
        if (sessionMatch) {
            metadata.sessionId = sessionMatch[1];
        }

        // Оцениваем время обработки по длине
        metadata.duration = Math.max(100, text.length * 2);

        return metadata;
    }

    /**
     * Проверяет нужно ли фильтровать ответ
     */
    private shouldFilterResponse(responseType: ParsedResponse['responseType']): boolean {
        if (this.options.filterThinking && responseType === 'thinking') {
            return true;
        }

        if (this.options.filterSystem && responseType === 'system') {
            return true;
        }

        return false;
    }

    /**
     * Генерирует уникальный ID сообщения
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Обновляет опции парсера
     */
    updateOptions(newOptions: Partial<ParsingOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Получает текущие опции
     */
    getOptions(): ParsingOptions {
        return { ...this.options };
    }
}