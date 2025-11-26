/**
 * Logger Module
 * 
 * Provides structured logging with level support and verbose mode.
 * Respects --verbose flag for debug output.
 */

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
    
    const logLine = `${colors.gray}[${timestamp}]${colors.reset} ${color}[${levelName}]${colors.reset} ${message}`;
    
    const output = level === LogLevel.ERROR ? console.error : console.log;
    output(logLine);
    
    if (context && Object.keys(context).length > 0) {
      const contextStr = JSON.stringify(context, null, 2)
        .split('\n')
        .map(line => `   ${line}`)
        .join('\n');
      output(`${colors.gray}Context:${colors.reset}\n${contextStr}`);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
}

// Default logger instance
export const logger = new Logger();
