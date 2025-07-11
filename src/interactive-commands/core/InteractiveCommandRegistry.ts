import { IInteractiveCommandHandler } from '../types';
import * as vscode from 'vscode';

/**
 * Реестр интерактивных команд
 * Позволяет регистрировать и получать обработчики для различных команд
 */
export class InteractiveCommandRegistry {
  private handlers: Map<string, IInteractiveCommandHandler> = new Map();
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Регистрирует обработчик команды
   */
  register(handler: IInteractiveCommandHandler): void {
    const command = handler.command;
    
    if (this.handlers.has(command)) {
      this.outputChannel.appendLine(`⚠️ Handler for command '${command}' is already registered, replacing...`);
    }

    this.handlers.set(command, handler);
    this.outputChannel.appendLine(`✅ Registered handler for command: ${command}`);
  }

  /**
   * Удаляет обработчик команды
   */
  unregister(command: string): boolean {
    const result = this.handlers.delete(command);
    if (result) {
      this.outputChannel.appendLine(`🗑️ Unregistered handler for command: ${command}`);
    }
    return result;
  }

  /**
   * Получает обработчик для команды
   */
  getHandler(command: string): IInteractiveCommandHandler | undefined {
    return this.handlers.get(command);
  }

  /**
   * Находит обработчик, который может обработать данный вывод
   */
  findHandlerForOutput(output: string): IInteractiveCommandHandler | undefined {
    for (const [command, handler] of this.handlers) {
      if (handler.canHandle(output)) {
        this.outputChannel.appendLine(`🎯 Found handler for output: ${command}`);
        return handler;
      }
    }
    return undefined;
  }

  /**
   * Проверяет, зарегистрирован ли обработчик для команды
   */
  hasHandler(command: string): boolean {
    return this.handlers.has(command);
  }

  /**
   * Получает список всех зарегистрированных команд
   */
  getRegisteredCommands(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Очищает все обработчики
   */
  clear(): void {
    this.handlers.clear();
    this.outputChannel.appendLine('🧹 Cleared all interactive command handlers');
  }

  /**
   * Получает количество зарегистрированных обработчиков
   */
  get size(): number {
    return this.handlers.size;
  }
}