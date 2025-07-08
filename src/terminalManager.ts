import * as vscode from 'vscode';
import { TerminalStatus, ErrorCode } from './types';

/**
 * Terminal selection strategy
 */
export enum TerminalSelectionStrategy {
    ACTIVE = 'active',
    CLAUDE_CLI = 'claude_cli',
    MOST_RECENT = 'most_recent',
    BY_NAME = 'by_name'
}

/**
 * Terminal health status
 */
export interface TerminalHealth {
    isHealthy: boolean;
    lastActivity?: number;
    responseTime?: number;
    issues: string[];
}

/**
 * Terminal execution result
 */
export interface TerminalExecutionResult {
    success: boolean;
    terminal: vscode.Terminal;
    executionId: string;
    timestamp: number;
    error?: {
        code: ErrorCode;
        message: string;
        details?: any;
    };
}

/**
 * Terminal Manager configuration
 */
export interface TerminalManagerConfig {
    claudeCliDetectionTimeout: number;
    healthCheckInterval: number;
    commandExecutionTimeout: number;
    maxRetryAttempts: number;
    fallbackBehavior: 'create_new' | 'show_error' | 'ask_user';
    preferredTerminalNames: string[];
}

/**
 * Terminal Manager for centralized terminal operations
 */
export class TerminalManager {
    private config: TerminalManagerConfig;
    private terminalHealthCache = new Map<string, TerminalHealth>();
    private lastHealthCheck = 0;
    private claudeCliCache = new Map<string, boolean>();
    private executionCounter = 0;

    constructor(config?: Partial<TerminalManagerConfig>) {
        this.config = {
            claudeCliDetectionTimeout: 5000,
            healthCheckInterval: 30000,
            commandExecutionTimeout: 10000,
            maxRetryAttempts: 3,
            fallbackBehavior: 'ask_user',
            preferredTerminalNames: ['claude', 'claude-cli', 'main', 'terminal'],
            ...config
        };
    }

    /**
     * Get the best available terminal using selection strategy
     */
    async getTerminal(strategy: TerminalSelectionStrategy = TerminalSelectionStrategy.ACTIVE): Promise<vscode.Terminal | null> {
        try {
            switch (strategy) {
                case TerminalSelectionStrategy.ACTIVE:
                    return await this.getActiveTerminal();
                    
                case TerminalSelectionStrategy.CLAUDE_CLI:
                    return await this.getClaudeCliTerminal();
                    
                case TerminalSelectionStrategy.MOST_RECENT:
                    return await this.getMostRecentTerminal();
                    
                case TerminalSelectionStrategy.BY_NAME:
                    return await this.getTerminalByPreferredName();
                    
                default:
                    return await this.getActiveTerminal();
            }
        } catch (error) {
            console.error('Failed to get terminal:', error);
            return null;
        }
    }

    /**
     * Get active terminal with fallback mechanisms
     */
    async getActiveTerminal(): Promise<vscode.Terminal | null> {
        const activeTerminal = vscode.window.activeTerminal;
        
        if (activeTerminal && await this.isTerminalHealthy(activeTerminal)) {
            return activeTerminal;
        }

        // Fallback to other strategies
        console.log('Active terminal not available, trying fallbacks...');
        
        // Try Claude CLI terminal
        const claudeTerminal = await this.getClaudeCliTerminal();
        if (claudeTerminal) {
            return claudeTerminal;
        }

        // Try most recent terminal
        const recentTerminal = await this.getMostRecentTerminal();
        if (recentTerminal) {
            return recentTerminal;
        }

        // Handle fallback behavior
        return await this.handleNoTerminalFallback();
    }

    /**
     * Find terminal with Claude CLI running
     */
    async getClaudeCliTerminal(): Promise<vscode.Terminal | null> {
        const terminals = vscode.window.terminals;
        
        for (const terminal of terminals) {
            if (await this.detectClaudeCli(terminal)) {
                return terminal;
            }
        }
        
        return null;
    }

    /**
     * Get the most recently used terminal
     */
    async getMostRecentTerminal(): Promise<vscode.Terminal | null> {
        const terminals = vscode.window.terminals;
        
        if (terminals.length === 0) {
            return null;
        }

        // For now, return the last terminal in the list
        // In the future, we could track usage timestamps
        const lastTerminal = terminals[terminals.length - 1];
        
        if (await this.isTerminalHealthy(lastTerminal)) {
            return lastTerminal;
        }

        return null;
    }

    /**
     * Get terminal by preferred name
     */
    async getTerminalByPreferredName(): Promise<vscode.Terminal | null> {
        const terminals = vscode.window.terminals;
        
        for (const preferredName of this.config.preferredTerminalNames) {
            const terminal = terminals.find(t => 
                t.name.toLowerCase().includes(preferredName.toLowerCase())
            );
            
            if (terminal && await this.isTerminalHealthy(terminal)) {
                return terminal;
            }
        }
        
        return null;
    }

    /**
     * Execute command in terminal with comprehensive error handling
     */
    async executeCommand(
        command: string, 
        options?: {
            strategy?: TerminalSelectionStrategy;
            addNewLine?: boolean;
            timeout?: number;
            retryAttempts?: number;
        }
    ): Promise<TerminalExecutionResult> {
        const executionId = this.generateExecutionId();
        const timestamp = Date.now();
        const opts = {
            strategy: TerminalSelectionStrategy.ACTIVE,
            addNewLine: true,
            timeout: this.config.commandExecutionTimeout,
            retryAttempts: this.config.maxRetryAttempts,
            ...options
        };

        console.log(`[${executionId}] Executing command: "${command}"`);

        try {
            // Get terminal
            const terminal = await this.getTerminal(opts.strategy);
            
            if (!terminal) {
                return {
                    success: false,
                    terminal: null as any,
                    executionId,
                    timestamp,
                    error: {
                        code: ErrorCode.NO_TERMINAL,
                        message: 'No suitable terminal found',
                        details: { strategy: opts.strategy }
                    }
                };
            }

            // Validate command
            if (!command || command.trim().length === 0) {
                return {
                    success: false,
                    terminal,
                    executionId,
                    timestamp,
                    error: {
                        code: ErrorCode.MESSAGE_TOO_LONG,
                        message: 'Command cannot be empty',
                        details: { command }
                    }
                };
            }

            // Check terminal health before execution
            if (!await this.isTerminalHealthy(terminal)) {
                return {
                    success: false,
                    terminal,
                    executionId,
                    timestamp,
                    error: {
                        code: ErrorCode.TERMINAL_BUSY,
                        message: 'Terminal is not healthy',
                        details: { terminalName: terminal.name }
                    }
                };
            }

            // Execute command
            console.log(`[${executionId}] Calling executeWithRetry with addNewLine=${opts.addNewLine}`);
            await this.executeWithRetry(terminal, command, opts.addNewLine, opts.retryAttempts);

            console.log(`[${executionId}] Command executed successfully`);
            
            return {
                success: true,
                terminal,
                executionId,
                timestamp
            };

        } catch (error) {
            console.error(`[${executionId}] Command execution failed:`, error);
            
            return {
                success: false,
                terminal: null as any,
                executionId,
                timestamp,
                error: {
                    code: ErrorCode.COMMUNICATION_ERROR,
                    message: 'Command execution failed',
                    details: error
                }
            };
        }
    }

    /**
     * Execute command with retry mechanism
     */
    private async executeWithRetry(
        terminal: vscode.Terminal, 
        command: string, 
        addNewLine: boolean, 
        maxRetries: number
    ): Promise<void> {
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Focus terminal to ensure it's active
                terminal.show(true);
                
                // Small delay to ensure terminal is focused
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Execute command
                console.log(`[TERMINAL] About to execute: "${command}" with addNewLine=${addNewLine} in terminal "${terminal.name}"`);
                terminal.sendText(command, addNewLine);
                console.log(`[TERMINAL] ✅ Command sent to terminal successfully!`);
                
                // For Claude CLI, sometimes we need to ensure the message is actually sent
                // Try additional Enter if addNewLine was true
                if (addNewLine) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    console.log(`[TERMINAL] Sending additional Enter to ensure message is sent`);
                    terminal.sendText('', true); // Send empty string with Enter
                }
                
                // Success
                return;
                
            } catch (error) {
                lastError = error as Error;
                console.warn(`Command execution attempt ${attempt + 1} failed:`, error);
                
                if (attempt < maxRetries) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        throw lastError || new Error('Command execution failed after retries');
    }

    /**
     * Check if terminal is healthy and responsive
     */
    async isTerminalHealthy(terminal: vscode.Terminal): Promise<boolean> {
        const terminalId = this.getTerminalId(terminal);
        const now = Date.now();
        
        // Check cache first
        const cached = this.terminalHealthCache.get(terminalId);
        if (cached && (now - this.lastHealthCheck) < this.config.healthCheckInterval) {
            return cached.isHealthy;
        }

        try {
            // Basic checks
            if (!terminal || terminal.exitStatus !== undefined) {
                this.cacheTerminalHealth(terminalId, false, ['Terminal is disposed or exited']);
                return false;
            }

            // Check if terminal has a process ID
            const pid = await terminal.processId;
            if (!pid) {
                this.cacheTerminalHealth(terminalId, false, ['No process ID available']);
                return false;
            }

            // Terminal appears healthy
            this.cacheTerminalHealth(terminalId, true, []);
            this.lastHealthCheck = now;
            return true;

        } catch (error) {
            console.error('Terminal health check failed:', error);
            this.cacheTerminalHealth(terminalId, false, [`Health check error: ${error}`]);
            return false;
        }
    }

    /**
     * Detect if Claude CLI is running in terminal
     */
    async detectClaudeCli(terminal: vscode.Terminal): Promise<boolean> {
        const terminalId = this.getTerminalId(terminal);
        
        // Check cache first
        if (this.claudeCliCache.has(terminalId)) {
            return this.claudeCliCache.get(terminalId)!;
        }

        try {
            // Basic health check
            if (!await this.isTerminalHealthy(terminal)) {
                this.claudeCliCache.set(terminalId, false);
                return false;
            }

            // Multi-level detection strategy
            const detectionResults = await Promise.all([
                this.detectByTerminalName(terminal),
                this.detectByShellPath(terminal),
                this.detectByEnvironment(terminal),
                this.detectByProcess(terminal)
            ]);

            // Claude CLI detected if any method returns true
            const claudeCliDetected = detectionResults.some(result => result);
            
            this.claudeCliCache.set(terminalId, claudeCliDetected);
            console.log(`Claude CLI detection for ${terminal.name}: ${claudeCliDetected}`, detectionResults);
            
            return claudeCliDetected;

        } catch (error) {
            console.error('Claude CLI detection failed:', error);
            this.claudeCliCache.set(terminalId, false);
            return false;
        }
    }

    /**
     * Detect Claude CLI by terminal name
     */
    private async detectByTerminalName(terminal: vscode.Terminal): Promise<boolean> {
        const terminalName = terminal.name.toLowerCase();
        const claudeKeywords = ['claude', 'claude-cli', 'claude-code', 'anthropic'];
        
        const hasClaudeInName = claudeKeywords.some(keyword => terminalName.includes(keyword));
        
        // For MVP: be less strict - if terminal is active and healthy, assume it might have Claude CLI
        if (!hasClaudeInName && terminal === vscode.window.activeTerminal) {
            console.log(`[Detection] Active terminal "${terminal.name}" doesn't contain Claude keywords, but using as fallback`);
            return true; // Assume active terminal might have Claude CLI for better UX
        }
        
        return hasClaudeInName;
    }

    /**
     * Detect Claude CLI by shell path or creation options
     */
    private async detectByShellPath(terminal: vscode.Terminal): Promise<boolean> {
        try {
            const creationOptions = terminal.creationOptions;
            
            if (creationOptions && typeof creationOptions === 'object') {
                // Check shell path
                const shellPath = (creationOptions as any).shellPath;
                if (shellPath && typeof shellPath === 'string') {
                    const path = shellPath.toLowerCase();
                    if (path.includes('claude') || path.includes('anthropic')) {
                        return true;
                    }
                }
                
                // Check environment variables
                const env = (creationOptions as any).env;
                if (env && typeof env === 'object') {
                    const envKeys = Object.keys(env).join(' ').toLowerCase();
                    const envValues = Object.values(env).join(' ').toLowerCase();
                    
                    if (envKeys.includes('claude') || envValues.includes('claude')) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.debug('Shell path detection failed:', error);
            return false;
        }
    }

    /**
     * Detect Claude CLI by environment indicators
     */
    private async detectByEnvironment(terminal: vscode.Terminal): Promise<boolean> {
        try {
            // Check if terminal was created with Claude-specific options
            const creationOptions = terminal.creationOptions;
            
            if (creationOptions && typeof creationOptions === 'object') {
                const name = (creationOptions as any).name;
                const cwd = (creationOptions as any).cwd;
                
                if (name && name.toLowerCase().includes('claude')) {
                    return true;
                }
                
                if (cwd && typeof cwd === 'string' && cwd.toLowerCase().includes('claude')) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.debug('Environment detection failed:', error);
            return false;
        }
    }

    /**
     * Detect Claude CLI by checking running processes (most reliable method)
     */
    private async detectByProcess(terminal: vscode.Terminal): Promise<boolean> {
        try {
            const pid = await terminal.processId;
            if (!pid) {
                return false;
            }

            // Use a simple heuristic: if terminal is actively being used for Claude CLI,
            // it likely contains "claude" in the command line or window title
            // For now, we'll rely on the combination of other detection methods
            // and add process-based detection as future enhancement
            
            return false;
        } catch (error) {
            console.debug('Process detection failed:', error);
            return false;
        }
    }

    /**
     * Enhanced Claude CLI detection with interactive prompt method
     */
    async detectClaudeCliInteractive(terminal: vscode.Terminal): Promise<boolean> {
        try {
            // First, try standard detection methods
            const standardDetection = await this.detectClaudeCli(terminal);
            if (standardDetection) {
                return true;
            }

            // If standard detection fails, try a more direct approach
            // Send a harmless command that Claude CLI would recognize
            // This is more intrusive but more accurate
            
            console.log(`Attempting interactive Claude CLI detection in terminal: ${terminal.name}`);
            
            // Focus the terminal first
            terminal.show(true);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Send a Claude CLI status command (if Claude CLI is running, it will respond appropriately)
            // If not running, it will just show "command not found" or similar
            terminal.sendText('/help', false); // Send without pressing Enter
            
            // We can't easily capture the output, so we'll rely on user confirmation
            // or implement a more sophisticated detection later
            
            return false; // For now, return false as this needs user interaction
        } catch (error) {
            console.error('Interactive Claude CLI detection failed:', error);
            return false;
        }
    }

    /**
     * Get comprehensive terminal status
     */
    async getTerminalStatus(strategy: TerminalSelectionStrategy = TerminalSelectionStrategy.ACTIVE): Promise<TerminalStatus> {
        try {
            const terminal = await this.getTerminal(strategy);
            
            if (!terminal) {
                return {
                    hasActiveTerminal: false,
                    claudeCliDetected: false
                };
            }

            const [claudeCliDetected, pid] = await Promise.all([
                this.detectClaudeCli(terminal),
                terminal.processId
            ]);

            return {
                hasActiveTerminal: true,
                terminalName: terminal.name,
                claudeCliDetected,
                pid
            };

        } catch (error) {
            console.error('Failed to get terminal status:', error);
            return {
                hasActiveTerminal: false,
                claudeCliDetected: false
            };
        }
    }

    /**
     * Handle fallback when no terminal is available
     */
    private async handleNoTerminalFallback(): Promise<vscode.Terminal | null> {
        switch (this.config.fallbackBehavior) {
            case 'create_new':
                console.log('Creating new terminal as fallback');
                return vscode.window.createTerminal('Claude Chat Terminal');
                
            case 'show_error':
                vscode.window.showErrorMessage('No terminal available. Please open a terminal.');
                return null;
                
            case 'ask_user':
                const action = await vscode.window.showWarningMessage(
                    'No terminal available. What would you like to do?',
                    'Create New Terminal',
                    'Cancel'
                );
                
                if (action === 'Create New Terminal') {
                    return vscode.window.createTerminal('Claude Chat Terminal');
                }
                return null;
                
            default:
                return null;
        }
    }

    /**
     * Cache terminal health status
     */
    private cacheTerminalHealth(terminalId: string, isHealthy: boolean, issues: string[]): void {
        this.terminalHealthCache.set(terminalId, {
            isHealthy,
            lastActivity: Date.now(),
            issues
        });
    }

    /**
     * Get unique terminal identifier
     */
    private getTerminalId(terminal: vscode.Terminal): string {
        return `${terminal.name}-${terminal.creationOptions?.name || 'unknown'}`;
    }

    /**
     * Generate unique execution ID
     */
    private generateExecutionId(): string {
        return `exec_${Date.now()}_${++this.executionCounter}`;
    }

    /**
     * Send message to Claude CLI in terminal
     * This is the main method for the extension's core functionality
     */
    async sendMessageToClaudeCli(message: string): Promise<TerminalExecutionResult> {
        const executionId = this.generateExecutionId();
        console.log(`[${executionId}] Sending message to Claude CLI: "${message}"`);
        console.log(`[${executionId}] Starting Claude CLI message send process...`);

        try {
            // Find terminal with Claude CLI
            console.log(`[${executionId}] Looking for Claude CLI terminal...`);
            const claudeTerminal = await this.getClaudeCliTerminal();
            console.log(`[${executionId}] Claude CLI terminal search result: ${claudeTerminal ? claudeTerminal.name : 'not found'}`);
            
            if (!claudeTerminal) {
                // Try active terminal as fallback
                const activeTerminal = await this.getActiveTerminal();
                
                if (!activeTerminal) {
                    return {
                        success: false,
                        terminal: null as any,
                        executionId,
                        timestamp: Date.now(),
                        error: {
                            code: ErrorCode.NO_TERMINAL,
                            message: 'No terminal with Claude CLI found and no active terminal available',
                            details: { message }
                        }
                    };
                }

                // For MVP: automatically use active terminal without asking
                // This improves UX - user expects messages to be sent when they click send
                console.log(`[${executionId}] Claude CLI not detected, using active terminal: ${activeTerminal.name}`);

                // Use active terminal
                return await this.executeCommand(message, {
                    strategy: TerminalSelectionStrategy.ACTIVE,
                    addNewLine: true
                });
            }

            // Send message to Claude CLI terminal
            return await this.executeCommand(message, {
                strategy: TerminalSelectionStrategy.CLAUDE_CLI,
                addNewLine: true
            });

        } catch (error) {
            console.error(`[${executionId}] Failed to send message to Claude CLI:`, error);
            
            return {
                success: false,
                terminal: null as any,
                executionId,
                timestamp: Date.now(),
                error: {
                    code: ErrorCode.COMMUNICATION_ERROR,
                    message: 'Failed to send message to Claude CLI',
                    details: error
                }
            };
        }
    }

    /**
     * Get Claude CLI version and status information
     */
    async getClaudeCliVersion(): Promise<{ version?: string; detected: boolean; terminal?: vscode.Terminal }> {
        try {
            const claudeTerminal = await this.getClaudeCliTerminal();
            
            if (!claudeTerminal) {
                return { detected: false };
            }

            // For now, we can't easily capture command output in VS Code
            // So we'll just return detection status
            return {
                detected: true,
                terminal: claudeTerminal,
                version: 'detected' // Placeholder - would need more sophisticated detection
            };

        } catch (error) {
            console.error('Failed to get Claude CLI version:', error);
            return { detected: false };
        }
    }

    /**
     * Clear caches (useful for testing or when terminal state changes)
     */
    clearCaches(): void {
        this.terminalHealthCache.clear();
        this.claudeCliCache.clear();
        this.lastHealthCheck = 0;
    }

    /**
     * Get all available terminals with their status
     */
    async getAllTerminalsStatus(): Promise<Array<{ terminal: vscode.Terminal; status: TerminalStatus; health: TerminalHealth }>> {
        const terminals = vscode.window.terminals;
        const results = [];

        for (const terminal of terminals) {
            try {
                const [health, claudeCliDetected, pid] = await Promise.all([
                    this.isTerminalHealthy(terminal).then(isHealthy => ({ 
                        isHealthy, 
                        lastActivity: Date.now(), 
                        issues: [] 
                    })),
                    this.detectClaudeCli(terminal),
                    terminal.processId
                ]);

                const status: TerminalStatus = {
                    hasActiveTerminal: health.isHealthy,
                    terminalName: terminal.name,
                    claudeCliDetected,
                    pid
                };

                results.push({ terminal, status, health });
            } catch (error) {
                console.error(`Failed to get status for terminal ${terminal.name}:`, error);
            }
        }

        return results;
    }
}