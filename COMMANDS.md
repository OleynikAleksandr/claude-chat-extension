# SuperClaude Commands Reference v2.0.1

## Table of Contents
- [Quick Start](#quick-start)
- [Universal Flags (Available on ALL Commands)](#universal-flags-available-on-all-commands)
- [Personas as Flags](#personas-as-flags)
- [Complete Command Reference](#complete-command-reference)
- [Flag Combinations & Best Practices](#flag-combinations--best-practices)

---

## Quick Start

**Basic Usage**: `/command [flags] [arguments]`

**Example Commands**:
bash
/review --files src/ --quality --evidence    # Comprehensive code review with evidence
/analyze --code --persona-architect          # Code analysis with architect mindset
/build --react --magic --tdd                # Build React app with AI components
/troubleshoot --prod --five-whys --seq      # Production debugging with reasoning
/task:create "Add user authentication"       # Create and manage complex features
/deploy --env prod --plan --validate        # Safe production deployment


---

## Universal Flags (Available on ALL Commands)

### 🧠 Управление глубиной мышления
- `--think` - Анализ нескольких файлов с расширенным контекстом (~4K токенов)
- `--think-hard` - Анализ на архитектурном уровне (~10K токенов)
- `--ultrathink` - Критический системный анализ с максимальной глубиной (~32K токенов)

### 📦 Оптимизация токенов
- `--uc` (`--ultracompressed`) - Активация режима UltraCompressed (значительное сокращение токенов)

### 🔧 Управление MCP серверами
- `--c7` - Включить поиск документации Context7
- `--seq` - Включить последовательный анализ мышления
- `--magic` - Включить генерацию компонентов Magic UI
- `--pup` - Включить автоматизацию браузера Puppeteer
- `--all-mcp` - Включить все MCP серверы для максимальных возможностей
- `--no-mcp` - Отключить все MCP серверы (только встроенные инструменты)
- `--no-c7` - Отключить конкретно Context7
- `--no-seq` - Отключить конкретно Sequential thinking
- `--no-magic` - Отключить конкретно Magic UI builder
- `--no-pup` - Отключить конкретно Puppeteer

### 🔍 Анализ и интроспекция
- `--introspect` - Включить самосознательный анализ с когнитивной прозрачностью

### 📋 Планирование и выполнение
- `--plan` - Показать детальный план выполнения перед запуском
- `--dry-run` - Предварительный просмотр изменений без выполнения
- `--watch` - Непрерывный мониторинг с обратной связью в реальном времени
- `--interactive` - Пошаговый управляемый процесс
- `--force` - Переопределить проверки безопасности (используйте с осторожностью)

### ✅ Качество и валидация
- `--validate` - Улучшенные проверки безопасности перед выполнением
- `--security` - Анализ и валидация, сфокусированные на безопасности
- `--coverage` - Генерация всестороннего анализа покрытия
- `--strict` - Режим нулевой терпимости с улучшенной валидацией

---

## Персоны как флаги

Все персоны теперь интегрированы как флаги, доступные для каждой команды:

- `--persona-architect` - Системное мышление, масштабируемость, паттерны. Лучше всего для архитектурных решений, системного дизайна
- `--persona-frontend` - Одержимость UI/UX, доступность превыше всего. Лучше всего для пользовательских интерфейсов, дизайна компонентов
- `--persona-backend` - APIs, базы данных, надежность. Лучше всего для серверной архитектуры, моделирования данных
- `--persona-analyzer` - Анализ основных причин, доказательный подход. Лучше всего для сложной отладки, расследований
- `--persona-security` - Моделирование угроз, zero-trust, OWASP. Лучше всего для аудитов безопасности, оценки уязвимостей
- `--persona-mentor` - Обучение, направляемое обучение, ясность. Лучше всего для документации, передачи знаний
- `--persona-refactorer` - Качество кода, сопровождаемость. Лучше всего для очистки кода, технического долга
- `--persona-performance` - Оптимизация, профилирование, эффективность. Лучше всего для настройки производительности, узких мест
- `--persona-qa` - Тестирование, граничные случаи, валидация. Лучше всего для обеспечения качества, покрытия тестами

---

## Полный справочник команд

### 🛠️ Команды разработки (3)

#### `/build` - Универсальный сборщик проектов
Сборка проектов, функций и компонентов с использованием современных шаблонов стека.

**Специальные флаги команды:**
- `--init` - Инициализация нового проекта с настройкой стека
- `--feature` - Реализация функции с использованием существующих паттернов
- `--tdd` - Рабочий процесс разработки через тестирование
- `--react` - React с Vite, TypeScript, Router
- `--api` - Express.js API с TypeScript
- `--fullstack` - Полный React + Node.js + Docker
- `--mobile` - React Native с Expo
- `--cli` - Commander.js CLI с тестированием

**Examples:**
bash
/build --init --react --magic --tdd         # New React app with AI components
/build --feature "auth system" --tdd        # Feature with tests
/build --api --openapi --seq                # API with documentation


#### `/dev-setup` - Среда разработки
Настройка профессиональных сред разработки с CI/CD и мониторингом.

**Специальные флаги команды:**
- `--install` - Установка и настройка зависимостей
- `--ci` - Настройка CI/CD пайплайна
- `--monitor` - Настройка мониторинга и обсервабилити
- `--docker` - Настройка контейнеризации
- `--testing` - Инфраструктура тестирования
- `--team` - Инструменты командной работы
- `--standards` - Стандарты качества кода

**Examples:**
bash
/dev-setup --install --ci --monitor         # Complete environment
/dev-setup --team --standards --docs        # Team setup


#### `/test` - Всеобъемлющая система тестирования
Создание, запуск и поддержка стратегий тестирования по всему стеку.

**Специальные флаги команды:**
- `--e2e` - Сквозное тестирование
- `--integration` - Интеграционное тестирование
- `--unit` - Модульное тестирование
- `--visual` - Визуальное регрессионное тестирование
- `--mutation` - Мутационное тестирование
- `--performance` - Тестирование производительности
- `--accessibility` - Тестирование доступности
- `--parallel` - Параллельное выполнение тестов

**Examples:**
bash
/test --coverage --e2e --pup               # Full test suite
/test --mutation --strict                  # Test quality validation


### 🔍 Команды анализа и улучшения (5)

#### `/review` - Обзор кода на основе AI
Всеобъемлющий обзор кода и анализ качества с рекомендациями, основанными на доказательствах.

**Специальные флаги команды:**
- `--files` - Обзор конкретных файлов или каталогов
- `--commit` - Обзор изменений в указанном коммите (HEAD, hash, range)
- `--pr` - Обзор изменений pull request (git diff main..branch)
- `--quality` - Фокус на проблемах качества кода (DRY, SOLID, сложность)
- `--evidence` - Включить источники и документацию для всех предложений
- `--fix` - Предложить конкретные исправления для выявленных проблем
- `--summary` - Сгенерировать сводку результатов обзора

**Examples:**
bash
/review --files src/auth.ts --persona-security    # Security-focused file review
/review --commit HEAD --quality --evidence        # Quality review with sources
/review --pr 123 --all --interactive             # Comprehensive PR review
/review --files src/ --persona-performance --think # Performance analysis


#### `/analyze` - Многомерный анализ
Всеобъемлющий анализ кода, архитектуры, производительности и безопасности.

**Специальные флаги команды:**
- `--code` - Анализ качества кода
- `--architecture` - Оценка системного дизайна
- `--profile` - Профилирование производительности
- `--deps` - Анализ зависимостей
- `--surface` - Быстрый обзор
- `--deep` - Всеобъемлющий анализ
- `--forensic` - Детальное расследование

**Examples:**
bash
/analyze --code --architecture --seq       # Full analysis
/analyze --profile --deep --persona-performance  # Performance deep-dive


#### `/troubleshoot` - Профессиональная отладка
Систематическая отладка и решение проблем.

**Специальные флаги команды:**
- `--investigate` - Систематический анализ проблем
- `--five-whys` - Анализ основных причин
- `--prod` - Отладка продакшена
- `--perf` - Исследование производительности
- `--fix` - Полное решение
- `--hotfix` - Срочные исправления
- `--rollback` - Безопасный откат

**Examples:**
bash
/troubleshoot --prod --five-whys --seq    # Production RCA
/troubleshoot --perf --fix --pup          # Performance fix


#### `/improve` - Улучшение и оптимизация
Улучшения, основанные на доказательствах, с измеримыми результатами.

**Специальные флаги команды:**
- `--quality` - Улучшение структуры кода
- `--performance` - Оптимизация производительности
- `--accessibility` - Улучшение доступности
- `--iterate` - Итеративное улучшение
- `--threshold` - Целевой процент качества
- `--refactor` - Систематический рефакторинг
- `--modernize` - Обновление технологий

**Examples:**
bash
/improve --quality --iterate --threshold 95%    # Quality improvement
/improve --performance --cache --pup            # Performance boost


#### `/explain` - Техническая документация
Генерация всеобъемлющих объяснений и документации.

**Специальные флаги команды:**
- `--depth` - Уровень сложности (ELI5|beginner|intermediate|expert)
- `--visual` - Включить диаграммы
- `--examples` - Примеры кода
- `--api` - Документация API
- `--architecture` - Системная документация
- `--tutorial` - Обучающие руководства
- `--reference` - Справочная документация

**Examples:**
bash
/explain --depth expert --visual --seq     # Expert documentation
/explain --api --examples --c7             # API docs with examples


### ⚙️ Операционные команды (6)

#### `/deploy` - Развёртывание приложений
Безопасное развёртывание с возможностью отката.

**Специальные флаги команды:**
- `--env` - Целевая среда (dev|staging|prod)
- `--canary` - Canary развёртывание
- `--blue-green` - Blue-green развёртывание
- `--rolling` - Постепенное развёртывание
- `--checkpoint` - Создать контрольную точку
- `--rollback` - Откат к предыдущей версии
- `--monitor` - Мониторинг после развёртывания

**Examples:**
bash
/deploy --env prod --canary --monitor      # Canary production deploy
/deploy --rollback --env prod              # Emergency rollback


#### `/migrate` - Миграция базы данных и кода
Безопасные миграции с возможностью отката.

**Специальные флаги команды:**
- `--database` - Миграции базы данных
- `--code` - Миграции кода
- `--config` - Миграции конфигурации
- `--dependencies` - Обновление зависимостей
- `--backup` - Сначала создать резервную копию
- `--rollback` - Откат миграции
- `--validate` - Проверки целостности данных

**Examples:**
bash
/migrate --database --backup --validate    # Safe DB migration
/migrate --code --dry-run                  # Preview code changes


#### `/scan` - Безопасность и валидация
Всеобъемлющий аудит безопасности и соответствие стандартам.

**Специальные флаги команды:**
- `--owasp` - Соответствие OWASP Top 10
- `--secrets` - Обнаружение секретов
- `--compliance` - Нормативное соответствие
- `--quality` - Валидация качества кода
- `--automated` - Непрерывный мониторинг

**Examples:**
bash
/scan --security --owasp --deps           # Security audit
/scan --compliance --gdpr --strict        # Compliance check


#### `/estimate` - Оценка проекта
Профессиональная оценка с анализом рисков.

**Специальные флаги команды:**
- `--detailed` - Детальная декомпозиция
- `--rough` - Быстрая оценка
- `--worst-case` - Пессимистичная оценка
- `--agile` - Оценка по стори поинтам
- `--complexity` - Техническая оценка
- `--resources` - Планирование ресурсов
- `--timeline` - Планирование сроков
- `--risk` - Оценка рисков

**Examples:**
bash
/estimate --detailed --complexity --risk   # Full estimation
/estimate --agile --story-points          # Agile planning


#### `/cleanup` - Обслуживание проекта
Профессиональная очистка с проверками безопасности.

**Специальные флаги команды:**
- `--code` - Удалить мертвый код
- `--files` - Очистить артефакты сборки
- `--deps` - Удалить неиспользуемые зависимости
- `--git` - Очистить git репозиторий
- `--all` - Всеобъемлющая очистка
- `--aggressive` - Глубокая очистка
- `--conservative` - Безопасная очистка

**Examples:**
bash
/cleanup --all --dry-run                  # Preview cleanup
/cleanup --code --deps --validate         # Code cleanup


#### `/git` - Управление Git рабочим процессом
Профессиональные Git операции с функциями безопасности.

**Специальные флаги команды:**
- `--status` - Статус репозитория
- `--commit` - Профессиональный коммит
- `--branch` - Управление ветками
- `--sync` - Синхронизация с удалённым репозиторием
- `--checkpoint` - Создать контрольную точку
- `--merge` - Умное слияние
- `--history` - Анализ истории
- `--pre-commit` - Настройка и запуск pre-commit хуков

**Examples:**
bash
/git --checkpoint "before refactor"       # Safety checkpoint
/git --commit --validate --test          # Safe commit
/git --pre-commit                        # Setup pre-commit hooks
/git --commit --pre-commit               # Commit with validation


### 🎨 Команды дизайна и архитектуры (1)

#### `/design` - Системная архитектура
Профессиональный системный дизайн со спецификациями.

**Специальные флаги команды:**
- `--api` - Дизайн REST/GraphQL
- `--ddd` - Предметно-ориентированный дизайн
- `--microservices` - Архитектура микросервисов
- `--event-driven` - Событийные паттерны
- `--openapi` - Спецификации OpenAPI
- `--graphql` - Схема GraphQL
- `--bounded-context` - Контексты DDD
- `--integration` - Паттерны интеграции

**Examples:**
bash
/design --api --ddd --openapi --seq      # API with DDD
/design --microservices --event-driven   # Microservices design


### 🔄 Команды рабочего процесса (4)

#### `/spawn` - Специализированные агенты
Создание специализированных агентов для параллельных задач.

**Специальные флаги команды:**
- `--task` - Определить конкретную задачу
- `--parallel` - Одновременное выполнение
- `--specialized` - Предметная экспертиза
- `--collaborative` - Мультиагентная работа
- `--sync` - Синхронизация результатов
- `--merge` - Объединение выводов

**Examples:**
bash
/spawn --task "frontend tests" --parallel  # Parallel testing
/spawn --collaborative --sync              # Team simulation


#### `/document` - Создание документации
Профессиональная документация в множественных форматах.

**Специальные флаги команды:**
- `--user` - Руководства пользователя
- `--technical` - Документация разработчика
- `--markdown` - Формат Markdown
- `--interactive` - Интерактивная документация
- `--multilingual` - Многоязычность
- `--maintain` - План обслуживания

**Examples:**
bash
/document --api --interactive --examples   # API documentation
/document --user --visual --multilingual   # User guides


#### `/load` - Загрузка контекста проекта
Загрузка и анализ контекста проекта.

**Специальные флаги команды:**
- `--depth` - Глубина анализа (shallow|normal|deep)
- `--context` - Сохранение контекста
- `--patterns` - Распознавание паттернов
- `--relationships` - Маппинг зависимостей
- `--structure` - Структура проекта
- `--health` - Здоровье проекта
- `--standards` - Стандарты кодирования

**Examples:**
bash
/load --depth deep --patterns --seq       # Deep analysis
/load --structure --health --standards   # Project assessment


#### `/task` - Управление задачами
Комплексное управление функциями между сессиями с автоматической декомпозицией и восстановлением.

**Специальные операции команды:**
- `/task:create [description]` - Создать новую задачу с автоматической декомпозицией
- `/task:status [task-id]` - Проверить статус задачи и прогресс
- `/task:resume [task-id]` - Возобновить работу после перерыва
- `/task:update [task-id] [updates]` - Обновить прогресс задачи и требования
- `/task:complete [task-id]` - Отметить задачу как выполненную со сводкой

**Ключевые возможности:**
- **Умная декомпозиция**: Автоматический анализ сложности и создание подзадач
- **Сохранение контекста**: Сохранение рабочего состояния между сессиями
- **Отслеживание прогресса**: Автоматические обновления и обнаружение блокировок
- **Восстановление сессии**: Возобновление с контрольных точек с полным контекстом

**Examples:**
bash
/task:create "Implement OAuth 2.0 authentication system"  # Create complex feature
/task:status oauth-task-id                               # Check progress
/task:resume oauth-task-id                               # Resume after break
/task:update oauth-task-id "Found library conflict"      # Update with discoveries
/task:complete oauth-task-id                             # Complete with summary


---

## Комбинации флагов и лучшие практики

### 🚀 Профессиональные рабочие процессы

**Полностековая разработка**
bash
/design --api --ddd --persona-architect
/build --fullstack --tdd --magic
/test --coverage --e2e --pup
/deploy --env staging --validate


**Разработка с приоритетом безопасности**
bash
/scan --security --owasp --deps --persona-security
/analyze --security --forensic --seq
/improve --security --validate --strict
/test --security --coverage


**Оптимизация производительности**
bash
/analyze --profile --deep --persona-performance
/troubleshoot --perf --investigate --pup
/improve --performance --iterate --threshold 90%
/test --performance --load


**Обеспечение качества**
bash
/review --quality --evidence --persona-qa
/improve --quality --refactor --strict
/scan --validate --quality
/test --coverage --mutation


### 💡 Лучшие практики

1. **Always validate risky operations**
   bash
   /deploy --env prod --validate --plan
   /migrate --database --dry-run --backup
   

2. **Use personas for specialized expertise**
   bash
   /analyze --architecture --persona-architect
   /scan --security --persona-security
   

3. **Combine MCP servers for maximum capability**
   bash
   /build --react --magic --seq --c7
   /test --e2e --pup --coverage
   

4. **Progressive thinking for complex tasks**
   bash
   /troubleshoot --investigate --think
   /design --microservices --think-hard
   /analyze --architecture --ultrathink
   

### 🎯 Краткая справка

**Операции высокого риска**: Всегда используйте `--validate` или `--dry-run`
**Задачи документации**: Включите `--c7` для поиска в библиотеках
**Сложный анализ**: Используйте `--seq` для рассуждений
**Разработка UI**: Включите `--magic` для AI компонентов
**Тестирование**: Используйте `--pup` для автоматизации браузера
**Экономия токенов**: Добавьте `--uc` для 70% сокращения

---

**SuperClaude v2.0.1** - 19 professional commands | 9 cognitive personas | Advanced MCP integration | Evidence-based methodology
