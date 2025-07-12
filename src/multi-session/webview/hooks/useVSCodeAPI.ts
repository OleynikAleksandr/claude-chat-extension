/**
 * React hook for VS Code API communication
 * Claude Chat Extension
 */

import { useState, useEffect, useCallback } from 'react';
import { Session, WebviewMessage, ExtensionMessage, ServiceMessage } from '../../types/Session';

// VS Code API declaration
declare const vscode: {
  postMessage: (message: any) => void;
};

export interface VSCodeAPIHook {
  sessions: Omit<Session, 'terminal' | 'processSession'>[];
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // 🎨 Service Info State
  activeServiceInfo: ServiceMessage | null;
  
  // Actions
  createSession: (name?: string) => void;
  createOneShootSession: (name?: string) => void;
  switchSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  sendMessage: (sessionId: string, message: string) => void;
  executeSlashCommand: (sessionId: string, slashCommand: string) => void;
  renameSession: (sessionId: string, newName: string) => void;
  refreshState: () => void;
  
  // 🎨 Service Info Actions
  onServiceInfoUpdate: (serviceInfo: ServiceMessage) => void;
  
  // Interactive command support
  sendInteractiveResponse: (sessionId: string, command: string, selection: string | number, metadata?: any) => void;
}

export function useVSCodeAPI(): VSCodeAPIHook {
  const [sessions, setSessions] = useState<Omit<Session, 'terminal'>[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🎨 Service Info State - Map-based solution for multi-session support
  const [serviceInfoMap, setServiceInfoMap] = useState<Map<string, ServiceMessage>>(new Map());
  const [activeServiceInfo, setActiveServiceInfo] = useState<ServiceMessage | null>(null);
  
  // 🧪 Smart token filtering - prevent UI jumps by ignoring decreasing values
  const [lastValidTokens, setLastValidTokens] = useState<number>(0);

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

    // 🛡️ Guard against invalid messages without command
    if (!message || typeof message !== 'object' || !message.command) {
      console.warn('🛡️ Filtered invalid message without command:', message);
      return;
    }

    switch (message.command) {
      case 'sessionsUpdated':
        setSessions(message.sessions);
        setIsLoading(false);
        setError(null);
        
        // 🎨 Clean up serviceInfo for closed sessions
        setServiceInfoMap(prev => {
          const newMap = new Map(prev);
          const currentSessionIds = new Set(message.sessions.map(s => s.id));
          
          // Remove serviceInfo for sessions that no longer exist
          for (const [sessionId] of newMap) {
            if (!currentSessionIds.has(sessionId)) {
              newMap.delete(sessionId);
            }
          }
          
          return newMap;
        });
        break;

      case 'activeSessionChanged':
        setActiveSessionId(message.sessionId);
        // Update last active time for the session
        setSessions(prev => prev.map(session => 
          session.id === message.sessionId 
            ? { ...session, lastActiveAt: new Date() }
            : session
        ));
        
        // 🎨 Update activeServiceInfo from map when switching sessions
        setServiceInfoMap(prev => {
          const serviceInfo = prev.get(message.sessionId);
          setActiveServiceInfo(serviceInfo || null);
          return prev;
        });
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

      case 'serviceInfoReceived':
        // 🎨 Handle service information updates - Map-based solution
        if (message.serviceInfo && message.sessionId) {
          // Store serviceInfo in map by sessionId
          setServiceInfoMap(prev => {
            const newMap = new Map(prev);
            newMap.set(message.sessionId, message.serviceInfo);
            return newMap;
          });
          
          // 🎨 Update activeServiceInfo with smart session handling
          // Always update if no active session, or if it matches active session
          if (!activeSessionId || message.sessionId === activeSessionId) {
            const newTokens = message.serviceInfo.usage.cache_read_input_tokens || 0;
            
            // 🧪 Smart filtering: ignore decreasing token values (prevents UI jumps)
            // BUT always update status changes regardless of token count
            if (newTokens >= lastValidTokens || lastValidTokens === 0 || 
                !activeServiceInfo || activeServiceInfo.status !== message.serviceInfo.status) {
              console.log(`🎨 Updating serviceInfo: status=${message.serviceInfo.status}, tokens=${newTokens}`);
              setActiveServiceInfo(message.serviceInfo);
              setLastValidTokens(newTokens);
            } else {
              console.log(`🧪 Filtered decreasing tokens: ${newTokens} < ${lastValidTokens}`);
            }
          }
        }
        break;

      case 'interactiveInputRequired':
        // Handle interactive command input requirement
        if (message.sessionId && message.interactiveCommand && message.data) {
          console.log(`📝 Interactive input required for ${message.interactiveCommand}`, message);
          // This will be handled by the App component
          if ((window as any).onInteractiveInputRequired) {
            (window as any).onInteractiveInputRequired(message);
          }
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
  }, [activeSessionId, lastValidTokens]);

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

  const createOneShootSession = useCallback((name?: string) => {
    setIsLoading(true);
    setError(null);
    sendMessage({ command: 'createOneShootSession', name });
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

  const executeSlashCommand = useCallback((sessionId: string, slashCommand: string) => {
    sendMessage({ command: 'executeSlashCommand', sessionId, slashCommand });
  }, [sendMessage]);

  const renameSession = useCallback((sessionId: string, newName: string) => {
    sendMessage({ command: 'renameSession', sessionId, newName });
  }, [sendMessage]);

  const refreshState = useCallback(() => {
    sendMessage({ command: 'getSessionState' });
  }, [sendMessage]);

  // 🎨 Service Info Update Handler
  const onServiceInfoUpdate = useCallback((serviceInfo: ServiceMessage) => {
    setActiveServiceInfo(serviceInfo);
  }, []);

  // Send interactive response
  const sendInteractiveResponse = useCallback((sessionId: string, command: string, selection: string | number, metadata?: any) => {
    sendMessage({
      command: 'interactiveResponse',
      sessionId,
      interactiveCommand: command,
      selection,
      metadata
    });
  }, [sendMessage]);

  return {
    sessions,
    activeSessionId,
    isLoading,
    error,
    activeServiceInfo,
    createSession,
    createOneShootSession,
    switchSession,
    closeSession,
    sendMessage: sendChatMessage,
    executeSlashCommand,
    renameSession,
    refreshState,
    onServiceInfoUpdate,
    sendInteractiveResponse
  };
}