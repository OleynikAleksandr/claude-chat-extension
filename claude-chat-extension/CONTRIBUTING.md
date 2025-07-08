# Contributing to Claude Chat Extension

Thank you for your interest in contributing to Claude Chat Extension! 🎉

## 🚀 How to Contribute

### Reporting Issues

If you found a bug or want to suggest a new feature:

1. Check [existing issues](https://github.com/OleynikAleksandr/claude-chat-extension/issues)
2. If issue doesn't exist, create a new one
3. Use appropriate template (Bug Report or Feature Request)
4. Provide as much detail as possible

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/claude-chat-extension.git
   cd claude-chat-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup development environment**
   - Open project in VS Code
   - Install recommended extensions (ESLint, TypeScript)

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Development and testing**
   ```bash
   # Compile in watch mode
   npm run watch
   
   # Launch Extension Development Host
   # Press F5 in VS Code or use Debug panel
   ```

3. **Code quality checks**
   ```bash
   # Linting
   npm run lint
   
   # Compilation
   npm run compile
   
   # Create VSIX for testing
   npx vsce package
   ```

### Code Style

- **TypeScript**: Use strict typing
- **ESLint**: Follow rules in `.eslintrc.json`
- **Naming**: camelCase for variables, PascalCase for classes
- **Comments**: Only where necessary, prefer self-documenting code

### Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types:
- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation changes
- `style`: code formatting
- `refactor`: code refactoring without functionality changes
- `test`: adding or changing tests
- `chore`: changes to build process or auxiliary tools

#### Examples:
```bash
feat(terminal): add Claude CLI auto-detection
fix(webview): resolve CSP violations in chat interface
docs(readme): update installation instructions
```

### Pull Request Process

1. **Ensure code works**
   - Test in Extension Development Host
   - Verify with real Claude CLI
   - Lint and compile without errors

2. **Update documentation**
   - README.md if API or functionality changed
   - CHANGELOG.md with change descriptions
   - JSDoc comments for new methods

3. **Create Pull Request**
   - Use descriptive title
   - Detail changes thoroughly
   - Reference related issues
   - Add screenshots for UI changes

4. **Review Process**
   - Automated checks must pass
   - Code review from maintainers
   - Possible change requests

## 🏗️ Architecture Guidelines

### Project Structure
```
src/
├── extension.ts          # Main extension entry point
├── terminalManager.ts    # Terminal operations and Claude CLI detection  
├── types.ts              # TypeScript interfaces and types
media/
├── main.js              # Webview JavaScript
├── main.css             # Webview styles
└── ...
```

### Key Principles

1. **Separation of Concerns**
   - TerminalManager: only terminal operations
   - Extension: coordination and webview management
   - Types: centralized typing

2. **Error Handling**
   - Always return `TerminalExecutionResult`
   - Use typed error codes
   - Comprehensive logging for debugging

3. **User Experience**
   - Minimize confirmation dialogs
   - Fallback mechanisms should work automatically
   - Informative error messages

### Testing Guidelines

- **Manual Testing**: Test in Extension Development Host
- **Real Environment**: Verify with actual Claude CLI
- **Edge Cases**: No terminal, Claude CLI not running, etc.

## 🐛 Debugging

### Extension Logs
```
Output Panel → extension-output-undefined_publisher.claude-chat
```

### Developer Console
```
Help → Toggle Developer Tools → Console
```

### Common Issues

1. **CSP Violations**: Use only external styles and scripts
2. **Terminal Detection**: Check `detectClaudeCli()` logs
3. **Message Sending**: Ensure `addNewLine: true`

## 📋 Issue Templates

### Bug Report
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. macOS 14.1]
- VS Code Version: [e.g. 1.85.0]
- Extension Version: [e.g. 0.3.1]
- Claude CLI Version: [if applicable]

**Additional context**
Add any other context about the problem here.
```

### Feature Request
```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 🙏 Recognition

Contributors will be added to README.md and receive recognition for their contributions!

## 📞 Questions?

- Create an issue with `question` tag
- Check [documentation](README.md)
- Review [knowledge base](doc/kb/)

Thank you for contributing to Claude Chat Extension! 🚀