# Changelog

All notable changes to the Claude Chat Extension project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Upgrading to 0.3.1
- No configuration changes required
- Automatically fixes Enter press issues in Claude CLI

### Upgrading to 0.2.9  
- Confirmation dialogs removed - now automatic behavior
- Better UX when working with terminals

### Upgrading to 0.2.8
- Added new Claude CLI detection methods
- Extension reinstallation required for proper functionality