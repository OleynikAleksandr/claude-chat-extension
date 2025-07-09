/**
 * Enhanced Multi Session Provider
 * Расширенный провайдер с интеграцией детекции состояний
 * Не изменяет существующий MultiSessionProvider
 */

import * as vscode from 'vscode';
import { MultiSessionProvider } from './MultiSessionProvider';
import { DualSessionStateAdapter, SessionStateInfo } from '../../state-detection/adapters/DualSessionStateAdapter';
import { ClaudeCodeState } from '../../state-detection/types/ClaudeState';
import { WebviewMessage, ExtensionMessage, SessionStateData } from '../types/Session';

export interface EnhancedSessionData {
    // Существующие данные сессии
    sessionId: string;
    sessionName: string;
    isActive: boolean;
    messageCount: number;
    
    // Новые данные о состоянии
    state: ClaudeCodeState;
    stateDescription: string;
    stateEmoji: string;
    isReadyForNewRequest: boolean;
    canSendMessage: boolean;
}

export interface EnhancedProviderCallbacks {
    onSessionStateChanged?: (sessions: EnhancedSessionData[]) => void;
    onSessionReadinessChanged?: (sessionId: string, isReady: boolean) => void;
    onActiveSessionsChanged?: (activeSessions: EnhancedSessionData[]) => void;
}

/**
 * Расширенный провайдер с детекцией состояний
 */
export class EnhancedMultiSessionProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'claudeChatMultiSessionView';
    
    private outputChannel: vscode.OutputChannel;
    private baseProvider: MultiSessionProvider;
    private stateAdapter: DualSessionStateAdapter;
    private view?: vscode.WebviewView;
    private readonly extensionUri: vscode.Uri;
    
    // Callbacks
    private callbacks: EnhancedProviderCallbacks = {};
    
    // Кэш данных
    private enhancedSessionsCache: Map<string, EnhancedSessionData> = new Map();

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        
        // Создаем output channel
        this.outputChannel = vscode.window.createOutputChannel('Claude Chat Enhanced');
        
        // Инициализируем базовый провайдер
        this.baseProvider = new MultiSessionProvider(extensionUri);
        
        // Инициализируем адаптер состояний
        this.stateAdapter = new DualSessionStateAdapter(
            this.outputChannel,
            this.baseProvider.getSessionManager()
        );

        this.setupIntegration();
        this.outputChannel.appendLine(`🚀 EnhancedMultiSessionProvider initialized`);
    }

    /**
     * Реализация vscode.WebviewViewProvider
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this.view = webviewView;

        // Получаем HTML и настройки из базового провайдера
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        // Обрабатываем сообщения от webview
        webviewView.webview.onDidReceiveMessage(
            message => this.handleWebviewMessage(message),
            undefined,
            []
        );

        // Отправляем начальное состояние
        this.sendSessionUpdate();
        this.sendSessionStatesUpdate();
    }

    /**
     * Настройка интеграции между провайдерами
     */
    private setupIntegration(): void {
        this.outputChannel.appendLine(`🔗 Setting up integration between providers...`);

        // Слушаем обновления состояний от адаптера
        this.stateAdapter.onStateUpdate((sessionStates) => {
            this.outputChannel.appendLine(`🔗 Enhanced Provider received state update: ${sessionStates.length} sessions`);
            this.handleStateUpdate(sessionStates);
        });

        // Слушаем события от базового провайдера через session manager
        const sessionManager = this.baseProvider.getSessionManager();
        
        sessionManager.onSessionCreated((session) => {
            this.outputChannel.appendLine(`🔗 Enhanced Provider: session created ${session.id}`);
            this.handleBaseSessionsChanged([session]);
        });

        sessionManager.onSessionClosed((_sessionId) => {
            this.outputChannel.appendLine(`🔗 Enhanced Provider: session closed ${_sessionId}`);
            this.handleBaseSessionsChanged([]);
        });

        sessionManager.onSessionSwitched((_sessionId) => {
            this.outputChannel.appendLine(`🔗 Enhanced Provider: session switched ${_sessionId}`);
            this.handleBaseSessionsChanged([]);
        });

        sessionManager.onMessageReceived((_sessionId, _message) => {
            this.outputChannel.appendLine(`🔗 Enhanced Provider: message received for ${_sessionId}`);
            // При получении нового сообщения обновляем webview
            this.sendSessionUpdate();
        });

        this.outputChannel.appendLine(`✅ Integration setup completed`);
    }

    /**
     * Обработка обновления состояний
     */
    private handleStateUpdate(sessionStates: SessionStateInfo[]): void {
        this.outputChannel.appendLine(`🎯 handleStateUpdate called with ${sessionStates.length} session states`);
        
        // Обновляем кэш расширенных данных
        for (const stateInfo of sessionStates) {
            this.outputChannel.appendLine(`🎯 Processing state for session ${stateInfo.sessionId}: ${stateInfo.state} (${stateInfo.stateEmoji})`);
            
            const existingData = this.enhancedSessionsCache.get(stateInfo.sessionId);
            const sessionManager = this.baseProvider.getSessionManager();
            const baseSession = sessionManager.getSession(stateInfo.sessionId);
            
            if (baseSession) {
                const enhancedData: EnhancedSessionData = {
                    sessionId: stateInfo.sessionId,
                    sessionName: stateInfo.sessionName,
                    isActive: baseSession.id === sessionManager.getActiveSession()?.id,
                    messageCount: baseSession.messages.length,
                    
                    // Данные о состоянии
                    state: stateInfo.state,
                    stateDescription: stateInfo.stateDescription,
                    stateEmoji: stateInfo.stateEmoji,
                    isReadyForNewRequest: stateInfo.isReadyForNewRequest,
                    canSendMessage: this.stateAdapter.canSendMessage(stateInfo.sessionId)
                };

                this.enhancedSessionsCache.set(stateInfo.sessionId, enhancedData);
                this.outputChannel.appendLine(`✅ Enhanced data cached for session ${stateInfo.sessionId}`);

                // Проверяем изменение готовности
                if (existingData && existingData.isReadyForNewRequest !== enhancedData.isReadyForNewRequest) {
                    this.outputChannel.appendLine(`📌 Session readiness changed: ${stateInfo.sessionId} → ${enhancedData.isReadyForNewRequest}`);
                    this.callbacks.onSessionReadinessChanged?.(
                        stateInfo.sessionId, 
                        enhancedData.isReadyForNewRequest
                    );
                }
            } else {
                this.outputChannel.appendLine(`⚠️ Base session not found for ${stateInfo.sessionId}`);
            }
        }

        this.outputChannel.appendLine(`📡 Notifying state changes and sending webview update...`);
        
        // Уведомляем о изменениях
        this.notifySessionStateChanged();
        this.notifyActiveSessionsChanged();
        
        // Отправляем обновления в webview
        this.sendSessionStatesUpdate();
        
        this.outputChannel.appendLine(`✅ handleStateUpdate completed`);
    }

    /**
     * Обработка изменений базовых сессий
     */
    private handleBaseSessionsChanged(_sessions: any[]): void {
        // Синхронизируем с кэшем расширенных данных
        const sessionManager = this.baseProvider.getSessionManager();
        const allSessions = sessionManager.getAllSessions();
        
        const existingIds = new Set(this.enhancedSessionsCache.keys());
        const currentIds = new Set(allSessions.map(s => s.id));

        // Удаляем закрытые сессии
        for (const sessionId of existingIds) {
            if (!currentIds.has(sessionId)) {
                this.enhancedSessionsCache.delete(sessionId);
            }
        }

        this.notifySessionStateChanged();
    }

    /**
     * Уведомления
     */
    private notifySessionStateChanged(): void {
        const sessions = Array.from(this.enhancedSessionsCache.values());
        this.callbacks.onSessionStateChanged?.(sessions);
    }

    private notifyActiveSessionsChanged(): void {
        const activeSessions = Array.from(this.enhancedSessionsCache.values())
            .filter(session => session.isActive);
        this.callbacks.onActiveSessionsChanged?.(activeSessions);
    }

    /**
     * Public API - Проксирование методов базового провайдера
     */

    /**
     * Создает новую сессию
     */
    async createSession(name?: string): Promise<any> {
        return await this.baseProvider.getSessionManager().createSession(name);
    }

    /**
     * Закрывает сессию
     */
    async closeSession(sessionId: string): Promise<void> {
        return await this.baseProvider.getSessionManager().closeSession(sessionId);
    }

    /**
     * Переключается на сессию
     */
    async switchToSession(sessionId: string): Promise<void> {
        return await this.baseProvider.getSessionManager().switchToSession(sessionId);
    }

    /**
     * Отправляет сообщение (с проверкой готовности)
     */
    async sendMessage(sessionId: string, message: string): Promise<boolean> {
        // Проверяем готовность сессии
        if (!this.stateAdapter.canSendMessage(sessionId)) {
            this.outputChannel.appendLine(
                `⚠️ Cannot send message to session ${sessionId.substring(0, 8)}... - not ready`
            );
            return false;
        }

        try {
            await this.baseProvider.getSessionManager().sendMessage(sessionId, message);
            return true;
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error sending message: ${error}`);
            return false;
        }
    }

    /**
     * Enhanced API - Новые методы
     */

    /**
     * Получает расширенные данные сессии
     */
    getEnhancedSession(sessionId: string): EnhancedSessionData | null {
        return this.enhancedSessionsCache.get(sessionId) || null;
    }

    /**
     * Получает все расширенные сессии
     */
    getAllEnhancedSessions(): EnhancedSessionData[] {
        return Array.from(this.enhancedSessionsCache.values());
    }

    /**
     * Получает активные сессии с состояниями
     */
    getActiveEnhancedSessions(): EnhancedSessionData[] {
        return this.stateAdapter.getActiveSessions().map(stateInfo => {
            const sessionManager = this.baseProvider.getSessionManager();
            const baseSession = sessionManager.getSession(stateInfo.sessionId);
            return {
                sessionId: stateInfo.sessionId,
                sessionName: stateInfo.sessionName,
                isActive: baseSession?.id === sessionManager.getActiveSession()?.id || false,
                messageCount: baseSession?.messages.length || 0,
                state: stateInfo.state,
                stateDescription: stateInfo.stateDescription,
                stateEmoji: stateInfo.stateEmoji,
                isReadyForNewRequest: stateInfo.isReadyForNewRequest,
                canSendMessage: this.stateAdapter.canSendMessage(stateInfo.sessionId)
            };
        });
    }

    /**
     * Проверяет готовность сессии к новому сообщению
     */
    isSessionReady(sessionId: string): boolean {
        return this.stateAdapter.canSendMessage(sessionId);
    }

    /**
     * Получает сессии, готовые к отправке сообщений
     */
    getReadySessions(): EnhancedSessionData[] {
        return Array.from(this.enhancedSessionsCache.values())
            .filter(session => session.canSendMessage);
    }

    /**
     * Получает сессии в процессе обработки
     */
    getProcessingSessions(): EnhancedSessionData[] {
        return Array.from(this.enhancedSessionsCache.values())
            .filter(session => 
                session.state === ClaudeCodeState.WORKING
            );
    }

    /**
     * Принудительно устанавливает состояние сессии
     */
    forceSessionState(sessionId: string, state: ClaudeCodeState): void {
        this.stateAdapter.forceSessionState(sessionId, state);
    }

    /**
     * Получает статистику состояний
     */
    getStateStatistics() {
        return this.stateAdapter.getStateStatistics();
    }

    /**
     * Callbacks setup
     */
    onSessionStateChanged(callback: (sessions: EnhancedSessionData[]) => void): void {
        this.callbacks.onSessionStateChanged = callback;
        
        // Сразу вызываем с текущими данными
        const sessions = Array.from(this.enhancedSessionsCache.values());
        callback(sessions);
    }

    onSessionReadinessChanged(callback: (sessionId: string, isReady: boolean) => void): void {
        this.callbacks.onSessionReadinessChanged = callback;
    }

    onActiveSessionsChanged(callback: (activeSessions: EnhancedSessionData[]) => void): void {
        this.callbacks.onActiveSessionsChanged = callback;
        
        // Сразу вызываем с текущими данными
        const activeSessions = Array.from(this.enhancedSessionsCache.values())
            .filter(session => session.isActive);
        callback(activeSessions);
    }

    /**
     * Проксирование событий базового провайдера через session manager
     */
    onSessionsChanged(callback: (sessions: any[]) => void): void {
        const sessionManager = this.baseProvider.getSessionManager();
        sessionManager.onSessionCreated(() => {
            callback(sessionManager.getAllSessions());
        });
        sessionManager.onSessionClosed(() => {
            callback(sessionManager.getAllSessions());
        });
    }

    onActiveSessionChanged(callback: (sessionId: string | null) => void): void {
        const sessionManager = this.baseProvider.getSessionManager();
        sessionManager.onSessionSwitched(callback);
    }

    onSessionStatusChanged(callback: (sessionId: string, status: string) => void): void {
        const sessionManager = this.baseProvider.getSessionManager();
        sessionManager.onSessionStatusChanged(callback);
    }

    onMessageReceived(callback: (sessionId: string, message: any) => void): void {
        const sessionManager = this.baseProvider.getSessionManager();
        sessionManager.onMessageReceived(callback);
    }

    /**
     * Методы для работы с webview
     */
    private getHtmlForWebview(webview: vscode.Webview): string {
        // Получаем HTML из базового провайдера (копируем его логику)
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.extensionUri, 'out', 'webview', 'bundle.js'
        ));
        
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.extensionUri, 'media', 'reset.css'
        ));
        
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.extensionUri, 'media', 'vscode.css'
        ));

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <title>Claude Chat Enhanced</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        height: 100vh;
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    #root {
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
        this.outputChannel.appendLine(`📩 Enhanced Provider received: ${message.command}`);

        // Обрабатываем новые команды для состояний
        switch (message.command) {
            case 'getSessionStates':
                this.sendSessionStatesUpdate();
                break;

            case 'subscribeToProcessingStatus':
                this.subscribeToProcessingStatus(message.sessionId);
                break;

            case 'unsubscribeFromProcessingStatus':
                this.unsubscribeFromProcessingStatus(message.sessionId);
                break;

            case 'getProcessingStatus':
                this.sendProcessingStatus(message.sessionId);
                break;

            case 'interruptProcessing':
                this.interruptProcessing(message.sessionId);
                break;

            default:
                // Проксируем остальные команды к базовому провайдеру
                // Но нужно использовать session manager напрямую
                await this.handleBaseWebviewMessage(message);
                break;
        }
    }

    private async handleBaseWebviewMessage(message: WebviewMessage): Promise<void> {
        const sessionManager = this.baseProvider.getSessionManager();
        
        try {
            switch (message.command) {
                case 'createSession':
                    const session = await sessionManager.createSession(message.name);
                    this.sendWebviewMessage({
                        command: 'sessionCreated',
                        sessionId: session.id,
                        session: {
                            id: session.id,
                            name: session.name,
                            messages: session.messages,
                            status: session.status,
                            createdAt: session.createdAt,
                            lastActiveAt: session.lastActiveAt
                        }
                    });
                    this.sendSessionUpdate();
                    break;

                case 'switchSession':
                    await sessionManager.switchToSession(message.sessionId);
                    this.sendWebviewMessage({
                        command: 'activeSessionChanged',
                        sessionId: message.sessionId
                    });
                    break;

                case 'closeSession':
                    await sessionManager.closeSession(message.sessionId);
                    this.sendSessionUpdate();
                    break;

                case 'sendMessage':
                    await sessionManager.sendMessage(message.sessionId, message.message);
                    break;

                case 'getSessionState':
                    this.sendSessionUpdate();
                    this.sendSessionStatesUpdate();
                    break;

                case 'healthCheck':
                    const healthStatus = await sessionManager.checkSessionHealth();
                    this.sendWebviewMessage({
                        command: 'healthCheckResult',
                        healthStatus: Array.from(healthStatus.entries())
                    });
                    break;

                default:
                    this.outputChannel.appendLine(`⚠️ Unknown command: ${(message as any).command}`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error handling message: ${error}`);
            this.sendWebviewMessage({
                command: 'error',
                message: `Error: ${error}`
            });
        }
    }

    private sendWebviewMessage(message: ExtensionMessage): void {
        if (this.view) {
            this.view.webview.postMessage(message);
        }
    }

    private sendSessionUpdate(): void {
        const sessionManager = this.baseProvider.getSessionManager();
        const sessions = sessionManager.getAllSessions().map(session => ({
            id: session.id,
            name: session.name,
            messages: session.messages,
            status: session.status,
            createdAt: session.createdAt,
            lastActiveAt: session.lastActiveAt
        }));

        this.sendWebviewMessage({
            command: 'sessionsUpdated',
            sessions
        });

        const activeSession = sessionManager.getActiveSession();
        if (activeSession) {
            this.sendWebviewMessage({
                command: 'activeSessionChanged',
                sessionId: activeSession.id
            });
        }
    }

    private sendSessionStatesUpdate(): void {
        this.outputChannel.appendLine(`📡 sendSessionStatesUpdate called, cache size: ${this.enhancedSessionsCache.size}`);
        
        // Конвертируем кэш состояний в формат для передачи (обычный объект)
        const sessionStatesObject: Record<string, SessionStateData> = {};
        
        for (const [sessionId, enhancedData] of this.enhancedSessionsCache.entries()) {
            sessionStatesObject[sessionId] = {
                state: enhancedData.state,
                stateDescription: enhancedData.stateDescription,
                stateEmoji: enhancedData.stateEmoji,
                isReadyForNewRequest: enhancedData.isReadyForNewRequest
            };
            this.outputChannel.appendLine(`📡 Adding session state: ${sessionId} → ${enhancedData.state} (${enhancedData.stateEmoji})`);
        }

        this.outputChannel.appendLine(`📡 Sending sessionStatesUpdated to webview with ${Object.keys(sessionStatesObject).length} session states`);
        
        // Отправляем как обычный объект (сериализуется через JSON)
        this.sendWebviewMessage({
            command: 'sessionStatesUpdated',
            sessionStates: sessionStatesObject
        });
        
        this.outputChannel.appendLine(`✅ sessionStatesUpdated sent successfully`);
    }

    // ProcessingStatusManager integration methods
    private subscribeToProcessingStatus(sessionId: string): void {
        const sessionManager = this.baseProvider.getSessionManager();
        const processingManager = sessionManager.getProcessingStatusManager();
        
        processingManager.onStatusUpdate(sessionId, (processingSession) => {
            this.sendWebviewMessage({
                command: 'processingStatusUpdate',
                sessionId,
                processingSession
            });
        });
        
        this.outputChannel.appendLine(`📊 Subscribed to processing status for session: ${sessionId}`);
    }

    private unsubscribeFromProcessingStatus(sessionId: string): void {
        const sessionManager = this.baseProvider.getSessionManager();
        const processingManager = sessionManager.getProcessingStatusManager();
        
        processingManager.offStatusUpdate(sessionId);
        this.outputChannel.appendLine(`📊 Unsubscribed from processing status for session: ${sessionId}`);
    }

    private sendProcessingStatus(sessionId: string): void {
        const sessionManager = this.baseProvider.getSessionManager();
        const processingManager = sessionManager.getProcessingStatusManager();
        const processingSession = processingManager.getProcessingStatus(sessionId);
        
        this.sendWebviewMessage({
            command: 'processingStatusResponse',
            sessionId,
            processingSession
        });
        
        this.outputChannel.appendLine(`📊 Sent processing status for session: ${sessionId}`);
    }

    private interruptProcessing(sessionId: string): void {
        const sessionManager = this.baseProvider.getSessionManager();
        const processingManager = sessionManager.getProcessingStatusManager();
        
        processingManager.interruptProcessing(sessionId);
        this.outputChannel.appendLine(`📊 Interrupted processing for session: ${sessionId}`);
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Получение базового провайдера для совместимости
     */
    getBaseProvider(): MultiSessionProvider {
        return this.baseProvider;
    }

    /**
     * Получение адаптера состояний
     */
    getStateAdapter(): DualSessionStateAdapter {
        return this.stateAdapter;
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        this.stateAdapter.dispose();
        this.baseProvider.dispose();
        this.enhancedSessionsCache.clear();
        this.callbacks = {};
        
        this.outputChannel.appendLine(`🚀 EnhancedMultiSessionProvider disposed`);
    }
}