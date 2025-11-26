# Implementation Tasks: Secret Value Scrubbing

**Issue:** #11  
**Project:** Secret Scrubbing & .gitignore Protection  
**Total Estimated Time:** 8 days  
**Requirements:** See `requirements.md`  
**Design:** See `design.md`

---

## Project Overview

**Goal:** Prevent secret exposure in CLI output and protect against accidental commits

**Key Deliverables:**

1. Secret scrubbing utility module
2. Logger integration with scrubbing
3. Error message integration with scrubbing
4. .gitignore validation and auto-fix
5. Comprehensive test suite (100% coverage)

---

## Phase 1: Core Scrubbing (Days 1-2)

**Goal:** Create scrubber module with pattern matching  
**Time Estimate:** 2 days  
**Requirements:** FR-1, FR-2, TR-1, TR-2, NFR-1, NFR-2

### Task 1.0: Create Bootstrap File (Module Initialization Protection)

**Time:** 2 hours  
**Requirements:** FR-1.9, FR-1.10, FR-1.11, FR-1.12, FR-1.13, NFR-4  
**Design Reference:** Bootstrap Architecture

**Sub-tasks:**

- [x] Create `src/bootstrap.ts` file
- [x] Import scrubSecrets, scrubObject, and loadUserConfig from scrubber module
- [x] Import fs, path, and yaml modules for config loading
- [x] Load env-config.yml synchronously before interception (if exists)
- [x] Call loadUserConfig() with parsed config
- [x] Intercept process.stdout.write with scrubbing wrapper
- [x] Intercept process.stderr.write with scrubbing wrapper
- [x] Use Proxy to intercept ALL console methods (not just 8 specific ones)
- [x] Add comment: "MUST be imported first before any other imports"
- [x] Update `src/secrets-sync.ts` to import './bootstrap' as first line
- [x] Verify bootstrap runs before any module initialization
- [x] Verify custom patterns active during module init

**Validation for End-User Success:**

```bash
# Test that bootstrap runs before module imports
node -e "
// Simulate module that logs during initialization
console.log('API_KEY=secret123');
require('./dist/secrets-sync.js');
"
# Expected: API_KEY=*** (scrubbed even during module init)

# Test with array of strings
node -e "
require('./dist/bootstrap.js');
console.log(['API_KEY=secret123', 'PASSWORD=admin']);
"
# Expected: ['API_KEY=***', 'PASSWORD=***']

# Test custom patterns during module init
echo "scrubPatterns: ['CUSTOM_TOKEN']" > env-config.yml
node -e "
console.log('CUSTOM_TOKEN=abc123');
require('./dist/secrets-sync.js');
"
# Expected: CUSTOM_TOKEN=*** (custom pattern active)
```

**Success Criteria:**

- [x] bootstrap.ts created with all interception code
- [x] env-config.yml loaded synchronously before interception
- [x] Custom patterns active during module initialization
- [x] secrets-sync.ts imports bootstrap as first line
- [x] Module initialization output is scrubbed
- [x] Arrays of strings are scrubbed
- [x] No module can bypass scrubbing by logging during import

---

### Task 1.1: Create Scrubber Module Structure

**Time:** 2 hours  
**Requirements:** TR-1  
**Design Reference:** Component Design § 1

**Sub-tasks:**

- [x] Create `src/utils/scrubber.ts` file
- [x] Define `ScrubberConfig` interface
- [x] Export `scrubSecrets(text: string): string` function signature
- [x] Export `scrubObject<T>(obj: T): T` function signature
- [x] Export `isSecretKey(key: string): boolean` function signature
- [x] Add TypeScript strict types
- [x] Add JSDoc comments for all exports

**Validation for End-User Success:**

```bash
# Test that module can be imported
bun run -e "import { scrubSecrets, scrubObject, isSecretKey } from './src/utils/scrubber'; console.log('✓ Module exports work')"

# Verify TypeScript types are correct
bun run build
# Should compile without errors
```

**Success Criteria:**

- [x] Module exports all required functions
- [x] TypeScript compilation succeeds
- [x] JSDoc comments are complete
- [x] No linting errors

---

### Task 1.2: Implement Pattern Definitions and Cache

**Time:** 4 hours  
**Requirements:** FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-1.5, FR-1.7, FR-7.3, TR-2  
**Design Reference:** Component Design § 1

**Sub-tasks:**

- [x] Install lru-cache package (`bun add lru-cache`)
- [x] Define `SECRET_PATTERNS` constant with regex patterns
- [x] Add KEY=value pattern (`/([A-Z_][A-Z0-9_]*)=([^\s]+)/gi`)
- [x] Add URL credentials pattern (`/(https?:\/\/[^:]+):([^@]+)@/gi`)
- [x] Add JWT token pattern
- [x] Add private key pattern (BEGIN/END blocks for multi-line)
- [x] Define `SECRET_KEYS` Set with 15+ common secret key names
- [x] Define `WHITELIST_KEYS` Set with non-secret keys
- [x] Initialize LRU cache (max 1000 entries)
- [x] Add input length limit constant (50KB max)
- [x] Add user config pattern arrays (scrubPatterns, whitelistPatterns)
- [x] Implement `loadUserConfig()` function
- [x] Implement `clearCache()` function
- [x] Compile patterns at module load time (not per call)

**Validation for End-User Success:**

```bash
# Test that patterns are defined
node -e "
const { SECRET_PATTERNS } = require('./dist/utils/scrubber.js');
console.log('Patterns defined:', Object.keys(SECRET_PATTERNS));
// Should show: keyValue, urlCreds, jwt, privateKey
"

# Test cache initialization
node -e "
const scrubber = require('./dist/utils/scrubber.js');
scrubber.scrubSecrets('API_KEY=test');
scrubber.scrubSecrets('API_KEY=test'); // Should hit cache
console.log('✓ Cache working');
"

# Verify patterns compile without errors
bun run build && echo "✓ Patterns compile successfully"
```

**Success Criteria:**

- [x] All 4 pattern types defined
- [x] SECRET_KEYS contains 15+ common keys (PASSWORD, API_KEY, TOKEN, etc.)
- [x] WHITELIST_KEYS contains 7+ safe keys (DEBUG, PORT, NODE_ENV, etc.)
- [x] LRU cache initialized with max 1000 entries
- [x] Input length limit defined (50KB)
- [x] User config support implemented
- [x] Patterns compile at module load
- [x] No runtime regex compilation

---

### Task 1.3: Implement scrubSecrets() Function

**Time:** 4 hours  
**Requirements:** FR-1, FR-2, FR-7.6, FR-8, NFR-2  
**Design Reference:** Component Design § 1

**Sub-tasks:**

- [x] Implement input validation (handle null, undefined, empty)
- [x] Implement cache lookup before processing
- [x] Implement input length limit check (50KB max, return placeholder if exceeded)
- [x] Implement KEY=value pattern scrubbing
- [x] Implement URL credentials scrubbing
- [x] Implement JWT token scrubbing
- [x] Implement private key scrubbing (multi-line support)
- [x] Add whitelist filtering (don't scrub DEBUG, PORT, etc.)
- [x] Add user-defined pattern matching (glob patterns)
- [x] Preserve key names in output
- [x] Return original text if no secrets found
- [x] Handle edge cases gracefully (never throw)
- [x] Implement graceful failure (return "[SCRUBBING_FAILED]" on error, never unscrubbed text)
- [x] Cache scrubbed result before returning

**Validation for End-User Success:**

```bash
# Test basic scrubbing
node -e "
const { scrubSecrets } = require('./dist/utils/scrubber.js');

// Test 1: KEY=value
const test1 = scrubSecrets('API_KEY=secret123');
console.log('Test 1:', test1);
// Should output: API_KEY=[REDACTED]

// Test 2: URL credentials
const test2 = scrubSecrets('postgres://user:pass@localhost/db');
console.log('Test 2:', test2);
// Should output: postgres://user:[REDACTED]@localhost/db

// Test 3: Whitelist
const test3 = scrubSecrets('DEBUG=true');
console.log('Test 3:', test3);
// Should output: DEBUG=true (not redacted)

// Test 4: Multi-line private key
const test4 = scrubSecrets('-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----');
console.log('Test 4:', test4.includes('[REDACTED:PRIVATE_KEY]'));
// Should output: true

// Test 5: Edge cases
console.log('Null:', scrubSecrets(null));
console.log('Empty:', scrubSecrets(''));
// Should not throw errors

// Test 6: Regex timeout
const malicious = 'A'.repeat(10000) + '=secret';
const test6 = scrubSecrets(malicious);
console.log('Test 6:', !test6.includes('secret'));
// Should output: true (secret scrubbed or failed gracefully)
"
```

**Success Criteria:**

- [x] KEY=value patterns are scrubbed
- [x] URL credentials are scrubbed
- [x] JWT tokens are scrubbed
- [x] Private keys are scrubbed (multi-line)
- [x] Whitelisted keys are NOT scrubbed
- [x] User-defined patterns work
- [x] Key names are preserved
- [x] Edge cases handled gracefully
- [x] Function never throws errors
- [x] Regex timeout protection works
- [x] Graceful failure never returns unscrubbed text
- [x] Cache is used for repeated inputs

---

### Task 1.4: Implement scrubObject() Function

**Time:** 3 hours  
**Requirements:** FR-2, FR-2.5, FR-3.5, FR-3.6  
**Design Reference:** Component Design § 1

**Sub-tasks:**

- [x] Implement input validation (handle null, undefined, non-objects)
- [x] Add cycle detection using WeakSet (prevent stack overflow)
- [x] Return [CIRCULAR] for cyclic references
- [x] Handle arrays (map over items, scrub strings)
- [x] Handle nested objects (recursive scrubbing with visited set)
- [x] Detect secret keys in object properties
- [x] Scrub string values in objects
- [x] Preserve non-secret values
- [x] Return scrubbed copy (don't mutate original)

**Validation for End-User Success:**

```bash
# Test object scrubbing
node -e "
const { scrubObject } = require('./dist/utils/scrubber.js');

// Test 1: Simple object
const obj1 = { apiKey: 'secret', debug: true };
console.log('Test 1:', scrubObject(obj1));
// Should output: { apiKey: '[REDACTED]', debug: true }

// Test 2: Cyclic reference
const obj2 = { name: 'test' };
obj2.self = obj2;
console.log('Test 2:', scrubObject(obj2));
// Should output: { name: 'test', self: '[CIRCULAR]' }

// Test 3: Nested object
const obj3 = { config: { password: 'secret', port: 3000 } };
console.log('Test 3:', scrubObject(obj3));
// Should output: { config: { password: '[REDACTED]', port: 3000 } }

// Test 3: Array
const arr = ['API_KEY=secret', 'DEBUG=true'];
console.log('Test 3:', scrubObject(arr));
// Should output: ['API_KEY=[REDACTED]', 'DEBUG=true']
"
```

**Success Criteria:**

- [x] Simple objects are scrubbed
- [x] Nested objects are scrubbed
- [x] Arrays are scrubbed
- [x] Secret keys detected in properties
- [x] Non-secret values preserved
- [x] Original object not mutated
- [x] Edge cases handled

---

### Task 1.5: Implement isSecretKey() Function

**Time:** 1 hour  
**Requirements:** FR-1.2, FR-1.6  
**Design Reference:** Component Design § 1

**Sub-tasks:**

- [x] Implement case-insensitive key matching
- [x] Check against SECRET_KEYS Set
- [x] Check for substring matches (password, secret, token, key)
- [x] Return boolean result

**Validation for End-User Success:**

```bash
# Test secret key detection
node -e "
const { isSecretKey } = require('./dist/utils/scrubber.js');

console.log('password:', isSecretKey('password'));  // true
console.log('API_KEY:', isSecretKey('API_KEY'));    // true
console.log('token:', isSecretKey('token'));        // true
console.log('DEBUG:', isSecretKey('DEBUG'));        // false
console.log('PORT:', isSecretKey('PORT'));          // false
console.log('MY_SECRET:', isSecretKey('MY_SECRET')); // true (contains 'secret')
"
```

**Success Criteria:**

- [x] Detects common secret keys
- [x] Case-insensitive matching works
- [x] Substring matching works
- [x] Returns correct boolean
- [x] Fast execution (< 0.1ms)

---

### Task 1.6: Write Unit Tests for Scrubber

**Time:** 4 hours  
**Requirements:** NFR-5, Test-1  
**Design Reference:** Testing Strategy § Unit Tests

**Sub-tasks:**

- [x] Create `tests/unit/scrubber.test.ts`
- [x] Test scrubSecrets() with all pattern types (10 tests)
- [x] Test scrubObject() with various inputs (6 tests)
- [x] Test isSecretKey() with various keys (4 tests)
- [x] Test edge cases (null, undefined, empty) (3 tests)
- [x] Test whitelist filtering (3 tests)
- [x] Test performance (< 1ms per call) (1 test)
- [x] Achieve 100% code coverage

**Validation for End-User Success:**

```bash
# Run unit tests
bun test tests/unit/scrubber.test.ts

# Check coverage
bun test --coverage tests/unit/scrubber.test.ts
# Should show 100% coverage for scrubber.ts

# Verify all tests pass
# Should see: 27 pass, 0 fail
```

**Success Criteria:**

- [x] All 27+ tests pass
- [x] 100% code coverage
- [x] Performance test passes (< 1ms)
- [x] Edge cases covered
- [x] No flaky tests

---

### Task 1.7: Performance Benchmarking

**Time:** 2 hours  
**Requirements:** NFR-1, FR-7  
**Design Reference:** Performance Considerations

**Sub-tasks:**

- [x] Create `scripts/benchmark-scrubbing.ts`
- [x] Benchmark scrubSecrets() with various inputs
- [x] Benchmark scrubObject() with nested objects
- [x] Test with 10,000 iterations
- [x] Verify < 1ms per operation
- [x] Document results

**Validation for End-User Success:**

```bash
# Run benchmark
bun run scripts/benchmark-scrubbing.ts

# Expected output:
# scrubSecrets (KEY=value): 0.002ms per call ✓
# scrubSecrets (URL): 0.003ms per call ✓
# scrubSecrets (no secrets): 0.001ms per call ✓
# scrubObject (nested): 0.005ms per call ✓
# All benchmarks passed!
```

**Success Criteria:**

- [x] All operations < 1ms
- [x] Benchmark script runs successfully
- [x] Results documented
- [x] No performance regressions

---

## Phase 2: Logger Integration (Day 3)

**Goal:** Integrate scrubbing into logger module  
**Time Estimate:** 1 day  
**Requirements:** FR-3, TR-3, US-2

### Task 2.1: Modify Logger Module

**Time:** 3 hours  
**Requirements:** FR-3.1-3.8, TR-3  
**Design Reference:** Component Design § 2

**Sub-tasks:**

- [x] Import scrubber in `src/utils/logger.ts`
- [x] Add scrubbing to `formatMessage()` method
- [x] Scrub message text before formatting
- [x] Scrub context objects before formatting
- [x] Add special handling for Error objects with stack traces
- [x] Scrub error.stack property via context
- [x] Add logError() method for Error objects
- [x] Ensure file operation messages are scrubbed
- [x] Maintain existing logger API (no breaking changes)
- [x] Test that existing logger tests still pass

**Validation for End-User Success:**

```bash
# Test logger with secrets
node -e "
const { Logger } = require('./dist/utils/logger.js');
const logger = new Logger({ verbose: false });

// Test 1: Error with secret
logger.error('Failed: API_KEY=secret123');
// Output should show: Failed: API_KEY=[REDACTED]

// Test 2: Context with secret
logger.error('Failed', { apiKey: 'secret' });
// Output should show: { apiKey: '[REDACTED]' }

// Test 3: Stack trace with secret
const error = new Error('Failed with API_KEY=secret');
logger.logError(error);
// Stack trace should be scrubbed

// Test 4: File operation with secret
logger.info('Writing to /path/API_KEY=secret.env');
// Output should show: Writing to /path/API_KEY=[REDACTED].env
"

# Verify existing tests pass
bun test tests/unit/logger.test.ts
# All existing tests should still pass
```

**Success Criteria:**

- [x] Logger scrubs message text
- [x] Logger scrubs context objects
- [x] Logger scrubs stack traces
- [x] Logger scrubs file operation messages
- [x] logError() method added
- [x] Existing logger API unchanged
- [x] All existing logger tests pass
- [x] No breaking changes

---

### Task 2.2: Write Integration Tests for Logger

**Time:** 4 hours  
**Requirements:** Test-2, NFR-5  
**Design Reference:** Testing Strategy § Integration Tests

**Sub-tasks:**

- [x] Create `tests/integration/logger-scrubbing.test.ts`
- [x] Test logger.error() scrubs secrets (2 tests)
- [x] Test logger.warn() scrubs secrets (2 tests)
- [x] Test logger.info() scrubs secrets (2 tests)
- [x] Test logger.debug() scrubs secrets (2 tests)
- [x] Test context object scrubbing (2 tests)
- [x] Test nested context scrubbing (1 test)
- [x] Test stack trace scrubbing (2 tests)
- [x] Test file operation message scrubbing (2 tests)
- [x] Test logError() method (1 test)
- [x] Verify all existing logger tests pass (1 test)

**Validation for End-User Success:**

```bash
# Run integration tests
bun test tests/integration/logger-scrubbing.test.ts

# Should see: 17 pass, 0 fail

# Test real-world scenario
node -e "
const { Logger } = require('./dist/utils/logger.js');
const logger = new Logger({ verbose: true });

// Simulate real error with secret
logger.error('Database connection failed', {
  connectionString: 'postgres://user:password@localhost/db',
  error: 'ECONNREFUSED'
});

// Output should NOT contain 'password'

// Test stack trace
try {
  throw new Error('API_KEY=secret123 failed');
} catch (error) {
  logger.logError(error);
}
// Stack trace should NOT contain 'secret123'
"
```

**Success Criteria:**

- [x] All 17+ integration tests pass
- [x] All log levels scrub secrets
- [x] Context objects are scrubbed
- [x] Nested context is scrubbed
- [x] Stack traces are scrubbed
- [x] File operations are scrubbed
- [x] logError() works correctly
- [x] Real-world scenarios work

# Should see: 12 pass, 0 fail

# Test real-world scenario

node -e "
const { Logger } = require('./dist/utils/logger.js');
const logger = new Logger({ verbose: true });

// Simulate real error with secret
logger.error('Database connection failed', {
  connectionString: 'postgres://user:password@localhost/db',
  error: 'ECONNREFUSED'
});

// Output should NOT contain 'password'
"

```
**Success Criteria:**

- [ ] All 12+ integration tests pass
- [ ] All log levels scrub secrets
- [ ] Context objects are scrubbed
- [ ] Nested context is scrubbed
- [ ] Real-world scenarios work

---

### Task 2.3: Update Logger Documentation

**Time:** 1 hour  
**Requirements:** NFR-3  
**Design Reference:** Component Design § 2

**Sub-tasks:**

- [x] Add JSDoc comment about automatic scrubbing
- [x] Update logger examples in code comments
- [x] Document that scrubbing is always enabled
- [x] Add note about performance (< 1ms overhead)

**Validation for End-User Success:**

```bash
# Verify JSDoc is complete
grep -A 5 "scrub" src/utils/logger.ts
# Should show documentation about scrubbing

# Check that examples are updated
grep -A 10 "@example" src/utils/logger.ts
# Should show scrubbed output in examples
```

**Success Criteria:**

- [x] JSDoc comments updated
- [x] Examples show scrubbed output
- [x] Documentation is clear
- [x] No ambiguity about scrubbing behavior

---

## Phase 3: Error Message Integration (Day 4)

**Goal:** Integrate scrubbing into error messages  
**Time Estimate:** 1 day  
**Requirements:** FR-4, TR-4, US-1  
**Status:** ✅ COMPLETE

### Task 3.1: Modify Error Message Builder ✅

**Time:** 2 hours  
**Requirements:** FR-4.1-4.6, TR-4  
**Design Reference:** Component Design § 3

**Sub-tasks:**

- [x] Import scrubber in `src/utils/errorMessages.ts`
- [x] Add scrubbing to `buildErrorMessage()` function
- [x] Scrub `what`, `why`, `howToFix` fields
- [x] Add scrubbing to `formatContext()` function
- [x] Ensure all errors are logged through logger (for stack trace scrubbing)
- [x] Maintain existing error message API
- [x] Test that existing error tests still pass

**Validation for End-User Success:**

```bash
# Test error messages with secrets
node -e "
const { buildErrorMessage } = require('./dist/utils/errorMessages.js');

// Test 1: Error with secret in message
const msg1 = buildErrorMessage({
  what: 'API call failed with API_KEY=secret123',
  why: 'Invalid credentials',
  howToFix: 'Check your API_KEY'
});
console.log(msg1);
// Should show: API_KEY=[REDACTED]

// Test 2: Error with secret in context
const msg2 = buildErrorMessage({
  what: 'Failed to connect',
  why: 'Connection refused',
  howToFix: 'Check connection string'
});
console.log(msg2);
// Should not contain any secrets

// Test 3: Ensure errors go through logger
const { logger } = require('./dist/utils/logger.js');
try {
  throw new Error('Failed with API_KEY=secret');
} catch (error) {
  logger.logError(error);
}
// Stack trace should be scrubbed
"

# Verify existing tests pass
bun test tests/unit/errorMessages.test.ts
```

**Success Criteria:**

- [ ] Error messages scrub secrets
- [ ] Context is scrubbed
- [ ] Errors logged through logger
- [ ] Stack traces scrubbed via logger
- [ ] Existing API unchanged
- [ ] All existing tests pass
- [ ] No breaking changes

---

### Task 3.2: Write Integration Tests for Error Messages ✅

**Time:** 2 hours  
**Requirements:** Test-3, NFR-5  
**Design Reference:** Testing Strategy § Integration Tests

**Sub-tasks:**

- [x] Create `tests/integration/error-scrubbing.test.ts`
- [x] Test buildErrorMessage() scrubs secrets (3 tests)
- [x] Test formatContext() scrubs secrets (2 tests)
- [x] Test error stack traces are scrubbed (1 test)
- [x] Verify existing error tests pass (1 test)

**Validation for End-User Success:**

```bash
# Run integration tests
bun test tests/integration/error-scrubbing.test.ts

# Should see: 7 pass, 0 fail

# Test real-world error scenario
node -e "
const { buildErrorMessage } = require('./dist/utils/errorMessages.js');

// Simulate real error from file operation
const error = buildErrorMessage({
  what: 'Failed to read .env file',
  why: 'File contains: API_KEY=sk_live_123abc',
  howToFix: 'chmod 644 .env'
});

console.log(error);
// Should NOT contain 'sk_live_123abc'
"
```

**Success Criteria:**

- [ ] All 7+ integration tests pass
- [ ] Error messages are scrubbed
- [ ] Context is scrubbed
- [ ] Stack traces are scrubbed
- [ ] Real-world scenarios work

---

### Task 3.3: Test Error Sharing Workflow ✅

**Time:** 1 hour  
**Requirements:** US-1, AC-1.1, AC-1.2, AC-1.3, AC-1.4  
**Design Reference:** End-User Success Validation

**Sub-tasks:**

- [x] Generate error with secret
- [x] Copy error message to clipboard
- [x] Verify no secrets in copied text
- [x] Test sharing in GitHub issue (mock)
- [x] Document safe sharing workflow

**Validation for End-User Success:**

```bash
# Simulate user workflow
secrets-sync --env staging 2>&1 | tee error.log

# Check error log for secrets
grep -i "secret\|password\|token\|key" error.log | grep -v "REDACTED"
# Should find nothing (all secrets redacted)

# Verify error is useful for debugging
cat error.log
# Should show:
# - What failed (clear)
# - Why it failed (clear)
# - How to fix (actionable)
# - Key names preserved
# - No secret values
```

**Success Criteria:**

- [ ] Errors can be safely shared
- [ ] No secrets in error output
- [ ] Key names preserved for debugging
- [ ] Fix commands are actionable
- [ ] Users can copy-paste without review

---

## Phase 4: GitIgnore Validation (Days 5-6)

**Goal:** Add .gitignore validation and auto-fix  
**Time Estimate:** 2 days  
**Requirements:** FR-5, FR-6, TR-5, TR-6, US-4  
**Status:** ✅ COMPLETE

### Task 4.1: Create GitIgnore Validator Module

**Time:** 4 hours  
**Requirements:** FR-5, TR-5  
**Design Reference:** Component Design § 4

**Sub-tasks:**

- [x] Create `src/utils/gitignoreValidator.ts`
- [x] Define `ValidationResult` interface
- [x] Define `REQUIRED_PATTERNS` constant (in correct order)
- [x] Implement `getRequiredPatterns()` function
- [x] Implement `validateGitignore()` function
- [x] Handle missing .gitignore file
- [x] Handle malformed .gitignore file (invalid syntax)
- [x] Validate pattern order (negations after wildcards)
- [x] Normalize paths for cross-platform (forward slashes)
- [x] Return structured validation results

**Validation for End-User Success:**

```bash
# Test validation with missing .gitignore
rm .gitignore
node -e "
const { validateGitignore } = require('./dist/utils/gitignoreValidator.js');
const result = validateGitignore();
console.log('Valid:', result.isValid);
console.log('Missing:', result.missingPatterns);
// Should show: Valid: false, Missing: ['.env', '.env.*', '!.env.example', '**/bak/', '*.bak']
"

# Test validation with complete .gitignore
git checkout .gitignore
node -e "
const { validateGitignore } = require('./dist/utils/gitignoreValidator.js');
const result = validateGitignore();
console.log('Valid:', result.isValid);
// Should show: Valid: true
"

# Test malformed .gitignore
echo "[invalid" > .gitignore
node -e "
const { validateGitignore } = require('./dist/utils/gitignoreValidator.js');
const result = validateGitignore();
console.log('Valid:', result.isValid);
// Should show: Valid: false (with warning about invalid syntax)
"

# Test pattern order validation
echo -e "!.env.example\n.env" > .gitignore
node -e "
const { validateGitignore } = require('./dist/utils/gitignoreValidator.js');
const result = validateGitignore();
// Should warn about incorrect pattern order
"
```

**Success Criteria:**

- [ ] Module exports all functions
- [ ] Detects missing .gitignore
- [ ] Detects missing patterns
- [ ] Detects malformed .gitignore (invalid syntax)
- [ ] Validates pattern order
- [ ] Normalizes paths for Windows
- [ ] Returns structured results
- [ ] Handles edge cases gracefully

---

### Task 4.2: Implement GitIgnore Auto-Fix

**Time:** 2 hours  
**Requirements:** FR-6, TR-5  
**Design Reference:** Component Design § 4

**Sub-tasks:**

- [x] Implement `fixGitignore()` function
- [x] Create .gitignore if it doesn't exist
- [x] Append missing patterns to existing .gitignore in correct order
- [x] Add comment explaining additions
- [x] Preserve existing .gitignore content
- [x] Show confirmation of patterns added
- [x] Enforce pattern order (wildcards before negations)
- [x] Use forward slashes for cross-platform compatibility

**Validation for End-User Success:**

```bash
# Test auto-fix with missing .gitignore
rm .gitignore
node -e "
const { fixGitignore } = require('./dist/utils/gitignoreValidator.js');
fixGitignore();
"
# Should output: ✓ Added 5 patterns to .gitignore

# Verify .gitignore was created with correct order
cat .gitignore
# Should contain in order: .env, .env.*, !.env.example, **/bak/, *.bak

# Test auto-fix with existing .gitignore
echo "node_modules/" > .gitignore
node -e "
const { fixGitignore } = require('./dist/utils/gitignoreValidator.js');
fixGitignore();
"

# Verify existing content preserved and patterns in correct order
cat .gitignore
# Should contain: node_modules/ AND new patterns in correct order

# Test Windows compatibility (patterns use forward slashes)
# Even on Windows, patterns should use /
```

**Success Criteria:**

- [ ] Creates .gitignore if missing
- [ ] Appends patterns to existing file
- [ ] Preserves existing content
- [ ] Adds explanatory comment
- [ ] Shows confirmation message
- [ ] Enforces pattern order
- [ ] Uses forward slashes on all platforms

---

### Task 4.3: Add CLI Flag for GitIgnore Fix

**Time:** 2 hours  
**Requirements:** FR-6.1, TR-6  
**Design Reference:** Component Design § 5

**Sub-tasks:**

- [x] Add `fixGitignore?: boolean` to Flags interface
- [x] Parse `--fix-gitignore` flag in CLI
- [x] Call fixGitignore() when flag is present
- [x] Exit after fixing (don't continue with normal operation)
- [x] Update help text with new flag
- [x] Add flag to README

**Validation for End-User Success:**

```bash
# Test --fix-gitignore flag
rm .gitignore
secrets-sync --fix-gitignore

# Should output:
# ✓ Added 4 patterns to .gitignore
#   + .env
#   + .env.*
#   + **/bak/
#   + *.bak

# Verify .gitignore was created
cat .gitignore

# Test help text
secrets-sync --help | grep "fix-gitignore"
# Should show: --fix-gitignore  Add missing patterns to .gitignore
```

**Success Criteria:**

- [ ] Flag is recognized
- [ ] fixGitignore() is called
- [ ] CLI exits after fixing
- [ ] Help text is updated
- [ ] README is updated

---

### Task 4.4: Add Startup GitIgnore Validation

**Time:** 2 hours  
**Requirements:** FR-5, AC-4.1, AC-4.2, AC-4.3  
**Design Reference:** Component Design § 5

**Sub-tasks:**

- [x] Import gitignoreValidator in main CLI file
- [x] Add validation check at startup
- [x] Show warning if patterns are missing
- [x] List missing patterns
- [x] Provide fix command
- [x] Allow skipping with SKIP_GITIGNORE_CHECK env var

**Validation for End-User Success:**

```bash
# Test startup warning
rm .gitignore
secrets-sync --dry-run

# Should output:
# ⚠️  Security Warning: Your .gitignore may not protect secrets
#
# Missing patterns in .gitignore:
#   - .env
#   - .env.*
#   - **/bak/
#
# These files contain secrets and should not be committed.
#
# Fix: Run with --fix-gitignore flag
#   secrets-sync --fix-gitignore

# Test skip flag
SKIP_GITIGNORE_CHECK=1 secrets-sync --dry-run
# Should NOT show warning

# Test with valid .gitignore
git checkout .gitignore
secrets-sync --dry-run
# Should NOT show warning
```

**Success Criteria:**

- [ ] Warning shown when patterns missing
- [ ] Missing patterns listed
- [ ] Fix command provided
- [ ] Can be skipped with env var
- [ ] No warning when .gitignore is valid

---

### Task 4.5: Write Tests for GitIgnore Validator

**Time:** 3 hours  
**Requirements:** Test-4, NFR-5  
**Design Reference:** Testing Strategy § Integration Tests

**Sub-tasks:**

- [x] Create `tests/unit/gitignoreValidator.test.ts`
- [x] Test validateGitignore() with missing file (2 tests)
- [x] Test validateGitignore() with missing patterns (2 tests)
- [x] Test validateGitignore() with valid .gitignore (1 test)
- [x] Test fixGitignore() creates file (1 test)
- [x] Test fixGitignore() appends patterns (1 test)
- [x] Test fixGitignore() preserves content (1 test)
- [x] Create `tests/integration/gitignore.test.ts`
- [x] Test CLI --fix-gitignore flag (2 tests)
- [x] Test startup warning (3 tests)

**Validation for End-User Success:**

```bash
# Run unit tests
bun test tests/unit/gitignoreValidator.test.ts
# Should see: 8 pass, 0 fail

# Run integration tests
bun test tests/integration/gitignore.test.ts
# Should see: 4 pass, 0 fail

# Test real-world scenario
rm .gitignore
secrets-sync --fix-gitignore
cat .gitignore
# Should contain all required patterns
```

**Success Criteria:**

- [ ] All 12+ tests pass
- [ ] Unit tests cover all functions
- [ ] Integration tests cover CLI workflow
- [ ] Real-world scenarios work
- [ ] Edge cases handled

---

## Phase 5: E2E Testing & Polish (Days 7-8)

**Goal:** Comprehensive testing and documentation  
**Time Estimate:** 2 days  
**Requirements:** Test-5, NFR-4, SEC-1, SEC-2, SEC-3

### Task 5.0: Update CLI Integration

**Time:** 1 hour  
**Requirements:** FR-7.4, FR-8  
**Design Reference:** Component Design § 5

**Sub-tasks:**

- [ ] Import `loadUserConfig` and `clearCache` from scrubber
- [ ] Load user config at CLI startup
- [ ] Add cache clearing in finally block
- [ ] Verify cache is cleared after each run

**Validation for End-User Success:**

```bash
# Test user config loading
echo "scrubbing:
  scrubPatterns:
    - CUSTOM_*
  whitelistPatterns:
    - DEBUG_*" > env-config.yml

secrets-sync --dry-run
# Should load and use custom patterns

# Test cache clearing
node -e "
const { getScrubberCache } = require('./dist/utils/scrubber.js');
// Run CLI
require('./dist/secrets-sync.js');
// Check cache after run
const cache = getScrubberCache();
console.log('Cache size:', cache.size);
// Should be 0 (cleared)
"
```

**Success Criteria:**

- [ ] User config loaded at startup
- [ ] Custom patterns work
- [ ] Cache cleared after each run
- [ ] No memory leaks

---

### Task 5.1: Write E2E Tests

**Time:** 4 hours  
**Requirements:** Test-5, US-1, US-2, US-3, US-4  
**Design Reference:** Testing Strategy § E2E Tests

**Sub-tasks:**

- [ ] Create `tests/e2e/scrubbing.test.ts`
- [ ] Test complete error flow with secrets (2 tests)
- [ ] Test verbose mode scrubs secrets (2 tests)
- [ ] Test CI environment scrubs secrets (1 test)
- [ ] Test .gitignore warning workflow (2 tests)
- [ ] Test --fix-gitignore end-to-end (1 test)

**Validation for End-User Success:**

```bash
# Run E2E tests
bun test tests/e2e/scrubbing.test.ts
# Should see: 8 pass, 0 fail

# Manual E2E validation
# 1. Error with secret
echo "API_KEY=secret123" > test.env
secrets-sync --dry-run 2>&1 | grep "secret123"
# Should find nothing

# 2. Verbose mode
secrets-sync --verbose --dry-run 2>&1 | grep "secret123"
# Should find nothing

# 3. GitIgnore warning
rm .gitignore
secrets-sync --dry-run 2>&1 | grep "Security Warning"
# Should show warning

# 4. GitIgnore fix
secrets-sync --fix-gitignore
cat .gitignore | grep ".env"
# Should contain .env patterns
```

**Success Criteria:**

- [ ] All 8+ E2E tests pass
- [ ] Complete user journeys work
- [ ] Manual validation passes
- [ ] No secrets leak in any scenario

---

### Task 5.2: Security Audit

**Time:** 3 hours  
**Requirements:** SEC-1, SEC-2, SEC-3, NFR-4  
**Design Reference:** Security Considerations

**Sub-tasks:**

- [ ] Create `scripts/security-audit.sh`
- [ ] Test for secret leakage in all output channels
- [ ] Test all secret types are detected
- [ ] Test .gitignore protection works
- [ ] Verify scrubbing cannot be disabled
- [ ] Document security validation results

**Validation for End-User Success:**

```bash
# Run security audit
bun run scripts/security-audit.sh

# Expected output:
# ✓ Test 1: No secrets in console.log
# ✓ Test 2: No secrets in console.error
# ✓ Test 3: No secrets in logger output
# ✓ Test 4: No secrets in error messages
# ✓ Test 5: No secrets in stack traces
# ✓ Test 6: .gitignore validation works
# ✓ Test 7: Scrubbing cannot be disabled
# ✓ All security checks passed

# Manual security test
API_KEY=secret123 PASSWORD=pass123 secrets-sync --verbose --dry-run 2>&1 | \
  grep -E "(secret123|pass123)" | grep -v "REDACTED"
# Should find nothing
```

**Success Criteria:**

- [ ] All security tests pass
- [ ] No secrets leak in any output
- [ ] All secret types detected
- [ ] .gitignore protection works
- [ ] Scrubbing cannot be bypassed

---

### Task 5.3: Performance Validation

**Time:** 2 hours  
**Requirements:** NFR-1, FR-7  
**Design Reference:** Performance Considerations

**Sub-tasks:**

- [ ] Run performance benchmarks
- [ ] Verify scrubbing < 1ms per operation
- [ ] Verify CLI startup overhead < 10ms
- [ ] Verify memory usage < 1MB additional
- [ ] Document performance results

**Validation for End-User Success:**

```bash
# Run performance benchmarks
bun run scripts/benchmark-scrubbing.ts

# Expected output:
# scrubSecrets (KEY=value): 0.002ms ✓
# scrubSecrets (URL): 0.003ms ✓
# scrubObject (nested): 0.005ms ✓
# All benchmarks passed!

# Test CLI startup time
time secrets-sync --help
# Should be < 500ms (same as before)

# Test memory usage
/usr/bin/time -l secrets-sync --help 2>&1 | grep "maximum resident"
# Should be similar to before (< 1MB increase)
```

**Success Criteria:**

- [ ] All performance benchmarks pass
- [ ] Scrubbing < 1ms per operation
- [ ] CLI startup < 10ms overhead
- [ ] Memory usage < 1MB increase
- [ ] No noticeable performance impact

---

### Task 5.4: Update Documentation

**Time:** 3 hours  
**Requirements:** NFR-3  
**Design Reference:** End-User Success Validation

**Sub-tasks:**

- [ ] Update README with scrubbing feature
- [ ] Document --fix-gitignore flag
- [ ] Add security section to README
- [ ] Update CHANGELOG with all changes
- [ ] Add examples of scrubbed output
- [ ] Update CONTRIBUTING with scrubbing patterns

**Validation for End-User Success:**

```bash
# Verify README is updated
grep -i "scrub" README.md
# Should show scrubbing feature

grep -i "fix-gitignore" README.md
# Should show --fix-gitignore flag

# Verify CHANGELOG is updated
grep -i "secret scrubbing" CHANGELOG.md
# Should show new feature

# Verify examples are clear
grep -A 5 "REDACTED" README.md
# Should show example of scrubbed output
```

**Success Criteria:**

- [ ] README documents scrubbing
- [ ] README documents --fix-gitignore
- [ ] CHANGELOG is updated
- [ ] Examples are clear
- [ ] Security benefits explained

---

### Task 5.5: Regression Testing

**Time:** 2 hours  
**Requirements:** NFR-2, TR-3, TR-4  
**Design Reference:** Testing Strategy

**Sub-tasks:**

- [ ] Run full existing test suite
- [ ] Verify all 148+ existing tests pass
- [ ] Test existing CLI commands unchanged
- [ ] Verify no breaking changes
- [ ] Test backward compatibility

**Validation for End-User Success:**

```bash
# Run all tests
bun test

# Should see: 175+ pass, 0 fail
# (148 existing + 27 new scrubber + integration + E2E)

# Test existing commands still work
secrets-sync --help
secrets-sync --version
secrets-sync --dry-run
secrets-sync --env staging

# All should work as before, just with scrubbing
```

**Success Criteria:**

- [ ] All existing tests pass
- [ ] All new tests pass
- [ ] No breaking changes
- [ ] Backward compatibility maintained
- [ ] CLI interface unchanged

---

## Completion Checklist

### Code Complete

- [ ] Scrubber module implemented
- [ ] Logger integration complete
- [ ] Error message integration complete
- [ ] GitIgnore validator implemented
- [ ] CLI flags added
- [ ] All functions exported
- [ ] TypeScript types correct

### Testing Complete

- [ ] Unit tests pass (100% coverage)
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Performance tests pass
- [ ] Security audit passes
- [ ] Regression tests pass

### Documentation Complete

- [ ] README updated
- [ ] CHANGELOG updated
- [ ] Code comments added
- [ ] Examples provided
- [ ] Security benefits documented

### Quality Checks

- [ ] Code review completed
- [ ] Performance validated (< 1ms)
- [ ] Security validated (no leaks)
- [ ] No breaking changes
- [ ] Backward compatibility verified

### Deployment Ready

- [ ] All tests passing
- [ ] Documentation reviewed
- [ ] Ready for merge
- [ ] Ready for release

---

## Success Metrics

### Quantitative

- [ ] 100% test coverage for scrubber module
- [ ] < 1ms scrubbing overhead
- [ ] < 10ms CLI startup overhead
- [ ] 0 secrets leaked in tests
- [ ] 175+ tests passing

### Qualitative

- [ ] Users can safely share errors
- [ ] Users can use verbose mode without risk
- [ ] CI/CD logs are safe
- [ ] .gitignore protection works
- [ ] No configuration required

---

## Time Tracking

| Phase                              | Estimated  | Actual | Notes |
| ---------------------------------- | ---------- | ------ | ----- |
| Phase 1: Core Scrubbing            | 2 days     |        |       |
| Phase 2: Logger Integration        | 1 day      |        |       |
| Phase 3: Error Message Integration | 1 day      |        |       |
| Phase 4: GitIgnore Validation      | 2 days     |        |       |
| Phase 5: E2E Testing & Polish      | 2 days     |        |       |
| **Total**                          | **8 days** |        |       |

---

## Definition of Done

**This project is complete when:**

1. [ ] All tasks checked off
2. [ ] All tests passing (175+)
3. [ ] All documentation updated
4. [ ] Security audit passed
5. [ ] Performance validated
6. [ ] Code review approved
7. [ ] Merged to develop branch
8. [ ] Issue #11 closed
9. [ ] Users report safe error sharing

**User can successfully:**

1. [ ] Share any CLI output without security review
2. [ ] Use verbose mode without exposing secrets
3. [ ] Run in CI/CD with safe logs
4. [ ] Get warned about .gitignore issues
5. [ ] Auto-fix .gitignore with one command
