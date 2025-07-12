/**
 * OneShoot Process Session Manager - new architecture with one-time processes
 * Claude Chat Extension v0.10.71
 * 
 * Uses --print and --resume flags for efficient Claude Code communication
 * Based on Claudia application architecture research
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';

export interface OneShootProcessConfig {
  sessionId: string;
  sessionName: string; 
  workingDirectory: string;
  outputChannel: vscode.OutputChannel;
}

export interface ClaudeJsonResponse {
  type: 'system' | 'assistant' | 'user' | 'result';
  subtype?: string;
  session_id?: string;
  message?: any;
  usage?: {
    input_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
    output_tokens: number;
  };
  total_cost_usd?: number;
}

export class OneShootProcessSessionManager {
  private claudeSessionId: string | null = null;
  private config: OneShootProcessConfig;
  
  // Event handlers
  public onData?: (data: string) => void;
  public onExit?: (code: number | null, signal: string | null) => void;
  public onError?: (error: Error) => void;
  public onInteractivePrompt?: (prompt: string) => void;

  constructor(config: OneShootProcessConfig) {
    this.config = config;
    this.config.outputChannel.appendLine('OneShoot Process Session Manager initialized: ' + config.sessionName);
  }

  async sendMessage(message: string): Promise<void> {
    this.config.outputChannel.appendLine('OneShoot: Sending message length: ' + message.length);
    
    try {
      // Build Claude command with proper flags
      const command = this.buildClaudeCommand();
      
      // Execute one-time process with streaming
      await this.executeCommandStreaming(command, message);
      
    } catch (error) {
      this.config.outputChannel.appendLine('OneShoot error: ' + error);
      this.onError?.(error as Error);
      throw error;
    }
  }

  private buildClaudeCommand(): string[] {
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose', 
      '--dangerously-skip-permissions'
    ];
    
    // Add --resume if we have session_id
    if (this.claudeSessionId) {
      args.push('--resume', this.claudeSessionId);
      this.config.outputChannel.appendLine('Using resume with session ID: ' + this.claudeSessionId);
    } else {
      this.config.outputChannel.appendLine('Starting new session no resume');
    }
    
    return args;
  }

  private async executeCommandStreaming(command: string[], input: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.config.outputChannel.appendLine('Executing: claude ' + command.join(' '));
      this.config.outputChannel.appendLine('Working directory: ' + this.config.workingDirectory);
      
      // CRITICAL: cwd MUST be set for resume to work correctly
      const process = spawn('claude', command, {
        cwd: this.config.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let buffer = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        const text = data.toString();
        buffer += text;
        
        // Process complete JSON lines as they arrive
        buffer = this.processStreamingBuffer(buffer);
        
        this.config.outputChannel.appendLine('STDOUT chunk: ' + text.substring(0, 200) + '...');
      });
      
      process.stderr.on('data', (data) => {
        const text = data.toString();
        error += text;
        this.config.outputChannel.appendLine('STDERR: ' + text);
      });
      
      process.on('close', (code) => {
        this.config.outputChannel.appendLine('Process finished with code: ' + code);
        
        // Process any remaining buffer
        if (buffer.trim()) {
          buffer = this.processStreamingBuffer(buffer, true);
        }
        
        if (code === 0) {
          this.config.outputChannel.appendLine('Command successful, streaming completed');
          resolve();
        } else {
          const errorMsg = error || 'Process exited with code ' + code;
          this.config.outputChannel.appendLine('Command failed: ' + errorMsg);
          reject(new Error(errorMsg));
        }
      });
      
      process.on('error', (err) => {
        this.config.outputChannel.appendLine('Process spawn error: ' + err.message);
        reject(err);
      });
      
      // Send input to stdin
      this.config.outputChannel.appendLine('Writing input to stdin: ' + input.substring(0, 100) + '...');
      process.stdin.write(input);
      process.stdin.end();
    });
  }

  private processStreamingBuffer(buffer: string, isComplete: boolean = false): string {
    const lines = buffer.split('\n');
    
    // Keep incomplete line in buffer unless this is the final processing
    let remainingBuffer = '';
    if (!isComplete && lines.length > 0) {
      const lastLine = lines.pop();
      remainingBuffer = lastLine || '';
    }
    
    for (const line of lines) {
      if (line.trim()) {
        this.processJsonLine(line.trim());
      }
    }
    
    return remainingBuffer;
  }

  private processJsonLine(line: string): void {
    try {
      const json = JSON.parse(line) as ClaudeJsonResponse;
      this.config.outputChannel.appendLine('Streaming JSON: type=' + json.type + ', subtype=' + (json.subtype || 'none'));
      
      // Update session_id if received
      if (json.session_id) {
        this.claudeSessionId = json.session_id;
        this.config.outputChannel.appendLine('Session ID updated: ' + this.claudeSessionId);
      }
      
      // Emit data event for immediate processing
      this.onData?.(JSON.stringify(json));
      
    } catch (parseError) {
      // Not JSON string - log as regular text
      if (line.trim().length > 0) {
        this.config.outputChannel.appendLine('Non-JSON line: ' + line.substring(0, 100));
      }
    }
  }


  sendInput(_input: string): void {
    // OneShoot architecture does not support interactive input
    // All messages are sent through sendMessage
    this.config.outputChannel.appendLine('OneShoot: sendInput not supported, use sendMessage instead');
  }

  sendMessageLegacy(message: string): void {
    // Wrapper for compatibility with old API
    this.sendMessage(message).catch(error => {
      this.config.outputChannel.appendLine('sendMessageLegacy wrapper error: ' + error);
    });
  }

  executeSlashCommand(slashCommand: string): void {
    // Slash commands are sent as regular messages in OneShoot architecture
    this.sendMessage(slashCommand).catch(error => {
      this.config.outputChannel.appendLine('executeSlashCommand error: ' + error);
    });
  }

  async dispose(): Promise<void> {
    this.config.outputChannel.appendLine('OneShoot: Disposing session ' + this.config.sessionName);
    // OneShoot processes do not require explicit dispose - they terminate automatically
    this.claudeSessionId = null;
  }

  isAlive(): boolean {
    // OneShoot processes are always "alive" (created on demand)
    return true;
  }

  /**
   * Get current Claude session ID
   */
  getClaudeSessionId(): string | null {
    return this.claudeSessionId;
  }
}

export class OneShootProcessSessionFactory {
  static create(config: OneShootProcessConfig): OneShootProcessSessionManager {
    return new OneShootProcessSessionManager(config);
  }
}