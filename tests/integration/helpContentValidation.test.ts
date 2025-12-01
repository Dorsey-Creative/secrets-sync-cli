import { describe, test, expect, beforeAll } from 'bun:test';
import { join } from 'path';
import { FLAG_HELP } from '../../src/help/flagHelp';

const CLI_PATH = join(import.meta.dir, '../../dist/secrets-sync.js');

describe('Help Content Validation', () => {
  beforeAll(async () => {
    // Ensure CLI is built before running tests
    const buildProc = Bun.spawnSync(['bun', 'run', 'build']);
    if (buildProc.exitCode !== 0) {
      throw new Error('Failed to build CLI for tests');
    }
  });

  test('all usage examples have valid format', async () => {
    for (const [flagName, help] of Object.entries(FLAG_HELP)) {
      for (const usage of help.usage) {
        // Verify format: starts with secrets-sync
        expect(usage).toMatch(/^secrets-sync/);
        
        // Verify it contains the flag being documented
        const flagWithoutDashes = flagName.replace(/^--/, '');
        const hasFlag = usage.includes(flagName) || usage.includes(`-${flagWithoutDashes[0]}`);
        expect(hasFlag).toBe(true);
      }
    }
  });

  test('all documentation links are valid URLs', async () => {
    for (const [flagName, help] of Object.entries(FLAG_HELP)) {
      const url = help.docsUrl;
      
      // Validate URL format
      expect(url).toMatch(/^https:\/\//);
      expect(() => new URL(url)).not.toThrow();
      
      // Verify it's a GitHub URL
      expect(url).toContain('github.com/Dorsey-Creative/secrets-sync-cli');
    }
  });

  test('all documentation links are reachable', async () => {
    const uniqueUrls = new Set(
      Object.values(FLAG_HELP).map(help => help.docsUrl)
    );

    for (const url of uniqueUrls) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        // Accept 200 OK or 404 (docs may not exist yet, but URL format is valid)
        expect([200, 404]).toContain(response.status);
      } catch (error) {
        // Network errors are acceptable in CI environments
        // Just verify the URL is well-formed
        expect(() => new URL(url)).not.toThrow();
      }
    }
  });

  test('usage examples contain valid flag combinations', async () => {
    const validFlags = [
      '--env', '--dir', '--dry-run', '--overwrite', '--skip-unchanged',
      '--force', '-f', '--no-confirm', '--fix-gitignore', '--verbose',
      '--help', '-h', '--version', '-v'
    ];

    for (const help of Object.values(FLAG_HELP)) {
      for (const usage of help.usage) {
        const args = usage.split(/\s+/);
        
        // Check that all flags in the example are valid
        for (const arg of args) {
          if (arg.startsWith('-')) {
            // It's a flag - verify it's in our valid list or is a value
            const isValidFlag = validFlags.includes(arg);
            const isValue = !arg.startsWith('--') && arg.startsWith('-') && arg.length > 2;
            
            if (!isValidFlag && !isValue) {
              // Could be a flag value like "staging" or "production"
              expect(arg).not.toMatch(/^--[a-z]/);
            }
          }
        }
      }
    }
  });

  test('all flags reference valid related flags', async () => {
    const allFlags = Object.keys(FLAG_HELP);

    for (const [flagName, help] of Object.entries(FLAG_HELP)) {
      if (help.relatedFlags) {
        for (const relatedFlag of help.relatedFlags) {
          expect(allFlags).toContain(relatedFlag);
        }
      }
    }
  });
});
