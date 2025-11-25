# Implementation Tasks: Error Handling Improvements

## Project Overview
**Issue:** #5  
**Branch:** `5-improve-error-handling`  
**Total Estimated Time:** 10 days  
**Requirements:** See `requirements.md`  
**Design:** See `design.md`

---

## Phase 1: Foundation (Days 1-2.5)
**Goal:** Create reusable error handling infrastructure  
**Time Estimate:** 2.5 days  
**Requirements:** TR-4, TR-5, NFR-3

### Task 1.1: Create Error Class Hierarchy
**Time:** 4 hours  
**Requirements:** TR-4  
**Design Reference:** Component Design § 4

**Sub-tasks:**
- [x] Create `src/utils/errors.ts` file
- [x] Implement `AppError` base class with context support
- [x] Implement `DependencyError` class with install info
- [x] Implement `PermissionError` class with fix commands
- [x] Implement `TimeoutError` class with duration tracking
- [x] Implement `ValidationError` class with field tracking
- [x] Add JSDoc comments for all classes
- [x] Export all error classes

**Validation for End-User Success:**
```bash
# Test that errors are properly typed
bun test tests/unit/errors.test.ts

# Verify error messages are user-friendly
node -e "
const { DependencyError } = require('./dist/utils/errors.js');
const err = new DependencyError('gh', 'https://cli.github.com', 'brew install gh');
console.log(err.message);
// Should output: 'Missing dependency: gh'
"
```

**Success Criteria:**
- [x] All error classes extend AppError
- [x] Each error type has specific properties
- [x] Error messages are concise and clear
- [x] TypeScript types are correct
- [x] User can understand error type from class name

---

### Task 1.2: Create Error Message Builder
**Time:** 4 hours  
**Requirements:** TR-5, FR-9, FR-11  
**Design Reference:** Component Design § 5

**Sub-tasks:**
- [x] Load error catalog from src/messages/errors.json
- [x] Implement getMessage() to lookup by error code
- [x] Implement interpolate() for context placeholders
- [x] Create `src/utils/errorMessages.ts` file
- [x] Implement `buildErrorMessage()` function
- [x] Implement `formatDependencyError()` function
- [x] Implement `formatPermissionError()` function
- [x] Implement `formatTimeoutError()` function
- [x] Add ANSI color support (red for errors)
- [x] Add context formatting helper
- [x] Export all formatting functions

**Validation for End-User Success:**
```bash
# Test message format consistency
bun test tests/unit/errorMessages.test.ts

# Verify actual output looks good
node -e "
const { buildErrorMessage } = require('./dist/utils/errorMessages.js');
const msg = buildErrorMessage({
  what: 'Failed to read file',
  why: 'Permission denied',
  howToFix: 'chmod 644 file.txt'
});
console.log(msg);
"
# Should show: ❌ Failed to read file
#              Permission denied
#              Fix: chmod 644 file.txt
```

**Success Criteria:**
- [x] Messages follow "what, why, how" format
- [x] Colors are used appropriately
- [x] Context is formatted readably
- [x] Messages fit in terminal width
- [x] User can copy-paste fix commands

---

### Task 1.3: Write Unit Tests for Foundation
**Time:** 4 hours  
**Requirements:** NFR-4  
**Design Reference:** Testing Strategy § Unit Tests

**Sub-tasks:**
- [x] Create `tests/unit/errors.test.ts`
- [x] Test each error class constructor
- [x] Test error class inheritance
- [x] Test error properties are set correctly
- [x] Create `tests/unit/errorMessages.test.ts`
- [x] Test message builder with all inputs
- [x] Test color formatting
- [x] Test context formatting
- [x] Achieve 100% coverage for both modules

**Validation for End-User Success:**
```bash
# Run tests with coverage
bun test --coverage tests/unit/errors.test.ts tests/unit/errorMessages.test.ts

# Verify coverage is 100%
# Check that error messages are readable in test output
```

**Success Criteria:**
- [x] All tests pass
- [x] 100% code coverage
- [x] Tests validate user-facing messages
- [x] Tests check message readability
- [x] Edge cases are covered

---

## Phase 2: Dependency Validation (Days 3-4)
**Goal:** Catch missing dependencies before operations  
**Time Estimate:** 2 days  
**Requirements:** FR-1, FR-2, FR-3, US-1

### Task 2.1: Create Dependency Validator Module
**Time:** 4 hours  
**Requirements:** TR-1, FR-1  
**Design Reference:** Component Design § 1

**Sub-tasks:**
- [ ] Create `src/utils/dependencies.ts` file
- [ ] Define `DependencyCheck` interface
- [ ] Define `ValidationResult` interface
- [ ] Implement `validateDependencies()` function
- [ ] Add parallel execution with `Promise.all()`
- [ ] Add session caching for results
- [ ] Add error aggregation (show all failures)
- [ ] Export interfaces and functions

**Validation for End-User Success:**
```bash
# Test that validation runs quickly
time node -e "
const { validateDependencies } = require('./dist/utils/dependencies.js');
validateDependencies([]).then(() => console.log('Done'));
"
# Should complete in < 1 second

# Test that all failures are shown at once
node -e "
const { validateDependencies } = require('./dist/utils/dependencies.js');
// Mock multiple failures
// Verify all are returned, not just first
"
```

**Success Criteria:**
- [ ] Validation completes in < 1 second
- [ ] All failures shown together (not fail-fast)
- [ ] Results are cached for session
- [ ] User sees complete picture of missing deps
- [ ] Parallel execution works correctly

---

### Task 2.2: Implement gh CLI Check
**Time:** 2 hours  
**Requirements:** FR-2, AC-1  
**Design Reference:** Component Design § 1

**Sub-tasks:**
- [ ] Create `ghCliCheck` dependency check
- [ ] Run `gh --version` to verify installation
- [ ] Handle "command not found" error
- [ ] Provide installation URL: https://cli.github.com
- [ ] Provide platform-specific install commands
- [ ] Add to dependency check list

**Validation for End-User Success:**
```bash
# Test with gh CLI missing
PATH=/usr/bin:/bin node dist/secrets-sync.js --help
# Should show:
# ❌ GitHub CLI (gh) not found
# Install: https://cli.github.com
# Or run: brew install gh (macOS)

# Test with gh CLI present
gh --version && node dist/secrets-sync.js --help
# Should proceed without error
```

**Success Criteria:**
- [ ] Detects missing gh CLI correctly
- [ ] Shows installation URL
- [ ] Shows platform-specific command
- [ ] User can install gh from error message
- [ ] Check is fast (< 500ms)

---

### Task 2.3: Implement gh Auth Check
**Time:** 2 hours  
**Requirements:** FR-2, AC-1  
**Design Reference:** Component Design § 1

**Sub-tasks:**
- [ ] Create `ghAuthCheck` dependency check
- [ ] Run `gh auth status` to verify authentication
- [ ] Handle "not logged in" error
- [ ] Provide auth command: `gh auth login`
- [ ] Add to dependency check list

**Validation for End-User Success:**
```bash
# Test with unauthenticated gh
gh auth logout && node dist/secrets-sync.js --help
# Should show:
# ❌ GitHub CLI not authenticated
# Fix: gh auth login

# Test with authenticated gh
gh auth login && node dist/secrets-sync.js --help
# Should proceed without error
```

**Success Criteria:**
- [ ] Detects unauthenticated gh correctly
- [ ] Shows auth command
- [ ] User can authenticate from error message
- [ ] Check is fast (< 500ms)
- [ ] Doesn't fail if gh not installed (handled by ghCliCheck)

---

### Task 2.4: Implement Node.js Version Check
**Time:** 2 hours  
**Requirements:** FR-3, AC-1  
**Design Reference:** Component Design § 1

**Sub-tasks:**
- [ ] Create `nodeVersionCheck` dependency check
- [ ] Read `process.version`
- [ ] Parse version string (e.g., "v18.0.0")
- [ ] Compare against minimum version (18.0.0)
- [ ] Show current and required versions in error
- [ ] Provide upgrade URL: https://nodejs.org
- [ ] Add to dependency check list

**Validation for End-User Success:**
```bash
# Test with old Node.js (mock process.version)
node -e "
Object.defineProperty(process, 'version', { value: 'v16.0.0' });
const { nodeVersionCheck } = require('./dist/utils/dependencies.js');
nodeVersionCheck.check().then(result => console.log(result));
"
# Should return false

# Verify error message is clear
# Should show: Node.js version 16.0.0 is too old (requires >= 18.0.0)
```

**Success Criteria:**
- [ ] Detects old Node.js correctly
- [ ] Shows current and required versions
- [ ] Shows upgrade URL
- [ ] User understands version requirement
- [ ] Check is instant (reads process.version)

---

### Task 2.5: Integrate Dependency Checks into main()
**Time:** 2 hours  
**Requirements:** FR-1, US-1  
**Design Reference:** Integration Points

**Sub-tasks:**
- [ ] Import dependency validator in `src/secrets-sync.ts`
- [ ] Add validation call at start of `main()`
- [ ] Format and display validation failures
- [ ] Exit with code 1 if validation fails
- [ ] Add `SKIP_DEPENDENCY_CHECK` env var for CI
- [ ] Update main() function

**Validation for End-User Success:**
```bash
# Test complete user journey
# 1. Fresh install without gh
PATH=/usr/bin:/bin secrets-sync --help
# Should show missing gh error and exit

# 2. Install gh but don't auth
brew install gh
secrets-sync --help
# Should show auth error and exit

# 3. Authenticate gh
gh auth login
secrets-sync --help
# Should show help (success)

# 4. Test skip flag for CI
SKIP_DEPENDENCY_CHECK=1 secrets-sync --help
# Should skip checks and show help
```

**Success Criteria:**
- [ ] Checks run before any operations
- [ ] User sees all missing dependencies at once
- [ ] Exit code is 1 on failure
- [ ] Skip flag works for CI
- [ ] User can resolve issues and retry

---

### Task 2.6: Write Integration Tests for Dependencies
**Time:** 4 hours  
**Requirements:** Test-1, Test-2, Test-6  
**Design Reference:** Testing Strategy § Integration Tests

**Sub-tasks:**
- [ ] Create `tests/integration/dependencies.test.ts`
- [ ] Test missing gh CLI scenario
- [ ] Test unauthenticated gh scenario
- [ ] Test old Node.js version scenario
- [ ] Test all dependencies present scenario
- [ ] Test skip flag scenario
- [ ] Test caching behavior
- [ ] Test parallel execution

**Validation for End-User Success:**
```bash
# Run integration tests
bun test tests/integration/dependencies.test.ts

# Manually verify error messages
# Run each test and check output is user-friendly
```

**Success Criteria:**
- [ ] All integration tests pass
- [ ] Tests cover all dependency scenarios
- [ ] Tests verify error message quality
- [ ] Tests check performance (< 1 second)
- [ ] Tests validate user can fix issues

---

## Phase 3: File Operation Safety (Days 5-6)
**Goal:** Handle permission errors gracefully  
**Time Estimate:** 2 days  
**Requirements:** FR-4, FR-5, FR-6, US-2

### Task 3.1: Create Safe File Operations Module
**Time:** 4 hours  
**Requirements:** TR-2, FR-4, FR-5, FR-6  
**Design Reference:** Component Design § 2

**Sub-tasks:**
- [ ] Create `src/utils/safeFs.ts` file
- [ ] Define `FileError` interface
- [ ] Implement `safeReadFile()` function
- [ ] Implement `safeWriteFile()` function
- [ ] Implement `safeReadDir()` function
- [ ] Implement `safeExists()` function
- [ ] Add error type detection (EACCES, EPERM, ENOENT)
- [ ] Generate appropriate chmod commands
- [ ] Export all functions

**Validation for End-User Success:**
```bash
# Test with unreadable file
echo "SECRET=value" > test.env
chmod 000 test.env

node -e "
const { safeReadFile } = require('./dist/utils/safeFs.js');
const result = safeReadFile('test.env');
console.log(result);
"
# Should show FileError with:
# - path: test.env
# - operation: read
# - fixCommand: chmod 644 test.env

# Verify fix command works
chmod 644 test.env
node -e "
const { safeReadFile } = require('./dist/utils/safeFs.js');
const result = safeReadFile('test.env');
console.log(result); // Should show file content
"
```

**Success Criteria:**
- [ ] All file operations wrapped safely
- [ ] Errors returned as values (not thrown)
- [ ] Fix commands are correct and testable
- [ ] User can copy-paste fix commands
- [ ] Original errors preserved for debugging

---

### Task 3.2: Replace fs Calls in Codebase
**Time:** 4 hours  
**Requirements:** FR-4, FR-5, FR-6  
**Design Reference:** Integration Points

**Sub-tasks:**
- [ ] Find all `fs.readFileSync` calls
- [ ] Replace with `safeReadFile`
- [ ] Add error handling for FileError
- [ ] Find all `fs.writeFileSync` calls
- [ ] Replace with `safeWriteFile`
- [ ] Add error handling for FileError
- [ ] Find all `fs.readdirSync` calls
- [ ] Replace with `safeReadDir`
- [ ] Add error handling for FileError
- [ ] Test each replacement

**Validation for End-User Success:**
```bash
# Test complete user journey with permission errors
# 1. Create unreadable .env file
mkdir -p config/env
echo "SECRET=value" > config/env/.env
chmod 000 config/env/.env

# 2. Run CLI
secrets-sync --dry-run
# Should show:
# ❌ Permission denied reading file: config/env/.env
# Fix: chmod 644 config/env/.env

# 3. Apply fix
chmod 644 config/env/.env

# 4. Run CLI again
secrets-sync --dry-run
# Should succeed

# 5. Test write permission
chmod 555 config/env  # Read-only directory
secrets-sync --env staging
# Should show:
# ❌ Permission denied writing file: config/env/.env.staging
# Fix: chmod 755 config/env
```

**Success Criteria:**
- [ ] All fs calls replaced
- [ ] Error messages show exact file paths
- [ ] Fix commands are correct
- [ ] User can resolve permission issues
- [ ] No regressions in file operations

---

### Task 3.3: Write Integration Tests for File Permissions
**Time:** 4 hours  
**Requirements:** Test-3, Test-4, AC-2  
**Design Reference:** Testing Strategy § Integration Tests

**Sub-tasks:**
- [ ] Create `tests/integration/filePermissions.test.ts`
- [ ] Test unreadable file scenario
- [ ] Test unwritable file scenario
- [ ] Test unreadable directory scenario
- [ ] Test unwritable directory scenario
- [ ] Test file not found scenario
- [ ] Test successful operations
- [ ] Verify fix commands are correct

**Validation for End-User Success:**
```bash
# Run integration tests
bun test tests/integration/filePermissions.test.ts

# Manually test each scenario
# Verify error messages guide user to solution
# Verify fix commands actually work
```

**Success Criteria:**
- [ ] All integration tests pass
- [ ] Tests cover all permission scenarios
- [ ] Tests verify fix commands work
- [ ] Tests check error message quality
- [ ] User can resolve issues from error messages

---

## Phase 4: Network Timeout Protection (Days 7-8)
**Goal:** Prevent infinite hangs on network operations  
**Time Estimate:** 2 days  
**Requirements:** FR-7, FR-8, US-3

### Task 4.1: Create Timeout Wrapper Module
**Time:** 4 hours  
**Requirements:** TR-3, FR-7  
**Design Reference:** Component Design § 3

**Sub-tasks:**
- [ ] Create `src/utils/timeout.ts` file
- [ ] Define `TimeoutOptions` interface
- [ ] Implement `withTimeout()` function using AbortController
- [ ] Implement `execWithTimeout()` wrapper
- [ ] Add timeout configuration from env var
- [ ] Implement `getTimeout()` helper
- [ ] Add cleanup on success/failure
- [ ] Export all functions

**Validation for End-User Success:**
```bash
# Test timeout behavior
node -e "
const { withTimeout } = require('./dist/utils/timeout.js');
const slowOp = () => new Promise(resolve => setTimeout(resolve, 60000));

withTimeout(slowOp, { timeout: 1000 })
  .catch(err => console.log(err.message));
"
# Should timeout after 1 second with clear message

# Test configurable timeout
SECRETS_SYNC_TIMEOUT=5000 node -e "
const { getTimeout } = require('./dist/utils/timeout.js');
console.log(getTimeout()); // Should show 5000
"

# Test that fast operations don't timeout
node -e "
const { withTimeout } = require('./dist/utils/timeout.js');
const fastOp = () => Promise.resolve('done');

withTimeout(fastOp, { timeout: 1000 })
  .then(result => console.log(result)); // Should show 'done'
"
```

**Success Criteria:**
- [ ] Timeouts work correctly
- [ ] AbortController cleans up properly
- [ ] Env var configuration works
- [ ] Fast operations aren't affected
- [ ] User can adjust timeout for slow networks

---

### Task 4.2: Replace exec Calls with Timeout Wrapper
**Time:** 4 hours  
**Requirements:** FR-7, FR-8  
**Design Reference:** Integration Points

**Sub-tasks:**
- [ ] Find all `exec()` calls in codebase
- [ ] Replace with `execWithTimeout()`
- [ ] Add timeout error handling
- [ ] Format timeout errors with suggestions
- [ ] Test each replacement
- [ ] Verify no infinite hangs possible

**Validation for End-User Success:**
```bash
# Test complete user journey with slow network
# 1. Simulate slow GitHub API
# (Use network throttling or mock)

# 2. Run CLI with default timeout
secrets-sync --env staging
# Should timeout after 30 seconds with:
# ❌ Operation timed out after 30 seconds: GitHub API call
# Suggestions:
# - Check your internet connection
# - Try again in a few moments
# - Increase timeout: SECRETS_SYNC_TIMEOUT=60000 secrets-sync ...

# 3. Run with increased timeout
SECRETS_SYNC_TIMEOUT=60000 secrets-sync --env staging
# Should wait longer before timing out

# 4. Test with fast network
# (Normal network conditions)
secrets-sync --env staging
# Should complete successfully without timeout
```

**Success Criteria:**
- [ ] All exec calls have timeouts
- [ ] No infinite hangs occur
- [ ] Timeout errors are clear
- [ ] Suggestions are actionable
- [ ] User can configure timeout

---

### Task 4.3: Write Integration Tests for Timeouts
**Time:** 4 hours  
**Requirements:** Test-5, Test-7, AC-3, AC-6  
**Design Reference:** Testing Strategy § Integration Tests

**Sub-tasks:**
- [ ] Create `tests/integration/timeout.test.ts`
- [ ] Test slow operation timeout
- [ ] Test fast operation success
- [ ] Test custom timeout from env var
- [ ] Test timeout error message
- [ ] Test cleanup on timeout
- [ ] Test cleanup on success
- [ ] Verify no memory leaks

**Validation for End-User Success:**
```bash
# Run integration tests
bun test tests/integration/timeout.test.ts

# Manually verify timeout behavior
# Test with real slow network if possible
# Verify error messages are helpful
```

**Success Criteria:**
- [ ] All integration tests pass
- [ ] Tests cover timeout scenarios
- [ ] Tests verify error messages
- [ ] Tests check cleanup
- [ ] No memory leaks detected

---

## Phase 5: Integration & Polish (Days 9-11.5)
**Goal:** Ensure all error handling works together  
**Time Estimate:** 2.5 days  
**Requirements:** All AC, NFR-2

### Task 5.1: End-to-End Testing
**Time:** 4 hours  
**Requirements:** All AC  
**Design Reference:** Testing Strategy § E2E Tests

**Sub-tasks:**
- [ ] Create `tests/e2e/errorHandling.test.ts`
- [ ] Test complete user journey: missing gh
- [ ] Test complete user journey: permission denied
- [ ] Test complete user journey: network timeout
- [ ] Test complete user journey: all errors at once
- [ ] Test complete user journey: successful run
- [ ] Verify all error messages are consistent
- [ ] Verify all fix commands work

**Validation for End-User Success:**
```bash
# Run E2E tests
bun test tests/e2e/errorHandling.test.ts

# Manual E2E validation:
# 1. Fresh install scenario
rm -rf node_modules
npm install
PATH=/usr/bin:/bin secrets-sync --help
# Should show missing gh error

# 2. Install and auth
brew install gh
gh auth login
secrets-sync --help
# Should show help

# 3. Permission error scenario
chmod 000 config/env/.env
secrets-sync --dry-run
# Should show permission error with fix

# 4. Apply fix and retry
chmod 644 config/env/.env
secrets-sync --dry-run
# Should succeed

# 5. Timeout scenario (if testable)
# Simulate slow network
# Should timeout with clear message
```

**Success Criteria:**
- [ ] All E2E tests pass
- [ ] Complete user journeys work
- [ ] Error messages are consistent
- [ ] Fix commands work
- [ ] User can resolve all issues

---

### Task 5.2: Error Message Consistency Review
**Time:** 2 hours  
**Requirements:** FR-9, AC-4  
**Design Reference:** Appendix: Error Message Examples

**Sub-tasks:**
- [ ] Review all error messages in codebase
- [ ] Verify "what, why, how" format
- [ ] Check color usage is consistent
- [ ] Verify context is included where needed
- [ ] Check messages fit in terminal width
- [ ] Update any inconsistent messages
- [ ] Document error message patterns

**Validation for End-User Success:**
```bash
# Generate all possible errors
# Review each one manually
# Checklist for each error:
# - [ ] Starts with ❌
# - [ ] States what failed (one line)
# - [ ] Explains why it failed
# - [ ] Provides how to fix
# - [ ] Includes relevant context
# - [ ] Fix command is copy-pasteable
# - [ ] Message fits in 80 columns
```

**Success Criteria:**
- [ ] All errors follow same format
- [ ] Colors are used consistently
- [ ] Messages are readable
- [ ] Fix commands are actionable
- [ ] User can understand any error

---

### Task 5.3: Documentation Updates
**Time:** 4 hours  
**Requirements:** AC-4  
**Design Reference:** Documentation Updates

**Sub-tasks:**
- [ ] Update README.md with troubleshooting section
- [ ] Document `SECRETS_SYNC_TIMEOUT` env var
- [ ] Document `SKIP_DEPENDENCY_CHECK` env var
- [ ] Add common error examples to README
- [ ] Create troubleshooting guide
- [ ] Update CONTRIBUTING.md with error handling patterns
- [ ] Add error handling examples
- [ ] Update CHANGELOG.md

**Validation for End-User Success:**
```bash
# Review documentation
# Verify each common error is documented
# Verify examples match actual error output
# Test that users can find solutions in docs

# User test:
# Give someone the docs and a broken setup
# See if they can resolve issues using docs alone
```

**Success Criteria:**
- [ ] README has troubleshooting section
- [ ] All env vars documented
- [ ] Common errors have examples
- [ ] Examples match actual output
- [ ] User can self-service from docs

---

### Task 5.4: Performance Validation
**Time:** 2 hours  
**Requirements:** NFR-1  
**Design Reference:** Performance Considerations

**Sub-tasks:**
- [ ] Benchmark dependency checks
- [ ] Verify checks complete in < 1 second
- [ ] Benchmark error message generation
- [ ] Verify message generation is < 1ms
- [ ] Check for memory leaks in timeout wrapper
- [ ] Profile overall CLI startup time
- [ ] Optimize if needed

**Validation for End-User Success:**
```bash
# Benchmark dependency checks
time node -e "
const { validateDependencies, ghCliCheck, nodeVersionCheck } = require('./dist/utils/dependencies.js');
validateDependencies([ghCliCheck, nodeVersionCheck]);
"
# Should complete in < 1 second

# Benchmark message generation
node -e "
const { buildErrorMessage } = require('./dist/utils/errorMessages.js');
const start = Date.now();
for (let i = 0; i < 1000; i++) {
  buildErrorMessage({ what: 'test', why: 'test', howToFix: 'test' });
}
const duration = Date.now() - start;
console.log(\`Average: \${duration / 1000}ms per message\`);
"
# Should be < 1ms per message

# Check CLI startup time
time secrets-sync --help
# Should be fast (< 2 seconds total)
```

**Success Criteria:**
- [ ] Dependency checks < 1 second
- [ ] Message generation < 1ms
- [ ] No memory leaks
- [ ] CLI startup is fast
- [ ] User doesn't notice overhead

---

### Task 5.5: Regression Testing
**Time:** 2 hours  
**Requirements:** TR-8, AC-7  
**Design Reference:** Backward Compatibility

**Sub-tasks:**
- [ ] Run full existing test suite
- [ ] Verify all existing tests pass
- [ ] Test existing CLI commands unchanged
- [ ] Verify exit codes unchanged
- [ ] Test existing error handling still works
- [ ] Check no breaking changes
- [ ] Document any changes

**Validation for End-User Success:**
```bash
# Run all existing tests
bun test

# Test existing commands
secrets-sync --help
secrets-sync --version
secrets-sync --dry-run
secrets-sync --env staging

# Verify exit codes
secrets-sync --help; echo $?  # Should be 0
secrets-sync --invalid; echo $?  # Should be 1

# Test existing error scenarios still work
# (e.g., invalid config, missing files)
```

**Success Criteria:**
- [ ] All existing tests pass
- [ ] No breaking changes
- [ ] Exit codes unchanged
- [ ] CLI interface unchanged
- [ ] Existing users unaffected

---

### Task 5.6: User Acceptance Testing
**Time:** 4 hours  
**Requirements:** NFR-2  
**Design Reference:** Rollout Strategy

**Sub-tasks:**
- [ ] Recruit 2-3 test users
- [ ] Provide test scenarios
- [ ] Observe users encountering errors
- [ ] Collect feedback on error messages
- [ ] Measure time to resolution
- [ ] Identify confusing messages
- [ ] Update messages based on feedback
- [ ] Re-test with users

**Validation for End-User Success:**
```bash
# Test scenarios for users:
# 1. Fresh install without gh
# 2. Permission denied on .env file
# 3. Slow network timeout
# 4. Multiple errors at once

# Success metrics:
# - User resolves issue in < 5 minutes
# - User doesn't need to ask for help
# - User understands error message
# - User successfully applies fix
# - User can retry and succeed
```

**Success Criteria:**
- [ ] Users resolve issues quickly (< 5 min)
- [ ] Users don't need external help
- [ ] Error messages are clear
- [ ] Fix commands work
- [ ] Users report positive experience

---

## Completion Checklist

### Code Complete
- [ ] All error classes implemented
- [ ] All error formatters implemented
- [ ] Dependency validator complete
- [ ] Safe file operations complete
- [ ] Timeout wrapper complete
- [ ] All fs calls replaced
- [ ] All exec calls replaced
- [ ] Integration complete

### Testing Complete
- [ ] All unit tests pass (100% coverage)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Performance tests pass
- [ ] Regression tests pass
- [ ] User acceptance tests pass

### Documentation Complete
- [ ] README updated
- [ ] Troubleshooting guide added
- [ ] CONTRIBUTING.md updated
- [ ] CHANGELOG.md updated
- [ ] Code comments added
- [ ] API documentation complete

### Quality Checks
- [ ] Code review completed
- [ ] Error messages reviewed
- [ ] Performance validated
- [ ] No memory leaks
- [ ] No breaking changes
- [ ] Backward compatibility verified

### Deployment Ready
- [ ] All tests passing in CI
- [ ] Documentation reviewed
- [ ] User testing complete
- [ ] Ready for merge to develop
- [ ] Ready for release

---

## Success Metrics

### Quantitative Metrics
- [ ] Dependency checks complete in < 1 second
- [ ] Error message generation < 1ms
- [ ] Test coverage >= 90%
- [ ] Zero infinite hangs
- [ ] Exit codes unchanged

### Qualitative Metrics
- [ ] Users report errors are "clear and helpful"
- [ ] Users can resolve issues without help
- [ ] Error messages are actionable
- [ ] Fix commands work first try
- [ ] Users feel in control

### User Success Validation
- [ ] New users can install dependencies from errors
- [ ] Developers can fix permission issues from errors
- [ ] CI/CD operators can debug from logs
- [ ] All users understand what went wrong
- [ ] All users know how to fix issues

---

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1: Foundation | 2.5 days | | |
| Phase 2: Dependencies | 2 days | | |
| Phase 3: File Safety | 2 days | | |
| Phase 4: Timeouts | 2 days | | |
| Phase 5: Integration | 2.5 days | | |
| **Total** | **11 days** | | |

---

## Risk Mitigation

### If Behind Schedule
- [ ] Prioritize Phase 1-3 (core functionality)
- [ ] Phase 4 (timeouts) can be follow-up
- [ ] Phase 5 (polish) can be iterative

### If Issues Found
- [ ] Document in GitHub issue
- [ ] Add to task list
- [ ] Re-estimate timeline
- [ ] Communicate with stakeholders

### If User Feedback Negative
- [ ] Collect specific examples
- [ ] Update error messages
- [ ] Re-test with users
- [ ] Iterate until positive

---

## Definition of Done

**This project is complete when:**
- [ ] All tasks checked off
- [ ] All tests passing
- [ ] All documentation updated
- [ ] User acceptance testing passed
- [ ] Code review approved
- [ ] Merged to develop branch
- [ ] Issue #5 closed
- [ ] Users report improved experience

### Task 1.4: Create Error Message Catalog
**Time:** 3 hours  
**Requirements:** FR-11  
**Design Reference:** Component Design § 6

**Sub-tasks:**
- [x] Create `src/messages/` directory
- [x] Create `errors.json` file with structure
- [x] Define error codes for all error types (ERR_DEPENDENCY_MISSING, ERR_PERMISSION_DENIED, etc.)
- [x] Write message templates with context placeholders
- [x] Document error code naming convention (ERR_*)
- [x] Add validation function for catalog structure
- [x] Export catalog loader function

**Validation for End-User Success:**
```bash
# Verify catalog structure
node -e "
const catalog = require('./src/messages/errors.json');
Object.entries(catalog).forEach(([code, msg]) => {
  if (!msg.what || !msg.why || !msg.howToFix) {
    throw new Error(\`Invalid message: \${code}\`);
  }
  if (!code.startsWith('ERR_')) {
    throw new Error(\`Invalid code: \${code}\`);
  }
});
console.log('✓ Catalog valid -', Object.keys(catalog).length, 'error types');
"

# Test message interpolation
node -e "
const { getMessage } = require('./dist/utils/errorMessages.js');
const msg = getMessage('ERR_DEPENDENCY_MISSING', {
  dependency: 'gh',
  installUrl: 'https://cli.github.com'
});
console.log(msg);
// Should show interpolated message
"
```

**Success Criteria:**
- [x] All error types have catalog entries
- [x] Messages follow what/why/how format
- [x] Context placeholders documented
- [x] Catalog validates successfully
- [x] No hardcoded error messages in code

---


### Task 1.5: Create Logger Module
**Time:** 4 hours  
**Requirements:** TR-9  
**Design Reference:** Component Design § 7

**Sub-tasks:**
- [x] Create `src/utils/logger.ts` file
- [x] Implement LogLevel enum (ERROR, WARN, INFO, DEBUG)
- [x] Implement Logger class with level support
- [x] Add timestamp formatting (ISO 8601)
- [x] Add color support for each level (red, yellow, cyan, gray)
- [x] Add context formatting (JSON.stringify)
- [x] Respect verbose flag for level filtering
- [x] Export logger instance and Logger class

**Validation for End-User Success:**
```bash
# Test logger output at different levels
node -e "
const { Logger } = require('./dist/utils/logger.js');

// Normal mode
const logger = new Logger({ verbose: false });
logger.error('Test error', { file: 'test.txt' });
logger.info('Test info');
logger.debug('Test debug'); // Should NOT show

console.log('---');

// Verbose mode
const verboseLogger = new Logger({ verbose: true });
verboseLogger.error('Test error');
verboseLogger.info('Test info');
verboseLogger.debug('Test debug'); // Should show
"

# Verify format matches spec
# Should show: [TIMESTAMP] [LEVEL] message
# Context: { ... }
```

**Success Criteria:**
- [x] Logger supports all 4 levels
- [x] Format is consistent with timestamps
- [x] Verbose mode shows DEBUG, normal mode doesn't
- [x] Colors are applied correctly
- [x] Context is formatted as JSON
- [x] User can see clear, colored output

---


### Task 1.6: Add Verbose Flag to CLI
**Time:** 2 hours  
**Requirements:** FR-12, US-5  
**Design Reference:** Component Design § 8

**Sub-tasks:**
- [x] Add `verbose?: boolean` to Flags interface
- [x] Add `--verbose` flag to CLI parser
- [x] Add verbose to config flags boolean keys
- [x] Pass verbose flag to logger initialization
- [x] Update help text to document verbose flag
- [x] Test flag parsing
- [x] Wire logger into main() function
- [x] Add debug logging to demonstrate verbose mode
- [x] Keep -v for --version (backward compatibility)

**Validation for End-User Success:**
```bash
# Test verbose flag
secrets-sync --verbose --help 2>&1 | head -20
# Should show DEBUG level logs

# Test short flag
secrets-sync -v --help 2>&1 | head -20
# Should show DEBUG level logs

# Test normal mode (no flag)
secrets-sync --help 2>&1 | head -20
# Should NOT show DEBUG level logs

# Verify help text
secrets-sync --help | grep -i verbose
# Should show: --verbose, -v  Show detailed debug output
```

**Success Criteria:**
- [x] `--verbose` flag is recognized
- [x] `-v` short flag works
- [x] Logger respects verbose setting
- [x] Help text documents the flag
- [x] No behavior changes except output verbosity
- [x] User can enable debugging without code changes

---


### Task 5.7: Add Code Quality Checks
**Time:** 3 hours  
**Requirements:** TR-10, NFR-3  
**Design Reference:** Performance Considerations

**Sub-tasks:**
- [ ] Install jscpd for duplication checking
- [ ] Install complexity-report for complexity analysis
- [ ] Configure thresholds in package.json or config files
- [ ] Add npm scripts: `quality:duplication`, `quality:complexity`, `quality`
- [ ] Add quality checks to CI pipeline (.github/workflows)
- [ ] Document quality checks in README
- [ ] Run initial quality check and fix any violations

**Validation for End-User Success:**
```bash
# Check duplication
npm run quality:duplication
# Should pass with < 5% duplication
# Output: ✓ Duplication: 2.3% (threshold: 5%)

# Check complexity
npm run quality:complexity
# Should pass with < 10 complexity per function
# Output: ✓ Average complexity: 4.2 (threshold: 10)

# Run all quality checks
npm run quality
# Should pass all checks
# Output: ✓ All quality checks passed

# Verify CI integration
# Push code and check CI runs quality checks
```

**Success Criteria:**
- [ ] Tools installed and configured
- [ ] Thresholds set correctly (duplication < 5%, complexity < 10)
- [ ] CI fails if thresholds exceeded
- [ ] Documentation updated with quality commands
- [ ] Developers can run checks locally
- [ ] Code meets quality standards

---


---

## Version History

**v1.0** - 2025-11-25 - Initial task breakdown  
**v1.1** - 2025-11-25 - Added Tasks 1.4-1.6, 5.7; updated Task 1.2; updated time estimates to 11 days

---

## Task Summary

**Total Tasks:** 25 (was 21, +4 new)
- Phase 1: 6 tasks (was 3, +3 new: catalog, logger, verbose flag)
- Phase 2: 6 tasks (unchanged)
- Phase 3: 3 tasks (unchanged)
- Phase 4: 3 tasks (unchanged)
- Phase 5: 7 tasks (was 6, +1 new: code quality)

**New Tasks:**
- Task 1.4: Create Error Message Catalog (3 hours)
- Task 1.5: Create Logger Module (4 hours)
- Task 1.6: Add Verbose Flag to CLI (2 hours)
- Task 5.7: Add Code Quality Checks (3 hours)

**Updated Tasks:**
- Task 1.2: Now loads from catalog instead of building messages

**Time Impact:**
- Original: 10 days
- New work: +12 hours (1.5 days, rounded to 1 day)
- Total: 11 days

**Scope Clarifications:**
- Cross-platform: Node.js handles differences (no platform-specific code)
- Error recovery: Show fix info, no auto-retry
- Concurrent execution: Removed from scope
- i18n: Out of scope (catalog enables future support)
- Telemetry: Out of scope (create separate issue)

**Implementation Ready:** ✅
All tasks defined, all validation steps specified, ready to begin Phase 1.

