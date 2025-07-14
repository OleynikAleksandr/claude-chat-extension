# Multi-Session Architecture Design
## Claude Chat Extension v0.12.0

**Version:** v0.12.0 - OneShoot-Only Architecture  
**Date:** January 2025  

---

## 🎯 **ARCHITECTURE VISION**

ClaudeCodeBridge uses a streamlined OneShoot-only architecture with React-based UI for efficient multi-session management and optimal cost performance.

### **Core Principles:**
- **Efficiency:** OneShoot mode with 91% cost reduction
- **Simplicity:** Single architecture for all sessions
- **Scalability:** Support for multiple concurrent sessions
- **Performance:** No persistent processes or terminals
- **Clean Design:** Minimal resource usage

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
│  │ OneShootSession     │ │ WebviewMessageHandler           │ │
│  │ Manager             │ │                                 │ │
│  │ ┌─────────────────┐ │ │ ┌─────────────────────────────┐ │ │
│  │ │ Session #1      │ │ │ │ React ↔ Extension API      │ │ │
│  │ │ - ID & Name     │ │ │ │ Message Passing             │ │ │
│  │ │ - Messages      │ │ │ └─────────────────────────────┘ │ │
│  │ │ - State         │ │ │                                 │ │
│  │ └─────────────────┘ │ │                                 │ │
│  │                     │ │                                 │ │
│  │ ┌─────────────────┐ │ │                                 │ │
│  │ │ Session #2      │ │ │                                 │ │
│  │ │ - ID & Name     │ │ │                                 │ │
│  │ │ - Messages      │ │ │                                 │ │
│  │ │ - State         │ │ │                                 │ │
│  │ └─────────────────┘ │ │                                 │ │
│  └─────────────────────┘ └─────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ OneShoot Process Manager                                │ │
│  │ - Spawns claude --print --resume for each message       │ │
│  │ - Captures stdout response                              │ │
│  │ - Process terminates after response                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 **DATA FLOW - ONESHOOT ONLY**

### **Message Flow:**
```
1. User Input → React UI
2. React → Extension Host (postMessage)
3. Extension → OneShoot Process (spawn)
4. Process → Claude CLI (--print --resume)
5. Claude Response → Process stdout
6. Process stdout → Extension Host
7. Extension → React UI (postMessage)
8. React UI → User Display
```

### **Session Management:**
- Each session maintains its own message history in memory
- No persistent processes or terminals
- Clean lifecycle: spawn → execute → capture → terminate
- Session state persists across messages via --resume flag

---

## 📁 **FILE STRUCTURE**

```
src/
├── extension.ts                              # Main entry point
├── multi-session/
│   ├── managers/
│   │   ├── OneShootSessionManager.ts        # Session management
│   │   └── OneShootProcessSessionManager.ts # Process spawning
│   ├── providers/
│   │   └── MultiSessionProvider.ts          # Webview provider
│   ├── monitors/
│   │   └── JsonlResponseMonitor.ts          # JSONL monitoring (legacy)
│   ├── webview/
│   │   ├── components/
│   │   │   ├── App.tsx                      # Main React app
│   │   │   ├── TabBar.tsx                   # Session tabs
│   │   │   ├── ChatWindow.tsx               # Chat interface
│   │   │   ├── ServiceInfoBlock.tsx         # Tool display
│   │   │   └── ContextProgressBar.tsx       # Token usage
│   │   ├── hooks/
│   │   │   └── useVSCodeAPI.ts              # VS Code API hook
│   │   └── index.tsx                        # React entry
│   └── types/
│       └── Session.ts                       # Type definitions
├── debug/
│   └── RawJsonOutputChannel.ts              # Debug output
└── types.ts                                 # Global types
```

---

## 🔧 **KEY COMPONENTS**

### **1. OneShootSessionManager**
- Manages multiple concurrent sessions
- Maintains session state in memory
- Handles session lifecycle (create, switch, close)
- No mode switching - all sessions use OneShoot

### **2. OneShootProcessSessionManager**
- Spawns claude process for each message
- Uses --print and --resume flags
- Captures stdout response
- Ensures clean process termination

### **3. React Webview Components**
- **App.tsx**: Main application container
- **TabBar.tsx**: Multi-session tab management
- **ChatWindow.tsx**: Message display and input
- **ServiceInfoBlock.tsx**: Real-time tool usage display
- **ContextProgressBar.tsx**: Visual token usage indicator

### **4. Communication Layer**
- VS Code postMessage API for bidirectional communication
- Typed message contracts between extension and webview
- Error handling and recovery mechanisms

---

## 🚀 **PERFORMANCE CHARACTERISTICS**

### **OneShoot Mode Benefits:**
- ✅ 91% cost reduction via --resume flag
- ✅ No persistent process overhead
- ✅ Clean error recovery (new process each time)
- ✅ Minimal memory footprint
- ✅ No terminal management complexity
- ✅ Consistent behavior across all sessions

### **Resource Usage:**
- Memory: Only active session data in memory
- CPU: Spike only during message processing
- Processes: One short-lived process per message
- File I/O: Minimal (no JSONL monitoring needed)

---

## 🔐 **SECURITY CONSIDERATIONS**

- Process arguments sanitized before spawning
- No persistent terminal access
- Clean process lifecycle prevents hanging processes
- User data isolated per session
- No file system monitoring required

---

## 📊 **STATE MANAGEMENT**

### **Session State:**
```typescript
interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  process?: OneShootProcessManager;
  messages: ClaudeMessage[];
  lastActivity: Date;
  sessionStartTime: Date;
}
```

### **Message State:**
- Messages stored in session memory
- Service info updated in real-time
- Token usage tracked per message
- Tool usage displayed in footer

---

## 🎯 **FUTURE CONSIDERATIONS**

- Session persistence across VS Code restarts
- Export/import session history
- Advanced session analytics
- Multi-workspace support
- Session templates

---

## 📝 **MIGRATION FROM v0.11.x**

Users upgrading from v0.11.x will experience:
- Automatic migration to OneShoot mode
- No configuration changes required
- Improved performance and cost efficiency
- Cleaner, more reliable operation
- Same user interface and workflows

---

**Document Version:** 1.0.0  
**Last Updated:** January 2025  
**Architecture:** OneShoot-Only