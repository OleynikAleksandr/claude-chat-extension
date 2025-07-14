/**
 * ContextProgressBar Component - Visual progress indicator for context usage
 * Claude Chat Extension
 */

import React from 'react';
import './ContextProgressBar.css';

interface ContextProgressBarProps {
  cacheReadTokens: number;
  maxTokens?: number; // Default: 155k (effective Claude Code limit)
  className?: string;
  messageCount?: number; // Number of messages in session
}

export const ContextProgressBar: React.FC<ContextProgressBarProps> = ({
  cacheReadTokens,
  maxTokens = 155000, // 155k effective limit (from testing results)
  className = '',
  messageCount = 0
}) => {
  // Calculate percentage
  const percentage = Math.min((cacheReadTokens / maxTokens) * 100, 100);
  
  // 80% mark position (124k tokens at 155k max)
  const warningMarkPosition = 80;
  
  // Color logic based on percentage
  const getColor = (percentage: number): string => {
    if (percentage <= 80) return '#00ff00'; // Green
    if (percentage <= 90) return '#ffff00'; // Yellow
    if (percentage <= 95) return '#ffa500'; // Orange
    return '#ff0000'; // Red
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  // Calculate widths for two-zone system
  const greenZoneWidth = Math.min(percentage, 80); // 0-80%: green zone
  const warningZoneWidth = percentage > 80 ? ((percentage - 80) / 20) * 20 : 0; // 80-100%: warning zone (20% range)

  return (
    <div className={`context-progress-bar ${className}`}>
      <div className="progress-track">
        {cacheReadTokens > 0 && (
          <>
            {/* Green zone: 0-80% */}
            <div 
              className="progress-fill-green"
              style={{
                width: `${greenZoneWidth}%`
              }}
            />
            
            {/* Warning zone: 80-100% (gradient) */}
            {percentage > 80 && (
              <div 
                className="progress-fill-warning"
                style={{
                  left: '80%',
                  width: `${warningZoneWidth}%`
                }}
              />
            )}
            
            {/* 80% warning mark */}
            <div 
              className="warning-mark"
              style={{ left: `${warningMarkPosition}%` }}
              title="80% threshold (128k tokens)"
            />
          </>
        )}
      </div>
      
      {/* Token info */}
      <div className="token-info">
        <div className="left-info">
          <span className="current-tokens">
            {formatTokens(cacheReadTokens)} Tokens
          </span>
          <span className="label">
            Context Window
          </span>
        </div>
        {messageCount > 0 && (
          <div className="right-info">
            <span className="message-count-indicator">
              {messageCount} Messages
            </span>
          </div>
        )}
      </div>
    </div>
  );
};