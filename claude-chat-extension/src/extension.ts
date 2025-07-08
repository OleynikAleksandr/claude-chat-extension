import * as vscode from 'vscode';
// Legacy imports - больше не используются
// import { TerminalManager, TerminalSelectionStrategy } from './terminalManager';
// import { BidirectionalBridge } from './bidirectional-bridge/BidirectionalBridge';
import { MultiSessionProvider } from './multi-session/providers/MultiSessionProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Claude Chat extension activation started!');
    
    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('Claude Chat');
    outputChannel.appendLine('🔥 Claude Chat Extension - Activation Started');
    outputChannel.appendLine(`Extension URI: ${context.extensionUri.toString()}`);
    outputChannel.show();

    // Register command to open chat
    const openChatCommand = vscode.commands.registerCommand('claudeChat.openChat', () => {
        outputChannel.appendLine('📂 Opening chat panel...');
        console.log('📂 Opening chat panel...');
        vscode.commands.executeCommand('workbench.view.extension.claude-chat-container');
    });

    // NOTE: Bidirectional Bridge больше не используется - используем Multi-Session архитектуру
    outputChannel.appendLine('📝 Skipping legacy Terminal Manager and Bidirectional Bridge initialization');
    outputChannel.appendLine('🔧 Using new Multi-Session architecture instead');

    // Legacy command - теперь используем Multi-Session архитектуру
    const sendMessageCommand = vscode.commands.registerCommand('claudeChat.sendMessage', async () => {
        outputChannel.appendLine('⚠️ Legacy sendMessage command called - redirecting to Multi-Session');
        vscode.window.showInformationMessage('Используйте Multi-Session панель для отправки сообщений');
    });

    // Legacy bidirectional command - отключен
    const sendBidirectionalCommand = vscode.commands.registerCommand('claudeChat.sendBidirectional', async () => {
        outputChannel.appendLine('⚠️ Legacy bidirectional command called - feature deprecated');
        vscode.window.showInformationMessage('Bidirectional команды заменены на Multi-Session архитектуру');
    });

    // Legacy webview provider отключен - используем только Multi-Session
    outputChannel.appendLine('📝 Skipping legacy webview provider registration');
    outputChannel.appendLine('✅ Using Multi-Session provider instead');

    // Initialize Multi-Session Provider
    outputChannel.appendLine('🔥 Initializing Multi-Session Provider...');
    const multiSessionProvider = new MultiSessionProvider(context.extensionUri);
    
    outputChannel.appendLine('📝 Registering multi-session webview provider...');
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('claudeChatMultiSessionView', multiSessionProvider)
    );
    outputChannel.appendLine('✅ Multi-Session provider registered');

    // Legacy debug command - отключен
    const debugTerminalsCommand = vscode.commands.registerCommand('claudeChat.debugTerminals', async () => {
        vscode.window.showInformationMessage('Debug команда заменена на Session Diagnostics в Multi-Session панели');
    });

    // Register quick send command
    const quickSendCommand = vscode.commands.registerCommand('claudeChat.quickSend', async () => {
        const input = await vscode.window.showInputBox({
            prompt: 'Введите сообщение для Claude',
            placeHolder: 'Ваше сообщение...',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Сообщение не может быть пустым';
                }
                if (value.length > 8000) {
                    return 'Сообщение слишком длинное (максимум 8000 символов)';
                }
                return null;
            }
        });

        if (input) {
            await vscode.commands.executeCommand('claudeChat.sendMessage', input.trim());
        }
    });

    // Register toggle panel command
    const togglePanelCommand = vscode.commands.registerCommand('claudeChat.togglePanel', async () => {
        await vscode.commands.executeCommand('workbench.view.extension.claude-chat-container');
    });

    // Legacy clear history command - отключен
    const clearHistoryCommand = vscode.commands.registerCommand('claudeChat.clearHistory', async () => {
        vscode.window.showInformationMessage('Clear History доступен в Multi-Session панели');
    });

    // Legacy status command - отключен
    const showStatusCommand = vscode.commands.registerCommand('claudeChat.showStatus', async () => {
        vscode.window.showInformationMessage('Status команда заменена на Session Diagnostics в Multi-Session панели');
    });

    // Multi-Session Commands
    const openMultiSessionCommand = vscode.commands.registerCommand('claudeChat.openMultiSession', () => {
        outputChannel.appendLine('📂 Opening multi-session panel...');
        vscode.commands.executeCommand('workbench.view.extension.claude-chat-container');
    });

    const createSessionCommand = vscode.commands.registerCommand('claudeChat.createSession', async () => {
        try {
            const sessionManager = multiSessionProvider.getSessionManager();
            if (!sessionManager.canCreateNewSession()) {
                vscode.window.showWarningMessage('Максимальное количество сессий достигнуто (2)');
                return;
            }

            const sessionName = await vscode.window.showInputBox({
                prompt: 'Введите имя новой сессии',
                placeHolder: 'Claude Chat Session',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Имя сессии не может быть пустым';
                    }
                    return null;
                }
            });

            if (sessionName) {
                await sessionManager.createSession(sessionName.trim());
                vscode.window.showInformationMessage(`Сессия "${sessionName}" создана`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Ошибка создания сессии: ${error}`);
        }
    });

    const switchSessionCommand = vscode.commands.registerCommand('claudeChat.switchSession', async () => {
        try {
            const sessionManager = multiSessionProvider.getSessionManager();
            const sessions = sessionManager.getAllSessions();
            
            if (sessions.length === 0) {
                vscode.window.showInformationMessage('Нет доступных сессий');
                return;
            }

            const items = sessions.map(session => ({
                label: session.name,
                description: `Статус: ${session.status}`,
                sessionId: session.id
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Выберите сессию для переключения'
            });

            if (selected) {
                await sessionManager.switchToSession(selected.sessionId);
                vscode.window.showInformationMessage(`Переключено на сессию: ${selected.label}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Ошибка переключения сессии: ${error}`);
        }
    });

    const closeSessionCommand = vscode.commands.registerCommand('claudeChat.closeSession', async () => {
        try {
            const sessionManager = multiSessionProvider.getSessionManager();
            const sessions = sessionManager.getAllSessions();
            
            if (sessions.length === 0) {
                vscode.window.showInformationMessage('Нет доступных сессий для закрытия');
                return;
            }

            const items = sessions.map(session => ({
                label: session.name,
                description: `Статус: ${session.status}`,
                sessionId: session.id
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Выберите сессию для закрытия'
            });

            if (selected) {
                const confirm = await vscode.window.showWarningMessage(
                    `Закрыть сессию "${selected.label}"?`,
                    { modal: true },
                    'Да',
                    'Отмена'
                );

                if (confirm === 'Да') {
                    await sessionManager.closeSession(selected.sessionId);
                    vscode.window.showInformationMessage(`Сессия "${selected.label}" закрыта`);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Ошибка закрытия сессии: ${error}`);
        }
    });

    const sessionDiagnosticsCommand = vscode.commands.registerCommand('claudeChat.sessionDiagnostics', async () => {
        try {
            const sessionManager = multiSessionProvider.getSessionManager();
            const diagnostics = await sessionManager.getSessionDiagnostics();
            
            // Show diagnostics in a new document
            const doc = await vscode.workspace.openTextDocument({
                content: diagnostics,
                language: 'plaintext'
            });
            
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Ошибка получения диагностики: ${error}`);
        }
    });

    context.subscriptions.push(
        openChatCommand, 
        sendMessageCommand,
        sendBidirectionalCommand,
        debugTerminalsCommand,
        quickSendCommand,
        togglePanelCommand,
        clearHistoryCommand,
        showStatusCommand,
        openMultiSessionCommand,
        createSessionCommand,
        switchSessionCommand,
        closeSessionCommand,
        sessionDiagnosticsCommand,
        multiSessionProvider
    );
    
    outputChannel.appendLine('🎊 All commands registered successfully!');
    outputChannel.appendLine('🚀 Claude Chat extension activation completed!');
    console.log('🚀 Claude Chat extension activation completed!');
}

export function deactivate() {}

// ClaudeChatViewProvider удален - используется только Multi-Session архитектура