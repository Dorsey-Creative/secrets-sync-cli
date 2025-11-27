/**
 * Integration Tests: Logger Scrubbing
 * 
 * Tests that bootstrap.ts stream interception scrubs secrets from logger output.
 * Bootstrap must be imported FIRST to intercept streams before tests run.
 */

import '../../src/bootstrap';
import { describe, test, expect } from 'bun:test';
import { Logger } from '../../src/utils/logger';
import { scrubSecrets } from '../../src/utils/scrubber';

describe('Logger Scrubbing Integration', () => {
  // These tests verify that secrets are scrubbed by checking the scrubber directly
  // since bootstrap intercepts at stream level (tested in E2E tests)
  
  describe('scrubber integration', () => {
    test('scrubs KEY=value secrets', () => {
      const input = 'Failed: API_KEY=secret123';
      const output = scrubSecrets(input);
      
      expect(output).toContain('API_KEY=[REDACTED]');
      expect(output).not.toContain('secret123');
    });

    test('scrubs URL credentials', () => {
      const input = 'Connection: postgres://user:password@localhost/db';
      const output = scrubSecrets(input);
      
      expect(output).toContain('postgres://user:[REDACTED]@localhost/db');
      expect(output).not.toContain('password');
    });

    test('scrubs JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const input = `Token: ${jwt}`;
      const output = scrubSecrets(input);
      
      expect(output).toContain('[REDACTED:JWT]');
      expect(output).not.toContain(jwt);
    });

    test('scrubs PASSWORD= patterns', () => {
      const input = 'Debug: PASSWORD=secret123';
      const output = scrubSecrets(input);
      
      expect(output).toContain('PASSWORD=[REDACTED]');
      expect(output).not.toContain('secret123');
    });

    test('scrubs secrets in error messages', () => {
      const input = 'Failed with API_KEY=secret123';
      const output = scrubSecrets(input);
      
      expect(output).toContain('API_KEY=[REDACTED]');
      expect(output).not.toContain('secret123');
    });

    test('scrubs secrets in stack traces', () => {
      const input = 'Error: Failed\n    at API_KEY=secret123\n    at test.ts:10:5';
      const output = scrubSecrets(input);
      
      expect(output).toContain('API_KEY=[REDACTED]');
      expect(output).not.toContain('secret123');
    });

    test('scrubs secrets in file paths', () => {
      const input = 'Writing to /path/API_KEY=secret.env';
      const output = scrubSecrets(input);
      
      expect(output).toContain('API_KEY=[REDACTED]');
      expect(output).not.toContain('secret');
    });

    test('scrubs secrets in file content messages', () => {
      const input = 'File contains: PASSWORD=admin123';
      const output = scrubSecrets(input);
      
      expect(output).toContain('PASSWORD=[REDACTED]');
      expect(output).not.toContain('admin123');
    });
  });

  describe('logger functionality', () => {
    test('logger can be instantiated', () => {
      const logger = new Logger();
      expect(logger).toBeDefined();
    });

    test('logger accepts verbose option', () => {
      const logger = new Logger({ verbose: true });
      expect(logger).toBeDefined();
    });
  });
});
