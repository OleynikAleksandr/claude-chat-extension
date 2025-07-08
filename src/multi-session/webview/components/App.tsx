/**
 * Main App Component - Multi-Session Claude Chat Interface
 * Claude Chat Extension v0.4.0
 */

import React, { useCallback } from 'react';
import { TabBar } from './TabBar';
import { ChatWindow } from './ChatWindow';
import { useVSCodeAPI } from '../hooks/useVSCodeAPI';
import './App.css';

export const App: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    isLoading,
    error,
    createSession,
    switchSession,
    closeSession,
    sendMessage,
    refreshState
  } = useVSCodeAPI();

  const activeSession = sessions.find(session => session.id === activeSessionId) || null;
  const canCreateNewSession = sessions.length < 2;

  const handleCreateSession = useCallback(() => {
    if (canCreateNewSession) {
      const sessionNumber = sessions.length + 1;
      createSession(`Claude Chat ${sessionNumber}`);
    }
  }, [canCreateNewSession, sessions.length, createSession]);

  const handleTabSwitch = useCallback((sessionId: string) => {
    switchSession(sessionId);
  }, [switchSession]);

  const handleCloseSession = useCallback((sessionId: string) => {
    closeSession(sessionId);
  }, [closeSession]);

  const handleSendMessage = useCallback((sessionId: string, message: string) => {
    sendMessage(sessionId, message);
  }, [sendMessage]);

  if (error) {
    return (
      <div className="app-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h3>Connection Error</h3>
          <p>{error}</p>
          <button className="retry-button" onClick={refreshState}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="claude-chat-app">
      <TabBar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onTabSwitch={handleTabSwitch}
        onNewSession={handleCreateSession}
        onCloseSession={handleCloseSession}
        canCreateNewSession={canCreateNewSession}
        isLoading={isLoading}
      />
      
      <ChatWindow
        session={activeSession}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
      
      {isLoading && (
        <div className="global-loading">
          <div className="loading-spinner">🔄</div>
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
};