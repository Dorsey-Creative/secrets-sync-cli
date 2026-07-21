# Research Brief

## External Research

### GitHub Token Scope Detection Methods

Two verified approaches exist for detecting token scopes:

1. **`gh auth status` with `--json hosts` flag** — Outputs JSON with host authentication details. Available since gh CLI 2.40+. The `--json hosts` field returns structured data per host including account info. Token scopes are shown in text output (`Token scopes: repo, read:org, ...`) but JSON scope field availability depends on gh version.
   - Source: https://cli.github.com/manual/gh_auth_status

2. **GitHub API `X-Oauth-Scopes` response header** — Any authenticated API request returns the token's scopes in the `X-Oauth-Scopes` header. This is the most reliable method:
   ```bash
   gh api --include / 2>&1 | grep -i "x-oauth-scopes"
   # Returns: X-Oauth-Scopes: repo, read:org, gist, ...
   ```
   - Source: https://stackoverflow.com/questions/68772807/check-scopes-of-github-token
   - Source: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps

### Required Scopes for `gh secret set`

- **Repository secrets (personal repos):** `repo` scope (included in default gh auth scopes)
- **Organization secrets:** `admin:org` scope (NOT included by default)
  - Source: https://github.com/cli/cli/issues/2845 — confirms this is the exact problem and fix
  - The gh CLI error message is misleading: `HTTP 403: Must have admin rights to Repository` when the actual issue is missing `admin:org` scope

### Fix Command

```bash
gh auth refresh -s admin:org
```
- Source: https://cli.github.com/manual/gh_auth_refresh
- The `--scopes` / `-s` flag accepts comma-separated scopes
- This preserves existing scopes and adds the new one

### Detecting Organization Repos

To determine if the current repo belongs to an organization (and thus needs `admin:org`):
```bash
gh repo view --json owner --jq '.owner.login'
# Then check if owner is an org:
gh api /users/{owner} --jq '.type'
# Returns "Organization" or "User"
```

UNVERIFIED: Whether fine-grained personal access tokens (PATs) report scopes via `X-Oauth-Scopes` — they use a different permission model and the header may be empty for them.

---

## Codebase Analysis

### Tech Stack

- **Runtime:** TypeScript ESM targeting Node 18+, built with Bun
- **Build:** `bun build src/secrets-sync.ts --outdir dist --target node`
- **Test Runner:** Bun's built-in test runner (`bun test`)
- **Dependencies (runtime):** `lru-cache`, `yaml`
- **Entry point:** `src/secrets-sync.ts` (single ~62KB file containing all core logic)
- **Utilities:** `src/utils/` directory with focused modules

### 1. How the CLI Calls `gh secret set`

**Location:** `src/secrets-sync.ts`, `GhCliSecretsAdapter` class (line ~748)

```typescript
class GhCliSecretsAdapter implements GitHubSecretsAdapter {
  async set(name: string, value: string): Promise<void> {
    const proc = spawnSync('gh', ['secret', 'set', name, '--body', value]);
    if (proc.status !== 0) {
      const stderr = proc.stderr?.toString() || '';
      throw new Error(`gh secret set ${name} failed: ${stderr.trim()}`);
    }
  }

  async delete(name: string): Promise<void> {
    const proc = spawnSync('gh', ['secret', 'delete', name], {
      input: CONFIRM_INPUT.slice(),
    });
    if (proc.status !== 0) {
      const stderr = proc.stderr?.toString() || '';
      if (/not found/i.test(stderr)) return;
      throw new Error(`gh secret delete ${name} failed: ${stderr.trim()}`);
    }
  }

  async list(): Promise<Map<string, RemoteSecretInfo>> {
    const proc = spawnSync('gh', ['secret', 'list', '--json', 'name,updatedAt']);
    if (proc.status !== 0) {
      console.warn('[WARN] gh secret list failed; falling back to empty set.');
      return new Map();
    }
    // ... parses JSON output
  }
}
```

**Key observations:**
- Uses synchronous `spawnSync` from `node:child_process`
- Does NOT use `--org` flag — currently only supports repo-level secrets
- The adapter is instantiated at line ~1552 (for listing/planning) and line ~1652 (for write operations)
- Mock mode (`SECRETS_SYNC_MOCK=1`) uses `MockGitHubSecretsAdapter` instead

### 2. How Errors from gh Commands Are Handled

**Current error handling pattern:**

- **`gh secret list` failure:** Logs a warning and returns empty set (graceful degradation) — does NOT abort
- **`gh secret set` failure:** Throws an Error with stderr message — caught in the execution loop (line ~1680), added to `failures[]` array, logged at end
- **`gh secret delete` failure:** Same as set, except "not found" is treated as success

**Post-execution error reporting (line ~1718):**
```typescript
if (failures.length) {
  console.error('Some operations failed:');
  for (const f of failures) console.error(` - ${f.action} ${f.name}: ${f.error}`);
  process.exitCode = 1;
}
```

**Gap:** The error from a scope issue would be `gh secret set KEY failed: HTTP 403: Must have admin rights to Repository.` — this is the misleading gh CLI error. The current code passes it through without parsing or enhancing it.

### 3. The Dependency Check System (`src/utils/dependencies.ts`)

**Architecture:**
```typescript
export interface DependencyCheck {
  name: string;
  check: () => Promise<boolean>;
  errorMessage: string;
  installUrl?: string;
  installCommand?: string;
}

export async function validateDependencies(checks: DependencyCheck[]): Promise<ValidationResult>
```

**Current checks:**
1. `nodeVersionCheck` — Node.js >= 18
2. `ghCliCheck` — `gh --version` succeeds
3. `ghAuthCheck` — `gh auth status` succeeds

**Extensibility:** YES, this is the ideal integration point. A new `ghTokenScopeCheck` can be added following the same pattern. Key features:
- Runs checks in **parallel** with `Promise.all`
- Caches results for the session via `validationCache` Map
- Returns all failures at once (not fail-fast)
- Each check includes actionable `errorMessage` + `installCommand`

**Invocation (line ~1320 in secrets-sync.ts):**
```typescript
if (!process.env.SKIP_DEPENDENCY_CHECK || process.env.SKIP_DEPENDENCY_CHECK === '0') {
  const result = await validateDependencies([
    nodeVersionCheck,
    ghCliCheck,
    ghAuthCheck,
  ]);
  // ... formats and displays failures, then process.exit(1)
}
```

**Uses `execWithTimeout` from `src/utils/timeout.ts`** for the check functions — wraps `child_process.exec` with configurable timeout (default 30s, override via `SECRETS_SYNC_TIMEOUT` env var).

### 4. How the CLI Decides Whether to Sync to GitHub

**Decision flow:**
1. `SKIP_DEPENDENCY_CHECK=1` env var skips ALL dependency checks (used in tests)
2. If not skipped, validates gh CLI + auth as pre-flight
3. `SECRETS_SYNC_MOCK=1` uses in-memory mock adapter (no actual gh calls)
4. `--dry-run` flag: builds diff plan, prints summary, then returns WITHOUT executing mutations
5. Without `--dry-run`: goes through confirmation workflow, then executes via `GhCliSecretsAdapter`

**The adapter choice (line ~1543-1552):**
```typescript
const MOCK_MODE = process.env.SECRETS_SYNC_MOCK === '1';
if (MOCK_MODE) {
  adapter = new MockGitHubSecretsAdapter(mockExisting);
} else {
  adapter = new GhCliSecretsAdapter();
}
```

**For write operations (line ~1652):**
```typescript
const publisher = MOCK_MODE ? adapter : new GhCliSecretsAdapter();
```

**Key insight:** GitHub interaction happens in TWO phases:
- Phase 1: `adapter.list()` reads existing secrets for diff planning
- Phase 2: `publisher.set()`/`publisher.delete()` executes approved mutations

A scope check would be most valuable:
- **Between dependency checks passing and adapter.list()** — to catch the issue before any work is done
- **OR: After adapter.list() fails** — to provide better error context on 403 errors

### 5. Error Message Patterns

**Error catalog:** `src/messages/errors.json` — structured JSON with "what/why/howToFix" format

**Existing error codes:**
- `ERR_DEPENDENCY_MISSING` — missing tool
- `ERR_DEPENDENCY_AUTH` — not authenticated (includes `authCommand` placeholder)
- `ERR_NODE_VERSION` — version too old
- `ERR_PERMISSION_READ` / `ERR_PERMISSION_WRITE` — file permissions
- `ERR_TIMEOUT` — operation timed out
- `ERR_VALIDATION` — generic validation failure
- `ERR_COMMAND_FAILED` — command failed (generic)

**Error formatting (from `docs/ERROR_MESSAGES.md`):**
```
❌ [What failed]
   [Why it failed]
   [How to fix it]
```

Guidelines:
- Red ❌ for error indicator
- Cyan for fix commands (copy-pasteable)
- Yellow for warnings
- Keep to 80 columns
- Actionable, with URLs and commands

**Proposed new error code pattern:**
```json
"ERR_TOKEN_SCOPE": {
  "what": "GitHub token missing required scope: {{scope}}",
  "why": "{{reason}}",
  "howToFix": "Run: gh auth refresh -s {{scope}}"
}
```

### 6. Bootstrap/Pre-flight Checks

**`src/bootstrap.ts`** — imported first, handles:
- Loading user config for scrubber before any output
- Intercepting stdout/stderr for secret scrubbing
- Intercepting console.* methods for object scrubbing

**Pre-flight sequence in `main()` (src/secrets-sync.ts):**
1. Parse flags from argv
2. Load env-config.yml
3. Apply environment config (skip flags, timeouts, mock mode)
4. Initialize logger
5. **Validate dependencies** (gh CLI, auth, node version) — exits 1 on failure
6. Merge config flags
7. Handle `--fix-gitignore` early return
8. Validate .gitignore
9. Discover env files
10. Parse, layer, resolve production
11. Validate empty values (new feature)
12. Create adapter and begin diff/sync

**Integration point for scope check:** Between step 5 (existing dependency checks) and step 12 (adapter creation). Could be:
- Added as another `DependencyCheck` in the existing array (simplest)
- Or run as a separate validation after dependency checks pass

### 7. Test Patterns

**Integration test patterns (e.g., `tests/integration/empty-value-validation.test.ts`):**
```typescript
import { describe, test, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// beforeAll: build CLI
beforeAll(async () => {
  const buildProc = Bun.spawnSync(["bun", "run", "build"]);
});

// Test helper function pattern:
function run(args: string[], env?: Record<string, string>) {
  const proc = Bun.spawnSync(["./dist/secrets-sync.js", "--dir", testDir, ...args], {
    env: {
      ...process.env,
      SKIP_DEPENDENCY_CHECK: "1",
      SKIP_GITIGNORE_CHECK: "1",
      SECRETS_SYNC_MOCK: "1",
      ...env,
    },
  });
  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}
```

**Unit test patterns (e.g., `tests/unit/dependencies.test.ts`):**
```typescript
import { validateDependencies, validationCache, type DependencyCheck } from '../../src/utils/dependencies';

// Clear cache before each test
beforeEach(() => { validationCache.clear(); });

// Mock checks with custom check functions
const checks: DependencyCheck[] = [{
  name: 'test1',
  check: async () => false,
  errorMessage: 'Test 1 failed',
  installCommand: 'fix-it',
}];
```

**E2E test patterns (`tests/e2e/errorHandling.test.ts`):**
```typescript
const result = spawnSync(process.execPath, [CLI_PATH, "--dir", TEST_DIR, "--dry-run"], {
  encoding: "utf-8",
  env: { ...process.env, SKIP_DEPENDENCY_CHECK: "1" },
  timeout: 3000,
});
```

**Key test conventions:**
- Use `tmpdir()` for temporary test directories
- Clean up in `afterEach`
- Build before tests in `beforeAll`
- Use `SKIP_DEPENDENCY_CHECK=1` to bypass gh CLI requirements in most tests
- Use `SECRETS_SYNC_MOCK=1` to avoid real GitHub API calls
- Assert on both `exitCode` and `stdout`/`stderr` content

### Available Utilities for Implementation

| Utility | Location | Purpose |
|---------|----------|---------|
| `execWithTimeout` | `src/utils/timeout.ts` | Run shell commands with timeout |
| `validateDependencies` | `src/utils/dependencies.ts` | Run parallel pre-flight checks |
| `buildErrorMessage` | `src/utils/errorMessages.ts` | Format what/why/howToFix errors |
| `getMessage` | `src/utils/errorMessages.ts` | Load from error catalog with interpolation |
| `scrubSecrets` | `src/utils/scrubber.ts` | Prevent secret leakage in output |
| `logDebug/logWarn/logErr/logInfo` | `src/secrets-sync.ts` | Structured logging with color |
| `spawnSync` | `node:child_process` | Synchronous command execution |

### Code Style Conventions

- 2-space indentation, single quotes
- ESM imports (`import { x } from 'y'`)
- Interfaces for data shapes
- Async functions for check implementations
- Explicit error handling with try/catch
- COLORS object for ANSI codes
- `logDebug` for verbose-only output
- `console.warn`/`console.error` for warnings that always show
- No external dependencies for core logic

### Integration Points Summary

1. **Best fit: Add `ghTokenScopeCheck` to `src/utils/dependencies.ts`** — follows existing pattern exactly
2. **Add to the `validateDependencies` array** in `main()` at line ~1320
3. **Add `ERR_TOKEN_SCOPE` to `src/messages/errors.json`** for consistent error formatting
4. **Optionally: Enhance `GhCliSecretsAdapter` error handling** to detect 403 scope errors at runtime and provide better messages

### Constraints

- Must not add runtime dependencies (REQ-011 from prior feature sets this precedent)
- Must work with `SKIP_DEPENDENCY_CHECK=1` bypass for tests
- `spawnSync` is the established pattern for gh CLI calls (not async exec)
- The scope check only matters when NOT in mock mode and NOT in dry-run... OR it could be useful to warn even in dry-run for CI readiness
- Fine-grained PATs may not report scopes via X-Oauth-Scopes header — need graceful handling
