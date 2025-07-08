# Claude Chat Extension for VS Code

🚀 **VS Code extension for seamless Claude Code CLI integration with Multi-Session support**

Advanced chat interface that enables managing multiple parallel Claude CLI sessions within VS Code. Send messages to different Claude instances and switch between sessions seamlessly.

![Claude Chat Extension Demo](https://img.shields.io/badge/VS%20Code-Extension-blue) ![Version](https://img.shields.io/badge/version-0.4.0-brightgreen) ![Status](https://img.shields.io/badge/status-MVP%202.0%20Ready-success) ![Multi-Session](https://img.shields.io/badge/Multi--Session-Enabled-orange)

## ✨ Features

### 🆕 **NEW in v0.4.0 - Multi-Session Support**
- 🔥 **Multiple Claude Sessions** - run up to 2 parallel Claude CLI instances
- 🔄 **Session Switching** - seamlessly switch between different Claude conversations
- 📑 **Tabbed Interface** - modern React UI with session tabs and status indicators  
- 🔗 **Terminal Synchronization** - automatic terminal focus when switching sessions
- 🏥 **Health Monitoring** - real-time session health checks and diagnostics
- ⚡ **Auto-Recovery** - automatic session switching when terminals are closed

### 💪 **Core Features**
- 💬 **Dual Interface modes** - Single Session + Multi-Session views
- 🔍 **Auto-detection of Claude CLI** in active terminals  
- ⚡ **Instant message sending** with automatic Enter
- 🛡️ **Robust error handling** with retry mechanisms
- 🎯 **Smart fallback to active terminal** without intrusive dialogs
- 📊 **Comprehensive logging** with emoji indicators for debugging

## 🚀 Quick Start

### Installation

1. Download the latest release [`claude-chat-0.4.0.vsix`](https://github.com/OleynikAleksandr/claude-chat-extension/releases)
2. Install in VS Code:
   ```bash
   code --install-extension claude-chat-0.4.0.vsix
   ```
3. Restart VS Code

### Usage

#### 🔥 **Multi-Session Mode (NEW)**
1. **Open Multi-Session**: `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac)
2. **Create new session**: `Ctrl+Shift+N` or click "+" button  
3. **Switch sessions**: `Ctrl+Shift+S` or click session tabs
4. **Send messages** to active session
5. **Sessions auto-sync** with terminals

#### 💬 **Single Session Mode (Classic)**
1. **Open terminal** in VS Code
2. **Launch Claude CLI**: `claude` (if installed)
3. **Open chat**: `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac)
4. **Type your message** and press Enter or click "Send"
5. **Message appears in Claude CLI** and is automatically submitted

## 🎮 Keyboard Shortcuts

### 🆕 **Multi-Session Shortcuts**
| Shortcut | Action |
|----------|---------|
| `Ctrl+Shift+M` | Open multi-session panel |
| `Ctrl+Shift+N` | Create new session |
| `Ctrl+Shift+S` | Switch between sessions |

### 💬 **Classic Shortcuts**  
| Shortcut | Action |
|----------|---------|
| `Ctrl+Shift+C` | Open single session chat |
| `Ctrl+Shift+Enter` | Quick send message |
| `Ctrl+Shift+T` | Toggle chat panel |
| `Ctrl+Shift+Delete` | Clear chat history |

## 🔧 Commands

Open Command Palette (`Ctrl+Shift+P`) and search for:

### 🆕 **Multi-Session Commands**
- `Claude Chat: Open Multi-Session Panel` - open multi-session interface
- `Claude Chat: Create New Session` - create new Claude session  
- `Claude Chat: Switch Session` - quick picker to switch sessions
- `Claude Chat: Close Session` - close selected session
- `Claude Chat: Show Session Diagnostics` - detailed session health report

### 💬 **Classic Commands**
- `Claude Chat: Open Chat Panel` - open single session chat interface
- `Claude Chat: Quick Send` - quick message input dialog
- `Claude Chat: Show Terminal Status` - display terminal status
- `Claude Chat: Clear History` - clear chat history

## 📋 Requirements

- **VS Code** version 1.85.0 or higher
- **Claude CLI** installed and available in terminal
- **Active terminal** with running `claude` or any terminal

## 🏗️ Architecture

### 🆕 **Multi-Session Architecture (v0.4.0)**
```
React UI ↔ MultiSessionProvider ↔ DualSessionManager ↔ VS Code Terminal API ↔ Claude CLI
     ↓              ↓                        ↓                       ↓            ↓
  TabBar      Message Passing        Session Management      Terminal Control   2x Claude
ChatWindow    Event System          Health Monitoring        Auto-Switching    Instances
```

### 💬 **Classic Architecture (v0.3.1)**
```
Webview UI → Extension Host → TerminalManager → VS Code Terminal API → Claude CLI
```

### Core Components

#### 🆕 **Multi-Session Components**
- **MultiSessionProvider** - webview provider for React UI integration
- **DualSessionManager** - manages up to 2 parallel Claude sessions
- **React Components** - App, TabBar, ChatWindow with modern UI
- **useVSCodeAPI Hook** - React hook for VS Code communication
- **Session Types** - TypeScript definitions for multi-session support

#### 💪 **Shared Components**
- **TerminalManager** - terminal management and command execution
- **ClaudeChatViewProvider** - classic webview interface  
- **Types** - comprehensive TypeScript definitions
- **Error Handling** - robust error management with recovery

## 🛠️ Development

### Local Setup

```bash
git clone https://github.com/OleynikAleksandr/claude-chat-extension.git
cd claude-chat-extension
npm install
```

### Build

```bash
# Full build (extension + webview)
npm run build

# Compile TypeScript only
npm run compile

# Build React webview only  
npm run build:webview

# Create VSIX package
npx vsce package

# Lint code
npm run lint
```

### Debug

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test functionality in the new VS Code window

## 📊 Project Status

### ✅ **MVP 2.0 (v0.4.0) - COMPLETED**
- ✅ **Multi-Session Support** - up to 2 parallel Claude CLI instances
- ✅ **React UI** - modern tabbed interface with real-time status
- ✅ **Terminal Synchronization** - automatic focus switching
- ✅ **Health Monitoring** - session diagnostics and auto-recovery  
- ✅ **Enhanced Commands** - comprehensive multi-session management
- ✅ **Robust Architecture** - scalable event-driven design

### ✅ **MVP 1.0 (v0.3.1) - STABLE**
- ✅ **Claude CLI Detection** - automatic terminal detection
- ✅ **Message Sending** - with automatic Enter press
- ✅ **Robust Error Handling** - reliable error management
- ✅ **Comprehensive Testing** - tested in real environments

### 🔮 **Future Roadmap**
- [ ] **Session Persistence** - save/restore sessions across VS Code restarts
- [ ] **Response Capture** - capture Claude responses from terminal
- [ ] **Enhanced UI** - themes, customizable layouts, session export
- [ ] **3+ Sessions** - support for unlimited parallel sessions
- [ ] **Advanced Features** - session templates, bulk operations

## 🐛 Known Issues

### 🆕 **Multi-Session (v0.4.0)**
1. **Session Limit** - currently supports maximum 2 sessions (by design)
2. **Session Persistence** - sessions don't survive VS Code restarts
3. **Bundle Size** - React bundle is large (1.42MB) but functional

### 💬 **General (All Versions)**
1. **Claude CLI Detection** - based on heuristic methods (reliable but not perfect)
2. **Response Capture** - send-only mode (responses stay in terminal)
3. **Settings UI** - basic configuration options

See [Issues](https://github.com/OleynikAleksandr/claude-chat-extension/issues) for complete list and planned improvements.

## 🤝 Contributing

Pull requests are welcome! Please:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Guidelines

- Follow existing code style
- Add tests for new functionality
- Update documentation
- Use conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Aleksandr Oleynik**
- GitHub: [@OleynikAleksandr](https://github.com/OleynikAleksandr)
- Project: [claude-chat-extension](https://github.com/OleynikAleksandr/claude-chat-extension)

## 🙏 Acknowledgments

- **Anthropic** for creating Claude CLI
- **VS Code Extension API** for powerful integration capabilities
- **TypeScript** for type safety and developer experience

---

⭐ **If this project helps you, please give it a star!** ⭐