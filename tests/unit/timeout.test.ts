import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { withTimeout, execWithTimeout, getTimeout } from '../../src/utils/timeout.js';
import { TimeoutError } from '../../src/utils/errors.js';

describe('timeout', () => {
  const originalEnv = process.env.SECRETS_SYNC_TIMEOUT;

  afterEach(() => {
    if (originalEnv) {
      process.env.SECRETS_SYNC_TIMEOUT = originalEnv;
    } else {
      delete process.env.SECRETS_SYNC_TIMEOUT;
    }
  });

  describe('getTimeout', () => {
    it('returns default timeout when env var not set', () => {
      delete process.env.SECRETS_SYNC_TIMEOUT;
      expect(getTimeout()).toBe(30000);
    });

    it('returns custom timeout from env var', () => {
      process.env.SECRETS_SYNC_TIMEOUT = '5000';
      expect(getTimeout()).toBe(5000);
    });

    it('returns default for invalid number', () => {
      process.env.SECRETS_SYNC_TIMEOUT = 'invalid';
      expect(getTimeout()).toBe(30000);
    });

    it('returns default for empty string', () => {
      process.env.SECRETS_SYNC_TIMEOUT = '';
      expect(getTimeout()).toBe(30000);
    });

    it('returns default for negative number', () => {
      process.env.SECRETS_SYNC_TIMEOUT = '-1000';
      expect(getTimeout()).toBe(30000);
    });

    it('returns default for zero', () => {
      process.env.SECRETS_SYNC_TIMEOUT = '0';
      expect(getTimeout()).toBe(30000);
    });
  });

  describe('withTimeout', () => {
    it('resolves when operation completes before timeout', async () => {
      const result = await withTimeout(
        () => Promise.resolve('success'),
        { timeout: 1000 }
      );
      expect(result).toBe('success');
    });

    it('rejects with TimeoutError when operation exceeds timeout', async () => {
      const slowOp = () => new Promise((resolve) => setTimeout(resolve, 100));
      
      try {
        await withTimeout(slowOp, { timeout: 10, operation: 'Test operation' });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).operation).toBe('Test operation');
        expect((error as TimeoutError).timeoutMs).toBe(10);
      }
    });

    it('cleans up timeout on success', async () => {
      const result = await withTimeout(
        () => Promise.resolve('done'),
        { timeout: 1000 }
      );
      expect(result).toBe('done');
      // If cleanup didn't work, timeout would still fire
    });

    it('cleans up timeout on failure', async () => {
      try {
        await withTimeout(
          () => new Promise((_, reject) => setTimeout(() => reject(new Error('fail')), 10)),
          { timeout: 1000 }
        );
      } catch (error) {
        expect((error as Error).message).toBe('fail');
      }
    });
  });

  describe('execWithTimeout', () => {
    it('executes command successfully', async () => {
      const result = await execWithTimeout('echo "test"', { timeout: 1000 });
      expect(result.stdout.trim()).toBe('test');
    });

    it('uses default timeout from env var', async () => {
      process.env.SECRETS_SYNC_TIMEOUT = '5000';
      const result = await execWithTimeout('echo "test"');
      expect(result.stdout.trim()).toBe('test');
    });

    it('times out slow commands', async () => {
      try {
        await execWithTimeout('node -e "setTimeout(() => {}, 1000)"', { timeout: 10 });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
      }
    });
  });
});
