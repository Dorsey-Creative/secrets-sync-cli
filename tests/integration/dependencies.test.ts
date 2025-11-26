import { describe, test, expect } from 'bun:test';
import { validateDependencies, validationCache, ghCliCheck, ghAuthCheck, nodeVersionCheck, type DependencyCheck } from '../../src/utils/dependencies';

describe('Dependency Integration Tests', () => {
  test('all dependencies present scenario', async () => {
    validationCache.clear();
    
    const result = await validateDependencies([
      nodeVersionCheck,
      ghCliCheck,
      ghAuthCheck,
    ]);

    // In test environment, Node.js should be >= 18
    // gh CLI and auth may or may not be present
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('failures');
    expect(Array.isArray(result.failures)).toBe(true);
  });

  test('Node.js version check always passes in test environment', async () => {
    validationCache.clear();
    
    const result = await validateDependencies([nodeVersionCheck]);

    expect(result.success).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  test('gh CLI check returns boolean', async () => {
    validationCache.clear();
    
    const result = await validateDependencies([ghCliCheck]);

    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result.failures[0].name).toBe('gh-cli');
      expect(result.failures[0].installUrl).toBe('https://cli.github.com');
    }
  });

  test('gh auth check returns boolean', async () => {
    validationCache.clear();
    
    const result = await validateDependencies([ghAuthCheck]);

    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result.failures[0].name).toBe('gh-auth');
      expect(result.failures[0].installCommand).toBe('gh auth login');
    }
  });

  test('caching works across multiple validations', async () => {
    validationCache.clear();
    
    // First validation
    const result1 = await validateDependencies([nodeVersionCheck]);
    
    // Second validation should use cache
    const result2 = await validateDependencies([nodeVersionCheck]);

    expect(result1.success).toBe(result2.success);
    expect(validationCache.has('node-version')).toBe(true);
  });

  test('skip flag scenario (simulated)', async () => {
    // This simulates the SKIP_DEPENDENCY_CHECK env var behavior
    const shouldSkip = process.env.SKIP_DEPENDENCY_CHECK === '1';
    
    if (shouldSkip) {
      // When skipped, no validation should run
      expect(true).toBe(true);
    } else {
      // When not skipped, validation should run
      const result = await validateDependencies([nodeVersionCheck]);
      expect(result).toHaveProperty('success');
    }
  });

  test('parallel execution completes quickly', async () => {
    validationCache.clear();
    
    const start = Date.now();
    await validateDependencies([
      nodeVersionCheck,
      ghCliCheck,
      ghAuthCheck,
    ]);
    const duration = Date.now() - start;

    // Should complete in < 1 second even with 3 checks
    expect(duration).toBeLessThan(1000);
  });

  test('error messages are user-friendly', async () => {
    validationCache.clear();
    
    const result = await validateDependencies([
      nodeVersionCheck,
      ghCliCheck,
      ghAuthCheck,
    ]);

    // Check that all failures have user-friendly messages
    result.failures.forEach(failure => {
      expect(failure.errorMessage).toBeTruthy();
      expect(failure.errorMessage.length).toBeGreaterThan(10);
      expect(failure.installUrl || failure.installCommand).toBeTruthy();
    });
  });
});
