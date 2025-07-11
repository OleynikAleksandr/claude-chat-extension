import { IInteractiveCommandHandler, ParsedOutput } from '../types';
import * as vscode from 'vscode';

/**
 * Базовый абстрактный класс для обработчиков интерактивных команд
 */
export abstract class InteractiveCommandHandler<T = any> implements IInteractiveCommandHandler<T> {
  protected outputChannel: vscode.OutputChannel;

  constructor(
    public readonly command: string,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
  }

  /**
   * Проверяет, может ли обработчик обработать данный вывод
   */
  canHandle(output: string): boolean {
    // Базовая проверка - содержит ли вывод команду
    if (!output.includes(this.command)) {
      return false;
    }

    // Дополнительная проверка в наследниках
    return this.canHandleSpecific(output);
  }

  /**
   * Специфичная проверка для конкретной команды
   * Должна быть реализована в наследниках
   */
  protected abstract canHandleSpecific(output: string): boolean;

  /**
   * Парсит вывод команды
   */
  abstract parseOutput(output: string): ParsedOutput<T>;

  /**
   * Форматирует ответ для отправки в терминал
   */
  abstract formatResponse(selection: string | number): string;

  /**
   * Валидирует выбор пользователя
   */
  abstract validateSelection(selection: string | number, data: T): boolean;

  /**
   * Логирование для отладки
   */
  protected log(message: string): void {
    this.outputChannel.appendLine(`[${this.command}] ${message}`);
  }

  /**
   * Логирование ошибки
   */
  protected logError(error: string): void {
    this.outputChannel.appendLine(`[${this.command}] ❌ ERROR: ${error}`);
  }

  /**
   * Очистка ANSI escape последовательностей из терминального вывода
   */
  protected cleanAnsiCodes(text: string): string {
    // Удаляем ANSI escape последовательности
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Извлечение строк из вывода
   */
  protected extractLines(output: string): string[] {
    return output
      .split('\n')
      .map(line => this.cleanAnsiCodes(line.trim()))
      .filter(line => line.length > 0);
  }
}