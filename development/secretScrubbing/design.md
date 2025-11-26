# Design: Secret Value Scrubbing

**Issue:** #11  
**Project:** Secret Scrubbing & .gitignore Protection  
**Version:** 1.0  
**Date:** 2025-11-25

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Design](#component-design)
3. [Integration Points](#integration-points)
4. [Implementation Phases](#implementation-phases)
5. [Testing Strategy](#testing-strategy)
6. [Performance Considerations](#performance-considerations)
7. [Security Considerations](#security-considerations)

---

## System Architecture

### High-Level Overview

```mermaid
graph TB
    CLI[CLI Entry Point] --> Logger[Logger Module]
    CLI --> ErrorBuilder[Error Message Builder]
    CLI --> GitIgnore[GitIgnore Validator]

    Logger --> Scrubber[Secret Scrubber]
    ErrorBuilder --> Scrubber
    GitIgnore --> FS[File System]

    Scrubber --> Patterns[Pattern Matcher]
    Scrubber --> Whitelist[Whitelist Filter]

    Patterns --> Output[Console Output]

    style Scrubber fill:#f96,stroke:#333,stroke-width:4px
    style Output fill:#9f6,stroke:#333,stroke-width:2px
```

**Key Design Principle:** Centralized scrubbing at the output layer - all text passes through scrubber before reaching console.

### Data Flow

```mermaid
sequenceDiagram
    participant App as Application Code
    participant Logger as Logger
    participant Scrubber as Secret Scrubber
    participant Console as Console Output

    App->>Logger: log("API_KEY=secret123")
    Logger->>Scrubber: scrubSecrets(message)
    Scrubber->>Scrubber: detectPatterns()
    Scrubber->>Scrubber: redactValues()
    Scrubber-->>Logger: "API_KEY=[REDACTED]"
    Logger->>Console: output scrubbed text
```

**End-User Success:** Users can log anything without worrying about secret exposure. The scrubber acts as a safety net.

---

## Component Design

### 1. Secret Scrubber Module

**File:** `src/utils/scrubber.ts`

**Purpose:** Centralized secret detection and redaction logic.

**API Design:**

```typescript
// Core scrubbing function
export function scrubSecrets(text: string): string;

// Object scrubbing (for context objects)
export function scrubObject<T>(obj: T): T;

// Pattern detection
export function isSecretKey(key: string): boolean;

// Configuration
export interface ScrubberConfig {
  placeholder: string;  // Default: "[REDACTED]"
  whitelistKeys: string[];  // Keys to never scrub
}
```

**Implementation Strategy:**

```typescript
import LRU from 'lru-cache';
import { createHash } from 'crypto';

// SECURITY: LRU Cache using HASHED keys (never stores raw secrets in memory)
const scrubCache = new LRU<string, string>({ max: 1000 });

// Hash function for cache keys (prevents heap dumps from exposing secrets)
function hashInput(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// Regex timeout protection (100ms max)
const REGEX_TIMEOUT_MS = 100;

// Pattern definitions (compiled once at module load)
const SECRET_PATTERNS = {
  // KEY=value format
  keyValue: /([A-Z_][A-Z0-9_]*)=([^\s]+)/gi,

  // URL with credentials
  urlCreds: /(https?:\/\/[^:]+):([^@]+)@/gi,

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
]);

// Load user config patterns
let userScrubPatterns: string[] = [];
let userWhitelistPatterns: string[] = [];

export function loadUserConfig(config: any) {
  if (config?.scrubbing?.scrubPatterns) {
    userScrubPatterns = config.scrubbing.scrubPatterns;
  }
  if (config?.scrubbing?.whitelistPatterns) {
    userWhitelistPatterns = config.scrubbing.whitelistPatterns;
  }
}

export function scrubSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // SECURITY: Check cache using HASH of input (never store raw secrets as keys)
  const inputHash = hashInput(text);
  const cached = scrubCache.get(inputHash);
  if (cached !== undefined) return cached;

  let scrubbed = text;

  try {
    // SECURITY: Length-based DoS protection (prevents catastrophic backtracking)
    // JavaScript regex cannot be truly interrupted, so we use input size limits
    if (text.length > 50000) {
      const result = '[SCRUBBING_FAILED:INPUT_TOO_LARGE]';
      scrubCache.set(inputHash, result);
      return result;
    }

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

    // SECURITY: Cache ONLY scrubbed result, keyed by hash (not raw input)
    scrubCache.set(inputHash, scrubbed);

    return scrubbed;
  } catch (error) {
    // Graceful failure: never return unscrubbed text
    logger.error('Scrubbing failed, returning safe placeholder', { error });
    return '[SCRUBBING_FAILED]';
  }
}

export function isSecretKey(key: string): boolean {
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

export function isWhitelisted(key: string): boolean {
  const lower = key.toLowerCase();

  // Check built-in whitelist
  if (WHITELIST_KEYS.has(lower)) return true;

  // Check user-defined whitelist patterns
  for (const pattern of userWhitelistPatterns) {
    if (matchesGlobPattern(key, pattern)) return true;
  }

  return false;
}

function matchesGlobPattern(text: string, pattern: string): boolean {
  // Simple glob matching: *_KEY, *_VALUE, etc.
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
  return regex.test(text);
}

export function clearCache() {
  scrubCache.clear();
}

export function scrubObject<T>(obj: T, visited: WeakSet<object> = new WeakSet()): T {
  if (!obj || typeof obj !== 'object') return obj;

  // SECURITY: Prevent stack overflow from cyclic references
  if (visited.has(obj)) {
    return '[CIRCULAR]' as any;
  }
  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        return scrubSecrets(item);
      }
      return scrubObject(item, visited);
    }) as T;
  }

  const scrubbed: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSecretKey(key) && !isWhitelisted(key)) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      scrubbed[key] = scrubObject(value, visited);
    } else if (typeof value === 'string') {
      scrubbed[key] = scrubSecrets(value);
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed as T;
}
```

**End-User Success:** Developers can use simple functions without understanding regex patterns. The API is intuitive and safe by default. Users can customize patterns via config without code changes.

---

### 2. Logger Integration

**File:** `src/utils/logger.ts` (modify existing)

**Changes Required:**

```typescript
import { scrubSecrets, scrubObject } from './scrubber';

export class Logger {
  // ... existing code ...

  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const color = this.getColor(level);

    // SCRUB MESSAGE BEFORE FORMATTING
    const scrubbedMessage = scrubSecrets(message);

    let output = `${colors.gray}[${timestamp}]${colors.reset} ${color}[${levelStr}]${colors.reset} ${scrubbedMessage}`;

    if (context) {
      // SCRUB CONTEXT BEFORE FORMATTING (includes stack traces)
      const scrubbedContext = scrubObject(context);

      // Special handling for Error objects with stack traces
      if (context instanceof Error || context.stack) {
        scrubbedContext.stack = scrubSecrets(context.stack || '');
      }

      output += `\n   ${JSON.stringify(scrubbedContext, null, 2)}`;
    }

    return output;
  }

  // Ensure all errors go through logger
  public logError(error: Error, additionalContext?: any) {
    const context = {
      message: error.message,
      stack: error.stack,
      ...additionalContext
    };
    this.error('Error occurred', context);
  }
}
```

**Why This Works:**

- Minimal changes to existing logger
- Scrubbing happens before any output
- No breaking changes to logger API
- All existing code continues to work
- Stack traces scrubbed via context object scrubbing
- File operation messages scrubbed automatically

**End-User Success:** Users can log anything (including secrets, file paths, stack traces) and they're automatically scrubbed. No code changes needed in application code.

---

### 3. Error Message Integration

**File:** `src/utils/errorMessages.ts` (modify existing)

**Changes Required:**

```typescript
import { scrubSecrets, scrubObject } from './scrubber';

export function buildErrorMessage(msg: ErrorMessage): string {
  // SCRUB ALL MESSAGE PARTS
  const what = scrubSecrets(msg.what);
  const why = msg.why ? scrubSecrets(msg.why) : undefined;
  const howToFix = msg.howToFix ? scrubSecrets(msg.howToFix) : undefined;

  const lines = [
    `${colors.red}❌ ${what}${colors.reset}`,
  ];

  if (why) lines.push(`   ${why}`);
  if (howToFix) lines.push(`   ${colors.cyan}${howToFix}${colors.reset}`);

  return lines.join('\n');
}

export function formatContext(context: Record<string, any>): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  // SCRUB CONTEXT BEFORE FORMATTING
  const scrubbedContext = scrubObject(context);

  const lines = Object.entries(scrubbedContext).map(
    ([key, value]) => `   ${key}: ${JSON.stringify(value)}`
  );

  return `\n${colors.gray}Context:${colors.reset}\n${lines.join('\n')}`;
}
```

**End-User Success:** Error messages are safe to share. Users can copy-paste errors into GitHub issues without security review.

---

### 4. GitIgnore Validator

**File:** `src/utils/gitignoreValidator.ts` (new)

**Purpose:** Validate and fix .gitignore for secret protection.

**API Design:**

```typescript
export interface ValidationResult {
  isValid: boolean;
  missingPatterns: string[];
  gitignoreExists: boolean;
  gitignorePath: string;
}

export function validateGitignore(projectRoot?: string): ValidationResult;
export function fixGitignore(projectRoot?: string): void;
export function getRequiredPatterns(): string[];
```

**Implementation:**

```typescript
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Patterns in correct order (wildcards before negations)
const REQUIRED_PATTERNS = [
  '.env',
  '.env.*',
  '!.env.example',  // Negation must come after wildcards
  '**/bak/',
  '*.bak',
];

export function getRequiredPatterns(): string[] {
  return [...REQUIRED_PATTERNS];
}

export function validateGitignore(projectRoot: string = process.cwd()): ValidationResult {
  const gitignorePath = join(projectRoot, '.gitignore');
  const gitignoreExists = existsSync(gitignorePath);

  if (!gitignoreExists) {
    return {
      isValid: false,
      missingPatterns: REQUIRED_PATTERNS,
      gitignoreExists: false,
      gitignorePath,
    };
  }

  let content: string;
  try {
    content = readFileSync(gitignorePath, 'utf-8');
  } catch (error) {
    // Handle malformed .gitignore (invalid encoding, etc.)
    logger.warn('Failed to read .gitignore, may be malformed', { error });
    return {
      isValid: false,
      missingPatterns: REQUIRED_PATTERNS,
      gitignoreExists: true,
      gitignorePath,
    };
  }

  const lines = content.split('\n').map(line => line.trim());

  // Check for invalid syntax (basic validation)
  const hasInvalidSyntax = lines.some(line => {
    // Check for unclosed brackets, invalid regex patterns
    return line.includes('[') && !line.includes(']');
  });

  if (hasInvalidSyntax) {
    logger.warn('.gitignore contains invalid syntax');
  }

  const missingPatterns = REQUIRED_PATTERNS.filter(pattern => {
    // Normalize pattern for cross-platform (always use forward slashes)
    const normalizedPattern = pattern.replace(/\\/g, '/');
    return !lines.some(line => {
      const normalizedLine = line.replace(/\\/g, '/');
      return normalizedLine === normalizedPattern || 
             normalizedLine.includes(normalizedPattern.replace('**/', ''));
    });
  });

  // Validate pattern order (negations should come after wildcards)
  const envIndex = lines.findIndex(l => l === '.env' || l === '.env.*');
  const negationIndex = lines.findIndex(l => l === '!.env.example');
  if (envIndex >= 0 && negationIndex >= 0 && negationIndex < envIndex) {
    logger.warn('.gitignore pattern order incorrect: negations should come after wildcards');
  }

  return {
    isValid: missingPatterns.length === 0 && !hasInvalidSyntax,
    missingPatterns,
    gitignoreExists: true,
    gitignorePath,
  };
}

export function fixGitignore(projectRoot: string = process.cwd()): void {
  const gitignorePath = join(projectRoot, '.gitignore');
  const validation = validateGitignore(projectRoot);

  if (validation.isValid) {
    console.log('✓ .gitignore already contains all required patterns');
    return;
  }

  let content = '';
  if (validation.gitignoreExists) {
    content = readFileSync(gitignorePath, 'utf-8');
    // Ensure file ends with newline
    if (!content.endsWith('\n')) {
      content += '\n';
    }
  }

  // Add comment and missing patterns in correct order
  content += '\n# Secrets protection (added by secrets-sync-cli)\n';

  // Always use forward slashes for cross-platform compatibility
  const normalizedPatterns = validation.missingPatterns.map(p => p.replace(/\\/g, '/'));
  content += normalizedPatterns.join('\n') + '\n';

  writeFileSync(gitignorePath, content, 'utf-8');

  console.log(`✓ Added ${validation.missingPatterns.length} patterns to .gitignore`);
  validation.missingPatterns.forEach(pattern => {
    console.log(`  + ${pattern}`);
  });
}
```

**Cross-Platform Support:**

- Always use forward slashes in .gitignore (Git standard)
- Normalize paths when comparing patterns
- Works on Windows, macOS, and Linux

**Pattern Order Enforcement:**

- Wildcards (`.env`, `.env.*`) come first
- Negations (`!.env.example`) come after wildcards
- Validation warns if order is incorrect

**Malformed .gitignore Handling:**

- Detects invalid syntax (unclosed brackets)
- Handles read errors gracefully
- Logs warnings for user awareness

**End-User Success:** Users get proactive warnings about .gitignore issues and can fix them with one command. Works consistently across all platforms. Prevents accidental commits of secrets.

---

### 5. CLI Integration & Console Interception

**File:** `src/secrets-sync.ts` (modify existing)

**SECURITY CRITICAL:** Intercept all console output to prevent scrubbing bypass

**Changes Required:**

```typescript
import { validateGitignore, fixGitignore } from './utils/gitignoreValidator';
import { clearCache, loadUserConfig, scrubSecrets, scrubObject } from './utils/scrubber';

## Bootstrap Architecture (Module Initialization Protection)

**File:** `src/bootstrap.ts` (runs BEFORE any other module)

```typescript
// SECURITY: This file MUST be imported first to intercept streams before any module initialization
// Usage: node --require ./dist/bootstrap.js ./dist/secrets-sync.js
// OR: Import this at the very top of secrets-sync.ts before any other imports

import { scrubSecrets, scrubObject, loadUserConfig } from './utils/scrubber';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

// SECURITY: Load user config BEFORE interception so custom patterns are active during module init
try {
  const configPath = join(process.cwd(), 'env-config.yml');
  if (existsSync(configPath)) {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = parseYaml(configContent);
    loadUserConfig(config);
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
    chunk = Buffer.from(scrubSecrets(chunk.toString()));
  }
  return originalWrite.stdout(chunk, ...args);
} as any;

// Intercept process.stderr.write
process.stderr.write = function(chunk: any, ...args: any[]): boolean {
  if (typeof chunk === 'string') {
    chunk = scrubSecrets(chunk);
  } else if (Buffer.isBuffer(chunk)) {
    chunk = Buffer.from(scrubSecrets(chunk.toString()));
  }
  return originalWrite.stderr(chunk, ...args);
} as any;

// SECURITY: Intercept ALL console methods using Proxy to prevent bypass
const originalConsole = { ...console };

// Generic scrubbing wrapper for any console method
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
        // Scrub all arguments before passing to original method
        const scrubbedArgs = scrubArgs(...args);
        return original.apply(target, scrubbedArgs);
      };
    }

    return original;
  }
});

// Replace global console with proxy
Object.assign(console, consoleProxy);
```

**File:** `src/secrets-sync.ts` (main CLI entry)

```typescript
// SECURITY: Bootstrap MUST be imported first, before any other imports
import './bootstrap'; // Establishes stream/console interception

// Now safe to import other modules - they cannot bypass scrubbing
import { logger } from './utils/logger';
import { loadConfig } from './utils/config';
// ... other imports ...

interface Flags {
  // ... existing flags ...
  fixGitignore?: boolean;
}

async function main() {
  const flags = parseFlags();

  // User config already loaded in bootstrap for security
  // No need to reload here

  // Handle --fix-gitignore flag
  if (flags.fixGitignore) {
    fixGitignore();
    process.exit(0);
  }

  // Validate .gitignore on startup (unless skipped)
  if (!process.env.SKIP_GITIGNORE_CHECK) {
    const validation = validateGitignore();
    if (!validation.isValid) {
      logger.warn('⚠️  Security Warning: Your .gitignore may not protect secrets\n');
      logger.warn('Missing patterns in .gitignore:');
      validation.missingPatterns.forEach(pattern => {
        logger.warn(`  - ${pattern}`);
      });
      logger.warn('\nThese files contain secrets and should not be committed.\n');
      logger.warn('Fix: Run with --fix-gitignore flag');
      logger.warn('  secrets-sync --fix-gitignore\n');
    }
  }

  try {
    // ... rest of existing code ...
  } finally {
    // Clear scrubbing cache after each run
    clearCache();
  }
}
```

**Console & Stream Interception Strategy:**

- Intercept process.stdout.write and process.stderr.write at CLI startup (handles direct stream writes)
- Intercept console.log, console.error, console.warn, console.info, console.debug, console.trace, console.dir, console.table
- Scrub all string arguments and Buffer chunks before passing to original methods
- Applies to ALL code paths: logger calls, console calls, direct stream writes, third-party libraries
- No code path can bypass scrubbing (defense in depth: streams + console + logger + error builder)

**Cache Management:**

- Cache loaded at startup
- User config patterns loaded from env-config.yml
- Cache cleared after each CLI run (prevents memory growth)
- LRU eviction during run (max 1000 entries)

**End-User Success:** Users are warned about .gitignore issues every time they run the CLI, making it hard to miss. One-command fix available. Custom patterns work without code changes. ALL console output is scrubbed - no bypass possible.

---

## Integration Points

### Existing Infrastructure (Leverage)

```mermaid
graph LR
    A[Existing Logger] --> B[Add Scrubber Import]
    C[Existing Error Builder] --> D[Add Scrubber Import]
    E[Existing CLI] --> F[Add GitIgnore Check]

    B --> G[Scrub Before Output]
    D --> G
    F --> H[Warn User]

    style G fill:#f96
    style H fill:#ff6
```

**Integration Strategy:**

1. **Logger Module** - Add 2 lines of scrubbing code
2. **Error Message Builder** - Add 3 lines of scrubbing code
3. **CLI Entry Point** - Add .gitignore validation check
4. **No Breaking Changes** - All existing code continues to work

**Why This Approach:**

- Minimal code changes
- Leverages existing infrastructure
- No refactoring required
- Easy to test incrementally

---

## Implementation Phases

### Phase 1: Core Scrubbing (Days 1-2)

**Goal:** Create scrubber module with pattern matching

**Tasks:**

1. Create `src/utils/scrubber.ts`
2. Implement `scrubSecrets()` function
3. Implement `scrubObject()` function
4. Implement `isSecretKey()` function
5. Define pattern constants
6. Write unit tests (100% coverage)

**Deliverables:**

- Scrubber module with all functions
- 20+ unit tests
- Performance benchmark (< 1ms per call)

**Validation:**

```bash
bun test tests/unit/scrubber.test.ts
bun run scripts/benchmark-scrubbing.ts
```

**End-User Impact:** Foundation for all scrubbing. No user-facing changes yet.

---

### Phase 2: Logger Integration (Day 3)

**Goal:** Integrate scrubbing into logger module

**Tasks:**

1. Import scrubber in logger.ts
2. Add scrubbing to formatMessage()
3. Add scrubbing to context formatting
4. Update logger tests
5. Add integration tests

**Deliverables:**

- Modified logger with scrubbing
- 10+ integration tests
- All existing logger tests pass

**Validation:**

```bash
bun test tests/unit/logger.test.ts
bun test tests/integration/logger-scrubbing.test.ts
```

**End-User Impact:** All log output is now scrubbed. Users can safely use verbose mode.

---

### Phase 3: Error Message Integration (Day 4)

**Goal:** Integrate scrubbing into error messages

**Tasks:**

1. Import scrubber in errorMessages.ts
2. Add scrubbing to buildErrorMessage()
3. Add scrubbing to formatContext()
4. Update error message tests
5. Add integration tests

**Deliverables:**

- Modified error builder with scrubbing
- 8+ integration tests
- All existing error tests pass

**Validation:**

```bash
bun test tests/unit/errorMessages.test.ts
bun test tests/integration/error-scrubbing.test.ts
```

**End-User Impact:** All error messages are now scrubbed. Users can safely share errors.

---

### Phase 4: GitIgnore Validation (Days 5-6)

**Goal:** Add .gitignore validation and auto-fix

**Tasks:**

1. Create `src/utils/gitignoreValidator.ts`
2. Implement `validateGitignore()` function
3. Implement `fixGitignore()` function
4. Add `--fix-gitignore` CLI flag
5. Add startup validation check
6. Write unit and integration tests

**Deliverables:**

- GitIgnore validator module
- CLI flag and startup check
- 15+ tests
- Updated help text

**Validation:**

```bash
bun test tests/unit/gitignoreValidator.test.ts
bun test tests/integration/gitignore.test.ts
secrets-sync --fix-gitignore
```

**End-User Impact:** Users get proactive warnings and can fix .gitignore with one command.

---

### Phase 5: E2E Testing & Polish (Days 7-8)

**Goal:** Comprehensive testing and documentation

**Tasks:**

1. Write E2E tests for complete user journeys
2. Performance testing and optimization
3. Security validation (no leaks possible)
4. Update documentation
5. Update CHANGELOG
6. Create examples

**Deliverables:**

- 10+ E2E tests
- Performance benchmarks
- Security audit report
- Updated docs

**Validation:**

```bash
bun test tests/e2e/scrubbing.test.ts
bun run scripts/security-audit.ts
```

**End-User Impact:** Confidence that scrubbing works in all scenarios. Complete documentation.

---

## Testing Strategy

### Unit Tests (Target: 100% coverage)

**Scrubber Module:**

```typescript
describe('scrubSecrets', () => {
  it('should redact KEY=value patterns', () => {
    expect(scrubSecrets('API_KEY=secret123')).toBe('API_KEY=[REDACTED]');
  });

  it('should preserve key names', () => {
    const result = scrubSecrets('PASSWORD=secret');
    expect(result).toContain('PASSWORD');
    expect(result).not.toContain('secret');
  });

  it('should redact URL credentials', () => {
    const input = 'postgres://user:pass@localhost/db';
    const result = scrubSecrets(input);
    expect(result).toBe('postgres://user:[REDACTED]@localhost/db');
  });

  it('should not redact whitelisted keys', () => {
    expect(scrubSecrets('DEBUG=true')).toBe('DEBUG=true');
    expect(scrubSecrets('PORT=3000')).toBe('PORT=3000');
  });

  it('should handle edge cases', () => {
    expect(scrubSecrets('')).toBe('');
    expect(scrubSecrets(null as any)).toBe(null);
    expect(scrubSecrets(undefined as any)).toBe(undefined);
  });
});

describe('scrubObject', () => {
  it('should scrub object values', () => {
    const input = { apiKey: 'secret', debug: true };
    const result = scrubObject(input);
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.debug).toBe(true);
  });

  it('should scrub nested objects', () => {
    const input = { config: { password: 'secret' } };
    const result = scrubObject(input);
    expect(result.config.password).toBe('[REDACTED]');
  });

  it('should scrub arrays', () => {
    const input = ['API_KEY=secret', 'DEBUG=true'];
    const result = scrubObject(input);
    expect(result[0]).toBe('API_KEY=[REDACTED]');
    expect(result[1]).toBe('DEBUG=true');
  });
});
```

### Integration Tests

**Logger Integration:**

```typescript
describe('Logger with Scrubbing', () => {
  it('should scrub secrets in error logs', () => {
    const output = captureOutput(() => {
      logger.error('Failed: API_KEY=secret123');
    });
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('secret123');
  });

  it('should scrub context objects', () => {
    const output = captureOutput(() => {
      logger.error('Failed', { apiKey: 'secret' });
    });
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('secret');
  });
});
```

**Error Message Integration:**

```typescript
describe('Error Messages with Scrubbing', () => {
  it('should scrub secrets in error messages', () => {
    const msg = buildErrorMessage({
      what: 'API call failed with API_KEY=secret',
      why: 'Invalid credentials',
      howToFix: 'Check your API_KEY',
    });
    expect(msg).toContain('[REDACTED]');
    expect(msg).not.toContain('secret');
  });
});
```

### E2E Tests

**Complete User Journeys:**

```typescript
describe('E2E: Secret Scrubbing', () => {
  it('should scrub secrets in complete error flow', () => {
    // Simulate error with secret
    const output = runCLI(['--env', 'staging'], {
      env: { API_KEY: 'secret123' }
    });

    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('secret123');
  });

  it('should warn about missing .gitignore patterns', () => {
    // Remove .env from .gitignore
    removeFromGitignore('.env');

    const output = runCLI(['--dry-run']);
    expect(output).toContain('Security Warning');
    expect(output).toContain('.env');
  });

  it('should fix .gitignore with --fix-gitignore', () => {
    removeFromGitignore('.env');

    runCLI(['--fix-gitignore']);

    const gitignore = readGitignore();
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('**/bak/');
  });
});
```

---

## Performance Considerations

### Optimization Strategies

1. **Compile Patterns Once**
   
   ```typescript
   // At module load time, not per call
   const PATTERNS = {
     keyValue: /([A-Z_]+)=([^\s]+)/gi,
     // ... other patterns
   };
   ```

2. **Early Returns**
   
   ```typescript
   export function scrubSecrets(text: string): string {
     if (!text || typeof text !== 'string') return text;
     if (text.length === 0) return text;
     // ... scrubbing logic
   }
   ```

3. **Avoid Unnecessary Work**
   
   ```typescript
   // Only scrub if text contains potential secrets
   if (!text.includes('=') && !text.includes('://')) {
     return text;  // Fast path
   }
   ```

4. **Benchmark Target**
   
   - Scrubbing: < 1ms per operation
   - CLI startup: < 10ms overhead
   - Memory: < 1MB additional

### Performance Testing

```typescript
// scripts/benchmark-scrubbing.ts
const iterations = 10000;
const testCases = [
  'API_KEY=secret123',
  'postgres://user:pass@localhost/db',
  'Normal text without secrets',
];

for (const testCase of testCases) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    scrubSecrets(testCase);
  }
  const duration = performance.now() - start;
  const avgMs = duration / iterations;

  console.log(`${testCase}: ${avgMs.toFixed(3)}ms per call`);
  if (avgMs > 1) {
    throw new Error(`Performance target missed: ${avgMs}ms > 1ms`);
  }
}
```

---

## Security Considerations

### Threat Model

**Threats:**

1. Secret values in error messages
2. Secret values in log output
3. Secret values in stack traces
4. Accidental commit of secret files
5. Secret values in CI/CD logs

**Mitigations:**

1. ✅ Scrub all error messages
2. ✅ Scrub all log output
3. ✅ Scrub stack traces
4. ✅ Validate .gitignore
5. ✅ Scrubbing always enabled

### Security Validation

**Checklist:**

- [ ] No secrets in console.log output
- [ ] No secrets in console.error output
- [ ] No secrets in logger output (all levels)
- [ ] No secrets in error messages
- [ ] No secrets in stack traces
- [ ] No secrets in context objects
- [ ] .gitignore validation works
- [ ] --fix-gitignore adds all patterns
- [ ] Scrubbing cannot be disabled
- [ ] Performance acceptable (< 1ms)

**Security Audit Script:**

```bash
# scripts/security-audit.sh
#!/bin/bash

echo "Running security audit..."

# Test 1: No secrets in output
echo "Test 1: Checking for secret leakage..."
output=$(API_KEY=secret123 secrets-sync --dry-run 2>&1)
if echo "$output" | grep -q "secret123"; then
  echo "❌ FAIL: Secret leaked in output"
  exit 1
fi
echo "✓ PASS: No secrets in output"

# Test 2: .gitignore validation
echo "Test 2: Checking .gitignore validation..."
# ... more tests

echo "✓ All security checks passed"
```

---

## End-User Success Validation

### Success Criteria

**Users can successfully:**

1. ✅ **Share error messages safely**
   
   - Copy-paste any error into GitHub issues
   - Share terminal output during pair programming
   - Post logs in public forums

2. ✅ **Debug with confidence**
   
   - See which key caused the error (name preserved)
   - Understand error context (structure preserved)
   - Get actionable fix commands

3. ✅ **Run in CI/CD safely**
   
   - CI logs don't contain secrets
   - Build failures can be investigated
   - Audit logs are safe to store

4. ✅ **Use verbose mode without risk**
   
   - `--verbose` shows debug info but scrubs secrets
   - Detailed logging for troubleshooting

5. ✅ **Prevent accidental commits**
   
   - Get warned about .gitignore issues
   - Fix with one command
   - Confidence secrets won't be committed

### Validation Methods

**Manual Testing:**

```bash
# Test 1: Error with secret
echo "API_KEY=secret123" > test.env
secrets-sync --dry-run
# Should show [REDACTED], not secret123

# Test 2: Verbose mode
secrets-sync --verbose --dry-run
# Should scrub all debug output

# Test 3: .gitignore warning
rm .gitignore
secrets-sync --dry-run
# Should show warning

# Test 4: .gitignore fix
secrets-sync --fix-gitignore
# Should add patterns to .gitignore
```

**Automated Testing:**

```bash
bun test  # All tests pass
bun run scripts/security-audit.sh  # Security checks pass
bun run scripts/benchmark-scrubbing.ts  # Performance acceptable
```

---

## Rollout Strategy

### Phase 1: Internal Testing

- Run on development machines
- Test with real secrets (in safe environment)
- Validate no false positives/negatives

### Phase 2: Beta Release

- Release as beta version
- Gather user feedback
- Monitor for issues

### Phase 3: Production Release

- Full release to all users
- Update documentation
- Announce security improvements

---

## Appendix: Pattern Examples

### Supported Secret Patterns

```typescript
// 1. KEY=value
"API_KEY=sk_live_123" → "API_KEY=[REDACTED]"
"PASSWORD=secret" → "PASSWORD=[REDACTED]"

// 2. URL credentials
"postgres://user:pass@host" → "postgres://user:[REDACTED]@host"
"https://user:pass@api.com" → "https://user:[REDACTED]@api.com"

// 3. JWT tokens
"eyJhbGc...xyz" → "[REDACTED:JWT]"

// 4. Private keys
"-----BEGIN PRIVATE KEY-----\n..." → "[REDACTED:PRIVATE_KEY]"

// 5. Nested in objects
{ apiKey: "secret" } → { apiKey: "[REDACTED]" }

// 6. In arrays
["API_KEY=secret"] → ["API_KEY=[REDACTED]"]
```

### Whitelisted Patterns (Not Scrubbed)

```typescript
"DEBUG=true" → "DEBUG=true"  // Boolean
"PORT=3000" → "PORT=3000"  // Number
"NODE_ENV=production" → "NODE_ENV=production"  // Common env var
"URL=https://api.com" → "URL=https://api.com"  // URL without creds
```

---

## Summary

**Design Principles:**

1. ✅ Centralized scrubbing at output layer
2. ✅ Leverage existing infrastructure
3. ✅ No breaking changes
4. ✅ Always enabled (no opt-out)
5. ✅ Performance optimized (< 1ms)
6. ✅ Comprehensive testing (100% coverage)

**Implementation Phases:**

- Phase 1: Core Scrubbing (2 days)
- Phase 2: Logger Integration (1 day)
- Phase 3: Error Message Integration (1 day)
- Phase 4: GitIgnore Validation (2 days)
- Phase 5: E2E Testing & Polish (2 days)

**Total Estimate:** 8 days

**End-User Impact:**

- Safe error sharing
- Safe verbose logging
- Safe CI/CD logs
- Proactive .gitignore protection
- Zero configuration required
- No performance impact
