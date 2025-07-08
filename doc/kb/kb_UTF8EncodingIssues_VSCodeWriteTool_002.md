# Knowledge Base: UTF-8 Encoding Issues with Write Tool - SOLUTION FOUND

## Problem Description
Write tool in Claude Code corrupts Cyrillic characters when creating .md files, converting them to mojibake.

**Symptoms:**
- Russian text becomes unreadable: "Отчёт сессии" → "BGQB A5AA88"
- Emojis and special characters also get corrupted
- Issue persists even after file deletion and recreation with Write tool

## Root Cause
Write tool in current Claude Code implementation doesn't support correct UTF-8 encoding for Cyrillic characters in macOS/VS Code environment.

## WORKING SOLUTION

### Use Bash with Heredoc for UTF-8 Files
```bash
cat > /path/to/file.md << 'EOF'
# Отчёт на русском языке
Кириллица сохраняется корректно!
EOF
```

**Why it works:**
- Bash properly handles UTF-8 encoding
- Heredoc preserves the exact text formatting
- No character conversion happens during file creation

### Implementation Example
```bash
# Remove corrupted file if exists
rm /path/to/отчет.md

# Create with proper UTF-8 encoding
cat > /path/to/отчет.md << 'EOF'
# Отчёт сессии #010
**Дата:** 8 января 2025
**Статус:** ✅ Выполнено
EOF
```

## Alternative Solutions
1. **English Documentation:** Create reports in English (workaround, not ideal)
2. **Manual Creation:** User creates file manually in VS Code
3. **External Tools:** Use system text editors that support UTF-8

## Best Practices
1. **Always verify encoding:** Use Read tool after creating files with Cyrillic
2. **Use Bash for Russian text:** When creating files with Cyrillic content
3. **Document the issue:** Add notes about encoding in session reports
4. **Follow CLAUDE.md #8:** Check encoding after file creation

## Status
**SOLUTION CONFIRMED** - Bash heredoc method successfully creates UTF-8 files with proper Cyrillic support.

*Date: January 8, 2025*  
*Version: 002*  
*Tested on: macOS with VS Code*