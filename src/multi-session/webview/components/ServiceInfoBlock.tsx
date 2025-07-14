/**
 * ServiceInfoBlock - Component for displaying service information in the footer
 * Shows real-time status from Claude JSON responses with dynamic updates
 */

import React, { useMemo, useRef } from 'react';
import { ServiceMessage } from '../../types/Session';
import './ServiceInfoBlock.css';

export interface ServiceInfoBlockProps {
  serviceInfo: ServiceMessage;
  onUpdate?: (updated: ServiceMessage) => void;
}

// Extract file paths from tool input
const extractPath = (input: any): string => {
  if (!input) return '';
  
  // Check common path fields
  if (input.file_path) return input.file_path;
  if (input.path) return input.path;
  if (input.notebook_path) return input.notebook_path;
  if (input.url) return input.url;
  if (input.query) return input.query; // For WebSearch
  if (input.pattern) return input.pattern; // For Grep/Glob
  if (input.command) return input.command; // For Bash
  
  // For tools with multiple paths or complex inputs
  if (input.edits && Array.isArray(input.edits)) {
    return `${input.edits.length} edits`;
  }
  
  return '';
};

// Truncate path in the middle to show start and filename
const truncatePathMiddle = (path: string, maxLength: number = 80): string => {
  if (path.length <= maxLength) return path;
  
  // Extract filename from path
  const lastSlash = path.lastIndexOf('/');
  const lastBackslash = path.lastIndexOf('\\');
  const separator = lastSlash > lastBackslash ? '/' : '\\';
  const separatorIndex = Math.max(lastSlash, lastBackslash);
  
  // If no separator, just truncate normally
  if (separatorIndex === -1) {
    return path.substring(0, maxLength - 3) + '...';
  }
  
  const filename = path.substring(separatorIndex + 1);
  const pathWithoutFile = path.substring(0, separatorIndex);
  
  // If filename itself is too long
  if (filename.length > maxLength - 10) {
    return '...' + filename.substring(filename.length - (maxLength - 3));
  }
  
  // Calculate how much of the path we can show
  const remainingLength = maxLength - filename.length - 3; // 3 for "..."
  const halfRemaining = Math.floor(remainingLength / 2);
  
  if (halfRemaining <= 0) {
    return '...' + separator + filename;
  }
  
  // Show start of path and end of path before filename
  const start = pathWithoutFile.substring(0, halfRemaining);
  const end = pathWithoutFile.substring(pathWithoutFile.length - halfRemaining);
  
  return start + '...' + end + separator + filename;
};

export const ServiceInfoBlock: React.FC<ServiceInfoBlockProps> = ({ 
  serviceInfo, 
  onUpdate
}) => {
  // State to keep track of the last tool used - starts empty
  const lastToolStatusRef = useRef<string>('');
  
  // Parse raw JSON to determine status
  const { statusText, isProcessing } = useMemo(() => {
    const rawJson = serviceInfo?.rawJson;
    
    // Check type: result -> Assistant Ready For Next Task
    if (rawJson?.type === 'result') {
      return { statusText: 'Assistant Ready For Next Task', isProcessing: false };
    }

    // Check type: system -> Reading user request
    if (rawJson?.type === 'system') {
      return { statusText: 'Reading user request', isProcessing: true };
    }

    // Check type: tool_result -> Sending requested information
    if (rawJson?.type === 'tool_result') {
      return { statusText: 'Sending requested information', isProcessing: true };
    }

    // Check type: assistant with tool_use
    if (rawJson?.type === 'assistant' && rawJson.message?.content) {
      const content = rawJson.message.content;
      
      // Search for tool_use in content array
      for (const item of content) {
        if (item.type === 'tool_use' && item.name) {
          // Get tool name
          const toolName = item.name;
          
          // Extract path/file/url from input
          const path = extractPath(item.input);
          
          // Truncate path if needed
          const displayPath = path ? truncatePathMiddle(path) : '';
          
          // Return formatted string
          const status = displayPath ? `${toolName}: ${displayPath}` : toolName;
          // Save this as the last tool status
          lastToolStatusRef.current = status;
          return { statusText: status, isProcessing: true };
        }
      }
    }

    // For all other cases, show last tool if available
    if (lastToolStatusRef.current) {
      // Keep pulsing for tool statuses
      return { statusText: lastToolStatusRef.current, isProcessing: true };
    }
    
    // Only return empty at the very beginning
    return { statusText: '', isProcessing: false };
  }, [serviceInfo.rawJson]);
  

  // Determine if we should show ready state
  const isReady = statusText === 'Assistant Ready For Next Task';
  
  // Always render the component to maintain layout, but hide if no text
  return (
    <div className="service-info-compact">
      <div className={`compact-status-bar ${isProcessing ? 'pulsing' : ''}`} style={{ opacity: statusText ? 1 : 0 }}>
        <span className={`status-text ${isReady ? 'ready-text' : ''}`}>
          {statusText || '\u00A0' /* Non-breaking space to maintain height */}
        </span>
      </div>
    </div>
  );
};