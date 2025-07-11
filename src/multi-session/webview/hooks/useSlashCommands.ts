/**
 * useSlashCommands Hook - Manages slash commands state and behavior
 * Claude Chat Extension
 */

import { useState, useCallback, useMemo } from 'react';
import { SlashCommand, CommandPaletteState, SlashCommandsHookReturn } from '../types/SlashCommands';

// Standard Claude Code CLI commands
const DEFAULT_COMMANDS: SlashCommand[] = [
  {
    name: '/add-dir',
    description: 'Add a new working directory',
    category: 'claude-code',
    icon: '📁',
    handler: () => {}
  },
  {
    name: '/bug',
    description: 'Submit feedback about Claude Code',
    category: 'claude-code',
    icon: '🐛',
    handler: () => {}
  },
  {
    name: '/clear',
    description: 'Clear conversation history and free up context',
    category: 'claude-code',
    icon: '🗑️',
    handler: () => {}
  },
  {
    name: '/compact',
    description: 'Clear conversation history but keep a summary in context',
    category: 'claude-code',
    icon: '📦',
    handler: () => {}
  },
  {
    name: '/config',
    description: 'Open config panel',
    category: 'claude-code',
    icon: '⚙️',
    handler: () => {}
  },
  {
    name: '/cost',
    description: 'Show the total cost and duration of the current session',
    category: 'claude-code',
    icon: '💰',
    handler: () => {}
  },
  {
    name: '/doctor',
    description: 'Checks the health of your Claude Code installation',
    category: 'claude-code',
    icon: '🩺',
    handler: () => {}
  },
  {
    name: '/exit',
    description: 'Exit the REPL',
    category: 'claude-code',
    icon: '🚪',
    handler: () => {}
  },
  {
    name: '/export',
    description: 'Export the current conversation to a file or clipboard',
    category: 'claude-code',
    icon: '📤',
    handler: () => {}
  },
  {
    name: '/help',
    description: 'Show help and available commands',
    category: 'claude-code',
    icon: '❓',
    handler: () => {}
  },
  {
    name: '/hooks',
    description: 'Manage hook configurations for tool events',
    category: 'claude-code',
    icon: '🪝',
    handler: () => {}
  },
  {
    name: '/ide',
    description: 'Manage IDE integrations and show status',
    category: 'claude-code',
    icon: '💻',
    handler: () => {}
  },
  {
    name: '/init',
    description: 'Initialize a new CLAUDE.md file with codebase documentation',
    category: 'claude-code',
    icon: '🆕',
    handler: () => {}
  },
  {
    name: '/install-github-app',
    description: 'Set up Claude GitHub Actions for a repository',
    category: 'claude-code',
    icon: '🔧',
    handler: () => {}
  },
  {
    name: '/login',
    description: 'Sign in with your Anthropic account',
    category: 'claude-code',
    icon: '🔑',
    handler: () => {}
  },
  {
    name: '/logout',
    description: 'Sign out from your Anthropic account',
    category: 'claude-code',
    icon: '🚪',
    handler: () => {}
  },
  {
    name: '/mcp',
    description: 'Manage MCP servers',
    category: 'claude-code',
    icon: '🔌',
    handler: () => {}
  },
  {
    name: '/memory',
    description: 'Edit Claude memory files',
    category: 'claude-code',
    icon: '🧠',
    handler: () => {}
  },
  {
    name: '/migrate-installer',
    description: 'Migrate from global npm installation to local installation',
    category: 'claude-code',
    icon: '📦',
    handler: () => {}
  },
  {
    name: '/model',
    description: 'Set the AI model for Claude Code',
    category: 'claude-code',
    icon: '🤖',
    handler: () => {}
  },
  {
    name: '/permissions',
    description: 'Manage allow & deny tool permission rules',
    category: 'claude-code',
    icon: '🔒',
    handler: () => {}
  },
  {
    name: '/pr-comments',
    description: 'Get comments from a GitHub pull request',
    category: 'claude-code',
    icon: '💬',
    handler: () => {}
  },
  {
    name: '/release-notes',
    description: 'View release notes',
    category: 'claude-code',
    icon: '📝',
    handler: () => {}
  },
  {
    name: '/resume',
    description: 'Resume a conversation',
    category: 'claude-code',
    icon: '▶️',
    handler: () => {}
  },
  {
    name: '/review',
    description: 'Review a pull request',
    category: 'claude-code',
    icon: '👀',
    handler: () => {}
  },
  {
    name: '/status',
    description: 'Show Claude Code status including version, model, account, API connectivity, and tool statuses',
    category: 'claude-code',
    icon: '📊',
    handler: () => {}
  },
  {
    name: '/terminal-setup',
    description: 'Install Shift+Enter key binding for newlines',
    category: 'claude-code',
    icon: '⌨️',
    handler: () => {}
  },
  {
    name: '/upgrade',
    description: 'Upgrade to Max for higher rate limits and more Opus',
    category: 'claude-code',
    icon: '⬆️',
    handler: () => {}
  },
  {
    name: '/vim',
    description: 'Toggle between Vim and Normal editing modes',
    category: 'claude-code',
    icon: '📝',
    handler: () => {}
  }
];

const INITIAL_STATE: CommandPaletteState = {
  isVisible: false,
  selectedIndex: 0,
  filteredCommands: [],
  searchQuery: '',
  position: { top: 0, left: 0 }
};

export const useSlashCommands = (): SlashCommandsHookReturn => {
  const [state, setState] = useState<CommandPaletteState>(INITIAL_STATE);
  const [commands] = useState<SlashCommand[]>(DEFAULT_COMMANDS);

  const filterCommands = useCallback((query: string) => {
    const filtered = commands.filter(cmd => 
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
    );
    
    setState(prev => ({
      ...prev,
      filteredCommands: filtered,
      searchQuery: query,
      selectedIndex: 0 // Reset selection when filtering
    }));
  }, [commands]);

  const showPalette = useCallback((query = '', position = { top: 0, left: 0 }) => {
    console.log('showPalette called with query:', query, 'position:', position);
    
    const filtered = query ? 
      commands.filter(cmd => 
        cmd.name.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description.toLowerCase().includes(query.toLowerCase())
      ) : commands;

    console.log('Filtered commands:', filtered.length, 'out of', commands.length);

    setState({
      isVisible: true,
      selectedIndex: 0,
      filteredCommands: filtered,
      searchQuery: query,
      position
    });
    
    console.log('State updated, isVisible: true');
  }, [commands]);

  const hidePalette = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const navigate = useCallback((direction: 'up' | 'down') => {
    setState(prev => {
      if (!prev.isVisible || prev.filteredCommands.length === 0) {
        return prev;
      }

      let newIndex = prev.selectedIndex;
      
      if (direction === 'up') {
        newIndex = prev.selectedIndex > 0 ? prev.selectedIndex - 1 : prev.filteredCommands.length - 1;
      } else {
        newIndex = prev.selectedIndex < prev.filteredCommands.length - 1 ? prev.selectedIndex + 1 : 0;
      }

      return {
        ...prev,
        selectedIndex: newIndex
      };
    });
  }, []);

  const selectCommand = useCallback(() => {
    if (state.isVisible && state.filteredCommands.length > 0) {
      const selectedCommand = state.filteredCommands[state.selectedIndex];
      selectedCommand.handler();
      hidePalette();
      return selectedCommand;
    }
    return null;
  }, [state, hidePalette]);

  const getAllCommands = useCallback(() => {
    return [...commands];
  }, [commands]);

  return {
    state,
    showPalette,
    hidePalette,
    filterCommands,
    navigate,
    selectCommand,
    getAllCommands
  };
};