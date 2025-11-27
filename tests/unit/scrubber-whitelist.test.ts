import { describe, test, expect } from 'bun:test';
import { isSecretKey } from '../../src/utils/scrubber';

describe('Scrubber Whitelist', () => {
  test('skipsecrets is whitelisted', () => {
    expect(isSecretKey('skipsecrets')).toBe(false);
  });

  test('syncitemname is whitelisted (internal audit field)', () => {
    expect(isSecretKey('syncitemname')).toBe(false);
  });

  test('itemsource is whitelisted (internal audit field)', () => {
    expect(isSecretKey('itemsource')).toBe(false);
  });

  test('API_KEY is detected as secret', () => {
    expect(isSecretKey('API_KEY')).toBe(true);
  });

  test('SECRET_KEY is detected as secret', () => {
    expect(isSecretKey('SECRET_KEY')).toBe(true);
  });

  test('password is detected as secret', () => {
    expect(isSecretKey('password')).toBe(true);
  });

  test('generic "key" is detected as secret', () => {
    expect(isSecretKey('key')).toBe(true);
  });

  test('generic "name" with secret context is detected', () => {
    expect(isSecretKey('secret_name')).toBe(true);
  });

  test('case-insensitive matching works', () => {
    expect(isSecretKey('SKIPSECRETS')).toBe(false);
    expect(isSecretKey('SkipSecrets')).toBe(false);
    expect(isSecretKey('PASSWORD')).toBe(true);
    expect(isSecretKey('Password')).toBe(true);
  });
});
