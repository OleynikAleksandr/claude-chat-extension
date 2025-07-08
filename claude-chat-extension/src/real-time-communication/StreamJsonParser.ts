export interface StreamJsonCallback {
    (jsonData: any): void;
}

export interface StreamParserOptions {
    logFailedParsing?: boolean;
    bufferTimeout?: number;
    maxLineLength?: number;
}

export class StreamJsonParser {
    private rawOutput = '';
    private options: StreamParserOptions;
    private bufferTimer?: NodeJS.Timeout;
    private callbacks: StreamJsonCallback[] = [];

    constructor(options: StreamParserOptions = {}) {
        this.options = {
            logFailedParsing: true,
            bufferTimeout: 1000,
            maxLineLength: 100000,
            ...options
        };
    }

    handleStreamData(data: Buffer, callback?: StreamJsonCallback): void {
        if (callback) {
            this.callbacks.push(callback);
        }

        const newData = data.toString('utf8');
        this.rawOutput += newData;

        if (this.options.maxLineLength && this.rawOutput.length > this.options.maxLineLength!) {
            console.warn('StreamJsonParser: Buffer size exceeded, truncating');
            this.rawOutput = this.rawOutput.slice(-this.options.maxLineLength! / 2);
        }

        this.processBufferedData();

        if (this.options.bufferTimeout) {
            this.scheduleBufferFlush();
        }
    }

    private processBufferedData(): void {
        const lines = this.rawOutput.split('\n');
        this.rawOutput = lines.pop() || '';

        for (const line of lines) {
            this.processLine(line);
        }
    }

    private processLine(line: string): void {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
            return;
        }

        try {
            const jsonData = JSON.parse(trimmedLine);
            this.emitJsonData(jsonData);
        } catch (error) {
            if (this.options.logFailedParsing) {
                console.log('StreamJsonParser: Failed to parse JSON line:', {
                    line: trimmedLine.substring(0, 200),
                    error: error instanceof Error ? error.message : error
                });
            }

            this.tryPartialJsonRecovery(trimmedLine);
        }
    }

    private tryPartialJsonRecovery(line: string): void {
        const jsonStartIndex = line.indexOf('{');
        const jsonEndIndex = line.lastIndexOf('}');

        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonStartIndex < jsonEndIndex) {
            const possibleJson = line.substring(jsonStartIndex, jsonEndIndex + 1);
            
            try {
                const jsonData = JSON.parse(possibleJson);
                this.emitJsonData(jsonData);
            } catch (recoveryError) {
                if (this.options.logFailedParsing) {
                    console.log('StreamJsonParser: JSON recovery also failed:', possibleJson.substring(0, 100));
                }
            }
        }
    }

    private scheduleBufferFlush(): void {
        if (this.bufferTimer) {
            clearTimeout(this.bufferTimer);
        }

        this.bufferTimer = setTimeout(() => {
            if (this.rawOutput.trim()) {
                this.processLine(this.rawOutput);
                this.rawOutput = '';
            }
        }, this.options.bufferTimeout);
    }

    private emitJsonData(jsonData: any): void {
        for (const callback of this.callbacks) {
            try {
                callback(jsonData);
            } catch (error) {
                console.error('StreamJsonParser: Callback error:', error);
            }
        }
    }

    addCallback(callback: StreamJsonCallback): void {
        this.callbacks.push(callback);
    }

    removeCallback(callback: StreamJsonCallback): void {
        const index = this.callbacks.indexOf(callback);
        if (index !== -1) {
            this.callbacks.splice(index, 1);
        }
    }

    clearCallbacks(): void {
        this.callbacks = [];
    }

    getBufferedData(): string {
        return this.rawOutput;
    }

    clearBuffer(): void {
        this.rawOutput = '';
        if (this.bufferTimer) {
            clearTimeout(this.bufferTimer);
            this.bufferTimer = undefined;
        }
    }

    dispose(): void {
        this.clearBuffer();
        this.clearCallbacks();
    }
}