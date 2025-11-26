/**
 * Secret Scrubbing Utility
 * Removes sensitive values from strings and objects before output
 */

import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

/**
 * Configuration for secret scrubbing behavior
 */
export interface ScrubberConfig {
  /** Custom patterns to scrub (glob patterns) */
  scrubPatterns?: string[];
  /** Patterns to whitelist (never scrub) */
  whitelistPatterns?: string[];
}

// Input length limit (50KB max to prevent catastrophic backtracking)
const MAX_INPUT_LENGTH = 50000;

// LRU Cache for scrubbed results (max 1000 entries)
const scrubCache = new LRUCache<string, string>({ max: 1000 });

// Hash function for cache keys (prevents heap dumps from exposing secrets)
function hashInput(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// Pattern definitions (compiled once at module load)
const SECRET_PATTERNS = {
  // KEY=value format
  keyValue: /([A-Z_][A-Z0-9_]*)=([^\s]+)/gi,

  // URL with credentials (any protocol)
  urlCreds: /([a-z]+:\/\/[^:]+):([^@]+)@/gi,

  // JWT tokens
  jwt: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,

  // Private keys (multi-line)
  privateKey: /-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----/g,
};

// Common secret key names (case-insensitive)
const SECRET_KEYS = new Set([
  'password', 'passwd', 'pwd',
  'secret', 'api_key', 'apikey', 'api_secret',
  'token', 'auth', 'authorization', 'auth_token',
  'private_key', 'access_key', 'secret_key',
  'database_url', 'db_url', 'db_password',
  'client_secret', 'client_id',
  'aws_secret_access_key', 'aws_access_key_id',
  'github_token', 'gh_token',
  'stripe_secret_key', 'stripe_api_key',
]);

// Whitelisted keys (never scrub)
const WHITELIST_KEYS = new Set([
  'debug', 'node_env', 'port',
  'host', 'hostname', 'path',
  'log_level', 'verbose',
  'secrets_sync_timeout',
]);

// User config patterns
let userScrubPatterns: string[] = [];
let userWhitelistPatterns: string[] = [];

/**
 * Load user-defined scrubbing configuration
 * @param config - Configuration object from env-config.yml
 */
export function loadUserConfig(config: any): void {
  if (config?.scrubbing?.scrubPatterns) {
    userScrubPatterns = config.scrubbing.scrubPatterns;
  }
  if (config?.scrubbing?.whitelistPatterns) {
    userWhitelistPatterns = config.scrubbing.whitelistPatterns;
  }
}

/**
 * Clear the internal scrubbing cache
 */
export function clearCache(): void {
  scrubCache.clear();
}

/**
 * Get the current cache size (for testing)
 * @returns Number of entries in cache
 */
export function getCacheSize(): number {
  return scrubCache.size;
}

/**
 * Check if a key name indicates it contains a secret
 * @param key - Key name to check
 * @returns True if key likely contains a secret
 */
export function isSecretKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  
  const lower = key.toLowerCase();

  // Check built-in secret keys
  if (SECRET_KEYS.has(lower)) return true;

  // Check user-defined patterns
  for (const pattern of userScrubPatterns) {
    if (matchesGlobPattern(key, pattern)) return true;
  }

  // Check common substrings
  return lower.includes('password') ||
         lower.includes('secret') ||
         lower.includes('token') ||
         lower.includes('key');
}

/**
 * Check if a key is whitelisted (should not be scrubbed)
 * @param key - Key name to check
 * @returns True if key is whitelisted
 */
function isWhitelisted(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  
  const lower = key.toLowerCase();

  // Check built-in whitelist
  if (WHITELIST_KEYS.has(lower)) return true;

  // Check user-defined whitelist patterns
  for (const pattern of userWhitelistPatterns) {
    if (matchesGlobPattern(key, pattern)) return true;
  }

  return false;
}

/**
 * Simple glob pattern matching
 * @param text - Text to match
 * @param pattern - Glob pattern (e.g., "CUSTOM_*")
 * @returns True if text matches pattern
 */
function matchesGlobPattern(text: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
  return regex.test(text);
}

/**
 * Scrub secrets from a string by replacing sensitive values with placeholders
 * @param text - Input string to scrub
 * @returns Scrubbed string with secrets replaced
 */
export function scrubSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Check cache using hash of input
  const inputHash = hashInput(text);
  const cached = scrubCache.get(inputHash);
  if (cached !== undefined) return cached;

  try {
    // SECURITY: Length-based DoS protection
    if (text.length > MAX_INPUT_LENGTH) {
      const result = '[SCRUBBING_FAILED:INPUT_TOO_LARGE]';
      scrubCache.set(inputHash, result);
      return result;
    }

    let scrubbed = text;

    // 1. Scrub KEY=value patterns
    scrubbed = scrubbed.replace(SECRET_PATTERNS.keyValue, (match, key, value) => {
      if (isSecretKey(key) && !isWhitelisted(key)) {
        return `${key}=[REDACTED]`;
      }
      return match;
    });

    // 2. Scrub URL credentials
    scrubbed = scrubbed.replace(SECRET_PATTERNS.urlCreds, '$1:[REDACTED]@');

    // 3. Scrub JWT tokens
    scrubbed = scrubbed.replace(SECRET_PATTERNS.jwt, '[REDACTED:JWT]');

    // 4. Scrub private keys
    scrubbed = scrubbed.replace(SECRET_PATTERNS.privateKey, '[REDACTED:PRIVATE_KEY]');

    // Cache scrubbed result
    scrubCache.set(inputHash, scrubbed);

    return scrubbed;
  } catch (error) {
    // Graceful failure: never return unscrubbed text
    return '[SCRUBBING_FAILED]';
  }
}

/**
 * Check if value is a known built-in that should be preserved
 */
function isKnownBuiltIn(obj: any): boolean {
  return obj instanceof Date ||
         obj instanceof RegExp ||
         obj instanceof Error ||
         Buffer.isBuffer(obj) ||
         obj instanceof Map ||
         obj instanceof Set ||
         obj instanceof WeakMap ||
         obj instanceof WeakSet ||
         obj instanceof Promise;
}

/**
 * Recursively scrub secrets from an object
 * @param obj - Object to scrub
 * @param path - WeakSet tracking current recursion path (detects cycles)
 * @returns New object with secrets scrubbed
 */
export function scrubObject<T>(obj: T, path: WeakSet<object> = new WeakSet()): T {
  if (!obj || typeof obj !== 'object') return obj;

  // Preserve known built-ins (Date, Buffer, Map, etc.) but scrub custom classes
  if (!Array.isArray(obj) && isKnownBuiltIn(obj)) {
    return obj;
  }

  // SECURITY: Detect circular references in current path
  if (path.has(obj as object)) {
    return '[CIRCULAR]' as any;
  }
  
  // Add to current path
  path.add(obj as object);

  // Handle arrays
  if (Array.isArray(obj)) {
    const result = obj.map(item => {
      if (typeof item === 'string') {
        return scrubSecrets(item);
      }
      return scrubObject(item, path);
    }) as T;
    
    // Remove from path after processing
    path.delete(obj as object);
    return result;
  }

  // Handle objects
  const scrubbed: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSecretKey(key) && !isWhitelisted(key)) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      scrubbed[key] = scrubObject(value, path);
    } else if (typeof value === 'string') {
      scrubbed[key] = scrubSecrets(value);
    } else {
      scrubbed[key] = value;
    }
  }
  
  // Remove from path after processing
  path.delete(obj as object);
  return scrubbed as T;
}
