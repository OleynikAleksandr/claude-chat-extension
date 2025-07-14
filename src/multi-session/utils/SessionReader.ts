/**
 * SessionReader - Reads Claude Code sessions from ~/.claude/projects/ directory
 * Claude Chat Extension
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SessionInfo {
  id: string;
  sessionId: string; // UUID from filename
  projectPath: string;
  createdAt: number; // timestamp
  fileSize: number; // in bytes
  formattedSize: string; // human readable
  date: string; // formatted date
  time: string; // formatted time
  description?: string; // optional description from first message
}

export interface ProjectSessions {
  projectPath: string;
  sessions: SessionInfo[];
}

export class SessionReader {
  private claudeDir: string;
  private projectsDir: string;

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude');
    this.projectsDir = path.join(this.claudeDir, 'projects');
  }

  /**
   * Get all sessions for current working directory
   */
  async getSessionsForCurrentProject(currentProjectPath: string): Promise<SessionInfo[]> {
    try {
      // Encode project path the same way Claude Code does
      const encodedProjectPath = this.encodeProjectPath(currentProjectPath);
      const projectDir = path.join(this.projectsDir, encodedProjectPath);

      if (!fs.existsSync(projectDir)) {
        console.log(`No sessions found for project: ${currentProjectPath}`);
        return [];
      }

      const sessions: SessionInfo[] = [];
      const files = fs.readdirSync(projectDir);

      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const fileBaseName = path.basename(file, '.jsonl');
          const filePath = path.join(projectDir, file);
          
          // Skip invalid sessions (already resumed)
          if (!this.isValidSession(filePath)) {
            console.log(`Skipping invalid session: ${file}`);
            continue;
          }
          
          const stats = fs.statSync(filePath);

          // Extract real session_id from file content, fallback to filename
          const realSessionId = this.extractSessionIdFromContent(filePath) || fileBaseName;

          const sessionInfo: SessionInfo = {
            id: (sessions.length + 1).toString(),
            sessionId: realSessionId,
            projectPath: currentProjectPath,
            createdAt: stats.birthtimeMs,
            fileSize: stats.size,
            formattedSize: this.formatFileSize(stats.size),
            date: this.formatDate(stats.birthtime),
            time: this.formatTime(stats.birthtime),
          };

          // Try to extract description from first user message
          try {
            const description = await this.extractSessionDescription(filePath);
            if (description) {
              sessionInfo.description = description;
            }
          } catch (error) {
            console.warn(`Could not extract description from ${file}:`, error);
          }

          sessions.push(sessionInfo);
        }
      }

      // Sort by creation time (newest first)
      sessions.sort((a, b) => b.createdAt - a.createdAt);

      return sessions;
    } catch (error) {
      console.error('Error reading sessions:', error);
      return [];
    }
  }

  /**
   * Get all projects with their sessions
   */
  async getAllProjects(): Promise<ProjectSessions[]> {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        return [];
      }

      const projects: ProjectSessions[] = [];
      const projectDirs = fs.readdirSync(this.projectsDir);

      for (const encodedPath of projectDirs) {
        const projectDir = path.join(this.projectsDir, encodedPath);
        const stats = fs.statSync(projectDir);

        if (stats.isDirectory()) {
          const decodedPath = this.decodeProjectPath(encodedPath);
          const sessions = await this.getSessionsForProject(projectDir, decodedPath);
          
          if (sessions.length > 0) {
            projects.push({
              projectPath: decodedPath,
              sessions: sessions
            });
          }
        }
      }

      return projects;
    } catch (error) {
      console.error('Error reading all projects:', error);
      return [];
    }
  }

  /**
   * Extract session_id from JSONL file content (first message with session_id)
   */
  private extractSessionIdFromContent(filePath: string): string | undefined {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          if (message.session_id) {
            return message.session_id;
          }
        } catch (parseError) {
          // Skip malformed lines
          continue;
        }
      }
      
      return undefined;
    } catch (error) {
      console.error('Error extracting session ID from file:', error);
      return undefined;
    }
  }

  /**
   * Check if session is valid for resume (not already resumed)
   * Valid sessions start with user messages, not summary messages
   */
  private isValidSession(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return false;
      }

      // Check first line
      try {
        const firstMessage = JSON.parse(lines[0]);
        // If first message is a summary, this session was already resumed
        if (firstMessage.type === 'summary') {
          return false;
        }
        return true;
      } catch (parseError) {
        // If we can't parse the first line, consider it invalid
        return false;
      }
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Extract description from first user message in JSONL file
   */
  private async extractSessionDescription(filePath: string): Promise<string | undefined> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          
          // Look for first user message
          if (message.role === 'user' && message.content) {
            let text = '';
            
            if (typeof message.content === 'string') {
              text = message.content;
            } else if (Array.isArray(message.content)) {
              // Handle structured content
              for (const part of message.content) {
                if (part.type === 'text' && part.text) {
                  text = part.text;
                  break;
                }
              }
            }

            if (text) {
              // Return first 100 characters
              return text.length > 100 ? text.substring(0, 100) + '...' : text;
            }
          }
        } catch (parseError) {
          // Skip malformed lines
          continue;
        }
      }

      return undefined;
    } catch (error) {
      console.error('Error extracting session description:', error);
      return undefined;
    }
  }

  /**
   * Get sessions for a specific project directory
   */
  private async getSessionsForProject(projectDir: string, projectPath: string): Promise<SessionInfo[]> {
    const sessions: SessionInfo[] = [];
    const files = fs.readdirSync(projectDir);

    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const fileBaseName = path.basename(file, '.jsonl');
        const filePath = path.join(projectDir, file);
        
        // Skip invalid sessions (already resumed)
        if (!this.isValidSession(filePath)) {
          console.log(`Skipping invalid session: ${file}`);
          continue;
        }
        
        const stats = fs.statSync(filePath);

        // Extract real session_id from file content, fallback to filename
        const realSessionId = this.extractSessionIdFromContent(filePath) || fileBaseName;

        const sessionInfo: SessionInfo = {
          id: (sessions.length + 1).toString(),
          sessionId: realSessionId,
          projectPath: projectPath,
          createdAt: stats.birthtimeMs,
          fileSize: stats.size,
          formattedSize: this.formatFileSize(stats.size),
          date: this.formatDate(stats.birthtime),
          time: this.formatTime(stats.birthtime),
        };

        // Try to extract description
        try {
          const description = await this.extractSessionDescription(filePath);
          if (description) {
            sessionInfo.description = description;
          }
        } catch (error) {
          // Continue without description
        }

        sessions.push(sessionInfo);
      }
    }

    // Sort by creation time (newest first)
    sessions.sort((a, b) => b.createdAt - a.createdAt);

    return sessions;
  }

  /**
   * Encode project path the same way Claude Code does
   */
  private encodeProjectPath(projectPath: string): string {
    // Remove special characters and replace with hyphens
    return projectPath.replace(/[^a-zA-Z0-9]/g, '-');
  }

  /**
   * Decode project path (simple reverse of encoding)
   */
  private decodeProjectPath(encodedPath: string): string {
    // This is a simplified decoder - the real one might be more complex
    return encodedPath.replace(/-/g, '/');
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format time as HH:MM
   */
  private formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0].substring(0, 5);
  }
}