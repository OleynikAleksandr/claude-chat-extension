import * as vscode from 'vscode';
import { TerminalManager } from '../terminalManager';
import { ClaudeProcessManager, ClaudeProcess } from './ClaudeProcessManager';
import { StreamJsonParser } from './StreamJsonParser';
import { MessageTypeHandler, ProcessedMessage } from './MessageTypeHandler';
import { RealTimeResponse, BidirectionalSessionInfo } from '../types';

export interface BidirectionalOptions {
    useProcess?: boolean;
    enableRealTime?: boolean;
    sessionId?: string;
    messageFiltering?: {
        filterThinking?: boolean;
        filterToolUse?: boolean;
        filterSystemMessages?: boolean;
    };
}

export class EnhancedTerminalManager extends TerminalManager {
    private claudeProcessManager = new ClaudeProcessManager();
    private streamParser = new StreamJsonParser();
    private messageHandler = new MessageTypeHandler();
    private activeSessions = new Map<string, BidirectionalSessionInfo>();
    private messageListeners: Array<(message: ProcessedMessage) => void> = [];

    constructor(config?: any) {
        super(config);
        this.initializeRealTimeFeatures();
    }

    private initializeRealTimeFeatures(): void {
        this.streamParser.addCallback((jsonData) => {
            const processed = this.messageHandler.processJsonStreamData(jsonData);
            if (processed) {
                this.notifyMessageListeners(processed);
            }
        });
    }

    async sendMessageBidirectional(
        message: string, 
        options: BidirectionalOptions = {}
    ): Promise<RealTimeResponse> {
        const executionId = this.generateEnhancedExecutionId();
        const sessionId = options.sessionId || this.generateSessionId();
        
        console.log(`[${executionId}] Starting bidirectional communication`);

        if (options.messageFiltering) {
            this.messageHandler.updateOptions(options.messageFiltering);
        }

        try {
            if (options.useProcess && options.enableRealTime) {
                return await this.sendViaProcess(message, sessionId, executionId, options);
            } else {
                return await this.sendViaTerminalFallback(message, sessionId, executionId);
            }
        } catch (error) {
            console.error(`[${executionId}] Bidirectional communication failed:`, error);
            throw error;
        }
    }

    private async sendViaProcess(
        message: string, 
        sessionId: string, 
        executionId: string,
        _options: BidirectionalOptions
    ): Promise<RealTimeResponse> {
        console.log(`[${executionId}] Using process-based communication`);

        const workingDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        let claudeProcess: ClaudeProcess;
        
        const existingSession = this.activeSessions.get(sessionId);
        if (existingSession?.isActive) {
            claudeProcess = this.claudeProcessManager.getActiveProcess(sessionId)!;
        } else {
            claudeProcess = this.claudeProcessManager.spawnClaudeProcess(message, {
                sessionId,
                workingDirectory: workingDir,
                resumeSession: !!existingSession
            });

            this.registerSession(sessionId, claudeProcess);
        }

        return new Promise((resolve, reject) => {
            let hasResponded = false;
            const timeout = setTimeout(() => {
                if (!hasResponded) {
                    hasResponded = true;
                    reject(new Error('Process communication timeout'));
                }
            }, 30000);

            claudeProcess.onData((data) => {
                this.streamParser.handleStreamData(data, (jsonData) => {
                    const processed = this.messageHandler.processJsonStreamData(jsonData, sessionId);
                    
                    if (processed && processed.type === 'text' && !hasResponded) {
                        hasResponded = true;
                        clearTimeout(timeout);
                        
                        this.updateSessionStats(sessionId);
                        
                        resolve({
                            success: true,
                            message: processed,
                            sessionId,
                            executionId
                        });
                    }
                });
            });

            claudeProcess.onError((error) => {
                if (!hasResponded) {
                    hasResponded = true;
                    clearTimeout(timeout);
                    reject(error);
                }
            });

            claudeProcess.onClose((code) => {
                if (!hasResponded) {
                    hasResponded = true;
                    clearTimeout(timeout);
                    this.removeSession(sessionId);
                    reject(new Error(`Process closed with code: ${code}`));
                }
            });

            if (!existingSession?.isActive) {
                claudeProcess.sendMessage(message);
            }
        });
    }

    private async sendViaTerminalFallback(
        message: string, 
        sessionId: string, 
        executionId: string
    ): Promise<RealTimeResponse> {
        console.log(`[${executionId}] Using terminal fallback`);

        const result = await this.sendMessageToClaudeCli(message);
        
        if (!result.success) {
            throw new Error(result.error?.message || 'Terminal communication failed');
        }

        const processedMessage: ProcessedMessage = {
            type: 'text',
            data: 'Message sent via terminal (no real-time response)',
            timestamp: Date.now(),
            sessionId,
            metadata: {
                messageId: executionId,
                role: 'system',
                contentType: 'fallback'
            }
        };

        return {
            success: true,
            message: processedMessage,
            sessionId,
            executionId
        };
    }

    private registerSession(sessionId: string, claudeProcess: ClaudeProcess): void {
        const sessionInfo: BidirectionalSessionInfo = {
            sessionId,
            isActive: true,
            processId: claudeProcess.process.pid,
            startTime: Date.now(),
            messageCount: 0,
            mode: 'process'
        };

        this.activeSessions.set(sessionId, sessionInfo);
        console.log(`Session ${sessionId} registered`);
    }

    private updateSessionStats(sessionId: string): void {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.messageCount++;
            this.activeSessions.set(sessionId, session);
        }
    }

    private removeSession(sessionId: string): void {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.isActive = false;
            this.activeSessions.delete(sessionId);
            console.log(`Session ${sessionId} removed`);
        }
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateEnhancedExecutionId(): string {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    addMessageListener(listener: (message: ProcessedMessage) => void): void {
        this.messageListeners.push(listener);
    }

    removeMessageListener(listener: (message: ProcessedMessage) => void): void {
        const index = this.messageListeners.indexOf(listener);
        if (index !== -1) {
            this.messageListeners.splice(index, 1);
        }
    }

    private notifyMessageListeners(message: ProcessedMessage): void {
        for (const listener of this.messageListeners) {
            try {
                listener(message);
            } catch (error) {
                console.error('Message listener error:', error);
            }
        }
    }

    getActiveSessions(): BidirectionalSessionInfo[] {
        return Array.from(this.activeSessions.values());
    }

    getSessionInfo(sessionId: string): BidirectionalSessionInfo | undefined {
        return this.activeSessions.get(sessionId);
    }

    async killSession(sessionId: string): Promise<boolean> {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            const success = this.claudeProcessManager.killProcess(sessionId);
            if (success) {
                this.removeSession(sessionId);
            }
            return success;
        }
        return false;
    }

    async isRealTimeModeAvailable(): Promise<boolean> {
        return await this.claudeProcessManager.isClaudeCliAvailable();
    }

    setMessageFiltering(
        filterThinking: boolean = false,
        filterToolUse: boolean = false,
        filterSystemMessages: boolean = true
    ): void {
        this.messageHandler.updateOptions({
            filterThinking,
            filterToolUse,
            filterSystemMessages
        });
    }

    getMessageHandlerStats(): { filtered: number; processed: number } {
        return this.messageHandler.getFilterStats();
    }

    async dispose(): Promise<void> {
        console.log('Disposing EnhancedTerminalManager...');
        
        this.messageListeners = [];
        
        for (const sessionId of this.activeSessions.keys()) {
            await this.killSession(sessionId);
        }
        
        this.streamParser.dispose();
        this.claudeProcessManager.dispose();
        
        console.log('EnhancedTerminalManager disposed');
    }
}