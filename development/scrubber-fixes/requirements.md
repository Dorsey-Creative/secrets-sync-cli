# Requirements: Scrubber Over-Redaction Fixes

## Overview
Fix secret scrubber over-redaction issues where configuration values and key names are incorrectly redacted in CLI output. This is a whitelist-only fix with no breaking changes.

**Version:** 1.1.1 (patch release)  
**Breaking Changes:** None

## User Stories

### US-1: View Skip Configuration
**As a** CLI user  
**I want to** see which secrets are being skipped in the options table  
**So that** I can verify my configuration is correct

**Acceptance Criteria:**
- skipSecrets option displays actual key names (not values)
- Configuration is visible in parsed options table
- No redaction of configuration field names

### US-2: View Audit Key Names
**As a** CLI user  
**I want to** see secret key names in the audit summary  
**So that** I can understand what secrets are being synced

**Acceptance Criteria:**
- Audit table shows key names (e.g., GITHUB_PROFILE, API_KEY)
- Key names are not redacted
- Only secret values remain redacted

### US-3: Single Log Output
**As a** CLI user  
**I want to** see each log message once  
**So that** output is clean and readable

**Acceptance Criteria:**
- No duplicate log entries
- Timestamps appear consistently
- Log format is uniform across all messages

### US-4: Local Testing Environment
**As a** developer  
**I want to** test the CLI locally without committing test files  
**So that** I can catch bugs before production

**Acceptance Criteria:**
- example/ directory exists and is git-ignored
- example/ directory is excluded from npm package
- Can run CLI against example/ files locally

## Functional Requirements

### FR-1: Scrubber Whitelist Enhancement
**Requirement:** Add configuration and output field names to scrubber whitelist  
**Rationale:** Field names like `skipSecrets` and internal field names contain "secret" substring, triggering redaction  
**Verification:** Manual inspection of CLI output

**Sub-requirements:**
- FR-1.1: Add `skipsecrets` to WHITELISTED_KEYS set
- FR-1.2: Add internal audit field name to WHITELISTED_KEYS set (abstracted from display)
- FR-1.3: Add all CLI option field names to whitelist
- FR-1.4: Add all audit table column names to whitelist
- FR-1.5: Test whitelist prevents redaction of these fields
- FR-1.6: Abstract audit table internal field name from displayed column name

### FR-2: Logging Deduplication
**Requirement:** Eliminate duplicate log entries  
**Rationale:** Each log appears twice (with and without timestamp)  
**Verification:** Automated test checking log output count

**Sub-requirements:**
- FR-2.1: Identify source of duplicate logging
- FR-2.2: Remove duplicate log calls or consolidate loggers
- FR-2.3: Ensure timestamps appear consistently
- FR-2.4: Verify single output per log statement

### FR-3: Example Directory Setup
**Requirement:** Create local testing directory excluded from version control and distribution  
**Rationale:** Need safe environment to test with real-like data  
**Verification:** Check .gitignore and .npmignore files

**Sub-requirements:**
- FR-3.1: Create example/ directory structure
- FR-3.2: Add example/ to .gitignore
- FR-3.3: Add example/ to .npmignore or package.json files exclusion
- FR-3.4: Document example/ usage in CONTRIBUTING.md
- FR-3.5: Add pre-commit hook to prevent example/ commits

### FR-4: Performance Validation
**Requirement:** Ensure whitelist additions don't impact CLI performance  
**Rationale:** Adding ~15 entries to whitelist should have minimal impact  
**Verification:** Performance benchmarks

**Sub-requirements:**
- FR-4.1: Benchmark isSecretKey() with new whitelist entries
- FR-4.2: Measure CLI startup time before and after changes
- FR-4.3: Verify scrubbing performance < 1ms per operation
- FR-4.4: Document performance results

## Technical Requirements

### TR-1: Scrubber Pattern Matching
**Requirement:** Scrubber must distinguish between field names and secret values  
**Implementation:** Whitelist approach for known safe field names  
**Verification:** Unit tests for isSecretKey() function

**Test Cases:**
- TR-1.1: `isSecretKey('skipsecrets')` returns false (whitelisted)
- TR-1.2: `isSecretKey('secret')` returns false (whitelisted)
- TR-1.3: `isSecretKey('API_KEY')` returns true (actual secret key)
- TR-1.4: Whitelist is case-insensitive

### TR-2: Logger Architecture
**Requirement:** Single logger instance with consistent output format  
**Implementation:** Investigate logger initialization and call sites  
**Verification:** Code review and integration tests

**Investigation Points:**
- TR-2.1: Check for multiple logger instances
- TR-2.2: Check for console.log calls bypassing logger
- TR-2.3: Check for duplicate event listeners
- TR-2.4: Verify scrubber integration point

### TR-3: Package Distribution
**Requirement:** Exclude example/ from published npm package  
**Implementation:** .npmignore or package.json files field  
**Verification:** Test package contents with `npm pack`

**Implementation:**
- TR-3.1: Add example/ to .npmignore
- TR-3.2: Verify with `npm pack` and inspect tarball
- TR-3.3: Test installation from packed tarball
- TR-3.4: Document in build process

### TR-4: Pre-commit Hooks
**Requirement:** Prevent accidental commits of example/ directory  
**Implementation:** Git pre-commit hook  
**Verification:** Test hook prevents example/ commits

**Implementation:**
- TR-4.1: Create pre-commit hook script
- TR-4.2: Check for staged files in example/
- TR-4.3: Fail commit if example/ files staged
- TR-4.4: Document hook in CONTRIBUTING.md

## Testing Requirements

### Test-1: Unit Tests for Scrubber
- Test whitelist prevents redaction of skipSecrets
- Test whitelist prevents redaction of key/name fields
- Test secret values still get redacted
- Test isSecretKey() with new whitelisted terms

### Test-2: Integration Tests for CLI Output
- Test options table shows excludeKeys value
- Test audit table shows key names
- Test no duplicate log entries
- Test log format consistency

### Test-3: E2E Tests with Example Directory
- Test CLI runs against example/ files
- Test example/ not committed to git
- Test example/ not in npm package
- Test scrubbing works correctly with example data
- Test pre-commit hook prevents example/ commits

### Test-4: Performance Tests
- Benchmark isSecretKey() performance with new whitelist
- Measure CLI startup time impact
- Verify scrubbing operations < 1ms
- Generate test coverage report (80%+ target)

## Acceptance Criteria Summary

### AC-1: Configuration Visibility
- [ ] skipSecrets value visible in options table
- [ ] No [REDACTED] in configuration fields
- [ ] All CLI options readable

### AC-2: Audit Table Clarity
- [ ] secret column shows key names (GITHUB_PROFILE, etc.)
- [ ] Key names visible in audit table
- [ ] Values remain redacted

### AC-3: Clean Logging
- [ ] Each log message appears once
- [ ] Timestamps consistent across all logs
- [ ] No duplicate entries

### AC-4: Local Testing
- [ ] example/ directory created
- [ ] example/ in .gitignore
- [ ] example/ excluded from npm package
- [ ] Documentation updated with example/ usage
- [ ] Pre-commit hook prevents example/ commits

### AC-5: Test Coverage
- [ ] Unit tests for whitelist additions
- [ ] Integration tests for CLI output
- [ ] E2E tests with example/ directory
- [ ] All existing tests still pass
- [ ] Test coverage report shows 80%+ coverage

### AC-6: Performance
- [ ] isSecretKey() performance < 1ms
- [ ] CLI startup time unchanged
- [ ] Scrubbing operations < 1ms
- [ ] No performance regressions

## Dependencies

- Existing scrubber implementation (src/utils/scrubber.ts)
- Logger implementation (src/utils/logger.ts)
- CLI options parser (src/secrets-sync.ts)
- Audit table rendering logic

## Risks

1. **Whitelist Too Broad**: Adding generic terms like "secret" to whitelist might allow leaks
   - Mitigation: Only matches exact field name, not substrings in values

2. **Logger Investigation**: Root cause of duplicates may be complex
   - Mitigation: Add debug logging to trace duplicate source

## Out of Scope

- Changing core scrubbing algorithm
- Adding user-configurable whitelist (future enhancement)
- Changing log format or structure
- Adding log retention/rotation
- Renaming any configuration fields or API changes
