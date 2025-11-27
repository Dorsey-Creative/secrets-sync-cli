# Tasks: Scrubber Over-Redaction Fixes

## Overview

Patch release (v1.1.1) to fix scrubber over-redaction with whitelist enhancements and logger deduplication. No breaking changes.

**Total Tasks:** 30  
**Total Estimated Time:** 12 hours  
**Target Version:** 1.1.1 (patch)

**Critical Requirements:**
- Logger deduplication is MANDATORY
- Timestamps stored for debugging only (not in console output)
- No implementation details in CHANGELOG (security)
- Pre-commit hook prevents example/ commits
- Performance testing required

## Phase 1: Whitelist Enhancement (Low Risk)

**Goal:** Fix immediate redaction issues  
**Estimated Time:** 2.5 hours  
**Requirements:** FR-1, FR-1.6  
**Design:** Component 1

### Task 1.1: Add Configuration Fields to Whitelist
**Time:** 15 minutes  
**File:** `src/utils/scrubber.ts`

**Sub-tasks:**
- [x] Add `skipsecrets` to WHITELISTED_KEYS set
- [x] Add `skipunchanged` to WHITELISTED_KEYS set
- [x] Add `backupretention` to WHITELISTED_KEYS set
- [x] Verify whitelist is case-insensitive (lowercase entries)

**Validation:**
```bash
# User Success: Configuration visible in options table
bun run dev -- --dry-run
# Expected: Options table shows actual config values, not [REDACTED]
```

**Acceptance Criteria:**
- [x] WHITELISTED_KEYS contains all config field names
- [x] All entries are lowercase
- [x] Code compiles without errors

**References:**
- Requirement: FR-1.1
- Design: Component 1

---

### Task 1.2: Abstract Audit Table Field Name
**Time:** 30 minutes  
**File:** `src/secrets-sync.ts`, `src/utils/scrubber.ts`

**Sub-tasks:**
- [x] Rename internal audit fields to unconventional names (syncItemName, itemSource, syncAction, syncStatus)
- [x] Add unconventional field names to WHITELISTED_KEYS set
- [x] Update audit table rendering to map internal fields → user-friendly display names
- [x] Verify internal fields whitelisted, display names user-friendly
- [x] Verify generic secret names (key, name, secretkey) still detected as secrets

**Validation:**
```bash
# User Success: Audit table shows "Secret Name" header with key names
bun run dev -- --dry-run
# Expected: Table header "Secret Name", values show GITHUB_PROFILE, etc.
```

**Acceptance Criteria:**
- [x] Internal fields use unconventional names (syncItemName, itemSource, syncAction, syncStatus)
- [x] Display shows user-friendly headers ("Secret Name", "Source", "Action", "Status")
- [x] Key names visible (not [REDACTED])
- [x] Generic secret names (API_KEY, SECRET_KEY, key, password) still detected as secrets
- [x] Abstraction prevents scrubber from matching common secret field names

**References:**
- Requirement: FR-1.2, FR-1.6
- Design: Component 1 - Audit Table Abstraction

---

### Task 1.3: Add Audit Table Columns to Whitelist
**Time:** 10 minutes  
**File:** `src/utils/scrubber.ts`

**Sub-tasks:**
- [x] Add `syncitemname` to WHITELISTED_KEYS set (internal field)
- [x] Add `itemsource` to WHITELISTED_KEYS set (internal field)
- [x] Add `syncaction` to WHITELISTED_KEYS set (internal field)
- [x] Add `syncstatus` to WHITELISTED_KEYS set (internal field)
- [x] Verify generic names (key, name, source, action, status) NOT whitelisted

**Validation:**
```bash
# User Success: All audit columns visible
bun run dev -- --dry-run
# Expected: All column headers and values readable

# Security: Generic secret names still detected
bun test tests/unit/scrubber-whitelist.test.ts
# Expected: API_KEY, SECRET_KEY, key, password all detected as secrets
```

**Acceptance Criteria:**
- [x] WHITELISTED_KEYS contains unconventional audit field names only
- [x] All columns display correctly
- [x] Generic secret names (key, name, etc.) still detected as secrets

**References:**
- Requirement: FR-1.4
- Design: Component 1

---

### Task 1.4: Add Options Table Fields to Whitelist
**Time:** 15 minutes  
**File:** `src/utils/scrubber.ts`

**Sub-tasks:**
- [x] Add `env` to WHITELISTED_KEYS set
- [x] Add `dir` to WHITELISTED_KEYS set
- [x] Add `dryrun` to WHITELISTED_KEYS set
- [x] Add `overwrite` to WHITELISTED_KEYS set
- [x] Add `force` to WHITELISTED_KEYS set
- [x] Add `noconfirm` to WHITELISTED_KEYS set
- [x] Add `fixgitignore` to WHITELISTED_KEYS set
- [x] Add `skipgitignorecheck` to WHITELISTED_KEYS set

**Validation:**
```bash
# User Success: All CLI options visible
bun run dev -- --env staging --overwrite --dry-run
# Expected: Options table shows all flag values clearly
```

**Acceptance Criteria:**
- [x] All CLI option field names whitelisted
- [x] Options table fully readable
- [x] No [REDACTED] in options output

**References:**
- Requirement: FR-1.3
- Design: Component 1

---

### Task 1.5: Create Unit Tests for Whitelist
**Time:** 30 minutes  
**File:** `tests/unit/scrubber-whitelist.test.ts`

**Sub-tasks:**
- [x] Test `isSecretKey('skipsecrets')` returns false
- [x] Test `isSecretKey('secretkey')` returns false (internal field)
- [x] Test `isSecretKey('key')` returns false
- [x] Test `isSecretKey('source')` returns false
- [x] Test `isSecretKey('API_KEY')` returns true (actual secret)
- [x] Test `isSecretKey('password')` returns true (actual secret)
- [x] Test case-insensitive matching

**Validation:**
```bash
# Developer Success: Tests pass and cover whitelist logic
bun test tests/unit/scrubber-whitelist.test.ts
# Expected: All tests pass, 100% coverage of whitelist additions
```

**Acceptance Criteria:**
- [x] 7+ test cases covering whitelist
- [x] All tests pass
- [x] Tests verify both whitelisted and non-whitelisted keys

**References:**
- Requirement: FR-1.5, Test-1
- Design: Testing Strategy

---

### Task 1.6: Create Integration Tests for Options Table
**Time:** 20 minutes  
**File:** `tests/integration/options-output.test.ts`

**Sub-tasks:**
- [x] Test options table shows skipSecrets value
- [x] Test options table shows all CLI flags
- [x] Test no [REDACTED] in options output
- [x] Test with multiple configuration values

**Validation:**
```bash
# User Success: Real CLI output shows configuration
bun test tests/integration/options-output.test.ts
# Expected: Tests verify actual CLI output format
```

**Acceptance Criteria:**
- [x] Tests run full CLI with real arguments
- [x] Tests parse actual console output
- [x] Tests verify user-visible strings

**References:**
- Requirement: Test-2
- Design: Testing Strategy

---

### Task 1.7: Create Integration Tests for Audit Table
**Time:** 25 minutes  
**File:** `tests/integration/audit-output.test.ts`

**Sub-tasks:**
- [x] Test audit table shows "Secret Name" header
- [x] Test audit table shows key names (not [REDACTED])
- [x] Test secret values still redacted in diff output
- [x] Test with multiple secrets in audit

**Validation:**
```bash
# User Success: Audit table readable and informative
bun test tests/integration/audit-output.test.ts
# Expected: Tests verify key names visible, values protected
```

**Acceptance Criteria:**
- [x] Tests verify "Secret Name" header
- [x] Tests verify key names visible
- [x] Tests verify values still protected
- [x] Tests check actual table formatting

**References:**
- Requirement: Test-2
- Design: Testing Strategy

---

### Phase 1 Validation Checklist

**End-User Success Criteria:**
- [x] Run `bun run dev -- --dry-run` and verify options table readable
- [x] Run `bun run dev -- --dry-run` and verify audit table shows "Secret Name" header
- [x] Run `bun run dev -- --dry-run` and verify key names visible
- [x] Run `bun test` and verify all 269 tests pass
- [x] No [REDACTED] in configuration or audit key names
- [x] Secret values still show [REDACTED] in diff output

**Time Check:** 2.5 hours total

---

## Phase 2: Logger Deduplication (Medium Risk - MANDATORY)

**Goal:** Eliminate duplicate log entries and ensure timestamps stored for debugging only  
**Estimated Time:** 4 hours  
**Requirements:** FR-2  
**Design:** Component 2

**Critical:** Timestamps should only be saved for debugging if user shares logs. Store in location that will never be committed.

### Task 2.1: Add Debug Logging to Trace Duplicates
**Time:** 30 minutes  
**File:** `src/utils/logger.ts`

**Sub-tasks:**
- [ ] Add `--debug-logger` flag to CLI
- [ ] Add stack trace capture on log calls
- [ ] Log call site information (file, line, function)
- [ ] Add unique ID to each log call

**Validation:**
```bash
# Developer Success: Can trace where logs originate
bun run dev -- --debug-logger --dry-run 2>&1 | grep "WARN.*required-secrets"
# Expected: Shows call stack for each log entry
```

**Acceptance Criteria:**
- [ ] Debug flag captures call stacks
- [ ] Can identify duplicate call sites
- [ ] Debug output doesn't affect normal operation

**References:**
- Requirement: FR-2.1
- Design: Component 2

---

### Task 2.2: Investigate Logger Instance Count
**Time:** 45 minutes  
**Files:** `src/utils/logger.ts`, `src/secrets-sync.ts`

**Sub-tasks:**
- [ ] Check for multiple logger instantiations
- [ ] Search codebase for `new Logger()` calls
- [ ] Check for logger imports in multiple files
- [ ] Verify singleton pattern if exists

**Validation:**
```bash
# Developer Success: Identify if multiple loggers exist
grep -r "new Logger()" src/
grep -r "import.*logger" src/
# Expected: Find all logger creation points
```

**Acceptance Criteria:**
- [ ] Document all logger instantiation points
- [ ] Identify if singleton pattern needed
- [ ] Create fix plan based on findings

**References:**
- Requirement: FR-2.1, TR-2.1
- Design: Component 2

---

### Task 2.3: Investigate Bootstrap Interception
**Time:** 45 minutes  
**File:** `src/bootstrap.ts`

**Sub-tasks:**
- [ ] Check if console methods patched multiple times
- [ ] Verify patch guard flag exists
- [ ] Check for duplicate event listeners
- [ ] Test bootstrap in isolation

**Validation:**
```bash
# Developer Success: Understand bootstrap behavior
node -e "require('./dist/bootstrap.js'); console.log('test'); console.log('test');"
# Expected: Each message appears once
```

**Acceptance Criteria:**
- [ ] Document bootstrap interception flow
- [ ] Identify if multiple patches occur
- [ ] Create fix plan for bootstrap issues

**References:**
- Requirement: FR-2.1, TR-2.3
- Design: Component 2

---

### Task 2.4: Investigate Logger Output Paths
**Time:** 30 minutes  
**File:** `src/utils/logger.ts`

**Sub-tasks:**
- [ ] Check if logger calls console.log directly
- [ ] Check if logger emits events that trigger console.log
- [ ] Verify scrubber integration point
- [ ] Map complete log flow from logger to console

**Validation:**
```bash
# Developer Success: Understand complete log flow
# Add temporary console.trace() in logger methods
bun run dev -- --dry-run 2>&1 | head -50
# Expected: See full call stack for log output
```

**Acceptance Criteria:**
- [ ] Document complete log flow diagram
- [ ] Identify all output paths
- [ ] Pinpoint duplicate source

**References:**
- Requirement: FR-2.1, TR-2.2
- Design: Component 2

---

### Task 2.5: Implement Logger Fix
**Time:** 1 hour  
**File:** `src/utils/logger.ts` or `src/bootstrap.ts`

**Sub-tasks:**
- [ ] Implement singleton pattern if needed
- [ ] Remove duplicate console.log calls
- [ ] Add patch guard to bootstrap if missing
- [ ] Remove duplicate event listeners if found
- [ ] Test fix in isolation

**Validation:**
```bash
# User Success: Clean log output with no duplicates
bun run dev -- --dry-run 2>&1 | grep "WARN.*required-secrets" | wc -l
# Expected: Output is "1" (single line)
```

**Acceptance Criteria:**
- [ ] Each log message appears exactly once
- [ ] Timestamps consistent across all logs
- [ ] No regression in log functionality

**References:**
- Requirement: FR-2.2
- Design: Component 2

---

### Task 2.6: Create Unit Tests for Logger
**Time:** 30 minutes  
**File:** `tests/unit/logger-singleton.test.ts`

**Sub-tasks:**
- [ ] Test logger returns same instance
- [ ] Test log message appears exactly once
- [ ] Test multiple log calls don't duplicate
- [ ] Test logger with scrubber integration

**Validation:**
```bash
# Developer Success: Logger behavior verified
bun test tests/unit/logger-singleton.test.ts
# Expected: All tests pass, logger outputs once per call
```

**Acceptance Criteria:**
- [ ] Tests verify singleton behavior
- [ ] Tests count actual console.log calls
- [ ] Tests pass consistently

**References:**
- Requirement: Test-1
- Design: Testing Strategy

---

### Task 2.7: Create Integration Tests for Log Deduplication
**Time:** 30 minutes  
**File:** `tests/integration/logger-output.test.ts`

**Sub-tasks:**
- [ ] Test full CLI run has no duplicate logs
- [ ] Test specific warning messages appear once
- [ ] Test info messages appear once
- [ ] Test error messages appear once

**Validation:**
```bash
# User Success: Real CLI output clean
bun test tests/integration/logger-output.test.ts
# Expected: Tests verify no duplicates in actual CLI runs
```

**Acceptance Criteria:**
- [ ] Tests run full CLI workflows
- [ ] Tests parse and count log lines
- [ ] Tests verify unique output

**References:**
- Requirement: FR-2.4, Test-2
- Design: Testing Strategy

---

### Phase 2 Validation Checklist

**End-User Success Criteria:**
- [ ] Run `bun run dev -- --dry-run` and count log lines manually
- [ ] Verify each message appears exactly once
- [ ] Verify timestamps present on all logs
- [ ] Run `bun test` and verify all tests pass
- [ ] No duplicate entries in any CLI output

**Time Check:** 4 hours total

---

## Phase 3: Example Directory (Low Risk)

**Goal:** Create local testing environment  
**Estimated Time:** 2 hours  
**Requirements:** FR-3  
**Design:** Component 3

### Task 3.1: Create Example Directory Structure
**Time:** 15 minutes  
**Path:** `example/`

**Sub-tasks:**
- [ ] Create `example/` directory
- [ ] Create `example/config/env/` subdirectories
- [ ] Create `example/README.md` with usage instructions
- [ ] Create sample `.env` files with fake data

**Validation:**
```bash
# Developer Success: Directory structure correct
ls -la example/config/env/
# Expected: Directory exists with sample files
```

**Acceptance Criteria:**
- [ ] Directory structure created
- [ ] README with clear instructions
- [ ] Sample files with fake/test data
- [ ] No real secrets in examples

**References:**
- Requirement: FR-3.1
- Design: Component 3

---

### Task 3.2: Update .gitignore
**Time:** 10 minutes  
**File:** `.gitignore`

**Sub-tasks:**
- [ ] Add `example/` to .gitignore
- [ ] Add comment explaining why
- [ ] Test git status doesn't show example/

**Validation:**
```bash
# User Success: Example directory ignored by git
touch example/config/env/.env
git status
# Expected: example/ not listed in untracked files
```

**Acceptance Criteria:**
- [ ] example/ in .gitignore
- [ ] Git ignores example/ files
- [ ] Comment added for clarity

**References:**
- Requirement: FR-3.2
- Design: Component 3

---

### Task 3.3: Update Package Distribution Config
**Time:** 15 minutes  
**File:** `package.json`

**Sub-tasks:**
- [ ] Verify `files` field exists in package.json
- [ ] Ensure example/ not in files list
- [ ] Add comment if needed
- [ ] Test with npm pack

**Validation:**
```bash
# Developer Success: Example excluded from package
npm pack
tar -tzf secrets-sync-cli-*.tgz | grep example
# Expected: No output (example/ not in tarball)
```

**Acceptance Criteria:**
- [ ] example/ excluded from package
- [ ] npm pack verified
- [ ] Tarball inspected

**References:**
- Requirement: FR-3.3, TR-3
- Design: Component 3

---

### Task 3.4: Create Example README
**Time:** 30 minutes  
**File:** `example/README.md`

**Sub-tasks:**
- [ ] Document purpose of example/ directory
- [ ] Provide setup instructions
- [ ] Show CLI usage examples
- [ ] Add safety warnings
- [ ] Explain git/npm exclusion

**Validation:**
```bash
# User Success: README clear and helpful
cat example/README.md
# Expected: Clear instructions for using example/
```

**Acceptance Criteria:**
- [ ] README created
- [ ] Instructions clear
- [ ] Safety warnings included
- [ ] Examples provided

**References:**
- Requirement: FR-3.4
- Design: Component 3

---

### Task 3.5: Update CONTRIBUTING.md
**Time:** 20 minutes  
**File:** `CONTRIBUTING.md`

**Sub-tasks:**
- [ ] Add section on local testing with example/
- [ ] Document example/ directory purpose
- [ ] Provide workflow examples
- [ ] Link to example/README.md

**Validation:**
```bash
# Developer Success: Contributing guide updated
grep -A 10 "example" CONTRIBUTING.md
# Expected: Section on using example/ for testing
```

**Acceptance Criteria:**
- [ ] CONTRIBUTING.md updated
- [ ] Testing workflow documented
- [ ] example/ usage explained

**References:**
- Requirement: FR-3.4
- Design: Component 3

---

### Task 3.6: Create E2E Tests with Example Directory
**Time:** 30 minutes  
**File:** `tests/e2e/example-directory.test.ts`

**Sub-tasks:**
- [ ] Test CLI runs against example/ files
- [ ] Test example/ not in git status
- [ ] Test example/ not in npm pack
- [ ] Test scrubbing works with example data

**Validation:**
```bash
# Developer Success: E2E tests verify example/ behavior
bun test tests/e2e/example-directory.test.ts
# Expected: All tests pass
```

**Acceptance Criteria:**
- [ ] E2E tests created
- [ ] Tests verify git exclusion
- [ ] Tests verify npm exclusion
- [ ] All tests pass

**References:**
- Requirement: Test-3
- Design: Testing Strategy

---

### Phase 3 Validation Checklist

**End-User Success Criteria:**
- [ ] Create test files in example/config/env/
- [ ] Run `git status` and verify example/ not shown
- [ ] Run `bun run dev -- --dir example/config/env --dry-run`
- [ ] Verify CLI works with example/ files
- [ ] Run `npm pack` and verify example/ not in tarball
- [ ] Follow example/README.md instructions successfully

**Time Check:** 2 hours total

---

## Phase 4: Release (Low Risk)

**Goal:** Release fixes as v1.1.1  
**Estimated Time:** 1 hour  
**Requirements:** All  
**Design:** Success Metrics

### Task 4.1: Update Version Number
**Time:** 5 minutes  
**File:** `package.json`

**Sub-tasks:**
- [ ] Update version to 1.1.1
- [ ] Verify version format correct
- [ ] Commit version change

**Validation:**
```bash
# Developer Success: Version updated correctly
cat package.json | grep version
# Expected: "version": "1.1.1"
```

**Acceptance Criteria:**
- [ ] Version is 1.1.1
- [ ] Follows semantic versioning (patch)
- [ ] Committed to git

**References:**
- Design: Success Metrics

---

### Task 4.2: Update CHANGELOG
**Time:** 15 minutes  
**File:** `CHANGELOG.md`

**Sub-tasks:**
- [ ] Add [1.1.1] section with release date
- [ ] Document whitelist enhancements
- [ ] Document logger deduplication
- [ ] Document example/ directory
- [ ] Mark as patch release (bug fixes only)

**Validation:**
```bash
# User Success: CHANGELOG complete and accurate
cat CHANGELOG.md | head -50
# Expected: v1.1.1 section with all fixes
```

**Acceptance Criteria:**
- [ ] CHANGELOG updated
- [ ] Release date added
- [ ] All fixes documented
- [ ] No breaking changes mentioned

**References:**
- Design: Success Metrics

---

### Task 4.3: Run Full Test Suite
**Time:** 10 minutes  
**Command:** `bun test`

**Sub-tasks:**
- [ ] Run all unit tests
- [ ] Run all integration tests
- [ ] Run all E2E tests
- [ ] Run security audit tests
- [ ] Verify 254+ tests pass

**Validation:**
```bash
# Developer Success: All tests pass
bun test
# Expected: 254+ tests pass, 0 failures
```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] No test failures
- [ ] No test warnings
- [ ] Coverage maintained

**References:**
- Design: Success Metrics

---

### Task 4.4: Manual Testing Checklist
**Time:** 15 minutes  
**Environment:** Local development

**Sub-tasks:**
- [ ] Test options table output (skipSecrets visible)
- [ ] Test audit table output (key names visible)
- [ ] Test no duplicate logs
- [ ] Test example/ directory workflow
- [ ] Test all CLI flags work
- [ ] Test with real .env files

**Validation:**
```bash
# User Success: Full CLI workflow works perfectly
bun run dev -- --dry-run
bun run dev -- --dir example/config/env --dry-run
# Expected: Clean output, no errors, no duplicates
```

**Acceptance Criteria:**
- [ ] All manual tests pass
- [ ] Output clean and readable
- [ ] No regressions found
- [ ] User experience validated

**References:**
- Design: Manual Testing Checklist

---

### Task 4.5: Create Release PR and Publish
**Time:** 15 minutes  
**Branch:** `release`

**Sub-tasks:**
- [ ] Create PR from develop to release
- [ ] Fill out PR template
- [ ] Link related issues
- [ ] Verify CI passes
- [ ] Merge and trigger publish workflow

**Validation:**
```bash
# User Success: Package available on npm
npm view secrets-sync-cli version
# Expected: 1.1.1

npm install secrets-sync-cli@1.1.1
# Expected: Installs successfully
```

**Acceptance Criteria:**
- [ ] PR created and merged
- [ ] CI passes
- [ ] Published to npm
- [ ] Installation works

**References:**
- Design: Success Metrics

---

### Phase 4 Validation Checklist

**End-User Success Criteria:**
- [ ] Install from npm: `npm install secrets-sync-cli@1.1.1`
- [ ] Run CLI and verify all fixes work
- [ ] Read CHANGELOG and understand changes
- [ ] No breaking changes or migration needed
- [ ] No issues reported in first 24 hours

**Time Check:** 1 hour total

---

## Summary

### Total Effort Breakdown

| Phase | Tasks | Time | Risk |
|-------|-------|------|------|
| Phase 1: Whitelist Enhancement | 6 | 2h | Low |
| Phase 2: Logger Deduplication | 7 | 4h | Medium |
| Phase 3: Example Directory | 6 | 2h | Low |
| Phase 4: Release | 5 | 1h | Low |
| **Total** | **24** | **9h** | - |

### Critical Path

1. Phase 1 must complete first (whitelist fixes)
2. Phase 2 can run in parallel with Phase 3
3. Phase 4 requires all previous phases complete

### Success Metrics

**User Experience:**
- [ ] Options table shows configuration values (not [REDACTED])
- [ ] Audit table shows key names (not [REDACTED])
- [ ] No duplicate log entries
- [ ] Clean, professional CLI output

**Developer Experience:**
- [ ] Can test locally with example/ directory
- [ ] All tests pass (254+)
- [ ] Documentation accurate
- [ ] No breaking changes

**Security:**
- [ ] Secret values still redacted
- [ ] Security audit tests pass
- [ ] No new attack vectors
- [ ] Whitelist changes safe

### Version Strategy

**Patch Release (1.1.1):**
- Bug fixes only
- No breaking changes
- No API modifications
- Backward compatible

---

## Next Steps

1. Review and approve this task breakdown
2. Create GitHub issue for tracking
3. Begin Phase 1 implementation
4. Track progress with checkboxes
5. Validate each phase before proceeding

---

## References

- **Requirements:** `development/scrubber-fixes/requirements.md`
- **Design:** `development/scrubber-fixes/design.md`
- **Problem Statement:** `development/scrubber-fixes/problem-statement.md`
- **Bugs File:** `development/bugs-to-fix.md`
