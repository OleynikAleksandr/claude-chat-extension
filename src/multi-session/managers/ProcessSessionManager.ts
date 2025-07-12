/**
 * Process Session Manager - child_process alternative to PTY
 * Claude Chat Extension v0.10.49
 * 
 * Uses standard child_process.spawn instead of node-pty for better compatibility
 */

import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

export interface ProcessSessionConfig {
  sessionId: string;
  sessionName: string;
  workingDirectory: string;
  outputChannel: vscode.OutputChannel;
  debugMode?: boolean; // Enable visible terminal for debugging
}

export class ProcessSessionManager {
  private process: ChildProcess | null = null;
  private config: ProcessSessionConfig;
  private dataBuffer: string = '';
  private claudeSessionId: string | null = null; // Store Claude's internal session ID
  
  // Event handlers
  public onData?: (data: string) => void;
  public onExit?: (code: number | null, signal: string | null) => void;
  public onError?: (error: Error) => void;
  public onInteractivePrompt?: (prompt: string) => void;

  // Interactive patterns - same as PTY version
  private readonly INTERACTIVE_PATTERNS = [
    /Do you want to proceed\?\s*$/i,
    /\[Y\/n\]\s*$/i,
    /\(y\/N\)\s*$/i,
    /Continue\?\s*$/i,
    /Press Enter to continue/i,
    /Choose an option:/i
  ];

  constructor(config: ProcessSessionConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.config.outputChannel.appendLine(`🚀 Starting process session: ${this.config.sessionName}`);
      this.config.outputChannel.appendLine(`🔧 Debug mode: ${this.config.debugMode ? 'ENABLED' : 'DISABLED'}`);
      
      // Preserve VS Code environment + TTY emulation
      const env = {
        ...process.env,
        VSCODE_PID: process.env.VSCODE_PID,
        VSCODE_CLI: process.env.VSCODE_CLI,
        VSCODE_WORKSPACE_FOLDER: this.config.workingDirectory,
        TERM: 'xterm-256color',  // Emulate terminal
        FORCE_COLOR: '1',        // Enable colors
        NODE_ENV: 'development'  // Help with interactive mode
      };

      if (this.config.debugMode) {
        // DEBUG MODE: Open visible Terminal.app with claude
        this.config.outputChannel.appendLine(`🐛 DEBUG MODE: Opening visible Terminal.app`);
        
        // Create command to run in Terminal with Claudia-style flags for JSON streaming
        const claudeCommand = `cd '${this.config.workingDirectory}' && claude --output-format stream-json --verbose --dangerously-skip-permissions`;
        
        // Use osascript to run claude in existing terminal window if possible
        const osascriptCmd = 'osascript';
        const args = [
          '-e', 'tell application "Terminal"',
          '-e', 'if (count of windows) > 0 then',
          '-e', `do script "${claudeCommand}" in front window`,
          '-e', 'else',
          '-e', `do script "${claudeCommand}"`,
          '-e', 'end if',
          '-e', 'activate',
          '-e', 'end tell'
        ];
        
        this.config.outputChannel.appendLine(`🖥️ Opening Terminal with command: ${claudeCommand}`);
        
        // Start osascript to open Terminal.app
        const osascriptProcess = spawn(osascriptCmd, args, {
          cwd: this.config.workingDirectory,
          env: env,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        osascriptProcess.on('exit', (code) => {
          this.config.outputChannel.appendLine(`🖥️ osascript completed: code=${code}, Terminal.app should be open`);
        });
        
        osascriptProcess.on('error', (error) => {
          this.config.outputChannel.appendLine(`❌ osascript error: ${error.message}`);
        });
        
        // Create a long-running dummy process to keep session alive
        // Use 'sleep' command that we can control
        this.process = spawn('sleep', ['3600'], { // Sleep for 1 hour
          cwd: this.config.workingDirectory,
          env: env,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // In debug mode, we can't directly control stdin/stdout of claude
        // But we can see what's happening in the Terminal window
        this.config.outputChannel.appendLine(`✅ Terminal window should be open now. You can interact with it directly.`);
        
      } else {
        // PRODUCTION MODE: Direct process communication with Claude
        this.config.outputChannel.appendLine(`🔍 Starting Claude process for direct communication`);
        
        // Try direct claude spawn with Claudia-style flags for JSON streaming
        this.process = spawn('claude', [
          '--output-format', 'stream-json',
          '--verbose', 
          '--dangerously-skip-permissions'
        ], {
          cwd: this.config.workingDirectory,
          env: env,
          stdio: ['pipe', 'pipe', 'pipe'], // Full stdio control
          detached: false,  // Keep attached to parent process
          shell: false,  // Don't use shell
          windowsHide: true // Hide on Windows
        });
        
        this.config.outputChannel.appendLine(`🚀 Claude process started directly`);
      }

      // Setup event handlers
      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.config.outputChannel.appendLine(`📥 STDOUT: ${text.trim()}`);
        this.handleOutput(text);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.config.outputChannel.appendLine(`⚠️ STDERR: ${text.trim()}`);
        this.handleOutput(text);
      });

      this.process.on('exit', (code, signal) => {
        this.config.outputChannel.appendLine(`💀 Process exited: code=${code}, signal=${signal}`);
        this.onExit?.(code, signal);
      });

      this.process.on('error', (error) => {
        this.config.outputChannel.appendLine(`❌ Process spawn error: ${error.message}`);
        this.config.outputChannel.appendLine(`❌ This usually means 'claude' command not found in PATH`);
        this.config.outputChannel.appendLine(`❌ Error code: ${(error as any).code}`);
        this.onError?.(error);
        reject(error);
      });

      // Give process time to start
      if (this.config.debugMode) {
        // In debug mode, wait a bit longer for Terminal.app to open
        setTimeout(() => {
          this.config.outputChannel.appendLine(`✅ Process session (debug mode) started successfully`);
          this.config.outputChannel.appendLine(`🖥️ Check Terminal.app window for Claude instance`);
          resolve();
        }, 2000); // 2 seconds for debug mode
      } else {
        setTimeout(() => {
          this.config.outputChannel.appendLine(`✅ Process session started successfully`);
          resolve();
        }, 1000);
      }
    });
  }

  private handleOutput(data: string): void {
    this.dataBuffer += data;
    
    // Process complete lines for JSON parsing (Claudia-style)
    const lines = this.dataBuffer.split('\n');
    this.dataBuffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        this.processJsonLine(line.trim());
      }
    }
    
    // Check for bypass permissions dialog (legacy support)
    if (data.includes('Yes, I accept') && data.includes('No, exit')) {
      this.config.outputChannel.appendLine(`🔧 Detected bypass permissions dialog, sending "2" (Yes, I accept)`);
      this.sendInput('2\n');
      return;
    }
    
    // Check for interactive prompts (legacy support)
    this.checkForInteractivePrompts(data);
    
    // Emit data event
    this.onData?.(data);
  }

  /**
   * Process JSON line from Claude output (following Claudia pattern)
   */
  private processJsonLine(line: string): void {
    try {
      const json = JSON.parse(line);
      
      // Log the JSON object for debugging
      this.config.outputChannel.appendLine(`📦 JSON: ${JSON.stringify(json, null, 2)}`);
      
      // Handle init message with session_id (like Claudia does)
      if (json.type === 'system' && json.subtype === 'init') {
        if (json.session_id) {
          this.claudeSessionId = json.session_id;
          this.config.outputChannel.appendLine(`🆔 Claude session ID extracted: ${json.session_id}`);
        }
      }
      
      // Handle other message types
      if (json.type === 'message') {
        this.config.outputChannel.appendLine(`💬 Message: ${json.content || JSON.stringify(json)}`);
      }
      
      if (json.type === 'error') {
        this.config.outputChannel.appendLine(`❌ Error: ${json.message || JSON.stringify(json)}`);
      }
      
    } catch (parseError) {
      // Not JSON, treat as regular text output
      this.config.outputChannel.appendLine(`📝 Text: ${line}`);
    }
  }

  private checkForInteractivePrompts(data: string): void {
    for (const pattern of this.INTERACTIVE_PATTERNS) {
      if (pattern.test(data)) {
        this.config.outputChannel.appendLine(`🔄 Interactive prompt detected: ${data.trim()}`);
        this.onInteractivePrompt?.(data.trim());
        
        // Auto-respond with 'y' for now (same as PTY version)
        this.sendInput('y\n');
        break;
      }
    }
  }

  sendInput(input: string): void {
    if (this.config.debugMode) {
      this.config.outputChannel.appendLine(`🐛 DEBUG: Sending input to Terminal.app via AppleScript: "${input.trim()}"`);
      // Send input to Terminal.app using AppleScript keystroke
      this.sendToTerminalApp(input);
      return;
    }
    
    // PRODUCTION MODE: Direct stdin communication
    if (!this.process || !this.process.stdin) {
      this.config.outputChannel.appendLine(`❌ Cannot send input: process not ready`);
      return;
    }

    try {
      this.process.stdin.write(input);
      this.config.outputChannel.appendLine(`📤 Sent to Claude stdin: ${input.replace('\n', '\\n')}`);
    } catch (error) {
      this.config.outputChannel.appendLine(`❌ Failed to send to Claude stdin: ${error}`);
    }
  }

  sendMessage(message: string): void {
    this.sendInput(message + '\n');
  }

  executeSlashCommand(slashCommand: string): void {
    this.sendInput(slashCommand + '\n');
  }

  /**
   * Read current contents of Terminal.app window
   */
  private readFromTerminalApp(): void {
    this.config.outputChannel.appendLine(`📖 Reading Terminal.app contents...`);

    const osascriptCmd = 'osascript';
    const args = [
      '-e', 'tell application "Terminal"',
      '-e', 'get contents of front window',
      '-e', 'end tell'
    ];

    const readProcess = spawn(osascriptCmd, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let terminalContent = '';

    readProcess.stdout?.on('data', (data) => {
      terminalContent += data.toString();
    });

    readProcess.on('exit', (code) => {
      if (code === 0 && terminalContent.trim()) {
        this.config.outputChannel.appendLine(`📥 Terminal content read: ${terminalContent.length} chars`);
        this.processTerminalContent(terminalContent.trim());
      } else {
        this.config.outputChannel.appendLine(`❌ Failed to read Terminal.app content, exit code: ${code}`);
      }
    });

    readProcess.on('error', (error) => {
      this.config.outputChannel.appendLine(`❌ AppleScript read error: ${error.message}`);
    });

    readProcess.stderr?.on('data', (data) => {
      this.config.outputChannel.appendLine(`⚠️ AppleScript read stderr: ${data.toString().trim()}`);
    });
  }

  /**
   * Poll Terminal.app until Claude finishes responding
   */
  private pollForClaudeResponse(attempt: number = 1, maxAttempts: number = 10): void {
    this.config.outputChannel.appendLine(`🔍 Polling for Claude response (attempt ${attempt}/${maxAttempts})...`);
    
    const osascriptCmd = 'osascript';
    const args = [
      '-e', 'tell application "Terminal"',
      '-e', 'get contents of front window',
      '-e', 'end tell'
    ];

    const pollProcess = spawn(osascriptCmd, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let terminalContent = '';

    pollProcess.stdout?.on('data', (data) => {
      terminalContent += data.toString();
    });

    pollProcess.on('exit', (code) => {
      if (code === 0 && terminalContent.trim()) {
        const content = terminalContent.trim();
        
        // Check if Claude is ready (look for prompt indicators)
        const isClaudeReady = this.isClaudeReady(content);
        
        if (isClaudeReady) {
          this.config.outputChannel.appendLine(`✅ Claude response ready! Processing content...`);
          this.processTerminalContent(content);
        } else if (attempt < maxAttempts) {
          // Continue polling
          this.config.outputChannel.appendLine(`⏳ Claude still responding, waiting...`);
          setTimeout(() => {
            this.pollForClaudeResponse(attempt + 1, maxAttempts);
          }, 2000); // Poll every 2 seconds
        } else {
          this.config.outputChannel.appendLine(`⏰ Max polling attempts reached, reading current content...`);
          this.processTerminalContent(content);
        }
      } else {
        this.config.outputChannel.appendLine(`❌ Failed to poll terminal content, exit code: ${code}`);
      }
    });

    pollProcess.on('error', (error) => {
      this.config.outputChannel.appendLine(`❌ Polling error: ${error.message}`);
    });
  }

  /**
   * Check if Claude is ready for next input by looking for prompt indicators
   */
  private isClaudeReady(content: string): boolean {
    // Look for Claude's prompt indicators
    const readyIndicators = [
      '? for shortcuts',  // Main ready indicator
      '> ',               // Command prompt
      '❯ ',               // Alternative prompt
    ];
    
    const lastLine = content.split('\n').pop()?.trim() || '';
    const hasReadyIndicator = readyIndicators.some(indicator => 
      content.includes(indicator) || lastLine.includes(indicator)
    );
    
    this.config.outputChannel.appendLine(`🔍 Ready check - Last line: "${lastLine}", Has indicator: ${hasReadyIndicator}`);
    return hasReadyIndicator;
  }

  /**
   * Process terminal content - simple version for testing
   */
  private processTerminalContent(content: string): void {
    this.config.outputChannel.appendLine(`📝 Processing terminal content (${content.length} chars)...`);
    this.config.outputChannel.appendLine(`📄 First 200 chars: ${content.substring(0, 200)}...`);
    
    // For now, emit the full content for debugging
    this.onData?.(content);
  }


  /**
   * Send text to Terminal.app using clipboard method (supports Unicode/Cyrillic)
   */
  private sendToTerminalApp(text: string): void {
    this.config.outputChannel.appendLine(`📤 Sending to Terminal.app via clipboard: "${text.trim()}"`);

    // Enhanced method: Focus on specific Terminal window with Claude
    const osascriptCmd = 'osascript';
    const args = [
      '-e', `set the clipboard to "${text.replace(/"/g, '\\"')}"`,
      '-e', 'tell application "Terminal"',
      '-e', 'activate',
      '-e', 'delay 0.5',
      // Focus on the first window (where Claude should be)
      '-e', 'set frontmost to true',
      '-e', 'tell (first window whose frontmost is true)',
      '-e', 'select',
      '-e', 'end tell',
      '-e', 'delay 0.3',
      '-e', 'end tell',
      '-e', 'tell application "System Events"',
      '-e', 'tell process "Terminal"',
      '-e', 'keystroke "v" using command down',
      '-e', 'delay 0.3',
      '-e', 'keystroke return',
      '-e', 'end tell',
      '-e', 'end tell'
    ];

    const clipboardProcess = spawn(osascriptCmd, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    clipboardProcess.on('exit', (code) => {
      if (code === 0) {
        this.config.outputChannel.appendLine(`✅ Successfully sent to Terminal.app via clipboard`);
        
        // Start reading Terminal content after sending message
        this.config.outputChannel.appendLine(`⏳ Waiting for Claude response...`);
        setTimeout(() => {
          this.readFromTerminalApp();
        }, 15000); // Wait 15 seconds for Claude to fully respond
      } else {
        this.config.outputChannel.appendLine(`❌ Failed to send to Terminal.app via clipboard, exit code: ${code}`);
      }
    });

    clipboardProcess.on('error', (error) => {
      this.config.outputChannel.appendLine(`❌ AppleScript clipboard error: ${error.message}`);
    });

    clipboardProcess.stderr?.on('data', (data) => {
      this.config.outputChannel.appendLine(`⚠️ AppleScript stderr: ${data.toString().trim()}`);
    });
  }

  async dispose(): Promise<void> {
    if (this.process) {
      this.config.outputChannel.appendLine(`🔄 Disposing process session...`);
      
      // Try graceful shutdown first
      this.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
      
      this.process = null;
    }
  }

  isAlive(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Get Claude's internal session ID (extracted from init message)
   */
  getClaudeSessionId(): string | null {
    return this.claudeSessionId;
  }
}

export class ProcessSessionFactory {
  static create(config: ProcessSessionConfig): ProcessSessionManager {
    return new ProcessSessionManager(config);
  }
}