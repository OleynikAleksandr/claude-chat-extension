# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClaudeCodeBridge is a VS Code extension that provides real-time communication between VS Code and Claude Code CLI. The extension features a React-based multi-session webview UI with OneShoot-only architecture for maximum efficiency.

## Common Development Commands

### Build Commands
```bash
# Full build (extension + webview)
npm run build

# Build only the extension TypeScript
npm run build:extension

# Build only the React webview
npm run build:webview

# Watch mode for development
npm run watch          # Watch extension TypeScript
npm run watch:webview  # Watch React webview
```

### Quality Checks
```bash
# Run ESLint
npm run lint

# Run tests
npm run test

# Package the extension
vsce package
```

### Installation
```bash
# Install the packaged extension
code --install-extension claude-chat-*.vsix
```

## High-Level Architecture

### Session Management - OneShoot Only

The extension uses **OneShoot-only architecture** for all sessions:

**OneShoot Mode** - Cost-efficient single-request processes
- Uses `claude --print --resume` for each message
- Significant cost reduction through session caching
- Clean process lifecycle (one request per process)
- No persistent terminal or process management
- Paths:
  - Session Manager: `src/multi-session/managers/OneShootSessionManager.ts`
  - Process Manager: `src/multi-session/managers/OneShootProcessSessionManager.ts`

### Key Components

#### Extension Host (`src/`)
- `extension.ts` - Main entry point, registers commands and providers
- `multi-session/providers/MultiSessionProvider.ts` - Manages webview lifecycle
- `multi-session/monitors/JsonlResponseMonitor.ts` - Monitors Claude Code JSONL responses
- `multi-session/types/Session.ts` - Core session type definitions

#### React Webview (`src/multi-session/webview/`)
- `components/App.tsx` - Main React application
- `components/ChatWindow.tsx` - Chat interface component
- `components/TabBar.tsx` - Multi-session tab management
- `components/ServiceInfoBlock.tsx` - Tool usage and status display
- `hooks/useVSCodeAPI.ts` - VS Code API integration hook

### Communication Flow

1. **User → Extension**: Webview sends messages via VS Code postMessage API
2. **Extension → Claude**: Messages sent via OneShoot process with --print --resume flags
3. **Claude → Extension**: Responses captured from process stdout
4. **Extension → User**: Updates sent back to webview via postMessage

### Development Notes

- The extension uses TypeScript with strict mode enabled
- React components use TypeScript (.tsx files)
- Webpack bundles the React webview separately
- Source maps are disabled in production builds
- The extension follows VS Code's webview security best practices
- All sessions use OneShoot mode for consistency and efficiency

### Testing Approach

Currently, the extension uses manual testing as documented in `TESTING.md`. The test infrastructure includes:
- VS Code Test CLI for extension testing
- ESLint for code quality
- Manual testing procedures for multi-session functionality

### Session Workflow

1. User clicks "New Session" in the webview
2. Extension creates a new OneShoot session
3. For each message:
   - Process is spawned with `claude --print --resume` flags
   - Response is captured from stdout
   - Process terminates after response
4. Session state is maintained in memory
5. Session cleanup occurs on tab close