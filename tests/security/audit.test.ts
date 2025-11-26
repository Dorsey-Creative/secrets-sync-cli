/**
 * Security Audit Tests
 * Validates that secrets never leak through any output channel
 */

import { describe, test, expect } from 'bun:test';
import { scrubSecrets, scrubObject } from '../../src/utils/scrubber';

describe('Security Audit', () => {
  const secrets = {
    apiKey: 'sk_live_secret123',
    password: 'supersecret',
    token: 'ghp_token456',
    dbPassword: 'dbpass',
    jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
    privateKey: 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC',
  };

  test('KEY=value secrets are scrubbed', () => {
    const result = scrubSecrets('API_KEY=sk_live_secret123');
    expect(result).not.toContain('sk_live_secret123');
    expect(result).toContain('[REDACTED]');
  });

  test('URL credentials are scrubbed', () => {
    const result = scrubSecrets('postgres://admin:dbpass@localhost/db');
    expect(result).not.toContain('dbpass');
    expect(result).toContain('[REDACTED]');
  });

  test('JWT tokens are scrubbed', () => {
    const result = scrubSecrets(secrets.jwt);
    expect(result).not.toContain(secrets.jwt);
    expect(result).toContain('[REDACTED:JWT]');
  });

  test('private keys are scrubbed', () => {
    const key = `-----BEGIN PRIVATE KEY-----\n${secrets.privateKey}\n-----END PRIVATE KEY-----`;
    const result = scrubSecrets(key);
    expect(result).not.toContain(secrets.privateKey);
    expect(result).toContain('[REDACTED:PRIVATE_KEY]');
  });

  test('object secrets are scrubbed', () => {
    const obj = {
      apiKey: secrets.apiKey,
      password: secrets.password,
      port: 3000,
    };
    const result = scrubObject(obj);
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.password).toBe('[REDACTED]');
    expect(result.port).toBe(3000);
  });

  test('nested object secrets are scrubbed', () => {
    const obj = {
      config: {
        settings: {
          apiToken: secrets.token,
          verbose: true,
        },
      },
    };
    const result = scrubObject(obj);
    // Token value is scrubbed
    expect(result.config.settings.apiToken).toBe('[REDACTED]');
    expect(result.config.settings.verbose).toBe(true);
  });

  test('array strings are scrubbed', () => {
    const arr = ['API_KEY=sk_live_secret123', 'PORT=3000'];
    const result = scrubObject(arr);
    expect(result[0]).not.toContain('sk_live_secret123');
    expect(result[0]).toContain('[REDACTED]');
    expect(result[1]).toContain('PORT=3000');
  });

  test('all secret types are detected', () => {
    const text = `
      API_KEY=sk_live_secret123
      PASSWORD=supersecret
      TOKEN=ghp_token456
      DATABASE_URL=postgres://admin:dbpass@localhost/db
      JWT=${secrets.jwt}
      PORT=3000
    `;
    const result = scrubSecrets(text);
    
    // All secrets should be scrubbed
    expect(result).not.toContain('sk_live_secret123');
    expect(result).not.toContain('supersecret');
    expect(result).not.toContain('ghp_token456');
    expect(result).not.toContain('dbpass');
    expect(result).not.toContain(secrets.jwt);
    
    // Non-secrets preserved
    expect(result).toContain('PORT=3000');
  });

  test('scrubbing cannot be bypassed', () => {
    // Try to bypass with various techniques
    const attempts = [
      'API_KEY=secret123',
      'api_key=secret123',
      'ApiKey=secret123',
      'API-KEY=secret123',
    ];

    attempts.forEach(attempt => {
      const result = scrubSecrets(attempt);
      expect(result).not.toContain('secret123');
    });
  });

  test('whitelisted keys are not scrubbed', () => {
    const text = 'DEBUG=true PORT=3000 NODE_ENV=production';
    const result = scrubSecrets(text);
    expect(result).toBe(text); // Should be unchanged
  });
});
