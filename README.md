# ClaudeCodeBridge 🌉

[![Version](https://img.shields.io/badge/version-0.12.16-blue.svg)](https://github.com/OleynikAleksandr/claude-chat-extension/releases/tag/v0.12.16)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-brightgreen.svg)](https://code.visualstudio.com/)
[![GitHub Release](https://img.shields.io/github/v/release/OleynikAleksandr/claude-chat-extension)](https://github.com/OleynikAleksandr/claude-chat-extension/releases)

**The most efficient VS Code extension for real-time communication with Claude Code CLI**

ClaudeCodeBridge enables seamless integration between VS Code and Anthropic's Claude Code CLI, providing a native chat interface with OneShoot architecture for maximum efficiency.

## 🚀 Version 0.12.16 - Polished UI & OneShoot Architecture

Latest release with **refined user interface** and **91% cost reduction** through efficient OneShoot-only architecture.

### 🎯 Key Features
- **🚀 OneShoot Architecture**: Single-request processes with `claude --print --resume`
- **💰 91% Cost Reduction**: Dramatic savings through smart session caching
- **🔧 Real-time Tool Monitoring**: Live display of Read, Write, Bash, and other tool usage
- **📊 Token Usage Tracking**: Visual progress bar showing context consumption
- **💬 Multi-Session Support**: Manage multiple independent Claude conversations
- **⚡ Streaming Responses**: Character-by-character response display

### ✨ What's New in v0.12.16

- **Enhanced Status Bar**: Doubled height with improved readability
- **Smart Path Truncation**: Long file paths intelligently shortened to 80 characters
- **Refined Color Scheme**: Status indicators match token counter color (#00ff00)
- **Smooth Animations**: Token progress bar grows from 0% with easing
- **Consistent Tool Pulsation**: Active tools always show processing animation
- **Button-style Status Bar**: Matches the design of session controls

## 💡 How It Works

### Real-time Tool Monitoring
The extension displays exactly what Claude is doing at any moment:
- **Reading files**: Shows "Read: /path/to/file.ts"
- **Writing code**: Shows "Write: /path/to/new-file.js"
- **Running commands**: Shows "Bash: npm install"
- **Searching code**: Shows "Grep: searching for 'function'"
- **Ready state**: Shows "Assistant Ready For Next Task" in green

### Cost-Efficient Architecture
Each message is processed as a separate request with session caching:
1. User sends message
2. Extension spawns `claude --print --resume` process
3. Claude processes with cached context (91% token savings)
4. Response streams back in real-time
5. Process terminates cleanly

### Multi-Session Workflow
- Each session maintains independent context
- Switch instantly between sessions via tabs
- Sessions persist across VS Code restarts
- Maximum 2 concurrent sessions (configurable)

## 🏗️ Architecture

ClaudeCodeBridge uses **OneShoot-only architecture** for optimal performance:

### OneShoot Mode
**Efficient single-request processes with session caching:**
```
User Input → VS Code Extension → Claude Code CLI (--print --resume) → Response → Extension → User
```

**Key advantages:**
- ✅ 91% cost reduction through `--resume` flag
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