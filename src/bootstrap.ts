// SECURITY: This file MUST be imported first before any other imports
// It intercepts stdout/stderr streams and console methods to scrub secrets
// before any module initialization code can output sensitive data

import { scrubSecrets, scrubObject, loadUserConfig } from './utils/scrubber';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

// SECURITY: Load user config BEFORE interception so custom patterns are active during module init
try {
  const configCandidates = ['env-config.yml', 'env-config.yaml'];
  for (const filename of configCandidates) {
    const configPath = join(process.cwd(), filename);
    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf-8');
      const config = parseYaml(configContent);
      loadUserConfig(config);
      break;
    }
  }
} catch (error) {
  // Silently fail - built-in patterns still work
}

// SECURITY: Intercept stdout/stderr streams BEFORE any other code runs
const originalWrite = {
  stdout: process.stdout.write.bind(process.stdout),
  stderr: process.stderr.write.bind(process.stderr),
};

// Intercept process.stdout.write
process.stdout.write = function(chunk: any, ...args: any[]): boolean {
  if (typeof chunk === 'string') {
    chunk = scrubSecrets(chunk);
  } else if (Buffer.isBuffer(chunk)) {
    // Only scrub if buffer appears to be valid UTF-8 text
    const str = chunk.toString('utf8');
    // Check if conversion is reversible (no replacement characters)
    if (Buffer.from(str, 'utf8').equals(chunk)) {
      chunk = Buffer.from(scrubSecrets(str), 'utf8');
    }
    // Otherwise leave binary data untouched
  }
  return originalWrite.stdout(chunk, ...args);
} as any;

// Intercept process.stderr.write
process.stderr.write = function(chunk: any, ...args: any[]): boolean {
  if (typeof chunk === 'string') {
    chunk = scrubSecrets(chunk);
  } else if (Buffer.isBuffer(chunk)) {
    // Only scrub if buffer appears to be valid UTF-8 text
    const str = chunk.toString('utf8');
    // Check if conversion is reversible (no replacement characters)
    if (Buffer.from(str, 'utf8').equals(chunk)) {
      chunk = Buffer.from(scrubSecrets(str), 'utf8');
    }
    // Otherwise leave binary data untouched
  }
  return originalWrite.stderr(chunk, ...args);
} as any;

// SECURITY: Intercept ALL console methods using Proxy to prevent bypass
function scrubArgs(...args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return scrubSecrets(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      return scrubObject(arg);
    }
    return arg;
  });
}

// Wrap console with Proxy to intercept ALL methods (including future ones)
const consoleProxy = new Proxy(console, {
  get(target: any, prop: string) {
    const original = target[prop];

    // Only wrap functions that might output user content
    if (typeof original === 'function') {
      return function(...args: any[]) {
        const scrubbedArgs = scrubArgs(...args);
        return original.apply(target, scrubbedArgs);
      };
    }

    return original;
  }
});

// Replace global console with proxy
Object.assign(console, consoleProxy);
