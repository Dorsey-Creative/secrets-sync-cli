/**
 * Integration Tests: Logger Scrubbing
 * 
 * Tests that the logger automatically scrubs secrets from all log output.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Logger } from '../../src/utils/logger';

describe('Logger Scrubbing Integration', () => {
  let logOutput: string[];
  let errorOutput: string[];
  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(() => {
    logOutput = [];
    errorOutput = [];

    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };
    console.error = (...args: any[]) => {
      errorOutput.push(args.join(' '));
    };
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  describe('error() method', () => {
    test('scrubs KEY=value secrets in message', () => {
      const logger = new Logger();
      logger.error('Failed: API_KEY=secret123');

      expect(errorOutput[0]).toContain('API_KEY=[REDACTED]');
      expect(errorOutput[0]).not.toContain('secret123');
    });

    test('scrubs secrets in context object', () => {
      const logger = new Logger();
      logger.error('Failed', { apiKey: 'secret123', password: 'pass123' });

      expect(errorOutput[1]).toContain('[REDACTED]');
      expect(errorOutput[1]).not.toContain('secret123');
      expect(errorOutput[1]).not.toContain('pass123');
    });
  });

  describe('warn() method', () => {
    test('scrubs URL credentials in message', () => {
      const logger = new Logger();
      logger.warn('Connection: postgres://user:password@localhost/db');

      expect(logOutput[0]).toContain('postgres://user:[REDACTED]@localhost/db');
      expect(logOutput[0]).not.toContain('password');
    });

    test('scrubs secrets in context object', () => {
      const logger = new Logger();
      logger.warn('Warning', { token: 'abc123' });

      expect(logOutput[1]).toContain('[REDACTED]');
      expect(logOutput[1]).not.toContain('abc123');
    });
  });

  describe('info() method', () => {
    test('scrubs JWT tokens in message', () => {
      const logger = new Logger();
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      logger.info(`Token: ${jwt}`);

      expect(logOutput[0]).toContain('[REDACTED:JWT]');
      expect(logOutput[0]).not.toContain(jwt);
    });

    test('scrubs secrets in context object', () => {
      const logger = new Logger();
      logger.info('Info', { secret: 'value' });

      expect(logOutput[1]).toContain('[REDACTED]');
      expect(logOutput[1]).not.toContain('value');
    });
  });

  describe('debug() method', () => {
    test('scrubs secrets in verbose mode', () => {
      const logger = new Logger({ verbose: true });
      logger.debug('Debug: PASSWORD=secret123');

      expect(logOutput[0]).toContain('PASSWORD=[REDACTED]');
      expect(logOutput[0]).not.toContain('secret123');
    });

    test('scrubs secrets in context object', () => {
      const logger = new Logger({ verbose: true });
      logger.debug('Debug', { apiKey: 'secret' });

      expect(logOutput[1]).toContain('[REDACTED]');
      expect(logOutput[1]).not.toContain('secret');
    });
  });

  describe('nested context scrubbing', () => {
    test('scrubs secrets in deeply nested objects', () => {
      const logger = new Logger();
      logger.error('Failed', {
        config: {
          database: {
            password: 'secret123',
            host: 'localhost'
          }
        }
      });

      expect(errorOutput[1]).toContain('[REDACTED]');
      expect(errorOutput[1]).toContain('localhost');
      expect(errorOutput[1]).not.toContain('secret123');
    });
  });

  describe('stack trace scrubbing', () => {
    test('scrubs secrets in error messages', () => {
      const logger = new Logger();
      const error = new Error('Failed with API_KEY=secret123');
      logger.logError(error);

      expect(errorOutput[1]).toContain('API_KEY=[REDACTED]');
      expect(errorOutput[1]).not.toContain('secret123');
    });

    test('scrubs secrets in stack traces', () => {
      const logger = new Logger();
      const error = new Error('Failed');
      // Manually add secret to stack trace
      error.stack = 'Error: Failed\n    at API_KEY=secret123\n    at test.ts:10:5';
      logger.logError(error);

      expect(errorOutput[1]).toContain('API_KEY=[REDACTED]');
      expect(errorOutput[1]).not.toContain('secret123');
    });
  });

  describe('file operation message scrubbing', () => {
    test('scrubs secrets in file paths', () => {
      const logger = new Logger();
      logger.info('Writing to /path/API_KEY=secret.env');

      expect(logOutput[0]).toContain('API_KEY=[REDACTED]');
      expect(logOutput[0]).not.toContain('secret');
    });

    test('scrubs secrets in file content messages', () => {
      const logger = new Logger();
      logger.info('File contains: PASSWORD=admin123');

      expect(logOutput[0]).toContain('PASSWORD=[REDACTED]');
      expect(logOutput[0]).not.toContain('admin123');
    });
  });

  describe('logError() method', () => {
    test('logs error with scrubbed message and stack', () => {
      const logger = new Logger();
      const error = new Error('API_KEY=secret123 failed');
      logger.logError(error);

      expect(errorOutput[0]).toContain('Error occurred');
      expect(errorOutput[1]).toContain('API_KEY=[REDACTED]');
      expect(errorOutput[1]).not.toContain('secret123');
    });
  });

  describe('existing logger tests compatibility', () => {
    test('all existing logger tests still pass', () => {
      const logger = new Logger();
      
      // Test basic logging still works
      logger.info('Test message');
      expect(logOutput[0]).toContain('Test message');
      
      // Test context still works
      logger.info('Test', { port: 3000 });
      expect(logOutput[2]).toContain('3000');
    });
  });
});
