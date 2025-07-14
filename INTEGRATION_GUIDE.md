# Claude Chat Extension v0.9.1 Integration Guide

## 🎯 Enhanced Service Information Monitoring

This guide provides complete integration instructions for the new Enhanced Service Information Monitoring feature introduced in v0.9.1.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Integration](#component-integration)
3. [Data Flow](#data-flow)
4. [API Reference](#api-reference)
5. [Customization](#customization)
6. [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

### Dual-Stream Processing

The Enhanced JsonlResponseMonitor processes two separate data streams:

```
Claude Code CLI → JSONL File → JsonlResponseMonitor → Dual Streams
                                                    ├─ Text Messages
                                                    └─ Service Information
```

### Key Components

1. **JsonlResponseMonitor.ts** - Core parsing and monitoring
2. **ServiceInfoBlock.tsx** - UI component for service information
3. **ChatWindow.tsx** - Integration point for display
4. **Session.ts** - Type definitions and interfaces

## 🔧 Component Integration

### 1. Enhanced JsonlResponseMonitor

```typescript
// Initialize with dual callbacks
const monitor = new JsonlResponseMonitor(outputChannel);

// Text messages (existing)
monitor.onResponse((data: ResponseDetected) => {
  // Handle regular text messages
});

// Service information (new)
monitor.onServiceInfo((data: ServiceInfoDetected) => {
  // Handle service information
});
```

### 2. ServiceInfoBlock Component

```typescript
import { ServiceInfoBlock } from './ServiceInfoBlock';

<ServiceInfoBlock 
  serviceInfo={serviceInfo}
  onUpdate={onServiceInfoUpdate}
  isCompact={false}
/>
```

### 3. ChatWindow Integration

```typescript
// Add service info state
const [activeServiceInfo, setActiveServiceInfo] = useState<ServiceMessage | null>(null);

// Update after user message
const handleUserMessage = (message: Message) => {
  setMessages(prev => [...prev, message]);
  
  // Initialize service info block
  const initialServiceInfo: ServiceMessage = {
    id: generateId(),
    type: 'service',
    sessionId: message.sessionId,
    timestamp: new Date(),
    toolUse: [],
    thinking: 'Starting to process...',
    usage: { input_tokens: 0, output_tokens: 0 },
    status: 'initializing'
  };
  
  setActiveServiceInfo(initialServiceInfo);
};
```

## 🌊 Data Flow

### JSONL Entry Processing

```typescript
// Input: Raw JSONL entry
{
  "type": "assistant",
  "message": {
    "content": [
      {"type": "text", "text": "Response text"},
      {"type": "tool_use", "id": "tool_1", "name": "Read", "input": {...}},
      {"type": "thinking", "text": "Let me analyze..."}
    ],
    "usage": {
      "input_tokens": 100,
      "output_tokens": 50,
      "cache_read_input_tokens": 25
    }
  },
  "timestamp": "2025-07-09T18:40:10.719Z"
}

// Output: Dual streams
{
  message: {
    role: 'assistant',
    content: 'Response text',
    timestamp: 1720545610719
  },
  serviceInfo: {
    id: 'service_123',
    type: 'service',
    sessionId: 'session_abc',
    timestamp: Date,
    toolUse: [{
      id: 'tool_1',
      name: 'Read',
      input: {...},
      status: 'running'
    }],
    thinking: 'Let me analyze...',
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 25
    },
    status: 'processing'
  }
}
```

### Service Information Updates

```typescript
// Service info flows through the system
JsonlResponseMonitor → DualSessionManager → WebView → ServiceInfoBlock
                                              ↓
                                        Real-time updates
```

## 📚 API Reference

### ServiceMessage Interface

```typescript
interface ServiceMessage {
  id: string;                           // Unique identifier
  type: 'service';                     // Message type
  sessionId: string;                   // Session identifier
  timestamp: Date;                     // Creation timestamp
  toolUse: ToolUseItem[];             // Active tools
  thinking: string;                    // Thinking process
  usage: UsageInfo;                    // Token usage
  status: ServiceStatus;               // Processing status
  duration?: number;                   // Total duration (ms)
}
```

### ToolUseItem Interface

```typescript
interface ToolUseItem {
  id: string;                         // Tool identifier
  name: string;                       // Tool name (Read, Write, LS, etc.)
  input: any;                         // Tool input parameters
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;                  // Execution duration (ms)
  result?: any;                       // Tool result
  error?: string;                     // Error message
}
```

### UsageInfo Interface

```typescript
interface UsageInfo {
  input_tokens: number;               // Input tokens used
  output_tokens: number;              // Output tokens generated
  cache_creation_input_tokens?: number; // Cache creation tokens
  cache_read_input_tokens?: number;   // Cache read tokens
  service_tier?: string;              // Service tier (standard, premium)
  cost_estimate?: number;             // Estimated cost
}
```

### ServiceStatus Type

```typescript
type ServiceStatus = 'initializing' | 'processing' | 'completed' | 'error';
```

## 🎨 Customization

### Theme Integration

ServiceInfoBlock automatically adapts to VS Code themes:

```css
.service-info-block {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  color: var(--vscode-foreground);
}

.status-indicator.status-processing {
  background: var(--vscode-terminal-ansiBlue);
  animation: pulse 2s infinite;
}
```

### Custom Styling

```css
/* Override default styles */
.service-info-block.custom-theme {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.service-info-block.compact {
  padding: 6px 12px;
  border-radius: 16px;
  display: inline-block;
}
```

### Animation Control

```typescript
// Disable animations for accessibility
@media (prefers-reduced-motion: reduce) {
  .service-info-block *,
  .updating-indicator,
  .status-indicator {
    animation: none \!important;
    transition: none \!important;
  }
}
```

## 🔧 Performance Optimization

### Throttling Configuration

```typescript
// Adjust throttling delay
private readonly THROTTLE_DELAY = 200; // 200ms between updates

// Customize cache size
private readonly MAX_CACHE_SIZE = 10; // Maximum cached files
```

### Memory Management

```typescript
// Automatic cleanup
dispose(): void {
  // Clear throttle timers
  for (const [, timer] of this.throttleTimers) {
    clearTimeout(timer);
  }
  
  // Clear file cache
  this.fileContentCache.clear();
  
  // Stop monitoring
  for (const [sessionId] of this.watchers) {
    this.stopMonitoring(sessionId);
  }
}
```

### Token Limit Validation

```typescript
// Input validation
private validateTokenCount(count: number | undefined): number {
  if (count === undefined || count === null) return 0;
  if (typeof count \!== 'number') return 0;
  if (count < 0) return 0;
  if (count > 1000000) return 1000000; // Max reasonable value
  return Math.floor(count);
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Service Information Not Displaying

**Problem**: ServiceInfoBlock not showing after user message
**Solution**: Check JSONL file permissions and monitor initialization

```typescript
// Debug monitoring status
console.log('Monitor active:', this.watchers.has(sessionId));
console.log('JSONL path:', jsonlPath);
console.log('File exists:', fs.existsSync(jsonlPath));
```

#### 2. Performance Issues

**Problem**: UI freezing with large JSONL files
**Solution**: Adjust throttling and enable caching

```typescript
// Increase throttling delay
private readonly THROTTLE_DELAY = 500; // 500ms for large files

// Enable aggressive caching
private readonly MAX_CACHE_SIZE = 5; // Reduce cache size
```

#### 3. Animation Not Working

**Problem**: Token counter not animating
**Solution**: Check animation preferences and browser support

```typescript
// Fallback for older browsers
useEffect(() => {
  if (typeof requestAnimationFrame === 'undefined') {
    // Use setTimeout fallback
    setTimeout(() => setAnimatedTokens(targetTokens), 100);
  }
}, [targetTokens]);
```

#### 4. Memory Leaks

**Problem**: Memory usage increasing over time
**Solution**: Ensure proper cleanup and disposal

```typescript
// Component cleanup
useEffect(() => {
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };
}, []);
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Add to JsonlResponseMonitor
private debug = process.env.NODE_ENV === 'development';

private log(message: string, data?: any): void {
  if (this.debug) {
    console.log(`[JsonlResponseMonitor] ${message}`, data);
  }
}
```

### Performance Monitoring

```typescript
// Monitor performance metrics
const performanceMetrics = {
  entriesProcessed: 0,
  averageParseTime: 0,
  memoryUsage: process.memoryUsage(),
  cacheHitRate: this.cacheHits / this.cacheRequests
};
```

## 📈 Monitoring and Analytics

### Health Checks

```typescript
// System health monitoring
public getHealthStatus(): HealthStatus {
  return {
    isActive: this.watchers.size > 0,
    sessionsMonitored: this.watchers.size,
    cacheSize: this.fileContentCache.size,
    memoryUsage: process.memoryUsage(),
    uptime: Date.now() - this.startTime
  };
}
```

### Performance Metrics

```typescript
// Track performance metrics
interface PerformanceMetrics {
  processedEntries: number;
  processingRate: number; // entries/second
  memoryUsage: number;    // MB
  errorRate: number;      // errors/total
  cacheHitRate: number;   // hits/requests
}
```

## 🚀 Best Practices

### 1. Error Handling

```typescript
// Always wrap in try-catch
try {
  const parsed = this.parseClaudeCodeEntry(entry, sessionId);
  // Process parsed data
} catch (error) {
  this.outputChannel.appendLine(`Error: ${error.message}`);
  // Return safe fallback
  return { message: null, serviceInfo: null };
}
```

### 2. Input Validation

```typescript
// Validate all external inputs
private sanitizeInput(input: any): any {
  if (\!input) return {};
  
  // Truncate large strings
  if (typeof input === 'string' && input.length > 1000) {
    return input.substring(0, 1000);
  }
  
  // Limit array sizes
  if (Array.isArray(input) && input.length > 100) {
    return input.slice(0, 100);
  }
  
  return input;
}
```

### 3. Resource Management

```typescript
// Implement proper cleanup
class ServiceInfoManager {
  private resources: Set<Disposable> = new Set();
  
  public addResource(resource: Disposable): void {
    this.resources.add(resource);
  }
  
  public dispose(): void {
    for (const resource of this.resources) {
      resource.dispose();
    }
    this.resources.clear();
  }
}
```

## 📞 Support

For additional support:

- **Documentation**: This guide and inline code comments
- **Issues**: [GitHub Issues](https://github.com/OleynikAleksandr/claude-chat-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/OleynikAleksandr/claude-chat-extension/discussions)

---

**Enhanced Service Information Monitoring** provides powerful insights into Claude Code operations. Follow this guide for successful integration and optimal performance.
EOF < /dev/null