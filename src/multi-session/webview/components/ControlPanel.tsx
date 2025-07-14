/**
 * ControlPanel Component - Additional control panel between title and TabBar
 * Claude Chat Extension
 */

import React from 'react';
import './ControlPanel.css';

interface ControlPanelProps {
  sessions: Array<{
    id: string;
    name: string;
  }>;
  onNewSession: () => void;
  onToggleRawMonitor: () => void;
  canCreateNewSession: boolean;
  isRawMonitorActive: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  sessions,
  onNewSession,
  onToggleRawMonitor,
  canCreateNewSession,
  isRawMonitorActive
}) => {
  return (
    <div className="control-panel">
      <div className="control-panel-content">
        <div className="control-panel-left">
          <button 
            className={`control-button ${isRawMonitorActive ? 'active' : ''}`}
            onClick={onToggleRawMonitor}
            title="Toggle Raw JSON Monitor"
          >
            Raw Data
          </button>
        </div>
        
        <div className="control-panel-right">
          <button 
            className="control-button"
            onClick={onNewSession}
            disabled={!canCreateNewSession}
            title={canCreateNewSession ? "Create new session" : "Maximum sessions reached"}
          >
            + Session
          </button>
          
          <div className="session-counter">
            {sessions.length}/2
          </div>
        </div>
      </div>
    </div>
  );
};