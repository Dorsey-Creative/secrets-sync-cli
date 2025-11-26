import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { Logger, LogLevel } from '../../src/utils/logger';

describe('Logger', () => {
  let originalLog: typeof console.log;
  let originalError: typeof console.error;
  let logOutput: string[];
  let errorOutput: string[];

  beforeEach(() => {
    logOutput = [];
    errorOutput = [];
    originalLog = console.log;
    originalError = console.error;
    console.log = mock((...args: any[]) => logOutput.push(args.join(' ')));
    console.error = mock((...args: any[]) => errorOutput.push(args.join(' ')));
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  describe('constructor', () => {
    test('creates logger with default level INFO', () => {
      const logger = new Logger();
      logger.debug('test');
      logger.info('test');
      
      expect(logOutput.length).toBe(1); // Only INFO shown
    });

    test('creates logger with verbose mode', () => {
      const logger = new Logger({ verbose: true });
      logger.debug('test');
      logger.info('test');
      
      expect(logOutput.length).toBe(2); // Both DEBUG and INFO shown
    });

    test('creates logger with custom min level', () => {
      const logger = new Logger({ minLevel: LogLevel.WARN });
      logger.info('test');
      logger.warn('test');
      
      expect(logOutput.length).toBe(1); // Only WARN shown
    });
  });

  describe('error', () => {
    test('logs error message', () => {
      const logger = new Logger();
      logger.error('Test error');
      
      expect(errorOutput.length).toBe(1);
      expect(errorOutput[0]).toContain('ERROR');
      expect(errorOutput[0]).toContain('Test error');
    });

    test('logs error with context', () => {
      const logger = new Logger();
      logger.error('Test error', { file: 'test.txt' });
      
      expect(errorOutput.length).toBe(2); // Message + context
      expect(errorOutput[0]).toContain('Test error');
      expect(errorOutput[1]).toContain('test.txt');
    });

    test('includes timestamp', () => {
      const logger = new Logger();
      logger.error('Test error');
      
      expect(errorOutput[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('includes ANSI colors', () => {
      const logger = new Logger();
      logger.error('Test error');
      
      expect(errorOutput[0]).toContain('\x1b[31m'); // Red
      expect(errorOutput[0]).toContain('\x1b[0m');  // Reset
    });
  });

  describe('warn', () => {
    test('logs warning message', () => {
      const logger = new Logger();
      logger.warn('Test warning');
      
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('WARN');
      expect(logOutput[0]).toContain('Test warning');
    });

    test('logs warning with context', () => {
      const logger = new Logger();
      logger.warn('Test warning', { line: 42 });
      
      expect(logOutput.length).toBe(2);
      expect(logOutput[1]).toContain('42');
    });
  });

  describe('info', () => {
    test('logs info message', () => {
      const logger = new Logger();
      logger.info('Test info');
      
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('INFO');
      expect(logOutput[0]).toContain('Test info');
    });

    test('logs info with context', () => {
      const logger = new Logger();
      logger.info('Test info', { status: 'ok' });
      
      expect(logOutput.length).toBe(2);
      expect(logOutput[1]).toContain('ok');
    });

    test('not shown when min level is WARN', () => {
      const logger = new Logger({ minLevel: LogLevel.WARN });
      logger.info('Test info');
      
      expect(logOutput.length).toBe(0);
    });
  });

  describe('debug', () => {
    test('not shown in normal mode', () => {
      const logger = new Logger();
      logger.debug('Test debug');
      
      expect(logOutput.length).toBe(0);
    });

    test('shown in verbose mode', () => {
      const logger = new Logger({ verbose: true });
      logger.debug('Test debug');
      
      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('DEBUG');
      expect(logOutput[0]).toContain('Test debug');
    });

    test('logs debug with context', () => {
      const logger = new Logger({ verbose: true });
      logger.debug('Test debug', { step: 1 });
      
      expect(logOutput.length).toBe(2);
      expect(logOutput[1]).toContain('1');
    });
  });

  describe('context formatting', () => {
    test('formats empty context', () => {
      const logger = new Logger();
      logger.info('Test', {});
      
      expect(logOutput.length).toBe(1); // No context output
    });

    test('formats single value context', () => {
      const logger = new Logger();
      logger.info('Test', { key: 'value' });
      
      expect(logOutput[1]).toContain('key');
      expect(logOutput[1]).toContain('value');
    });

    test('formats nested context', () => {
      const logger = new Logger();
      logger.info('Test', { nested: { key: 'value' } });
      
      expect(logOutput[1]).toContain('nested');
      expect(logOutput[1]).toContain('key');
      expect(logOutput[1]).toContain('value');
    });

    test('indents context lines', () => {
      const logger = new Logger();
      logger.info('Test', { key: 'value' });
      
      // Context output includes "Context:" header and JSON lines
      expect(logOutput[1]).toContain('Context:');
      expect(logOutput[1]).toContain('key');
    });
  });

  describe('level filtering', () => {
    test('ERROR always shown', () => {
      const logger = new Logger({ minLevel: LogLevel.ERROR });
      logger.error('test');
      logger.warn('test');
      logger.info('test');
      logger.debug('test');
      
      expect(errorOutput.length).toBe(1);
      expect(logOutput.length).toBe(0);
    });

    test('WARN shows WARN and ERROR', () => {
      const logger = new Logger({ minLevel: LogLevel.WARN });
      logger.error('test');
      logger.warn('test');
      logger.info('test');
      logger.debug('test');
      
      expect(errorOutput.length).toBe(1);
      expect(logOutput.length).toBe(1);
    });

    test('INFO shows INFO, WARN, and ERROR', () => {
      const logger = new Logger({ minLevel: LogLevel.INFO });
      logger.error('test');
      logger.warn('test');
      logger.info('test');
      logger.debug('test');
      
      expect(errorOutput.length).toBe(1);
      expect(logOutput.length).toBe(2);
    });

    test('DEBUG shows all levels', () => {
      const logger = new Logger({ minLevel: LogLevel.DEBUG });
      logger.error('test');
      logger.warn('test');
      logger.info('test');
      logger.debug('test');
      
      expect(errorOutput.length).toBe(1);
      expect(logOutput.length).toBe(3);
    });
  });
});
