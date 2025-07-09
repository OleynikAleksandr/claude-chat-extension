/**
 * ProcessingStatusManager
 * >>@48=8@C5B >BA;56820=85 A>AB>O=89 >1@01>B:8 <564C :><?>=5=B0<8
 */

import { TokenUsageTracker, ProcessingSession, JsonlEntry } from './TokenUsageTracker';

export interface ProcessingStatusManagerConfig {
    inactivityTimeoutMs: number;
    autoCompleteTimeoutMs: number;
    checkIntervalMs: number;
}

export class ProcessingStatusManager {
    private tokenTracker: TokenUsageTracker;
    private config: ProcessingStatusManagerConfig;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(config?: Partial<ProcessingStatusManagerConfig>) {
        this.config = {
            inactivityTimeoutMs: 15000,  // 15 секунд без активности (увеличено для многочастных ответов)
            autoCompleteTimeoutMs: 12000, // 12 секунд для автозавершения (увеличено)
            checkIntervalMs: 1000,      // @>25@:0 :064CN A5:C=4C
            ...config
        };

        this.tokenTracker = new TokenUsageTracker();
        this.startPeriodicCheck();
    }

    /**
     * 0G8=05B >BA;56820=85 =>2>9 A5AA88 >1@01>B:8
     */
    startProcessing(sessionId: string, messageId: string): void {
        this.tokenTracker.startSession(sessionId, messageId);
        console.log(`=� Started processing tracking for session ${sessionId.substring(0, 8)}...`);
    }

    /**
     * AB0=02;8205B >BA;56820=85 (7025@H05B A5AA8N)
     */
    stopProcessing(sessionId: string): void {
        this.tokenTracker.completeSession(sessionId);
        console.log(` Completed processing tracking for session ${sessionId.substring(0, 8)}...`);
    }

    /**
     * @5@K205B >1@01>B:C
     */
    interruptProcessing(sessionId: string): void {
        this.tokenTracker.interruptSession(sessionId);
        console.log(`� Interrupted processing for session ${sessionId.substring(0, 8)}...`);
    }

    /**
     * 1@010BK205B JSONL 70?8AL
     */
    processJsonlEntry(entry: JsonlEntry): void {
        this.tokenTracker.processJsonlEntry(entry);
    }

    /**
     * >;CG05B B5:CI89 AB0BCA A5AA88
     */
    getProcessingStatus(sessionId: string): ProcessingSession | undefined {
        return this.tokenTracker.getSession(sessionId);
    }

    /**
     * @>25@O5B, 5ABL ;8 0:B82=K5 A5AA88
     */
    hasActiveProcessing(): boolean {
        return this.tokenTracker.hasActiveSessions();
    }

    /**
     * >4?8A:0 =0 >1=>2;5=8O AB0BCA0
     */
    onStatusUpdate(sessionId: string, callback: (session: ProcessingSession) => void): void {
        this.tokenTracker.onSessionUpdate(sessionId, callback);
    }

    /**
     * B?8A:0 >B >1=>2;5=89
     */
    offStatusUpdate(sessionId: string): void {
        this.tokenTracker.offSessionUpdate(sessionId);
    }

    /**
     * ?@545;O5B, 4>;6=0 ;8 A5AA8O 7025@H8BLAO 02B><0B8G5A:8
     */
    private shouldAutoComplete(session: ProcessingSession): boolean {
        const now = Date.now();
        const timeSinceActivity = now - session.lastActivity.getTime();
        
        // A;8 =5B 0:B82=>AB8 1>;LH5 7040==>3> 2@5<5=8
        if (timeSinceActivity > this.config.inactivityTimeoutMs) {
            return true;
        }

        // A;8 5ABL B>:5=K, => =5B tool calls 8 ?@>H;> 2@5<O
        if (session.tokenUsage.outputTokens > 0 && 
            session.toolCallsCount === 0 && 
            timeSinceActivity > this.config.autoCompleteTimeoutMs) {
            return true;
        }

        return false;
    }

    /**
     * 5@8>48G5A:0O ?@>25@:0 A>AB>O=89
     */
    private startPeriodicCheck(): void {
        this.checkInterval = setInterval(() => {
            this.checkProcessingSessions();
        }, this.config.checkIntervalMs);
    }

    /**
     * @>25@O5B 2A5 0:B82=K5 A5AA88
     */
    private checkProcessingSessions(): void {
        const sessions = this.tokenTracker.getAllSessions();
        
        for (const session of sessions) {
            if (session.state === 'working' && this.shouldAutoComplete(session)) {
                this.stopProcessing(session.sessionId);
            }
        }
    }

    /**
     * >;CG05B AB0B8AB8:C ?> 2A5< A5AA8O<
     */
    getStatistics(): {
        totalSessions: number;
        activeSessions: number;
        completedSessions: number;
        totalTokensUsed: number;
        totalCost: number;
    } {
        const sessions = this.tokenTracker.getAllSessions();
        
        return {
            totalSessions: sessions.length,
            activeSessions: sessions.filter(s => s.state === 'working').length,
            completedSessions: sessions.filter(s => s.state === 'ready').length,
            totalTokensUsed: sessions.reduce((sum, s) => sum + s.tokenUsage.inputTokens + s.tokenUsage.outputTokens, 0),
            totalCost: sessions.reduce((sum, s) => sum + (s.tokenUsage.totalCost || 0), 0)
        };
    }

    /**
     * G8I05B 2A5 40==K5
     */
    dispose(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        this.tokenTracker.dispose();
        console.log('>� ProcessingStatusManager disposed');
    }
}