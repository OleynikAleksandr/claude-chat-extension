/**
 * React hook for VS Code API communication
 * Claude Chat Extension v0.4.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Session, WebviewMessage, ExtensionMessage } from '../../types/Session';

// VS Code API declaration
declare const vscode: {
  postMessage: (message: any) => void;
};

export interface VSCodeAPIHook {
  sessions: Omit<Session, 'terminal'>[];
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createSession: (name?: string) => void;
  switchSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  sendMessage: (sessionId: string, message: string) => void;
  renameSession: (sessionId: string, newName: string) => void;
  refreshState: () => void;
}

export function useVSCodeAPI(): VSCodeAPIHook {
  const [sessions, setSessions] = useState<Omit<Session, 'terminal'>[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send message to VS Code extension
  const sendMessage = useCallback((message: WebviewMessage) => {
    try {
      vscode.postMessage(message);
    } catch (err) {
      console.error('Failed to send message to VS Code:', err);
      setError('Failed to communicate with VS Code extension');
    }
  }, []);

  // Handle messages from VS Code extension
  const handleExtensionMessage = useCallback((message: ExtensionMessage) => {
    console.log('Received message from extension:', message);

    switch (message.command) {
      case 'sessionsUpdated':
        setSessions(message.sessions);
        setIsLoading(false);
        setError(null);
        break;

      case 'activeSessionChanged':
        setActiveSessionId(message.sessionId);
        // Update last active time for the session
        setSessions(prev => prev.map(session => 
          session.id === message.sessionId 
            ? { ...session, lastActiveAt: new Date() }
            : session
        ));
        break;

      case 'sessionStatusChanged':
        setSessions(prev => prev.map(session => 
          session.id === message.sessionId 
            ? { ...session, status: message.status }
            : session
        ));
        break;

      case 'messageReceived':
        setSessions(prev => prev.map(session => 
          session.id === message.sessionId 
            ? { ...session, messages: [...session.messages, message.message] }
            : session
        ));
        break;

      case 'messageResponse':
        // Handle Claude Code response
        if (message.success && message.response) {
          setSessions(prev => prev.map(session => 
            session.id === message.sessionId 
              ? { ...session, messages: [...session.messages, message.response!] }
              : session
          ));
        } else if (!message.success && message.error) {
          setError(message.error);
        }
        break;

      case 'error':
        setError(message.message);
        setIsLoading(false);
        console.error('Extension error:', message.message);
        break;

      default:
        console.warn('Unknown message command:', message);
    }
  }, []);

  // Set up message listener
  useEffect(() => {
    const messageListener = (event: MessageEvent) => {
      handleExtensionMessage(event.data);
    };

    window.addEventListener('message', messageListener);
    
    // Request initial state
    sendMessage({ command: 'getSessionState' });

    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, [handleExtensionMessage, sendMessage]);

  // Action creators
  const createSession = useCallback((name?: string) => {
    setIsLoading(true);
    setError(null);
    sendMessage({ command: 'createSession', name });
  }, [sendMessage]);

  const switchSession = useCallback((sessionId: string) => {
    sendMessage({ command: 'switchSession', sessionId });
  }, [sendMessage]);

  const closeSession = useCallback((sessionId: string) => {
    sendMessage({ command: 'closeSession', sessionId });
  }, [sendMessage]);

  const sendChatMessage = useCallback((sessionId: string, message: string) => {
    sendMessage({ command: 'sendMessage', sessionId, message });
  }, [sendMessage]);

  const renameSession = useCallback((sessionId: string, newName: string) => {
    sendMessage({ command: 'renameSession', sessionId, newName });
  }, [sendMessage]);

  const refreshState = useCallback(() => {
    sendMessage({ command: 'getSessionState' });
  }, [sendMessage]);

  return {
    sessions,
    activeSessionId,
    isLoading,
    error,
    createSession,
    switchSession,
    closeSession,
    sendMessage: sendChatMessage,
    renameSession,
    refreshState
  };
}