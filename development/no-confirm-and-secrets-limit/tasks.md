# Tasks: --no-confirm Flag Fix & GitHub Secrets Limit Pre-flight Check

## Overview

Implementation broken into 2 phases. Total estimated time: ~1.5 hours.

---

## Phase 1: Source Code Fixes (P0)

**Goal:** Fix `--no-confirm` abort and add secrets limit check  
**Time Estimate:** 30 minutes  
**Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-017

### Task 1.1: Fix --no-confirm Abort Logic

**Time:** 10 minutes  
**References:** REQ-001, REQ-002, REQ-003, REQ-007, Design Fix A

- [x] In `src/secrets-sync.ts`, locate lines 1635–1638 (the `else if (flags.noConfirm)` block)
- [x] Replace the `console.error` + `process.exitCode = 1` + `return` with:
  ```typescript
  approved = mutating;
  console.log('--no-confirm supplied: approving all planned changes without prompts.');
  ```
- [x] Verify `computeDiffPlan()` call (line ~1593) still passes `flags.overwrite ?? false` (not `flags.noConfirm`) as the `forceOverwrite` parameter

**Validation:**

```bash
# Build succeeds
bun run build

# Quick smoke test: --no-confirm no longer aborts
SKIP_DEPENDENCY_CHECK=1 SECRETS_SYNC_MOCK=1 ./dist/secrets-sync.js --no-confirm --dir /tmp/test-env
# Should NOT print "refusing to prompt. Aborting"
```

**End-user success:** CI pipelines using `--no-confirm` proceed with planned changes instead of aborting.

---

### Task 1.2: Add Secrets Limit Pre-flight Check

**Time:** 20 minutes  
**References:** REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, Design Fix B

- [x] In `src/secrets-sync.ts`, locate `printDiffSummary()` call (line ~1617) and the `// Confirmation workflow` comment (line ~1619)
- [x] Insert the limit check block between them — BEFORE the `if (flags.dryRun)` branch at line ~1621:
  - Calculate `creates` and `deletes` from `plan.filter()`
  - Calculate `projectedTotal = existing.size + creates - deletes`
  - Define `REPO_SECRET_LIMIT = 100`
  - No `!MOCK_MODE` guard — the check is purely data-driven and runs in all modes
  - If `projectedTotal > REPO_SECRET_LIMIT`:
    - If `existing.size === 0 && creates > 0` → `console.warn` about unverifiable count
    - Else if `flags.dryRun` → `console.warn` with counts (informational)
    - Else → `console.error` with counts, set `process.exitCode = 1`, `return`
- [x] Verify the check uses `existing.size` (from `adapter.list()` Map) — no new API calls

**Validation:**

```bash
# Build succeeds
bun run build

# Dry-run with mock data exceeding limit shows warning
# (requires test setup with 98+ mock secrets — validated in Phase 2 tests)
```

**End-user success:** Users see clear limit errors before mutations begin, preventing partial sync failures.

---

### Phase 1 Acceptance

- [ ] `--no-confirm` alone approves all planned changes (no abort)
- [ ] `--no-confirm` does not activate `forceOverwrite` diff behavior
- [ ] `--overwrite` behavior unchanged
- [ ] `--overwrite --no-confirm` behavior unchanged
- [ ] Interactive mode unchanged (no `--no-confirm`, no `--overwrite`)
- [ ] Limit check blocks when projected > 100 (non-dry-run)
- [ ] Limit check warns in dry-run mode
- [ ] Limit check naturally passes in mock mode with <100 entries (data-driven)
- [ ] Net-change formula accounts for deletes
- [ ] Graceful handling when existing.size === 0
- [ ] Error message includes all counts
- [ ] No new runtime dependencies
- [ ] Build passes: `bun run build`

---

## Phase 2: Tests (P1)

**Goal:** Integration test coverage for both fixes  
**Time Estimate:** 1 hour  
**Requirements:** REQ-016

### Task 2.1: Create Integration Test File

**Time:** 10 minutes  
**References:** REQ-016, Design Testing Strategy

- [x] Create `tests/integration/no-confirm-and-secrets-limit.test.ts`
- [x] Set up test helper function (`run()`) following existing patterns from `tests/integration/empty-value-validation.test.ts`
- [x] Add `beforeAll` for build step
- [x] Add `beforeEach`/`afterEach` for temp directory setup/cleanup

**Validation:**

```bash
bun test tests/integration/no-confirm-and-secrets-limit.test.ts
# File exists and basic scaffolding compiles
```

---

### Task 2.2: Write --no-confirm Tests

**Time:** 25 minutes  
**References:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007

- [x] Test: `--no-confirm` approves creates and executes (exit 0, no "refusing" message)
- [x] Test: `--no-confirm` does not force-update unchanged secrets (compare plan output to `--overwrite` plan output)
- [x] Test: `--no-confirm` outputs auto-approval message in stdout
- [x] Test: `--overwrite` alone still force-updates all (existing behavior preserved)
- [x] Test: `--overwrite --no-confirm` behaves same as `--overwrite` alone

**Test setup:**
- `.env` with `NEW_KEY=value` (for create tests)
- `.secrets-mock.json` with existing secrets (for update/noop tests)
- Use `SECRETS_SYNC_MOCK=1` and `SKIP_DEPENDENCY_CHECK=1`

**Validation:**

```bash
bun test tests/integration/no-confirm-and-secrets-limit.test.ts --filter "no-confirm"
# All --no-confirm tests pass
```

---

### Task 2.3: Write Secrets Limit Tests

**Time:** 25 minutes  
**References:** REQ-008, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014

- [x] Test: Blocks with exit 1 when projected > 100 (98 existing + 5 creates)
- [x] Test: Warns in `--dry-run` mode but exits 0
- [x] Test: Passes when deletes offset creates (99 existing + 5 creates − 4 deletes = 100, passes)
- [x] Test: Warns but proceeds when existing.size === 0 (possible API failure)
- [x] Test: Error message contains current count, creates, deletes, projected total
- [x] Test: Does not fire when projected ≤ 100

**Test setup:**
- `.secrets-mock.json` with 98 entries (programmatically generated in beforeEach)
- `.env` with additional keys to push total over 100
- Use `SECRETS_SYNC_MOCK=1` and `SKIP_DEPENDENCY_CHECK=1` (same as all other integration tests)
- The limit check runs in all modes (no mock guard) — tests control behavior through mock data size
- Tests that don't want limit interference use <100 entries in `.secrets-mock.json`

**Validation:**

```bash
bun test tests/integration/no-confirm-and-secrets-limit.test.ts --filter "limit"
# All limit check tests pass
```

---

### Task 2.4: Run Full Test Suite

**Time:** 5 minutes  
**References:** REQ-016

- [x] Run `bun test` — all tests pass (no regressions)
- [x] Verify no existing tests are broken by the `--no-confirm` behavior change

**Validation:**

```bash
bun test
# All tests pass, 0 failures
```

---

### Task 2.5: Update README.md Documentation

**Time:** 5 minutes  
**References:** REQ-017 (minimal changes includes necessary doc updates)

- [x] In `README.md` Examples section, remove `(requires --overwrite)` from the `--no-confirm` comment
- [x] Add an example showing `--no-confirm` used alone:
  ```bash
  # Non-interactive mode (approves all planned changes without prompts)
  secrets-sync --no-confirm
  ```
- [x] Keep the `--overwrite --no-confirm` example as a valid combination but clarify it forces re-upload of all secrets

**Validation:**

```bash
grep -n "no-confirm" README.md
# Should show updated examples without "requires --overwrite"
```

**End-user success:** Documentation accurately reflects that `--no-confirm` works independently.

---

### Phase 2 Acceptance

- [ ] Integration tests cover `--no-confirm` approval behavior
- [ ] Integration tests cover `--no-confirm` not implying overwrite
- [ ] Integration tests cover limit check blocking
- [ ] Integration tests cover limit check dry-run warning
- [ ] Integration tests cover net-change calculation
- [ ] Integration tests cover graceful unknown count handling
- [ ] Full test suite passes: `bun test`
- [ ] No regressions in existing tests

---

## Final Validation Checklist

### Functional Validation

- [ ] `secrets-sync --no-confirm` in CI context → changes applied, exit 0
- [ ] `secrets-sync --no-confirm` with no changes → "No changes to apply", exit 0
- [ ] `secrets-sync --overwrite` → forces all updates + no prompts (unchanged)
- [ ] `secrets-sync` (no flags, TTY) → interactive prompts (unchanged)
- [ ] Projected > 100 in normal mode → hard block, exit 1
- [ ] Projected > 100 in dry-run → warning, exit 0
- [ ] Deletes offsetting creates → passes when net ≤ 100

### Integration Validation

- [ ] Build passes: `bun run build`
- [ ] All tests pass: `bun test`
- [ ] No new entries in `package.json` dependencies

---

## Time Summary

| Phase | Time Estimate | Priority |
|-------|---------------|----------|
| Phase 1: Source Code Fixes | 30 minutes | P0 |
| Phase 2: Tests | 1 hour | P1 |
| **Total** | **~1.5 hours** | |

---

## Dependencies

### Before Starting

- [ ] All existing tests passing (`bun test`)
- [ ] Current branch is clean or feature branch created
- [ ] Research brief reviewed (confirmed approach)

### External Dependencies

- None new — uses existing `adapter.list()` result and `plan` array

---

## Risk Mitigation

### --no-confirm Behavior Change

- The old behavior was universally considered a bug (contradicts all CLI conventions)
- No users should be relying on the abort behavior (it's an error state)
- If any test asserts the old "refusing to prompt" error message, update the assertion

### Limit Check False Positives

- The `existing.size === 0` heuristic may not cover all API failure modes
- `adapter.list()` returns empty Map on ANY failure (not just network)
- If the real existing count is near 100, a false "0 existing" could mask a true limit violation
- Mitigation: the warn-but-proceed approach for `existing.size === 0` is conservative and avoids blocking valid fresh repos

### Mock Mode Guard

- The `!MOCK_MODE` guard has been removed — the limit check is purely data-driven
- In mock mode with <100 entries in `.secrets-mock.json`, the check naturally passes
- In mock mode with 98+ entries (for limit testing), the check correctly fires
- This eliminates the testability contradiction and allows all tests to use `SECRETS_SYNC_MOCK=1` consistently

---

## Coverage Summary

| Requirement | Covered by Tasks |
|-------------|-----------------|
| REQ-001 | T1.1, T2.2 |
| REQ-002 | T1.1, T2.2 |
| REQ-003 | T1.1, T2.2 |
| REQ-004 | T1.1, T2.2 |
| REQ-005 | T1.1, T2.2 |
| REQ-006 | T1.1 (no change needed) |
| REQ-007 | T1.1, T2.2 |
| REQ-008 | T1.2, T2.3 |
| REQ-009 | T1.2, T2.3 |
| REQ-010 | T1.2, T2.3 |
| REQ-011 | T1.2, T2.3 |
| REQ-012 | T1.2, T2.3 |
| REQ-013 | T1.2, T2.3 |
| REQ-014 | T1.2, T2.3 |
| REQ-015 | All tasks (no deps added) |
| REQ-016 | T2.1, T2.2, T2.3, T2.4 |
| REQ-017 | T1.1, T1.2 (minimal changes) |

**All 17 requirements covered.** No uncovered requirements.
