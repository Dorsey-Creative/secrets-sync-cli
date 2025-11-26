import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateGitignore, fixGitignore, getRequiredPatterns } from '../../src/utils/gitignoreValidator';

const TEST_DIR = '/tmp/gitignore-test';
const TEST_GITIGNORE = join(TEST_DIR, '.gitignore');

describe('gitignoreValidator', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('getRequiredPatterns', () => {
    test('returns all required patterns', () => {
      const patterns = getRequiredPatterns();
      expect(patterns).toEqual(['.env', '.env.*', '!.env.example', '**/bak/', '*.bak']);
    });
  });

  describe('validateGitignore', () => {
    test('returns invalid when .gitignore is missing', () => {
      const result = validateGitignore(TEST_GITIGNORE);
      expect(result.isValid).toBe(false);
      expect(result.missingPatterns).toEqual(['.env', '.env.*', '!.env.example', '**/bak/', '*.bak']);
      expect(result.warnings).toContain('.gitignore file not found');
    });

    test('returns invalid when patterns are missing', () => {
      writeFileSync(TEST_GITIGNORE, 'node_modules/\n');
      const result = validateGitignore(TEST_GITIGNORE);
      expect(result.isValid).toBe(false);
      expect(result.missingPatterns).toEqual(['.env', '.env.*', '!.env.example', '**/bak/', '*.bak']);
    });

    test('returns valid when all patterns present', () => {
      const content = '.env\n.env.*\n!.env.example\n**/bak/\n*.bak\n';
      writeFileSync(TEST_GITIGNORE, content);
      const result = validateGitignore(TEST_GITIGNORE);
      expect(result.isValid).toBe(true);
      expect(result.missingPatterns).toEqual([]);
    });

    test('warns about incorrect pattern order', () => {
      const content = '!.env.example\n.env\n.env.*\n**/bak/\n*.bak\n';
      writeFileSync(TEST_GITIGNORE, content);
      const result = validateGitignore(TEST_GITIGNORE);
      expect(result.isValid).toBe(true); // All patterns present
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('should come after'))).toBe(true);
    });

    test('normalizes paths for cross-platform', () => {
      const content = '.env\n.env.*\n!.env.example\n**\\bak\\\n*.bak\n';
      writeFileSync(TEST_GITIGNORE, content);
      const result = validateGitignore(TEST_GITIGNORE);
      // After normalization, **\bak\ becomes **/bak/ which should match
      expect(result.isValid).toBe(true);
      expect(result.missingPatterns).toEqual([]);
    });
  });

  describe('fixGitignore', () => {
    test('creates .gitignore if missing', () => {
      const added = fixGitignore(TEST_GITIGNORE);
      expect(added.length).toBe(5);
      expect(added).toEqual(['.env', '.env.*', '!.env.example', '**/bak/', '*.bak']);
      expect(existsSync(TEST_GITIGNORE)).toBe(true);
    });

    test('appends patterns to existing file', () => {
      writeFileSync(TEST_GITIGNORE, 'node_modules/\n');
      const added = fixGitignore(TEST_GITIGNORE);
      expect(added.length).toBe(5);
      expect(added).toEqual(['.env', '.env.*', '!.env.example', '**/bak/', '*.bak']);
      const content = require('fs').readFileSync(TEST_GITIGNORE, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });

    test('preserves existing content', () => {
      const original = '# My comment\nnode_modules/\ndist/\n';
      writeFileSync(TEST_GITIGNORE, original);
      fixGitignore(TEST_GITIGNORE);
      const content = require('fs').readFileSync(TEST_GITIGNORE, 'utf-8');
      expect(content).toContain('# My comment');
      expect(content).toContain('node_modules/');
      expect(content).toContain('dist/');
    });

    test('returns empty array when no patterns needed', () => {
      const content = '.env\n.env.*\n!.env.example\n**/bak/\n*.bak\n';
      writeFileSync(TEST_GITIGNORE, content);
      const added = fixGitignore(TEST_GITIGNORE);
      expect(added).toEqual([]);
    });

    test('returns only missing patterns when some exist', () => {
      const content = '.env\n.env.*\n';
      writeFileSync(TEST_GITIGNORE, content);
      const added = fixGitignore(TEST_GITIGNORE);
      expect(added).toEqual(['!.env.example', '**/bak/', '*.bak']);
    });

    test('inserts wildcards before existing negations', () => {
      const content = '!.env.example\n';
      writeFileSync(TEST_GITIGNORE, content);
      const added = fixGitignore(TEST_GITIGNORE);
      expect(added).toEqual(['.env', '.env.*', '**/bak/', '*.bak']);
      
      const result = require('fs').readFileSync(TEST_GITIGNORE, 'utf-8');
      const lines = result.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      
      // Wildcards should come before negation
      const envIndex = lines.indexOf('.env');
      const negationIndex = lines.indexOf('!.env.example');
      expect(envIndex).toBeLessThan(negationIndex);
    });
  });
});
