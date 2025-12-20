/**
 * AIOBS Structured Logger
 * Provides consistent, level-based logging with optional JSON output
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
}

interface LoggerConfig {
  level: LogLevel;
  json: boolean;
  prefix: string;
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.SILENT]: 'SILENT',
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.SILENT]: '',
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() as keyof typeof LogLevel;
    const defaultLevel = envLevel && LogLevel[envLevel] !== undefined
      ? LogLevel[envLevel]
      : LogLevel.INFO;

    this.config = {
      level: config.level ?? defaultLevel,
      json: config.json ?? process.env.LOG_FORMAT === 'json',
      prefix: config.prefix ?? 'AIOBS',
    };
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];

    if (this.config.json) {
      const entry: LogEntry = {
        timestamp,
        level: levelName,
        message,
        ...(context && { context }),
      };
      return JSON.stringify(entry);
    }

    const color = LOG_LEVEL_COLORS[level];
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${color}[${timestamp}] [${this.config.prefix}] ${levelName}:${RESET_COLOR} ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < this.config.level) return;

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log HTTP request (for middleware)
   */
  request(method: string, path: string, statusCode: number, durationMs: number): void {
    this.info(`${method} ${path} ${statusCode} ${durationMs}ms`, {
      method,
      path,
      statusCode,
      durationMs,
    });
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix}:${prefix}`,
    });
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances
export { Logger };

// Named exports for convenience
export const debug = (message: string, context?: Record<string, unknown>): void =>
  logger.debug(message, context);
export const info = (message: string, context?: Record<string, unknown>): void =>
  logger.info(message, context);
export const warn = (message: string, context?: Record<string, unknown>): void =>
  logger.warn(message, context);
export const error = (message: string, context?: Record<string, unknown>): void =>
  logger.error(message, context);
