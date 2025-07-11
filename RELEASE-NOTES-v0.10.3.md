# Release Notes v0.10.3

**Release Date:** July 10, 2025  
**Build:** claude-chat-0.10.3.vsix  

## =' Bug Fixes

### Fixed Status Detection Logic
**Issue:** ServiceInfoBlock incorrectly showed "COMPLETED" status while tools were still active.

**Root Cause:** The status detection algorithm only checked `stop_reason` but ignored active tool_use items.

**Solution:** 
- Added new method `determineStatusFromStopReasonAndTools()` 
- Improved logic to prioritize active tools over stop_reason
- Removed legacy `determineStatusFromStopReason()` method

**New Logic:**
1. **Active tools present** ’ Always show `PROCESSING` status
2. **No active tools + stop_reason: null** ’ Show `COMPLETED` status  
3. **No active tools + other stop_reason** ’ Show `PROCESSING` status

## =Ê Technical Changes

### Modified Files
- `src/multi-session/monitors/JsonlResponseMonitor.ts`
  - Line 411: Updated to use `determineStatusFromStopReasonAndTools()`
  - Lines 494-543: Added new status detection method
  - Removed deprecated status detection method

### Improved Status Accuracy
- **Before:** Status based only on stop_reason (could show false COMPLETED)
- **After:** Status considers both stop_reason AND active tools (accurate status)

## <¯ Benefits

- **Accurate Status Display:** ServiceInfoBlock now correctly shows PROCESSING when tools are active
- **Better UX:** Users get reliable feedback about Claude's actual processing state
- **Fixed False Completions:** Eliminates premature COMPLETED status during tool execution

## =È Context Window Understanding

Based on analysis of Claude Code behavior:
- **Effective Context Window:** ~160k tokens (80% of 200k limit)
- **ServiceInfoBlock Cache Display:** Shows accurate cache_read_input_tokens
- **Context Calculation:** cache_read + current_tokens H total context usage

## = Testing Recommendations

Test scenarios to verify the fix:
1. **TodoWrite tool execution** ’ Should show PROCESSING while active
2. **Read tool execution** ’ Should show PROCESSING while reading files  
3. **Multiple tool chain** ’ Should show PROCESSING until all tools complete
4. **Text-only responses** ’ Should show COMPLETED when stop_reason: null

---

**Note:** This release focuses on fixing the status detection bug identified through user screenshots showing incorrect COMPLETED status during active tool usage.