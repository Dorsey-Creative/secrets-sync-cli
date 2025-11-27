import { describe, test, expect } from 'bun:test';
import { join } from 'path';

const CLI_PATH = join(import.meta.dir, '../../dist/secrets-sync.js');

describe('Logger Output Deduplication', () => {
  test('no duplicate log entries in full CLI run', async () => {
    const proc = Bun.spawn([
      'bun',
      'run',
      CLI_PATH,
      '--dry-run',
      '--help'
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    const lines = output.split('\n').filter(line => line.trim());
    
    // Check for duplicate consecutive lines
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i]).not.toBe(lines[i - 1]);
    }
    
    await proc.exited;
  });

  test('warning messages appear exactly once', async () => {
    const proc = Bun.spawn([
      'bun',
      'run',
      CLI_PATH,
      '--dry-run'
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const output = stdout + stderr;
    
    // Count occurrences of specific warning patterns
    const warnMatches = output.match(/\[WARN\]/g);
    const warnCount = warnMatches ? warnMatches.length : 0;
    
    // Each unique warning should appear only once
    const uniqueWarnings = new Set(
      output.split('\n')
        .filter(line => line.includes('[WARN]'))
        .map(line => line.replace(/\[.*?\]/g, '').trim())
    );
    
    expect(uniqueWarnings.size).toBe(warnCount);
    
    await proc.exited;
  });

  test('info messages appear exactly once', async () => {
    const proc = Bun.spawn([
      'bun',
      'run',
      CLI_PATH,
      '--dry-run'
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const output = stdout + stderr;
    
    // Count occurrences of specific info patterns
    const infoMatches = output.match(/\[INFO\]/g);
    const infoCount = infoMatches ? infoMatches.length : 0;
    
    // Each unique info message should appear only once
    const uniqueInfos = new Set(
      output.split('\n')
        .filter(line => line.includes('[INFO]'))
        .map(line => line.replace(/\[.*?\]/g, '').trim())
    );
    
    expect(uniqueInfos.size).toBe(infoCount);
    
    await proc.exited;
  });

  test('error messages appear exactly once', async () => {
    const proc = Bun.spawn([
      'bun',
      'run',
      CLI_PATH,
      '--env',
      'nonexistent'
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const output = stdout + stderr;
    
    // Count occurrences of specific error patterns
    const errorMatches = output.match(/\[ERROR\]/g);
    const errorCount = errorMatches ? errorMatches.length : 0;
    
    // Each unique error message should appear only once
    const uniqueErrors = new Set(
      output.split('\n')
        .filter(line => line.includes('[ERROR]'))
        .map(line => line.replace(/\[.*?\]/g, '').trim())
    );
    
    expect(uniqueErrors.size).toBe(errorCount);
    
    await proc.exited;
  });
});
