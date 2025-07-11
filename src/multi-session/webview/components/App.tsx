/**
 * Main App Component - Multi-Session Claude Chat Interface
 * Claude Chat Extension
 */

import React, { useCallback, useState, useEffect } from 'react';
import { TabBar } from './TabBar';
import { ChatWindow } from './ChatWindow';
import { SessionPicker } from './SessionPicker';
import { useVSCodeAPI } from '../hooks/useVSCodeAPI';
import { ResumeSessionData } from '../../../interactive-commands/types';
import './App.css';

export const App: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    isLoading,
    error,
    activeServiceInfo,
    createSession,
    switchSession,
    closeSession,
    sendMessage,
    executeSlashCommand,
    refreshState,
    onServiceInfoUpdate,
    sendInteractiveResponse
  } = useVSCodeAPI();
  
  // State for interactive commands
  const [interactiveCommand, setInteractiveCommand] = useState<{
    sessionId: string;
    command: string;
    data: any;
    prompt: string;
  } | null>(null);

  const activeSession = sessions.find(session => session.id === activeSessionId) || null;
  const canCreateNewSession = sessions.length < 2;

  const handleCreateSession = useCallback(() => {
    if (canCreateNewSession) {
      const sessionNumber = sessions.length + 1;
      createSession(`Session ${sessionNumber}`);
    }
  }, [canCreateNewSession, sessions.length, createSession]);

  const handleCreatePtySession = useCallback(() => {
    if (canCreateNewSession) {
      const sessionNumber = sessions.length + 1;
      // TODO: Implement PTY session creation
      console.log('Creating PTY session...');
      alert('PTY Session creation coming soon! This will use child_process with full CLI control.');
    }
  }, [canCreateNewSession, sessions.length]);

  const handleTabSwitch = useCallback((sessionId: string) => {
    switchSession(sessionId);
  }, [switchSession]);

  const handleCloseSession = useCallback((sessionId: string) => {
    closeSession(sessionId);
  }, [closeSession]);

  const handleSendMessage = useCallback((sessionId: string, message: string) => {
    sendMessage(sessionId, message);
  }, [sendMessage]);

  const handleExecuteSlashCommand = useCallback((sessionId: string, slashCommand: string) => {
    executeSlashCommand(sessionId, slashCommand);
  }, [executeSlashCommand]);

  // Handle interactive command response
  const handleInteractiveSelect = useCallback((selection: string) => {
    if (!interactiveCommand) return;
    
    sendInteractiveResponse(
      interactiveCommand.sessionId,
      interactiveCommand.command,
      selection
    );
    
    setInteractiveCommand(null);
  }, [interactiveCommand, sendInteractiveResponse]);

  const handleInteractiveCancel = useCallback(() => {
    setInteractiveCommand(null);
  }, []);

  // Set up global handler for interactive commands
  useEffect(() => {
    (window as any).onInteractiveInputRequired = (message: any) => {
      if (message.command === 'interactiveInputRequired') {
        setInteractiveCommand({
          sessionId: message.sessionId,
          command: message.interactiveCommand,
          data: message.data,
          prompt: message.prompt
        });
      }
    };

    return () => {
      delete (window as any).onInteractiveInputRequired;
    };
  }, []);

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
        onNewPtySession={handleCreatePtySession}
        onCloseSession={handleCloseSession}
        canCreateNewSession={canCreateNewSession}
        isLoading={isLoading}
        cacheReadTokens={activeServiceInfo?.usage.cache_read_input_tokens || 0}
      />
      
      <ChatWindow
        session={activeSession}
        onSendMessage={handleSendMessage}
        onExecuteSlashCommand={handleExecuteSlashCommand}
        isLoading={isLoading}
        activeServiceInfo={activeServiceInfo}
        onServiceInfoUpdate={onServiceInfoUpdate}
      />
      
      {isLoading && (
        <div className="global-loading">
          <div className="loading-spinner">🔄</div>
          <span>Loading...</span>
        </div>
      )}
      
      {/* Interactive command UI */}
      {interactiveCommand && interactiveCommand.command === '/resume' && (
        <SessionPicker
          sessionData={interactiveCommand.data as ResumeSessionData}
          prompt={interactiveCommand.prompt}
          onSelect={handleInteractiveSelect}
          onCancel={handleInteractiveCancel}
        />
      )}
    </div>
  );
};