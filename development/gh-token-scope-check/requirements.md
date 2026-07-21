# Requirements: GitHub Token Scope Pre-flight Check

## Overview

Add pre-flight detection of missing GitHub token scopes before `gh secret set` calls. Provide actionable error messages with copy-pasteable remediation commands instead of cryptic 403 errors.

---

## User Stories

### US-1: Pre-flight Scope Validation

**As a** secrets-sync user targeting an organization repo  
**I want** the CLI to detect my token is missing `admin:org` before attempting to sync  
**So that** I get a clear fix command instead of a cryptic 403 on every secret

### US-2: Actionable Error Messages

**As a** developer encountering a scope error  
**I want** the error message to include the exact `gh auth refresh` command I need  
**So that** I can fix the problem immediately without searching documentation

### US-3: Graceful Degradation

**As a** user with a fine-grained PAT or unusual token setup  
**I want** the scope check to warn but not block me  
**So that** I can still use the tool even if scope detection isn't possible

---

## Functional Requirements

### REQ-001: Pre-flight Scope Detection

**Requirement:** The CLI must detect token scopes before any `gh secret set` or `gh secret delete` mutation is attempted.  
**Verification:** Run CLI against a repo with a token missing `repo` scope; CLI exits with scope error before any `gh secret set` call is made.  
**Priority:** P0 (Critical)

### REQ-002: Repo Scope Validation

**Requirement:** The CLI must verify the `repo` scope is present for repository-level secret operations.  
**Verification:** With a token lacking `repo` scope, the CLI reports the missing scope and provides `gh auth refresh -s repo` as the fix.  
**Priority:** P0 (Critical)

### REQ-003: Organization Scope Detection

**Requirement:** When the current repository belongs to a GitHub organization, the CLI must verify the `admin:org` scope is present.  
**Verification:** With a token lacking `admin:org` on an org repo, the CLI reports the missing scope and provides `gh auth refresh -s admin:org` as the fix.  
**Priority:** P0 (Critical)

### REQ-004: Organization Repo Detection

**Requirement:** The CLI must determine whether the current repository belongs to an organization or a personal account.  
**Verification:** On an org repo, the check requires `admin:org`; on a personal repo, it does not.  
**Priority:** P0 (Critical)

### REQ-005: Actionable Error Messages

**Requirement:** Scope-related error messages must include: what scope is missing, why it's needed, and a copy-pasteable `gh auth refresh -s <scope>` command.  
**Verification:** Error output matches the `❌ what / why / howToFix` format from `docs/ERROR_MESSAGES.md` and includes the exact fix command.  
**Priority:** P0 (Critical)

### REQ-006: Graceful Handling of Undetermined Scopes

**Requirement:** When token scopes cannot be determined (fine-grained PATs returning empty `X-Oauth-Scopes`, API failures, network issues), the check must pass with a debug-level warning and allow execution to proceed.  
**Verification:** With a fine-grained PAT (empty scopes header), the CLI proceeds normally without blocking.  
**Priority:** P0 (Critical)

### REQ-007: Integration with DependencyCheck System

**Requirement:** The scope check must be implemented as a `DependencyCheck` in `src/utils/dependencies.ts` and added to the `validateDependencies` array.  
**Verification:** `ghTokenScopeCheck` export exists in `dependencies.ts`, follows `DependencyCheck` interface, and is included in the main validation array.  
**Priority:** P1 (High)

### REQ-008: Respect SKIP_DEPENDENCY_CHECK Bypass

**Requirement:** Setting `SKIP_DEPENDENCY_CHECK=1` must skip the token scope check along with all other dependency checks.  
**Verification:** With `SKIP_DEPENDENCY_CHECK=1`, the scope check does not execute regardless of token state.  
**Priority:** P0 (Critical)

### REQ-009: Runtime 403 Error Enhancement

**Requirement:** When `gh secret set` fails at runtime with a 403/scope-related error, the error message must be enhanced to suggest the `gh auth refresh` fix command instead of passing through the raw gh CLI error.  
**Verification:** A 403 error from `gh secret set` produces a message mentioning `gh auth refresh -s admin:org` rather than only `HTTP 403: Must have admin rights to Repository`.  
**Priority:** P1 (High)

### REQ-010: No New Runtime Dependencies

**Requirement:** The implementation must not add any new runtime dependencies to `package.json`.  
**Verification:** `package.json` `dependencies` field is unchanged after implementation.  
**Priority:** P0 (Critical)

### REQ-011: Fail-fast on Missing Scopes

**Requirement:** When the scope check detects a missing required scope, the CLI must exit with a nonzero status before any mutation (secret set/delete) occurs.  
**Verification:** With a token missing required scopes, `gh secret set` is never called and exit code is 1.  
**Priority:** P0 (Critical)

### REQ-012: Scope Check in Dry-Run Mode

**Requirement:** The scope check must run even in `--dry-run` mode to validate CI readiness.  
**Verification:** Running `--dry-run` with a token missing scopes reports the scope error (since dependency checks run before dry-run logic).  
**Priority:** P1 (High)

### REQ-013: Error Catalog Entry

**Requirement:** A new `ERR_TOKEN_SCOPE` entry must be added to `src/messages/errors.json` following the existing what/why/howToFix format.  
**Verification:** `errors.json` contains `ERR_TOKEN_SCOPE` with template placeholders for scope name and fix command.  
**Priority:** P1 (High)

### REQ-014: Use execWithTimeout for Subprocess Calls

**Requirement:** All subprocess calls in the scope check must use `execWithTimeout` for timeout safety.  
**Verification:** Code inspection confirms `execWithTimeout` is used, not raw `exec` or `spawnSync`.  
**Priority:** P1 (High)

### REQ-015: Mock Mode Bypass

**Requirement:** When `SECRETS_SYNC_MOCK=1` is set, the scope check should pass without making API calls (mock mode doesn't use real GitHub).  
**Verification:** With `SECRETS_SYNC_MOCK=1` and no valid gh token, the CLI proceeds normally.  
**Priority:** P1 (High)

---

## Non-Functional Requirements

### REQ-016: Performance

**Requirement:** The scope check must complete within the existing `SECRETS_SYNC_TIMEOUT` limit (default 30s) and add minimal latency to the pre-flight sequence.  
**Verification:** Scope check completes in <5s on a typical connection.  
**Priority:** P2 (Medium)

### REQ-017: Test Coverage

**Requirement:** Unit tests must cover scope parsing, org detection, graceful degradation, and error message formatting. Integration tests must verify the check blocks execution on missing scopes.  
**Verification:** `bun test` passes with new test files covering all requirement scenarios.  
**Priority:** P1 (High)

### REQ-018: Documentation

**Requirement:** The scope check behavior and `gh auth refresh` fix must be documented in troubleshooting docs.  
**Verification:** `docs/TROUBLESHOOTING.md` includes a section on token scope errors with the fix command.  
**Priority:** P2 (Medium)

---

## Acceptance Criteria Summary

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| REQ-001 | Scope detection runs before mutation | Integration test: no `gh secret set` calls when scope is missing |
| REQ-002 | `repo` scope validated | Unit test: scope parser detects missing `repo` |
| REQ-003 | `admin:org` validated for org repos | Integration test: org repo + missing scope = error |
| REQ-004 | Org vs personal detection | Unit test: API response parsing for owner type |
| REQ-005 | Actionable error with fix command | Output assertion: contains `gh auth refresh -s` |
| REQ-006 | Graceful pass on undetermined scopes | Unit test: empty header → pass with warning |
| REQ-007 | Follows DependencyCheck interface | Code review: exports match interface |
| REQ-008 | SKIP_DEPENDENCY_CHECK bypass | Integration test: env var skips check |
| REQ-009 | Enhanced 403 error at runtime | Unit test: stderr parsing adds fix suggestion |
| REQ-010 | No new deps | Dependency diff |
| REQ-011 | Fail-fast before mutation | Integration test: exit 1, no mutations |
| REQ-012 | Runs in dry-run | Integration test: --dry-run reports scope error |
| REQ-013 | ERR_TOKEN_SCOPE in catalog | File content assertion |
| REQ-014 | Uses execWithTimeout | Code inspection |
| REQ-015 | Mock mode bypass | Integration test: SECRETS_SYNC_MOCK=1 passes |
| REQ-016 | <5s execution | Timing test |
| REQ-017 | Test coverage | bun test passes |
| REQ-018 | Documentation | File existence check |
