# ClaudeCodeBridge 🌉

[![Version](https://img.shields.io/badge/version-0.8.4-blue.svg)](https://github.com/OleynikAleksandr/claude-chat-extension/releases/tag/v0.8.4)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-brightgreen.svg)](https://code.visualstudio.com/)
[![GitHub Release](https://img.shields.io/github/v/release/OleynikAleksandr/claude-chat-extension)](https://github.com/OleynikAleksandr/claude-chat-extension/releases)

**The first stable VS Code extension for bidirectional real-time communication with Claude Code CLI**

ClaudeCodeBridge enables seamless integration between VS Code and Anthropic's Claude Code CLI, providing a native chat interface with full bidirectional communication capabilities.

## 🚨 Version 0.8.4 - Critical Hotfix

**IMPORTANT**: Version 0.8.3 was broken. Please use v0.8.4 which fixes critical webview loading issues.

### ✨ New in v0.8.4: Processing Status Bar + Fixes

- **📊 Processing Status Bar**: Real-time display of processing time, token usage, and tool calls
- **🔧 Critical Fix**: Resolved VS Code API conflict that broke v0.8.3 interface loading
- **🟢 Simplified States**: Clean 2-state system (READY/WORKING) with animated indicators
- **📈 Token Tracking**: Live monitoring of Claude Code token consumption from JSONL logs
- **🎯 Smart Integration**: Seamless connection between React UI and Extension backend

### 🏆 Core Features (from v0.6.5)

- **🔄 Full Bidirectional Communication**: Real-time message exchange between VS Code extension and Claude Code CLI
- **📨 ПОТОК 1 (Extension → Terminal)**: Send messages from webview directly to Claude Code terminal
- **📩 ПОТОК 2 (Terminal → Extension)**: Receive Claude responses back to webview in real-time
- **🖥️ Multi-Session Support**: Manage multiple Claude Code sessions simultaneously
- **⚡ Real-Time Response Monitoring**: Automatic detection and parsing of Claude Code responses
- **🎯 Smart Terminal Management**: Automatic Enter key handling and terminal refresh
- **📁 JSONL File Monitoring**: Advanced file system watchers for Claude Code session files
- **🚀 Optimized Performance**: 73% smaller extension size with cleaner architecture

## 🏗️ Architecture

ClaudeCodeBridge uses a **three-layer architecture** with state monitoring:

### ПОТОК 1: Extension → Terminal
```
VS Code Webview → Extension → Terminal → Claude Code CLI
```

### ПОТОК 2: Terminal → Extension  
```
Claude Code CLI → JSONL File → File Watcher → Extension → VS Code Webview
```

### 🆕 ПОТОК 3: State Detection (v0.7.0)
```
JSONL Analysis → State Detection → Enhanced Provider → Real-Time UI Updates
```

#### State Detection System
- **JsonlPatternDetector**: Analyzes JSONL patterns for state transitions
- **ClaudeStateManager**: Manages state transitions with smart timeouts
- **DualSessionStateAdapter**: Integrates state detection with session management
- **EnhancedMultiSessionProvider**: Provides state-aware webview interface

## 🚀 Quick Start

### Prerequisites
- VS Code 1.85.0 or higher
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and configured
- Node.js 20.x or higher

### Installation

1. **Download the Extension**
   
   **📦 Direct Download:**
   - [Release 0.7.0](https://github.com/OleynikAleksandr/claude-chat-extension/releases/tag/v0.7.0) - **Latest with State Monitoring**
   - [Release 0.6.5](https://github.com/OleynikAleksandr/claude-chat-extension/releases/tag/v0.6.5) - Stable version
   
   **🔨 Build from Source:**
   ```bash
   git clone https://github.com/OleynikAleksandr/claude-chat-extension.git
   cd claude-chat-extension
   npm install
   npm run build
   vsce package
   ```

2. **Install in VS Code**
   ```bash
   code --install-extension claude-chat-0.7.0.vsix
   ```

3. **Start Using**
   - Press `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` (Windows/Linux)
   - Or use Command Palette: `Claude Chat: Open Multi-Session Panel`

## 📖 Usage

### Basic Usage

1. **Open Claude Chat Panel**
   - Use keyboard shortcut `Cmd/Ctrl+Shift+M`
   - Or click the Claude Chat icon in the Activity Bar

2. **Create New Session**
   - Click "New Session" button
   - Or use `Cmd/Ctrl+Shift+N`

3. **Send Messages**
   - Type your message in the input field
   - Press Enter or click Send
   - Watch as your message appears in the terminal and Claude responds back to the webview
   - **🆕 v0.7.0**: Monitor real-time state changes: Ready → Processing → Responding → Ready

### Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Open Chat Panel | `Cmd+Shift+C` | `Ctrl+Shift+C` |
| Open Multi-Session | `Cmd+Shift+M` | `Ctrl+Shift+M` |
| Quick Send | `Cmd+Shift+Enter` | `Ctrl+Shift+Enter` |
| New Session | `Cmd+Shift+N` | `Ctrl+Shift+N` |
| Switch Session | `Cmd+Shift+S` | `Ctrl+Shift+S` |
| Toggle Panel | `Cmd+Shift+T` | `Ctrl+Shift+T` |
| Clear History | `Cmd+Shift+Delete` | `Ctrl+Shift+Delete` |

### 🆕 Claude Code States (v0.7.0)

ClaudeCodeBridge now shows real-time Claude Code states:

| State | Emoji | Description | When You See It |
|-------|-------|-------------|-----------------|
| **Ready** | 🟢 | Ready for new messages | Claude is waiting for your input |
| **Processing** | 🔄 | Processing your request | Claude is thinking about your message |
| **Responding** | ✍️ | Generating response | Claude is writing the response |
| **Idle** | ⏸️ | Waiting for activity | Session is inactive |

**Visual Indicators:**
- **Tab Bar**: Compact state indicators in session tabs
- **Chat Window**: Detailed state information in session header
- **Animations**: Spinning indicators during active processing
- **Auto-sync**: All UI elements update simultaneously

## 🔧 Technical Details

### Multi-Session Architecture

- **DualSessionManager**: Manages multiple Claude Code sessions
- **JsonlResponseMonitor**: Monitors JSONL files for Claude responses
- **SessionTracker**: Tracks session state and lifecycle
- **🆕 EnhancedMultiSessionProvider**: State-aware webview interface
- **🆕 ClaudeStateDetectionFacade**: Unified state detection system
- **🆕 DualSessionStateAdapter**: Integrates state detection with session management

### JSONL Response Monitoring

The extension monitors Claude Code JSONL files for responses using advanced file system watchers:

```typescript
// Supports both old and new Claude Code formats
interface ClaudeCodeJsonlEntry {
  type: 'user' | 'assistant';
  message?: {
    role: 'user' | 'assistant';
    content: Array<{type: 'text'; text: string}> | string;
  };
  timestamp: string;
}
```

### 🆕 State Detection System (v0.7.0)

The extension now includes advanced state detection capabilities:

```typescript
// Claude Code State Types
type ClaudeCodeState = 'idle' | 'processing' | 'responding' | 'ready';

interface SessionStateData {
    state: ClaudeCodeState;
    stateDescription: string;
    stateEmoji: string;
    isReadyForNewRequest: boolean;
}

// State Detection Architecture
class JsonlPatternDetector {
    // Analyzes JSONL patterns for state transitions
    detectStateFromJsonl(entries: JsonlEntry[]): ClaudeCodeState;
}

class ClaudeStateManager {
    // Manages state transitions with smart timeouts
    transitionState(from: ClaudeCodeState, to: ClaudeCodeState): void;
}
```

**State Detection Features:**
- **Pattern Analysis**: Intelligent JSONL pattern recognition
- **Smart Timeouts**: Prevents false state transitions
- **Debounce Logic**: Reduces UI flickering
- **Auto-cleanup**: Removes stale state data

### Session Lifecycle

1. **Session Creation**: User clicks "New Session"
2. **Terminal Launch**: Extension opens new Claude Code terminal
3. **Delayed Monitoring**: 3-second delay before starting JSONL monitoring
4. **Message Flow**: Bidirectional communication established
5. **Session Cleanup**: Proper resource cleanup on session close

## 🛠️ Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/OleynikAleksandr/ClaudeCodeBridge.git
cd ClaudeCodeBridge/claude-chat-extension

# Install dependencies
npm install

# Build extension
npm run build

# Package extension
vsce package
```

### Development Commands

```bash
npm run compile          # Compile TypeScript
npm run watch           # Watch mode compilation
npm run build:webview   # Build React webview
npm run watch:webview   # Watch webview development
npm run lint            # Run ESLint
npm run test            # Run tests
```

### Project Structure

```
claude-chat-extension/
├── src/
│   ├── extension.ts                    # Main extension entry point
│   ├── multi-session/
│   │   ├── managers/
│   │   │   └── DualSessionManager.ts   # Session management
│   │   ├── monitors/
│   │   │   └── JsonlResponseMonitor.ts # JSONL monitoring
│   │   ├── providers/
│   │   │   ├── MultiSessionProvider.ts # Base webview provider
│   │   │   └── 🆕 EnhancedMultiSessionProvider.ts # State-aware provider
│   │   └── types/
│   │       └── Session.ts              # Type definitions
│   ├── 🆕 state-detection/              # State detection system
│   │   ├── ClaudeStateDetectionFacade.ts # Main facade
│   │   ├── types/ClaudeState.ts        # State type definitions
│   │   ├── detectors/JsonlPatternDetector.ts # Pattern detection
│   │   ├── managers/ClaudeStateManager.ts # State management
│   │   └── adapters/DualSessionStateAdapter.ts # Integration adapter
│   └── webview/                        # React webview components
├── media/                              # Icons and assets
├── package.json                        # Extension manifest
└── webpack.config.js                   # Webpack configuration
```

## 🐛 Troubleshooting

### Common Issues

1. **"No terminal available" dialog on startup**
   - Fixed in v0.6.5 - update to latest version

2. **Messages not appearing in extension**
   - Ensure Claude Code CLI is properly installed
   - Check that terminal is active and responding
   - Try creating a new session

3. **JSONL file not found**
   - Wait 3 seconds after sending first message
   - Check Claude Code CLI is running and creating session files

### Debug Information

Use `Claude Chat: Show Session Diagnostics` command to view:
- Active sessions
- JSONL file paths
- Monitoring status
- Error logs

## 📊 Performance

Version 0.6.5 Performance Improvements:
- **73% smaller extension size**: 44.97KB → 12.01KB
- **Clean architecture**: ~1050 lines → ~236 lines in main extension
- **Faster startup**: No unnecessary initialization
- **Memory efficient**: Proper resource cleanup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude Code CLI
- [VS Code Extension API](https://code.visualstudio.com/api) for excellent documentation
- The open-source community for inspiration and tools

## 📈 Roadmap

- [ ] Enhanced error handling and recovery
- [ ] Session persistence across VS Code restarts
- [ ] Customizable themes and layouts
- [ ] Integration with VS Code workspace settings
- [ ] Performance monitoring and analytics

---

**ClaudeCodeBridge v0.6.5** - The first stable bridge between VS Code and Claude Code CLI 🌉
EOF < /dev/null