# Claude Chat Extension v0.8.4 - Критические исправления

**Дата выпуска:** 9 июля 2025  
**Тип:** Hotfix  
**Приоритет:** Высокий

## 🚨 Критические исправления

### ❌ Проблема в v0.8.3
Версия 0.8.3 содержала критическую ошибку, которая полностью блокировала загрузку webview интерфейса:

```
Uncaught Error: An instance of the VS Code API has already been acquired
at ProcessingStatusBridge.ts:19:23
```

**Причина:** ProcessingStatusBridge пытался повторно получить VS Code API через `acquireVsCodeApi()`, который уже был получен в useVSCodeAPI.

### ✅ Исправления в v0.8.4

1. **Исправлен конфликт VS Code API**
   - ProcessingStatusBridge теперь использует глобальный `vscode` API
   - Убран дублирующий вызов `acquireVsCodeApi()`
   - Добавлено корректное управление event listeners

2. **Улучшена обработка сообщений**
   - Добавлена поддержка `processingStatusUpdate` в useVSCodeAPI
   - Правильная очистка listeners в ProcessingStatusBridge
   - Исправлены TypeScript типы для новых сообщений

## 🎯 Что работает в v0.8.4

### ✅ Базовый функционал
- Webview корректно загружается
- Интерфейс отображается без JavaScript ошибок
- Создание и переключение сессий
- Отправка сообщений в Claude Code

### ✅ Новые возможности (из v0.8.3)
- **Плашка статуса обработки** с отображением времени, токенов и tool calls
- **Умная логика состояний** - 🟢 READY и 🔄 WORKING (анимированный спиннер)
- **Убраны дубли эмодзи** из табов (остались только в заголовке чата)
- **Интеграция с JSONL** для отслеживания токенов в реальном времени

### 🔄 ProcessingStatusBar (готов к тестированию)
```
📊 Processing... ⏱️ 00:15 | 🔢 ↓156 ↑47 tokens | 🔧 3 tools | 💰 $0.008
```

## 🧪 Тестирование

### Установка
```bash
code --install-extension claude-chat-0.8.4.vsix
```

### Проверочный список
- [ ] Webview загружается без ошибок
- [ ] Можно создать новую сессию
- [ ] Отправка сообщений работает
- [ ] Состояния READY/WORKING переключаются корректно
- [ ] В консоли разработчика нет JavaScript ошибок

### Ожидаемые логи
```
📊 ProcessingStatusManager initialized
🔗 Enhanced Provider received state update: 0 sessions
✅ sessionStatesUpdated sent successfully
```

## 🔍 Технические детали

### Архитектура исправлений
```
Глобальный vscode API (useVSCodeAPI)
     ↓
ProcessingStatusBridge (использует тот же API)
     ↓
ProcessingStatusBar (React компонент)
```

### Измененные файлы
- `ProcessingStatusBridge.ts` - убран `acquireVsCodeApi()`, добавлен правильный API
- `useVSCodeAPI.ts` - поддержка новых команд processing status
- `package.json` - версия обновлена до 0.8.4

## 📋 Известные ограничения

1. **Первое сообщение в сессии** может не показать плашку (инициализация JSONL мониторинга)
2. **Tool calls** отслеживаются только из JSONL логов Claude Code
3. **ESC прерывание** реализовано в UI, но требует интеграции с Claude Code CLI

## 🎯 Следующие шаги

После подтверждения работоспособности v0.8.4:
1. Доработка точного отслеживания tool calls
2. Реализация ESC прерывания работы ассистента
3. Оптимизация производительности плашки статуса

---

**Приоритет установки:** 🚨 **КРИТИЧЕСКИЙ** - v0.8.3 полностью нерабочий  
**Совместимость:** VS Code 1.60+, Node.js 16+  
**Размер:** 551.86 KB
EOF < /dev/null