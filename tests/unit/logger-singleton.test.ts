import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Logger } from '../../src/utils/logger';

describe('Logger Singleton Behavior', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let logCalls: string[] = [];
  let errorCalls: string[] = [];

  beforeEach(() => {
    // Capture console calls
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    logCalls = [];
    errorCalls = [];
    
    console.log = (...args: any[]) => {
      logCalls.push(args.join(' '));
    };
    
    console.error = (...args: any[]) => {
      errorCalls.push(args.join(' '));
    };
  });

  afterEach(() => {
    // Restore console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  test('logger outputs message exactly once', () => {
    const logger = new Logger();
    logger.info('Test message');
    
    expect(logCalls.length).toBe(1);
    expect(logCalls[0]).toContain('Test message');
  });

  test('multiple log calls do not duplicate', () => {
    const logger = new Logger();
    logger.info('Message 1');
    logger.info('Message 2');
    logger.info('Message 3');
    
    expect(logCalls.length).toBe(3);
    expect(logCalls[0]).toContain('Message 1');
    expect(logCalls[1]).toContain('Message 2');
    expect(logCalls[2]).toContain('Message 3');
  });

  test('error messages output exactly once', () => {
    const logger = new Logger();
    logger.error('Error message');
    
    expect(errorCalls.length).toBe(1);
    expect(errorCalls[0]).toContain('Error message');
  });

  test('logger with context outputs exactly once', () => {
    const logger = new Logger();
    logger.info('Message with context', { key: 'value' });
    
    // Should have 2 calls: message + context
    expect(logCalls.length).toBe(2);
    expect(logCalls[0]).toContain('Message with context');
    expect(logCalls[1]).toContain('key');
  });
});
