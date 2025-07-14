import * as vscode from 'vscode';
import { MultiSessionProvider } from './multi-session/providers/MultiSessionProvider';

export function activate(context: vscode.ExtensionContext) {
    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('Claude Chat');
    outputChannel.appendLine('🔥 Claude Chat Extension - Activation Started');
    outputChannel.appendLine(`Extension URI: ${context.extensionUri.toString()}`);
    outputChannel.show();

    // Register command to open chat
    const openChatCommand = vscode.commands.registerCommand('claudeChat.openChat', () => {
        outputChannel.appendLine('📂 Opening chat panel...');
        vscode.commands.executeCommand('workbench.view.extension.claude-chat-container');
    });

    // Using OneShoot-only architecture
    outputChannel.appendLine('🔧 Using OneShoot-only architecture');

    // Initialize Multi-Session Provider
    outputChannel.appendLine('🔥 Initializing Multi-Session Provider...');
    const multiSessionProvider = new MultiSessionProvider(context.extensionUri);
    
    outputChannel.appendLine('📝 Registering multi-session webview provider...');
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('claudeChatMultiSessionView', multiSessionProvider)
    );
    outputChannel.appendLine('✅ Multi-Session provider registered');

    // Multi-Session Commands
    const openMultiSessionCommand = vscode.commands.registerCommand('claudeChat.openMultiSession', () => {
        outputChannel.appendLine('📂 Opening multi-session panel...');
        vscode.commands.executeCommand('workbench.view.extension.claude-chat-container');
    });

    context.subscriptions.push(
        openChatCommand, 
        openMultiSessionCommand,
        multiSessionProvider
    );
    
    outputChannel.appendLine('🎊 All commands registered successfully!');
    outputChannel.appendLine('🚀 Claude Chat extension activation completed!');
}

export function deactivate() {}