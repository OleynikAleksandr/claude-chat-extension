/**
 * SlashCommands Types - Command palette functionality
 * Claude Chat Extension
 */

export interface SlashCommand {
  /** Command name including slash prefix (e.g., "/analyze") */
  name: string;
  /** Human-readable description of the command */
  description: string;
  /** Command category for grouping and filtering */
  category: 'claude-code' | 'user' | 'system';
  /** Optional icon for visual representation */
  icon?: string;
  /** Optional keyboard shortcut */
  shortcut?: string;
  /** Handler function called when command is executed */
  handler: (callback?: () => void) => void;
}

export interface CommandPaletteState {
  /** Whether the command palette is currently visible */
  isVisible: boolean;
  /** Currently selected command index */
  selectedIndex: number;
  /** Commands filtered by current search query */
  filteredCommands: SlashCommand[];
  /** Current search/filter query */
  searchQuery: string;
  /** Position for the palette relative to input */
  position: {
    top: number;
    left: number;
  };
}

export interface CommandPaletteProps {
  /** Current state of the command palette */
  state: CommandPaletteState;
  /** Callback when a command is selected */
  onCommandSelect: (command: SlashCommand) => void;
  /** Callback when the palette should be hidden */
  onHide: () => void;
  /** Callback when navigation occurs */
  onNavigate: (direction: 'up' | 'down') => void;
}

export interface SlashCommandsHookReturn {
  /** Current command palette state */
  state: CommandPaletteState;
  /** Show the command palette */
  showPalette: (query?: string, position?: { top: number; left: number }) => void;
  /** Hide the command palette */
  hidePalette: () => void;
  /** Filter commands by query */
  filterCommands: (query: string) => void;
  /** Navigate through commands */
  navigate: (direction: 'up' | 'down') => void;
  /** Select current command */
  selectCommand: () => void;
  /** Get all available commands */
  getAllCommands: () => SlashCommand[];
}

export interface MessageInputWithCommands {
  /** Current message text */
  message: string;
  /** Whether slash commands are active */
  isSlashMode: boolean;
  /** Current slash query (text after /) */
  slashQuery: string;
  /** Cursor position in the input */
  cursorPosition: number;
}