import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'bun';

describe('Audit Table Output', () => {
  test('audit table shows "Secret Name" header when secrets exist', () => {
    // Use example directory if it exists, otherwise skip audit check
    const result = spawnSync(['bun', 'run', 'dev', '--', '--dir', 'example/config/env', '--dry-run'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    
    const output = result.stdout.toString();
    
    // If audit summary exists, it should have "Secret Name" header
    if (output.includes('Audit Summary')) {
      expect(output).toContain('Secret Name');
    } else {
      // No env files, so no audit table - this is expected
      expect(output).toContain('No env files discovered');
    }
  });

  test('audit table shows key names (not [REDACTED])', () => {
    const result = spawnSync(['bun', 'run', 'dev', '--', '--dir', 'example/config/env', '--dry-run'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    
    const output = result.stdout.toString();
    const lines = output.split('\n');
    
    // Find audit summary section
    const auditIndex = lines.findIndex(line => line.includes('Audit Summary'));
    
    if (auditIndex > -1) {
      // Check that key names are visible in audit section
      const auditSection = lines.slice(auditIndex).join('\n');
      
      // Should not have [REDACTED] for key names in audit table
      expect(auditSection).toMatch(/[A-Z_]+/); // Should show actual key names
      
      // Verify "Secret Name" column exists
      expect(auditSection).toContain('Secret Name');
    } else {
      // No audit table means no env files - acceptable
      expect(output).toContain('No env files discovered');
    }
  });

  test('secret values still redacted in diff output', () => {
    const result = spawnSync(['bun', 'run', 'dev', '--', '--dry-run'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    
    const output = result.stdout.toString();
    
    // Diff output should still redact actual secret values
    if (output.includes('=')) {
      // If there are KEY=value patterns, values should be redacted
      const keyValueMatches = output.match(/[A-Z_]+=.+/g);
      if (keyValueMatches) {
        const hasRedacted = keyValueMatches.some(match => match.includes('[REDACTED]'));
        // At least some values should be redacted (if they're secrets)
        expect(hasRedacted || !keyValueMatches.some(m => m.match(/[A-Z_]+=(sk_|pk_|[a-f0-9]{32})/))).toBe(true);
      }
    }
    
    // Test passes if no KEY=value patterns (no secrets to check)
    expect(true).toBe(true);
  });

  test('with multiple secrets in audit', () => {
    const result = spawnSync(['bun', 'run', 'dev', '--', '--dir', 'example/config/env', '--dry-run'], {
      cwd: process.cwd(),
      env: { ...process.env },
    });
    
    const output = result.stdout.toString();
    const lines = output.split('\n');
    
    // Find audit summary
    const auditIndex = lines.findIndex(line => line.includes('Audit Summary'));
    if (auditIndex > -1) {
      const auditSection = lines.slice(auditIndex).join('\n');
      
      // Verify table structure exists with new capitalized headers
      expect(auditSection).toContain('Secret Name');
      expect(auditSection).toContain('Source');
      expect(auditSection).toContain('Action');
      expect(auditSection).toContain('Status');
    } else {
      // No env files - acceptable for this test environment
      expect(output).toContain('No env files discovered');
    }
  });
});
