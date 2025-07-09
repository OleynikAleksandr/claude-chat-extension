# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.6] - 2025-07-09

### 🚀 Critical Processing Status Bar Fixes

**Focus:** Fixed tool_use detection to show processing status bar between ALL assistant messages.

### Fixed
- 🔧 **Tool Use Detection**: ProcessingStatusBar now appears for EVERY tool_use operation (Read, Write, Bash, etc.)
- 🔄 **Multi-Message Support**: Status bar stays visible throughout entire multi-part responses
- 🎨 **CSS Artifacts**: Removed automatic fadeOut animations causing visual glitches
- 📊 **Proper Tracking**: Each tool_use operation now triggers new processing session

### Technical Changes
- DualSessionManager: Added tool_use detection in handleJsonlEntry()
- ProcessingStatusBar.css: Removed automatic fadeOut animations, added `.hidden` class
- Enhanced JSONL parsing to detect tool_use operations in assistant responses
- Each tool operation gets unique tracking ID for proper session management

### Behavior Changes
- Processing status bar now appears between ALL assistant messages during multi-part responses
- No more premature hiding after first message
- Smoother transitions without visual artifacts
- Better synchronization with actual Claude Code CLI activity

## [0.8.5] - 2025-07-09

### 🔧 Processing Status Bar Improvements

**Focus:** Fixed premature hiding of processing status bar between multi-part assistant responses.

### Fixed
- 🎯 **Processing Status Bar Duration**: Extended timeout for multi-part responses (3s → 12s)
- 🔗 **State Detection Integration**: Connected ProcessingStatusManager with ClaudeStateDetection
- ⏱️ **Smart Stop Logic**: Status bar now hides only when assistant fully completes (WORKING → READY)
- 🕒 **Extended Timeouts**: Increased inactivity timeout (5s → 15s) and auto-complete (3s → 12s)

### Technical Changes
- ClaudeStateManager: `readyTimeoutMs` increased from 3000ms to 12000ms
- ProcessingStatusManager: `inactivityTimeoutMs` 5000ms → 15000ms, `autoCompleteTimeoutMs` 3000ms → 12000ms
- DualSessionStateAdapter: Added automatic `stopProcessing()` call on WORKING → READY transition
- Improved state change handling to properly detect end of multi-part responses

### Behavior Changes
- Processing status bar now stays visible throughout entire assistant response cycle
- Automatic hiding only occurs when assistant is truly ready for next request
- Better handling of responses with multiple messages or tool calls

## [0.8.4] - 2025-07-09

### 🚨 Critical Hotfix Release

**CRITICAL:** Version 0.8.3 was completely broken due to VS Code API conflicts. This hotfix restores functionality.

### Fixed
- 🔧 **VS Code API Conflict**: Fixed "An instance of the VS Code API has already been acquired" error
- 🛠️ **ProcessingStatusBridge**: Removed duplicate `acquireVsCodeApi()` calls
- 📡 **Event Management**: Proper cleanup of message listeners
- 🎯 **Webview Loading**: Interface now loads correctly without JavaScript errors

### Technical Changes
- ProcessingStatusBridge now uses global `vscode` API instead of acquiring new instance
- Added support for `processingStatusUpdate` and `processingStatusResponse` in useVSCodeAPI
- Improved TypeScript types for processing status messages
- Enhanced error handling in webview communication

### Status
- ✅ **Webview Interface**: Fully functional
- ✅ **Basic Operations**: Session creation, message sending work
- ✅ **State System**: 🟢 READY / 🔄 WORKING states operational
- 🔄 **Processing Status Bar**: Ready for testing (shows time, tokens, tool calls)

## [0.8.3] - 2025-07-09

### ❌ BROKEN RELEASE - Do Not Use

This version contained critical errors that prevented webview loading.

### Added (Intended Features)
- 📊 **Processing Status Bar**: Real-time display of processing time, token usage, tool calls
- 🔗 **JSONL Integration**: Live token tracking from Claude Code logs
- 🎯 **ProcessingStatusManager**: Centralized processing state management
- 🌉 **ProcessingStatusBridge**: React ↔ Extension communication bridge

### Issues
- Critical VS Code API conflict prevented interface loading
- JavaScript errors blocked all functionality
- Fixed in v0.8.4

## [0.8.2] - 2025-01-09

### 🎨 Simplified UX Release

This release dramatically simplifies the state system for better user experience.

### Changed
- 🟢 **2 States Instead of 4**: Simplified to just READY (🟢) and WORKING (🔄)
- 🚫 **No Tab Emojis**: Removed state emojis from tabs, keeping them only in chat header
- 🔄 **Animated Working Indicator**: Added CSS rotation animation for WORKING state
- 🎯 **Clearer Logic**: No more confusing IDLE vs READY states

### Technical Changes
- Updated `ClaudeState.ts` enum to 2 states
- Modified all state detection logic for simplified flow
- Updated UI components to support new state system
- Added CSS animation for spinning indicator
- Removed redundant pulse animations

### Known Issues
- Tool calls tracking not yet implemented (planned for v0.8.3)
- State may show READY while assistant continues working with tools

## [0.7.0] - 2025-01-09

### 🎉 Revolutionary State Monitoring Release

This release introduces **real-time Claude Code state monitoring** - see exactly what Claude is doing at any moment!

### Added
- 🟢 **Real-Time State Detection**: Live monitoring of Claude Code states (Ready, Processing, Responding, Idle)
- 🎯 **Smart UI Indicators**: Dynamic emoji indicators and animated spinners for active processes
- 📊 **Session State Sync**: All UI elements automatically sync to show current Claude state
- 🔄 **Automatic Updates**: States update instantly as Claude processes your requests
- 💡 **Advanced Pattern Detection**: Intelligent JSONL pattern analysis for precise state detection
- ✨ **Enhanced User Experience**: Visual feedback for every Claude operation

### Technical Improvements
- 🏗️ **EnhancedMultiSessionProvider**: Full WebviewViewProvider implementation with state integration
- 🔧 **State Detection System**: New module with JsonlPatternDetector, ClaudeStateManager, and DualSessionStateAdapter
- 📡 **Webview Communication**: Extended message protocol for state synchronization
- 🎨 **UI Components**: Updated TabBar and ChatWindow with real-time state indicators
- 🗂️ **Type Safety**: New TypeScript interfaces for state management (ClaudeCodeState, SessionStateData)

### Enhanced Features
- 🌟 **Visual State Indicators**: Emoji-based state representation (🟢 Ready, 🔄 Processing, ✍️ Responding, ⏸️ Idle)
- 🎭 **Animated Feedback**: Spinning indicators during active operations
- 🎯 **Session-Specific States**: Each session shows its own real-time state
- 📈 **State Statistics**: Built-in diagnostics and performance monitoring
- 🔍 **Debug Support**: Enhanced session diagnostics with state information

### Architecture
- 🏛️ **Three-Layer Architecture**: Added State Detection layer to existing Extension↔Terminal flows
- 🔄 **Facade Pattern**: ClaudeStateDetectionFacade for unified state management
- 🔌 **Adapter Integration**: DualSessionStateAdapter bridges state detection with session management
- 🎯 **Clean Separation**: State detection doesn't modify existing functionality

### Performance
- ⚡ **Optimized Updates**: Smart debouncing and caching for state changes
- 📊 **Minimal Overhead**: Lightweight state monitoring with efficient resource usage
- 🧹 **Auto-cleanup**: Automatic removal of stale state data
- 🎮 **Smooth Animations**: 60fps indicators with CSS optimizations

### Backward Compatibility
- ✅ **Full Compatibility**: All existing commands and features work unchanged
- 🔄 **Seamless Migration**: Automatic upgrade from previous versions
- 🛡️ **Zero Breaking Changes**: Complete preservation of existing workflows
- 📚 **API Consistency**: All public APIs remain stable

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