# Problem Statement: Secret Value Scrubbing

**Issue:** #11  
**Priority:** High (Security)  
**Type:** Bug / Security Enhancement  
**Created:** 2025-11-25

---

## Problem Description

### Current State

The CLI currently handles environment secrets (`.env` files) and can display error messages, logs, and stack traces when operations fail. However, there is **no protection against accidentally exposing secret values** in these outputs.

**Security Risk Examples:**

1. **File read errors** might include file content in error context
2. **Parsing errors** could show the line containing the secret
3. **Validation errors** might display the actual secret value
4. **Stack traces** could capture secret values in function arguments
5. **Logger output** in verbose mode could log secret values
6. **GitHub API errors** might echo back secret values in responses

### Real-World Scenario

```typescript
// User has this in .env:
DATABASE_URL=postgresql://user:MyS3cr3tP@ss@localhost/db

// Current behavior - ERROR EXPOSED:
❌ Failed to parse .env line 5
   Invalid format: DATABASE_URL=postgresql://user:MyS3cr3tP@ss@localhost/db
   Expected: KEY=value

// What we need - SECRET REDACTED:
❌ Failed to parse .env line 5
   Invalid format: DATABASE_URL=[REDACTED]
   Expected: KEY=value
```

### Why This Matters

- **CI/CD Logs:** Error messages are logged in CI systems (GitHub Actions, etc.)
- **Terminal History:** Errors remain in terminal scrollback
- **Screen Sharing:** Developers might share screens during debugging
- **Issue Reports:** Users might copy-paste errors into GitHub issues
- **Log Aggregation:** Logs might be sent to external monitoring services

---

## Existing Infrastructure

We already have robust error handling infrastructure from issue #5:

### Available Components

1. **Logger Module** (`src/utils/logger.ts`)
   
   - 4 log levels (ERROR, WARN, INFO, DEBUG)
   - Centralized logging with context
   - ANSI color formatting

2. **Error Classes** (`src/utils/errors.ts`)
   
   - `AppError` base class with context
   - Specialized error types (DependencyError, PermissionError, etc.)

3. **Error Message Builder** (`src/utils/errorMessages.ts`)
   
   - `buildErrorMessage()` - formats all error output
   - `formatContext()` - formats error context
   - Centralized message formatting

4. **Error Catalog** (`src/messages/errors.json`)
   
   - Structured error messages
   - Template interpolation

### Integration Points

The scrubbing logic needs to be integrated at these points:

1. **Logger output** - Before writing to console
2. **Error message builder** - Before formatting messages
3. **Context formatting** - Before displaying error context
4. **Stack traces** - Before displaying stack information

---

## Proposed Solution

### Core Functionality

Create a **secret scrubbing utility** that:

1. **Detects secret patterns** in strings
2. **Redacts secret values** with `[REDACTED]` placeholder
3. **Preserves key names** for debugging context
4. **Integrates seamlessly** with existing error handling

### Additional Security Hardening

1. **Add backup files to .gitignore**
   
   - Prevent accidental commits of `config/env/bak/` directory
   - Backup files contain unencrypted secrets
   - Critical security fix (related: issue #30 for encryption)

2. **Validate user's .gitignore**
   
   - Check if user's project has `.gitignore`
   - Warn if `.env` files are not ignored
   - Warn if `bak/` directory is not ignored
   - Provide actionable fix commands
   - Run check at CLI startup (can be skipped with flag)

**Example Warning:**

```
⚠️  Security Warning: Your .gitignore may not protect secrets

Missing patterns in .gitignore:
  - .env
  - .env.*
  - **/bak/

These files contain secrets and should not be committed.

Fix: Add to your .gitignore:
  echo ".env" >> .gitignore
  echo ".env.*" >> .gitignore
  echo "**/bak/" >> .gitignore

Or run: secrets-sync --fix-gitignore
```

### Detection Strategy

Identify secrets by:

1. **Key-value patterns:** `KEY=value` format
2. **Common secret keys:** PASSWORD, TOKEN, SECRET, API_KEY, etc.
3. **URL credentials:** `protocol://user:pass@host`
4. **JWT tokens:** Base64-encoded tokens
5. **File paths:** Redact content from `.env` files

### Redaction Rules

- **Keep key names:** `API_KEY=[REDACTED]` (not `[REDACTED]=[REDACTED]`)
- **Show length hint:** `API_KEY=[REDACTED:32]` (optional)
- **Preserve structure:** Keep line numbers, file paths, error types
- **Consistent placeholder:** Always use `[REDACTED]` for uniformity

---

## End-User Success Criteria

### What Users Should Be Able To Do

1. **Share error messages safely**
   
   - Copy-paste errors into GitHub issues without exposing secrets
   - Share terminal output during pair programming
   - Post logs in public forums for help

2. **Debug with confidence**
   
   - See which key caused the error (key name preserved)
   - Understand the error context (structure preserved)
   - Get actionable fix commands (no secrets in commands)

3. **Run in CI/CD safely**
   
   - CI logs don't contain secret values
   - Build failures can be investigated without security risk
   - Audit logs are safe to store long-term

4. **Use verbose mode without risk**
   
   - `--verbose` flag shows debug info but scrubs secrets
   - Detailed logging for troubleshooting
   - No accidental exposure in debug output

5. **Prevent accidental commits**
   
   - CLI warns if .gitignore doesn't protect secrets
   - Get actionable commands to fix .gitignore
   - Optional `--fix-gitignore` flag to auto-fix
   - Confidence that secrets won't be committed

### Success Validation

**Before (Current - UNSAFE):**

```
❌ Failed to sync secret to GitHub
   API_KEY=sk_live_51abc123xyz789...
   Error: Invalid API key format
```

**After (With Scrubbing - SAFE):**

```
❌ Failed to sync secret to GitHub
   API_KEY=[REDACTED]
   Error: Invalid API key format
```

### User Experience Goals

- **Transparent:** Users don't need to think about scrubbing, it just works
- **Consistent:** All outputs (errors, logs, traces) are scrubbed
- **Debuggable:** Enough context remains to fix issues
- **Trustworthy:** Users can confidently share outputs

---

## Technical Requirements

### Functional Requirements

1. **FR-1:** Scrub secret values from all error messages
2. **FR-2:** Scrub secret values from all log output (ERROR, WARN, INFO, DEBUG)
3. **FR-3:** Scrub secret values from error context objects
4. **FR-4:** Scrub secret values from stack traces
5. **FR-5:** Preserve key names for debugging
6. **FR-6:** Detect common secret patterns (passwords, tokens, URLs with credentials)
7. **FR-7:** Handle multi-line secrets (e.g., private keys)
8. **FR-8:** Scrub secrets in file paths and content snippets
9. **FR-9:** Validate user's .gitignore for secret protection patterns
10. **FR-10:** Warn users if .env files or bak/ directory are not ignored
11. **FR-11:** Provide `--fix-gitignore` flag to automatically add patterns

### Non-Functional Requirements

1. **NFR-1:** Performance - Scrubbing adds < 1ms overhead per message
2. **NFR-2:** Reliability - Never fail to scrub (fail-safe, not fail-secure)
3. **NFR-3:** Maintainability - Centralized scrubbing logic, easy to extend patterns
4. **NFR-4:** Testability - 100% coverage for scrubbing logic

### Security Requirements

1. **SEC-1:** No secret values in console output
2. **SEC-2:** No secret values in error messages
3. **SEC-3:** No secret values in log files
4. **SEC-4:** No secret values in stack traces
5. **SEC-5:** Scrubbing cannot be disabled (no opt-out flag)

---

## Constraints

### Must Preserve

- **Key names** - Users need to know which secret failed
- **Error types** - Users need to know what went wrong
- **File paths** - Users need to know which file has issues
- **Line numbers** - Users need to locate the problem
- **Fix commands** - Users need actionable solutions

### Must Not Break

- **Existing error handling** - All current error flows must continue working
- **Test suite** - All 148 existing tests must pass
- **Performance** - No noticeable slowdown in CLI operations
- **Backward compatibility** - No breaking changes to error format

---

## Out of Scope

- **Encryption** - Not encrypting secrets, just redacting from output
- **Secret detection in files** - Not scanning files for secrets, only scrubbing output
- **Secret rotation** - Not managing secret lifecycle
- **Secret storage** - Not changing how secrets are stored
- **Audit logging** - Not adding audit trails (separate feature)

---

## Success Metrics

### Quantitative

- **Coverage:** 100% of error/log outputs scrubbed
- **Performance:** < 1ms overhead per scrubbing operation
- **Test Coverage:** 100% for scrubbing module
- **False Positives:** < 1% (non-secrets incorrectly redacted)
- **False Negatives:** 0% (no secrets should leak)

### Qualitative

- Users report feeling safe sharing error messages
- No security incidents related to leaked secrets in logs
- Developers can debug effectively with scrubbed output
- CI/CD logs are safe to store and review

---

## Dependencies

- **Existing:** Logger module, error message builder, error classes
- **New:** Secret scrubbing utility module
- **External:** None (no new dependencies)

---

## Risks & Mitigations

### Risk 1: Over-scrubbing (False Positives)

**Risk:** Scrubbing too aggressively removes useful debugging info

**Mitigation:**

- Whitelist common non-secret patterns
- Preserve key names always
- Test with real-world error scenarios

### Risk 2: Under-scrubbing (False Negatives)

**Risk:** Missing secret patterns allows leaks

**Mitigation:**

- Comprehensive pattern matching
- Test with various secret formats
- Regular security reviews
- Community feedback on patterns

### Risk 3: Performance Impact

**Risk:** Scrubbing adds latency to error handling

**Mitigation:**

- Optimize regex patterns
- Cache compiled patterns
- Benchmark performance
- Only scrub when needed (not on every string operation)

---

## Next Steps

1. **Design Phase:** Create detailed design document
2. **Implementation:** Build scrubbing utility
3. **Integration:** Wire into logger and error handlers
4. **Testing:** Comprehensive test suite
5. **Documentation:** Update error message docs
6. **Security Review:** Validate no leaks possible

---

## References

- Issue #11: https://github.com/Dorsey-Creative/secrets-sync-cli/issues/11
- Issue #5: Error handling infrastructure (completed)
- OWASP: Sensitive Data Exposure
- CWE-532: Insertion of Sensitive Information into Log File
