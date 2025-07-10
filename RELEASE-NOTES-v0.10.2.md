# Release Notes v0.10.2

## 🎯 Smart Service Status Detection

**Release Date:** 10 июля 2025  
**Version:** 0.10.2  
**Previous Version:** 0.10.1  

## 🚀 Major Improvements

### Smart Status Detection Based on Claude Code JSONL
Реализована интеллектуальная система определения статуса ServiceInfoBlock на основе анализа JSONL файлов Claude Code.

**Новая логика статусов:**
- 🔄 **Processing** - активная работа с инструментами
- ✅ **Completed** - только при `stop_reason: null` (готов принять новое сообщение)

### Key Features

#### 🔧 Precise Status Detection
- **stop_reason: null** → **COMPLETED** (готов к новому сообщению от пользователя)
- **stop_reason: "tool_use"** → **PROCESSING** (использует инструменты)
- **stop_reason: undefined** → **PROCESSING** (активная работа)

#### 📊 Enhanced JSONL Monitoring
- Добавлена поддержка полей `stop_reason` и `stop_sequence`
- Улучшенная система парсинга Claude Code JSONL
- Точная синхронизация с состоянием диалога

#### 🎨 Improved UX
- ServiceInfoBlock больше не показывает "completed" в промежутках
- Статус "completed" отображается только когда Claude действительно готов
- Устранены ложные срабатывания статуса завершения

## 🔧 Technical Changes

### JsonlResponseMonitor.ts
- Добавлен интерфейс `ClaudeCodeJsonlEntry` с поддержкой `stop_reason`
- Новый метод `determineStatusFromStopReason()` для точного определения статуса
- Улучшенная логика обработки JSONL записей

### Architecture
- Map-based решение для управления serviceInfo по sessionId
- Правильная обработка race conditions
- Оптимизированная производительность мониторинга

## 🏆 Impact

### For Users
- **Точная индикация статуса** - больше никаких ложных "completed"
- **Лучший UX** - понятно когда Claude работает, а когда готов к новому сообщению
- **Надежность** - стабильная работа в мультисессионном режиме

### For Developers
- **Clean API** - четкая архитектура status detection
- **Extensible** - легко добавлять новые типы статусов
- **Debuggable** - подробное логирование для диагностики

## 🐛 Bug Fixes

- Исправлена проблема отсутствия ServiceInfoBlock в v0.10.0
- Устранен race condition с activeSessionId
- Исправлено динамическое позиционирование плашки

## 🔄 Migration Notes

### From v0.10.1
- Автоматическая миграция, изменения не требуются
- Улучшенная точность статусов без breaking changes

### Backward Compatibility
- Полная совместимость с существующими JSONL файлами
- Поддержка старого формата Claude Code для legacy sessions

## 📈 Performance

- **Reduced CPU usage** - меньше ложных обновлений UI
- **Better memory management** - оптимизированное кэширование
- **Faster response time** - точная детекция без задержек

## 🔮 Coming Next

- Enhanced tool monitoring with detailed execution times
- Advanced status types (thinking, analyzing, etc.)
- Real-time performance metrics

## 📞 Feedback

Если вы столкнулись с проблемами или у вас есть предложения:
- GitHub Issues: [Report Bug](https://github.com/OleynikAleksandr/claude-chat-extension/issues)
- Feature Requests: [Request Feature](https://github.com/OleynikAleksandr/claude-chat-extension/issues/new)

---

**Claude Chat Extension v0.10.2**  
*Precise. Reliable. Smart.*
EOF < /dev/null