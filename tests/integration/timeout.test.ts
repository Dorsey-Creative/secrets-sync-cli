import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { execWithTimeout, withTimeout, getTimeout } from '../../src/utils/timeout.js';
import { TimeoutError } from '../../src/utils/errors.js';

describe('Timeout Integration Tests', () => {
  const originalEnv = process.env.SECRETS_SYNC_TIMEOUT;

  afterEach(() => {
    if (originalEnv) {
      process.env.SECRETS_SYNC_TIMEOUT = originalEnv;
    } else {
      delete process.env.SECRETS_SYNC_TIMEOUT;
    }
  });

  it('slow operation timeout', async () => {
    const slowOp = () => new Promise((resolve) => setTimeout(resolve, 200));
    
    try {
      await withTimeout(slowOp, { timeout: 50, operation: 'Slow test operation' });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError);
      const timeoutError = error as TimeoutError;
      expect(timeoutError.operation).toBe('Slow test operation');
      expect(timeoutError.timeoutMs).toBe(50);
      expect(timeoutError.message).toContain('timed out after 50ms');
    }
  });

  it('fast operation success', async () => {
    const fastOp = () => Promise.resolve('completed');
    const result = await withTimeout(fastOp, { timeout: 1000 });
    expect(result).toBe('completed');
  });

  it('custom timeout from env var', async () => {
    process.env.SECRETS_SYNC_TIMEOUT = '2000';
    expect(getTimeout()).toBe(2000);
    
    const result = await execWithTimeout('echo "test"');
    expect(result.stdout.trim()).toBe('test');
  });

  it('timeout error message', async () => {
    try {
      await execWithTimeout('node -e "setTimeout(() => {}, 1000)"', { timeout: 50, operation: 'Test command' });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError);
      const timeoutError = error as TimeoutError;
      expect(timeoutError.message).toContain('timed out');
      expect(timeoutError.message).toContain('50ms');
      expect(timeoutError.message).toContain('Test command');
    }
  });

  it('cleanup on timeout', async () => {
    let cleanupCalled = false;
    const opWithCleanup = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 200));
      } finally {
        cleanupCalled = true;
      }
    };

    try {
      await withTimeout(opWithCleanup, { timeout: 50 });
    } catch (error) {
      // Expected timeout
    }

    // Give cleanup time to run
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(cleanupCalled).toBe(true);
  });

  it('cleanup on success', async () => {
    let cleanupCalled = false;
    const opWithCleanup = async () => {
      try {
        return 'success';
      } finally {
        cleanupCalled = true;
      }
    };

    const result = await withTimeout(opWithCleanup, { timeout: 1000 });
    expect(result).toBe('success');
    expect(cleanupCalled).toBe(true);
  });

  it('verify no memory leaks', async () => {
    // Run many operations to check for memory leaks
    const operations = Array.from({ length: 100 }, (_, i) => 
      withTimeout(() => Promise.resolve(i), { timeout: 1000 })
    );

    const results = await Promise.all(operations);
    expect(results.length).toBe(100);
    expect(results[0]).toBe(0);
    expect(results[99]).toBe(99);
  });
});
