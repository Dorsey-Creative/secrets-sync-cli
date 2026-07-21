# Test Plan: --no-confirm Flag Fix & GitHub Secrets Limit Pre-flight Check

## Overview

Test cases for all 17 requirements (REQ-001 through REQ-017). All integration tests use `SKIP_DEPENDENCY_CHECK=1` to bypass gh CLI requirements and `SECRETS_SYNC_MOCK=1` where noted. Tests use temporary directories with `.env` files and `.secrets-mock.json` fixtures.

---

## Unit Tests — --no-confirm Approval Behavior

### Happy Path

- TC-REQ-001-A: Given a `.env` with new keys not in `.secrets-mock.json`, running with `--no-confirm` (no `--overwrite`) executes all creates. Exit code 0. Covers REQ-001, REQ-003.
- TC-REQ-001-B: Given a plan with creates, updates, and deletes, running with `--no-confirm` executes all three action types without prompting. Exit code 0. Covers REQ-001.
- TC-REQ-001-C: Given a plan with only deletes (keys in mock but not in `.env`), `--no-confirm` approves all deletes. Exit code 0. Covers REQ-001.

### Edge Cases

- TC-REQ-001-D: Given no changes to apply (all secrets match), `--no-confirm` outputs "No changes to apply" and exits 0. Covers REQ-001.
- TC-REQ-001-E: Given a single secret to create, `--no-confirm` executes it without prompting. Covers REQ-001, REQ-003.
- TC-REQ-006-A: Given neither `--overwrite` nor `--no-confirm` is supplied (non-TTY/pipe context), behavior depends on input stream — no auto-approval occurs. Covers REQ-006.

### Negative Cases

- TC-REQ-003-A: Given `--no-confirm` without `--overwrite`, CLI must NOT output "refusing to prompt" and must NOT exit with code 1. Covers REQ-003.
- TC-REQ-003-B: Given `--no-confirm` without `--overwrite`, stderr must NOT contain "Aborting with no changes." Covers REQ-003.

---

## Unit Tests — --no-confirm Does Not Imply Force-Overwrite

### Happy Path

- TC-REQ-002-A: Given `.env` values unchanged from `.secrets-mock.json`, `--no-confirm` plan shows zero updates (noop for existing secrets). Exit code 0. Covers REQ-002.
- TC-REQ-002-B: Given 5 existing secrets with no value changes, `--no-confirm` does not trigger `update` action for any of them. Compare to `--overwrite` which shows all 5 as updates. Covers REQ-002.

### Edge Cases

- TC-REQ-002-C: Given 3 existing secrets (2 unchanged, 1 changed), `--no-confirm` updates only the 1 changed secret. The 2 unchanged remain `noop`. Covers REQ-002.
- TC-REQ-002-D: Given `--no-confirm --skip-unchanged`, behavior is consistent — unchanged secrets remain `noop`. Covers REQ-002.

### Negative Cases

- TC-REQ-002-E: Given `--overwrite` (without `--no-confirm`), ALL existing secrets are marked `update` regardless of whether values changed. This is the control — confirms `--overwrite` still activates force-update-all while `--no-confirm` does not. Covers REQ-002, REQ-004.

---

## Unit Tests — --overwrite Behavior Preserved

### Happy Path

- TC-REQ-004-A: Given `--overwrite` with 5 existing secrets (no value changes), all 5 appear as `update` action in the plan. Covers REQ-004.
- TC-REQ-004-B: Given `--overwrite`, all mutations execute without interactive prompts. Exit code 0. Covers REQ-004.
- TC-REQ-004-C: Given `--overwrite`, stdout contains "approving all planned changes" or equivalent message. Covers REQ-004.

### Edge Cases

- TC-REQ-005-A: Given `--overwrite --no-confirm`, behavior is identical to `--overwrite` alone — force-update-all + no prompts. Covers REQ-005.
- TC-REQ-005-B: Given `--overwrite --no-confirm` with unchanged secrets, all are still marked `update` (force-overwrite semantics take precedence). Covers REQ-005, REQ-004.

### Negative Cases

- TC-REQ-004-D: Given `--overwrite` alone (no `--no-confirm`), ensure the fix did not break this path — all secrets still update without prompts. Covers REQ-004.

---

## Unit Tests — Interactive Mode Unchanged

### Happy Path

- TC-REQ-006-B: Given no `--overwrite` and no `--no-confirm` with a TTY (manual verification), interactive prompts `[y/N/a]` appear for each change. Covers REQ-006.

### Edge Cases

- TC-REQ-006-C: Given no flags and stdin is a pipe (non-TTY), the interactive prompt still attempts to read from stdin (existing behavior). Covers REQ-006.

### Negative Cases

- TC-REQ-006-D: Given no flags, the CLI does NOT auto-approve changes — it waits for user input. Covers REQ-006.

---

## Unit Tests — --no-confirm Log Output

### Happy Path

- TC-REQ-007-A: Given `--no-confirm` with planned changes, stdout contains the string `--no-confirm supplied: approving all planned changes without prompts.` Covers REQ-007.

### Edge Cases

- TC-REQ-007-B: Given `--no-confirm` with zero changes, the auto-approval message does NOT appear (nothing to approve). Covers REQ-007.
- TC-REQ-007-C: Given `--overwrite --no-confirm`, the `--overwrite` approval message appears (not the `--no-confirm` message, since `--overwrite` branch is checked first). Covers REQ-007, REQ-005.

### Negative Cases

- TC-REQ-007-D: Given `--overwrite` alone (no `--no-confirm`), the `--no-confirm` approval message does NOT appear. Covers REQ-007.

---

## Integration Tests — Limit Check Before Mutation

### Happy Path

- TC-REQ-008-A: Given 98 existing secrets in `.secrets-mock.json` and 5 new keys in `.env` (projected 103), the CLI exits 1 before any secret is set/deleted. No mutations occur. Covers REQ-008, REQ-009.
- TC-REQ-008-B: Given 95 existing secrets and 6 creates / 0 deletes (projected 101), CLI blocks execution. Covers REQ-008.

### Edge Cases

- TC-REQ-008-C: Given 100 existing secrets and 0 creates (projected 100), the limit check passes — exactly at limit, not over. Covers REQ-008.
- TC-REQ-008-D: Given 95 existing and 5 creates / 0 deletes (projected 100), the limit check passes — exactly at limit. Covers REQ-008.
- TC-REQ-008-E: Given the limit check fires, the plan is printed (printDiffSummary runs before the check), but no mutations execute. Covers REQ-008.

### Negative Cases

- TC-REQ-008-F: Given projected total of 50 (well under 100), the limit check does not produce any error or warning. CLI proceeds normally. Covers REQ-008.

---

## Integration Tests — Hard Block on Limit Exceeded

### Happy Path

- TC-REQ-009-A: Given projected total of 103, CLI exits with code 1. Covers REQ-009.
- TC-REQ-009-B: Given projected total of 101, stderr contains an error message mentioning "100" (the limit). Covers REQ-009, REQ-014.

### Edge Cases

- TC-REQ-009-C: Given projected total of 101 (just over by 1), CLI still blocks. The boundary is strictly > 100. Covers REQ-009.
- TC-REQ-009-D: Given projected total of 100, CLI does NOT block — 100 is the limit, not over it. Covers REQ-009.

### Negative Cases

- TC-REQ-009-E: Given projected total of 99, no error or warning about limits appears in output. Covers REQ-009.

---

## Integration Tests — Warning in Dry-Run Mode

### Happy Path

- TC-REQ-010-A: Given `--dry-run` with projected total of 103, CLI prints a warning about exceeding the limit. Covers REQ-010.
- TC-REQ-010-B: Given `--dry-run` with projected total of 103, exit code is 0 (not 1). Covers REQ-010.

### Edge Cases

- TC-REQ-010-C: Given `--dry-run` with projected total of 101, warning appears and exit code remains 0. Covers REQ-010.
- TC-REQ-010-D: Given `--dry-run` with projected total of 100 (at limit, not over), no warning appears. Covers REQ-010.
- TC-REQ-010-E: Given `--dry-run --no-confirm` with projected > 100, warning appears, no abort, exit 0. Covers REQ-010, REQ-001.

### Negative Cases

- TC-REQ-010-F: Given `--dry-run` with projected total of 50, no limit-related output appears. Covers REQ-010.

---

## Integration Tests — Mock Mode Bypass

### Happy Path

- TC-REQ-011-A: Given `SECRETS_SYNC_MOCK=1` with `.secrets-mock.json` containing 98 entries and `.env` adding 5 new keys (projected 103), CLI proceeds without limit error. Exit code 0. Covers REQ-011.

### Edge Cases

- TC-REQ-011-B: Given `SECRETS_SYNC_MOCK=1` with projected total of 200 (extreme), no limit warning or error appears. Covers REQ-011.
- TC-REQ-011-C: Given `SECRETS_SYNC_MOCK=1` and `--dry-run` with projected > 100, no limit warning appears (mock mode bypasses entirely). Covers REQ-011.

### Negative Cases

- TC-REQ-011-D: Given `SECRETS_SYNC_MOCK=0` (explicitly zero) with projected > 100, the limit check IS enforced (only `=1` activates mock mode). Covers REQ-011.
- TC-REQ-011-E: Given no `SECRETS_SYNC_MOCK` env var set and projected > 100, limit check fires (default is non-mock). Covers REQ-011.

---

## Integration Tests — Net-Change Calculation

### Happy Path

- TC-REQ-012-A: Given 95 existing, 6 creates, 2 deletes → projected 99 → check passes. Exit code 0. Covers REQ-012.
- TC-REQ-012-B: Given 99 existing, 5 creates, 4 deletes → projected 100 → check passes (exactly at limit). Covers REQ-012.

### Edge Cases

- TC-REQ-012-C: Given 99 existing, 5 creates, 3 deletes → projected 101 → check fails. Exit code 1. Covers REQ-012.
- TC-REQ-012-D: Given 100 existing, 0 creates, 5 deletes → projected 95 → check passes (deletes reduce count). Covers REQ-012.
- TC-REQ-012-E: Given 100 existing, 3 creates, 3 deletes → projected 100 → check passes (net zero). Covers REQ-012.
- TC-REQ-012-F: Given 50 existing, 60 creates, 0 deletes → projected 110 → check fails. Covers REQ-012.

### Negative Cases

- TC-REQ-012-G: Given 0 existing (possible API failure), 105 creates, 0 deletes → projected 105 → this triggers the graceful unknown-count path (REQ-013), NOT the hard block. Covers REQ-012, REQ-013.

---

## Integration Tests — Graceful Handling of Unknown Existing Count

### Happy Path

- TC-REQ-013-A: Given `adapter.list()` returns empty Map (existing.size === 0) and plan has 105 creates, CLI warns about unverifiable count but proceeds (does not block). Exit code 0. Covers REQ-013.

### Edge Cases

- TC-REQ-013-B: Given existing.size === 0 and plan has 5 creates (projected 5), no limit warning or error — the projected total is under 100, so neither the limit check nor the graceful warning triggers. Covers REQ-013.
- TC-REQ-013-C: Given existing.size === 0 and plan has exactly 101 creates, the graceful warning fires (cannot trust count) but execution proceeds. Covers REQ-013.

### Negative Cases

- TC-REQ-013-D: Given existing.size === 1 (non-zero, API call succeeded) and projected > 100, the hard block fires — NOT the graceful path. The graceful path is ONLY for existing.size === 0. Covers REQ-013, REQ-009.
- TC-REQ-013-E: Given existing.size === 0 and 0 creates (empty plan), no warning appears — nothing to warn about. Covers REQ-013.

---

## Integration Tests — Error Message Clarity

### Happy Path

- TC-REQ-014-A: Given limit exceeded (98 existing, 5 creates, 0 deletes, projected 103), error output contains: "100" (the limit), "98" (current), "+5" or "5" (creates), "-0" or "0" (deletes), "103" (projected). Covers REQ-014.

### Edge Cases

- TC-REQ-014-B: Given limit exceeded with deletes (95 existing, 10 creates, 2 deletes, projected 103), all four values (current: 95, creates: 10, deletes: 2, projected: 103) appear in the error. Covers REQ-014.
- TC-REQ-014-C: Given dry-run mode with limit exceeded, the warning message also contains all count fields (same format as error). Covers REQ-014, REQ-010.

### Negative Cases

- TC-REQ-014-D: Given limit NOT exceeded, none of the limit-related count messages appear in output. Covers REQ-014.

---

## Structural Verification — No New Dependencies

- TC-REQ-015-A: After implementation, `package.json` `dependencies` field contains only `lru-cache` and `yaml` (unchanged from before). Covers REQ-015.
- TC-REQ-015-B: After implementation, `package.json` `devDependencies` field has no new entries unrelated to this feature. Covers REQ-015.

---

## Verification — Test Coverage

- TC-REQ-016-A: `bun test tests/integration/no-confirm-and-secrets-limit.test.ts` passes with all test cases green. Covers REQ-016.
- TC-REQ-016-B: Full test suite `bun test` passes with no regressions in existing tests. Covers REQ-016.
- TC-REQ-016-C: Tests cover all 6 specified scenarios: (a) --no-confirm approves, (b) --no-confirm ≠ overwrite, (c) limit blocks, (d) limit warns in dry-run, (e) mock bypass, (f) net-change calculation. Covers REQ-016.

---

## Verification — Minimal Code Change

- TC-REQ-017-A: Code review confirms the `--no-confirm` fix changes only lines 1635–1638 (the `else if (flags.noConfirm)` block). Covers REQ-017.
- TC-REQ-017-B: Code review confirms the limit check is a single contiguous block inserted between `printDiffSummary()` and the confirmation workflow. No other regions modified. Covers REQ-017.
- TC-REQ-017-C: No changes to `computeDiffPlan()`, `GhCliSecretsAdapter`, or any utility module beyond the two targeted blocks. Covers REQ-017.

---

## Combined Scenario Tests

### --no-confirm + Secrets Limit Interaction

- TC-COMBO-A: Given `--no-confirm` and projected > 100, the limit check fires and blocks BEFORE the `--no-confirm` approval logic runs. Exit code 1. No mutations. Covers REQ-001, REQ-008, REQ-009.
- TC-COMBO-B: Given `--no-confirm` and projected ≤ 100, `--no-confirm` approval proceeds normally. All mutations execute. Exit code 0. Covers REQ-001, REQ-008.
- TC-COMBO-C: Given `--no-confirm --dry-run` and projected > 100, warning appears, dry-run output is shown, exit code 0. Covers REQ-001, REQ-010.
- TC-COMBO-D: Given `--overwrite` and projected > 100, the limit check fires (force-overwrite creates more updates but they don't change the CREATE count — limit check uses creates/deletes from plan, not updates). Covers REQ-004, REQ-008.

### --no-confirm + --dry-run Interaction

- TC-COMBO-E: Given `--no-confirm --dry-run`, the plan is displayed but no mutations execute (dry-run takes precedence). Exit code 0. Covers REQ-001.
- TC-COMBO-F: Given `--no-confirm --dry-run` with projected ≤ 100, no limit warning, plan displays, exit 0. Covers REQ-001, REQ-010.

### Mock Mode + --no-confirm

- TC-COMBO-G: Given `SECRETS_SYNC_MOCK=1` and `--no-confirm` with projected > 100, all changes proceed (mock bypasses limit, --no-confirm approves all). Exit code 0. Covers REQ-001, REQ-011.

---

## Coverage Matrix

| REQ-ID | Test Cases | Category Coverage |
|--------|-----------|-------------------|
| REQ-001 | TC-REQ-001-A through E, TC-COMBO-A/B/C/E/F/G | Happy, Edge, Negative, Combo |
| REQ-002 | TC-REQ-002-A through E | Happy, Edge, Negative |
| REQ-003 | TC-REQ-003-A, TC-REQ-003-B, TC-REQ-001-A/E | Happy, Negative |
| REQ-004 | TC-REQ-004-A through D, TC-REQ-002-E, TC-COMBO-D | Happy, Edge, Negative |
| REQ-005 | TC-REQ-005-A, TC-REQ-005-B, TC-REQ-007-C | Happy, Edge |
| REQ-006 | TC-REQ-006-A through D | Happy, Edge, Negative |
| REQ-007 | TC-REQ-007-A through D | Happy, Edge, Negative |
| REQ-008 | TC-REQ-008-A through F, TC-COMBO-A/B/D | Happy, Edge, Negative, Combo |
| REQ-009 | TC-REQ-009-A through E, TC-REQ-013-D | Happy, Edge, Negative |
| REQ-010 | TC-REQ-010-A through F, TC-REQ-014-C, TC-COMBO-C | Happy, Edge, Negative, Combo |
| REQ-011 | TC-REQ-011-A through E, TC-COMBO-G | Happy, Edge, Negative, Combo |
| REQ-012 | TC-REQ-012-A through G | Happy, Edge, Negative |
| REQ-013 | TC-REQ-013-A through E, TC-REQ-012-G | Happy, Edge, Negative |
| REQ-014 | TC-REQ-014-A through D | Happy, Edge, Negative |
| REQ-015 | TC-REQ-015-A, TC-REQ-015-B | Structural |
| REQ-016 | TC-REQ-016-A through C | Verification |
| REQ-017 | TC-REQ-017-A through C | Structural |

**Total test cases: 67**
**All 17 requirements covered with at least happy path + one negative/edge case.**

---

## Test Infrastructure Notes

### Mock Data Generation

For limit check tests, `.secrets-mock.json` must be programmatically generated with N entries. Example for 98 existing secrets:

```json
[
  { "name": "SECRET_001", "updatedAt": "2026-01-01T00:00:00Z" },
  { "name": "SECRET_002", "updatedAt": "2026-01-01T00:00:00Z" },
  ...
  { "name": "SECRET_098", "updatedAt": "2026-01-01T00:00:00Z" }
]
```

### Environment Variables

All integration tests use:
- `SKIP_DEPENDENCY_CHECK=1` — bypass gh CLI/auth requirements
- `SECRETS_SYNC_MOCK=1` — use mock adapter (except tests that explicitly test non-mock behavior)
- `SKIP_GITIGNORE_CHECK=1` — skip gitignore validation

### Test Helper Pattern

Follow existing pattern from `tests/integration/empty-value-validation.test.ts`:
```typescript
function run(args: string[], env?: Record<string, string>) {
  const proc = Bun.spawnSync(["./dist/secrets-sync.js", "--dir", testDir, ...args], {
    env: { ...process.env, SKIP_DEPENDENCY_CHECK: "1", SKIP_GITIGNORE_CHECK: "1", ...env }
  });
  return { exitCode: proc.exitCode, stdout: decode(proc.stdout), stderr: decode(proc.stderr) };
}
```

### Mock Mode Guard Consideration

The limit check has **no `!MOCK_MODE` guard** — it is purely data-driven and runs in all modes including mock mode. This means:
- Tests using `SECRETS_SYNC_MOCK=1` with fewer than 100 mock secrets will NOT trigger the limit check (naturally passes).
- Tests using `SECRETS_SYNC_MOCK=1` with 98+ mock secrets WILL trigger the limit check (naturally fires based on data size).
- All limit check tests use `SECRETS_SYNC_MOCK=1` consistently — same pattern as all other integration tests.
- No special env vars or guard-removal needed for testing.

---

## Boundary Value Analysis

| Scenario | existing | creates | deletes | projected | Result |
|----------|----------|---------|---------|-----------|--------|
| Well under limit | 50 | 10 | 0 | 60 | PASS |
| Just under limit | 95 | 5 | 0 | 100 | PASS (at limit) |
| At limit exactly | 100 | 0 | 0 | 100 | PASS |
| Just over limit | 95 | 6 | 0 | 101 | FAIL |
| Over limit (key scenario) | 95 | 6 | 0 | 101 | FAIL |
| Deletes offset creates (pass) | 95 | 6 | 2 | 99 | PASS |
| Deletes offset creates (fail) | 95 | 6 | 0 | 101 | FAIL |
| Net zero change over limit | 100 | 3 | 3 | 100 | PASS |
| Large overshoot | 90 | 20 | 0 | 110 | FAIL |
| Only deletes from full | 100 | 0 | 5 | 95 | PASS |
| Empty existing (graceful) | 0 | 105 | 0 | 105 | WARN (proceed) |
| Empty existing under limit | 0 | 50 | 0 | 50 | PASS (no warn) |

---

## Risk Areas

1. **Mock mode guard vs testability:** RESOLVED — `!MOCK_MODE` guard removed. All limit check tests use `SECRETS_SYNC_MOCK=1` with large mock datasets to trigger the check.
2. **Existing test assertions on --no-confirm:** If any existing test asserts the old "refusing to prompt" error message, it must be updated.
3. **Interactive mode tests:** TC-REQ-006-B requires a TTY which cannot be tested in automated integration tests. This remains manual verification.
4. **adapter.list() returning empty Map:** Must use a specific test setup where mock data is absent or the adapter is configured to simulate failure.
