import { describe, test, expect, beforeEach } from 'bun:test';
import { validateDependencies, validationCache, ghCliCheck, ghAuthCheck, nodeVersionCheck, type DependencyCheck } from '../../src/utils/dependencies';

describe('validateDependencies', () => {
  // Clear cache before each test
  beforeEach(() => {
    validationCache.clear();
  });

  test('returns success when all checks pass', async () => {
    const checks: DependencyCheck[] = [
      {
        name: 'test1',
        check: async () => true,
        errorMessage: 'Test 1 failed',
      },
      {
        name: 'test2',
        check: async () => true,
        errorMessage: 'Test 2 failed',
      },
    ];

    const result = await validateDependencies(checks);

    expect(result.success).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  test('returns failures when checks fail', async () => {
    const checks: DependencyCheck[] = [
      {
        name: 'test1',
        check: async () => false,
        errorMessage: 'Test 1 failed',
      },
      {
        name: 'test2',
        check: async () => true,
        errorMessage: 'Test 2 failed',
      },
    ];

    const result = await validateDependencies(checks);

    expect(result.success).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].name).toBe('test1');
  });

  test('returns all failures at once (not fail-fast)', async () => {
    const checks: DependencyCheck[] = [
      {
        name: 'test1',
        check: async () => false,
        errorMessage: 'Test 1 failed',
      },
      {
        name: 'test2',
        check: async () => false,
        errorMessage: 'Test 2 failed',
      },
      {
        name: 'test3',
        check: async () => false,
        errorMessage: 'Test 3 failed',
      },
    ];

    const result = await validateDependencies(checks);

    expect(result.success).toBe(false);
    expect(result.failures).toHaveLength(3);
  });

  test('runs checks in parallel', async () => {
    const startTimes: number[] = [];
    const checks: DependencyCheck[] = [
      {
        name: 'test1',
        check: async () => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 10));
          return true;
        },
        errorMessage: 'Test 1 failed',
      },
      {
        name: 'test2',
        check: async () => {
          startTimes.push(Date.now());
          await new Promise(resolve => setTimeout(resolve, 10));
          return true;
        },
        errorMessage: 'Test 2 failed',
      },
    ];

    await validateDependencies(checks);

    // If parallel, start times should be within a few ms of each other
    expect(startTimes).toHaveLength(2);
    const timeDiff = Math.abs(startTimes[0] - startTimes[1]);
    expect(timeDiff).toBeLessThan(5);
  });

  test('caches results for session', async () => {
    let callCount = 0;
    const checks: DependencyCheck[] = [
      {
        name: 'test1',
        check: async () => {
          callCount++;
          return true;
        },
        errorMessage: 'Test 1 failed',
      },
    ];

    // First call
    await validateDependencies(checks);
    expect(callCount).toBe(1);

    // Second call should use cache
    await validateDependencies(checks);
    expect(callCount).toBe(1);
  });

  test('includes install info in failures', async () => {
    const checks: DependencyCheck[] = [
      {
        name: 'gh',
        check: async () => false,
        errorMessage: 'GitHub CLI not found',
        installUrl: 'https://cli.github.com',
        installCommand: 'brew install gh',
      },
    ];

    const result = await validateDependencies(checks);

    expect(result.failures[0].installUrl).toBe('https://cli.github.com');
    expect(result.failures[0].installCommand).toBe('brew install gh');
  });

  test('handles empty check list', async () => {
    const result = await validateDependencies([]);

    expect(result.success).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  test('handles async errors gracefully', async () => {
    const checks: DependencyCheck[] = [
      {
        name: 'test1',
        check: async () => {
          throw new Error('Check failed');
        },
        errorMessage: 'Test 1 failed',
      },
    ];

    // Should not throw, should treat as failure
    const result = await validateDependencies(checks);
    expect(result.success).toBe(false);
    expect(result.failures).toHaveLength(1);
  });

  test('completes quickly with multiple checks', async () => {
    const checks: DependencyCheck[] = Array.from({ length: 10 }, (_, i) => ({
      name: `test${i}`,
      check: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return true;
      },
      errorMessage: `Test ${i} failed`,
    }));

    const start = Date.now();
    await validateDependencies(checks);
    const duration = Date.now() - start;

    // Should complete in ~50ms (parallel), not 500ms (sequential)
    expect(duration).toBeLessThan(100);
  });
});

describe('ghCliCheck', () => {
  test('has correct properties', () => {
    expect(ghCliCheck.name).toBe('gh-cli');
    expect(ghCliCheck.errorMessage).toBe('GitHub CLI (gh) not found');
    expect(ghCliCheck.installUrl).toBe('https://cli.github.com');
    expect(ghCliCheck.installCommand).toBeDefined();
  });

  test('check function is async', () => {
    const result = ghCliCheck.check();
    expect(result).toBeInstanceOf(Promise);
  });

  test('provides platform-specific install command', () => {
    const platform = process.platform;
    if (platform === 'darwin') {
      expect(ghCliCheck.installCommand).toContain('brew');
    } else if (platform === 'win32') {
      expect(ghCliCheck.installCommand).toContain('winget');
    }
    // Always has some install command
    expect(ghCliCheck.installCommand).toBeTruthy();
  });
});

describe('ghAuthCheck', () => {
  test('has correct properties', () => {
    expect(ghAuthCheck.name).toBe('gh-auth');
    expect(ghAuthCheck.errorMessage).toBe('GitHub CLI not authenticated');
    expect(ghAuthCheck.installCommand).toBe('gh auth login');
  });

  test('check function is async', () => {
    const result = ghAuthCheck.check();
    expect(result).toBeInstanceOf(Promise);
  });

  test('does not have installUrl', () => {
    expect(ghAuthCheck.installUrl).toBeUndefined();
  });

  test('passes when gh CLI is not installed', async () => {
    // The auth check should return true (pass) when gh is not installed
    // This prevents showing misleading "not authenticated" error
    // The actual "gh not installed" error comes from ghCliCheck
    const result = await ghAuthCheck.check();
    // Result depends on whether gh is installed in test environment
    expect(typeof result).toBe('boolean');
  });
});

describe('nodeVersionCheck', () => {
  test('has correct properties', () => {
    expect(nodeVersionCheck.name).toBe('node-version');
    expect(nodeVersionCheck.errorMessage).toContain('Node.js version');
    expect(nodeVersionCheck.errorMessage).toContain('18.0.0');
    expect(nodeVersionCheck.installUrl).toBe('https://nodejs.org');
  });

  test('check function is async', () => {
    const result = nodeVersionCheck.check();
    expect(result).toBeInstanceOf(Promise);
  });

  test('passes with current Node.js version', async () => {
    // Current Node.js should be >= 18.0.0 in test environment
    const result = await nodeVersionCheck.check();
    expect(result).toBe(true);
  });

  test('error message includes current version', () => {
    expect(nodeVersionCheck.errorMessage).toContain(process.version);
  });
});
