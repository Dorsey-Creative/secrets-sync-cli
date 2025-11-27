/**
 * Logger Module
 * 
 * Provides structured logging with level support and verbose mode.
 * Respects --verbose flag for debug output.
 * 
 * **Security:** Scrubbing happens at TWO levels for defense-in-depth:
 * 1. Logger scrubs messages and context objects before formatting
 * 2. Bootstrap scrubs final string output at stream level
 * This ensures both structured data (objects) and text patterns are caught.
 * 
 * @example
 * const logger = new Logger({ verbose: true });
 * logger.error('Failed: API_KEY=secret123');
 * // Output: Failed: API_KEY=[REDACTED]
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
  debugLogger?: boolean;
}

let logCallId = 0;

export class Logger {
  private minLevel: LogLevel;
  private debugLogger: boolean;

  constructor(options: LoggerOptions = {}) {
    this.minLevel = options.verbose ? LogLevel.DEBUG : options.minLevel ?? LogLevel.INFO;
    this.debugLogger = options.debugLogger ?? false;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level > this.minLevel) return;

    const callId = ++logCallId;
    const timestamp = new Date().toISOString();
    const levelName = levelNames[level];
    const color = levelColors[level];
    
    // Debug: Capture call stack if debug mode enabled
    if (this.debugLogger) {
      const stack = new Error().stack?.split('\n').slice(3, 6).join('\n') || 'unknown';
      console.error(`[DEBUG-LOGGER] Call #${callId} from:\n${stack}`);
    }
    
    // Scrub message (defense-in-depth: logger scrubs objects, bootstrap scrubs final strings)
    const scrubbedMessage = scrubSecrets(message);
    const logLine = `${colors.gray}[${timestamp}]${colors.reset} ${color}[${levelName}]${colors.reset} ${scrubbedMessage}`;
    
    // Route to appropriate stream: ERROR and WARN to stderr, INFO and DEBUG to stdout
    const output = (level === LogLevel.ERROR || level === LogLevel.WARN) ? console.error : console.log;
    output(logLine);
    
    if (context && Object.keys(context).length > 0) {
      // Scrub context object (defense-in-depth: catches { password: "secret" } patterns)
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
   * Secrets are scrubbed at both logger and stream level (defense-in-depth).
   * 
   * @example
   * logger.error('Database connection failed: PASSWORD=secret123');
   * // Output: Database connection failed: PASSWORD=[REDACTED]
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log a warning message with optional context.
   * Secrets are scrubbed at both logger and stream level (defense-in-depth).
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an info message with optional context.
   * Secrets are scrubbed at both logger and stream level (defense-in-depth).
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a debug message with optional context (only shown in verbose mode).
   * Secrets are scrubbed at both logger and stream level (defense-in-depth).
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an Error object with automatic stack trace scrubbing.
   * Secrets are scrubbed at both logger and stream level (defense-in-depth).
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
