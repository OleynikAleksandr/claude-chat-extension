# Claude Chat Extension

[![Version](https://img.shields.io/badge/version-0.12.16-blue.svg)](https://github.com/OleynikAleksandr/claude-chat-extension/releases/tag/v0.12.16)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-brightgreen.svg)](https://code.visualstudio.com/)
[![GitHub Release](https://img.shields.io/github/v/release/OleynikAleksandr/claude-chat-extension)](https://github.com/OleynikAleksandr/claude-chat-extension/releases)

**A familiar chat interface for Claude Code CLI - no terminal commands required!**

Claude Chat Extension provides a user-friendly VS Code interface that brings Claude's powerful coding capabilities to a familiar chat interface. No more struggling with terminal commands - just chat naturally with Claude while it handles all the technical complexity in the background.

> ⚠️ **Early Release Version**: This is a functional starting version with core features working. Many features are still in development and will be added in future updates. We appreciate your patience and feedback as we continue to improve the extension.

## 🌟 Why Claude Chat Extension?

### 💬 **Familiar Chat Interface**
Unlike terminal-based tools, Claude Chat Extension offers a standard chat UI that anyone can use. Type your messages, see responses in real-time, and interact with Claude just like any modern chat application.

### 🔧 **Invisible Background Processing**
Claude Code CLI runs seamlessly in the background. You never see terminal windows or command-line interfaces - everything happens behind the scenes while you focus on your conversation.

### 📊 **Real-time JSON Log Monitoring**
Need to see what's happening under the hood? Click the "Raw Data" button to monitor all Claude Code logs in real-time JSON format. Perfect for debugging or understanding Claude's tool usage.

## 🚀 Version 0.12.16 - Professional Chat Experience

### 🎯 Key Advantages
- **💬 Chat UI, Not Terminal**: User-friendly interface that anyone can use - no command-line knowledge required
- **👻 Background Processing**: Claude Code CLI runs invisibly - you never see terminal windows
- **📊 Live Monitoring**: Click "Raw Data" to see real-time JSON logs of all Claude's operations
- **🔧 Tool Transparency**: Watch Claude work with files, run commands, and edit code in real-time
- **💰 Cost Efficient**: Smart session caching reduces API costs dramatically
- **📦 Multi-Session**: Work on multiple projects simultaneously in separate chat tabs

### ✨ Technical Features

- **OneShoot Architecture**: Each message spawns a clean `claude --print --resume` process
- **Streaming Responses**: See Claude's responses character-by-character as they're generated
- **Full Tool Support**: Read, Write, Edit, Bash, Grep, WebSearch, and all other Claude tools
- **Token Tracking**: Visual progress bar shows real-time token usage against context limit
- **Session Persistence**: Continue conversations across VS Code restarts
- **Error Recovery**: Each message gets a fresh process - no hanging terminals

## 💡 How It Works

### Behind the Scenes
Claude Chat Extension handles all the complexity for you:

1. **You type** in the familiar chat interface
2. **Extension manages** Claude Code CLI in the background (completely invisible)
3. **Claude executes** tools and commands without any terminal windows
4. **You see** responses streaming in the chat, with live status updates
5. **Optionally monitor** raw JSON logs by clicking "Raw Data" button

### What You See vs What Happens

| What You See | What Actually Happens |
|--------------|----------------------|
| Clean chat interface | `claude --print --resume` processes in background |
| "Claude is reading file.ts" | Full file system operations executed invisibly |
| "Running: npm install" | Commands run in hidden processes |
| Streaming text responses | Real-time JSONL parsing and display |
| Simple "Raw Data" toggle | Complete JSON log monitoring system |

### Multi-Session Workflow
- Each session maintains independent context
- Switch instantly between sessions via tabs
- Sessions persist across VS Code restarts
- Maximum 2 concurrent sessions (configurable)

## 🏗️ Architecture

Claude Chat Extension uses **OneShoot-only architecture** for optimal performance:

### OneShoot Mode
**Efficient single-request processes with session caching:**
```
User Input → VS Code Extension → Claude Code CLI (--print --resume) → Response → Extension → User
```

**Key advantages:**
- ✅ Significant cost reduction through `--resume` flag
- ✅ Clean process lifecycle (one request per process)
- ✅ No persistent terminal or process management
- ✅ Automatic session caching by Claude Code CLI
- ✅ Simplified error handling and recovery

## 📦 Installation

### From Release (Recommended)
1. Download the latest `.vsix` file from the [Releases](https://github.com/OleynikAleksandr/claude-chat-extension/releases) page
2. Install using Command Palette:
   - Open Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux)
   - Run `Extensions: Install from VSIX...`
   - Select the downloaded `.vsix` file

### From Source
```bash
# Clone the repository
git clone https://github.com/OleynikAleksandr/claude-chat-extension.git
cd claude-chat-extension

# Install dependencies
npm install

# Build the extension
npm run build

# Package the extension
vsce package
```

## 🚀 Getting Started

1. **Install Claude Code CLI**: Follow the instructions at [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
2. **Install the extension**: Use one of the installation methods above
3. **Open Claude Chat**: 
   - Click the Claude Chat icon in the Activity Bar, or
   - Use keyboard shortcut `Cmd+Shift+C` (macOS) / `Ctrl+Shift+C` (Windows/Linux)
4. **Start chatting**: Messages are automatically sent using OneShoot mode

## 🎯 Usage

### Basic Chat
1. Type your message in the input field
2. Press Enter or click Send
3. Claude will process your request using the OneShoot architecture
4. Responses appear in real-time with tool usage displayed in the footer

### Multi-Session Management
- Click "New Session" to start a fresh conversation
- Switch between sessions using the tab bar
- Each session maintains its own context independently
- Sessions are automatically cached for cost efficiency

### Slash Commands
- `/clear` - Clear the current chat history
- `/restart` - Restart the current session
- `/help` - Show available commands

## 🛠️ Development

### Prerequisites
- Node.js 16.x or higher
- VS Code 1.80.0 or higher
- npm 8.x or higher

### Build Commands
```bash
# Full build (extension + webview)
npm run build

# Watch mode for development
npm run watch          # Watch extension TypeScript
npm run watch:webview  # Watch React webview

# Quality checks
npm run lint           # Run ESLint
npm run test          # Run tests
```

### Project Structure
```
claude-chat-extension/
├── src/
│   ├── extension.ts                    # Main extension entry point
│   ├── multi-session/
│   │   ├── managers/
│   │   │   ├── OneShootSessionManager.ts      # Main session manager
│   │   │   └── OneShootProcessSessionManager.ts # Process management
│   │   ├── providers/
│   │   │   └── MultiSessionProvider.ts        # Webview provider
│   │   ├── monitors/
│   │   │   └── JsonlResponseMonitor.ts        # JSONL file monitoring
│   │   ├── webview/
│   │   │   └── components/                     # React components
│   │   └── types/
│   │       └── Session.ts                      # Type definitions
│   └── debug/
│       └── RawJsonOutputChannel.ts             # Debug output channel
├── package.json                               # Extension manifest
├── tsconfig.json                             # TypeScript configuration
└── webpack.config.js                         # Webpack configuration
```

## 🔮 Future Plans

This is an early release with core functionality. Here's what's coming:

### Near Term
- 🗺️ Settings page for configuration options
- 🎨 Theme customization (dark/light modes)
- 💾 Export/import chat history
- 🔍 Better search within conversations
- 🌐 Internationalization support

### Medium Term  
- 🤖 AI-powered code suggestions
- 📊 Advanced analytics and usage statistics
- 🔗 Integration with popular development tools
- 📤 Cloud sync for settings and history
- 🎯 Custom prompt templates

### Long Term
- 👥 Team collaboration features
- 🔌 Plugin system for extensions
- 📡 API for third-party integrations
- 🎆 Advanced automation capabilities

Want to see a specific feature? [Open an issue](https://github.com/OleynikAleksandr/claude-chat-extension/issues) and let us know!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Anthropic team for creating Claude and Claude Code CLI
- VS Code extension community for guidance and best practices
- All contributors who have helped improve this extension

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/OleynikAleksandr/claude-chat-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/OleynikAleksandr/claude-chat-extension/discussions)
- **Email**: Support via GitHub issues preferred

---

Made with ❤️ by [Aleksandr Oleynik](https://github.com/OleynikAleksandr)