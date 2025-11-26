import { describe, test, expect } from 'bun:test';
import { scrubObject } from '../../src/utils/scrubber';

describe('Bootstrap compatibility', () => {
  test('scrubObject preserves Date objects', () => {
    const date = new Date('2025-01-01T00:00:00Z');
    const result = scrubObject(date);
    expect(result).toBe(date);
    expect(result instanceof Date).toBe(true);
  });

  test('scrubObject preserves Buffer objects', () => {
    const buffer = Buffer.from('test');
    const result = scrubObject(buffer);
    expect(result).toBe(buffer);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test('scrubObject preserves Map objects', () => {
    const map = new Map([['key', 'value']]);
    const result = scrubObject(map);
    expect(result).toBe(map);
    expect(result instanceof Map).toBe(true);
  });

  test('scrubObject preserves Set objects', () => {
    const set = new Set([1, 2, 3]);
    const result = scrubObject(set);
    expect(result).toBe(set);
    expect(result instanceof Set).toBe(true);
  });

  test('scrubObject scrubs custom class instances', () => {
    class Credentials {
      message = 'API_KEY=secret123';
      password = 'admin';
      port = 3000;
    }
    const creds = new Credentials();
    const result = scrubObject(creds);
    
    // Should scrub the secret fields
    expect(result.message).toBe('API_KEY=[REDACTED]');
    expect(result.password).toBe('[REDACTED]');
    expect(result.port).toBe(3000);
  });

  test('scrubObject still scrubs plain objects', () => {
    const obj = { password: 'secret', port: 3000 };
    const result = scrubObject(obj);
    expect(result.password).toBe('[REDACTED]');
    expect(result.port).toBe(3000);
  });

  test('scrubObject handles mixed types in plain objects', () => {
    const date = new Date('2025-01-01');
    const buffer = Buffer.from('test');
    const obj = { date, buffer, password: 'secret' };
    const result = scrubObject(obj);
    
    expect(result.date).toBe(date);
    expect(result.buffer).toBe(buffer);
    expect(result.password).toBe('[REDACTED]');
  });
});
