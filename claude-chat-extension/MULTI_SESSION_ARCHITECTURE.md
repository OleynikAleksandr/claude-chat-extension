# Multi-Session Architecture Design
## Claude Chat Extension v0.4.0

**Branch:** `feature/multi-session-architecture`  
**Base:** `v0.3.1`  
**Target:** `v0.4.0`  
**Date:** January 8, 2025

---

## 🎯 **ARCHITECTURE VISION**

Transform the single-session Claude Chat Extension into a multi-session powerhouse with React-based UI and synchronized terminal management.

### **Core Principles:**
- **Scalability:** Easy expansion from 2 to N sessions
- **Synchronization:** Active tabs ↔ active terminals
- **Modularity:** Component-based React architecture
- **Compatibility:** Backward compatibility with v0.3.1
- **Performance:** Efficient memory and resource usage

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **High-Level Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                       │
├─────────────────────────────────────────────────────────────┤
│  React Webview UI                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │
│  │ TabBar      │ │ ChatWindow  │ │ NewSessionButton    │    │
│  │ Component   │ │ Component   │ │ Component           │    │
│  └─────────────┘ └─────────────┘ └─────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Extension Host (TypeScript)                               │
│  ┌─────────────────────┐ ┌─────────────────────────────────┐ │
│  │ DualSessionManager  │ │ WebviewMessageHandler           │ │
│  │                     │ │                                 │ │
│  │ ┌─────────────────┐ │ │ ┌─────────────────────────────┐ │ │
│  │ │ Session #1      │ │ │ │ React ↔ Extension API      │ │ │
│  │ │ - Terminal      │ │ │ │ Message Passing             │ │ │
│  │ │ - Messages      │ │ │ └─────────────────────────────┘ │ │
│  │ │ - State         │ │ │                                 │ │
│  │ └─────────────────┘ │ │                                 │ │
│  │                     │ │                                 │ │
│  │ ┌─────────────────┐ │ │                                 │ │
│  │ │ Session #2      │ │ │                                 │ │
│  │ │ - Terminal      │ │ │                                 │ │
│  │ │ - Messages      │ │ │                                 │ │
│  │ │ - State         │ │ │                                 │ │
│  │ └─────────────────┘ │ │                                 │ │
│  └─────────────────────┘ └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  VS Code Terminal API                                      │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │ Terminal #1     │     │ Terminal #2     │               │
│  │ "Claude Chat 1" │     │ "Claude Chat 2" │               │
│  │ claude CLI      │     │ claude CLI      │               │
│  └─────────────────┘     └─────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 **COMPONENT ARCHITECTURE**

### **React Component Tree:**
```
App
├── TabBar
│   ├── SessionTab (Session #1)
│   ├── SessionTab (Session #2)
│   └── NewSessionButton
├── ChatWindow
│   ├── MessageList
│   ├── MessageInput
│   └── SendButton
└── StatusIndicator
```

### **Component Specifications:**

#### **1. App Component**
```tsx
interface AppState {
  sessions: Session[];
  activeSessionId: string | null;
  isCreatingSession: boolean;
}

function App(): JSX.Element {
  // Main application logic
  // Session management
  // Message passing coordination
}
```

#### **2. TabBar Component**
```tsx
interface TabBarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onTabSwitch: (sessionId: string) => void;
  onNewSession: () => void;
  onCloseSession: (sessionId: string) => void;
}

function TabBar(props: TabBarProps): JSX.Element {
  // Tab rendering
  // Tab switching logic
  // Visual indicators
}
```

#### **3. SessionTab Component**
```tsx
interface SessionTabProps {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (newName: string) => void;
}

function SessionTab(props: SessionTabProps): JSX.Element {
  // Individual tab rendering
  // Status indicators
  // Context menu
}
```

#### **4. ChatWindow Component**
```tsx
interface ChatWindowProps {
  session: Session | null;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

function ChatWindow(props: ChatWindowProps): JSX.Element {
  // Message history
  // Input field
  // Send functionality
}
```

---

## 🔧 **SESSION MANAGER ARCHITECTURE**

### **DualSessionManager Class:**
```typescript
interface Session {
  id: string;
  name: string;
  terminal: vscode.Terminal;
  messages: Message[];
  status: SessionStatus;
  createdAt: Date;
  lastActiveAt: Date;
}

type SessionStatus = 'creating' | 'starting' | 'ready' | 'error' | 'closed';

class DualSessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;
  private maxSessions = 2;
  
  // Core Methods
  async createSession(name?: string): Promise<Session>
  async closeSession(sessionId: string): Promise<void>
  async switchToSession(sessionId: string): Promise<void>
  
  // Session Management
  getSession(sessionId: string): Session | null
  getActiveSession(): Session | null
  getAllSessions(): Session[]
  
  // Terminal Integration
  private async createTerminal(name: string): Promise<vscode.Terminal>
  private async startClaudeCode(terminal: vscode.Terminal): Promise<void>
  private async detectClaudeReady(terminal: vscode.Terminal): Promise<boolean>
  
  // Event Handling
  private onTerminalClosed(terminal: vscode.Terminal): void
  private onSessionStatusChange(sessionId: string, status: SessionStatus): void
  
  // Message Passing
  async sendMessage(sessionId: string, message: string): Promise<void>
  private async executeWithRetry(sessionId: string, command: string): Promise<void>
}
```

### **Terminal Synchronization:**
```typescript
interface TerminalSyncManager {
  // Sync active tab with active terminal
  syncActiveTerminal(sessionId: string): Promise<void>
  
  // Monitor terminal states
  monitorTerminalStates(): void
  
  // Handle terminal events
  onTerminalOpened(terminal: vscode.Terminal): void
  onTerminalClosed(terminal: vscode.Terminal): void
}
```

---

## 📡 **MESSAGE PASSING ARCHITECTURE**

### **Webview ↔ Extension Communication:**
```typescript
// Messages from React to Extension
type WebviewMessage = 
  | { command: 'createSession'; name?: string }
  | { command: 'switchSession'; sessionId: string }
  | { command: 'closeSession'; sessionId: string }
  | { command: 'sendMessage'; sessionId: string; message: string }
  | { command: 'renameSession'; sessionId: string; newName: string };

// Messages from Extension to React
type ExtensionMessage = 
  | { command: 'sessionsUpdated'; sessions: Session[] }
  | { command: 'activeSessionChanged'; sessionId: string }
  | { command: 'sessionStatusChanged'; sessionId: string; status: SessionStatus }
  | { command: 'messageReceived'; sessionId: string; message: Message }
  | { command: 'error'; message: string };
```

### **React Hooks for VS Code API:**
```typescript
// Custom hook for VS Code communication
function useVSCodeAPI() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const sendMessage = useCallback((message: WebviewMessage) => {
    vscode.postMessage(message);
  }, []);
  
  useEffect(() => {
    // Listen for messages from extension
    const messageListener = (event: MessageEvent<ExtensionMessage>) => {
      handleExtensionMessage(event.data);
    };
    
    window.addEventListener('message', messageListener);
    return () => window.removeEventListener('message', messageListener);
  }, []);
  
  return {
    sessions,
    activeSessionId,
    createSession: (name?: string) => sendMessage({ command: 'createSession', name }),
    switchSession: (sessionId: string) => sendMessage({ command: 'switchSession', sessionId }),
    closeSession: (sessionId: string) => sendMessage({ command: 'closeSession', sessionId }),
    sendChatMessage: (sessionId: string, message: string) => 
      sendMessage({ command: 'sendMessage', sessionId, message })
  };
}
```

---

## 🎨 **UI/UX DESIGN PATTERNS**

### **Visual States:**
```css
/* Session Tab States */
.tab {
  /* Base styles */
}

.tab.active {
  /* Active session highlighting */
  background-color: var(--vscode-tab-activeBackground);
  border-bottom: 2px solid var(--vscode-focusBorder);
}

.tab.starting {
  /* Starting state with loading animation */
  position: relative;
}

.tab.starting::before {
  content: '';
  /* Loading spinner animation */
}

.tab.error {
  /* Error state styling */
  border-left: 3px solid var(--vscode-errorForeground);
}
```

### **Status Indicators:**
```tsx
const StatusIndicator = ({ status }: { status: SessionStatus }) => {
  const indicators = {
    creating: { icon: '🔄', color: 'orange', text: 'Creating...' },
    starting: { icon: '🟡', color: 'yellow', text: 'Starting Claude...' },
    ready: { icon: '🟢', color: 'green', text: 'Ready' },
    error: { icon: '🔴', color: 'red', text: 'Error' },
    closed: { icon: '⚪', color: 'gray', text: 'Closed' }
  };
  
  const indicator = indicators[status];
  
  return (
    <span className={`status-indicator status-${status}`} title={indicator.text}>
      {indicator.icon}
    </span>
  );
};
```

---

## 🔄 **MIGRATION STRATEGY**

### **Backward Compatibility Plan:**

1. **Legacy Support:**
   - Keep existing `TerminalManager` class functional
   - Maintain current webview for fallback
   - Preserve all existing commands and APIs

2. **Feature Flag Approach:**
   ```typescript
   const isMultiSessionEnabled = vscode.workspace
     .getConfiguration('claudeChat')
     .get<boolean>('enableMultiSession', true);
   
   if (isMultiSessionEnabled) {
     // Use new DualSessionManager
     return new MultiSessionProvider();
   } else {
     // Use legacy single session
     return new LegacyProvider();
   }
   ```

3. **Gradual Migration:**
   - Phase 1: Install new architecture alongside legacy
   - Phase 2: Default to new architecture with legacy fallback
   - Phase 3: Remove legacy code in v0.5.0

### **Configuration Migration:**
```typescript
interface LegacyConfig {
  // v0.3.1 configuration
}

interface MultiSessionConfig {
  enableMultiSession: boolean;
  maxSessions: number;
  defaultSessionName: string;
  autoSwitchTerminals: boolean;
}

function migrateConfiguration(legacy: LegacyConfig): MultiSessionConfig {
  // Migration logic
}
```

---

## 📊 **PERFORMANCE CONSIDERATIONS**

### **Memory Management:**
- **Session Limit:** Maximum 2 concurrent sessions
- **Message History:** Limit to 100 messages per session
- **Terminal Cleanup:** Automatic disposal of closed terminals
- **React Optimization:** useMemo, useCallback, React.memo

### **Resource Monitoring:**
```typescript
class ResourceMonitor {
  private memoryThreshold = 100 * 1024 * 1024; // 100MB
  
  monitorMemoryUsage(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      if (usage.heapUsed > this.memoryThreshold) {
        this.triggerCleanup();
      }
    }, 30000); // Every 30 seconds
  }
  
  private triggerCleanup(): void {
    // Clean up old messages, unused resources
  }
}
```

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests:**
```typescript
describe('DualSessionManager', () => {
  test('should create session with unique ID');
  test('should limit to 2 concurrent sessions');
  test('should switch active session correctly');
  test('should handle terminal closure gracefully');
});

describe('React Components', () => {
  test('TabBar should render all sessions');
  test('SessionTab should show correct status');
  test('ChatWindow should display messages');
});
```

### **Integration Tests:**
```typescript
describe('Multi-Session Integration', () => {
  test('should create 2 sessions and switch between them');
  test('should synchronize terminal visibility with active tab');
  test('should send messages to correct session');
  test('should handle session closure properly');
});
```

---

## 🚀 **DEPLOYMENT PLAN**

### **Build Pipeline:**
```json
{
  "scripts": {
    "build:react": "webpack --mode production",
    "build:extension": "tsc -p .",
    "build": "npm run build:react && npm run build:extension",
    "package": "vsce package --out dist/claude-chat-0.4.0.vsix"
  }
}
```

### **Release Checklist:**
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Migration guide created
- [ ] Backward compatibility verified

---

**Architecture Status:** 🏗️ Ready for Implementation  
**Next Phase:** 7.2 - React UI Setup and Components  
**Estimated Completion:** January 15, 2025