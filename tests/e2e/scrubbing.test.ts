/**
 * E2E Tests: Secret Scrubbing
 * Tests complete user journeys with secret scrubbing
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const TEST_DIR = join(process.cwd(), 'test-e2e-scrubbing');
const CLI_PATH = join(process.cwd(), 'dist/secrets-sync.js');

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe('E2E: Secret Scrubbing', () => {
  test('error messages scrub secrets', () => {
    const envDir = join(TEST_DIR, 'config/env');
    mkdirSync(envDir, { recursive: true });

    // Create .env with secret
    writeFileSync(join(envDir, '.env'), 'API_KEY=sk_live_secret123\nDATABASE_URL=postgres://user:password@localhost/db');

    // Run CLI with invalid env (will error)
    const result = spawnSync('node', [CLI_PATH, '--env', 'nonexistent', '--dir', envDir], {
      cwd: TEST_DIR,
      encoding: 'utf-8',
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1' }
    });

    const output = result.stdout + result.stderr;

    // Verify secret VALUES are scrubbed (not shown in output)
    expect(output).not.toContain('sk_live_secret123');
    expect(output).not.toContain('password');
    
    // Key names should be visible (whitelisted)
    expect(output).toContain('API_KEY');
    expect(output).toContain('DATABASE_URL');
  });

  test('verbose mode scrubs secrets', () => {
    const envDir = join(TEST_DIR, 'config/env');
    mkdirSync(envDir, { recursive: true });

    // Create .env with secret
    writeFileSync(join(envDir, '.env'), 'API_KEY=secret123\nPORT=3000');

    // Run CLI in verbose mode
    const result = spawnSync('node', [CLI_PATH, '--verbose', '--dry-run', '--dir', envDir], {
      cwd: TEST_DIR,
      encoding: 'utf-8',
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1', SKIP_GITIGNORE_CHECK: '1' }
    });

    const output = result.stdout + result.stderr;

    // Verify secrets are scrubbed in verbose output
    expect(output).not.toContain('secret123');
    // PORT should not be scrubbed (whitelisted)
    expect(output).toContain('PORT');
  });

  test('CI environment scrubs secrets', () => {
    const envDir = join(TEST_DIR, 'config/env');
    mkdirSync(envDir, { recursive: true });

    // Create .env with secret
    writeFileSync(join(envDir, '.env'), 'TOKEN=ghp_secret123\nDEBUG=true');

    // Run CLI in CI mode (skip dependency check)
    const result = spawnSync('node', [CLI_PATH, '--dry-run', '--dir', envDir], {
      cwd: TEST_DIR,
      encoding: 'utf-8',
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1', SKIP_GITIGNORE_CHECK: '1', CI: 'true' }
    });

    const output = result.stdout + result.stderr;

    // Verify secrets are scrubbed in CI logs
    expect(output).not.toContain('ghp_secret123');
    expect(result.status).toBe(0);
  });

  test('.gitignore warning workflow', () => {
    const envDir = join(TEST_DIR, 'config/env');
    mkdirSync(envDir, { recursive: true });

    // Create .env without .gitignore
    writeFileSync(join(envDir, '.env'), 'API_KEY=secret');

    // Run CLI (should show warning)
    const result = spawnSync('node', [CLI_PATH, '--dry-run', '--dir', envDir], {
      cwd: TEST_DIR,
      encoding: 'utf-8',
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1' }
    });

    const output = result.stdout + result.stderr;

    // Verify warning is shown
    expect(output).toContain('Security Warning');
    expect(output).toContain('.gitignore');
    expect(output).toContain('--fix-gitignore');
  });

  test('no .gitignore warning when valid', () => {
    const envDir = join(TEST_DIR, 'config/env');
    mkdirSync(envDir, { recursive: true });

    // Create .env and valid .gitignore
    writeFileSync(join(envDir, '.env'), 'API_KEY=secret');
    writeFileSync(join(TEST_DIR, '.gitignore'), '.env\n.env.*\n!.env.example\n**/bak/\n*.bak');

    // Run CLI (should NOT show warning)
    const result = spawnSync('node', [CLI_PATH, '--dry-run', '--dir', envDir], {
      cwd: TEST_DIR,
      encoding: 'utf-8',
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1' }
    });

    const output = result.stdout + result.stderr;

    // Verify no warning
    expect(output).not.toContain('Security Warning');
  });

  test('--fix-gitignore end-to-end', () => {
    const envDir = join(TEST_DIR, 'config/env');
    mkdirSync(envDir, { recursive: true });

    // Create .env without .gitignore
    writeFileSync(join(envDir, '.env'), 'API_KEY=secret');

    // Run --fix-gitignore
    const result = spawnSync('node', [CLI_PATH, '--fix-gitignore'], {
      cwd: TEST_DIR,
      encoding: 'utf-8',
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1' }
    });

    const output = result.stdout + result.stderr;

    // Verify patterns were added
    expect(output).toContain('Added');
    expect(output).toContain('.env');
    expect(result.status).toBe(0);

    // Verify .gitignore was created
    expect(existsSync(join(TEST_DIR, '.gitignore'))).toBe(true);
  });

  test('skip .gitignore check with env var', () => {
    const envDir = join(TEST_DIR, 'config/env');
    mkdirSync(envDir, { recursive: true });

    // Create .env without .gitignore
    writeFileSync(join(envDir, '.env'), 'API_KEY=secret');

    // Run CLI with SKIP_GITIGNORE_CHECK
    const result = spawnSync('node', [CLI_PATH, '--dry-run', '--dir', envDir], {
      cwd: TEST_DIR,
      encoding: 'utf-8',
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1', SKIP_GITIGNORE_CHECK: '1' }
    });

    const output = result.stdout + result.stderr;

    // Verify no warning
    expect(output).not.toContain('Security Warning');
  });

  test('complete error flow with secrets', () => {
    const envDir = join(TEST_DIR, 'config/env');
    mkdirSync(envDir, { recursive: true });

    // Create .env with multiple secret types
    writeFileSync(join(envDir, '.env'), `
API_KEY=sk_live_abc123
DATABASE_URL=postgres://admin:supersecret@localhost/db
JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC
-----END PRIVATE KEY-----
PORT=3000
DEBUG=true
`);

    // Run CLI with error (invalid env)
    const result = spawnSync('node', [CLI_PATH, '--env', 'invalid', '--verbose', '--dir', envDir], {
      cwd: TEST_DIR,
      encoding: 'utf-8',
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1', SKIP_GITIGNORE_CHECK: '1' }
    });

    const output = result.stdout + result.stderr;

    // Verify ALL secret types are scrubbed
    expect(output).not.toContain('sk_live_abc123');
    expect(output).not.toContain('supersecret');
    expect(output).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature');
    expect(output).not.toContain('MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC');

    // Verify non-secrets are preserved
    expect(output).toContain('PORT');
    expect(output).toContain('DEBUG');
  });
});
