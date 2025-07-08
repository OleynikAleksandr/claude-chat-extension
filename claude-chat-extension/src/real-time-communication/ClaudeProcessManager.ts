import * as cp from 'child_process';
import * as vscode from 'vscode';

export interface ClaudeProcessOptions {
    workingDirectory?: string;
    sessionId?: string;
    resumeSession?: boolean;
    wslEnabled?: boolean;
    wslDistro?: string;
}

export interface ClaudeProcess {
    process: cp.ChildProcess;
    sessionId: string;
    isActive: boolean;
    onData: (callback: (data: Buffer) => void) => void;
    onError: (callback: (error: Error) => void) => void;
    onClose: (callback: (code: number | null) => void) => void;
    sendMessage: (message: string) => void;
    kill: () => void;
}

export class ClaudeProcessManager {
    private activeProcesses = new Map<string, ClaudeProcess>();
    private sessionCounter = 0;

    constructor() {}

    spawnClaudeProcess(
        message?: string, 
        options: ClaudeProcessOptions = {}
    ): ClaudeProcess {
        const sessionId = options.sessionId || this.generateSessionId();
        const config = vscode.workspace.getConfiguration('claude-code-bridge');
        
        const args = ['--output-format', 'stream-json'];
        
        if (options.resumeSession && options.sessionId) {
            args.push('--resume', options.sessionId);
        }
        
        if (options.workingDirectory) {
            args.push('--cwd', options.workingDirectory);
        }

        let childProcess: cp.ChildProcess;

        const wslEnabled = options.wslEnabled ?? config.get<boolean>('wsl.enabled', false);
        
        if (wslEnabled) {
            const wslDistro = options.wslDistro ?? config.get<string>('wsl.distro', 'Ubuntu');
            childProcess = cp.spawn('wsl', ['-d', wslDistro, 'claude', ...args], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { 
                    FORCE_COLOR: '0', 
                    NO_COLOR: '1',
                    ...process.env 
                },
                cwd: options.workingDirectory
            });
        } else {
            childProcess = cp.spawn('claude', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { 
                    FORCE_COLOR: '0', 
                    NO_COLOR: '1',
                    ...process.env 
                },
                cwd: options.workingDirectory
            });
        }

        const claudeProcess: ClaudeProcess = {
            process: childProcess,
            sessionId,
            isActive: true,
            
            onData: (callback: (data: Buffer) => void) => {
                childProcess.stdout?.on('data', callback);
            },
            
            onError: (callback: (error: Error) => void) => {
                childProcess.stderr?.on('data', (data) => {
                    callback(new Error(data.toString()));
                });
                childProcess.on('error', callback);
            },
            
            onClose: (callback: (code: number | null) => void) => {
                childProcess.on('close', (code) => {
                    this.activeProcesses.delete(sessionId);
                    claudeProcess.isActive = false;
                    callback(code);
                });
            },
            
            sendMessage: (message: string) => {
                if (childProcess.stdin && claudeProcess.isActive) {
                    childProcess.stdin.write(message + '\n');
                }
            },
            
            kill: () => {
                claudeProcess.isActive = false;
                childProcess.kill();
                this.activeProcesses.delete(sessionId);
            }
        };

        this.activeProcesses.set(sessionId, claudeProcess);

        if (message) {
            claudeProcess.sendMessage(message);
        }

        return claudeProcess;
    }

    getActiveProcess(sessionId: string): ClaudeProcess | undefined {
        return this.activeProcesses.get(sessionId);
    }

    getAllActiveSessions(): string[] {
        return Array.from(this.activeProcesses.keys());
    }

    killProcess(sessionId: string): boolean {
        const process = this.activeProcesses.get(sessionId);
        if (process) {
            process.kill();
            return true;
        }
        return false;
    }

    killAllProcesses(): void {
        for (const process of this.activeProcesses.values()) {
            process.kill();
        }
        this.activeProcesses.clear();
    }

    createSessionProcess(workingDirectory?: string): ClaudeProcess {
        return this.spawnClaudeProcess(undefined, {
            workingDirectory,
            sessionId: this.generateSessionId()
        });
    }

    resumeSession(sessionId: string, workingDirectory?: string): ClaudeProcess {
        const existingProcess = this.getActiveProcess(sessionId);
        if (existingProcess && existingProcess.isActive) {
            return existingProcess;
        }

        return this.spawnClaudeProcess(undefined, {
            sessionId,
            resumeSession: true,
            workingDirectory
        });
    }

    private generateSessionId(): string {
        const timestamp = Date.now();
        const counter = ++this.sessionCounter;
        return `session_${timestamp}_${counter}`;
    }

    isClaudeCliAvailable(): Promise<boolean> {
        return new Promise((resolve) => {
            const testProcess = cp.spawn('claude', ['--version'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            testProcess.on('close', (code) => {
                resolve(code === 0);
            });

            testProcess.on('error', () => {
                resolve(false);
            });

            setTimeout(() => {
                testProcess.kill();
                resolve(false);
            }, 5000);
        });
    }

    dispose(): void {
        this.killAllProcesses();
    }
}