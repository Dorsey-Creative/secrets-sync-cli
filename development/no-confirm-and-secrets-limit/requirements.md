# Requirements: --no-confirm Flag Fix & GitHub Secrets Limit Pre-flight Check

## Overview

Fix `--no-confirm` to imply consent for all planned mutations (without forcing overwrite semantics) and add a pre-flight check that blocks sync when the plan would exceed GitHub's 100 repository secret limit.

---

## User Stories

### US-1: Non-Interactive CI Usage

**As a** CI/CD pipeline operator  
**I want** `--no-confirm` to approve all planned changes without prompting  
**So that** I can run secrets-sync in non-interactive environments without being forced to use `--overwrite`

### US-2: Preventing Partial Sync Failures

**As a** secrets-sync user with many secrets  
**I want** the CLI to warn me before exceeding GitHub's 100-secret repository limit  
**So that** I don't end up with a partially-synced repository that requires manual cleanup

### US-3: Preserving Efficient CI Runs

**As a** CI/CD pipeline operator using `--no-confirm`  
**I want** only actually-changed secrets to be synced (not all secrets re-uploaded)  
**So that** my pipeline runs efficiently without unnecessary API calls

---

## Functional Requirements — Problem A (--no-confirm Fix)

### REQ-001: --no-confirm Implies Consent

**Requirement:** When `--no-confirm` is supplied (without `--overwrite`), the CLI must approve all planned mutations (creates, updates, deletes) without prompting — identical to a user typing "a" (all) at the interactive prompt.  
**Verification:** Run `secrets-sync --no-confirm` with a plan containing creates/updates/deletes; all are executed. Exit code 0.  
**Priority:** P0 (Critical)

### REQ-002: --no-confirm Does Not Imply Force-Update-All

**Requirement:** `--no-confirm` must NOT pass `forceOverwrite=true` to `computeDiffPlan()`. The diff plan must remain based on actual change detection (hash comparison, timestamps, manifest).  
**Verification:** Run `secrets-sync --no-confirm` when no `.env` values have changed; plan shows zero updates (not force-update-all). Compare to `--overwrite` which shows all existing secrets as updates.  
**Priority:** P0 (Critical)

### REQ-003: --no-confirm Alone Proceeds Without --overwrite

**Requirement:** `--no-confirm` alone (without `--overwrite`) must proceed to execute mutations. The CLI must NOT abort with "refusing to prompt" or exit code 1.  
**Verification:** Run `secrets-sync --no-confirm` without `--overwrite`; CLI proceeds to execute the plan and exits 0 (assuming no other errors).  
**Priority:** P0 (Critical)

### REQ-004: --overwrite Behavior Unchanged

**Requirement:** `--overwrite` alone must continue to (a) force all existing secrets to `update` action in the diff plan, and (b) approve all mutations without prompting. This existing behavior must not be affected by the `--no-confirm` fix.  
**Verification:** Run `secrets-sync --overwrite`; all existing secrets show as `update` (not `noop`) and execute without prompts.  
**Priority:** P0 (Critical)

### REQ-005: --overwrite --no-confirm Unchanged

**Requirement:** The combination `--overwrite --no-confirm` must continue to work as before (force-update-all + no prompts). Both flags together are redundant for confirmation but valid.  
**Verification:** Run `secrets-sync --overwrite --no-confirm`; behavior matches `--overwrite` alone.  
**Priority:** P1 (High)

### REQ-006: Interactive Mode Unchanged

**Requirement:** When neither `--overwrite` nor `--no-confirm` is supplied, the CLI must continue to prompt for each mutation individually with `[y/N/a]` options.  
**Verification:** Run `secrets-sync` without flags on a TTY; interactive prompts appear for each change.  
**Priority:** P0 (Critical)

### REQ-007: --no-confirm Log Output

**Requirement:** When `--no-confirm` approves changes, the CLI must log a message indicating auto-approval (e.g., `--no-confirm supplied: approving all planned changes without prompts.`).  
**Verification:** stdout contains the auto-approval message when `--no-confirm` is used.  
**Priority:** P2 (Medium)

---

## Functional Requirements — Problem B (Secrets Limit Check)

### REQ-008: Limit Check Before Mutation

**Requirement:** After `computeDiffPlan()` returns and before any mutations begin, the CLI must calculate `projectedTotal = existing.size + creates - deletes` and compare against the 100-secret repository limit.  
**Verification:** With 98 existing secrets and 5 creates / 0 deletes, the CLI blocks execution before any `gh secret set` call.  
**Priority:** P0 (Critical)

### REQ-009: Hard Block on Limit Exceeded (Normal Mode)

**Requirement:** In normal (non-dry-run, non-mock) mode, if `projectedTotal > 100`, the CLI must exit with code 1 and print an error showing current count, creates, deletes, and projected total.  
**Verification:** With projected total of 103, CLI exits 1 with message containing "100", current count, and projected count.  
**Priority:** P0 (Critical)

### REQ-010: Warning in Dry-Run Mode

**Requirement:** In `--dry-run` mode, if `projectedTotal > 100`, the CLI must print a warning but NOT exit with a nonzero code (informational only — dry-run always exits 0 unless other errors occur).  
**Verification:** Run `--dry-run` with projected > 100; warning appears in output, exit code is 0.  
**Priority:** P1 (High)

### REQ-011: Mock Mode Compatibility

**Requirement:** When `SECRETS_SYNC_MOCK=1` is set, the limit check runs but does not interfere with normal testing because tests control mock data size. The check is purely data-driven — with fewer than 100 mock secrets in `.secrets-mock.json`, it naturally passes without any special bypass.  
**Verification:** With `SECRETS_SYNC_MOCK=1` and fewer than 100 mock secrets, the limit check passes silently. With 98+ mock secrets and creates pushing projected over 100, the limit check correctly fires.  
**Priority:** P1 (High)

### REQ-012: Net-Change Calculation

**Requirement:** The limit check must account for net changes: creates minus deletes. If deletes offset creates sufficiently, the check must pass.  
**Verification:** With 99 existing, 5 creates, 4 deletes → projected 100 → passes. With 99 existing, 5 creates, 3 deletes → projected 101 → fails.  
**Priority:** P0 (Critical)

### REQ-013: Graceful Handling of Unknown Existing Count

**Requirement:** If `adapter.list()` returned an empty Map due to API failure (existing.size === 0 but not truly empty), the limit check must warn that accuracy cannot be guaranteed but NOT block execution.  
**Verification:** With `adapter.list()` returning empty Map and >100 desired secrets in plan, CLI warns but proceeds.  
**Priority:** P1 (High)

### REQ-014: Error Message Clarity

**Requirement:** The limit error must show: (a) the 100-secret limit, (b) current existing count, (c) number of creates, (d) number of deletes, (e) projected total.  
**Verification:** Error output matches format: `Current: N, Creating: +N, Deleting: -N, Projected: N`.  
**Priority:** P1 (High)

---

## Non-Functional Requirements

### REQ-015: No New Runtime Dependencies

**Requirement:** The implementation must not add any new runtime dependencies to `package.json`.  
**Verification:** `package.json` `dependencies` field is unchanged after implementation.  
**Priority:** P0 (Critical)

### REQ-016: Test Coverage

**Requirement:** Unit and/or integration tests must cover: (a) `--no-confirm` approving all changes, (b) `--no-confirm` not implying overwrite diff semantics, (c) limit check blocking on exceeded, (d) limit check warning in dry-run, (e) limit check bypass in mock mode, (f) net-change calculation accuracy.  
**Verification:** `bun test` passes with new test files covering all scenarios.  
**Priority:** P1 (High)

### REQ-017: Minimal Code Change

**Requirement:** The fixes should be surgical and minimal — modifying only the specific conditions and adding the limit check logic. No refactoring of unrelated code.  
**Verification:** Code review confirms changes are limited to the confirmation workflow block and a new limit check block.  
**Priority:** P2 (Medium)

---

## Acceptance Criteria Summary

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| REQ-001 | `--no-confirm` approves all planned changes | Integration test: mutations execute, exit 0 |
| REQ-002 | `--no-confirm` does not force-update-all | Integration test: unchanged secrets remain `noop` |
| REQ-003 | `--no-confirm` alone proceeds (no abort) | Integration test: no "refusing to prompt" error |
| REQ-004 | `--overwrite` unchanged | Integration test: force-update + no-prompt |
| REQ-005 | `--overwrite --no-confirm` unchanged | Integration test: same as `--overwrite` alone |
| REQ-006 | Interactive mode unchanged | Manual verification with TTY |
| REQ-007 | Auto-approval log message | stdout assertion |
| REQ-008 | Limit check runs before mutation | Integration test: no `gh secret set` calls when limit exceeded |
| REQ-009 | Hard block on limit exceeded | Integration test: exit 1 with error message |
| REQ-010 | Warning in dry-run | Integration test: warning in output, exit 0 |
| REQ-011 | Mock mode bypass | Integration test: `SECRETS_SYNC_MOCK=1` with <100 mock secrets passes silently |
| REQ-012 | Net-change calculation | Integration test: deletes offset creates |
| REQ-013 | Graceful on unknown count | Integration test: empty existing → warn, proceed |
| REQ-014 | Clear error message | Output assertion: contains all count fields |
| REQ-015 | No new deps | Dependency diff |
| REQ-016 | Test coverage | `bun test` passes |
| REQ-017 | Minimal changes | Code review |
