import * as vscode from 'vscode';
import { TerminalMonitorConfig } from '../types';

/**
 * Монитор для перехвата вывода терминала
 */
export class TerminalOutputMonitor {
  private outputBuffer: Map<string, string[]> = new Map();
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, (output: string) => void> = new Map();
  private outputChannel: vscode.OutputChannel;
  private config: TerminalMonitorConfig;

  constructor(outputChannel: vscode.OutputChannel, config?: Partial<TerminalMonitorConfig>) {
    this.outputChannel = outputChannel;
    this.config = {
      maxBufferSize: config?.maxBufferSize ?? 1000,
      outputTimeout: config?.outputTimeout ?? 5000,
      debounceDelay: config?.debounceDelay ?? 300,
      ...config
    };
  }

  /**
   * Начать мониторинг терминала для конкретной сессии
   */
  startMonitoring(sessionId: string, terminal: vscode.Terminal, callback: (output: string) => void): void {
    this.outputChannel.appendLine(`📡 Starting terminal monitoring for session: ${sessionId}`);
    
    // Сохраняем callback
    this.listeners.set(sessionId, callback);
    
    // Инициализируем буфер
    if (!this.outputBuffer.has(sessionId)) {
      this.outputBuffer.set(sessionId, []);
    }

    // Запускаем наблюдение через Terminal Data Write Listener
    const writeEmitter = (terminal as any).onDidWriteData;
    if (writeEmitter) {
      const disposable = writeEmitter((data: string) => {
        this.handleTerminalData(sessionId, data);
      });
      
      // Сохраняем disposable для последующей очистки
      (terminal as any)._outputMonitorDisposable = disposable;
    } else {
      this.outputChannel.appendLine(`⚠️ Terminal does not support onDidWriteData for session: ${sessionId}`);
    }
  }

  /**
   * Остановить мониторинг терминала
   */
  stopMonitoring(sessionId: string, terminal?: vscode.Terminal): void {
    this.outputChannel.appendLine(`🛑 Stopping terminal monitoring for session: ${sessionId}`);
    
    // Очищаем таймер
    const timer = this.activeMonitors.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.activeMonitors.delete(sessionId);
    }

    // Очищаем listener
    this.listeners.delete(sessionId);
    
    // Очищаем буфер
    this.outputBuffer.delete(sessionId);

    // Dispose terminal listener если есть
    if (terminal && (terminal as any)._outputMonitorDisposable) {
      (terminal as any)._outputMonitorDisposable.dispose();
      delete (terminal as any)._outputMonitorDisposable;
    }
  }

  /**
   * Обработка данных из терминала
   */
  private handleTerminalData(sessionId: string, data: string): void {
    const buffer = this.outputBuffer.get(sessionId);
    if (!buffer) return;

    // Добавляем данные в буфер
    buffer.push(data);

    // Ограничиваем размер буфера
    if (buffer.length > this.config.maxBufferSize) {
      buffer.splice(0, buffer.length - this.config.maxBufferSize);
    }

    // Отменяем предыдущий таймер
    const existingTimer = this.activeMonitors.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Устанавливаем новый таймер с debounce
    const timer = setTimeout(() => {
      this.processBuffer(sessionId);
    }, this.config.debounceDelay);

    this.activeMonitors.set(sessionId, timer);
  }

  /**
   * Обработка накопленного буфера
   */
  private processBuffer(sessionId: string): void {
    const buffer = this.outputBuffer.get(sessionId);
    const callback = this.listeners.get(sessionId);
    
    if (!buffer || !callback || buffer.length === 0) return;

    // Объединяем буфер в одну строку
    const output = buffer.join('');
    
    // Очищаем буфер
    buffer.length = 0;

    // Вызываем callback
    try {
      callback(output);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error in terminal monitor callback: ${error}`);
    }
  }

  /**
   * Принудительная обработка буфера
   */
  flushBuffer(sessionId: string): void {
    this.processBuffer(sessionId);
  }

  /**
   * Очистка всех мониторов
   */
  dispose(): void {
    // Останавливаем все мониторы
    for (const [sessionId] of this.listeners) {
      this.stopMonitoring(sessionId);
    }
  }
}