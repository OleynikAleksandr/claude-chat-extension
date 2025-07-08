# 🚀 Claude Chat Extension v0.4.3 - Production Ready Release

**Multi-Session Support & Modern React UI**

## ⚠️ **IMPORTANT: One-Way Communication Only**
**This extension sends messages FROM VS Code TO Claude Code CLI terminals. Claude's responses appear in the terminal, NOT back in the chat interface. The chat serves as an input method to send messages to Claude CLI sessions.**

\![Version](https://img.shields.io/badge/version-0.4.3-brightgreen) \![Status](https://img.shields.io/badge/status-Production%20Ready-success) \![Multi-Session](https://img.shields.io/badge/Multi--Session-Enabled-orange)

---

## 🎯 **WHAT'S NEW IN v0.4.3**

### ✅ **Fixed VS Code API Integration**
- **Resolved Connection Error** - Added proper `acquireVsCodeApi()` initialization
- **Working Multi-Session Interface** - Chat now communicates correctly with VS Code
- **Custom Extension Icon** - Added SVG icon visible in Activity Bar

### 🎨 **Improved User Experience**
- **Simplified Interface** - Removed redundant Single Session view
- **Helpful Instructions** - Added user guide in Russian for better onboarding
- **Clean Design** - Replaced placeholder screens with useful content

### 🚀 **Multi-Session Support** 
Run up to **2 parallel Claude CLI sessions** simultaneously\! Switch between different conversations, projects, or contexts without losing your place.

### 🖥️ **Modern React UI**
Beautiful **tabbed interface** with:
- **Session tabs** with real-time status indicators (🟢🟡🔴⚪)
- **Responsive design** that adapts to VS Code themes
- **Visual feedback** for all operations

### 🔄 **Terminal Synchronization**
- **Automatic terminal switching** when you switch session tabs
- **Health monitoring** of all Claude CLI instances  
- **Auto-recovery** when terminals are closed
- **Smart session management** with automatic cleanup

---

## 🎮 **KEY FEATURES**

### 🆕 **New Commands**
| Command | Shortcut | Description |
|---------|----------|-------------|
| `Claude Chat: Open Multi-Session Panel` | `Ctrl+Shift+M` | Open multi-session interface |
| `Claude Chat: Create New Session` | `Ctrl+Shift+N` | Create new Claude CLI session |
| `Claude Chat: Switch Session` | `Ctrl+Shift+S` | Switch between active sessions |
| `Claude Chat: Close Session` | - | Close session with confirmation |
| `Claude Chat: Show Session Diagnostics` | - | View detailed session health info |

### 💪 **Core Functionality**
- ✅ **Send messages to Claude CLI** - One-way communication from VS Code to terminal
- ✅ **Multi-session management** - Up to 2 parallel sessions
- ✅ **Automatic terminal detection** - Finds Claude CLI instances
- ✅ **Session status monitoring** - Real-time health checks
- ✅ **Error recovery** - Handles terminal closures gracefully

---

## 🔧 **Installation & Usage**

### Installation
1. Download [`claude-chat-0.4.3.vsix`](https://github.com/OleynikAleksandr/claude-chat-extension/releases)
2. Install: `code --install-extension claude-chat-0.4.3.vsix`
3. Restart VS Code

### Quick Start
1. Click Claude Chat icon in Activity Bar
2. Click "+ New Session" to create first session
3. Wait for "Ready" status
4. Type messages and press Enter
5. **Check terminal for Claude's responses**

---

## ⚠️ **Known Limitations**

### **One-Way Communication**
- Messages go FROM VS Code TO Claude CLI terminal only
- Claude's responses appear in terminal, not in chat interface
- Chat serves as input method, terminal serves as output

### **Session Limits**
- Maximum 2 parallel sessions
- Requires Claude Code CLI to be installed
- Works with VS Code integrated terminal only

---

## 🚀 **What's Next**

This v0.4.3 release establishes a solid foundation for future enhancements:

### **Potential Future Features**
- **Two-way communication** - Parse Claude responses back to chat
- **Message history persistence** - Save conversations between sessions
- **Export functionality** - Save chats to files
- **Multilingual interface** - Support for multiple languages
- **Advanced settings** - Customizable behavior and appearance

---

## 🔗 **Links**

- **GitHub Repository**: [OleynikAleksandr/claude-chat-extension](https://github.com/OleynikAleksandr/claude-chat-extension)
- **Issues & Feedback**: [GitHub Issues](https://github.com/OleynikAleksandr/claude-chat-extension/issues)
- **Documentation**: [README.md](README.md)

---

**Built with ❤️ for the Claude Code community**

*This extension enhances your Claude Code workflow by providing a convenient VS Code interface for managing multiple Claude CLI sessions.*
EOF < /dev/null