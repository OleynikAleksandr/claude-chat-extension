# База знаний: Интеграция VS Code расширения с Claude CLI через Terminal API

**Файл:** `kb_VSCodeTerminalSendText_ClaudeCliIntegration_001.md`  
**Дата создания:** 8 января 2025  
**Версия:** 001  
**Статус:** ✅ РЕШЕНО

## Проблема

Создать расширение VS Code, которое отправляет сообщения из webview интерфейса в терминал с запущенным Claude CLI и автоматически нажимает Enter для отправки.

## Техническое решение

### Архитектура
```
Webview UI → Extension Host → TerminalManager → VS Code Terminal API → Claude CLI
```

### Ключевые компоненты

#### 1. TerminalManager - основной класс для работы с терминалами

**Файл:** `src/terminalManager.ts`

```typescript
export class TerminalManager {
    /**
     * Главный метод для отправки сообщений в Claude CLI
     */
    async sendMessageToClaudeCli(message: string): Promise<TerminalExecutionResult> {
        const executionId = this.generateExecutionId();
        
        try {
            // Поиск терминала с Claude CLI
            const claudeTerminal = await this.getClaudeCliTerminal();
            
            if (!claudeTerminal) {
                // Fallback на активный терминал
                const activeTerminal = await this.getActiveTerminal();
                if (!activeTerminal) {
                    return { success: false, error: { code: 'NO_TERMINAL', message: 'No terminal available' }};
                }
                
                // Автоматически использовать активный терминал без диалогов
                return await this.executeCommand(message, {
                    strategy: TerminalSelectionStrategy.ACTIVE,
                    addNewLine: true
                });
            }

            // Отправка в Claude CLI терминал
            return await this.executeCommand(message, {
                strategy: TerminalSelectionStrategy.CLAUDE_CLI,
                addNewLine: true
            });
        } catch (error) {
            return { success: false, error: { code: 'COMMUNICATION_ERROR', message: 'Failed to send message' }};
        }
    }
}
```

#### 2. Метод выполнения команд с retry механизмом

```typescript
private async executeWithRetry(
    terminal: vscode.Terminal, 
    command: string, 
    addNewLine: boolean, 
    maxRetries: number
): Promise<void> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Фокус на терминал
            terminal.show(true);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Отправка команды
            terminal.sendText(command, addNewLine);
            
            // КРИТИЧЕСКИ ВАЖНО: Дополнительный Enter для Claude CLI
            if (addNewLine) {
                await new Promise(resolve => setTimeout(resolve, 50));
                terminal.sendText('', true); // Пустая строка с Enter
            }
            
            return; // Успех
        } catch (error) {
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
}
```

#### 3. Обнаружение Claude CLI в терминалах

```typescript
/**
 * Мульти-уровневое обнаружение Claude CLI
 */
async detectClaudeCli(terminal: vscode.Terminal): Promise<boolean> {
    const detectionResults = await Promise.all([
        this.detectByTerminalName(terminal),      // По названию
        this.detectByShellPath(terminal),         // По пути shell
        this.detectByEnvironment(terminal),       // По окружению
        this.detectByProcess(terminal)            // По процессам
    ]);

    return detectionResults.some(result => result);
}

private async detectByTerminalName(terminal: vscode.Terminal): Promise<boolean> {
    const terminalName = terminal.name.toLowerCase();
    const claudeKeywords = ['claude', 'claude-cli', 'claude-code', 'anthropic'];
    
    const hasClaudeInName = claudeKeywords.some(keyword => terminalName.includes(keyword));
    
    // Для MVP: менее строгая проверка - активный терминал считается потенциальным Claude CLI
    if (!hasClaudeInName && terminal === vscode.window.activeTerminal) {
        return true; // Лучший UX
    }
    
    return hasClaudeInName;
}
```

#### 4. Webview интеграция

**Файл:** `src/extension.ts`

```typescript
private static async handleSendMessage(webview: vscode.Webview, message: WebviewToExtensionMessage, terminalManager?: TerminalManager): Promise<void> {
    const payload = message.payload as SendMessagePayload;
    
    // Валидация
    if (!payload?.text || payload.text.length > 8000) {
        await ClaudeChatViewProvider.sendError(webview, { /* error details */ });
        return;
    }
    
    try {
        if (terminalManager) {
            // Использование TerminalManager
            const result = await terminalManager.sendMessageToClaudeCli(payload.text);
            
            if (result.success) {
                await ClaudeChatViewProvider.sendMessageResponse(webview, {
                    success: true,
                    message: 'Message sent to Claude CLI successfully',
                    timestamp: Date.now()
                });
            } else {
                await ClaudeChatViewProvider.sendError(webview, {
                    code: result.error?.code || 'COMMUNICATION_ERROR',
                    message: result.error?.message || 'Failed to send message'
                });
            }
        }
    } catch (error) {
        await ClaudeChatViewProvider.sendError(webview, {
            code: 'COMMUNICATION_ERROR',
            message: 'Failed to send message to terminal'
        });
    }
}
```

#### 5. Типизация для безопасности

**Файл:** `src/types.ts`

```typescript
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

export enum ErrorCode {
    NO_TERMINAL = 'NO_TERMINAL',
    TERMINAL_BUSY = 'TERMINAL_BUSY',
    CLAUDE_CLI_NOT_FOUND = 'CLAUDE_CLI_NOT_FOUND',
    MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
    COMMUNICATION_ERROR = 'COMMUNICATION_ERROR',
    USER_CANCELLED = 'USER_CANCELLED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

## Критически важные условия

### 1. Дополнительный Enter для Claude CLI
```typescript
// После terminal.sendText(command, true) нужен дополнительный Enter:
if (addNewLine) {
    await new Promise(resolve => setTimeout(resolve, 50));
    terminal.sendText('', true); // Пустая строка + Enter
}
```

**Причина:** Claude CLI требует дополнительного подтверждения для отправки сообщения.

### 2. Фокус терминала перед отправкой
```typescript
terminal.show(true); // Обязательно показать и сфокусировать
await new Promise(resolve => setTimeout(resolve, 100)); // Пауза для активации
```

### 3. Retry механизм
```typescript
for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
        // попытка выполнения
        return;
    } catch (error) {
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
```

### 4. Fallback стратегия без диалогов
```typescript
// НЕ показывать диалоги подтверждения для лучшего UX
// Автоматически использовать активный терминал
if (!claudeTerminal) {
    const activeTerminal = await this.getActiveTerminal();
    // Использовать сразу без vscode.window.showWarningMessage()
}
```

## Настройка расширения

### package.json конфигурация
```json
{
  "activationEvents": [
    "onCommand:claudeChat.openChat",
    "onView:claudeChatView"
  ],
  "contributes": {
    "commands": [
      {
        "command": "claudeChat.sendMessage",
        "title": "Claude Chat: Send Message to Terminal"
      }
    ],
    "views": {
      "claude-chat-container": [
        {
          "type": "webview",
          "id": "claudeChatView",
          "name": "Claude Chat"
        }
      ]
    }
  }
}
```

### CSP для webview
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
```

## Проблемы и решения

### Проблема 1: Enter не нажимается
**Симптом:** Сообщение появляется в терминале, но не отправляется  
**Решение:** Дополнительный `terminal.sendText('', true)` через 50ms

### Проблема 2: Диалоги подтверждения мешают UX
**Симптом:** VS Code показывает "Claude CLI not detected. Use active terminal?"  
**Решение:** Убрать `vscode.window.showWarningMessage()`, использовать автоматический fallback

### Проблема 3: Терминал не фокусируется
**Симптом:** Команды не попадают в нужный терминал  
**Решение:** `terminal.show(true)` + пауза 100ms

## Версии и эволюция

- **v0.2.7:** Базовая архитектура, CSP исправления
- **v0.2.8:** Первая реализация sendMessageToClaudeCli()
- **v0.2.9:** Убраны навязчивые диалоги
- **v0.3.0:** Детальное логирование для отладки
- **v0.3.1:** ✅ **РАБОЧАЯ ВЕРСИЯ** - дополнительный Enter для Claude CLI

## Тестирование

### Проверочный список
- [ ] Расширение активируется без ошибок
- [ ] Статус показывает `claudeCliRunning: true`
- [ ] Сообщение появляется в терминале
- [ ] Enter автоматически нажимается (сообщение отправляется в Claude CLI)
- [ ] Нет диалогов подтверждения от VS Code

### Команды для тестирования
```bash
# Установка
code --install-extension claude-chat-0.3.1.vsix

# Команды в VS Code
Claude Chat: Show Terminal Status
Claude Chat: Quick Send
```

## Логирование и отладка

### Важные логи для диагностики
```
🔌 Using terminal manager (ID: ...)
📊 Terminal manager result: success=true
[TERMINAL] About to execute: "..." with addNewLine=true
[TERMINAL] ✅ Command sent to terminal successfully!
[TERMINAL] Sending additional Enter to ensure message is sent
```

### Output Channel
- Extension logs: `extension-output-undefined_publisher.claude-chat-#1-Claude Chat`
- Developer Console: Help → Toggle Developer Tools → Console

## Заключение

Успешная интеграция VS Code расширения с Claude CLI достигается через:
1. **VS Code Terminal API** (`terminal.sendText()`)
2. **Дополнительный Enter** для Claude CLI
3. **Robust fallback механизм** без диалогов
4. **Comprehensive error handling**

**Результат:** Пользователь может отправлять сообщения из VS Code sidebar напрямую в Claude CLI с автоматическим Enter.

---
*Документ описывает успешно работающее решение, протестированное 8 января 2025*