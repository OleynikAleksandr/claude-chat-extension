# Release Notes v0.10.42

**Дата релиза:** 11 июля 2025  
**Версия:** 0.10.42  
**Размер:** 595.58KB (82 файла)  

## 🚀 Основные изменения

### ⚡ Обновление слэш-команд
Полностью обновлена система слэш-команд с заменой кастомных команд на стандартные команды Claude Code CLI.

### ❌ Удалено (10 кастомных команд):
- `/analyze` - Multi-dimensional code and system analysis
- `/build` - Universal project builder with stack templates  
- `/cleanup` - Project cleanup and maintenance
- `/deploy` - Safe application deployment with rollback
- `/design` - System architecture and API design
- `/dev-setup` - Professional development environment setup
- `/document` - Professional documentation creation
- `/estimate` - Project complexity and time estimation
- `/explain` - Technical documentation and knowledge transfer
- `/git` - Git workflow with checkpoint management

### ✅ Добавлено (29 стандартных команд Claude Code):

#### Основные команды:
- `/add-dir` 📁 - Add a new working directory
- `/bug` 🐛 - Submit feedback about Claude Code
- `/clear` 🗑️ - Clear conversation history and free up context
- `/compact` 📦 - Clear conversation history but keep a summary in context
- `/config` ⚙️ - Open config panel
- `/cost` 💰 - Show the total cost and duration of the current session
- `/doctor` 🩺 - Checks the health of your Claude Code installation
- `/exit` 🚪 - Exit the REPL
- `/export` 📤 - Export the current conversation to a file or clipboard
- `/help` ❓ - Show help and available commands

#### Управление и настройки:
- `/hooks` 🪝 - Manage hook configurations for tool events
- `/ide` 💻 - Manage IDE integrations and show status
- `/init` 🆕 - Initialize a new CLAUDE.md file with codebase documentation
- `/install-github-app` 🔧 - Set up Claude GitHub Actions for a repository
- `/login` 🔑 - Sign in with your Anthropic account
- `/logout` 🚪 - Sign out from your Anthropic account
- `/mcp` 🔌 - Manage MCP servers
- `/memory` 🧠 - Edit Claude memory files
- `/migrate-installer` 📦 - Migrate from global npm installation to local installation

#### Рабочие команды:
- `/model` 🤖 - Set the AI model for Claude Code
- `/permissions` 🔒 - Manage allow & deny tool permission rules
- `/pr-comments` 💬 - Get comments from a GitHub pull request
- `/release-notes` 📝 - View release notes
- **`/resume` ▶️ - Resume a conversation** ⭐
- `/review` 👀 - Review a pull request
- `/status` 📊 - Show Claude Code status including version, model, account, API connectivity, and tool statuses
- `/terminal-setup` ⌨️ - Install Shift+Enter key binding for newlines
- `/upgrade` ⬆️ - Upgrade to Max for higher rate limits and more Opus
- `/vim` 📝 - Toggle between Vim and Normal editing modes

## 🔧 Технические изменения

### TypeScript типы:
- Добавлена категория `'claude-code'` в интерфейс `SlashCommand`
- Обновлены типы команд в `SlashCommands.ts`

### Компоненты:
- Все команды теперь имеют соответствующие иконки
- Команды сгруппированы по категории `'claude-code'`
- Сохранена полная совместимость с существующим UI

### Сборка:
- ✅ TypeScript компиляция прошла успешно
- ✅ Webpack сборка webview компонентов завершена
- ⚠️ Размер bundle.js: 1.6 MiB (предупреждение о размере)
- ✅ VSIX пакет создан: `claude-chat-0.10.42.vsix`

## 📋 Что изменилось для пользователя

### Улучшенная интеграция с Claude Code:
- Все слэш-команды теперь соответствуют официальным командам Claude Code CLI
- Добавлена важная команда `/resume` для возобновления разговоров
- Улучшена категоризация команд

### Сохраненная функциональность:
- Автодополнение слэш-команд работает как прежде
- Навигация клавишами ↑↓ и Enter
- Фильтрация команд по названию и описанию
- Визуальные иконки для каждой команды

## 🚨 Breaking Changes
**Важно:** Все предыдущие кастомные команды удалены. Если в вашем workflow использовались команды `/analyze`, `/build`, `/cleanup` и другие кастомные команды, они больше не доступны.

## 📦 Установка
1. Закройте VS Code
2. Установите новое расширение: `claude-chat-0.10.42.vsix`
3. Перезапустите VS Code
4. Проверьте работу слэш-команд в Claude Chat

## 🐛 Известные проблемы
- Размер bundle.js превышает рекомендуемый лимит (1.6 MiB)
- Рекомендуется оптимизация через code splitting в будущих версиях

## 🎯 Следующие планы
- Оптимизация размера bundle
- Добавление функциональных обработчиков для команд
- Интеграция с Claude Code CLI для выполнения команд

---
**Тестирование:** Полная функциональность проверена  
**Совместимость:** VS Code 1.60+  
**Зависимости:** Node.js, npm, Claude Code CLI
EOF < /dev/null