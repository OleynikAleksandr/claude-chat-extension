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
   # Compile extension in watch mode
   npm run watch
   
   # Compile webview in watch mode (in separate terminal)
   npm run watch:webview
   
   # Launch Extension Development Host
   # Press F5 in VS Code or use Debug panel
   ```

3. **Code quality checks**
   ```bash
   # Linting
   npm run lint
   
   # Build everything
   npm run build
   
   # Create VSIX for testing
   vsce package
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
├── extension.ts                    # Main extension entry point
├── multi-session/
│   ├── managers/
│   │   ├── OneShootSessionManager.ts      # Main session manager
│   │   └── OneShootProcessSessionManager.ts # Process management
│   ├── providers/
│   │   └── MultiSessionProvider.ts        # Webview provider
│   ├── webview/
│   │   └── components/                     # React components
│   └── types/
│       └── Session.ts                      # Type definitions
└── debug/
    └── RawJsonOutputChannel.ts             # Debug output channel
```

### Key Principles

1. **OneShoot Architecture**
   - Each message spawns a new process with `claude --print --resume`
   - Significant cost reduction through session caching
   - Clean process lifecycle with automatic cleanup

2. **React-based Webview**
   - TypeScript React components for UI
   - Real-time updates via postMessage API
   - Separate webpack build for webview bundle

3. **Multi-Session Management**
   - Independent Claude sessions with separate contexts
   - Maximum 2 concurrent sessions (configurable)
   - Persistent session state across VS Code restarts

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
2. **Process Management**: Check OneShoot process spawning logs
3. **Session State**: Verify session status transitions
4. **Webview Communication**: Monitor postMessage events

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