import { describe, test, expect } from 'bun:test';
import { FLAG_HELP } from '../../src/help/flagHelp';

describe('Flag Help Content Validation', () => {
  const expectedFlags = [
    '--env', '--dir', '--dry-run', '--overwrite', '--skip-unchanged',
    '--force', '--no-confirm', '--fix-gitignore', '--verbose',
    '--help', '--version'
  ];

  test('all 11 flags have help entries', () => {
    const flagKeys = Object.keys(FLAG_HELP);
    expect(flagKeys).toHaveLength(11);
    
    for (const flag of expectedFlags) {
      expect(FLAG_HELP[flag]).toBeDefined();
    }
  });

  test('all entries have required fields', () => {
    for (const [flagName, help] of Object.entries(FLAG_HELP)) {
      expect(help.flag).toBe(flagName);
      expect(help.description).toBeDefined();
      expect(help.description.length).toBeGreaterThan(0);
      expect(help.usage).toBeDefined();
      expect(Array.isArray(help.usage)).toBe(true);
      expect(help.usage.length).toBeGreaterThan(0);
      expect(help.whenToUse).toBeDefined();
      expect(Array.isArray(help.whenToUse)).toBe(true);
      expect(help.whenToUse.length).toBeGreaterThan(0);
      expect(help.docsUrl).toBeDefined();
      expect(help.docsUrl.length).toBeGreaterThan(0);
    }
  });

  test('all URLs are valid format', () => {
    for (const help of Object.values(FLAG_HELP)) {
      expect(help.docsUrl).toMatch(/^https?:\/\//);
    }
  });

  test('all usage examples start with secrets-sync', () => {
    for (const [flagName, help] of Object.entries(FLAG_HELP)) {
      for (const usage of help.usage) {
        expect(usage).toMatch(/^secrets-sync/);
      }
    }
  });

  test('flags with aliases have them defined', () => {
    expect(FLAG_HELP['--force'].aliases).toContain('-f');
    expect(FLAG_HELP['--help'].aliases).toContain('-h');
    expect(FLAG_HELP['--version'].aliases).toContain('-v');
  });

  test('all entries have at least 2 usage examples', () => {
    for (const help of Object.values(FLAG_HELP)) {
      expect(help.usage.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('all entries have at least 2 whenToUse scenarios', () => {
    for (const help of Object.values(FLAG_HELP)) {
      expect(help.whenToUse.length).toBeGreaterThanOrEqual(2);
    }
  });
});
