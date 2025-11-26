import { describe, test, expect, beforeEach } from 'bun:test';
import { scrubSecrets, scrubObject, isSecretKey, clearCache, loadUserConfig } from '../../src/utils/scrubber';

describe('scrubSecrets()', () => {
  beforeEach(() => {
    clearCache();
  });

  // Pattern type tests (10 tests)
  test('scrubs KEY=value patterns', () => {
    expect(scrubSecrets('API_KEY=secret123')).toBe('API_KEY=[REDACTED]');
    expect(scrubSecrets('PASSWORD=admin')).toBe('PASSWORD=[REDACTED]');
  });

  test('scrubs URL credentials', () => {
    expect(scrubSecrets('postgres://user:pass@localhost/db')).toBe('postgres://user:[REDACTED]@localhost/db');
    expect(scrubSecrets('https://admin:secret@example.com')).toBe('https://admin:[REDACTED]@example.com');
  });

  test('scrubs JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    expect(scrubSecrets(`Token: ${jwt}`)).toBe('Token: [REDACTED:JWT]');
  });

  test('scrubs private keys', () => {
    const key = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY-----';
    expect(scrubSecrets(key)).toBe('[REDACTED:PRIVATE_KEY]');
  });

  test('preserves key names in output', () => {
    const result = scrubSecrets('API_KEY=secret123');
    expect(result).toContain('API_KEY');
    expect(result).not.toContain('secret123');
  });

  test('returns original text if no secrets found', () => {
    expect(scrubSecrets('Hello world')).toBe('Hello world');
    expect(scrubSecrets('No secrets here')).toBe('No secrets here');
  });

  test('handles multiple secrets in one string', () => {
    const input = 'API_KEY=secret1 PASSWORD=secret2';
    const result = scrubSecrets(input);
    expect(result).toContain('API_KEY=[REDACTED]');
    expect(result).toContain('PASSWORD=[REDACTED]');
  });

  test('scrubs secrets case-insensitively', () => {
    expect(scrubSecrets('password=secret')).toBe('password=[REDACTED]');
    expect(scrubSecrets('PASSWORD=secret')).toBe('PASSWORD=[REDACTED]');
  });

  test('handles large input with length limit', () => {
    const large = 'A'.repeat(60000) + '=secret';
    const result = scrubSecrets(large);
    expect(result).toBe('[SCRUBBING_FAILED:INPUT_TOO_LARGE]');
    expect(result).not.toContain('secret');
  });

  test('uses cache for repeated inputs', () => {
    const input = 'API_KEY=secret123';
    const result1 = scrubSecrets(input);
    const result2 = scrubSecrets(input);
    expect(result1).toBe(result2);
    expect(result1).toBe('API_KEY=[REDACTED]');
  });
});

describe('scrubObject()', () => {
  // Various input tests (6 tests)
  test('scrubs simple objects', () => {
    const obj = { apiKey: 'secret', debug: true };
    const result = scrubObject(obj);
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.debug).toBe(true);
  });

  test('scrubs nested objects', () => {
    const obj = { config: { password: 'secret', port: 3000 } };
    const result = scrubObject(obj);
    expect(result.config.password).toBe('[REDACTED]');
    expect(result.config.port).toBe(3000);
  });

  test('scrubs arrays of strings', () => {
    const arr = ['API_KEY=secret', 'DEBUG=true'];
    const result = scrubObject(arr);
    expect(result[0]).toBe('API_KEY=[REDACTED]');
    expect(result[1]).toBe('DEBUG=true');
  });

  test('handles cyclic references', () => {
    const obj: any = { name: 'test' };
    obj.self = obj;
    const result = scrubObject(obj);
    expect(result.name).toBe('test');
    expect(result.self).toBe('[CIRCULAR]');
  });

  test('handles shared references (not circular)', () => {
    const shared = { password: 'secret' };
    const obj = { a: shared, b: shared };
    const result = scrubObject(obj);
    expect(result.a.password).toBe('[REDACTED]');
    expect(result.b.password).toBe('[REDACTED]');
    expect(result.b).not.toBe('[CIRCULAR]');
  });

  test('does not mutate original object', () => {
    const original = { password: 'secret' };
    const scrubbed = scrubObject(original);
    expect(original.password).toBe('secret');
    expect(scrubbed.password).toBe('[REDACTED]');
  });

  test('scrubs string values in objects', () => {
    const obj = { message: 'Error: API_KEY=secret123' };
    const result = scrubObject(obj);
    expect(result.message).toBe('Error: API_KEY=[REDACTED]');
  });
});

describe('isSecretKey()', () => {
  // Various key tests (4 tests)
  test('detects common secret keys', () => {
    expect(isSecretKey('password')).toBe(true);
    expect(isSecretKey('API_KEY')).toBe(true);
    expect(isSecretKey('token')).toBe(true);
    expect(isSecretKey('secret')).toBe(true);
  });

  test('is case-insensitive', () => {
    expect(isSecretKey('PASSWORD')).toBe(true);
    expect(isSecretKey('Api_Key')).toBe(true);
    expect(isSecretKey('TOKEN')).toBe(true);
  });

  test('detects substring matches', () => {
    expect(isSecretKey('MY_SECRET')).toBe(true);
    expect(isSecretKey('USER_PASSWORD')).toBe(true);
    expect(isSecretKey('AUTH_TOKEN')).toBe(true);
    expect(isSecretKey('PRIVATE_KEY')).toBe(true);
  });

  test('returns false for non-secrets', () => {
    expect(isSecretKey('DEBUG')).toBe(false);
    expect(isSecretKey('PORT')).toBe(false);
    expect(isSecretKey('USERNAME')).toBe(false);
    expect(isSecretKey('EMAIL')).toBe(false);
  });
});

describe('Edge cases', () => {
  // Edge case tests (3 tests)
  test('handles null and undefined', () => {
    expect(scrubSecrets(null as any)).toBe(null);
    expect(scrubSecrets(undefined as any)).toBe(undefined);
    expect(scrubObject(null as any)).toBe(null);
    expect(scrubObject(undefined as any)).toBe(undefined);
  });

  test('handles empty strings and objects', () => {
    expect(scrubSecrets('')).toBe('');
    expect(scrubObject({})).toEqual({});
    expect(scrubObject([])).toEqual([]);
  });

  test('handles non-string and non-object types', () => {
    expect(scrubObject(42 as any)).toBe(42);
    expect(scrubObject('test' as any)).toBe('test');
    expect(isSecretKey(null as any)).toBe(false);
    expect(isSecretKey('' as any)).toBe(false);
  });

  test('handles deeply nested objects', () => {
    const deep = { a: { b: { c: { d: { password: 'secret' } } } } };
    const result = scrubObject(deep);
    expect(result.a.b.c.d.password).toBe('[REDACTED]');
  });

  test('preserves non-plain objects (Date, Buffer, etc.)', () => {
    const date = new Date('2025-01-01');
    const buffer = Buffer.from('test');
    const map = new Map([['key', 'value']]);
    
    expect(scrubObject(date)).toBe(date);
    expect(scrubObject(buffer)).toBe(buffer);
    expect(scrubObject(map)).toBe(map);
    
    // In objects
    const obj = { date, buffer, map, password: 'secret' };
    const result = scrubObject(obj);
    expect(result.date).toBe(date);
    expect(result.buffer).toBe(buffer);
    expect(result.map).toBe(map);
    expect(result.password).toBe('[REDACTED]');
  });
});

describe('Whitelist filtering', () => {
  // Whitelist tests (3 tests)
  test('does not scrub whitelisted keys', () => {
    expect(scrubSecrets('DEBUG=true')).toBe('DEBUG=true');
    expect(scrubSecrets('PORT=3000')).toBe('PORT=3000');
    expect(scrubSecrets('NODE_ENV=production')).toBe('NODE_ENV=production');
    expect(scrubSecrets('SECRETS_SYNC_TIMEOUT=60000')).toBe('SECRETS_SYNC_TIMEOUT=60000');
  });

  test('does not scrub whitelisted object properties', () => {
    const obj = { debug: true, port: 3000, verbose: false, secrets_sync_timeout: 60000 };
    const result = scrubObject(obj);
    expect(result.debug).toBe(true);
    expect(result.port).toBe(3000);
    expect(result.verbose).toBe(false);
    expect(result.secrets_sync_timeout).toBe(60000);
  });

  test('scrubs secrets even if they contain whitelisted substrings', () => {
    expect(scrubSecrets('API_KEY=secret')).toBe('API_KEY=[REDACTED]');
    expect(scrubSecrets('PASSWORD=admin')).toBe('PASSWORD=[REDACTED]');
  });
});

describe('Performance', () => {
  // Performance test (1 test)
  test('scrubs in less than 1ms per call', () => {
    const iterations = 1000;
    const input = 'API_KEY=secret123 PASSWORD=admin';
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      scrubSecrets(input);
    }
    const end = performance.now();
    
    const avgTime = (end - start) / iterations;
    expect(avgTime).toBeLessThan(1);
  });
});

describe('User configuration', () => {
  beforeEach(() => {
    clearCache();
  });

  test('loads custom scrub patterns', () => {
    loadUserConfig({
      scrubbing: {
        scrubPatterns: ['CUSTOM_*']
      }
    });
    
    expect(scrubSecrets('CUSTOM_TOKEN=abc123')).toBe('CUSTOM_TOKEN=[REDACTED]');
  });

  test('loads custom whitelist patterns', () => {
    loadUserConfig({
      scrubbing: {
        whitelistPatterns: ['TEST_*']
      }
    });
    
    expect(scrubSecrets('TEST_VALUE=123')).toBe('TEST_VALUE=123');
  });
});
