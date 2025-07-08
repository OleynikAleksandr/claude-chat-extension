# Claude Chat Extension for VS Code

🚀 **VS Code extension for seamless Claude Code CLI integration**

Send messages from a convenient VS Code chat interface directly to your terminal running Claude CLI.

![Claude Chat Extension Demo](https://img.shields.io/badge/VS%20Code-Extension-blue) ![Version](https://img.shields.io/badge/version-0.3.1-green) ![Status](https://img.shields.io/badge/status-MVP%20Ready-success)

## ✨ Features

- 💬 **Intuitive chat interface** in VS Code sidebar
- 🔍 **Auto-detection of Claude CLI** in active terminals  
- ⚡ **Instant message sending** with automatic Enter
- 🛡️ **Robust error handling** with retry mechanisms
- 🎯 **Smart fallback to active terminal** without intrusive dialogs
- 📊 **Comprehensive logging** for debugging

## 🚀 Quick Start

### Installation

1. Download the latest release [`claude-chat-0.3.1.vsix`](https://github.com/OleynikAleksandr/claude-chat-extension/releases)
2. Install in VS Code:
   ```bash
   code --install-extension claude-chat-0.3.1.vsix
   ```
3. Restart VS Code

### Usage

1. **Open terminal** in VS Code
2. **Launch Claude CLI**: `claude` (if installed)
3. **Open chat**: `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac)
4. **Type your message** and press Enter or click "Send"
5. **Message appears in Claude CLI** and is automatically submitted

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|----------|---------|
| `Ctrl+Shift+C` | Open chat panel |
| `Ctrl+Shift+Enter` | Quick send message |
| `Ctrl+Shift+T` | Toggle chat panel |
| `Ctrl+Shift+Delete` | Clear chat history |

## 🔧 Commands

Open Command Palette (`Ctrl+Shift+P`) and search for:

- `Claude Chat: Open Chat Panel` - open chat interface
- `Claude Chat: Quick Send` - quick message input dialog
- `Claude Chat: Show Terminal Status` - display terminal status
- `Claude Chat: Clear History` - clear chat history

## 📋 Requirements

- **VS Code** version 1.85.0 or higher
- **Claude CLI** installed and available in terminal
- **Active terminal** with running `claude` or any terminal

## 🏗️ Architecture

```
Webview UI → Extension Host → TerminalManager → VS Code Terminal API → Claude CLI
```

### Core Components

- **TerminalManager** - terminal management and command execution
- **ClaudeChatViewProvider** - webview interface and communication  
- **Types** - TypeScript definitions for type safety
- **Error Handling** - comprehensive error management

## 🛠️ Development

### Local Setup

```bash
git clone https://github.com/OleynikAleksandr/claude-chat-extension.git
cd claude-chat-extension
npm install
```

### Build

```bash
# Compile TypeScript
npm run compile

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

- ✅ **MVP Ready** - core functionality working
- ✅ **Claude CLI Detection** - automatic terminal detection
- ✅ **Message Sending** - with automatic Enter press
- ✅ **Robust Error Handling** - reliable error management
- ✅ **Comprehensive Testing** - tested in real environments

### Roadmap

- [ ] Capture Claude responses from terminal
- [ ] Chat history with responses  
- [ ] Enhanced Claude CLI detection
- [ ] Extension settings
- [ ] UI themes

## 🐛 Known Issues

1. **Claude CLI Detection** based on heuristic methods
2. **Output Capture** not yet implemented (send-only)
3. **Settings** currently basic

See [Issues](https://github.com/OleynikAleksandr/claude-chat-extension/issues) for complete list.

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