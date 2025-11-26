/**
 * Integration Test: Error Sharing Workflow
 * 
 * Tests that errors can be safely shared without exposing secrets.
 * Validates US-1 acceptance criteria.
 */

import { describe, test, expect } from 'bun:test';
import { buildErrorMessage, formatContext } from '../../src/utils/errorMessages';

describe('Error Sharing Workflow (US-1)', () => {
  test('AC-1.1: Error messages contain no secret values', () => {
    const error = buildErrorMessage({
      what: 'Database connection failed with PASSWORD=admin123',
      why: 'Connection string: postgres://user:secret@localhost/db',
      howToFix: 'Check your API_KEY=sk_live_abc123'
    });
    
    // No secrets should be present
    expect(error).not.toContain('admin123');
    expect(error).not.toContain('secret');
    expect(error).not.toContain('sk_live_abc123');
    
    // Key names should be preserved for debugging
    expect(error).toContain('PASSWORD=');
    expect(error).toContain('API_KEY=');
  });

  test('AC-1.2: Key names are preserved for debugging', () => {
    const error = buildErrorMessage({
      what: 'Failed to authenticate with API_KEY=secret',
      why: 'Invalid TOKEN=xyz123',
      howToFix: 'Update your DATABASE_PASSWORD=pass'
    });
    
    expect(error).toContain('API_KEY');
    expect(error).toContain('TOKEN');
    expect(error).toContain('DATABASE_PASSWORD');
  });

  test('AC-1.3: Fix commands remain actionable', () => {
    const error = buildErrorMessage({
      what: 'Configuration error',
      why: 'Missing required settings',
      howToFix: 'Run: chmod 644 .env && export API_KEY=your_key'
    });
    
    // Commands should be present and actionable
    expect(error).toContain('chmod 644 .env');
    expect(error).toContain('export API_KEY=');
  });

  test('AC-1.4: Context objects are scrubbed', () => {
    const context = formatContext({
      apiKey: 'secret123',
      password: 'admin',
      connectionString: 'postgres://user:pass@localhost/db',
      port: 5432,
      debug: true
    });
    
    // Secrets should be redacted
    expect(context).not.toContain('secret123');
    expect(context).not.toContain('admin');
    expect(context).not.toContain('pass@localhost');
    
    // Non-secrets should be preserved
    expect(context).toContain('5432');
    expect(context).toContain('true');
  });

  test('Real-world scenario: File operation error with secrets', () => {
    const error = buildErrorMessage({
      what: 'Failed to read .env file',
      why: 'File contains: API_KEY=sk_live_123abc, DATABASE_URL=postgres://admin:password@localhost',
      howToFix: 'Fix permissions: chmod 644 .env'
    });
    
    // Should not contain any secret values
    expect(error).not.toContain('sk_live_123abc');
    expect(error).not.toContain('password@localhost');
    
    // Should contain actionable fix
    expect(error).toContain('chmod 644 .env');
  });

  test('Real-world scenario: GitHub issue sharing', () => {
    // Simulate copying error to GitHub issue
    const error = buildErrorMessage({
      what: 'secrets-sync failed with exit code 1',
      why: 'Environment: NODE_ENV=production, API_KEY=secret123, DEBUG=false',
      howToFix: 'Check logs and retry'
    });
    
    // Safe to paste in GitHub issue
    expect(error).not.toContain('secret123');
    expect(error).toContain('NODE_ENV=production');
    expect(error).toContain('DEBUG=false');
  });

  test('Users can copy-paste without manual review', () => {
    // Multiple secrets in one error
    const error = buildErrorMessage({
      what: 'Sync failed',
      why: 'Secrets found: PASSWORD=admin, TOKEN=xyz, API_KEY=abc',
      howToFix: 'Update configuration'
    });
    
    // All secrets should be automatically scrubbed
    expect(error).not.toContain('admin');
    expect(error).not.toContain('xyz');
    expect(error).not.toContain('abc');
    
    // Error is safe to share immediately
    expect(error).toContain('[REDACTED]');
  });
});
