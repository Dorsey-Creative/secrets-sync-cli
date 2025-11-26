import { describe, test, expect } from 'bun:test';
import {
  getMessage,
  buildErrorMessage,
  formatContext,
  formatDependencyError,
  formatPermissionError,
  formatTimeoutError,
} from '../../src/utils/errorMessages';
import { DependencyError, PermissionError, TimeoutError } from '../../src/utils/errors';

describe('getMessage', () => {
  test('loads message from catalog', () => {
    const msg = getMessage('ERR_DEPENDENCY_MISSING', {
      dependency: 'gh',
      installUrl: 'https://cli.github.com',
    });
    
    expect(msg.what).toContain('gh');
    expect(msg.why).toContain('gh');
    expect(msg.howToFix).toContain('https://cli.github.com');
  });

  test('interpolates context placeholders', () => {
    const msg = getMessage('ERR_NODE_VERSION', {
      currentVersion: '16.0.0',
      requiredVersion: '18.0.0',
    });
    
    expect(msg.what).toContain('16.0.0');
    expect(msg.why).toContain('18.0.0');
  });

  test('handles conditional sections when value present', () => {
    const msg = getMessage('ERR_DEPENDENCY_MISSING', {
      dependency: 'gh',
      installUrl: 'https://cli.github.com',
      installCommand: 'brew install gh',
    });
    
    expect(msg.howToFix).toContain('brew install gh');
  });

  test('handles conditional sections when value absent', () => {
    const msg = getMessage('ERR_DEPENDENCY_MISSING', {
      dependency: 'gh',
      installUrl: 'https://cli.github.com',
    });
    
    expect(msg.howToFix).not.toContain('Or run:');
  });

  test('throws on unknown error code', () => {
    expect(() => getMessage('INVALID_CODE' as any, {})).toThrow('Unknown error code');
  });
});

describe('buildErrorMessage', () => {
  test('formats message with colors', () => {
    const msg = {
      what: 'Test failed',
      why: 'Because reasons',
      howToFix: 'Do this',
    };
    
    const formatted = buildErrorMessage(msg);
    
    expect(formatted).toContain('❌');
    expect(formatted).toContain('Test failed');
    expect(formatted).toContain('Because reasons');
    expect(formatted).toContain('Do this');
  });

  test('includes ANSI color codes', () => {
    const msg = {
      what: 'Test failed',
      why: 'Because reasons',
      howToFix: 'Do this',
    };
    
    const formatted = buildErrorMessage(msg);
    
    expect(formatted).toContain('\x1b[31m'); // Red
    expect(formatted).toContain('\x1b[36m'); // Cyan
    expect(formatted).toContain('\x1b[0m');  // Reset
  });

  test('formats multi-line messages correctly', () => {
    const msg = {
      what: 'Test failed',
      why: 'Because reasons',
      howToFix: 'Step 1\nStep 2\nStep 3',
    };
    
    const formatted = buildErrorMessage(msg);
    const lines = formatted.split('\n');
    
    expect(lines.length).toBeGreaterThan(3);
  });
});

describe('formatContext', () => {
  test('formats empty context', () => {
    const formatted = formatContext({});
    expect(formatted).toBe('');
  });

  test('formats context with single value', () => {
    const formatted = formatContext({ file: 'test.txt' });
    expect(formatted).toContain('Context:');
    expect(formatted).toContain('test.txt');
  });

  test('formats context with multiple values', () => {
    const formatted = formatContext({ file: 'test.txt', line: 42 });
    expect(formatted).toContain('test.txt');
    expect(formatted).toContain('42');
  });

  test('includes ANSI color codes', () => {
    const formatted = formatContext({ file: 'test.txt' });
    expect(formatted).toContain('\x1b[33m'); // Yellow
    expect(formatted).toContain('\x1b[0m');  // Reset
  });
});

describe('formatDependencyError', () => {
  test('formats error with install command', () => {
    const error = new DependencyError('gh', 'https://cli.github.com', 'brew install gh');
    const formatted = formatDependencyError(error);
    
    expect(formatted).toContain('gh');
    expect(formatted).toContain('https://cli.github.com');
    expect(formatted).toContain('brew install gh');
  });

  test('formats error without install command', () => {
    const error = new DependencyError('gh', 'https://cli.github.com');
    const formatted = formatDependencyError(error);
    
    expect(formatted).toContain('gh');
    expect(formatted).toContain('https://cli.github.com');
    expect(formatted).not.toContain('Or run:');
  });

  test('includes error indicator', () => {
    const error = new DependencyError('gh', 'https://cli.github.com');
    const formatted = formatDependencyError(error);
    
    expect(formatted).toContain('❌');
  });
});

describe('formatPermissionError', () => {
  test('formats read permission error', () => {
    const error = new PermissionError('/path/to/file', 'read', 'chmod 644 /path/to/file');
    const formatted = formatPermissionError(error);
    
    expect(formatted).toContain('/path/to/file');
    expect(formatted).toContain('chmod 644 /path/to/file');
    expect(formatted).toContain('read');
  });

  test('formats write permission error', () => {
    const error = new PermissionError('/path/to/file', 'write', 'chmod 755 /path/to/dir');
    const formatted = formatPermissionError(error);
    
    expect(formatted).toContain('/path/to/file');
    expect(formatted).toContain('chmod 755 /path/to/dir');
    expect(formatted).toContain('write');
  });

  test('includes error indicator', () => {
    const error = new PermissionError('/path/to/file', 'read', 'chmod 644 /path/to/file');
    const formatted = formatPermissionError(error);
    
    expect(formatted).toContain('❌');
  });
});

describe('formatTimeoutError', () => {
  test('formats timeout error with seconds', () => {
    const error = new TimeoutError('GitHub API call', 30000);
    const formatted = formatTimeoutError(error);
    
    expect(formatted).toContain('30s');
    expect(formatted).toContain('GitHub API call');
  });

  test('suggests doubled timeout', () => {
    const error = new TimeoutError('GitHub API call', 30000);
    const formatted = formatTimeoutError(error);
    
    expect(formatted).toContain('60000');
  });

  test('includes troubleshooting suggestions', () => {
    const error = new TimeoutError('GitHub API call', 30000);
    const formatted = formatTimeoutError(error);
    
    expect(formatted).toContain('internet connection');
    expect(formatted).toContain('Try again');
    expect(formatted).toContain('SECRETS_SYNC_TIMEOUT');
  });

  test('includes error indicator', () => {
    const error = new TimeoutError('GitHub API call', 30000);
    const formatted = formatTimeoutError(error);
    
    expect(formatted).toContain('❌');
  });
});
