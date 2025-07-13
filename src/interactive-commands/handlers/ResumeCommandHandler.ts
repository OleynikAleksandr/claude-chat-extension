import { InteractiveCommandHandler } from '../core/InteractiveCommandHandler';
import { ParsedOutput, ResumeSessionData } from '../types';
import * as vscode from 'vscode';

/**
 * Обработчик для команды /resume
 * Парсит список доступных сессий и обрабатывает выбор пользователя
 */
export class ResumeCommandHandler extends InteractiveCommandHandler<ResumeSessionData> {
  constructor(outputChannel: vscode.OutputChannel) {
    super('/resume', outputChannel);
  }

  /**
   * Проверяет, является ли вывод списком сессий от /resume
   */
  protected canHandleSpecific(output: string): boolean {
    // Логируем вывод для отладки
    this.log(`Resume output check: "${output.substring(0, 200)}..."`);
    
    // Ищем признаки списка сессий
    const hasSessionList = output.includes('Available sessions:') || 
                          output.includes('Recent sessions:') ||
                          output.includes('Select a session:') ||
                          output.includes('sessions found') ||
                          output.includes('Session from') ||
                          (output.includes('1.') && output.includes('2.')) ||
                          (output.includes('1)') && output.includes('2)')) ||
                          // Поиск паттерна с датами
                          /\d{4}-\d{2}-\d{2}.*\d{2}:\d{2}/.test(output);
    
    this.log(`Resume can handle: ${hasSessionList}`);
    return hasSessionList;
  }

  /**
   * Парсит вывод команды /resume
   */
  parseOutput(output: string): ParsedOutput<ResumeSessionData> {
    try {
      const lines = this.extractLines(output);
      const sessions: ResumeSessionData['sessions'] = [];
      
      // Ищем строки с номерами сессий
      // Предполагаемые форматы:
      // 1. Session from 2025-01-11 14:30
      // 2. Session from 2025-01-11 12:15 - Fixed authentication
      // или
      // 1) 2025-01-11 14:30
      // 2) 2025-01-11 12:15 - Fixed authentication
      
      const sessionPattern = /^(\d+)[.)]\s*(?:Session from\s*)?(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?:\s*-\s*(.*))?$/;
      
      for (const line of lines) {
        const match = line.match(sessionPattern);
        if (match) {
          const [, id, date, time, description] = match;
          sessions.push({
            id,
            date,
            time,
            description: description || undefined
          });
        }
      }

      if (sessions.length > 0) {
        this.log(`Parsed ${sessions.length} sessions from /resume output`);
        
        // Ищем подсказку для пользователя
        let prompt = 'Select a session number:';
        for (const line of lines) {
          if (line.toLowerCase().includes('select') || 
              line.toLowerCase().includes('choose') ||
              line.toLowerCase().includes('enter')) {
            prompt = line;
            break;
          }
        }

        return {
          success: true,
          data: { sessions },
          requiresInput: true,
          prompt
        };
      } else {
        // Может быть сообщение об отсутствии сессий
        if (output.includes('No sessions found') || output.includes('No previous sessions')) {
          return {
            success: true,
            data: { sessions: [] },
            requiresInput: false,
            prompt: 'No sessions available'
          };
        }

        return {
          success: false,
          error: 'Could not parse session list from output'
        };
      }
    } catch (error) {
      this.logError(`Failed to parse /resume output: ${error}`);
      return {
        success: false,
        error: `Parse error: ${error}`
      };
    }
  }

  /**
   * Форматирует выбор пользователя для отправки в терминал
   */
  formatResponse(selection: string | number): string {
    // Просто отправляем номер сессии
    return selection.toString();
  }

  /**
   * Валидирует выбор пользователя
   */
  validateSelection(selection: string | number, data: ResumeSessionData): boolean {
    const sessionNumber = Number(selection);
    
    // Проверяем, что это число
    if (isNaN(sessionNumber)) {
      return false;
    }

    // Проверяем, что номер в допустимом диапазоне
    const validIds = data.sessions.map(s => Number(s.id));
    return validIds.includes(sessionNumber);
  }
}