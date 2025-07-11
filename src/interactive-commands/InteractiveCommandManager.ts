import * as vscode from 'vscode';
import { InteractiveCommandRegistry } from './core/InteractiveCommandRegistry';
import { TerminalOutputMonitor } from './monitors/TerminalOutputMonitor';
import { ResumeCommandHandler } from './handlers/ResumeCommandHandler';
import { IInteractiveCommandHandler, InteractiveCommandEvents, UserResponse } from './types';

/**
 * Фасад для управления системой интерактивных команд
 * Координирует работу всех компонентов
 */
export class InteractiveCommandManager {
  private registry: InteractiveCommandRegistry;
  private monitor: TerminalOutputMonitor;
  private outputChannel: vscode.OutputChannel;
  private eventEmitter: vscode.EventEmitter<InteractiveCommandEvents[keyof InteractiveCommandEvents]>;
  
  // Хранение активных команд по сессиям
  private activeCommands: Map<string, {
    command: string;
    handler: IInteractiveCommandHandler;
    data?: any;
  }> = new Map();

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.registry = new InteractiveCommandRegistry(outputChannel);
    this.monitor = new TerminalOutputMonitor(outputChannel);
    this.eventEmitter = new vscode.EventEmitter();
    
    // Регистрируем встроенные обработчики
    this.registerBuiltInHandlers();
  }

  /**
   * Регистрация встроенных обработчиков
   */
  private registerBuiltInHandlers(): void {
    // Регистрируем обработчик для /resume
    const resumeHandler = new ResumeCommandHandler(this.outputChannel);
    this.registry.register(resumeHandler);
    
    this.outputChannel.appendLine('✅ Built-in interactive command handlers registered');
  }

  /**
   * Начать отслеживание команды для сессии
   */
  startCommandTracking(sessionId: string, command: string, terminal: vscode.Terminal): void {
    const handler = this.registry.getHandler(command);
    if (!handler) {
      this.outputChannel.appendLine(`⚠️ No handler registered for command: ${command}`);
      return;
    }

    this.outputChannel.appendLine(`🎯 Starting interactive command tracking: ${command} for session ${sessionId}`);
    
    // Сохраняем активную команду
    this.activeCommands.set(sessionId, { command, handler });
    
    // Начинаем мониторинг терминала
    this.monitor.startMonitoring(sessionId, terminal, (output) => {
      this.handleTerminalOutput(sessionId, output);
    });
    
    // Генерируем событие
    this.fireEvent('commandStarted', { sessionId, command });
  }

  /**
   * Обработка вывода терминала
   */
  private handleTerminalOutput(sessionId: string, output: string): void {
    const activeCommand = this.activeCommands.get(sessionId);
    if (!activeCommand) return;

    const { handler, command } = activeCommand;
    
    // Проверяем, может ли обработчик обработать этот вывод
    if (!handler.canHandle(output)) {
      return;
    }

    this.outputChannel.appendLine(`📨 Processing interactive output for ${command}`);
    
    // Парсим вывод
    const parsed = handler.parseOutput(output);
    
    if (parsed.success && parsed.requiresInput) {
      // Сохраняем данные
      activeCommand.data = parsed.data;
      
      // Генерируем событие о необходимости ввода
      this.fireEvent('inputRequired', {
        sessionId,
        command,
        data: parsed.data,
        prompt: parsed.prompt || 'Please make a selection:'
      });
    } else if (!parsed.success) {
      this.outputChannel.appendLine(`❌ Failed to parse output: ${parsed.error}`);
      this.stopCommandTracking(sessionId);
    }
  }

  /**
   * Обработка ответа пользователя
   */
  handleUserResponse(response: UserResponse): string | null {
    const activeCommand = this.activeCommands.get(response.sessionId);
    if (!activeCommand) {
      this.outputChannel.appendLine(`⚠️ No active command for session: ${response.sessionId}`);
      return null;
    }

    const { handler, command, data } = activeCommand;
    
    // Валидируем выбор
    if (!handler.validateSelection(response.selection, data)) {
      this.outputChannel.appendLine(`❌ Invalid selection: ${response.selection}`);
      return null;
    }

    // Форматируем ответ для терминала
    const terminalResponse = handler.formatResponse(response.selection);
    
    // Генерируем событие
    this.fireEvent('userResponded', {
      sessionId: response.sessionId,
      command,
      selection: response.selection
    });
    
    // Завершаем отслеживание команды
    this.stopCommandTracking(response.sessionId);
    
    return terminalResponse;
  }

  /**
   * Остановить отслеживание команды
   */
  stopCommandTracking(sessionId: string, terminal?: vscode.Terminal): void {
    const activeCommand = this.activeCommands.get(sessionId);
    if (!activeCommand) return;

    this.outputChannel.appendLine(`🛑 Stopping command tracking for session: ${sessionId}`);
    
    // Останавливаем мониторинг
    this.monitor.stopMonitoring(sessionId, terminal);
    
    // Генерируем событие завершения
    this.fireEvent('commandCompleted', {
      sessionId,
      command: activeCommand.command,
      success: true
    });
    
    // Удаляем из активных
    this.activeCommands.delete(sessionId);
  }

  /**
   * Проверка, является ли команда интерактивной
   */
  isInteractiveCommand(command: string): boolean {
    return this.registry.hasHandler(command);
  }

  /**
   * Получить активную команду для сессии
   */
  getActiveCommand(sessionId: string): string | undefined {
    return this.activeCommands.get(sessionId)?.command;
  }

  /**
   * Регистрация пользовательского обработчика
   */
  registerHandler(handler: IInteractiveCommandHandler): void {
    this.registry.register(handler);
  }

  /**
   * События
   */
  get onCommandStarted(): vscode.Event<InteractiveCommandEvents['commandStarted']> {
    return this.eventEmitter.event as any;
  }

  get onInputRequired(): vscode.Event<InteractiveCommandEvents['inputRequired']> {
    return this.eventEmitter.event as any;
  }

  get onUserResponded(): vscode.Event<InteractiveCommandEvents['userResponded']> {
    return this.eventEmitter.event as any;
  }

  get onCommandCompleted(): vscode.Event<InteractiveCommandEvents['commandCompleted']> {
    return this.eventEmitter.event as any;
  }

  private fireEvent<K extends keyof InteractiveCommandEvents>(
    _event: K,
    data: InteractiveCommandEvents[K]
  ): void {
    this.eventEmitter.fire(data as any);
  }

  /**
   * Очистка ресурсов
   */
  dispose(): void {
    // Останавливаем все активные команды
    for (const [sessionId] of this.activeCommands) {
      this.stopCommandTracking(sessionId);
    }
    
    // Очищаем реестр
    this.registry.clear();
    
    // Dispose monitor
    this.monitor.dispose();
    
    // Dispose event emitter
    this.eventEmitter.dispose();
  }
}