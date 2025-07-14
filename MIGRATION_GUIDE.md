# Migration Guide to v0.12.0

## Overview

Claude Chat Extension v0.12.0 is a major release that simplifies the extension architecture to use **OneShoot-only mode**. This guide will help you migrate from previous versions.

## What's Changed

### Architecture Simplification
- **Removed**: Terminal Mode and Process Mode
- **Kept**: OneShoot Mode (now the only mode)
- **Result**: Cleaner, more reliable, and cost-efficient operation

### Benefits of v0.12.0
- ✅ **Significant cost reduction** maintained through efficient caching
- ✅ **Simpler codebase** - removed 17 legacy files and ~2500 lines of code
- ✅ **Better reliability** - no persistent terminals or processes to manage
- ✅ **Faster performance** - reduced complexity improves response times
- ✅ **Same user experience** - UI and workflows remain unchanged

## Migration Steps

### For Users

1. **Backup your sessions** (optional)
   - Your existing sessions will continue to work
   - Consider exporting important conversations before upgrading

2. **Install v0.12.0**
   ```bash
   # Download the latest VSIX from releases
   code --install-extension claude-chat-v0.12.0.vsix
   ```

3. **No configuration needed**
   - The extension will automatically use OneShoot mode
   - All your preferences are preserved
   - No changes to keyboard shortcuts or commands

### For Developers

If you've forked or modified the extension:

1. **Update dependencies**
   ```bash
   npm install
   npm run build
   ```

2. **Key changes to note:**
   - `DualSessionManager` → `OneShootSessionManager`
   - Removed `SessionMode` type
   - Removed `terminal` field from Session interface
   - All sessions now use OneShoot architecture

3. **Removed files:**
   - `/src/bidirectional-bridge/` (entire directory)
   - `/src/terminalManager.ts`
   - `/src/interactive-commands/` (entire directory)
   - `/src/multi-session/managers/ProcessSessionManager.ts`
   - Legacy terminal-related code

## Breaking Changes

### API Changes
- `session.mode` property removed - all sessions use OneShoot
- `session.terminal` property removed - no terminal references
- Terminal-specific commands removed from package.json

### Command Changes
The following legacy commands have been removed:
- `claudeChat.sendMessage`
- `claudeChat.sendBidirectional`
- `claudeChat.quickSend`
- `claudeChat.togglePanel`
- `claudeChat.clearHistory`
- `claudeChat.showStatus`
- `claudeChat.createSession`
- `claudeChat.switchSession`
- `claudeChat.closeSession`
- `claudeChat.sessionDiagnostics`

**Remaining commands:**
- `claudeChat.openChat` - Opens the chat panel
- `claudeChat.openMultiSession` - Opens multi-session panel

## FAQ

### Q: Will my existing sessions still work?
**A:** Yes! All sessions automatically use OneShoot mode. Your chat history and preferences are preserved.

### Q: Is there any cost increase?
**A:** No! OneShoot mode maintains significant cost reduction through the `--resume` flag.

### Q: Why remove Terminal and Process modes?
**A:** OneShoot mode proved to be the most reliable and efficient. Removing the other modes simplifies the codebase and improves maintainability.

### Q: Can I still use multiple sessions?
**A:** Yes! Multi-session support remains unchanged. You can have multiple concurrent OneShoot sessions.

### Q: What if I preferred Terminal mode?
**A:** OneShoot mode provides the same functionality with better reliability. The user experience remains the same.

## Troubleshooting

### Extension not loading after update
1. Restart VS Code
2. Check the output panel for errors
3. Reinstall the extension if needed

### Sessions appear frozen
1. Close and reopen the chat panel
2. Sessions now create fresh processes for each message
3. No persistent terminals to get stuck

### Performance issues
- OneShoot mode should actually improve performance
- Each message spawns a clean process
- No background terminal monitoring

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/OleynikAleksandr/claude-chat-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/OleynikAleksandr/claude-chat-extension/discussions)
- **Documentation**: See updated README.md and CLAUDE.md

## Summary

v0.12.0 simplifies Claude Chat Extension to use only the most efficient and reliable session mode. The migration is automatic with no configuration required. Enjoy the cleaner, faster, and more reliable experience!

---

**Migration Guide Version:** 1.0.0  
**For Claude Chat Extension:** v0.12.0  
**Last Updated:** January 2025