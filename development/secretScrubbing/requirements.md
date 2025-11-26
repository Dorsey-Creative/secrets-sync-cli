# Requirements: Secret Value Scrubbing

**Issue:** #11  
**Project:** Secret Scrubbing & .gitignore Protection  
**Priority:** High (Security)  
**Version:** 1.0  
**Date:** 2025-11-25

---

## User Stories

### US-1: Safe Error Sharing

**As a** developer encountering errors  
**I want** error messages to have secret values redacted  
**So that** I can safely share errors in GitHub issues, Slack, or forums without exposing credentials

**Acceptance Criteria:**

- AC-1.1: All error messages redact secret values with `[REDACTED]`
- AC-1.2: Key names are preserved for debugging context
- AC-1.3: Error structure and fix commands remain intact
- AC-1.4: Users can copy-paste errors without security review

### US-2: Safe Verbose Logging

**As a** developer debugging issues  
**I want** verbose mode to scrub secrets from debug output  
**So that** I can troubleshoot with detailed logs without security risk

**Acceptance Criteria:**

- AC-2.1: `--verbose` flag output has all secrets redacted
- AC-2.2: DEBUG level logs scrub secret values
- AC-2.3: Log context objects have secrets redacted
- AC-2.4: Stack traces don't expose secret values

### US-3: Safe CI/CD Logs

**As a** DevOps engineer  
**I want** CI/CD logs to never contain secret values  
**So that** build logs can be stored and reviewed safely

**Acceptance Criteria:**

- AC-3.1: All CLI output in CI is scrubbed
- AC-3.2: Error messages in CI logs are safe to store
- AC-3.3: No secrets appear in GitHub Actions logs
- AC-3.4: Audit logs are safe for long-term retention

### US-4: .gitignore Protection

**As a** developer setting up the project  
**I want** to be warned if my .gitignore doesn't protect secrets  
**So that** I don't accidentally commit secret files to version control

**Acceptance Criteria:**

- AC-4.1: CLI checks .gitignore for required patterns on startup
- AC-4.2: Warning shown if `.env` pattern is missing
- AC-4.3: Warning shown if `**/bak/` pattern is missing
- AC-4.4: Actionable fix commands provided
- AC-4.5: `--fix-gitignore` flag auto-adds missing patterns

### US-5: Transparent Security

**As a** CLI user  
**I want** secret scrubbing to work automatically  
**So that** I don't have to think about security when using the tool

**Acceptance Criteria:**

- AC-5.1: Scrubbing is always enabled (no opt-out)
- AC-5.2: No configuration required
- AC-5.3: No noticeable performance impact
- AC-5.4: Works consistently across all commands

---

## Functional Requirements

### FR-1: Secret Pattern Detection

**Description:** Detect secret values in strings using pattern matching

**Requirements:**

- FR-1.1: Detect `KEY=value` patterns
- FR-1.2: Detect common secret key names (see list below)
- FR-1.3: Detect URL credentials (`protocol://user:pass@host`)
- FR-1.4: Detect JWT tokens (Base64-encoded patterns)
- FR-1.5: Detect multi-line secrets (private keys, certificates)
- FR-1.6: Case-insensitive key name matching
- FR-1.7: Input length limits (50KB max) to prevent catastrophic backtracking
- FR-1.8: Graceful failure on oversized input (return placeholder, never unscrubbed text)
- FR-1.9: Intercept process.stdout.write and process.stderr.write to prevent direct stream bypass
- FR-1.10: Bootstrap architecture - interception runs before any module initialization
- FR-1.11: Scrub string elements in arrays (e.g., console.log(['API_KEY=secret']))
- FR-1.12: Load user config in bootstrap before interception (custom patterns active during module init)
- FR-1.13: Use Proxy to intercept ALL console methods (including assert, count, group, time, etc.)

**Common Secret Key Names (Auto-detected):**

- PASSWORD, PASSWD, PWD
- SECRET, API_KEY, APIKEY, API_SECRET
- TOKEN, AUTH, AUTHORIZATION, AUTH_TOKEN
- PRIVATE_KEY, ACCESS_KEY, SECRET_KEY
- DATABASE_URL, DB_URL, DB_PASSWORD
- CLIENT_SECRET, CLIENT_ID (when value looks like secret)
- AWS_SECRET_ACCESS_KEY, AWS_ACCESS_KEY_ID
- GITHUB_TOKEN, GH_TOKEN
- STRIPE_SECRET_KEY, STRIPE_API_KEY

**User Configuration:** Users can add custom patterns via env-config.yml (see FR-8)

**Verification:**

```typescript
// Test cases
scrub("API_KEY=sk_live_123") === "API_KEY=[REDACTED]"
scrub("password=secret123") === "password=[REDACTED]"
scrub("postgres://user:pass@host") === "postgres://user:[REDACTED]@host"

// Regex timeout test
const maliciousInput = "A".repeat(10000) + "=secret";
expect(() => scrub(maliciousInput)).not.toThrow();
expect(scrub(maliciousInput)).not.toContain("secret");
```

### FR-2: Secret Value Redaction

**Description:** Replace secret values with `[REDACTED]` placeholder

**Requirements:**

- FR-2.1: Replace secret values with `[REDACTED]`
- FR-2.2: Preserve key names for debugging
- FR-2.3: Preserve error structure and formatting
- FR-2.4: Handle empty values (don't redact empty strings)
- FR-2.5: Handle cyclic object references (prevent stack overflow, return [CIRCULAR])
- FR-2.5: Handle null/undefined values gracefully

**Verification:**

```typescript
scrub("API_KEY=") === "API_KEY="  // Empty not redacted
scrub("API_KEY=value") === "API_KEY=[REDACTED]"
scrub("KEY=value\nOTHER=data") === "KEY=[REDACTED]\nOTHER=data"
```

### FR-3: Logger Integration

**Description:** Integrate scrubbing into logger module

**Requirements:**

- FR-3.1: Scrub all logger.error() output
- FR-3.2: Scrub all logger.warn() output
- FR-3.3: Scrub all logger.info() output
- FR-3.4: Scrub all logger.debug() output
- FR-3.5: Scrub context objects passed to logger
- FR-3.6: Scrub nested objects in context
- FR-3.7: Scrub file operation messages (read/write paths)
- FR-3.8: All output must pass through logger (including stack traces)

**Verification:**

```typescript
logger.error("Failed", { apiKey: "secret" })
// Output: "Failed" with context { apiKey: "[REDACTED]" }

logger.info("Writing to /path/API_KEY=secret.env")
// Output: "Writing to /path/API_KEY=[REDACTED].env"

logger.error("Stack trace", { stack: "Error at API_KEY=secret" })
// Output: Stack trace with { stack: "Error at API_KEY=[REDACTED]" }
```

### FR-4: Error Message Integration

**Description:** Integrate scrubbing into error message builder

**Requirements:**

- FR-4.1: Scrub error message text
- FR-4.2: Scrub error context objects
- FR-4.3: Scrub stack traces (via logger integration)
- FR-4.4: Scrub error.message property
- FR-4.5: Scrub nested error causes
- FR-4.6: All errors logged through logger (ensures stack trace scrubbing)

**Verification:**

```typescript
buildErrorMessage({ what: "API_KEY=secret failed" })
// Output: "API_KEY=[REDACTED] failed"

try {
  throw new Error("Failed with API_KEY=secret123");
} catch (error) {
  logger.error("Caught error", { error });
  // Stack trace should be scrubbed via logger
}
```

### FR-5: .gitignore Validation

**Description:** Check user's .gitignore for secret protection patterns

**Requirements:**

- FR-5.1: Read .gitignore file from project root
- FR-5.2: Check for `.env` pattern
- FR-5.3: Check for `.env.*` pattern
- FR-5.4: Check for `**/bak/` pattern
- FR-5.5: Check for `*.bak` pattern
- FR-5.6: Handle missing .gitignore file
- FR-5.7: Handle malformed .gitignore (invalid syntax, e.g., unclosed brackets, invalid regex)
- FR-5.8: Validate pattern order (negations like `!.env.example` must come after wildcards)
- FR-5.9: Cross-platform support (Windows and Unix paths)

**Verification:**

```bash
# Missing patterns
secrets-sync --dry-run
# Shows warning with missing patterns

# All patterns present
secrets-sync --dry-run
# No warning shown

# Malformed .gitignore
echo "[invalid" > .gitignore
secrets-sync --dry-run
# Shows warning about invalid syntax

# Pattern order validation
echo -e "!.env.example\n.env" > .gitignore
secrets-sync --dry-run
# Shows warning about incorrect pattern order
```

### FR-6: .gitignore Auto-Fix

**Description:** Automatically add missing patterns to .gitignore

**Requirements:**

- FR-6.1: Add `--fix-gitignore` CLI flag
- FR-6.2: Append missing patterns to .gitignore in correct order
- FR-6.3: Create .gitignore if it doesn't exist
- FR-6.4: Add comment explaining additions
- FR-6.5: Preserve existing .gitignore content
- FR-6.6: Show confirmation of patterns added
- FR-6.7: Enforce pattern order (wildcards before negations)
- FR-6.8: Use forward slashes for cross-platform compatibility

**Pattern Order:**

```
.env
.env.*
!.env.example
**/bak/
*.bak
```

**Verification:**

```bash
secrets-sync --fix-gitignore
# Output: Added 3 patterns to .gitignore
# .gitignore now contains all required patterns in correct order

# Windows test
# Patterns should use forward slashes even on Windows
```

### FR-7: Performance Optimization

**Description:** Ensure scrubbing doesn't impact CLI performance

**Requirements:**

- FR-7.1: Scrubbing adds < 1ms per operation
- FR-7.2: Compile regex patterns once at startup
- FR-7.3: Cache scrubbing results using in-memory LRU cache (max 1000 entries)
- FR-7.4: Cache invalidated after each CLI run
- FR-7.5: No memory leaks from caching
- FR-7.6: Input length limit (50KB max) to prevent catastrophic backtracking

**Verification:**

```typescript
// Benchmark
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  scrub("API_KEY=secret123");
}
const duration = performance.now() - start;
expect(duration / 1000).toBeLessThan(1); // < 1ms per call

// Length limit verification
const largeInput = 'A'.repeat(60000) + '=secret';
expect(scrubSecrets(largeInput)).toBe('[SCRUBBING_FAILED:INPUT_TOO_LARGE]');
```

### FR-8: Whitelist Support

**Description:** Allow certain patterns to bypass scrubbing via configuration

**Requirements:**

- FR-8.1: Whitelist common non-secret patterns (DEBUG, NODE_ENV, PORT, etc.)
- FR-8.2: Don't redact boolean values (true/false)
- FR-8.3: Don't redact numeric values (ports, IDs)
- FR-8.4: Don't redact URLs without credentials
- FR-8.5: Don't redact file paths
- FR-8.6: Support user-defined whitelist patterns in env-config.yml
- FR-8.7: Support glob patterns (*_VALUE, *_ID) for whitelist
- FR-8.8: Support user-defined scrub patterns (*_KEY, *_API, *_TOKEN)

**Configuration Example:**

```yaml
# env-config.yml
scrubbing:
  whitelistPatterns:
    - DEBUG
    - NODE_ENV
    - PORT
    - "*_VALUE"
    - "*_ID"
  scrubPatterns:
    - "*_KEY"
    - "*_API"
    - "*_TOKEN"
    - "*_SECRET"
```

**Verification:**

```typescript
scrub("DEBUG=true") === "DEBUG=true"  // Not redacted
scrub("PORT=3000") === "PORT=3000"  // Not redacted
scrub("URL=https://api.com") === "URL=https://api.com"  // Not redacted
scrub("PASSWORD=secret") === "PASSWORD=[REDACTED]"  // Redacted
scrub("MY_VALUE=123") === "MY_VALUE=123"  // Whitelisted by pattern
scrub("CUSTOM_KEY=secret") === "CUSTOM_KEY=[REDACTED]"  // Scrubbed by pattern
```

---

## Technical Requirements

### TR-1: Scrubbing Module

**Description:** Create centralized scrubbing utility module

**Requirements:**

- TR-1.1: Create `src/utils/scrubber.ts` module
- TR-1.2: Export `scrubSecrets(text: string): string` function
- TR-1.3: Export `scrubObject(obj: any): any` function
- TR-1.4: Export `isSecretKey(key: string): boolean` function
- TR-1.5: Use TypeScript with strict types
- TR-1.6: Add comprehensive JSDoc comments

**Verification:**

```typescript
import { scrubSecrets, scrubObject } from './utils/scrubber';
expect(scrubSecrets).toBeDefined();
expect(scrubObject).toBeDefined();
```

### TR-2: Pattern Definitions

**Description:** Define regex patterns for secret detection

**Requirements:**

- TR-2.1: Define KEY=value pattern
- TR-2.2: Define URL credential pattern
- TR-2.3: Define JWT token pattern
- TR-2.4: Define private key pattern (BEGIN/END blocks)
- TR-2.5: Define common secret key names list
- TR-2.6: Compile patterns at module load time

**Verification:**

```typescript
const patterns = getSecretPatterns();
expect(patterns.keyValue).toBeInstanceOf(RegExp);
expect(patterns.urlCredentials).toBeInstanceOf(RegExp);
```

### TR-3: Logger Modification

**Description:** Modify logger to scrub all output

**Requirements:**

- TR-3.1: Import scrubber in logger module
- TR-3.2: Scrub message text before output
- TR-3.3: Scrub context objects before formatting
- TR-3.4: Maintain existing logger API
- TR-3.5: No breaking changes to logger interface

**Verification:**

```typescript
// Existing code continues to work
logger.error("message", { context });
// But now scrubs secrets automatically
```

### TR-4: Error Message Modification

**Description:** Modify error message builder to scrub output

**Requirements:**

- TR-4.1: Import scrubber in errorMessages module
- TR-4.2: Scrub message text in buildErrorMessage()
- TR-4.3: Scrub context in formatContext()
- TR-4.4: Maintain existing error message API
- TR-4.5: No breaking changes to error format

**Verification:**

```typescript
// Existing code continues to work
buildErrorMessage({ what, why, howToFix });
// But now scrubs secrets automatically
```

### TR-5: .gitignore Validator Module

**Description:** Create .gitignore validation utility

**Requirements:**

- TR-5.1: Create `src/utils/gitignoreValidator.ts` module
- TR-5.2: Export `validateGitignore(): ValidationResult` function
- TR-5.3: Export `fixGitignore(): void` function
- TR-5.4: Handle file system errors gracefully
- TR-5.5: Return structured validation results

**Verification:**

```typescript
import { validateGitignore } from './utils/gitignoreValidator';
const result = validateGitignore();
expect(result.isValid).toBeDefined();
expect(result.missingPatterns).toBeArray();
```

### TR-6: CLI Flag Addition

**Description:** Add --fix-gitignore flag to CLI

**Requirements:**

- TR-6.1: Add `fixGitignore?: boolean` to Flags interface
- TR-6.2: Parse `--fix-gitignore` flag
- TR-6.3: Call fixGitignore() when flag is present
- TR-6.4: Exit after fixing (don't continue with normal operation)
- TR-6.5: Update help text with new flag

**Verification:**

```bash
secrets-sync --help | grep "fix-gitignore"
# Shows: --fix-gitignore  Add missing patterns to .gitignore
```

---

## Non-Functional Requirements

### NFR-1: Performance

**Description:** Scrubbing must not impact CLI performance

**Requirements:**

- NFR-1.1: Scrubbing adds < 1ms overhead per operation
- NFR-1.2: CLI startup time increases < 10ms
- NFR-1.3: Memory usage increases < 1MB
- NFR-1.4: Error display delay < 50ms (no noticeable lag)

**Verification:**

```bash
# Benchmark CLI startup
time secrets-sync --help
# Should be < 500ms (same as before)

# Benchmark scrubbing
bun run scripts/benchmark-scrubbing.ts
# Should show < 1ms per operation

# Benchmark error display
time (echo "test" | secrets-sync --invalid 2>&1)
# Error should appear within 50ms
```

### NFR-2: Reliability

**Description:** Scrubbing must never fail or break CLI

**Requirements:**

- NFR-2.1: Scrubbing errors don't crash CLI
- NFR-2.2: Invalid patterns are skipped gracefully
- NFR-2.3: Malformed input doesn't break scrubbing
- NFR-2.4: Scrubbing always returns a string (never throws)
- NFR-2.5: On scrubber failure, log warning and fail gracefully (never return unscrubbed text)
- NFR-2.6: Regex timeout protection prevents infinite hangs

**Verification:**

```typescript
// Should never throw
expect(() => scrubSecrets(null)).not.toThrow();
expect(() => scrubSecrets(undefined)).not.toThrow();
expect(() => scrubSecrets("")).not.toThrow();

// Regex timeout test
const maliciousInput = "A".repeat(10000) + "=secret";
expect(() => scrubSecrets(maliciousInput)).not.toThrow();
expect(scrubSecrets(maliciousInput)).not.toContain("secret");

// Graceful failure test
mockRegexTimeout();
const result = scrubSecrets("API_KEY=secret");
expect(result).toBe("[SCRUBBING_FAILED]"); // Never returns unscrubbed text
```

### NFR-3: Maintainability

**Description:** Scrubbing code must be easy to maintain and extend

**Requirements:**

- NFR-3.1: Centralized scrubbing logic (single module)
- NFR-3.2: Pattern definitions in one place
- NFR-3.3: Comprehensive unit tests
- NFR-3.4: Clear documentation
- NFR-3.5: User-configurable patterns via env-config.yml

**Verification:**

- Code review confirms single source of truth
- Test coverage >= 100% for scrubber module
- Documentation includes pattern examples
- Users can add custom patterns without code changes

### NFR-4: Security

**Description:** Scrubbing must be comprehensive and cannot be bypassed

**Requirements:**

- NFR-4.1: No opt-out flag or configuration
- NFR-4.2: Scrubbing always enabled
- NFR-4.3: No way to disable scrubbing (verified via negative tests)
- NFR-4.4: Scrubbing applied before any output
- NFR-4.5: No secrets in any output channel (stdout, stderr, logs)

**Verification:**

```bash
# No flag to disable
secrets-sync --no-scrub  # Should not exist
secrets-sync --disable-scrubbing  # Should not exist

# All outputs are scrubbed
secrets-sync 2>&1 | grep -i "password=.*[^REDACTED]"
# Should find nothing

# Negative test: Try to disable via config
echo "scrubbing: { enabled: false }" > env-config.yml
secrets-sync --dry-run 2>&1 | grep "API_KEY=secret"
# Should still be scrubbed (config option ignored)
```

### NFR-5: Testability

**Description:** All scrubbing functionality must be testable

**Requirements:**

- NFR-5.1: Unit tests for all scrubbing functions
- NFR-5.2: Integration tests for logger integration
- NFR-5.3: Integration tests for error message integration
- NFR-5.4: E2E tests for .gitignore validation
- NFR-5.5: Test coverage >= 100% for scrubber module

**Verification:**

```bash
bun test tests/unit/scrubber.test.ts
bun test tests/integration/scrubbing.test.ts
bun test tests/e2e/gitignore.test.ts
# All tests pass, coverage >= 100%
```

---

## Security Requirements

### SEC-1: No Secret Leakage

**Description:** Secrets must never appear in any output

**Requirements:**

- SEC-1.1: No secrets in console.log output
- SEC-1.2: No secrets in console.error output
- SEC-1.3: No secrets in logger output
- SEC-1.4: No secrets in error messages
- SEC-1.5: No secrets in stack traces

**Verification:**

```bash
# Run CLI with secrets, capture all output
secrets-sync 2>&1 | grep -E "(password|token|secret|key)=.+[^REDACTED]"
# Should find nothing
```

### SEC-2: Comprehensive Coverage

**Description:** All secret types must be detected

**Requirements:**

- SEC-2.1: Passwords redacted
- SEC-2.2: API keys redacted
- SEC-2.3: Tokens redacted
- SEC-2.4: Database URLs with credentials redacted
- SEC-2.5: Private keys redacted
- SEC-2.6: JWT tokens redacted

**Verification:**

```typescript
// Test all secret types
expect(scrub("PASSWORD=secret")).toContain("[REDACTED]");
expect(scrub("API_KEY=sk_123")).toContain("[REDACTED]");
expect(scrub("TOKEN=abc123")).toContain("[REDACTED]");
expect(scrub("postgres://user:pass@host")).toContain("[REDACTED]");
```

### SEC-3: .gitignore Protection

**Description:** Prevent accidental commits of secret files

**Requirements:**

- SEC-3.1: Warn if .env not in .gitignore
- SEC-3.2: Warn if bak/ not in .gitignore
- SEC-3.3: Provide fix commands
- SEC-3.4: Auto-fix available
- SEC-3.5: Warning shown on every run until fixed

**Verification:**

```bash
# Remove .env from .gitignore
sed -i '' '/\.env/d' .gitignore

# Run CLI
secrets-sync --dry-run
# Should show warning about missing .env pattern
```

---

## Test Requirements

### Test-1: Unit Tests - Scrubber Module

**Description:** Test all scrubbing functions in isolation

**Test Cases:**

- Test-1.1: scrubSecrets() with KEY=value pattern
- Test-1.2: scrubSecrets() with URL credentials
- Test-1.3: scrubSecrets() with JWT tokens
- Test-1.4: scrubSecrets() with multi-line secrets (private keys)
- Test-1.5: scrubObject() with nested objects
- Test-1.6: scrubObject() with arrays
- Test-1.7: isSecretKey() with common secret keys
- Test-1.8: isSecretKey() with whitelisted keys
- Test-1.9: Edge cases (null, undefined, empty)
- Test-1.10: Performance (< 1ms per call)
- Test-1.11: Regex timeout protection
- Test-1.12: Graceful failure (never returns unscrubbed text)
- Test-1.13: LRU cache functionality
- Test-1.14: User-defined patterns from config

**Coverage Target:** 100%

### Test-2: Integration Tests - Logger

**Description:** Test scrubbing integration with logger

**Test Cases:**

- Test-2.1: logger.error() scrubs secrets
- Test-2.2: logger.warn() scrubs secrets
- Test-2.3: logger.info() scrubs secrets
- Test-2.4: logger.debug() scrubs secrets
- Test-2.5: Context objects are scrubbed
- Test-2.6: Nested context is scrubbed
- Test-2.7: Existing logger tests still pass

**Coverage Target:** 100% of modified code

### Test-3: Integration Tests - Error Messages

**Description:** Test scrubbing integration with error messages

**Test Cases:**

- Test-3.1: buildErrorMessage() scrubs secrets
- Test-3.2: formatContext() scrubs secrets
- Test-3.3: Error stack traces are scrubbed
- Test-3.4: Existing error message tests still pass

**Coverage Target:** 100% of modified code

### Test-4: Integration Tests - .gitignore Validation

**Description:** Test .gitignore validation functionality

**Test Cases:**

- Test-4.1: Detects missing .env pattern
- Test-4.2: Detects missing bak/ pattern
- Test-4.3: Handles missing .gitignore file
- Test-4.4: Handles malformed .gitignore (invalid syntax)
- Test-4.5: --fix-gitignore adds patterns
- Test-4.6: --fix-gitignore creates .gitignore if missing
- Test-4.7: --fix-gitignore preserves existing content
- Test-4.8: Validates pattern order (negations after wildcards)
- Test-4.9: Cross-platform support (Windows paths)
- Test-4.10: Patterns use forward slashes on all platforms

**Coverage Target:** 100%

### Test-5: E2E Tests - Complete Scrubbing

**Description:** Test complete user journeys with scrubbing

**Test Cases:**

- Test-5.1: Error with secret is scrubbed in output
- Test-5.2: Verbose mode scrubs secrets
- Test-5.3: CI environment scrubs secrets
- Test-5.4: .gitignore warning shown when needed
- Test-5.5: --fix-gitignore works end-to-end

**Coverage Target:** All user stories validated

---

## Acceptance Criteria Summary

### Must Have (MVP)

- ✅ AC-1.1: Error messages redact secrets
- ✅ AC-1.2: Key names preserved
- ✅ AC-2.1: Verbose mode scrubs secrets
- ✅ AC-4.1: .gitignore validation on startup
- ✅ AC-4.4: Fix commands provided
- ✅ AC-5.1: Always enabled

### Should Have

- ✅ AC-2.3: Context objects scrubbed
- ✅ AC-2.4: Stack traces scrubbed
- ✅ AC-4.5: --fix-gitignore flag
- ✅ AC-5.3: No performance impact

### Nice to Have

- ⭕ Length hints in redaction (e.g., [REDACTED:32])
- ⭕ Configurable redaction placeholder
- ⭕ Scrubbing statistics/metrics

---

## Traceability Matrix

| Requirement | User Story | Test      | Verification Method   |
| ----------- | ---------- | --------- | --------------------- |
| FR-1.1      | US-1       | Test-1.1  | Unit test             |
| FR-1.2      | US-1       | Test-1.7  | Unit test             |
| FR-2.1      | US-1       | Test-1.1  | Unit test             |
| FR-3.1      | US-2       | Test-2.1  | Integration test      |
| FR-3.4      | US-2       | Test-2.4  | Integration test      |
| FR-4.1      | US-1       | Test-3.1  | Integration test      |
| FR-5.1      | US-4       | Test-4.1  | Integration test      |
| FR-6.1      | US-4       | Test-4.5  | Integration test      |
| NFR-1.1     | US-5       | Test-1.10 | Performance benchmark |
| SEC-1.1     | US-3       | Test-5.3  | E2E test              |

---

## Dependencies

### Internal Dependencies

- Logger module (`src/utils/logger.ts`)
- Error message builder (`src/utils/errorMessages.ts`)
- Error classes (`src/utils/errors.ts`)

### External Dependencies

- None (no new npm packages required)

---

## Risks & Mitigations

| Risk                               | Impact | Probability | Mitigation                    |
| ---------------------------------- | ------ | ----------- | ----------------------------- |
| Over-scrubbing removes useful info | Medium | Low         | Whitelist common non-secrets  |
| Under-scrubbing leaks secrets      | High   | Medium      | Comprehensive pattern testing |
| Performance degradation            | Low    | Low         | Benchmark and optimize        |
| Breaking existing tests            | Medium | Medium      | Run full test suite           |

---

## Success Criteria

**Project is complete when:**

1. All functional requirements implemented
2. All test requirements pass (100% coverage)
3. All security requirements validated
4. No performance regression
5. All existing tests pass
6. Documentation updated
7. User acceptance testing passed

**User can successfully:**

1. Share any CLI output without security review
2. Use verbose mode without exposing secrets
3. Run in CI/CD with safe logs
4. Get warned about .gitignore issues
5. Auto-fix .gitignore with one command
