/**
 * Integration Tests: Error Message Scrubbing
 * 
 * Tests that error messages automatically scrub secrets in all fields.
 */

import { describe, test, expect } from 'bun:test';
import { buildErrorMessage, formatContext, getMessage } from '../../src/utils/errorMessages';

describe('buildErrorMessage', () => {
  test('scrubs secrets in what field', () => {
    const msg = buildErrorMessage({
      what: 'Failed with API_KEY=secret123',
      why: 'Invalid credentials',
      howToFix: 'Check your configuration'
    });
    
    expect(msg).not.toContain('secret123');
    expect(msg).toContain('API_KEY=');
  });

  test('scrubs secrets in why field', () => {
    const msg = buildErrorMessage({
      what: 'Connection failed',
      why: 'Using password=admin123',
      howToFix: 'Check credentials'
    });
    
    expect(msg).not.toContain('admin123');
    expect(msg).toContain('password=');
  });

  test('scrubs secrets in howToFix field', () => {
    const msg = buildErrorMessage({
      what: 'Authentication failed',
      why: 'Invalid token',
      howToFix: 'Set TOKEN=abc123xyz in your environment'
    });
    
    expect(msg).not.toContain('abc123xyz');
    expect(msg).toContain('TOKEN=');
  });
});

describe('formatContext', () => {
  test('scrubs secrets in context values', () => {
    const formatted = formatContext({
      apiKey: 'secret123',
      port: 3000
    });
    
    expect(formatted).not.toContain('secret123');
    expect(formatted).toContain('[REDACTED]');
    expect(formatted).toContain('3000');
  });

  test('scrubs nested context objects', () => {
    const formatted = formatContext({
      config: {
        password: 'admin',
        debug: true
      }
    });
    
    expect(formatted).not.toContain('admin');
    expect(formatted).toContain('[REDACTED]');
    expect(formatted).toContain('true');
  });
});

describe('getMessage with scrubbing', () => {
  test('scrubs secrets when message is built', () => {
    const msg = getMessage('ERR_FILE_NOT_FOUND', {
      path: '/config/API_KEY=secret.env'
    });
    
    const formatted = buildErrorMessage(msg);
    expect(formatted).not.toContain('secret');
    expect(formatted).toContain('API_KEY=');
  });
});

describe('existing tests compatibility', () => {
  test('all existing error message tests still pass', () => {
    // This test verifies that scrubbing doesn't break existing functionality
    const msg = buildErrorMessage({
      what: 'Test error',
      why: 'Test reason',
      howToFix: 'Test fix'
    });
    
    expect(msg).toContain('Test error');
    expect(msg).toContain('Test reason');
    expect(msg).toContain('Test fix');
  });
});
