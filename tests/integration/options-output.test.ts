import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'bun';

describe('Options Table Output', () => {
  test('options table shows skipSecrets value', () => {
    const result = spawnSync(['bun', 'run', 'dev', '--', '--dry-run'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    
    const output = result.stdout.toString();
    expect(output).not.toContain('skipSecrets: [REDACTED]');
  });

  test('options table shows all CLI flags', () => {
    const result = spawnSync(['bun', 'run', 'dev', '--', '--env', 'staging', '--overwrite', '--dry-run'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    
    const output = result.stdout.toString();
    expect(output).toContain('staging');
    expect(output).not.toContain('env: [REDACTED]');
    expect(output).not.toContain('overwrite: [REDACTED]');
  });

  test('no [REDACTED] in options output', () => {
    const result = spawnSync(['bun', 'run', 'dev', '--', '--dry-run'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    
    const output = result.stdout.toString();
    const lines = output.split('\n');
    
    // Check lines before "Audit Summary" (options section)
    const auditIndex = lines.findIndex(line => line.includes('Audit Summary'));
    const optionsSection = lines.slice(0, auditIndex > 0 ? auditIndex : lines.length).join('\n');
    
    // Options section should not have [REDACTED] for config fields
    expect(optionsSection).not.toMatch(/skipSecrets.*\[REDACTED\]/);
    expect(optionsSection).not.toMatch(/env.*\[REDACTED\]/);
    expect(optionsSection).not.toMatch(/dir.*\[REDACTED\]/);
  });

  test('with multiple configuration values', () => {
    const result = spawnSync(['bun', 'run', 'dev', '--', '--env', 'production', '--dir', 'config/env', '--dry-run'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    
    const output = result.stdout.toString();
    expect(output).toContain('production');
    expect(output).toContain('config/env');
    expect(output).not.toContain('[REDACTED]');
  });
});
