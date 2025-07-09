/**
 * TabBar Component - Session tab navigation
 * Claude Chat Extension
 */

import React from 'react';
import { Session, SessionStatus } from '../../types/Session';
import './TabBar.css';

interface TabBarProps {
  sessions: Omit<Session, 'terminal'>[];
  activeSessionId: string | null;
  onTabSwitch: (sessionId: string) => void;
  onNewSession: () => void;
  onCloseSession: (sessionId: string) => void;
  canCreateNewSession: boolean;
  isLoading?: boolean;
  // Состояния сессий
  sessionStates?: Map<string, {
    state: 'ready' | 'working';
    stateDescription: string;
    stateEmoji: string;
    isReadyForNewRequest: boolean;
  }>;
}

interface SessionTabProps {
  session: Omit<Session, 'terminal'>;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  // Состояние сессии
  sessionState?: {
    state: 'ready' | 'working';
    stateDescription: string;
    stateEmoji: string;
    isReadyForNewRequest: boolean;
  };
}

const StatusIndicator: React.FC<{ status: SessionStatus }> = ({ status }) => {
  const indicators = {
    creating: { icon: '🔄', color: '#ffa500', text: 'Creating session...' },
    starting: { icon: '🟡', color: '#ffff00', text: 'Starting Claude Code...' },
    ready: { icon: '🟢', color: '#00ff00', text: 'Ready' },
    error: { icon: '🔴', color: '#ff0000', text: 'Error' },
    closed: { icon: '⚪', color: '#808080', text: 'Closed' }
  };

  const indicator = indicators[status];

  return (
    <span 
      className={`status-indicator status-${status}`}
      title={indicator.text}
      style={{ color: indicator.color }}
    >
      {indicator.icon}
    </span>
  );
};

const SessionTab: React.FC<SessionTabProps> = ({ session, isActive, onSelect, onClose, sessionState }) => {
  // Debug лог состояний
  React.useEffect(() => {
    console.log(`🏷️ SessionTab ${session.name}: status=${session.status}, hasState=${!!sessionState}`);
    if (sessionState) {
      console.log(`🏷️ State for ${session.name}:`, sessionState);
    }
  }, [session.status, sessionState, session.name]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  // Показываем только статус для не готовых сессий
  const renderStateIndicator = () => {
    if (session.status !== 'ready') {
      return <StatusIndicator status={session.status} />;
    }
    return null;
  };

  const getTabTitle = () => {
    if (session.status === 'ready' && sessionState) {
      return `${session.name} - ${sessionState.stateDescription}`;
    }
    return `${session.name} - ${session.status}`;
  };

  return (
    <div 
      className={`tab ${isActive ? 'active' : ''} ${session.status} ${sessionState ? `claude-state-${sessionState.state}` : ''}`}
      onClick={onSelect}
      title={getTabTitle()}
    >
      {renderStateIndicator()}
      <span className="tab-name">{session.name}</span>
      {session.status !== 'creating' && (
        <button 
          className="close-button"
          onClick={handleClose}
          title="Close session"
        >
          ×
        </button>
      )}
    </div>
  );
};

export const TabBar: React.FC<TabBarProps> = ({
  sessions,
  activeSessionId,
  onTabSwitch,
  onNewSession,
  onCloseSession,
  canCreateNewSession,
  isLoading = false,
  sessionStates
}) => {
  return (
    <div className="tab-bar">
      <div className="tabs-container">
        {sessions.map(session => (
          <SessionTab
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onSelect={() => onTabSwitch(session.id)}
            onClose={() => onCloseSession(session.id)}
            sessionState={sessionStates?.get(session.id)}
          />
        ))}
      </div>
      
      <div className="tab-actions">
        <button 
          className={`new-session-button ${!canCreateNewSession ? 'disabled' : ''}`}
          onClick={onNewSession}
          disabled={!canCreateNewSession || isLoading}
          title={canCreateNewSession ? 'Create new session' : 'Maximum sessions reached'}
        >
          {isLoading ? '🔄' : '+ New Session'}
        </button>
        
        <div className="session-count">
          {sessions.length}/2
        </div>
      </div>
    </div>
  );
};