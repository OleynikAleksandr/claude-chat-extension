/**
 * Multi-Session Provider
 * Integrates DualSessionManager with VS Code webview
 * Claude Chat Extension v0.4.0
 */

import * as vscode from 'vscode';
import { DualSessionManager } from '../managers/DualSessionManager';
import { WebviewMessage, ExtensionMessage } from '../types/Session';

export class MultiSessionProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'claudeChatMultiSessionView';
  
  private view?: vscode.WebviewView;
  private sessionManager: DualSessionManager;
  private outputChannel: vscode.OutputChannel;

  constructor(private readonly extensionUri: vscode.Uri) {
    // Create output channel
    this.outputChannel = vscode.window.createOutputChannel('Claude Chat Multi-Session');
    
    // Initialize session manager
    this.sessionManager = new DualSessionManager(this.outputChannel);
    
    // Setup event listeners
    this.setupSessionEventListeners();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.extensionUri
      ]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(
      message => this.handleWebviewMessage(message),
      undefined,
      []
    );

    // Send initial state
    this.sendSessionUpdate();
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get paths to React bundle files
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
      this.extensionUri, 'out', 'webview', 'bundle.js'
    ));
    
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
      this.extensionUri, 'media', 'reset.css'
    ));
    
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
      this.extensionUri, 'media', 'vscode.css'
    ));

    // Use nonce for security
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <title>Claude Chat Multi-Session</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            height: 100vh;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          #root {
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  private setupSessionEventListeners(): void {
    this.sessionManager.onSessionCreated((session) => {
      this.outputChannel.appendLine(`Session created: ${session.name} (${session.id})`);
      this.sendSessionUpdate();
    });

    this.sessionManager.onSessionClosed((sessionId) => {
      this.outputChannel.appendLine(`Session closed: ${sessionId}`);
      this.sendSessionUpdate();
    });

    this.sessionManager.onSessionSwitched((sessionId) => {
      this.outputChannel.appendLine(`Session switched to: ${sessionId}`);
      this.sendMessage({
        command: 'activeSessionChanged',
        sessionId
      });
    });

    this.sessionManager.onSessionStatusChanged((sessionId, status) => {
      this.outputChannel.appendLine(`Session ${sessionId} status changed to: ${status}`);
      this.sendMessage({
        command: 'sessionStatusChanged',
        sessionId,
        status
      });
    });

    this.sessionManager.onMessageReceived((sessionId, message) => {
      this.sendMessage({
        command: 'messageReceived',
        sessionId,
        message
      });
    });
  }

  private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    try {
      this.outputChannel.appendLine(`Received message: ${JSON.stringify(message)}`);

      switch (message.command) {
        case 'createSession':
          try {
            const session = await this.sessionManager.createSession(message.name);
            this.outputChannel.appendLine(`Session created successfully: ${session.id}`);
          } catch (error) {
            this.sendMessage({
              command: 'error',
              message: `Failed to create session: ${error}`
            });
          }
          break;

        case 'switchSession':
          try {
            await this.sessionManager.switchToSession(message.sessionId);
          } catch (error) {
            this.sendMessage({
              command: 'error',
              message: `Failed to switch session: ${error}`,
              sessionId: message.sessionId
            });
          }
          break;

        case 'closeSession':
          try {
            await this.sessionManager.closeSession(message.sessionId);
          } catch (error) {
            this.sendMessage({
              command: 'error',
              message: `Failed to close session: ${error}`,
              sessionId: message.sessionId
            });
          }
          break;

        case 'sendMessage':
          try {
            await this.sessionManager.sendMessage(message.sessionId, message.message);
          } catch (error) {
            this.sendMessage({
              command: 'error',
              message: `Failed to send message: ${error}`,
              sessionId: message.sessionId
            });
          }
          break;

        case 'renameSession':
          // TODO: Implement session renaming
          this.sendMessage({
            command: 'error',
            message: 'Session renaming not yet implemented'
          });
          break;

        case 'getSessionState':
          this.sendSessionUpdate();
          break;

        default:
          this.outputChannel.appendLine(`Unknown command: ${(message as any).command}`);
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error handling message: ${error}`);
      this.sendMessage({
        command: 'error',
        message: `Unexpected error: ${error}`
      });
    }
  }

  private sendSessionUpdate(): void {
    const sessions = this.sessionManager.getAllSessions().map(session => ({
      id: session.id,
      name: session.name,
      messages: session.messages,
      status: session.status,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt
    }));

    const activeSession = this.sessionManager.getActiveSession();
    const activeSessionId = activeSession?.id || null;

    this.sendMessage({
      command: 'sessionsUpdated',
      sessions
    });

    if (activeSessionId) {
      this.sendMessage({
        command: 'activeSessionChanged',
        sessionId: activeSessionId
      });
    }
  }

  private sendMessage(message: ExtensionMessage): void {
    if (this.view) {
      this.view.webview.postMessage(message);
    }
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  // Public methods for extension integration
  public getSessionManager(): DualSessionManager {
    return this.sessionManager;
  }

  public dispose(): void {
    this.sessionManager.dispose();
    this.outputChannel.dispose();
  }
}