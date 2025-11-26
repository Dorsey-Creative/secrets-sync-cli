import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const TEST_DIR = '/tmp/gitignore-cli-test';
const TEST_GITIGNORE = join(TEST_DIR, '.gitignore');
const CLI_PATH = join(process.cwd(), 'dist', 'secrets-sync.js');

describe('gitignore CLI integration', () => {
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

  describe('--fix-gitignore flag', () => {
    test('creates .gitignore with required patterns', () => {
      const result = spawnSync('node', [CLI_PATH, '--fix-gitignore'], {
        cwd: TEST_DIR,
        encoding: 'utf-8',
        env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1' }
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Added 5 pattern');
      expect(existsSync(TEST_GITIGNORE)).toBe(true);

      const content = readFileSync(TEST_GITIGNORE, 'utf-8');
      expect(content).toContain('.env');
      expect(content).toContain('.env.*');
      expect(content).toContain('!.env.example');
      expect(content).toContain('**/bak/');
      expect(content).toContain('*.bak');
    });

    test('reports when .gitignore is already valid', () => {
      const content = '.env\n.env.*\n!.env.example\n**/bak/\n*.bak\n';
      writeFileSync(TEST_GITIGNORE, content);

      const result = spawnSync('node', [CLI_PATH, '--fix-gitignore'], {
        cwd: TEST_DIR,
        encoding: 'utf-8',
        env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1' }
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('already contains all required patterns');
    });
  });

  describe('startup warning', () => {
    test('shows warning when .gitignore is missing', () => {
      const result = spawnSync('node', [CLI_PATH, '--dry-run'], {
        cwd: TEST_DIR,
        encoding: 'utf-8',
        env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1' }
      });

      expect(result.stdout).toContain('Security Warning');
      expect(result.stdout).toContain('Missing patterns in .gitignore');
      expect(result.stdout).toContain('--fix-gitignore');
    });

    test('no warning when .gitignore is valid', () => {
      const content = '.env\n.env.*\n!.env.example\n**/bak/\n*.bak\n';
      writeFileSync(TEST_GITIGNORE, content);

      const result = spawnSync('node', [CLI_PATH, '--dry-run'], {
        cwd: TEST_DIR,
        encoding: 'utf-8',
        env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1' }
      });

      expect(result.stdout).not.toContain('Security Warning');
    });

    test('can skip warning with SKIP_GITIGNORE_CHECK', () => {
      const result = spawnSync('node', [CLI_PATH, '--dry-run'], {
        cwd: TEST_DIR,
        encoding: 'utf-8',
        env: { ...process.env, SKIP_DEPENDENCY_CHECK: '1', SKIP_GITIGNORE_CHECK: '1' }
      });

      expect(result.stdout).not.toContain('Security Warning');
    });
  });
});
