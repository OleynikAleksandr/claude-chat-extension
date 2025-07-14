# Release Notes - v0.11.25

## 🐛 Bug Fix - Raw JSON Monitor for Existing Sessions

### Fixed OutputChannel Not Being Passed to Existing Sessions
- **Problem**: When Monitor was activated AFTER creating OneShoot sessions, the OutputChannel wasn't available
- **Solution**: Now updates all existing OneShoot sessions when Monitor is toggled
- **Result**: Monitor works for both new and existing sessions

## 📊 Technical Changes

### Dynamic OutputChannel Updates
- Added `setRawJsonOutputChannel` method to OneShootProcessSessionManager
- Updates all active OneShoot sessions when Monitor is toggled
- Logs show which sessions were updated

### Usage Note
The order doesn't matter anymore:
1. Create session → Toggle Monitor ✅
2. Toggle Monitor → Create session ✅

Both scenarios now work correctly\!

---
*Monitor now captures JSON from all OneShoot sessions*
EOF < /dev/null