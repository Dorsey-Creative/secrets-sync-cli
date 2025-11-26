# Critical Security Fixes

**Date:** 2025-11-25  
**Priority:** P1 (CRITICAL)  
**Status:** ✅ Fixed in Documentation

---

## P1 Issue #10: Requirements Still Mandate Fake Timeout

### Problem

FR-7.6 and Task 1.3 still required implementing the fake timeout mechanism despite P1 Issue #7 documenting it doesn't work:

```typescript
// requirements.md FR-7.6
- FR-7.6: Regex timeout protection (max 100ms per pattern match) // ❌ Doesn't work

// tasks.md Task 1.3
- [ ] Implement regex timeout wrapper function // ❌ Security theater
- [ ] Implement KEY=value pattern scrubbing with timeout protection // ❌ Fake protection
```

**Security Impact:**

- Engineers would implement the insecure timeout mechanism
- False sense of security from non-existent guard
- DoS vulnerability reintroduced despite being "fixed"
- Reviewers lulled into thinking protection exists

### Solution

Update requirements and tasks to mandate length limits instead:

```typescript
// requirements.md FR-7.6
- FR-7.6: Input length limit (50KB max) to prevent catastrophic backtracking // ✅ Real protection

// tasks.md Task 1.3
- [ ] Implement input length limit check (50KB max, return placeholder if exceeded) // ✅ Works
```

**Security Benefits:**

- Engineers implement real DoS protection
- No false sense of security
- Consistent with design documentation
- Actually prevents catastrophic backtracking

### Changes Made

- **requirements.md:** Updated FR-7.6 to require length limits (not timeout)
- **tasks.md:** Updated Task 1.3 to remove timeout wrapper, add length check
- **tasks.md:** Reduced Task 1.3 time: 5 hours → 4 hours (-1 hour)

---

## P1 Issue #11: Missing Console Methods

### Problem

Bootstrap only intercepted 8 specific console methods:

```typescript
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
  dir: console.dir,
  table: console.table,
};

// ❌ Missing: assert, count, countReset, group, groupCollapsed, groupEnd,
//            time, timeEnd, timeLog, clear, etc.
```

**Security Impact:**

- `console.assert(false, 'API_KEY=secret')` leaks secrets
- `console.timeLog('label', 'PASSWORD=admin')` leaks secrets
- `console.group('TOKEN=abc123')` leaks secrets
- Any new console methods added to Node bypass scrubbing
- Breaks "no code path can bypass scrubbing" guarantee

### Solution

Use Proxy to intercept ALL console methods:

```typescript
// Wrap console with Proxy to intercept ALL methods (including future ones)
const consoleProxy = new Proxy(console, {
  get(target: any, prop: string) {
    const original = target[prop];

    if (typeof original === 'function') {
      return function(...args: any[]) {
        const scrubbedArgs = scrubArgs(...args);
        return original.apply(target, scrubbedArgs);
      };
    }

    return original;
  }
});

Object.assign(console, consoleProxy);
```

**Security Benefits:**

- ALL console methods intercepted (15+ methods)
- Future console methods automatically intercepted
- No way to bypass by using obscure console methods
- Simpler code (no need to enumerate every method)

### Changes Made

- **requirements.md:** Added FR-1.13 for Proxy-based console interception
- **design.md:** Replaced explicit method interception with Proxy
- **tasks.md:** Updated Task 1.0 to use Proxy instead of 8 specific methods

---

## P2 Issue #12: Cyclic References Cause Stack Overflow

### Problem

`scrubObject()` recursively walked objects without tracking visited nodes:

```typescript
export function scrubObject<T>(obj: T): T {
  // ...
  if (typeof value === 'object') {
    scrubbed[key] = scrubObject(value); // ❌ No cycle detection
  }
  // ...
}
```

**Security Impact:**

- Cyclic input causes infinite recursion: `const ctx = {}; ctx.self = ctx;`
- Stack overflow crashes the CLI
- Crash happens BEFORE output is scrubbed
- Node prints fatal stack trace with original unscrubbed secret
- DoS vulnerability + secret leak

**Example Attack:**

```typescript
const ctx: any = { apiKey: 'secret123' };
ctx.self = ctx;
logger.error('Error', ctx); // ❌ Stack overflow, leaks 'secret123' in crash
```

### Solution

Add cycle detection using WeakSet:

```typescript
export function scrubObject<T>(obj: T, visited: WeakSet<object> = new WeakSet()): T {
  if (!obj || typeof obj !== 'object') return obj;

  // SECURITY: Prevent stack overflow from cyclic references
  if (visited.has(obj)) {
    return '[CIRCULAR]' as any;
  }
  visited.add(obj);

  // ... rest of scrubbing logic with visited set passed through ...
}
```

**Security Benefits:**

- Cyclic references handled gracefully
- No stack overflow or crashes
- Secrets never leak in crash dumps
- WeakSet doesn't prevent garbage collection
- Standard pattern used by JSON.stringify

### Changes Made

- **requirements.md:** Added FR-2.5 for cyclic reference handling
- **design.md:** Added WeakSet cycle detection to `scrubObject()`
- **tasks.md:** Updated Task 1.4 to include cycle detection and validation

---

## P1 Issue #8: Arrays of Strings Bypass Scrubbing

### Problem

The `scrubObject()` function processes arrays element-by-element, but returns string elements without scrubbing:

```typescript
export function scrubObject<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(item => scrubObject(item)) as T; // ❌ Recursion doesn't scrub strings
  }
  // ...
}
```

When `scrubObject(item)` is called on a string, the first line returns it immediately:

```typescript
if (!obj || typeof obj !== 'object') return obj; // ❌ Returns unscrubbed string
```

**Security Impact:**

- `console.log(['API_KEY=secret123'])` leaks the secret
- Any third-party logger that writes arrays of strings bypasses scrubbing
- Common pattern in logging libraries: `logger.info(['message', context])`
- Breaks "no code path can bypass scrubbing" guarantee

### Solution

Explicitly scrub string elements in arrays:

```typescript
export function scrubObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        return scrubSecrets(item); // ✅ Scrub strings
      }
      return scrubObject(item); // Recurse for objects
    }) as T;
  }
  // ...
}
```

**Security Benefits:**

- Arrays of strings now scrubbed correctly
- Handles nested arrays: `[['API_KEY=secret']]`
- Works with mixed arrays: `['text', { key: 'value' }]`

### Changes Made

- **requirements.md:** Added FR-1.11 for array string scrubbing
- **design.md:** Updated `scrubObject()` to scrub string array elements
- **tasks.md:** Updated Task 1.0 (+1 hour) with array scrubbing validation

---

## P2 Issue #9: Custom Patterns Inactive During Bootstrap

### Problem

Bootstrap loads and establishes interception, but user config loads later in `main()`:

```typescript
// src/bootstrap.ts
import { scrubSecrets, scrubObject } from './utils/scrubber';
// Interception happens here with ONLY built-in patterns

// src/secrets-sync.ts
import './bootstrap';
// ... other imports that might log during init ...

async function main() {
  loadUserConfig(loadConfig()); // ❌ TOO LATE - modules already initialized
}
```

**Security Impact:**

- Custom patterns from `env-config.yml` ignored during module initialization
- Organization-specific secrets (e.g., `CUSTOM_TOKEN`) leak during module init
- Third-party dependencies that log on import bypass custom patterns
- Contradicts FR-1.9 guarantee for custom patterns

### Solution

Load user config in bootstrap BEFORE interception:

```typescript
// src/bootstrap.ts
import { scrubSecrets, scrubObject, loadUserConfig } from './utils/scrubber';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

// SECURITY: Load user config BEFORE interception
try {
  const configPath = join(process.cwd(), 'env-config.yml');
  if (existsSync(configPath)) {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = parseYaml(configContent);
    loadUserConfig(config); // ✅ Custom patterns now active
  }
} catch (error) {
  // Silently fail - built-in patterns still work
}

// Now establish interception with custom patterns active
process.stdout.write = function(...) { ... };
```

**Security Benefits:**

- Custom patterns active during ALL module initialization
- Organization-specific secrets protected from the start
- No window where custom patterns are inactive
- Graceful fallback if config missing or invalid

### Changes Made

- **requirements.md:** Added FR-1.12 for bootstrap config loading
- **design.md:** Added config loading to bootstrap before interception
- **tasks.md:** Updated Task 1.0 (+1 hour, now 2 hours total) with config loading

---

## P1 Issue #6: Module Initialization Bypass

### Problem

The original design placed stream/console interception inside `main()` in `src/secrets-sync.ts`:

```typescript
// src/secrets-sync.ts
import { logger } from './utils/logger'; // ❌ Runs BEFORE interception
import { loadConfig } from './utils/config'; // ❌ Runs BEFORE interception

// Interception happens here (TOO LATE)
process.stdout.write = function(...) { ... };

async function main() {
  // ...
}
```

**Security Impact:**

- All static imports execute BEFORE the interception code runs
- Any module that logs during initialization leaks secrets
- Third-party dependencies that log on import bypass scrubbing
- Defeats FR-1.9/NFR-4 guarantee: "no code path can bypass scrubbing"

### Solution

Create `src/bootstrap.ts` that runs BEFORE any other module:

```typescript
// src/bootstrap.ts - Runs FIRST
import { scrubSecrets, scrubObject } from './utils/scrubber';

// Intercept streams/console BEFORE any other code
process.stdout.write = function(...) { ... };
console.log = function(...) { ... };
// ... all interception code ...
```

```typescript
// src/secrets-sync.ts - Import bootstrap FIRST
import './bootstrap'; // ✅ Establishes interception

// Now safe to import - cannot bypass scrubbing
import { logger } from './utils/logger';
import { loadConfig } from './utils/config';
```

**Security Benefits:**

- Interception runs before ANY module initialization
- Third-party dependencies automatically protected
- Module-level console.log/process.stdout.write calls scrubbed
- True guarantee: no code path can bypass scrubbing

### Changes Made

- **requirements.md:** Added FR-1.10 for bootstrap architecture
- **design.md:** Added Bootstrap Architecture section with bootstrap.ts code
- **tasks.md:** Added Task 1.0 (1 hour) for bootstrap file creation
- **Test count:** 83+ → 85+ tests (added bootstrap initialization tests)

---

## P1 Issue #7: Fake Regex Timeout

### Problem

Requirements FR-1.7/FR-1.8 called for 100ms regex timeout, and the design added a `safeRegexMatch` helper:

```typescript
function safeRegexMatch(pattern: RegExp, text: string, timeout: number = 100): RegExpMatchArray | null {
  const startTime = Date.now();
  const match = text.match(pattern); // ❌ Cannot be interrupted
  if (Date.now() - startTime > timeout) {
    return null; // ❌ TOO LATE - regex already completed
  }
  return match;
}
```

**Security Impact:**

- Measuring `Date.now()` AFTER regex completes cannot prevent catastrophic backtracking
- A crafted 50KB input with `AAAA...A=` triggers backtracking in keyValue pattern
- CLI hangs indefinitely despite "timeout protection"
- DoS vulnerability remains despite documentation claiming it's fixed
- JavaScript regex cannot be truly interrupted mid-execution

### Solution

Use **input length limits** instead of fake timeouts:

```typescript
export function scrubSecrets(text: string): string {
  // SECURITY: Length-based DoS protection
  // JavaScript regex cannot be interrupted, so we limit input size
  if (text.length > 50000) {
    return '[SCRUBBING_FAILED:INPUT_TOO_LARGE]';
  }

  // Now safe to run regex - input size bounded
  scrubbed = scrubbed.replace(SECRET_PATTERNS.keyValue, ...);
  // ...
}
```

**Security Benefits:**

- Real DoS protection (not security theater)
- Prevents catastrophic backtracking by limiting input size
- Simple, testable, and actually works
- No false sense of security from fake timeouts

### Changes Made

- **requirements.md:** Updated FR-1.7/FR-1.8 to use length limits (50KB) instead of timeouts
- **design.md:** Removed `safeRegexMatch` helper, added length check in `scrubSecrets()`
- **tasks.md:** Updated Task 1.2 to use "input length limit" instead of "regex timeout"

---

## P1 Issue #5: Direct Stream Writes Bypass Scrubbing

### Problem

The original design only intercepted `console.*` methods, but Node.js code can write directly to streams:

```typescript
// Console interception catches this:
console.log('API_KEY=secret123'); // ✅ Scrubbed

// But direct stream writes bypass scrubbing:
process.stdout.write('API_KEY=secret123\n'); // ❌ LEAKED
process.stderr.write('PASSWORD=admin\n');     // ❌ LEAKED
```

**Security Impact:**

- Third-party libraries that write directly to streams leak secrets
- Any code using `process.stdout.write()` or `process.stderr.write()` bypasses scrubbing
- Defeats the documented security guarantee: "No code path can bypass scrubbing"
- Common in logging libraries, progress bars, and CLI frameworks

### Solution

Intercept `process.stdout.write` and `process.stderr.write` at CLI startup:

```typescript
const originalWrite = {
  stdout: process.stdout.write.bind(process.stdout),
  stderr: process.stderr.write.bind(process.stderr),
};

// Intercept stdout
process.stdout.write = function(chunk: any, ...args: any[]): boolean {
  if (typeof chunk === 'string') {
    chunk = scrubSecrets(chunk);
  } else if (Buffer.isBuffer(chunk)) {
    chunk = Buffer.from(scrubSecrets(chunk.toString()));
  }
  return originalWrite.stdout(chunk, ...args);
} as any;

// Intercept stderr
process.stderr.write = function(chunk: any, ...args: any[]): boolean {
  if (typeof chunk === 'string') {
    chunk = scrubSecrets(chunk);
  } else if (Buffer.isBuffer(chunk)) {
    chunk = Buffer.from(scrubSecrets(chunk.toString()));
  }
  return originalWrite.stderr(chunk, ...args);
} as any;
```

**Security Benefits:**

- ALL output paths now scrubbed (console + streams)
- Third-party libraries automatically protected
- Handles both string and Buffer chunks
- True defense in depth: streams + console + logger + error builder

### Changes Made

- **requirements.md:** Added FR-1.9 for stream interception
- **design.md:** Added stream interception code before console interception
- **tasks.md:** Updated Task 1.2 (+1 hour) with stream interception sub-tasks
- **traceability-matrix.md:** Added Test-1.13 (4 tests) for stream interception
- **Test count:** 79+ → 83+ tests

### Implementation Requirements

1. Intercept `process.stdout.write` and `process.stderr.write` at module load
2. Handle both `string` and `Buffer` chunk types
3. Preserve original write behavior (return value, error handling)
4. Test with direct writes: `process.stdout.write('API_KEY=secret\n')`
5. Test with Buffer writes: `process.stdout.write(Buffer.from('PASSWORD=admin'))`

---

## P1 Issue #1: Cache Stores Unsanitized Secrets in Memory

### Problem

The original design cached scrubbing results using raw input text as cache keys:

```typescript
const scrubCache = new LRU<string, string>({ max: 1000 });
scrubCache.set(text, scrubbed); // ❌ SECURITY FLAW: raw secret as key
```

**Security Impact:**

- Raw secrets stored in heap memory until process exit or cache eviction
- Heap dumps expose all cached secrets
- Process crashes leak secrets in core dumps
- Up to 1000 secrets retained in memory simultaneously
- Defeats the entire purpose of scrubbing

### Solution

Use SHA-256 hashes as cache keys instead of raw input:

```typescript
import { createHash } from 'crypto';

function hashInput(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

const inputHash = hashInput(text);
scrubCache.set(inputHash, scrubbed); // ✅ SECURE: hash as key
```

**Security Benefits:**

- No raw secrets stored in cache memory
- Heap dumps only show hashes (irreversible)
- Cache still provides performance benefit
- Same cache hit rate (hash collision probability negligible)

### Changes Made

- **design.md:** Updated scrubber implementation with hash-based cache
- **requirements.md:** Added security note to FR-7.3
- **tasks.md:** Updated Task 1.2 and 1.3 with hash implementation

---

## P1 Issue #2: Console Output Bypasses Scrubbing

### Problem

The design claimed "all text passes through scrubber before reaching console" but only hooked logger and error builder. Direct console.log calls bypassed scrubbing:

```typescript
// ❌ SECURITY FLAW: These bypass scrubbing
console.log('API_KEY=secret123');
console.error('Failed with PASSWORD=secret');
fixGitignore(); // Uses console.log internally
```

**Security Impact:**

- .gitignore commands use console.log (bypass scrubbing)
- Dry-run output uses console.log (bypass scrubbing)
- Diagnostic messages use console.log (bypass scrubbing)
- Any future code using console.* bypasses scrubbing
- Threat model not actually covered despite claims

### Solution

Intercept global console methods at CLI startup:

```typescript
import { scrubSecrets } from './utils/scrubber';

// Intercept ALL console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = (...args: any[]) => {
  const scrubbed = args.map(arg => 
    typeof arg === 'string' ? scrubSecrets(arg) : arg
  );
  originalConsoleLog(...scrubbed);
};

// Same for console.error, console.warn, console.info
```

**Security Benefits:**

- ALL console output scrubbed automatically
- No code path can bypass scrubbing
- Works for existing and future code
- Centralized enforcement point
- True defense in depth

### Changes Made

- **design.md:** Added console interception to CLI Integration section
- **requirements.md:** Will add FR-9 for console interception
- **tasks.md:** Will add Task 5.0 sub-task for console interception

---

## Implementation Requirements

### FR-7.3 (Updated)

Cache scrubbing results using **hash-based keys** (SECURITY: never cache raw secrets)

**Validation:**

```typescript
const cache = getScrubberCache();
const keys = Array.from(cache.keys());
expect(keys.every(k => k.length === 64)).toBe(true); // SHA-256 hashes
expect(keys.every(k => !k.includes('secret'))).toBe(true); // No raw secrets
```

### FR-9 (New)

**Console Output Interception**

**Description:** Intercept all console methods to ensure no output bypasses scrubbing

**Requirements:**

- FR-9.1: Intercept console.log at CLI startup
- FR-9.2: Intercept console.error at CLI startup
- FR-9.3: Intercept console.warn at CLI startup
- FR-9.4: Intercept console.info at CLI startup
- FR-9.5: Scrub all string arguments before output
- FR-9.6: Preserve original console behavior (colors, formatting)
- FR-9.7: No performance degradation (< 1ms overhead)

**Verification:**

```bash
# Test that direct console.log is scrubbed
node -e "
require('./dist/secrets-sync.js'); // Loads interception
console.log('API_KEY=secret123');
" 2>&1 | grep "secret123"
# Should find nothing (scrubbed to [REDACTED])

# Test that all console methods are scrubbed
node -e "
require('./dist/secrets-sync.js');
console.log('LOG: PASSWORD=secret');
console.error('ERROR: TOKEN=secret');
console.warn('WARN: API_KEY=secret');
console.info('INFO: SECRET=secret');
" 2>&1 | grep "secret"
# Should find nothing
```

---

## Task Updates

### Task 1.2: Implement Pattern Definitions and Cache (Updated)

**Additional Sub-tasks:**

- [ ] Import crypto module for hashing
- [ ] Implement `hashInput()` function using SHA-256
- [ ] Update cache lookup to use `hashInput(text)` instead of `text`
- [ ] Update cache storage to use `hashInput(text)` as key
- [ ] Add test to verify cache keys are hashes, not raw secrets

**Validation:**

```typescript
// Test hash-based cache
const scrubber = require('./dist/utils/scrubber.js');
scrubber.scrubSecrets('API_KEY=secret123');

const cache = scrubber.getScrubberCache();
const keys = Array.from(cache.keys());

// Verify keys are SHA-256 hashes (64 hex chars)
expect(keys[0]).toMatch(/^[a-f0-9]{64}$/);

// Verify no raw secrets in cache
expect(keys.every(k => !k.includes('secret'))).toBe(true);
```

### Task 5.0: Update CLI Integration (Updated)

**Additional Sub-tasks:**

- [ ] Import scrubSecrets at top of CLI file
- [ ] Store original console methods before interception
- [ ] Intercept console.log with scrubbing wrapper
- [ ] Intercept console.error with scrubbing wrapper
- [ ] Intercept console.warn with scrubbing wrapper
- [ ] Intercept console.info with scrubbing wrapper
- [ ] Test that direct console calls are scrubbed
- [ ] Test that .gitignore commands are scrubbed
- [ ] Test that dry-run output is scrubbed

**Validation:**

```bash
# Test console interception
secrets-sync --dry-run 2>&1 | grep -i "password=.*[^REDACTED]"
# Should find nothing

# Test .gitignore command output
secrets-sync --fix-gitignore 2>&1 | grep -i "secret"
# Should find nothing (if any secrets in output)
```

---

## Security Audit Checklist

### Before Implementation

- [x] Identify cache security flaw
- [x] Identify console bypass flaw
- [x] Design hash-based cache solution
- [x] Design console interception solution
- [x] Update documentation

### During Implementation

- [ ] Implement hash-based cache
- [ ] Test cache keys are hashes
- [ ] Test no raw secrets in cache
- [ ] Implement console interception
- [ ] Test all console methods scrubbed
- [ ] Test no bypass possible

### After Implementation

- [ ] Security audit: heap dump analysis
- [ ] Security audit: all output paths tested
- [ ] Security audit: penetration testing
- [ ] Security audit: code review
- [ ] Security audit: final sign-off

---

## Risk Assessment

### Before Fixes

- **Cache Flaw:** HIGH - Secrets exposed in memory
- **Console Bypass:** HIGH - Scrubbing can be bypassed
- **Overall Risk:** CRITICAL - Do not implement without fixes

### After Fixes

- **Cache Flaw:** MITIGATED - Hash-based keys prevent exposure
- **Console Bypass:** MITIGATED - Interception prevents bypass
- **Overall Risk:** LOW - Safe to implement

---

## Lessons Learned

1. **Never cache sensitive data as-is** - Always hash or encrypt cache keys
2. **Defense in depth** - Multiple layers of protection (logger + console interception)
3. **Assume bypass attempts** - Intercept at lowest level possible
4. **Test security claims** - "All output scrubbed" must be verifiable
5. **Heap dumps are real threats** - Memory contents can be extracted

---

## References

- Original Design: design.md lines 98-205 (cache), 45-524 (console)
- Security Review: This document
- Updated Design: design.md (with fixes applied)

---

**Status:** ✅ FIXED - Safe to proceed with implementation

**Reviewer:** Security Analysis  
**Date:** 2025-11-25  
**Next Action:** Implement with fixes applied

## P1 Issue #3: Console Interception Skips Objects

### Problem

The console interception only scrubbed string arguments, leaving objects untouched:

```typescript
// ❌ SECURITY FLAW: Objects bypass scrubbing
console.log('Failed', { password: 'sk_123' }); // password leaked
console.error({ apiKey: 'secret' }); // apiKey leaked
```

**Security Impact:**

- Any console call with object arguments leaks secrets
- Node's console.* stringifies objects AFTER interception
- Common pattern: `console.log('Error', { context })` leaks all context secrets
- Verbose logging with objects (US-2) leaks secrets
- Defeats the "ALL output scrubbed" guarantee

### Solution

Scrub both strings AND objects in console interception:

```typescript
import { scrubSecrets, scrubObject } from './utils/scrubber';

function scrubArgs(...args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return scrubSecrets(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      return scrubObject(arg); // ✅ Recursive redaction
    }
    return arg;
  });
}

console.log = (...args: any[]) => originalConsole.log(...scrubArgs(...args));
```

**Security Benefits:**

- Strings AND objects scrubbed
- Recursive redaction for nested objects
- Same scrubbing logic as logger/error-builder
- No object can leak secrets
- True comprehensive coverage

### Changes Made

- **design.md:** Updated console interception to use `scrubArgs()` with object handling

---

## P2 Issue #4: Console Interception Omits Methods

### Problem

The console interception only covered 4 methods (log, error, warn, info) but Node.js has many more:

```typescript
// ❌ SECURITY FLAW: These bypass scrubbing
console.debug('Verbose: API_KEY=secret'); // Not intercepted
console.trace('Stack with PASSWORD=secret'); // Not intercepted
console.dir({ apiKey: 'secret' }); // Not intercepted
console.table([{ token: 'secret' }]); // Not intercepted
```

**Security Impact:**

- console.debug bypasses scrubbing (critical for US-2 verbose logging)
- console.trace bypasses scrubbing (stack traces leak secrets)
- console.dir bypasses scrubbing (object inspection leaks secrets)
- console.table bypasses scrubbing (tabular data leaks secrets)
- FR-9 requirement not met ("intercept all console output")
- Future code using any console method bypasses scrubbing

### Solution

Intercept ALL console methods that emit user content:

```typescript
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,    // ✅ Added
  trace: console.trace,    // ✅ Added
  dir: console.dir,        // ✅ Added
  table: console.table,    // ✅ Added
};

console.log = (...args: any[]) => originalConsole.log(...scrubArgs(...args));
console.error = (...args: any[]) => originalConsole.error(...scrubArgs(...args));
console.warn = (...args: any[]) => originalConsole.warn(...scrubArgs(...args));
console.info = (...args: any[]) => originalConsole.info(...scrubArgs(...args));
console.debug = (...args: any[]) => originalConsole.debug(...scrubArgs(...args));
console.trace = (...args: any[]) => originalConsole.trace(...scrubArgs(...args));
console.dir = (obj: any, options?: any) => originalConsole.dir(scrubObject(obj), options);
console.table = (data: any, properties?: string[]) => {
  const scrubbed = Array.isArray(data) ? data.map(scrubObject) : scrubObject(data);
  originalConsole.table(scrubbed, properties);
};
```

**Security Benefits:**

- ALL console methods covered
- Verbose logging (console.debug) scrubbed per US-2
- Stack traces (console.trace) scrubbed
- Object inspection (console.dir) scrubbed
- Tabular data (console.table) scrubbed
- No console method can bypass scrubbing
- Future-proof against new console usage

### Changes Made

- **design.md:** Updated console interception to cover all 8 methods

---

## Summary of All Fixes

| Issue                                  | Priority | Type                | Status  |
| -------------------------------------- | -------- | ------------------- | ------- |
| #1: Cache stores raw secrets           | P1       | Memory exposure     | ✅ Fixed |
| #2: Console bypass                     | P1       | Scrubbing bypass    | ✅ Fixed |
| #3: Objects skip scrubbing             | P1       | Scrubbing bypass    | ✅ Fixed |
| #4: Missing console methods            | P2       | Incomplete coverage | ✅ Fixed |
| #5: Stream writes bypass scrubbing     | P1       | Scrubbing bypass    | ✅ Fixed |
| #6: Module initialization bypass       | P1       | Scrubbing bypass    | ✅ Fixed |
| #7: Fake regex timeout (DoS)           | P1       | Security theater    | ✅ Fixed |
| #8: Arrays of strings bypass           | P1       | Scrubbing bypass    | ✅ Fixed |
| #9: Custom patterns inactive           | P2       | Incomplete coverage | ✅ Fixed |
| #10: Requirements mandate fake timeout | P1       | Security theater    | ✅ Fixed |
| #11: Missing console methods (Proxy)   | P1       | Scrubbing bypass    | ✅ Fixed |
| #12: Cyclic references crash CLI       | P2       | DoS + secret leak   | ✅ Fixed |

**All Critical Issues Resolved** ✅

**Status:** Safe to implement with all fixes applied
