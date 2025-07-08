# Changelog

All notable changes to the Claude Chat Extension project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-07-08 🚀 **Bidirectional Communication - Real-Time Integration**

### 🎉 **BREAKTHROUGH: Real-Time Bidirectional Communication**
**This release implements full bidirectional communication with Claude Code CLI - responses are captured and processed in real-time!**

### ✨ **New Features**
- **Real-Time Communication**: Implemented Phase 1 of bidirectional communication plan
- **Process Management**: New ClaudeProcessManager for spawning and managing Claude Code processes
- **Stream Parsing**: Real-time JSON stream parsing with error recovery
- **Message Filtering**: Configurable filtering for text/thinking/tool_use/result/error messages
- **Session Management**: Create, track, and resume communication sessions
- **Enhanced Terminal Manager**: Extended TerminalManager with bidirectional capabilities
- **WSL Support**: Cross-platform compatibility for Windows Subsystem for Linux

### 🔧 **Technical Implementation**
- **ClaudeProcessManager**: Manages Claude Code child processes with `--output-format stream-json`
- **StreamJsonParser**: Handles real-time JSON stream parsing with buffer management
- **MessageTypeHandler**: Processes and filters different message types from Claude Code
- **EnhancedTerminalManager**: Extends existing TerminalManager with real-time features

### 🎯 **VS Code Integration**
- **New Command**: `claudeChat.sendBidirectional` for testing real-time communication
- **Automatic Detection**: Claude CLI availability detection on startup
- **Fallback Mode**: Graceful fallback to terminal mode when process mode unavailable
- **Debug Logging**: Enhanced output channel logging for troubleshooting

### 📁 **Architecture**
```
/src/real-time-communication/
├── ClaudeProcessManager.ts    - Process spawning and management
├── StreamJsonParser.ts        - JSON stream parsing
├── MessageTypeHandler.ts      - Message filtering and processing  
├── EnhancedTerminalManager.ts - Main bidirectional manager
└── index.ts                   - Exports
```

### 🔄 **Communication Flow**
1. **User Input** → EnhancedTerminalManager
2. **Process Spawn** → Claude Code with `--output-format stream-json`
3. **Real-Time Capture** → StreamJsonParser processes JSON stream
4. **Message Processing** → MessageTypeHandler filters and formats responses
5. **Response Delivery** → Back to VS Code interface

### ⚡ **Performance**
- **Real-Time**: Immediate response capture and processing
- **Efficient**: Minimal overhead with stream processing
- **Robust**: Error recovery and fallback mechanisms
- **Scalable**: Session-based architecture for multiple conversations

### 🔮 **Roadmap Progress**
- ✅ **Phase 1**: Real-Time Communication (COMPLETED)
- 🔄 **Phase 2**: Persistence & History (Next)
- 🔄 **Phase 3**: Analytics & Monitoring (Future)

---

## [0.4.5] - 2025-07-08 🌍 **International Release - English Interface**

### ⚠️ **IMPORTANT: One-Way Communication Only**
**This extension sends messages FROM VS Code TO Claude Code CLI terminals. Claude's responses appear in the terminal, NOT back in the chat interface.**

### 🎨 **Improved**
- **Interface**: Translated all Russian text to English for international users
- **Documentation**: Updated all version references to v0.4.5
- **UX**: Professional English interface ready for global distribution

### 🌍 **International Ready**
This release makes the extension fully international with English-only interface, ready for VS Code Marketplace publication.

---

## [0.4.3] - 2025-07-08 🎯 **Production Ready - Base Release**

### ⚠️ **IMPORTANT: One-Way Communication Only**
**This extension sends messages FROM VS Code TO Claude Code CLI terminals. Claude's responses appear in the terminal, NOT back in the chat interface.**

### 🔧 **Fixed**
- **CRITICAL**: Fixed VS Code API connection by adding `acquireVsCodeApi()` initialization
- **UI**: Resolved "Connection Error" in Multi-Session webview
- **UX**: Added proper extension icon (SVG) visible in Activity Bar

### 🎨 **Improved**
- **Interface**: Removed redundant Single Session view, kept Multi-Session only
- **UX**: Replaced placeholder "Create Session" button with helpful instructions in Russian
- **Documentation**: Added critical one-way communication warning to all docs

### 📦 **Technical**
- **Icons**: Added `media/icons/claude-chat.svg` extension icon
- **Styles**: Enhanced CSS for instruction display
- **Package**: Updated package.json configuration for cleaner interface
- **Git**: Restructured commit history with English messages for international repository

### 🎯 **Ready for Production**
This release establishes a stable base for the extension with all core functionality working properly. The one-way communication limitation is clearly documented for users.

## [0.4.0] - 2025-01-08 🚀 **MVP 2.0 - Multi-Session Support**

### 🎯 **MAJOR NEW FEATURES**

#### ✨ **Multi-Session Architecture**
- **NEW**: Support for up to 2 parallel Claude CLI sessions
- **NEW**: DualSessionManager for robust session management
- **NEW**: Event-driven architecture with comprehensive callback system
- **NEW**: Automatic session health monitoring and diagnostics
- **NEW**: Session state persistence during VS Code usage

#### 🎨 **Modern React UI**
- **NEW**: Complete React 19.1.0 + TypeScript interface
- **NEW**: Tabbed session switching with visual status indicators  
- **NEW**: Real-time session status updates (🔄🟡🟢🔴)
- **NEW**: Modern CSS with VS Code theme integration
- **NEW**: Responsive design with accessibility support

#### 🔄 **Terminal Synchronization**
- **NEW**: Automatic terminal.show() when switching between sessions
- **NEW**: Terminal state tracking and health monitoring
- **NEW**: Auto-recovery when terminals are closed by user
- **NEW**: Automatic session switching to remaining active session
- **NEW**: Enhanced terminal creation with proper naming

### 🚀 **Enhanced Commands & Shortcuts**

#### **New Multi-Session Commands**
- `Claude Chat: Open Multi-Session Panel` - open tabbed interface
- `Claude Chat: Create New Session` - create new Claude session
- `Claude Chat: Switch Session` - quick picker for session switching
- `Claude Chat: Close Session` - close selected session with confirmation
- `Claude Chat: Show Session Diagnostics` - detailed health report

#### **New Keyboard Shortcuts**
- `Ctrl+Shift+M` - Open multi-session panel
- `Ctrl+Shift+N` - Create new session
- `Ctrl+Shift+S` - Switch between sessions

### 🔧 **Technical Improvements**

#### **Architecture Enhancements**
- **NEW**: MultiSessionProvider for webview management
- **NEW**: React useVSCodeAPI hook for VS Code communication
- **NEW**: Comprehensive TypeScript types for session management
- **NEW**: Message passing system between React and Extension
- **NEW**: Session lifecycle management (creating → starting → ready/error)

#### **Developer Experience**
- **NEW**: Webpack build pipeline for React components
- **NEW**: Separate TypeScript configuration for webview
- **NEW**: Enhanced logging with emoji indicators 📩🆕🔄✅❌
- **NEW**: Comprehensive error handling with detailed feedback
- **NEW**: Session diagnostics for debugging and monitoring

### 🎛️ **Package.json Enhancements**
- Added React 19.1.0 and related dependencies
- New activation events for multi-session views
- Enhanced commands contribution with multi-session support
- Dual webview configuration (Single + Multi-Session modes)
- Extended keybindings for comprehensive session management

### 🏗️ **File Structure**
```
src/multi-session/
├── managers/DualSessionManager.ts      # Session management core
├── providers/MultiSessionProvider.ts   # VS Code integration  
├── types/Session.ts                    # TypeScript definitions
├── webview/
│   ├── components/                     # React UI components
│   ├── hooks/useVSCodeAPI.ts          # VS Code communication
│   └── index.tsx                      # React entry point
├── media/ (reset.css, vscode.css)     # Styling
├── webpack.config.js                  # Build configuration
└── tsconfig.webview.json              # TypeScript config
```

### 💪 **Backward Compatibility**
- **MAINTAINED**: All v0.3.1 single-session functionality
- **MAINTAINED**: Existing commands and shortcuts
- **MAINTAINED**: Classic webview interface
- **ENHANCED**: Improved error handling for single-session mode

### 📊 **Build & Performance**
- React bundle: 1.42MB (production build)
- TypeScript compilation: No errors
- Webpack optimization: Production mode with minimization
- Extension size: Optimized for VS Code Marketplace

### 🔍 **Quality Assurance**
- **TESTED**: All session management scenarios
- **TESTED**: Terminal synchronization and switching
- **TESTED**: Error handling and recovery mechanisms  
- **TESTED**: React UI responsiveness and VS Code integration
- **TESTED**: Command execution and keyboard shortcuts

### ⚠️ **Known Limitations**
- **Session Limit**: Maximum 2 parallel sessions (by design)
- **Persistence**: Sessions don't survive VS Code restarts
- **Bundle Size**: React adds ~1.4MB to extension package

### 🎊 **Development Credits**
- Generated with [Claude Code](https://claude.ai/code)
- Co-Authored-By: Claude <noreply@anthropic.com>

---

## [0.3.1] - 2025-01-08

### ✅ Fixed
- **CRITICAL FIX**: Added additional Enter press after sending message to Claude CLI
- Fixed automatic message submission issue in terminal
- Improved logging for command execution debugging

### Added
- Detailed logging for terminal command execution
- Additional 50ms delay and empty Enter to ensure Claude CLI message submission

### Technical Details
- Added `terminal.sendText('', true)` after main command
- Enhanced debugging information in `executeWithRetry()`

## [0.3.0] - 2025-01-08

### Added
- Comprehensive logging for `handleSendMessage` debugging
- Detailed logs in extension.ts and terminalManager.ts
- Full message processing tracing with timestamps

### Changed
- Improved diagnostics for Enter press issues
- Added logs at every stage of message processing

## [0.2.9] - 2025-01-08

### 🎯 Changed
- **UX IMPROVEMENT**: Removed intrusive confirmation dialogs
- Automatic use of active terminal without user prompts
- Enhanced Claude CLI detection - active terminal considered potential Claude CLI

### Fixed
- Improved fallback mechanism for better user experience
- Removed `vscode.window.showWarningMessage()` when Claude CLI not detected

## [0.2.8] - 2025-01-08

### 🚀 Added
- Implemented core `sendMessageToClaudeCli()` method
- Multi-level Claude CLI detection in terminals
- Comprehensive error handling with retry mechanisms
- Fallback strategy to active terminal

### Technical
- Added `TerminalSelectionStrategy` enum
- New detection methods: `detectByTerminalName`, `detectByShellPath`, `detectByEnvironment`
- Robust error codes and TypeScript definitions

## [0.2.7] - 2025-01-08

### ✅ Fixed
- **CRITICAL**: Fixed CSP violations in webview
- Removed all inline styles from main.js
- Moved styles to external CSS file (main.css)

### Added
- CSS classes `.connection-indicator` and `.status-text`
- Secure CSP policy without `'unsafe-inline'`

### Technical
- Resolved Content Security Policy violations
- Webview now fully compliant with VS Code security requirements

## [0.2.6] - 2025-01-08

### Added
- Extended VS Code commands
- Keyboard shortcuts for main operations
- Enhanced error handling

## [0.2.5] - 2025-01-08

### Added
- Core TerminalManager architecture
- Basic VS Code Terminal API integration
- WebView provider with chat interface

## [0.2.4] - 2025-01-08

### Added
- First working webview interface
- Basic webview-extension communication

## [0.2.0-0.2.3] - 2025-01-07

### Added
- Project initialization
- Basic VS Code extension structure
- TypeScript configuration
- Package.json manifest

---

## Legend

- `Added` for new features
- `Changed` for changes in existing functionality  
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for vulnerability fixes

## Migration Notes

### 🚀 **Upgrading to 0.4.0 (MVP 2.0)**
- **MAJOR UPDATE**: Multi-session support added alongside existing single-session mode
- **NO BREAKING CHANGES**: All existing functionality preserved
- **NEW FEATURES**: Access multi-session mode via `Ctrl+Shift+M` or Command Palette
- **INSTALL**: Requires fresh installation due to new React dependencies
- **RECOMMENDATION**: Use single-session mode for simple workflows, multi-session for complex tasks

### Upgrading to 0.3.1
- No configuration changes required
- Automatically fixes Enter press issues in Claude CLI

### Upgrading to 0.2.9  
- Confirmation dialogs removed - now automatic behavior
- Better UX when working with terminals

### Upgrading to 0.2.8
- Added new Claude CLI detection methods
- Extension reinstallation required for proper functionality