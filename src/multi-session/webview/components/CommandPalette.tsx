/**
 * CommandPalette Component - Dropdown list for slash commands
 * Claude Chat Extension
 */

import React, { useEffect, useRef } from 'react';
import { CommandPaletteProps, SlashCommand } from '../types/SlashCommands';
import './CommandPalette.css';

interface CommandItemProps {
  command: SlashCommand;
  isSelected: boolean;
  onSelect: (command: SlashCommand) => void;
}

const CommandItem: React.FC<CommandItemProps> = ({ command, isSelected, onSelect }) => {
  return (
    <div
      className={`command-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(command)}
      onMouseEnter={() => {/* Mouse hover will be handled by parent */}}
    >
      <div className="command-main">
        <span className="command-icon">{command.icon}</span>
        <span className="command-name">{command.name}</span>
        {command.shortcut && (
          <span className="command-shortcut">{command.shortcut}</span>
        )}
      </div>
      <div className="command-description">{command.description}</div>
    </div>
  );
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  state,
  onCommandSelect,
  onHide,
  onNavigate
}) => {
  const paletteRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close palette
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        onHide();
      }
    };

    if (state.isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [state.isVisible, onHide]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!state.isVisible) return;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          onNavigate('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          onNavigate('down');
          break;
        case 'Enter':
          event.preventDefault();
          if (state.filteredCommands.length > 0) {
            onCommandSelect(state.filteredCommands[state.selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onHide();
          break;
      }
    };

    if (state.isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [state.isVisible, state.filteredCommands, state.selectedIndex, onNavigate, onCommandSelect, onHide]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (state.isVisible && paletteRef.current) {
      const selectedItem = paletteRef.current.querySelector('.command-item.selected');
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [state.selectedIndex, state.isVisible]);

  if (!state.isVisible) {
    return null;
  }

  return (
    <div
      ref={paletteRef}
      className="command-palette"
      style={{
        top: state.position.top,
        left: state.position.left
      }}
    >
      <div className="command-palette-header">
        <span className="command-palette-title">Slash Commands</span>
        <span className="command-palette-count">
          {state.filteredCommands.length} commands
        </span>
      </div>
      
      <div className="command-list">
        {state.filteredCommands.length === 0 ? (
          <div className="no-commands">
            <span>No commands found</span>
            <span className="no-commands-hint">Try typing a different command name</span>
          </div>
        ) : (
          state.filteredCommands.map((command, index) => (
            <CommandItem
              key={command.name}
              command={command}
              isSelected={index === state.selectedIndex}
              onSelect={onCommandSelect}
            />
          ))
        )}
      </div>

      <div className="command-palette-footer">
        <div className="command-hints">
          <span className="hint">
            <kbd>↑</kbd><kbd>↓</kbd> Navigate
          </span>
          <span className="hint">
            <kbd>Enter</kbd> Select
          </span>
          <span className="hint">
            <kbd>Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
};