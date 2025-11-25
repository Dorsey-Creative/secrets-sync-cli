import { describe, test, expect } from 'bun:test';
import {
  AppError,
  DependencyError,
  PermissionError,
  TimeoutError,
  ValidationError,
} from '../../src/utils/errors';

describe('AppError', () => {
  test('creates error with message', () => {
    const error = new AppError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('AppError');
  });

  test('creates error with context', () => {
    const context = { file: 'test.txt', line: 42 };
    const error = new AppError('Test error', context);
    expect(error.context).toEqual(context);
  });

  test('extends Error', () => {
    const error = new AppError('Test error');
    expect(error).toBeInstanceOf(Error);
  });

  test('captures stack trace', () => {
    const error = new AppError('Test error');
    expect(error.stack).toBeDefined();
  });
});

describe('DependencyError', () => {
  test('creates error with dependency info', () => {
    const error = new DependencyError('gh', 'https://cli.github.com', 'brew install gh');
    expect(error.message).toBe('Missing dependency: gh');
    expect(error.dependency).toBe('gh');
    expect(error.installUrl).toBe('https://cli.github.com');
    expect(error.installCommand).toBe('brew install gh');
  });

  test('creates error without install command', () => {
    const error = new DependencyError('gh', 'https://cli.github.com');
    expect(error.installCommand).toBeUndefined();
  });

  test('extends AppError', () => {
    const error = new DependencyError('gh', 'https://cli.github.com');
    expect(error).toBeInstanceOf(AppError);
  });

  test('has correct name', () => {
    const error = new DependencyError('gh', 'https://cli.github.com');
    expect(error.name).toBe('DependencyError');
  });
});

describe('PermissionError', () => {
  test('creates error for read operation', () => {
    const error = new PermissionError('/path/to/file', 'read', 'chmod 644 /path/to/file');
    expect(error.message).toBe('Permission denied: cannot read /path/to/file');
    expect(error.path).toBe('/path/to/file');
    expect(error.operation).toBe('read');
    expect(error.fixCommand).toBe('chmod 644 /path/to/file');
  });

  test('creates error for write operation', () => {
    const error = new PermissionError('/path/to/file', 'write', 'chmod 755 /path/to/dir');
    expect(error.message).toBe('Permission denied: cannot write /path/to/file');
    expect(error.operation).toBe('write');
  });

  test('extends AppError', () => {
    const error = new PermissionError('/path/to/file', 'read', 'chmod 644 /path/to/file');
    expect(error).toBeInstanceOf(AppError);
  });

  test('has correct name', () => {
    const error = new PermissionError('/path/to/file', 'read', 'chmod 644 /path/to/file');
    expect(error.name).toBe('PermissionError');
  });
});

describe('TimeoutError', () => {
  test('creates error with timeout info', () => {
    const error = new TimeoutError('GitHub API call', 30000);
    expect(error.message).toBe('Operation timed out after 30000ms: GitHub API call');
    expect(error.operation).toBe('GitHub API call');
    expect(error.timeoutMs).toBe(30000);
  });

  test('extends AppError', () => {
    const error = new TimeoutError('GitHub API call', 30000);
    expect(error).toBeInstanceOf(AppError);
  });

  test('has correct name', () => {
    const error = new TimeoutError('GitHub API call', 30000);
    expect(error.name).toBe('TimeoutError');
  });
});

describe('ValidationError', () => {
  test('creates error with message only', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.field).toBeUndefined();
    expect(error.value).toBeUndefined();
  });

  test('creates error with field', () => {
    const error = new ValidationError('Invalid email', 'email');
    expect(error.field).toBe('email');
  });

  test('creates error with field and value', () => {
    const error = new ValidationError('Invalid email', 'email', 'not-an-email');
    expect(error.field).toBe('email');
    expect(error.value).toBe('not-an-email');
  });

  test('extends AppError', () => {
    const error = new ValidationError('Invalid input');
    expect(error).toBeInstanceOf(AppError);
  });

  test('has correct name', () => {
    const error = new ValidationError('Invalid input');
    expect(error.name).toBe('ValidationError');
  });
});
