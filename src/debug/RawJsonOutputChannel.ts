import * as vscode from 'vscode';

/**
 * Simple Output Channel for displaying raw JSON from OneShoot mode
 * Uses VS Code's built-in OutputChannel API
 */
export class RawJsonOutputChannel {
  private outputChannel: vscode.OutputChannel | null = null;
  private messageCount = 0;
  private isActive = false;

  constructor() {}

  /**
   * Create and show the output channel
   */
  public start(): void {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('Claude Chat - Raw JSON Monitor', 'json');
    }
    
    this.isActive = true;
    this.messageCount = 0;
    this.outputChannel.clear();
    this.outputChannel.show(true); // true = preserve focus
    
    this.outputChannel.appendLine('=== Raw JSON Monitor Started ===');
    this.outputChannel.appendLine(`=== ${new Date().toLocaleString()} ===`);
    this.outputChannel.appendLine('');
  }

  /**
   * Stop and dispose the output channel
   */
  public stop(): void {
    this.isActive = false;
    
    if (this.outputChannel) {
      this.outputChannel.appendLine('');
      this.outputChannel.appendLine('=== Raw JSON Monitor Stopped ===');
      this.outputChannel.appendLine(`=== ${new Date().toLocaleString()} ===`);
    }
  }

  /**
   * Send raw data to the output channel
   */
  public sendRawData(data: string): void {
    if (!this.isActive || !this.outputChannel) {
      return;
    }

    this.messageCount++;
    
    // Add separator and message number
    this.outputChannel.appendLine(`\n===== Message #${this.messageCount} [${new Date().toLocaleTimeString()}] =====`);
    
    // Try to pretty-print if it's valid JSON
    try {
      const jsonData = JSON.parse(data);
      this.outputChannel.appendLine(JSON.stringify(jsonData, null, 2));
    } catch {
      // If not valid JSON, output as-is
      this.outputChannel.appendLine(data);
    }
    
    this.outputChannel.appendLine('===== End of Message =====\n');
  }

  /**
   * Clear the output channel
   */
  public clear(): void {
    if (this.outputChannel) {
      this.outputChannel.clear();
      this.messageCount = 0;
      this.outputChannel.appendLine('=== Output Cleared ===');
      this.outputChannel.appendLine(`=== ${new Date().toLocaleString()} ===`);
      this.outputChannel.appendLine('');
    }
  }

  /**
   * Check if monitor is active
   */
  public isMonitorActive(): boolean {
    return this.isActive;
  }

  /**
   * Get message count
   */
  public getMessageCount(): number {
    return this.messageCount;
  }

  /**
   * Focus the output channel
   */
  public focus(): void {
    if (this.outputChannel) {
      this.outputChannel.show(false); // false = steal focus
    }
  }
}