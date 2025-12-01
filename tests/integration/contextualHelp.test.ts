import { describe, test, expect, beforeAll } from 'bun:test';
import { join } from 'path';

const CLI_PATH = join(import.meta.dir, '../../dist/secrets-sync.js');

describe('Contextual Help Integration', () => {
  beforeAll(async () => {
    // Ensure CLI is built before running tests
    const buildProc = Bun.spawnSync(['bun', 'run', 'build']);
    if (buildProc.exitCode !== 0) {
      throw new Error('Failed to build CLI for tests');
    }
  });

  test('--force --help displays correct output', async () => {
    const proc = Bun.spawn(['bun', 'run', CLI_PATH, '--force', '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(output).toContain('🔐 Help: --force');
    expect(output).toContain('Use prefixes for production files');
    expect(output).toContain('Usage:');
    expect(output).toContain('When to use:');
    expect(output).toContain('Related flags:');
    expect(output).toContain('Documentation:');
    expect(stderr).toBe('');
    expect(proc.exitCode).toBe(0);
  });

  test('no warnings or errors in stderr for valid flag', async () => {
    const proc = Bun.spawn(['bun', 'run', CLI_PATH, '--env', '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(stderr).toBe('');
  });

  test('exit code is 0 for valid flag help', async () => {
    const proc = Bun.spawn(['bun', 'run', CLI_PATH, '--dry-run', '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);
  });

  test('invalid flag shows error', async () => {
    const proc = Bun.spawn(['bun', 'run', CLI_PATH, '--invalid-flag', '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(stderr).toContain('Error: Unknown flag');
    expect(proc.exitCode).toBe(1);
  });

  test('config loading is skipped for contextual help', async () => {
    const proc = Bun.spawn(['bun', 'run', CLI_PATH, '--force', '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    // Should not contain config loading messages
    expect(output).not.toContain('Loaded required secrets');
    expect(output).not.toContain('Parsed options');
    expect(stderr).toBe('');
  });

  test('short flag alias works correctly', async () => {
    const proc = Bun.spawn(['bun', 'run', CLI_PATH, '-f', '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    expect(output).toContain('🔐 Help: --force');
    expect(proc.exitCode).toBe(0);
  });

  test('all documented flags have working help', async () => {
    const flags = [
      '--env', '--dir', '--dry-run', '--overwrite', '--skip-unchanged',
      '--force', '--no-confirm', '--fix-gitignore', '--verbose',
      '--help', '--version'
    ];

    for (const flag of flags) {
      const proc = Bun.spawn(['bun', 'run', CLI_PATH, flag, '--help'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      await proc.exited;

      expect(output).toContain('🔐 Help:');
      expect(stderr).toBe('');
      expect(proc.exitCode).toBe(0);
    }
  });
});
