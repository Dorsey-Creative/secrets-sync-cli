import { exec } from 'child_process';
import { promisify } from 'util';
import { TimeoutError } from './errors.js';

const execAsync = promisify(exec);

export interface TimeoutOptions {
  timeout: number;
  operation?: string;
}

export function getTimeout(): number {
  const envTimeout = process.env.SECRETS_SYNC_TIMEOUT;
  if (!envTimeout) return 30000;
  
  const parsed = parseInt(envTimeout, 10);
  if (isNaN(parsed) || parsed <= 0) return 30000;
  
  return parsed;
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout);

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(
            new TimeoutError(
              options.operation || 'Operation',
              options.timeout
            )
          );
        });
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function execWithTimeout(
  command: string,
  options?: { timeout?: number; operation?: string }
): Promise<{ stdout: string; stderr: string }> {
  const timeout = options?.timeout || getTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await execAsync(command, { signal: controller.signal });
    return result;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new TimeoutError(
        options?.operation || `Command: ${command}`,
        timeout
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
