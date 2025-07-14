import React, { useState, useEffect } from 'react';
// Interactive commands types removed - only OneShoot mode now
interface ResumeSessionData {
  sessions: Array<{
    id: string;
    name: string;
    projectPath: string;
  }>;
}
import './SessionPicker.css';

interface SessionPickerProps {
  /** Data about available sessions */
  sessionData: ResumeSessionData;
  /** Hint for the user */
  prompt: string;
  /** Callback when selecting a session */
  onSelect: (sessionId: string) => void;
  /** Callback on cancel */
  onCancel: () => void;
}

/**
 * Component for selecting a session from the list
 */
export const SessionPicker: React.FC<SessionPickerProps> = ({
  sessionData,
  prompt,
  onSelect,
  onCancel
}) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);

  // Auto-focus on first session
  useEffect(() => {
    if (sessionData.sessions.length > 0) {
      setSelectedId(sessionData.sessions[0].id);
    }
  }, [sessionData.sessions]);

  const handleSelect = () => {
    if (selectedId) {
      setIsClosing(true);
      setTimeout(() => {
        onSelect(selectedId);
      }, 200);
    }
  };

  const handleCancel = () => {
    setIsClosing(true);
    setTimeout(() => {
      onCancel();
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSelect();
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = sessionData.sessions.findIndex((s: any) => s.id === selectedId);
      let newIndex = currentIndex;
      
      if (e.key === 'ArrowUp') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : sessionData.sessions.length - 1;
      } else {
        newIndex = currentIndex < sessionData.sessions.length - 1 ? currentIndex + 1 : 0;
      }
      
      setSelectedId(sessionData.sessions[newIndex].id);
    }
  };

  if (sessionData.sessions.length === 0) {
    return (
      <div className={`session-picker ${isClosing ? 'closing' : ''}`}>
        <div className="session-picker-header">
          <span className="session-picker-icon">📋</span>
          <span className="session-picker-title">No Sessions Available</span>
        </div>
        <div className="session-picker-empty">
          <p>No previous sessions found.</p>
          <button onClick={handleCancel} className="session-picker-button">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`session-picker ${isClosing ? 'closing' : ''}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      <div className="session-picker-header">
        <span className="session-picker-icon">📋</span>
        <span className="session-picker-title">{prompt}</span>
      </div>
      
      <div className="session-picker-list">
        {sessionData.sessions.map((session: any) => (
          <div
            key={session.id}
            className={`session-picker-item ${selectedId === session.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(session.id)}
            onDoubleClick={handleSelect}
          >
            <span className="session-number">{session.id}.</span>
            <span className="session-date">{session.date}</span>
            <span className="session-time">{session.time}</span>
            {session.formattedSize && (
              <span className="session-size">({session.formattedSize})</span>
            )}
            {session.description && (
              <span className="session-description">- {session.description}</span>
            )}
          </div>
        ))}
      </div>
      
      <div className="session-picker-footer">
        <button 
          onClick={handleSelect} 
          className="session-picker-button primary"
          disabled={!selectedId}
        >
          Select (Enter)
        </button>
        <button 
          onClick={handleCancel} 
          className="session-picker-button"
        >
          Cancel (Esc)
        </button>
      </div>
      
      <div className="session-picker-hint">
        Use ↑↓ to navigate, Enter to select, Esc to cancel
      </div>
    </div>
  );
};