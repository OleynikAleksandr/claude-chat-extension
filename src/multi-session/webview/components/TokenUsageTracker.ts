/**
 * TokenUsageTracker
 * BA;568205B 8A?>;L7>20=85 B>:5=>2 8 tool calls 87 JSONL ;>3>2
 */

// TokenUsage interface вынесен локально для избежания импорта .tsx файла
export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
    totalCost?: number;
}

export interface ProcessingSession {
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    state: 'working' | 'ready' | 'interrupted';
    tokenUsage: TokenUsage;
    toolCallsCount: number;
    lastActivity: Date;
}

export interface JsonlEntry {
    type: 'user' | 'assistant';
    timestamp: string;
    sessionId: string;
    message?: {
        id: string;
        role: 'user' | 'assistant';
        content: any[];
        usage?: {
            input_tokens: number;
            output_tokens: number;
            cache_creation_input_tokens?: number;
            cache_read_input_tokens?: number;
        };
        model?: string;
    };
}

export class TokenUsageTracker {
    private sessions: Map<string, ProcessingSession> = new Map();
    private callbacks: Map<string, (session: ProcessingSession) => void> = new Map();

    /**
     * 0G8=05B >BA;56820=85 =>2>9 A5AA88
     */
    startSession(sessionId: string, _messageId: string): void {
        const session: ProcessingSession = {
            sessionId,
            startTime: new Date(),
            state: 'working',
            tokenUsage: {
                inputTokens: 0,
                outputTokens: 0,
                cacheCreationTokens: 0,
                cacheReadTokens: 0,
                totalCost: 0
            },
            toolCallsCount: 0,
            lastActivity: new Date()
        };

        this.sessions.set(sessionId, session);
        this.notifyUpdate(sessionId);
    }

    /**
     * 1@010BK205B JSONL 70?8AL
     */
    processJsonlEntry(entry: JsonlEntry): void {
        const session = this.sessions.get(entry.sessionId);
        if (!session || session.state !== 'working') return;

        // 1=>2;O5< 2@5<O ?>A;54=59 0:B82=>AB8
        session.lastActivity = new Date(entry.timestamp);

        // 1@010BK205< B>:5=K
        if (entry.message?.usage) {
            this.updateTokenUsage(session, entry.message.usage);
        }

        // 1@010BK205< tool calls
        if (entry.type === 'assistant' && entry.message?.content) {
            this.processToolCalls(session, entry.message.content);
        }

        this.notifyUpdate(entry.sessionId);
    }

    /**
     * 1=>2;O5B 8A?>;L7>20=85 B>:5=>2
     */
    private updateTokenUsage(session: ProcessingSession, usage: any): void {
        session.tokenUsage.inputTokens += usage.input_tokens || 0;
        session.tokenUsage.outputTokens += usage.output_tokens || 0;
        session.tokenUsage.cacheCreationTokens += usage.cache_creation_input_tokens || 0;
        session.tokenUsage.cacheReadTokens += usage.cache_read_input_tokens || 0;

        //  0AAG8BK205< ?@8<5@=CN AB>8<>ABL (F5=K =0 Claude Sonnet)
        const inputCost = (session.tokenUsage.inputTokens * 0.000003); // $0.003 per 1K input tokens
        const outputCost = (session.tokenUsage.outputTokens * 0.000015); // $0.015 per 1K output tokens
        const cacheCost = ((session.tokenUsage.cacheCreationTokens || 0) * 0.000003); // Cache creation cost
        
        session.tokenUsage.totalCost = inputCost + outputCost + cacheCost;
    }

    /**
     * 1@010BK205B tool calls 87 content
     */
    private processToolCalls(session: ProcessingSession, content: any[]): void {
        for (const item of content) {
            if (item.type === 'tool_use') {
                session.toolCallsCount++;
            }
        }
    }

    /**
     * B<5G05B A5AA8N :0: 7025@H5==CN
     */
    completeSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.state = 'ready';
        session.endTime = new Date();
        this.notifyUpdate(sessionId);

        // 2B><0B8G5A:8 C40;O5< A5AA8N G5@57 5 A5:C=4
        setTimeout(() => {
            this.removeSession(sessionId);
        }, 5000);
    }

    /**
     * @5@K205B A5AA8N
     */
    interruptSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.state = 'interrupted';
        session.endTime = new Date();
        this.notifyUpdate(sessionId);

        // 2B><0B8G5A:8 C40;O5< A5AA8N G5@57 3 A5:C=4K
        setTimeout(() => {
            this.removeSession(sessionId);
        }, 3000);
    }

    /**
     * #40;O5B A5AA8N
     */
    removeSession(sessionId: string): void {
        this.sessions.delete(sessionId);
        this.callbacks.delete(sessionId);
    }

    /**
     * >;CG05B B5:CICN A5AA8N
     */
    getSession(sessionId: string): ProcessingSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * >;CG05B 2A5 0:B82=K5 A5AA88
     */
    getAllSessions(): ProcessingSession[] {
        return Array.from(this.sessions.values());
    }

    /**
     * @>25@O5B, 5ABL ;8 0:B82=K5 A5AA88
     */
    hasActiveSessions(): boolean {
        return Array.from(this.sessions.values()).some(s => s.state === 'working');
    }

    /**
     * >4?8A:0 =0 >1=>2;5=8O A5AA88
     */
    onSessionUpdate(sessionId: string, callback: (session: ProcessingSession) => void): void {
        this.callbacks.set(sessionId, callback);
    }

    /**
     * B?8A:0 >B >1=>2;5=89
     */
    offSessionUpdate(sessionId: string): void {
        this.callbacks.delete(sessionId);
    }

    /**
     * #254><;O5B >1 >1=>2;5=88 A5AA88
     */
    private notifyUpdate(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        const callback = this.callbacks.get(sessionId);
        
        if (session && callback) {
            callback(session);
        }
    }

    /**
     * @>25@O5B 0:B82=>ABL A5AA89 8 7025@H05B =50:B82=K5
     */
    checkInactiveSessions(): void {
        const now = Date.now();
        const timeoutMs = 5000; // 5 A5:C=4 157 0:B82=>AB8

        for (const [sessionId, session] of this.sessions) {
            if (session.state === 'working') {
                const timeSinceActivity = now - session.lastActivity.getTime();
                if (timeSinceActivity > timeoutMs) {
                    this.completeSession(sessionId);
                }
            }
        }
    }

    /**
     * 0?CA:05B ?5@8>48G5A:CN ?@>25@:C =50:B82=KE A5AA89
     */
    startInactivityCheck(): void {
        setInterval(() => {
            this.checkInactiveSessions();
        }, 1000); // @>25@O5< :064CN A5:C=4C
    }

    /**
     * G8I05B 2A5 A5AA88
     */
    dispose(): void {
        this.sessions.clear();
        this.callbacks.clear();
    }
}