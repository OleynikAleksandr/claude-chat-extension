/**
 * Типы для системы интерактивных команд
 */

/**
 * Базовый интерфейс для интерактивной команды
 */
export interface InteractiveCommand {
  /** Имя команды (например, '/resume') */
  command: string;
  /** Описание команды */
  description: string;
  /** Паттерн для распознавания вывода команды */
  outputPattern: RegExp;
  /** Требуется ли пользовательский ввод */
  requiresUserInput: boolean;
}

/**
 * Результат парсинга вывода команды
 */
export interface ParsedOutput<T = any> {
  /** Успешно ли распознан вывод */
  success: boolean;
  /** Распарсенные данные */
  data?: T;
  /** Сообщение об ошибке */
  error?: string;
  /** Требуется ли пользовательский ввод */
  requiresInput?: boolean;
  /** Подсказка для пользователя */
  prompt?: string;
}

/**
 * Ответ пользователя на интерактивный запрос
 */
export interface UserResponse {
  /** ID сессии */
  sessionId: string;
  /** Команда, на которую отвечаем */
  command: string;
  /** Выбор пользователя */
  selection: string | number;
  /** Дополнительные данные */
  metadata?: any;
}

/**
 * Интерфейс для обработчика интерактивной команды
 */
export interface IInteractiveCommandHandler<T = any> {
  /** Команда, которую обрабатывает */
  command: string;
  
  /** Может ли обработать данный вывод */
  canHandle(output: string): boolean;
  
  /** Парсит вывод команды */
  parseOutput(output: string): ParsedOutput<T>;
  
  /** Форматирует ответ для отправки в терминал */
  formatResponse(selection: string | number): string;
  
  /** Валидирует выбор пользователя */
  validateSelection(selection: string | number, data: T): boolean;
}

/**
 * События системы интерактивных команд
 */
export interface InteractiveCommandEvents {
  /** Команда начала выполнение */
  commandStarted: {
    sessionId: string;
    command: string;
  };
  
  /** Получен вывод, требующий ввода */
  inputRequired: {
    sessionId: string;
    command: string;
    data: any;
    prompt: string;
  };
  
  /** Пользователь сделал выбор */
  userResponded: {
    sessionId: string;
    command: string;
    selection: string | number;
  };
  
  /** Команда завершена */
  commandCompleted: {
    sessionId: string;
    command: string;
    success: boolean;
  };
}

/**
 * Данные для команды /resume
 */
export interface ResumeSessionData {
  sessions: Array<{
    id: string;
    date: string;
    time: string;
    description?: string;
  }>;
}

/**
 * Конфигурация монитора терминала
 */
export interface TerminalMonitorConfig {
  /** Максимальный размер буфера */
  maxBufferSize: number;
  /** Таймаут ожидания вывода (мс) */
  outputTimeout: number;
  /** Дебаунс для обработки вывода (мс) */
  debounceDelay: number;
}