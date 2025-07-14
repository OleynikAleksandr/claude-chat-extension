import * as vscode from 'vscode';
import { MultiSessionProvider } from './multi-session/providers/MultiSessionProvider';

export function activate(context: vscode.ExtensionContext) {
    // Register command to open chat panel
    const openChatCommand = vscode.commands.registerCommand('claudeChat.openChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.claude-chat-container');
    });

    // Initialize Multi-Session Provider
    const multiSessionProvider = new MultiSessionProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('claudeChatMultiSessionView', multiSessionProvider),
        openChatCommand,
        multiSessionProvider
    );
}

export function deactivate() {}