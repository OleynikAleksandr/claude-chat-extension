# =€ Claude Chat Extension v0.4.0 - MVP 2.0 Release

**Multi-Session Support & Modern React UI**

![Version](https://img.shields.io/badge/version-0.4.0-brightgreen) ![Status](https://img.shields.io/badge/status-MVP%202.0%20Ready-success) ![Multi-Session](https://img.shields.io/badge/Multi--Session-Enabled-orange)

---

## <¯ **WHAT'S NEW**

### =% **Multi-Session Support** 
Run up to **2 parallel Claude CLI sessions** simultaneously! Switch between different conversations, projects, or contexts without losing your place.

### <¨ **Modern React UI**
Beautiful **tabbed interface** with:
- **Session tabs** with real-time status indicators (==á=â=4)
- **Responsive design** that adapts to VS Code themes
- **Visual feedback** for all operations

### ¡ **Terminal Synchronization**
- **Automatic terminal switching** when you switch session tabs
- **Health monitoring** of all Claude CLI instances  
- **Auto-recovery** when terminals are closed
- **Smart session management** with automatic cleanup

---

## =€ **KEY FEATURES**

### <• **New Commands**
- `Claude Chat: Open Multi-Session Panel` - Launch the new tabbed interface
- `Claude Chat: Create New Session` - Instantly create a new Claude session
- `Claude Chat: Switch Session` - Quick picker to jump between sessions
- `Claude Chat: Close Session` - Safely close sessions with confirmation
- `Claude Chat: Show Session Diagnostics` - Detailed health and status report

### ( **New Keyboard Shortcuts**
- `Ctrl+Shift+M` (`Cmd+Shift+M`) - Open multi-session panel
- `Ctrl+Shift+N` (`Cmd+Shift+N`) - Create new session
- `Ctrl+Shift+S` (`Cmd+Shift+S`) - Switch between sessions

### =ª **Enhanced Capabilities**
- **Dual interface modes**: Choose between classic single-session or new multi-session
- **Session persistence**: Sessions stay active during your VS Code work session
- **Enhanced error handling**: Better feedback and automatic recovery
- **Real-time status**: Always know which sessions are healthy and active

---

## =æ **INSTALLATION**

### **Download & Install**
1. Download [`claude-chat-0.4.0.vsix`](https://github.com/OleynikAleksandr/claude-chat-extension/releases/download/v0.4.0/claude-chat-0.4.0.vsix)
2. Install in VS Code:
   ```bash
   code --install-extension claude-chat-0.4.0.vsix
   ```
3. Restart VS Code
4. Ready to use! <‰

### **Quick Start**
1. **Open Multi-Session Panel**: `Ctrl+Shift+M`
2. **Create your first session**: Click "+" or `Ctrl+Shift+N`
3. **Start chatting**: Messages automatically go to the active Claude CLI session
4. **Create second session**: Click "+" again for parallel conversations
5. **Switch anytime**: Click tabs or use `Ctrl+Shift+S`

---

## = **MIGRATION FROM v0.3.1**

###  **Fully Backward Compatible**
- **All existing functionality preserved** - your current workflows work exactly as before
- **No breaking changes** - upgrade with confidence
- **Classic mode still available** - use `Ctrl+Shift+C` for single-session mode

### <• **What's Added**
- **New multi-session interface** alongside the classic interface
- **Enhanced commands** for session management
- **Improved error handling** and diagnostics

---

## <× **TECHNICAL DETAILS**

### **Architecture**
- **React 19.1.0** + TypeScript for modern UI
- **Event-driven** session management
- **Webpack optimized** build pipeline
- **VS Code API integration** with comprehensive message passing

### **Package Contents**
- **Extension size**: ~477KB (was ~54KB in v0.3.1)
- **React bundle**: 1.42MB optimized production build
- **37 files** including comprehensive documentation

### **Performance**
- **Fast startup**: Extension activates only when needed
- **Memory efficient**: Sessions are cleaned up automatically
- **Terminal synchronization**: <100ms switching time

---

## =Ž **USE CASES**

### **Perfect for:**
- **Multiple projects**: Keep separate Claude conversations for different codebases
- **Context switching**: Different sessions for coding, documentation, debugging
- **Parallel workflows**: Research in one session while coding in another
- **Team collaboration**: Different sessions for different team members' questions

### **Example Workflows:**
1. **Session 1**: Working on frontend React components
2. **Session 2**: Backend API development and database queries
3. **Switch instantly** between contexts without losing conversation history

---

## =' **TROUBLESHOOTING**

### **Common Issues & Solutions**
- **Session won't start**: Check that Claude CLI is installed and accessible
- **Terminal synchronization**: Use `Claude Chat: Show Session Diagnostics` for health check
- **Performance**: Large React bundle is normal - it's optimized for production

### **Debug Commands**
- `Claude Chat: Show Session Diagnostics` - Comprehensive health report
- `Claude Chat: Show Terminal Status` - Classic terminal status
- Check VS Code Developer Console for detailed logs

---

## =. **WHAT'S NEXT**

### **Future Roadmap**
- **Session persistence** across VS Code restarts
- **Unlimited sessions** (currently limited to 2)
- **Response capture** from Claude CLI
- **Enhanced UI** with themes and customization
- **Session templates** and bulk operations

---

## <Š **CREDITS**

**Developed with:** [Claude Code](https://claude.ai/code)  
**Co-Authored-By:** Claude <noreply@anthropic.com>

---

## =Þ **SUPPORT**

- **GitHub Issues**: [Report bugs or request features](https://github.com/OleynikAleksandr/claude-chat-extension/issues)
- **Documentation**: [Full README](https://github.com/OleynikAleksandr/claude-chat-extension/blob/main/README.md)
- **Changelog**: [Detailed changes](https://github.com/OleynikAleksandr/claude-chat-extension/blob/main/CHANGELOG.md)

---

P **If this extension helps your workflow, please star the repository!** P

**Download now:** [`claude-chat-0.4.0.vsix`](https://github.com/OleynikAleksandr/claude-chat-extension/releases/download/v0.4.0/claude-chat-0.4.0.vsix)