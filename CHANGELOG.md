# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.6] - 2025-01-09

### Changed
- 🎨 **UI Welcome Screen**: Updated to prominently display bidirectional communication feature
- 🎨 **Message Display**: Replaced emoji icons with professional text labels ("User", "Assistant")
- 🎨 **Typography**: Reduced chat font size from 14px to 13px for better readability
- 🎨 **Professional Look**: Removed decorative emojis from empty state
- 🎨 **Message Headers**: Added proper styling with uppercase labels and color coding
- 🧹 **Code Cleanup**: Removed version numbers from all source code comments

### Improved
- ✨ Color-coded message types: blue for User, green for Assistant
- ✨ Enhanced message header styling with proper typography
- ✨ More professional and clean user interface

## [0.6.5] - 2025-01-08

### 🎉 First Stable Release
This is the first fully stable version of ClaudeCodeBridge with complete bidirectional communication.

### Added
- ✅ **Complete bidirectional communication** between VS Code extension and Claude Code CLI
- ✅ **ПОТОК 1 (Extension → Terminal)**: Send messages from webview to Claude Code terminal
- ✅ **ПОТОК 2 (Terminal → Extension)**: Receive Claude responses back to webview in real-time
- ✅ **Multi-session architecture** replacing complex bidirectional bridge
- ✅ **JSONL response monitoring** with support for new Claude Code format
- ✅ **Automatic terminal management** with Enter key handling for long messages
- ✅ **Real-time file system watchers** for Claude Code JSONL files

### Fixed
- 🔧 **JSONL file selection**: Now correctly finds newest session files created after first message
- 🔧 **Response parsing**: Updated to handle new Claude Code JSONL format structure
- 🔧 **Terminal refresh**: Added force refresh for messages >200 characters
- 🔧 **Startup dialog**: Removed annoying "No terminal available" message on VS Code restart
- 🔧 **Delayed monitoring**: 3-second delay before starting JSONL monitoring to ensure file exists

### Removed
- 🗑️ **Legacy bidirectional bridge code** completely removed
- 🗑️ **TerminalManager initialization** that caused startup dialogs
- 🗑️ **ClaudeChatViewProvider** class and related components
- 🗑️ **Unused imports and commands** from extension.ts

### Performance
- ⚡ **73% size reduction**: Extension size reduced from 44.97KB to 12.01KB
- ⚡ **Cleaner architecture**: Streamlined from ~1050 lines to ~236 lines in extension.ts
- ⚡ **Faster startup**: No unnecessary terminal initialization on extension load

### Technical Details
- **Two-flow architecture**: Clean separation of Extension→Terminal and Terminal→Extension flows
- **Dynamic JSONL detection**: Automatically finds and monitors correct Claude Code session files
- **Format compatibility**: Supports both old and new Claude Code JSONL response formats
- **Session lifecycle management**: Proper handling of session creation, monitoring, and cleanup

## [0.6.4] - 2025-01-08

### Fixed
- Updated JSONL parser to handle new Claude Code response format
- Added support for both legacy and new message structures

## [0.6.3] - 2025-01-08

### Fixed
- Added 3-second delay before starting JSONL monitoring
- Fixed terminal refresh for long messages
- Improved JSONL file detection timing

## [0.6.2] - 2025-01-08

### Added
- Multi-session architecture implementation
- JSONL response monitoring system
- Two-flow communication structure

## [0.6.1] - 2025-01-08

### Added
- Initial bidirectional communication framework

## [0.6.0] - 2025-01-08

### Added
- Project restructure for bidirectional communication
- Base architecture for Claude Code integration

---

## Previous Versions (0.1.0 - 0.5.x)
Earlier versions focused on basic chat functionality and terminal integration. 
Version 0.6.5 represents a complete architectural redesign for stable bidirectional communication.
EOF < /dev/null