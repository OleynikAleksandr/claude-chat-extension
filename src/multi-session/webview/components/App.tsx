/**
 * Main App Component - Multi-Session Claude Chat Interface
 * Claude Chat Extension
 */

import React, { useCallback, useState, useEffect } from 'react';
import { TabBar } from './TabBar';
import { ChatWindow } from './ChatWindow';
import { SessionPicker } from './SessionPicker';
import { ControlPanel } from './ControlPanel';
import { useVSCodeAPI } from '../hooks/useVSCodeAPI';
// Interactive commands types removed - only OneShoot mode now
interface ResumeSessionData {
  sessions: Array<{
    id: string;
    name: string;
    projectPath: string;
  }>;
}
import './App.css';

export const App: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    isLoading,
    error,
    activeServiceInfo,
    createOneShootSession,
    switchSession,
    closeSession,
    sendMessage,
    executeSlashCommand,
    refreshState,
    onServiceInfoUpdate,
    sendInteractiveResponse,
    getAvailableSessions,
    createOneShootSessionWithResume,
    toggleRawMonitor,
    isRawMonitorActive
  } = useVSCodeAPI();
  
  // State for interactive commands
  const [interactiveCommand, setInteractiveCommand] = useState<{
    sessionId: string;
    command: string;
    data: any;
    prompt: string;
  } | null>(null);
  
  // State for maximum token value (only increases, never decreases)
  const [maxTokenValue, setMaxTokenValue] = useState<number>(0);
  
  
  const activeSession = sessions.find(session => session.id === activeSessionId) || null;
  const canCreateNewSession = sessions.length < 2;


  const handleCreateOneShootSession = useCallback(() => {
    if (canCreateNewSession) {
      const sessionNumber = sessions.length + 1;
      createOneShootSession(`Session ${sessionNumber}`);
    }
  }, [canCreateNewSession, sessions.length, createOneShootSession]);


  const handleTabSwitch = useCallback((sessionId: string) => {
    switchSession(sessionId);
  }, [switchSession]);

  const handleCloseSession = useCallback((sessionId: string) => {
    closeSession(sessionId);
  }, [closeSession]);

  const handleSendMessage = useCallback((sessionId: string, message: string) => {
    sendMessage(sessionId, message);
  }, [sendMessage]);

  const handleExecuteSlashCommand = useCallback(async (sessionId: string, slashCommand: string) => {
    // Special handling for /resume command in OneShoot sessions
    if (slashCommand === '/resume') {
      const activeSession = sessions.find(s => s.id === sessionId);
      if (activeSession) {
        try {
          // Get available sessions
          const availableSessions = await getAvailableSessions();
          
          if (availableSessions.length === 0) {
            // Show message if no sessions found
            setInteractiveCommand({
              sessionId: sessionId,
              command: '/resume',
              data: { sessions: [] },
              prompt: 'No previous sessions found'
            });
          } else {
            // Show session picker
            setInteractiveCommand({
              sessionId: sessionId,
              command: '/resume',
              data: { sessions: availableSessions },
              prompt: 'Select a session to resume:'
            });
          }
        } catch (error) {
          // Failed to get available sessions
        }
        return;
      }
    }
    
    // Default handling for other commands
    executeSlashCommand(sessionId, slashCommand);
  }, [executeSlashCommand, sessions, getAvailableSessions]);
  
  // Handle interactive command response
  const handleInteractiveSelect = useCallback((selection: string) => {
    if (!interactiveCommand) return;
    
    // Special handling for /resume command
    if (interactiveCommand.command === '/resume') {
      const availableSessions = interactiveCommand.data.sessions || [];
      const selectedSessionInfo = availableSessions.find((s: any) => s.id === selection);
      
      if (selectedSessionInfo) {
        // Create new OneShoot session with --resume parameter
        createOneShootSessionWithResume(
          selectedSessionInfo.sessionId,
          `Resume: ${selectedSessionInfo.description || selectedSessionInfo.date}`
        );
      }
      
      setInteractiveCommand(null);
      return;
    }
    
    // Default handling for other interactive commands
    sendInteractiveResponse(
      interactiveCommand.sessionId,
      interactiveCommand.command,
      selection
    );
    
    setInteractiveCommand(null);
  }, [interactiveCommand, sendInteractiveResponse, createOneShootSessionWithResume]);

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

  // Update maxTokenValue when new value is not zero
  useEffect(() => {
    if (activeServiceInfo?.usage) {
      const cacheCreation = activeServiceInfo.usage.cache_creation_input_tokens || 0;
      const cacheRead = activeServiceInfo.usage.cache_read_input_tokens || 0;
      const newTotal = cacheCreation + cacheRead;
      
      // Update if new value is not zero
      if (newTotal > 0) {
        setMaxTokenValue(newTotal);
      }
    }
  }, [activeServiceInfo]);

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
      <ControlPanel 
        sessions={sessions}
        onNewSession={handleCreateOneShootSession}
        onToggleRawMonitor={toggleRawMonitor}
        canCreateNewSession={canCreateNewSession}
        isRawMonitorActive={isRawMonitorActive}
      />
      
      <TabBar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onTabSwitch={handleTabSwitch}
        onNewSession={handleCreateOneShootSession}
        onCloseSession={handleCloseSession}
        onToggleRawMonitor={toggleRawMonitor}
        canCreateNewSession={canCreateNewSession}
        isLoading={isLoading}
        cacheReadTokens={maxTokenValue}
        isRawMonitorActive={isRawMonitorActive}
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