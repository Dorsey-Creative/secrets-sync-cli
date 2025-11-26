/**
 * Logger Module
 * 
 * Provides structured logging with level support and verbose mode.
 * Respects --verbose flag for debug output.
 * 
 * **Security:** All log output is automatically scrubbed to prevent secret exposure.
 * Secrets are detected using pattern matching (KEY=value, URLs, JWT tokens, etc.)
 * and replaced with [REDACTED] before logging. This scrubbing is always enabled
 * and cannot be disabled.
 * 
 * **Performance:** Scrubbing adds < 1ms overhead per log call, with no noticeable
 * impact on CLI performance.
 * 
 * @example
 * const logger = new Logger({ verbose: true });
 * 
 * // Secrets are automatically scrubbed
 * logger.error('Failed: API_KEY=secret123');
 * // Output: Failed: API_KEY=[REDACTED]
 * 
 * logger.error('Connection failed', { 
 *   url: 'postgres://user:password@localhost/db' 
 * });
 * // Output: { url: 'postgres://user:[REDACTED]@localhost/db' }
 * 
 * // Stack traces are scrubbed via logError()
 * try {
 *   throw new Error('API_KEY=secret failed');
 * } catch (error) {
 *   logger.logError(error);
 * }
 * // Output: Error occurred
 * //   message: API_KEY=[REDACTED] failed
 * //   stack: (scrubbed stack trace)
 */

import { scrubSecrets, scrubObject } from './scrubber';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
};

const levelColors = {
  [LogLevel.ERROR]: colors.red,
  [LogLevel.WARN]: colors.yellow,
  [LogLevel.INFO]: colors.cyan,
  [LogLevel.DEBUG]: colors.gray,
};

const levelNames = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
};

export interface LoggerOptions {
  verbose?: boolean;
  minLevel?: LogLevel;
}

export class Logger {
  private minLevel: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.minLevel = options.verbose ? LogLevel.DEBUG : options.minLevel ?? LogLevel.INFO;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level > this.minLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = levelNames[level];
    const color = levelColors[level];
    
    // Scrub message before logging
    const scrubbedMessage = scrubSecrets(message);
    const logLine = `${colors.gray}[${timestamp}]${colors.reset} ${color}[${levelName}]${colors.reset} ${scrubbedMessage}`;
    
    const output = level === LogLevel.ERROR ? console.error : console.log;
    output(logLine);
    
    if (context && Object.keys(context).length > 0) {
      // Scrub context object before logging
      const scrubbedContext = scrubObject(context);
      const contextStr = JSON.stringify(scrubbedContext, null, 2)
        .split('\n')
        .map(line => `   ${line}`)
        .join('\n');
      output(`${colors.gray}Context:${colors.reset}\n${contextStr}`);
    }
  }

  /**
   * Log an error message with optional context.
   * Secrets in both message and context are automatically scrubbed.
   * 
   * @example
   * logger.error('Database connection failed: PASSWORD=secret123');
   * // Output: Database connection failed: PASSWORD=[REDACTED]
   * 
   * logger.error('Failed', { apiKey: 'secret', port: 3000 });
   * // Output: Failed
   * //   Context: { apiKey: '[REDACTED]', port: 3000 }
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log a warning message with optional context.
   * Secrets in both message and context are automatically scrubbed.
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an info message with optional context.
   * Secrets in both message and context are automatically scrubbed.
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a debug message with optional context (only shown in verbose mode).
   * Secrets in both message and context are automatically scrubbed.
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an Error object with automatic stack trace scrubbing.
   * 
   * @example
   * try {
   *   throw new Error('API_KEY=secret123 failed');
   * } catch (error) {
   *   logger.logError(error);
   * }
   * // Output: Error occurred
   * //   message: API_KEY=[REDACTED] failed
   * //   stack: (scrubbed stack trace)
   */
  logError(error: Error, additionalContext?: Record<string, unknown>): void {
    const context: Record<string, unknown> = {
      message: error.message,
      name: error.name,
      ...additionalContext
    };
    
    // Add stack trace if available
    if (error.stack) {
      context.stack = error.stack;
    }
    
    this.error('Error occurred', context);
  }
}

// Default logger instance
export const logger = new Logger();
