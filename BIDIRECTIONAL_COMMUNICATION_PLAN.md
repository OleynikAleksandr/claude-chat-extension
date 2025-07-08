# 🚀 ПОДРОБНЫЙ ПЛАН РЕАЛИЗАЦИИ ДВУСТОРОННЕЙ СВЯЗИ С CLAUDE CODE

## 📋 ОБЩАЯ АРХИТЕКТУРА (3 уровня)

### **🔄 Уровень 1: Real-time Communication**
**Источник:** [claude-code-chat by Andre Pimenta](https://github.com/andrepimenta/claude-code-chat)  
**Приоритет:** КРИТИЧЕСКИЙ

### **📁 Уровень 2: Persistence & History**
**Источник:** [Claude Code Usage Monitor by Maciek](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor)  
**Приоритет:** ВЫСОКИЙ

### **📊 Уровень 3: Analytics & Monitoring**
**Источник:** Комбинация обоих проектов  
**Приоритет:** СРЕДНИЙ

---

## 🔄 **УРОВЕНЬ 1: REAL-TIME COMMUNICATION**

### **1.1 Claude Process Manager**

**Ключевой код из:** [extension.ts:375-401](https://raw.githubusercontent.com/andrepimenta/claude-code-chat/main/src/extension.ts)

```typescript
class ClaudeProcessManager {
    private currentProcess?: cp.ChildProcess;
    
    spawnClaudeProcess(message: string, sessionId?: string): cp.ChildProcess {
        const args = [
            '-p',
            '--output-format', 'stream-json', 
            '--verbose',
            '--dangerously-skip-permissions'
        ];
        
        // Session resume support
        if (sessionId) {
            args.push('--resume', sessionId);
        }
        
        // WSL support (из claude-code-chat)
        const config = vscode.workspace.getConfiguration('claudeCodeChat');
        const wslEnabled = config.get<boolean>('wsl.enabled', false);
        
        if (wslEnabled) {
            const wslDistro = config.get<string>('wsl.distro', 'Ubuntu');
            return cp.spawn('wsl', ['-d', wslDistro, 'claude', ...args], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { FORCE_COLOR: '0', NO_COLOR: '1' }
            });
        } else {
            return cp.spawn('claude', args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { FORCE_COLOR: '0', NO_COLOR: '1' }
            });
        }
    }
}
```

### **1.2 Stream JSON Parser**

**Ключевой код из:** [extension.ts:415-434](https://raw.githubusercontent.com/andrepimenta/claude-code-chat/main/src/extension.ts)

```typescript
class StreamJsonParser {
    private rawOutput = '';
    
    handleStreamData(data: Buffer, callback: (jsonData: any) => void): void {
        this.rawOutput += data.toString();
        
        // Построчная обработка - критический алгоритм!
        const lines = this.rawOutput.split('\n');
        this.rawOutput = lines.pop() || ''; // Сохраняем неполную строку
        
        for (const line of lines) {
            if (line.trim()) {
                try {
                    const jsonData = JSON.parse(line.trim());
                    callback(jsonData);
                } catch (error) {
                    console.log('Failed to parse JSON line:', line, error);
                }
            }
        }
    }
}
```

### **1.3 Message Type Handler**

**Детали из:** [extension.ts:488-679](https://raw.githubusercontent.com/andrepimenta/claude-code-chat/main/src/extension.ts)

```typescript
class MessageTypeHandler {
    processJsonStreamData(jsonData: any): ProcessedMessage {
        switch (jsonData.type) {
            case 'assistant':
                return this.handleAssistantMessage(jsonData);
                
            case 'user':
                return this.handleUserMessage(jsonData);
                
            case 'result':
                return this.handleResultMessage(jsonData);
                
            default:
                return { type: 'unknown', data: jsonData };
        }
    }
    
    private handleAssistantMessage(jsonData: any): ProcessedMessage {
        // Фильтрация content по типам
        for (const content of jsonData.message.content) {
            if (content.type === 'text') {
                return { type: 'text', data: content.text.trim() };
            } else if (content.type === 'thinking') {
                return { type: 'thinking', data: content.thinking.trim() };
            } else if (content.type === 'tool_use') {
                return { 
                    type: 'tool_use', 
                    data: {
                        toolName: content.name,
                        toolInput: content.input
                    }
                };
            }
        }
    }
}
```

### **1.4 Интеграция с существующим TerminalManager**

```typescript
// Расширение нашего TerminalManager
class EnhancedTerminalManager extends TerminalManager {
    private claudeProcessManager = new ClaudeProcessManager();
    private streamParser = new StreamJsonParser();
    private messageHandler = new MessageTypeHandler();
    
    async sendMessageBidirectional(message: string): Promise<void> {
        const process = this.claudeProcessManager.spawnClaudeProcess(message);
        
        process.stdout?.on('data', (data) => {
            this.streamParser.handleStreamData(data, (jsonData) => {
                const processed = this.messageHandler.processJsonStreamData(jsonData);
                this.sendToWebview(processed);
            });
        });
        
        // Отправляем сообщение
        process.stdin?.write(message + '\n');
        process.stdin?.end();
    }
}
```

---

## 📁 **УРОВЕНЬ 2: PERSISTENCE & HISTORY**

### **2.1 JSONL Data Reader**

**Источник:** [data_loader.py](https://raw.githubusercontent.com/Maciek-roboblog/Claude-Code-Usage-Monitor/main/usage_analyzer/core/data_loader.py)

```typescript
class ClaudeDataReader {
    private readonly CLAUDE_DATA_PATHS = [
        path.join(os.homedir(), '.claude', 'projects'),
        path.join(os.homedir(), '.config', 'claude', 'projects')
    ];
    
    async discoverJSONLFiles(): Promise<string[]> {
        const files: string[] = [];
        
        for (const basePath of this.CLAUDE_DATA_PATHS) {
            if (await this.pathExists(basePath)) {
                const jsonlFiles = await glob(path.join(basePath, '**/*.jsonl'));
                files.push(...jsonlFiles);
            }
        }
        
        return files.sort((a, b) => {
            // Сортировка по modification time
            const statA = fs.statSync(a);
            const statB = fs.statSync(b);
            return statB.mtime.getTime() - statA.mtime.getTime();
        });
    }
    
    async loadUsageEntries(files: string[]): Promise<ClaudeUsageEntry[]> {
        const entries: ClaudeUsageEntry[] = [];
        const seenHashes = new Set<string>();
        
        for (const file of files) {
            const content = await fs.readFile(file, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    const hash = this.createEntryHash(entry);
                    
                    if (!seenHashes.has(hash)) {
                        seenHashes.add(hash);
                        entries.push(this.parseUsageEntry(entry));
                    }
                } catch (error) {
                    console.warn('Failed to parse JSONL line:', error);
                }
            }
        }
        
        return entries.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }
}
```

### **2.2 Session Recovery**

```typescript
class SessionRecovery {
    constructor(private dataReader: ClaudeDataReader) {}
    
    async findSessionData(sessionId: string): Promise<SessionData | null> {
        const files = await this.dataReader.discoverJSONLFiles();
        const entries = await this.dataReader.loadUsageEntries(files);
        
        // Ищем записи для конкретной сессии
        const sessionEntries = entries.filter(entry => 
            entry.sessionId === sessionId
        );
        
        if (sessionEntries.length === 0) return null;
        
        return {
            sessionId,
            messages: sessionEntries.map(entry => entry.message),
            totalTokens: sessionEntries.reduce((sum, e) => sum + e.tokens, 0),
            totalCost: sessionEntries.reduce((sum, e) => sum + e.cost, 0),
            startTime: sessionEntries[0].timestamp,
            endTime: sessionEntries[sessionEntries.length - 1].timestamp
        };
    }
    
    async getRecentSessions(limit: number = 10): Promise<SessionSummary[]> {
        const files = await this.dataReader.discoverJSONLFiles();
        const entries = await this.dataReader.loadUsageEntries(files);
        
        // Группируем по sessionId
        const sessionGroups = this.groupBySession(entries);
        
        return Object.values(sessionGroups)
            .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.startTime).getTime())
            .slice(0, limit);
    }
}
```

### **2.3 Conversation History Manager**

```typescript
class ConversationHistoryManager {
    constructor(
        private dataReader: ClaudeDataReader,
        private sessionRecovery: SessionRecovery
    ) {}
    
    async loadConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
        const sessionData = await this.sessionRecovery.findSessionData(sessionId);
        
        if (!sessionData) {
            console.warn(`Session ${sessionId} not found in JSONL logs`);
            return [];
        }
        
        return sessionData.messages.map(msg => ({
            timestamp: msg.timestamp,
            type: msg.type,
            content: msg.content,
            tokens: msg.tokens,
            cost: msg.cost
        }));
    }
    
    async saveConversationSnapshot(sessionId: string, messages: any[]): Promise<void> {
        // Дополнительное сохранение в нашем формате
        const snapshot = {
            sessionId,
            timestamp: new Date().toISOString(),
            messages,
            source: 'real-time-capture'
        };
        
        const snapshotPath = path.join(
            os.homedir(), 
            '.claude-chat-extension', 
            'snapshots',
            `${sessionId}.json`
        );
        
        await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
    }
}
```

---

## 📊 **УРОВЕНЬ 3: ANALYTICS & MONITORING**

### **3.1 Usage Analytics**

**Идеи из:** [calculator.py](https://raw.githubusercontent.com/Maciek-roboblog/Claude-Code-Usage-Monitor/main/usage_analyzer/core/calculator.py)

```typescript
class UsageAnalytics {
    constructor(private dataReader: ClaudeDataReader) {}
    
    async calculateBurnRate(): Promise<BurnRateInfo> {
        const files = await this.dataReader.discoverJSONLFiles();
        const entries = await this.dataReader.loadUsageEntries(files);
        
        // Анализ последнего часа
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentEntries = entries.filter(entry => 
            new Date(entry.timestamp) > oneHourAgo
        );
        
        const totalTokens = recentEntries.reduce((sum, e) => sum + e.tokens, 0);
        const timeSpanMinutes = recentEntries.length > 0 ? 
            (Date.now() - new Date(recentEntries[0].timestamp).getTime()) / (1000 * 60) : 0;
        
        return {
            tokensPerMinute: timeSpanMinutes > 0 ? totalTokens / timeSpanMinutes : 0,
            totalTokensLastHour: totalTokens,
            estimatedTimeToLimit: this.calculateTimeToLimit(totalTokens, timeSpanMinutes)
        };
    }
    
    async getSessionBlocks(): Promise<SessionBlock[]> {
        // Группировка по 5-часовым блокам (как в Usage Monitor)
        const entries = await this.dataReader.loadUsageEntries(
            await this.dataReader.discoverJSONLFiles()
        );
        
        return this.groupInto5HourBlocks(entries);
    }
}
```

### **3.2 Cost Tracking**

```typescript
class CostTracker {
    async calculateTotalCost(timeRange?: { start: Date, end: Date }): Promise<CostSummary> {
        const entries = await this.getFilteredEntries(timeRange);
        
        return {
            totalCost: entries.reduce((sum, e) => sum + e.cost, 0),
            totalTokens: entries.reduce((sum, e) => sum + e.tokens, 0),
            requestCount: entries.length,
            averageCostPerRequest: entries.length > 0 ? 
                entries.reduce((sum, e) => sum + e.cost, 0) / entries.length : 0
        };
    }
    
    async getCostByModel(): Promise<Map<string, number>> {
        const entries = await this.dataReader.loadUsageEntries(
            await this.dataReader.discoverJSONLFiles()
        );
        
        const costByModel = new Map<string, number>();
        
        for (const entry of entries) {
            const currentCost = costByModel.get(entry.model) || 0;
            costByModel.set(entry.model, currentCost + entry.cost);
        }
        
        return costByModel;
    }
}
```

---

## 🔗 **ИНТЕГРАЦИЯ УРОВНЕЙ**

### **Главный класс BidirectionalCommunicator**

```typescript
class BidirectionalCommunicator {
    private realTimeManager: EnhancedTerminalManager;
    private historyManager: ConversationHistoryManager;
    private analytics: UsageAnalytics;
    
    constructor() {
        this.realTimeManager = new EnhancedTerminalManager();
        this.historyManager = new ConversationHistoryManager(
            new ClaudeDataReader(),
            new SessionRecovery(new ClaudeDataReader())
        );
        this.analytics = new UsageAnalytics(new ClaudeDataReader());
    }
    
    async sendMessage(message: string, sessionId?: string): Promise<void> {
        // 1. Real-time отправка
        await this.realTimeManager.sendMessageBidirectional(message);
        
        // 2. Сохранение snapshot для истории
        if (sessionId) {
            await this.historyManager.saveConversationSnapshot(sessionId, [
                { type: 'user', content: message, timestamp: new Date().toISOString() }
            ]);
        }
    }
    
    async resumeSession(sessionId: string): Promise<void> {
        // Загружаем историю из JSONL
        const history = await this.historyManager.loadConversationHistory(sessionId);
        
        // Восстанавливаем в UI
        for (const msg of history) {
            this.sendToWebview({
                type: msg.type,
                data: msg.content,
                timestamp: msg.timestamp
            });
        }
        
        // Продолжаем real-time с этим sessionId
        this.currentSessionId = sessionId;
    }
    
    async getUsageStats(): Promise<UsageStats> {
        return {
            burnRate: await this.analytics.calculateBurnRate(),
            sessionBlocks: await this.analytics.getSessionBlocks(),
            recentSessions: await this.historyManager.getRecentSessions()
        };
    }
}
```

---

## 📋 **ПЛАН ВЫПОЛНЕНИЯ**

### **Фаза 1: Real-time (2-3 дня)**
1. ✅ Реализовать `ClaudeProcessManager` 
2. ✅ Добавить `StreamJsonParser`
3. ✅ Интегрировать `MessageTypeHandler`
4. ✅ Обновить существующий `TerminalManager`

### **Фаза 2: Persistence (1-2 дня)**  
1. ✅ Создать `ClaudeDataReader`
2. ✅ Реализовать `SessionRecovery`
3. ✅ Добавить `ConversationHistoryManager`

### **Фаза 3: Analytics (1 день)**
1. ✅ Создать `UsageAnalytics`
2. ✅ Добавить `CostTracker`
3. ✅ Интегрировать в UI

### **Фаза 4: Интеграция (1 день)**
1. ✅ Объединить все уровни в `BidirectionalCommunicator`
2. ✅ Обновить webview интерфейс  
3. ✅ Тестирование

---

## 🔗 **КЛЮЧЕВЫЕ ССЫЛКИ**

### **Real-time Communication:**
- [Основной файл](https://raw.githubusercontent.com/andrepimenta/claude-code-chat/main/src/extension.ts)
- [Stream JSON парсинг](https://github.com/andrepimenta/claude-code-chat/blob/main/src/extension.ts#L415-L434)
- [Process spawning](https://github.com/andrepimenta/claude-code-chat/blob/main/src/extension.ts#L375-L401)

### **Persistence & History:**
- [Data loader](https://raw.githubusercontent.com/Maciek-roboblog/Claude-Code-Usage-Monitor/main/usage_analyzer/core/data_loader.py)
- [Path discovery](https://raw.githubusercontent.com/Maciek-roboblog/Claude-Code-Usage-Monitor/main/usage_analyzer/utils/path_discovery.py)
- [JSONL структура](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor/blob/main/usage_analyzer/core/data_loader.py#L50-L80)

---

## 🎯 **КЛЮЧЕВЫЕ ВЫВОДЫ**

### **Архитектурные находки:**

1. **Real-time через child_process.spawn:**
   - Использование `--output-format stream-json` для структурированного вывода
   - Построчный парсинг JSON для real-time обработки
   - Session resume через `--resume sessionId`

2. **Persistence через JSONL логи:**
   - Claude Code автоматически сохраняет логи в `~/.claude/projects/**/*.jsonl`
   - Полная история токенов, стоимости, сессий
   - Возможность восстановления прерванных сессий

3. **Гибридный подход:**
   - Real-time для мгновенной обратной связи
   - JSONL логи для истории и analytics
   - Комбинация даёт максимальную функциональность

### **Технические решения:**

- **Stream parsing** решает проблему фильтрации служебной информации
- **JSONL logs** дают access к полной истории без parsing сложного вывода
- **Session management** позволяет продолжать диалоги между перезапусками
- **WSL support** обеспечивает кроссплатформенность

**Этот план даёт полную roadmap от MVP до enterprise-level функциональности!**