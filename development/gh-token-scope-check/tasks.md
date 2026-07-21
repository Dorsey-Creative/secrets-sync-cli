# Tasks: GitHub Token Scope Pre-flight Check

## Overview

Implementation broken into 3 phases with time estimates and validation steps. Total estimated time: ~2.5 hours.

---

## Phase 1: Core Scope Detection (P0)

**Goal:** Implement pre-flight scope detection that blocks execution when required scopes are missing  
**Time Estimate:** 1.5 hours  
**Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-010, REQ-011, REQ-013, REQ-014, REQ-015

### Task 1.1: Add ERR_TOKEN_SCOPE to Error Catalog

**Time:** 5 minutes  
**References:** REQ-013, Design §4

- [x] Add `ERR_TOKEN_SCOPE` entry to `src/messages/errors.json`
- [x] Follow existing what/why/howToFix format with `{{scope}}` and `{{reason}}` placeholders

**Validation:**

```bash
grep "ERR_TOKEN_SCOPE" src/messages/errors.json
# Should find the new entry
```

**End-user success:** Error catalog is ready for scope-related error formatting.

---

### Task 1.2: Implement getTokenScopes() Helper

**Time:** 20 minutes  
**References:** REQ-001, REQ-014, Design §1

- [x] Add `getTokenScopes()` async function to `src/utils/dependencies.ts`
- [x] Call `gh api --include /` via `execWithTimeout`
- [x] Parse `X-Oauth-Scopes` header from response
- [x] Return `string[]` of scopes or `null` when undetermined
- [x] Handle errors gracefully (return null, not throw)

**Validation:**

```typescript
// Unit test: parse known header output
const scopes = parseTokenScopes('X-Oauth-Scopes: repo, read:org, gist');
expect(scopes).toEqual(['repo', 'read:org', 'gist']);

// Unit test: empty header returns null
const scopes = parseTokenScopes('');
expect(scopes).toBeNull();
```

**End-user success:** Token scope information can be reliably extracted from the GitHub API.

---

### Task 1.3: Implement isOrgRepo() Helper

**Time:** 20 minutes  
**References:** REQ-004, REQ-014, Design §2

- [x] Add `isOrgRepo()` async function to `src/utils/dependencies.ts`
- [x] Call `gh repo view --json owner --jq ".owner.login"` via `execWithTimeout`
- [x] Call `gh api /users/{owner} --jq ".type"` via `execWithTimeout`
- [x] Return `true` for Organization, `false` for User, `null` on any failure
- [x] Sanitize owner string before interpolation into command (prevent injection)

**Validation:**

```typescript
// Unit test: Organization type returns true
// Unit test: User type returns false
// Unit test: Failed gh repo view returns null
```

**End-user success:** The CLI can distinguish org repos from personal repos.

---

### Task 1.4: Implement getGhTokenScopeCheck() Factory

**Time:** 30 minutes  
**References:** REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007, REQ-010, REQ-011, REQ-015, Design §3

- [x] Add `getGhTokenScopeCheck()` function that returns a `DependencyCheck` object
- [x] Use module-level `missingScopeDetail` state for dynamic error messages
- [x] Implement check logic:
  - Return `true` immediately if `SECRETS_SYNC_MOCK=1`
  - Call `getTokenScopes()` — if null, return `true` (graceful pass)
  - Check `repo` scope presence — if missing, set detail and return `false`
  - Call `isOrgRepo()` — if org and `admin:org` missing, set detail and return `false`
  - Otherwise return `true`
- [x] Use getter properties for `errorMessage` and `installCommand` (dynamic based on `missingScopeDetail`)
- [x] Export the factory function

**Validation:**

```typescript
// Unit test: mock mode passes without API calls
// Unit test: missing repo scope fails with correct error
// Unit test: org repo missing admin:org fails with correct error
// Unit test: personal repo without admin:org passes
// Unit test: undetermined scopes passes gracefully
```

**End-user success:** The DependencyCheck is ready to detect scope issues.

---

### Task 1.5: Integrate into validateDependencies Array

**Time:** 10 minutes  
**References:** REQ-007, REQ-008, REQ-012, Design §6

- [x] Import `getGhTokenScopeCheck` in `src/secrets-sync.ts`
- [x] Add `getGhTokenScopeCheck()` to the `validateDependencies` array (after `ghAuthCheck`)
- [x] Verify existing `SKIP_DEPENDENCY_CHECK` guard covers the new check

**Validation:**

```bash
# Build succeeds
bun run build

# With SKIP_DEPENDENCY_CHECK=1, scope check is not called
SKIP_DEPENDENCY_CHECK=1 SECRETS_SYNC_MOCK=1 ./dist/secrets-sync.js --dry-run --dir /tmp/test
```

**End-user success:** Scope check runs automatically as part of pre-flight validation.

---

### Phase 1 Acceptance

- [ ] `getTokenScopes()` parses API header correctly
- [ ] `isOrgRepo()` detects org vs personal repos
- [ ] Missing `repo` scope blocks execution with fix command
- [ ] Missing `admin:org` on org repo blocks execution with fix command
- [ ] Undetermined scopes (fine-grained PATs) pass gracefully
- [ ] Mock mode passes without API calls
- [ ] `SKIP_DEPENDENCY_CHECK=1` bypasses scope check
- [ ] Error messages include copy-pasteable `gh auth refresh` command
- [ ] No new runtime dependencies added
- [ ] Build passes: `bun run build`

---

## Phase 2: Runtime Error Enhancement (P1)

**Goal:** Enhance runtime 403 errors with actionable fix suggestions  
**Time Estimate:** 20 minutes  
**Requirements:** REQ-009

### Task 2.1: Enhance GhCliSecretsAdapter.set() Error Handler

**Time:** 10 minutes  
**References:** REQ-009, Design §5

- [x] In `GhCliSecretsAdapter.set()`, detect 403 / "admin rights" / "Resource not accessible" patterns in stderr
- [x] When detected, throw enhanced error with `gh auth refresh -s admin:org` suggestion
- [x] Preserve original error text in the message for debugging

**Validation:**

```typescript
// Unit test: 403 stderr is enhanced with fix command
// Unit test: non-403 errors pass through unchanged
```

**End-user success:** Even if the pre-flight check is bypassed, users get actionable errors at runtime.

---

### Task 2.2: Enhance GhCliSecretsAdapter.delete() Error Handler

**Time:** 10 minutes  
**References:** REQ-009, Design §5

- [x] Apply same 403 detection pattern to `GhCliSecretsAdapter.delete()`
- [x] Maintain existing "not found" tolerance logic

**Validation:**

```typescript
// Unit test: 403 on delete is enhanced with fix command
// Unit test: "not found" still treated as success
```

**End-user success:** Delete operations also provide scope fix suggestions on 403.

---

### Phase 2 Acceptance

- [ ] 403 errors from `gh secret set` include `gh auth refresh -s admin:org` suggestion
- [ ] 403 errors from `gh secret delete` include fix suggestion
- [ ] Non-403 errors pass through unchanged
- [ ] "not found" on delete still treated as success

---

## Phase 3: Tests and Documentation (P1)

**Goal:** Comprehensive test coverage and documentation  
**Time Estimate:** 40 minutes  
**Requirements:** REQ-017, REQ-018

### Task 3.1: Unit Tests for Scope Parsing

**Time:** 15 minutes  
**References:** REQ-017, Design Testing Strategy

- [x] Create `tests/unit/token-scope-check.test.ts`
- [x] Test `getTokenScopes()`: header parsing, empty header, malformed input, whitespace handling
- [x] Test `isOrgRepo()`: org type, user type, failure returns null
- [x] Test `getGhTokenScopeCheck()`: all pass/fail scenarios, mock mode bypass, graceful degradation
- [x] Test dynamic error message reflects the correct missing scope

**Validation:**

```bash
bun test tests/unit/token-scope-check.test.ts
# All tests pass
```

---

### Task 3.2: Integration Tests for Pre-flight Behavior

**Time:** 15 minutes  
**References:** REQ-017, Design Testing Strategy

- [x] Create `tests/integration/token-scope-check.test.ts`
- [x] Test: scope check blocks execution (exit 1) when missing required scope
- [x] Test: error output includes `gh auth refresh` command
- [x] Test: `SKIP_DEPENDENCY_CHECK=1` bypasses scope check
- [x] Test: `SECRETS_SYNC_MOCK=1` bypasses scope check
- [x] Test: scope check runs in `--dry-run` mode

**Validation:**

```bash
bun test tests/integration/token-scope-check.test.ts
# All tests pass
```

---

### Task 3.3: Update Troubleshooting Documentation

**Time:** 10 minutes  
**References:** REQ-018

- [x] Add "Token scope errors" section to `docs/TROUBLESHOOTING.md`
- [x] Document the `HTTP 403: Must have admin rights` error and its cause
- [x] Document the fix: `gh auth refresh -s admin:org`
- [x] Document how to check current scopes: `gh api --include / 2>&1 | grep x-oauth-scopes`
- [x] Mention fine-grained PATs may not report scopes

**Validation:**

```bash
grep "admin:org" docs/TROUBLESHOOTING.md
# Should find the new section
```

---

### Phase 3 Acceptance

- [ ] Unit tests pass: `bun test tests/unit/token-scope-check.test.ts`
- [ ] Integration tests pass: `bun test tests/integration/token-scope-check.test.ts`
- [ ] Full suite passes: `bun test`
- [ ] Troubleshooting docs updated with scope error section

---

## Final Validation Checklist

### Functional Validation

- [ ] Token with `repo` scope on personal repo → check passes
- [ ] Token with `repo` + `admin:org` on org repo → check passes
- [ ] Token missing `repo` → error with `gh auth refresh -s repo`
- [ ] Token missing `admin:org` on org repo → error with `gh auth refresh -s admin:org`
- [ ] Fine-grained PAT (no scopes header) → passes gracefully
- [ ] `SKIP_DEPENDENCY_CHECK=1` → scope check skipped
- [ ] `SECRETS_SYNC_MOCK=1` → scope check skipped
- [ ] `--dry-run` → scope check still runs

### Error Quality Validation

- [ ] Error messages follow `❌ what / why / howToFix` format
- [ ] Fix commands are copy-pasteable
- [ ] Runtime 403 errors include scope fix suggestion
- [ ] No secret values exposed in error output

### Integration Validation

- [ ] Build passes: `bun run build`
- [ ] All tests pass: `bun test`
- [ ] No new entries in `package.json` dependencies
- [ ] Existing tests unaffected (SKIP_DEPENDENCY_CHECK bypass works)

---

## Time Summary

| Phase | Time Estimate | Priority |
|-------|---------------|----------|
| Phase 1: Core Scope Detection | 1.5 hours | P0 |
| Phase 2: Runtime Error Enhancement | 20 minutes | P1 |
| Phase 3: Tests and Documentation | 40 minutes | P1 |
| **Total** | **~2.5 hours** | |

---

## Dependencies

### Before Starting

- [ ] All existing tests passing (`bun test`)
- [ ] Current branch is clean or feature branch created
- [ ] Research brief reviewed (detection methods confirmed)

### External Dependencies

- `execWithTimeout` from `src/utils/timeout.ts` (existing)
- `DependencyCheck` interface from `src/utils/dependencies.ts` (existing)
- `errors.json` catalog (existing, to be extended)
- `gh` CLI (runtime dependency, already required)

---

## Risk Mitigation

### API Rate Limiting

- The `gh api /` endpoint is lightweight and unlikely to hit rate limits
- If rate-limited, `getTokenScopes()` returns null → graceful pass
- No additional mitigation needed for typical usage

### Command Injection in isOrgRepo()

- The owner login from `gh repo view` is interpolated into a command
- Sanitize: validate owner matches `/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/` before use (GitHub usernames: alphanumeric + hyphen only, max 39 chars, cannot start/end with hyphen)
- Reject and return null if owner contains unexpected characters

### Parallel Execution Race Conditions

- `validateDependencies` runs checks in parallel via `Promise.all`
- The scope check internally depends on gh being available
- Guard: if `gh api` fails (gh not installed), return null (graceful pass)
- The separate `ghCliCheck` will report the gh CLI missing error

---

## Coverage Summary

| Requirement | Covered by Tasks |
|-------------|-----------------|
| REQ-001 | T1.2, T1.4, T1.5 |
| REQ-002 | T1.4 |
| REQ-003 | T1.3, T1.4 |
| REQ-004 | T1.3 |
| REQ-005 | T1.1, T1.4 |
| REQ-006 | T1.2, T1.4 |
| REQ-007 | T1.4, T1.5 |
| REQ-008 | T1.5 |
| REQ-009 | T2.1, T2.2 |
| REQ-010 | All tasks (no deps added) |
| REQ-011 | T1.4, T1.5 |
| REQ-012 | T1.5 |
| REQ-013 | T1.1 |
| REQ-014 | T1.2, T1.3 |
| REQ-015 | T1.4 |
| REQ-016 | T1.2, T1.3 (inherits timeout) |
| REQ-017 | T3.1, T3.2 |
| REQ-018 | T3.3 |

**All 18 requirements covered.** No uncovered requirements.
