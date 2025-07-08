export interface ProcessedMessage {
    type: 'text' | 'thinking' | 'tool_use' | 'result' | 'error' | 'status' | 'unknown';
    data: any;
    timestamp: number;
    sessionId?: string;
    metadata?: {
        messageId?: string;
        role?: string;
        toolName?: string;
        contentType?: string;
        isFiltered?: boolean;
    };
}

export interface MessageHandlerOptions {
    filterThinking?: boolean;
    filterToolUse?: boolean;
    filterSystemMessages?: boolean;
    includeRawData?: boolean;
    logUnknownTypes?: boolean;
}

export class MessageTypeHandler {
    private options: MessageHandlerOptions;
    private messageCounter = 0;

    constructor(options: MessageHandlerOptions = {}) {
        this.options = {
            filterThinking: false,
            filterToolUse: false,
            filterSystemMessages: true,
            includeRawData: false,
            logUnknownTypes: true,
            ...options
        };
    }

    processJsonStreamData(jsonData: any, sessionId?: string): ProcessedMessage | null {
        const timestamp = Date.now();
        const messageId = this.generateMessageId();

        try {
            switch (jsonData.type) {
                case 'assistant':
                    return this.handleAssistantMessage(jsonData, messageId, timestamp, sessionId);
                    
                case 'user':
                    return this.handleUserMessage(jsonData, messageId, timestamp, sessionId);
                    
                case 'result':
                    return this.handleResultMessage(jsonData, messageId, timestamp, sessionId);
                    
                case 'error':
                    return this.handleErrorMessage(jsonData, messageId, timestamp, sessionId);
                    
                case 'status':
                case 'session_start':
                case 'session_end':
                    return this.handleStatusMessage(jsonData, messageId, timestamp, sessionId);
                    
                default:
                    return this.handleUnknownMessage(jsonData, messageId, timestamp, sessionId);
            }
        } catch (error) {
            console.error('MessageTypeHandler: Processing error:', error);
            return {
                type: 'error',
                data: { 
                    error: 'Message processing failed', 
                    details: error instanceof Error ? error.message : error,
                    rawData: this.options.includeRawData ? jsonData : undefined
                },
                timestamp,
                metadata: { messageId }
            };
        }
    }

    private handleAssistantMessage(
        jsonData: any, 
        messageId: string, 
        timestamp: number, 
        sessionId?: string
    ): ProcessedMessage | null {
        if (!jsonData.message || !jsonData.message.content) {
            return null;
        }

        for (const content of jsonData.message.content) {
            if (content.type === 'text') {
                return {
                    type: 'text',
                    data: content.text.trim(),
                    timestamp,
                    sessionId,
                    metadata: {
                        messageId,
                        role: 'assistant',
                        contentType: 'text'
                    }
                };
            } else if (content.type === 'thinking') {
                if (this.options.filterThinking) {
                    return null;
                }
                
                return {
                    type: 'thinking',
                    data: content.thinking.trim(),
                    timestamp,
                    sessionId,
                    metadata: {
                        messageId,
                        role: 'assistant',
                        contentType: 'thinking',
                        isFiltered: false
                    }
                };
            } else if (content.type === 'tool_use') {
                if (this.options.filterToolUse) {
                    return null;
                }
                
                return {
                    type: 'tool_use',
                    data: {
                        toolName: content.name,
                        toolInput: content.input,
                        toolId: content.id
                    },
                    timestamp,
                    sessionId,
                    metadata: {
                        messageId,
                        role: 'assistant',
                        contentType: 'tool_use',
                        toolName: content.name
                    }
                };
            }
        }

        return null;
    }

    private handleUserMessage(
        jsonData: any, 
        messageId: string, 
        timestamp: number, 
        sessionId?: string
    ): ProcessedMessage {
        const userData = jsonData.message?.content || jsonData.content || jsonData.data;
        
        return {
            type: 'text',
            data: typeof userData === 'string' ? userData : JSON.stringify(userData),
            timestamp,
            sessionId,
            metadata: {
                messageId,
                role: 'user',
                contentType: 'text'
            }
        };
    }

    private handleResultMessage(
        jsonData: any, 
        messageId: string, 
        timestamp: number, 
        sessionId?: string
    ): ProcessedMessage {
        return {
            type: 'result',
            data: {
                result: jsonData.result,
                toolName: jsonData.tool_name,
                success: jsonData.success !== false,
                details: jsonData.details
            },
            timestamp,
            sessionId,
            metadata: {
                messageId,
                contentType: 'result',
                toolName: jsonData.tool_name
            }
        };
    }

    private handleErrorMessage(
        jsonData: any, 
        messageId: string, 
        timestamp: number, 
        sessionId?: string
    ): ProcessedMessage {
        return {
            type: 'error',
            data: {
                error: jsonData.error || jsonData.message,
                code: jsonData.code,
                details: jsonData.details,
                severity: jsonData.severity || 'error'
            },
            timestamp,
            sessionId,
            metadata: {
                messageId,
                contentType: 'error'
            }
        };
    }

    private handleStatusMessage(
        jsonData: any, 
        messageId: string, 
        timestamp: number, 
        sessionId?: string
    ): ProcessedMessage | null {
        if (this.options.filterSystemMessages) {
            return null;
        }

        return {
            type: 'status',
            data: {
                status: jsonData.status || jsonData.type,
                message: jsonData.message,
                details: jsonData.details,
                sessionInfo: jsonData.session_info
            },
            timestamp,
            sessionId,
            metadata: {
                messageId,
                contentType: 'status'
            }
        };
    }

    private handleUnknownMessage(
        jsonData: any, 
        messageId: string, 
        timestamp: number, 
        sessionId?: string
    ): ProcessedMessage {
        if (this.options.logUnknownTypes) {
            console.log('MessageTypeHandler: Unknown message type:', {
                type: jsonData.type,
                keys: Object.keys(jsonData),
                sample: JSON.stringify(jsonData).substring(0, 200)
            });
        }

        return {
            type: 'unknown',
            data: this.options.includeRawData ? jsonData : { 
                type: jsonData.type,
                summary: 'Unknown message type'
            },
            timestamp,
            sessionId,
            metadata: {
                messageId,
                contentType: 'unknown'
            }
        };
    }

    updateOptions(newOptions: Partial<MessageHandlerOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    getFilterStats(): { filtered: number; processed: number } {
        return { filtered: 0, processed: this.messageCounter };
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${++this.messageCounter}`;
    }

    isMessageFiltered(messageType: string): boolean {
        switch (messageType) {
            case 'thinking':
                return this.options.filterThinking || false;
            case 'tool_use':
                return this.options.filterToolUse || false;
            case 'status':
            case 'session_start':
            case 'session_end':
                return this.options.filterSystemMessages || false;
            default:
                return false;
        }
    }

    setFilterMode(mode: 'all' | 'text_only' | 'no_system' | 'custom'): void {
        switch (mode) {
            case 'all':
                this.options = {
                    ...this.options,
                    filterThinking: false,
                    filterToolUse: false,
                    filterSystemMessages: false
                };
                break;
            case 'text_only':
                this.options = {
                    ...this.options,
                    filterThinking: true,
                    filterToolUse: true,
                    filterSystemMessages: true
                };
                break;
            case 'no_system':
                this.options = {
                    ...this.options,
                    filterThinking: false,
                    filterToolUse: false,
                    filterSystemMessages: true
                };
                break;
        }
    }
}