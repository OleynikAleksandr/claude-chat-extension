/**
 * ProcessingStatusBridge
 * Мост между React компонентами и ProcessingStatusManager через webview API
 */

// Декларация глобального VS Code API
declare const vscode: {
    postMessage: (message: any) => void;
};

export interface ProcessingSession {
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    state: 'working' | 'ready' | 'interrupted';
    tokenUsage: {
        inputTokens: number;
        outputTokens: number;
        cacheCreationTokens?: number;
        cacheReadTokens?: number;
        totalCost?: number;
    };
    toolCallsCount: number;
    lastActivity: Date;
}

export class ProcessingStatusBridge {
    private subscriptions: Map<string, (session: ProcessingSession) => void> = new Map();
    private messageListener: (event: MessageEvent) => void;

    constructor() {
        // Используем глобальный vscode API (уже полученный в useVSCodeAPI)
        this.messageListener = (event: MessageEvent) => {
            const message = event.data;
            
            if (message.command === 'processingStatusUpdate') {
                const callback = this.subscriptions.get(message.sessionId);
                if (callback && message.processingSession) {
                    // Преобразуем данные из extension в правильный формат
                    const session: ProcessingSession = {
                        ...message.processingSession,
                        startTime: new Date(message.processingSession.startTime),
                        endTime: message.processingSession.endTime ? new Date(message.processingSession.endTime) : undefined,
                        lastActivity: new Date(message.processingSession.lastActivity)
                    };
                    callback(session);
                }
            }
        };
        
        // Слушаем сообщения от extension
        window.addEventListener('message', this.messageListener);
    }

    /**
     * Подписаться на обновления статуса обработки
     */
    subscribeToProcessingStatus(sessionId: string, callback: (session: ProcessingSession) => void): void {
        this.subscriptions.set(sessionId, callback);
        vscode.postMessage({
            command: 'subscribeToProcessingStatus',
            sessionId
        });
    }

    /**
     * Отписаться от обновлений
     */
    unsubscribeFromProcessingStatus(sessionId: string): void {
        this.subscriptions.delete(sessionId);
        vscode.postMessage({
            command: 'unsubscribeFromProcessingStatus',
            sessionId
        });
    }

    /**
     * Получить текущий статус обработки
     */
    getProcessingStatus(sessionId: string): void {
        vscode.postMessage({
            command: 'getProcessingStatus',
            sessionId
        });
    }

    /**
     * Прервать обработку
     */
    interruptProcessing(sessionId: string): void {
        vscode.postMessage({
            command: 'interruptProcessing',
            sessionId
        });
    }

    /**
     * Очистка всех подписок
     */
    dispose(): void {
        for (const sessionId of this.subscriptions.keys()) {
            this.unsubscribeFromProcessingStatus(sessionId);
        }
        this.subscriptions.clear();
        
        // Удаляем listener
        window.removeEventListener('message', this.messageListener);
    }
}

// Экспортируем singleton instance
export const processingStatusBridge = new ProcessingStatusBridge();
