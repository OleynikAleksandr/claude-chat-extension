/**
 * ChatWindow Component - Main chat interface for active session
 * Claude Chat Extension
 */

import React, { useState, useRef, useEffect } from 'react';
import { Session, Message, ServiceMessage } from '../../types/Session';
import { ServiceInfoBlock } from './ServiceInfoBlock';
import { CommandPalette } from './CommandPalette';
import { useSlashCommands } from '../hooks/useSlashCommands';
import './ChatWindow.css';

interface ChatWindowProps {
  session: Omit<Session, 'terminal'> | null;
  onSendMessage: (sessionId: string, message: string) => void;
  onExecuteSlashCommand: (sessionId: string, slashCommand: string) => void;
  isLoading?: boolean;
  activeServiceInfo?: ServiceMessage | null;
  onServiceInfoUpdate?: (serviceInfo: ServiceMessage) => void;
}

interface MessageItemProps {
  message: Message;
}

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onExecuteSlashCommand: (slashCommand: string) => void;
  disabled: boolean;
  placeholder: string;
  activeServiceInfo?: ServiceMessage | null;
}

const MessageItem: React.FC<MessageItemProps & { isLastToolBeforeAssistant?: boolean }> = ({ message, isLastToolBeforeAssistant }) => {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  // Handle tool message display
  if (message.type === 'tool' && message.toolInfo) {
    // Override status to 'completed' if this is the last tool before an assistant message
    const displayStatus = isLastToolBeforeAssistant ? 'completed' : message.toolInfo.status;
    
    return (
      <div className={`message-item tool-message ${displayStatus}`}>
        <div className="tool-header">
          <div className="tool-indicator">
            <span className={`tool-dot ${displayStatus}`}>●</span>
            <span className="tool-name">{message.content}</span>
          </div>
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
        {message.toolInfo.result && (
          <div className="tool-result">
            <span className="result-prefix">└ </span>
            <span className="result-content">{message.toolInfo.result}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`message-item ${message.type}`}>
      <div className="message-header">
        <span className={`message-type ${message.type}`}>
          {message.type === 'user' ? 'User' : message.type === 'assistant' ? 'Assistant' : 'Info'}
        </span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      <div className="message-content">
        {message.content}
      </div>
    </div>
  );
};

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onExecuteSlashCommand, disabled, placeholder, activeServiceInfo }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const slashCommands = useSlashCommands();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      slashCommands.hidePalette();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle slash commands navigation
    if (slashCommands.state.isVisible) {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'Enter':
        case 'Escape':
          return; // Let CommandPalette handle these
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // Handle slash commands
    const isSlashCommand = newMessage.startsWith('/');
    
    console.log('Message changed:', newMessage, 'isSlashCommand:', isSlashCommand);
    
    if (isSlashCommand && newMessage.length >= 1) {
      // Extract the command part (everything after /)
      const commandPart = newMessage.slice(1);
      
      console.log('Showing palette with commandPart:', commandPart);
      
      // Calculate position for command palette (show above input)
      if (inputContainerRef.current && textareaRef.current) {
        const rect = inputContainerRef.current.getBoundingClientRect();
        const position = {
          top: rect.top - 400, // Show well above input (400px up)
          left: rect.left
        };
        
        console.log('Position calculated:', position);
        slashCommands.showPalette(commandPart, position);
      }
    } else {
      console.log('Hiding palette');
      slashCommands.hidePalette();
    }
  };

  const handleCommandSelect = (command: any) => {
    // Execute slash command directly without user input
    onExecuteSlashCommand(command.name);
    
    // Clear input and hide palette
    setMessage('');
    slashCommands.hidePalette();
    
    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    handleTextareaResize();
  }, [message]);

  // Auto-focus когда поле не заблокировано
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Auto-focus мгновенно когда статус меняется на completed
  useEffect(() => {
    if (activeServiceInfo?.status === 'completed' && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeServiceInfo?.status, disabled]);

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <div className="input-container" ref={inputContainerRef}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="message-textarea"
          rows={1}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="send-button"
          title="Send message (Enter)"
        >
          Send
        </button>
      </div>
      
      <CommandPalette
        state={slashCommands.state}
        onCommandSelect={handleCommandSelect}
        onHide={slashCommands.hidePalette}
        onNavigate={slashCommands.navigate}
      />
    </form>
  );
};

const EmptyState: React.FC<{ onCreateSession: () => void }> = ({ onCreateSession }) => (
  <div className="empty-state">
    <h3>Claude Chat Extension</h3>
    <div className="instructions">
      <p className="success">✅ <strong>NEW in v0.6.5:</strong> Full bidirectional communication - see Claude's responses directly in the extension!</p>
      <p><strong>How to use the extension:</strong></p>
      <ul>
        <li>🆕 <strong>New Session</strong> — creates a new terminal and automatically starts Claude Code</li>
        <li>💬 <strong>Chat</strong> — interactive conversation with Claude, responses appear in real-time</li>
        <li>🔄 <strong>Multi-Session</strong> — work with two sessions simultaneously</li>
        <li>📝 <strong>Switching</strong> — click tabs to change active session</li>
      </ul>
      <p className="tip">💡 <strong>Tip:</strong> Click "+ New Session" above to get started</p>
    </div>
  </div>
);

const SessionNotReady: React.FC<{ session: Omit<Session, 'terminal'> }> = ({ session }) => (
  <div className="session-not-ready">
    <div className="status-icon">
      {session.status === 'creating' ? '🔄' : 
       session.status === 'starting' ? '🟡' : 
       session.status === 'error' ? '🔴' : '⚪'}
    </div>
    <h3>Session {session.status}</h3>
    <p>
      {session.status === 'creating' && 'Creating terminal and setting up session...'}
      {session.status === 'starting' && 'Starting Claude Code CLI...'}
      {session.status === 'error' && 'Session encountered an error. Try creating a new session.'}
      {session.status === 'closed' && 'Session is closed. Create a new session to continue.'}
    </p>
    {session.status === 'starting' && (
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    )}
  </div>
);

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  session, 
  onSendMessage, 
  onExecuteSlashCommand,
  isLoading = false,
  activeServiceInfo,
  onServiceInfoUpdate
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track activeServiceInfo changes for UI updates
  useEffect(() => {
    // ServiceInfo changes will trigger re-render
  }, [activeServiceInfo, session?.messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleSendMessage = (message: string) => {
    if (session) {
      onSendMessage(session.id, message);
    }
  };

  // No session selected
  if (!session) {
    return (
      <div className="chat-window">
        <EmptyState onCreateSession={() => {/* Will be handled by parent */}} />
      </div>
    );
  }

  // Session not ready
  if (session.status !== 'ready') {
    return (
      <div className="chat-window">
        <SessionNotReady session={session} />
      </div>
    );
  }

  // Active session with chat interface
  return (
    <div className="chat-window">
      <div className="messages-container">
        {session.messages.length === 0 ? (
          <div className="no-messages">
            <div className="welcome-message">
              <h4>Welcome to {session.name}! 👋</h4>
              <p>Start a conversation with Claude Code. Experience real-time bidirectional communication!</p>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {session.messages.map((message, index) => {
              // Check if this is the last tool message before an assistant message
              let isLastToolBeforeAssistant = false;
              
              if (message.type === 'tool' && index < session.messages.length - 1) {
                // Find the next non-tool message
                for (let i = index + 1; i < session.messages.length; i++) {
                  if (session.messages[i].type !== 'tool') {
                    // If the next non-tool message is from assistant, mark all tools before it
                    if (session.messages[i].type === 'assistant') {
                      isLastToolBeforeAssistant = true;
                    }
                    break;
                  }
                }
              }
              
              return (
                <div key={message.id} className="message-group">
                  <MessageItem 
                    message={message} 
                    isLastToolBeforeAssistant={isLastToolBeforeAssistant}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 🎨 ServiceInfoBlock закреплён к нижнему колонтитулу */}
      {activeServiceInfo && (
        <ServiceInfoBlock 
          key={`${activeServiceInfo.timestamp}-${activeServiceInfo.status}`}
          serviceInfo={activeServiceInfo}
          onUpdate={onServiceInfoUpdate}
        />
      )}

      <MessageInput
        onSendMessage={handleSendMessage}
        onExecuteSlashCommand={(command) => onExecuteSlashCommand(session.id, command)}
        disabled={isLoading || session.status !== 'ready'}
        placeholder={
          isLoading ? 'Sending...' : 
          session.status !== 'ready' ? 'Session not ready...' :
          'Type your message to Claude Code...'
        }
        activeServiceInfo={activeServiceInfo}
      />
    </div>
  );
};