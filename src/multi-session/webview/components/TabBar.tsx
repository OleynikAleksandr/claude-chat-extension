/**
 * TabBar Component - Session tab navigation
 * Claude Chat Extension
 */

import React from 'react';
import { Session, SessionStatus } from '../../types/Session';
import { ContextProgressBar } from './ContextProgressBar';
import './TabBar.css';

interface TabBarProps {
  sessions: Omit<Session, 'terminal' | 'processSession'>[];
  activeSessionId: string | null;
  onTabSwitch: (sessionId: string) => void;
  onNewSession: () => void;
  onNewProcessSession: () => void;
  onCloseSession: (sessionId: string) => void;
  canCreateNewSession: boolean;
  isLoading?: boolean;
  cacheReadTokens?: number;
}

interface SessionTabProps {
  session: Omit<Session, 'terminal' | 'processSession'>;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
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

const SessionTab: React.FC<SessionTabProps> = ({ session, isActive, onSelect, onClose }) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div 
      className={`tab ${isActive ? 'active' : ''} ${session.status}`}
      onClick={onSelect}
      title={`${session.name} - ${session.status} (${session.mode || 'terminal'})`}
    >
      <span className="tab-name">
        {session.name}
        {session.mode === 'process' && <span className="mode-badge">⚡</span>}
      </span>
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
  onNewProcessSession,
  onCloseSession,
  canCreateNewSession,
  isLoading = false,
  cacheReadTokens = 0
}) => {
  return (
    <div className="tab-bar-container">
      <div className="tab-bar">
        <div className="tabs-container">
          {sessions.map(session => (
            <SessionTab
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={() => onTabSwitch(session.id)}
              onClose={() => onCloseSession(session.id)}
            />
          ))}
        </div>
        
        <div className="tab-actions">
          <button 
            className={`new-session-button ${!canCreateNewSession ? 'disabled' : ''}`}
            onClick={onNewSession}
            disabled={!canCreateNewSession || isLoading}
            title={canCreateNewSession ? 'Create new Terminal session' : 'Maximum sessions reached'}
          >
            {isLoading ? '🔄' : '🖥️ Terminal'}
          </button>
          <button 
            className={`new-session-button process ${!canCreateNewSession ? 'disabled' : ''}`}
            onClick={onNewProcessSession}
            disabled={!canCreateNewSession || isLoading}
            title={canCreateNewSession ? 'Create new OneShoot session' : 'Maximum sessions reached'}
          >
            {isLoading ? '🔄' : '🚀 OneShoot'}
          </button>
          
          
          <div className="session-count">
            {sessions.length}/2
          </div>
        </div>
      </div>
      
      {/* Context Progress Bar - показывать для активной сессии */}
      {activeSessionId && (() => {
        const activeSession = sessions.find(session => session.id === activeSessionId);
        
        return (
          <div className="session-indicators">
            {/* Context Progress Bar */}
            <ContextProgressBar 
              cacheReadTokens={cacheReadTokens}
              className="tab-context-indicator"
              messageCount={activeSession?.messages.length || 0}
            />
          </div>
        );
      })()}
    </div>
  );
};