import * as vscode from 'vscode';
import * as http from 'http';
import * as WebSocket from 'ws';

export class RawJsonMonitor {
  private server?: http.Server;
  private wss?: WebSocket.Server;
  private clients: Set<WebSocket.WebSocket> = new Set();
  private port: number = 3456;
  private isRunning: boolean = false;
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      vscode.window.showInformationMessage('Raw JSON Monitor is already running');
      return;
    }

    try {
      // Create HTTP server
      this.server = http.createServer((req, res) => {
        if (req.url === '/') {
          const html = this.getClientHtml();
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      // Create WebSocket server
      this.wss = new WebSocket.Server({ server: this.server });

      this.wss.on('connection', (ws) => {
        this.clients.add(ws);
        this.outputChannel.appendLine(`[RawJsonMonitor] Client connected. Total clients: ${this.clients.size}`);
        
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'Connected to Raw JSON Monitor',
          timestamp: new Date().toISOString()
        }));

        ws.on('close', () => {
          this.clients.delete(ws);
          this.outputChannel.appendLine(`[RawJsonMonitor] Client disconnected. Total clients: ${this.clients.size}`);
        });

        ws.on('error', (error) => {
          this.outputChannel.appendLine(`[RawJsonMonitor] WebSocket error: ${error.message}`);
        });
      });

      // Start server
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.port, () => {
          this.isRunning = true;
          this.outputChannel.appendLine(`[RawJsonMonitor] Server started on http://localhost:${this.port}`);
          resolve();
        });
        this.server!.on('error', reject);
      });

      // Open in browser
      vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${this.port}`));
      vscode.window.showInformationMessage(`Raw JSON Monitor started on http://localhost:${this.port}`);

    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to start Raw JSON Monitor: ${error.message}`);
      this.outputChannel.appendLine(`[RawJsonMonitor] Error: ${error.message}`);
    }
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    // Close all WebSocket connections
    this.clients.forEach(client => {
      client.send(JSON.stringify({
        type: 'server-closing',
        message: 'Server is shutting down',
        timestamp: new Date().toISOString()
      }));
      client.close();
    });
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = undefined;
    }

    // Close HTTP server
    if (this.server) {
      this.server.close();
      this.server = undefined;
    }

    this.isRunning = false;
    this.outputChannel.appendLine('[RawJsonMonitor] Server stopped');
    vscode.window.showInformationMessage('Raw JSON Monitor stopped');
  }

  sendRawData(data: string): void {
    if (!this.isRunning || this.clients.size === 0) {
      return;
    }

    const message = JSON.stringify({
      type: 'raw-json',
      data: data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  isActive(): boolean {
    return this.isRunning;
  }

  private getClientHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Raw JSON Monitor - Claude Chat</title>
    <style>
        body {
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
            background-color: #1e1e1e;
            color: #d4d4d4;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .header {
            background-color: #2d2d2d;
            padding: 10px 20px;
            border-bottom: 1px solid #3e3e3e;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .title {
            font-size: 16px;
            font-weight: bold;
            color: #cccccc;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #4CAF50;
        }
        .status-indicator.disconnected {
            background-color: #f44336;
        }
        .controls {
            display: flex;
            gap: 10px;
        }
        button {
            background-color: #0e639c;
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        button:hover {
            background-color: #1177bb;
        }
        button:disabled {
            background-color: #555;
            cursor: not-allowed;
        }
        .content {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            font-size: 12px;
        }
        .json-block {
            background-color: #252526;
            border: 1px solid #3e3e3e;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
            position: relative;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .timestamp {
            position: absolute;
            top: 5px;
            right: 10px;
            font-size: 10px;
            color: #888;
        }
        .separator {
            text-align: center;
            color: #666;
            margin: 20px 0;
            font-size: 10px;
        }
        .separator::before,
        .separator::after {
            content: '—————';
            margin: 0 10px;
        }
        .json-content {
            color: #9cdcfe;
        }
        .error {
            color: #f44336;
            background-color: #3e2020;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Raw JSON Monitor</div>
        <div class="status">
            <span id="status-text">Connecting...</span>
            <div id="status-indicator" class="status-indicator disconnected"></div>
        </div>
        <div class="controls">
            <button id="clear-btn">Clear</button>
            <button id="auto-scroll-btn">Auto-scroll: ON</button>
        </div>
    </div>
    <div id="content" class="content"></div>

    <script>
        let ws;
        let autoScroll = true;
        let messageCount = 0;
        
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.getElementById('status-indicator');
        const content = document.getElementById('content');
        const clearBtn = document.getElementById('clear-btn');
        const autoScrollBtn = document.getElementById('auto-scroll-btn');

        function connect() {
            ws = new WebSocket('ws://localhost:3456');

            ws.onopen = () => {
                statusText.textContent = 'Connected';
                statusIndicator.classList.remove('disconnected');
            };

            ws.onclose = () => {
                statusText.textContent = 'Disconnected';
                statusIndicator.classList.add('disconnected');
                setTimeout(connect, 2000); // Reconnect after 2 seconds
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'raw-json') {
                        displayRawJson(message.data, message.timestamp);
                    } else if (message.type === 'connected') {
                        addSystemMessage(message.message, message.timestamp);
                    } else if (message.type === 'server-closing') {
                        addSystemMessage(message.message, message.timestamp, true);
                    }
                } catch (error) {
                    console.error('Failed to parse message:', error);
                }
            };
        }

        function displayRawJson(data, timestamp) {
            messageCount++;
            
            if (messageCount > 1) {
                const separator = document.createElement('div');
                separator.className = 'separator';
                separator.textContent = \`Message #\${messageCount}\`;
                content.appendChild(separator);
            }

            const block = document.createElement('div');
            block.className = 'json-block';
            
            const timestampEl = document.createElement('div');
            timestampEl.className = 'timestamp';
            timestampEl.textContent = new Date(timestamp).toLocaleTimeString();
            
            const jsonContent = document.createElement('div');
            jsonContent.className = 'json-content';
            
            try {
                // Try to parse and pretty-print JSON
                const parsed = JSON.parse(data);
                jsonContent.textContent = JSON.stringify(parsed, null, 2);
            } catch (e) {
                // If not valid JSON, display as-is
                jsonContent.textContent = data;
            }
            
            block.appendChild(timestampEl);
            block.appendChild(jsonContent);
            content.appendChild(block);
            
            if (autoScroll) {
                content.scrollTop = content.scrollHeight;
            }
        }

        function addSystemMessage(message, timestamp, isError = false) {
            const block = document.createElement('div');
            block.className = 'json-block' + (isError ? ' error' : '');
            
            const timestampEl = document.createElement('div');
            timestampEl.className = 'timestamp';
            timestampEl.textContent = new Date(timestamp).toLocaleTimeString();
            
            const messageEl = document.createElement('div');
            messageEl.textContent = message;
            
            block.appendChild(timestampEl);
            block.appendChild(messageEl);
            content.appendChild(block);
            
            if (autoScroll) {
                content.scrollTop = content.scrollHeight;
            }
        }

        clearBtn.addEventListener('click', () => {
            content.innerHTML = '';
            messageCount = 0;
        });

        autoScrollBtn.addEventListener('click', () => {
            autoScroll = !autoScroll;
            autoScrollBtn.textContent = \`Auto-scroll: \${autoScroll ? 'ON' : 'OFF'}\`;
        });

        // Start connection
        connect();
    </script>
</body>
</html>`;
  }
}