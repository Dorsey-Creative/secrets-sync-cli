// SECURITY: This file MUST be imported first before any other imports
// It intercepts stdout/stderr streams AND console methods to scrub secrets
// Stream interception catches text output, console interception catches objects

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

// SECURITY: Intercept stdout/stderr streams to catch ALL text output
const originalWrite = {
  stdout: process.stdout.write.bind(process.stdout),
  stderr: process.stderr.write.bind(process.stderr),
};

process.stdout.write = function(chunk: any, ...args: any[]): boolean {
  if (typeof chunk === 'string') {
    chunk = scrubSecrets(chunk);
  } else if (Buffer.isBuffer(chunk)) {
    const str = chunk.toString('utf8');
    if (Buffer.from(str, 'utf8').equals(chunk)) {
      chunk = Buffer.from(scrubSecrets(str), 'utf8');
    }
  }
  return originalWrite.stdout(chunk, ...args);
} as any;

process.stderr.write = function(chunk: any, ...args: any[]): boolean {
  if (typeof chunk === 'string') {
    chunk = scrubSecrets(chunk);
  } else if (Buffer.isBuffer(chunk)) {
    const str = chunk.toString('utf8');
    if (Buffer.from(str, 'utf8').equals(chunk)) {
      chunk = Buffer.from(scrubSecrets(str), 'utf8');
    }
  }
  return originalWrite.stderr(chunk, ...args);
} as any;

// SECURITY: Intercept console methods to scrub objects BEFORE they're stringified
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

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

console.log = function(...args: any[]) {
  return originalConsole.log(...scrubArgs(...args));
};

console.error = function(...args: any[]) {
  return originalConsole.error(...scrubArgs(...args));
};

console.warn = function(...args: any[]) {
  return originalConsole.warn(...scrubArgs(...args));
};

console.info = function(...args: any[]) {
  return originalConsole.info(...scrubArgs(...args));
};

console.debug = function(...args: any[]) {
  return originalConsole.debug(...scrubArgs(...args));
};
