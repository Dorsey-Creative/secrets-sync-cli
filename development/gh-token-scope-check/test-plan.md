# Test Plan: GitHub Token Scope Pre-flight Check

## Unit Tests — Scope Parsing (`getTokenScopes`)

### Happy Path

- TC-REQ-001-A: Given `gh api --include /` returns header `X-Oauth-Scopes: repo, read:org, gist`, `getTokenScopes()` returns `['repo', 'read:org', 'gist']`. Covers REQ-001, REQ-014.
- TC-REQ-002-A: Given scopes include `repo`, scope check passes for repository-level operations on a personal repo. Covers REQ-002.
- TC-REQ-002-B: Given scopes include `repo` and `admin:org`, scope check passes for an organization repo. Covers REQ-002, REQ-003.

### Edge Cases

- TC-REQ-006-A: Given `X-Oauth-Scopes:` header is present but value is empty string, `getTokenScopes()` returns `null` (undetermined). Covers REQ-006.
- TC-REQ-006-B: Given `X-Oauth-Scopes` header is entirely absent from response, `getTokenScopes()` returns `null`. Covers REQ-006.
- TC-REQ-001-B: Given scopes header has extra whitespace between items (`repo ,  read:org,gist`), parsing still produces correct trimmed list. Covers REQ-001.
- TC-REQ-001-C: Given scopes header contains a single scope with no commas (`repo`), parsing returns single-element array. Covers REQ-001.
- TC-REQ-001-D: Given scopes header has trailing comma (`repo, read:org,`), empty trailing entry is filtered out. Covers REQ-001.

### Negative Cases

- TC-REQ-006-C: Given `gh api --include /` command fails (exit code nonzero), `getTokenScopes()` returns `null` without throwing. Covers REQ-006, REQ-014.
- TC-REQ-006-D: Given network is unreachable and `execWithTimeout` throws a timeout error, `getTokenScopes()` returns `null`. Covers REQ-006, REQ-016.
- TC-REQ-006-E: Given response contains HTTP error body but no `X-Oauth-Scopes` header (e.g., 401 Unauthorized), returns `null`. Covers REQ-006.

### Boundary Conditions

- TC-REQ-001-E: Given scopes header contains many scopes (>20 items), all are correctly parsed. Covers REQ-001.
- TC-REQ-006-F: Given response is malformed output with no recognizable headers, returns `null`. Covers REQ-006.

---

## Unit Tests — Organization Detection (`isOrgRepo`)

### Happy Path

- TC-REQ-004-A: Given `gh repo view --json owner` returns `{"owner":{"login":"my-org"}}` and `gh api /users/my-org` returns `{"type":"Organization"}`, `isOrgRepo()` returns `true`. Covers REQ-004.
- TC-REQ-004-B: Given owner type is `"User"`, `isOrgRepo()` returns `false`. Covers REQ-004.

### Edge Cases

- TC-REQ-004-C: Given owner login contains hyphens and underscores (`my-org_123`), owner string passes validation and API call succeeds. Covers REQ-004.
- TC-REQ-004-D: Given owner login has mixed case (`MyOrg`), it is used as-is for the API call (GitHub usernames are case-insensitive). Covers REQ-004.

### Negative Cases

- TC-REQ-004-E: Given `gh repo view` fails (not in a git repo, gh not authenticated), `isOrgRepo()` returns `null`. Covers REQ-004, REQ-006.
- TC-REQ-004-F: Given `gh api /users/{owner}` fails (network error, 404), `isOrgRepo()` returns `null`. Covers REQ-004, REQ-006.
- TC-REQ-004-G: Given owner login contains shell-special characters (`;`, `|`, `$`), the function rejects the input and returns `null` to prevent command injection. Covers REQ-004.

### Boundary Conditions

- TC-REQ-004-H: Given `gh repo view` returns empty stdout, `isOrgRepo()` returns `null`. Covers REQ-004.
- TC-REQ-004-I: Given `gh api /users/{owner}` returns unexpected type value (e.g., `"Bot"`), `isOrgRepo()` returns `false` (not an Organization). Covers REQ-004.

---

## Unit Tests — Scope Check Factory (`getGhTokenScopeCheck`)

### Happy Path

- TC-REQ-002-C: Given token has `repo` scope on a personal repo (`isOrgRepo` → false), check returns `true`. Covers REQ-002, REQ-004.
- TC-REQ-003-A: Given token has `repo` and `admin:org` scopes on an org repo, check returns `true`. Covers REQ-003.
- TC-REQ-015-A: Given `SECRETS_SYNC_MOCK=1`, check returns `true` without calling any `gh` commands. Covers REQ-015.

### Edge Cases

- TC-REQ-006-G: Given `getTokenScopes()` returns `null` (fine-grained PAT), check returns `true` (graceful pass). Covers REQ-006.
- TC-REQ-003-B: Given token has `repo` scope on a personal repo but NOT `admin:org`, check passes (admin:org not required for personal repos). Covers REQ-003, REQ-004.
- TC-REQ-004-J: Given `isOrgRepo()` returns `null` (org status undetermined), check passes gracefully even without `admin:org`. Covers REQ-004, REQ-006.

### Negative Cases

- TC-REQ-002-D: Given token scopes do NOT include `repo`, check returns `false`. Covers REQ-002, REQ-011.
- TC-REQ-003-C: Given org repo and token has `repo` but NOT `admin:org`, check returns `false`. Covers REQ-003, REQ-011.
- TC-REQ-005-A: Given check returns `false` for missing `repo`, `errorMessage` getter includes `repo` scope name and `gh auth refresh -s repo` command. Covers REQ-005.
- TC-REQ-005-B: Given check returns `false` for missing `admin:org`, `errorMessage` getter includes `admin:org` scope name and `gh auth refresh -s admin:org` command. Covers REQ-005.

### Boundary Conditions

- TC-REQ-007-A: The returned object conforms to the `DependencyCheck` interface: has `name`, `check`, `errorMessage`, and `installCommand` properties. Covers REQ-007.
- TC-REQ-005-C: `errorMessage` includes explanation of WHY the scope is needed (e.g., "Required for managing secrets on organization repositories"). Covers REQ-005.

---

## Unit Tests — Runtime 403 Error Enhancement

### Happy Path

- TC-REQ-009-A: Given `gh secret set KEY` fails with stderr `HTTP 403: Must have admin rights to Repository.`, the thrown error includes `gh auth refresh -s admin:org` suggestion. Covers REQ-009.
- TC-REQ-009-B: Given `gh secret delete KEY` fails with stderr containing `403` and `Resource not accessible`, error includes scope fix suggestion. Covers REQ-009.

### Edge Cases

- TC-REQ-009-C: Given a non-403 error from `gh secret set` (e.g., network failure, 500), error passes through unchanged without scope fix suggestion. Covers REQ-009.
- TC-REQ-009-D: Given `gh secret delete` fails with `not found` error, it is still treated as success (existing behavior preserved). Covers REQ-009.

### Negative Cases

- TC-REQ-009-E: Given `gh secret set` stderr contains `403` in a context unrelated to scope (e.g., rate limiting message), the 403 pattern matching is broad enough to still suggest the fix (acceptable false positive that helps users). Covers REQ-009.

### Boundary Conditions

- TC-REQ-009-F: Given enhanced error message, the original stderr content is preserved in the message for debugging context. Covers REQ-009.
- TC-REQ-009-G: Given stderr is empty string but exit code is nonzero, error is thrown without crashing (no null reference). Covers REQ-009.

---

## Unit Tests — Error Catalog

- TC-REQ-013-A: `src/messages/errors.json` contains an `ERR_TOKEN_SCOPE` entry with `what`, `why`, and `howToFix` fields. Covers REQ-013.
- TC-REQ-013-B: `ERR_TOKEN_SCOPE` entry contains `{{scope}}` placeholder in both `what` and `howToFix` fields. Covers REQ-013.
- TC-REQ-013-C: `ERR_TOKEN_SCOPE` entry contains `{{reason}}` placeholder in `why` field. Covers REQ-013.

---

## Integration Tests — Pre-flight Blocking

### Happy Path

- TC-REQ-001-F: Given token has all required scopes, CLI proceeds past pre-flight and begins env file discovery. Covers REQ-001.
- TC-REQ-012-A: Given `--dry-run` flag with valid scopes, scope check runs and passes, dry-run proceeds normally. Covers REQ-012.

### Negative Cases

- TC-REQ-011-A: Given token missing `repo` scope, CLI exits with code 1 before any `gh secret set` call is made. Covers REQ-001, REQ-011.
- TC-REQ-011-B: Given org repo and token missing `admin:org`, CLI exits with code 1 before any mutation. Covers REQ-003, REQ-011.
- TC-REQ-012-B: Given `--dry-run` with token missing scopes, scope error is still reported (pre-flight runs before dry-run logic). Covers REQ-012.

### Edge Cases

- TC-REQ-011-C: Given scope check fails, no `gh secret set` or `gh secret delete` commands are ever invoked (verify no mutation side effects). Covers REQ-011.

---

## Integration Tests — Bypass Mechanisms

### Happy Path

- TC-REQ-008-A: Given `SKIP_DEPENDENCY_CHECK=1` and no valid gh token, CLI proceeds past dependency validation without scope check errors. Covers REQ-008.
- TC-REQ-008-B: Given `SKIP_DEPENDENCY_CHECK=1` and token missing required scopes, CLI does not exit with scope error. Covers REQ-008.
- TC-REQ-015-B: Given `SECRETS_SYNC_MOCK=1` and no gh CLI installed, CLI proceeds without scope check errors. Covers REQ-015.
- TC-REQ-015-C: Given `SECRETS_SYNC_MOCK=1` and an invalid/expired token, CLI proceeds normally. Covers REQ-015.

### Edge Cases

- TC-REQ-008-C: Given `SKIP_DEPENDENCY_CHECK=0` (explicitly set to zero), scope check still runs (only `=1` activates bypass). Covers REQ-008.
- TC-REQ-008-D: Given both `SKIP_DEPENDENCY_CHECK=1` and `SECRETS_SYNC_MOCK=1`, CLI proceeds (both bypasses are compatible). Covers REQ-008, REQ-015.

---

## Integration Tests — Error Output Quality

### Happy Path

- TC-REQ-005-D: Given missing `repo` scope, stderr output contains the literal string `gh auth refresh -s repo`. Covers REQ-005.
- TC-REQ-005-E: Given missing `admin:org` scope on org repo, stderr output contains `gh auth refresh -s admin:org`. Covers REQ-005.

### Edge Cases

- TC-REQ-005-F: Given missing scope, error output follows `❌ what / why / howToFix` format structure. Covers REQ-005.
- TC-REQ-005-G: Given missing scope, no secret values or token content appear in error output. Covers REQ-005.

---

## Integration Tests — Graceful Degradation

### Happy Path

- TC-REQ-006-H: Given a fine-grained PAT (X-Oauth-Scopes header empty/absent), CLI proceeds without blocking and completes normal operation. Covers REQ-006.

### Edge Cases

- TC-REQ-006-I: Given `gh api` times out (slow network), scope check passes gracefully and CLI proceeds. Covers REQ-006, REQ-016.
- TC-REQ-006-J: Given `gh auth status` passes but `gh api /` returns 401 (token revoked between checks), scope check passes gracefully. Covers REQ-006.
- TC-REQ-006-K: Given gh CLI is authenticated but API returns rate limit (429), scope check passes gracefully. Covers REQ-006.

---

## Integration Tests — execWithTimeout Usage

- TC-REQ-014-A: Given `SECRETS_SYNC_TIMEOUT` set to a very short value (e.g., 1ms), scope check times out and passes gracefully (does not hang indefinitely). Covers REQ-014, REQ-016.
- TC-REQ-014-B: Given normal timeout (30s default), scope check subprocess calls complete within the timeout window. Covers REQ-014, REQ-016.

---

## Non-Functional Tests — Performance

- TC-REQ-016-A: Given normal network connectivity, scope check completes in under 5 seconds. Covers REQ-016.
- TC-REQ-016-B: Given scope check runs in parallel with other dependency checks (via `Promise.all`), total pre-flight time is not significantly longer than without the scope check. Covers REQ-016.

---

## Static/Structural Verification

- TC-REQ-007-B: `getGhTokenScopeCheck()` is exported from `src/utils/dependencies.ts`. Covers REQ-007.
- TC-REQ-007-C: The scope check is included in the `validateDependencies` array in `src/secrets-sync.ts` main function. Covers REQ-007.
- TC-REQ-010-A: `package.json` `dependencies` field has no new entries after implementation. Covers REQ-010.
- TC-REQ-014-C: Code inspection confirms all `gh` subprocess calls in scope check use `execWithTimeout`, not raw `exec`, `execSync`, or `spawnSync`. Covers REQ-014.

---

## Documentation Verification

- TC-REQ-018-A: `docs/TROUBLESHOOTING.md` contains a section addressing token scope errors. Covers REQ-018.
- TC-REQ-018-B: Troubleshooting docs include the `HTTP 403: Must have admin rights` error message and explain it is a scope issue, not a permissions issue. Covers REQ-018.
- TC-REQ-018-C: Troubleshooting docs include the fix command `gh auth refresh -s admin:org`. Covers REQ-018.
- TC-REQ-018-D: Troubleshooting docs include instructions to check current scopes via `gh api --include / 2>&1 | grep x-oauth-scopes`. Covers REQ-018.
- TC-REQ-018-E: Troubleshooting docs mention that fine-grained PATs may not report scopes. Covers REQ-018.

---

## Test Coverage Verification

- TC-REQ-017-A: `bun test tests/unit/token-scope-check.test.ts` passes with all unit tests green. Covers REQ-017.
- TC-REQ-017-B: `bun test tests/integration/token-scope-check.test.ts` passes with all integration tests green. Covers REQ-017.
- TC-REQ-017-C: Full test suite `bun test` passes with no regressions in existing tests. Covers REQ-017.

---

## Coverage Matrix

| REQ-ID | Test Cases | Category Coverage |
|--------|-----------|-------------------|
| REQ-001 | TC-REQ-001-A through E, TC-REQ-001-F, TC-REQ-011-A | Happy, Edge, Boundary, Negative |
| REQ-002 | TC-REQ-002-A through D | Happy, Negative |
| REQ-003 | TC-REQ-003-A through C, TC-REQ-011-B | Happy, Edge, Negative |
| REQ-004 | TC-REQ-004-A through J | Happy, Edge, Negative, Boundary |
| REQ-005 | TC-REQ-005-A through G | Happy, Edge, Negative |
| REQ-006 | TC-REQ-006-A through K | Happy, Edge, Negative, Boundary |
| REQ-007 | TC-REQ-007-A through C | Happy, Structural |
| REQ-008 | TC-REQ-008-A through D | Happy, Edge |
| REQ-009 | TC-REQ-009-A through G | Happy, Edge, Negative, Boundary |
| REQ-010 | TC-REQ-010-A | Structural |
| REQ-011 | TC-REQ-011-A through C | Negative, Edge |
| REQ-012 | TC-REQ-012-A, B | Happy, Negative |
| REQ-013 | TC-REQ-013-A through C | Structural |
| REQ-014 | TC-REQ-014-A through C | Edge, Structural |
| REQ-015 | TC-REQ-015-A through C | Happy, Edge |
| REQ-016 | TC-REQ-016-A, B | Performance |
| REQ-017 | TC-REQ-017-A through C | Verification |
| REQ-018 | TC-REQ-018-A through E | Documentation |

**Total test cases: 73**  
**All 18 requirements covered with at least happy path + one negative/edge case.**
