# Testing Guide: Scrubber Over-Redaction Fixes

## Overview

Manual testing checklist for v1.1.1 patch release. Use this guide to validate all fixes before release.

**Version:** 1.1.1  
**Test Environment:** Local development  
**Prerequisites:** Bun installed, project built

---

## Pre-Testing Setup

```bash
# Build project
bun run build

# Verify all automated tests pass
bun test

# Generate coverage report
bun test --coverage
```

**Expected:** All 254+ tests pass, coverage > 80%

---

## Test 1: Configuration Visibility

**Objective:** Verify skipSecrets visible in options table

**Steps:**
1. Run CLI with dry-run flag
   ```bash
   bun run dev -- --dry-run
   ```

2. Locate "Parsed options" table in output

3. Find `skipSecrets` row

**Expected Results:**
- [ ] skipSecrets row exists
- [ ] Value shows actual config (not `[REDACTED]`)
- [ ] All other option fields visible

**Failure Action:** Check whitelist contains `skipsecrets`

---

## Test 2: Audit Table Clarity

**Objective:** Verify key names visible in audit table

**Steps:**
1. Run CLI with dry-run flag
   ```bash
   bun run dev -- --dry-run
   ```

2. Locate "Audit Summary" table in output

3. Check column headers and values

**Expected Results:**
- [ ] Table header shows "Secret Name" (not "secret")
- [ ] Key names visible (GITHUB_PROFILE, API_KEY, etc.)
- [ ] No `[REDACTED]` in key name column
- [ ] Secret values still show `[REDACTED]` in diff output

**Failure Action:** Check audit field abstraction (secretKey → "Secret Name")

---

## Test 3: No Duplicate Logs

**Objective:** Verify each log message appears once

**Steps:**
1. Run CLI and capture output
   ```bash
   bun run dev -- --dry-run 2>&1 | tee output.log
   ```

2. Count specific log messages
   ```bash
   grep "WARN.*required-secrets" output.log | wc -l
   ```

3. Check for timestamp duplicates

**Expected Results:**
- [ ] Each message appears exactly once
- [ ] No duplicate lines (with and without timestamps)
- [ ] Timestamps consistent format

**Failure Action:** Check logger singleton and bootstrap patch guard

---

## Test 4: Example Directory Workflow

**Objective:** Verify example/ directory works and is excluded

**Steps:**
1. Create example directory
   ```bash
   mkdir -p example/config/env
   ```

2. Create test .env file
   ```bash
   echo "TEST_KEY=test_value" > example/config/env/.env
   ```

3. Run CLI against example
   ```bash
   bun run dev -- --dir example/config/env --dry-run
   ```

4. Check git status
   ```bash
   git status
   ```

5. Try to stage example/ file
   ```bash
   git add example/
   git commit -m "test"
   ```

6. Test npm pack
   ```bash
   npm pack
   tar -tzf secrets-sync-cli-*.tgz | grep example
   ```

**Expected Results:**
- [ ] CLI runs successfully against example/ files
- [ ] `git status` does not show example/ files
- [ ] Pre-commit hook prevents commit (should fail)
- [ ] `npm pack` does not include example/ (no output from grep)

**Failure Action:** Check .gitignore, pre-commit hook, and package.json files field

---

## Test 5: Performance Validation

**Objective:** Verify no performance regression

**Steps:**
1. Run performance benchmarks
   ```bash
   bun test tests/performance/scrubber-performance.test.ts
   ```

2. Measure CLI startup time
   ```bash
   time bun run dev -- --version
   ```

**Expected Results:**
- [ ] isSecretKey() < 1ms per call
- [ ] CLI startup < 500ms
- [ ] No performance warnings

**Failure Action:** Review whitelist size and scrubber algorithm

---

## Test 6: All CLI Flags

**Objective:** Verify all CLI flags work correctly

**Steps:**
1. Test each flag individually
   ```bash
   bun run dev -- --env staging --dry-run
   bun run dev -- --overwrite --dry-run
   bun run dev -- --force --dry-run
   bun run dev -- --verbose --dry-run
   bun run dev -- --fix-gitignore --dry-run
   ```

2. Test flag combinations
   ```bash
   bun run dev -- --env staging --overwrite --no-confirm --dry-run
   ```

**Expected Results:**
- [ ] All flags accepted
- [ ] No errors or warnings
- [ ] Expected behavior for each flag

**Failure Action:** Check argument parser and option handling

---

## Test 7: Real Environment Files

**Objective:** Verify CLI works with actual .env files

**Steps:**
1. Use real project .env files (with fake secrets)
   ```bash
   bun run dev -- --dir config/env --dry-run
   ```

2. Check output for correctness

3. Verify no real secrets exposed

**Expected Results:**
- [ ] CLI discovers all .env files
- [ ] Drift detection works
- [ ] Audit table accurate
- [ ] No secrets in output

**Failure Action:** Review scrubber patterns and whitelist

---

## Test 8: Backward Compatibility

**Objective:** Verify existing configurations still work

**Steps:**
1. Test with existing env-config.yml
   ```bash
   bun run dev -- --dry-run
   ```

2. Verify no warnings or errors

**Expected Results:**
- [ ] Existing configs work unchanged
- [ ] No migration needed
- [ ] No deprecation warnings

**Failure Action:** Check config loader for breaking changes

---

## Test 9: Error Handling

**Objective:** Verify errors are properly scrubbed

**Steps:**
1. Trigger various errors
   ```bash
   bun run dev -- --dir /nonexistent --dry-run
   bun run dev -- --env invalid --dry-run
   ```

2. Check error messages for secrets

**Expected Results:**
- [ ] Errors display correctly
- [ ] No secrets in error messages
- [ ] Stack traces scrubbed

**Failure Action:** Check error handling and scrubber integration

---

## Test 10: Test Coverage Report

**Objective:** Verify test coverage meets target

**Steps:**
1. Generate coverage report
   ```bash
   bun test --coverage
   ```

2. Review coverage summary

**Expected Results:**
- [ ] Overall coverage > 80%
- [ ] Scrubber module > 90%
- [ ] Logger module > 80%
- [ ] No untested critical paths

**Failure Action:** Add tests for uncovered code

---

## Regression Testing

**Objective:** Verify no existing functionality broken

**Steps:**
1. Run full test suite
   ```bash
   bun test
   ```

2. Check for any failures

**Expected Results:**
- [ ] All 254+ tests pass
- [ ] No new failures
- [ ] No flaky tests

**Failure Action:** Fix failing tests before release

---

## Final Validation Checklist

Before approving release:

- [ ] All 10 manual tests pass
- [ ] All automated tests pass (254+)
- [ ] Test coverage > 80%
- [ ] No performance regressions
- [ ] No security issues
- [ ] Documentation updated
- [ ] CHANGELOG updated (high-level only)
- [ ] Release checklist complete

---

## Test Results Template

```markdown
## Test Results: v1.1.1

**Date:** YYYY-MM-DD  
**Tester:** [Name]  
**Environment:** [OS, Bun version]

### Test Summary
- Total Tests: 10
- Passed: X
- Failed: X
- Skipped: X

### Failed Tests
[List any failures with details]

### Notes
[Any observations or concerns]

### Approval
- [ ] Approved for release
- [ ] Requires fixes

**Signature:** [Name]
```

---

## Troubleshooting

### Issue: skipSecrets shows [REDACTED]
**Solution:** Verify `skipsecrets` in WHITELISTED_KEYS (lowercase)

### Issue: Audit table shows [REDACTED] for key names
**Solution:** Check audit field abstraction (secretKey internal field)

### Issue: Duplicate log entries
**Solution:** Verify logger singleton and bootstrap patch guard

### Issue: example/ shows in git status
**Solution:** Check .gitignore contains `example/`

### Issue: Pre-commit hook doesn't prevent commit
**Solution:** Verify hook is executable and in correct location

### Issue: Performance regression
**Solution:** Review whitelist size and benchmark results

---

## References

- **Requirements:** `development/scrubber-fixes/requirements.md`
- **Design:** `development/scrubber-fixes/design.md`
- **Tasks:** `development/scrubber-fixes/tasks.md`
- **Traceability Matrix:** `development/scrubber-fixes/traceability-matrix.md`
