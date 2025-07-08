/**
 * ChatWindow Component - Main chat interface for active session
 * Claude Chat Extension v0.4.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Session, Message } from '../../types/Session';
import './ChatWindow.css';

interface ChatWindowProps {
  session: Omit<Session, 'terminal'> | null;
  onSendMessage: (sessionId: string, message: string) => void;
  isLoading?: boolean;
}

interface MessageItemProps {
  message: Message;
}

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
  placeholder: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className={`message-item ${message.type}`}>
      <div className="message-header">
        <span className={`message-type ${message.type}`}>
          {message.type === 'user' ? '👤' : message.type === 'assistant' ? '🤖' : 'ℹ️'}
        </span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
      <div className="message-content">
        {message.content}
      </div>
    </div>
  );
};

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled, placeholder }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  useEffect(() => {
    handleTextareaResize();
  }, [message]);

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
          📤
        </button>
      </div>
    </form>
  );
};

const EmptyState: React.FC<{ onCreateSession: () => void }> = ({ onCreateSession }) => (
  <div className="empty-state">
    <div className="empty-icon">🚀</div>
    <h3>Claude Chat Extension</h3>
    <div className="instructions">
      <p className="warning">⚠️ <strong>IMPORTANT:</strong> Messages are sent TO terminal, Claude responses appear IN terminal (one-way communication)</p>
      <p><strong>How to use the extension:</strong></p>
      <ul>
        <li>🆕 <strong>New Session</strong> — creates a new terminal and automatically starts Claude Code</li>
        <li>💬 <strong>Chat</strong> — send messages directly to Claude Code terminal</li>
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
  isLoading = false 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      <div className="session-header">
        <div className="session-info">
          <span className="session-name">{session.name}</span>
          <span className="session-status ready">Ready</span>
        </div>
        <div className="message-count">
          {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="messages-container">
        {session.messages.length === 0 ? (
          <div className="no-messages">
            <div className="welcome-message">
              <h4>Welcome to {session.name}! 👋</h4>
              <p>Start a conversation with Claude Code. Your messages will be sent directly to the terminal.</p>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {session.messages.map(message => (
              <MessageItem key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isLoading || session.status !== 'ready'}
        placeholder={
          isLoading ? 'Sending...' : 
          session.status !== 'ready' ? 'Session not ready...' :
          'Type your message to Claude Code...'
        }
      />
    </div>
  );
};