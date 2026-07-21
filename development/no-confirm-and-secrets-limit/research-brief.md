# Research Brief: --no-confirm Flag Fix & GitHub Secrets Limit Pre-flight Check

## External Research

### 1. GitHub Actions Secrets Limits

**Official limits (verified):**

| Level | Maximum Secrets | Source |
|-------|----------------|--------|
| Repository | 100 | [GitHub Docs — Secrets Reference](https://docs.github.com/en/actions/reference/security/secrets) |
| Organization | 1,000 | [GitHub Docs — Secrets Reference](https://docs.github.com/en/actions/reference/security/secrets) |
| Environment | 100 | [GitHub Docs — Secrets Reference](https://docs.github.com/en/actions/reference/security/secrets) |

**Additional limits:**
- Secret values are limited to 48 KB in size.
- A workflow can access all 100 repository secrets.
- If a repository is assigned access to more than 100 organization secrets, the workflow can only use the first 100 (sorted alphabetically by secret name).
- All 100 environment secrets are accessible per environment.

**Source URLs:**
- https://docs.github.com/en/actions/reference/security/secrets#limits-for-secrets
- https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions

---

### 2. Error When Exceeding the 100 Repository Secret Limit

**UNVERIFIED:** The exact HTTP error response when attempting to create the 101st repository secret could not be confirmed with a verified source. The GitHub REST API documentation for `PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}` only documents status codes `201` (created) and `204` (updated) for success cases.

**Best available evidence:**
- A [StackOverflow post](https://stackoverflow.com/questions/77089214/secrets-cannot-added-to-private-repositories) reports that the GitHub UI simply blocks the "New repository secret" button when the limit is reached. The user reported "GitHub says that I have exceeded a limit."
- A [GitHub Community discussion](https://github.com/orgs/community/discussions/57910) confirms users hit this limit and suggests the API refuses creation.
- Based on GitHub API patterns, the most likely response is HTTP `422 Unprocessable Entity` with a validation error message. GitHub uses 422 for constraint violations on valid requests.

**UNVERIFIED likely error format:**
```json
{
  "message": "Validation Failed",
  "errors": [
    {
      "resource": "Secret",
      "code": "custom",
      "message": "You have exceeded the maximum number of secrets for this repository"
    }
  ],
  "documentation_url": "https://docs.github.com/rest/actions/secrets"
}
```

**What `gh secret set` would return:**
- The `gh` CLI would fail with a nonzero exit code.
- stderr would contain the HTTP error from the API (e.g., `HTTP 422`).
- The exact stderr text is UNVERIFIED but likely includes "422" or "Validation Failed".

**Implementation recommendation:** Since the exact error is unverified, the pre-flight check should prevent the attempt rather than detecting the error post-facto.

---

### 3. How `gh secret list` Works

**Verified from [cli.github.com/manual/gh_secret_list](http://cli.github.com/manual/gh_secret_list):**

**Command:** `gh secret list [flags]`

**JSON output fields:** `name`, `numSelectedRepos`, `selectedReposURL`, `updatedAt`, `visibility`

**Key behavior:**
- Returns ALL repository secrets (no pagination in the CLI output — it handles pagination internally).
- `--json name` returns a JSON array of all secrets with their names.
- There is NO `--limit` or `--count` flag — it always returns all secrets.

**Getting just the count:**
```bash
# Count secrets using jq
gh secret list --json name --jq 'length'

# Or count lines
gh secret list --json name | jq length
```

**The CLI already lists all secrets in `GhCliSecretsAdapter.list()`** at `src/secrets-sync.ts:751`:
```typescript
const proc = spawnSync('gh', ['secret', 'list', '--json', 'name,updatedAt']);
```
This returns ALL secrets. The count is simply `arr.length` from the parsed JSON.

---

### 4. GitHub REST API Endpoint for Secrets Count

**Verified from [GitHub REST API — List Repository Secrets](https://docs.github.com/en/rest/actions/secrets#list-repository-secrets):**

**Endpoint:** `GET /repos/{owner}/{repo}/actions/secrets`

**Response includes `total_count`:**
```json
{
  "total_count": 2,
  "secrets": [
    { "name": "GH_TOKEN", "created_at": "2019-08-10T14:59:22Z", "updated_at": "2020-01-10T14:59:22Z" },
    { "name": "GIST_ID", "created_at": "2020-01-10T10:59:22Z", "updated_at": "2020-01-11T11:59:22Z" }
  ]
}
```

**Getting just the count via gh CLI:**
```bash
gh api /repos/{owner}/{repo}/actions/secrets --jq '.total_count'
```

**Parameters:** `per_page` (max 100, default 30), `page` (default 1)

**Optimization:** To get just the count without listing all secrets:
```bash
gh api '/repos/{owner}/{repo}/actions/secrets?per_page=1' --jq '.total_count'
```
This returns `total_count` (the total number of secrets) while only fetching 1 secret in the array — minimizing data transfer.

**However, for this project:** The existing `GhCliSecretsAdapter.list()` already calls `gh secret list --json name,updatedAt` which returns all secrets. The count is available from this existing call without any additional API request.

---

### 5. CLI --no-confirm / --yes / --auto-approve Patterns in Popular CLIs

#### Terraform

**Source:** [HashiCorp — terraform apply](https://developer.hashicorp.com/terraform/cli/commands/apply)

- Flag: `-auto-approve`
- Behavior: Skips the interactive approval prompt and proceeds directly.
- Warning from docs: "If you use -auto-approve, we recommend making sure that no one can change your infrastructure outside of your Terraform workflow."
- The flag is on the ACTION command (`apply`), not a separate flag.
- `-auto-approve` implies consent for ALL changes shown in the plan.

#### GitHub CLI (`gh`)

**Source:** [cli.github.com/manual/gh_repo_delete](https://cli.github.com/manual/gh_repo_delete), [cli.github.com/manual/gh_pr_merge](https://cli.github.com/manual/gh_pr_merge)

- Flag: `--yes` (shorthand `-y`)
- Used in: `gh repo delete --yes`, `gh pr merge --auto`
- Pattern: `--yes` skips confirmation and implies approval.
- Safety: "For safety, when no repository argument is provided, the --yes flag is ignored."
- `gh` does NOT require a separate "overwrite" flag alongside `--yes`.

#### npm

**Source:** [npm documentation](https://docs.npmjs.com/cli/v10/commands/npm-init)

- Flag: `--yes` / `-y`
- Behavior: "If you invoke it with -f, --force, -y, or --yes, it will use only defaults and not prompt you for any options."
- `-y` implies acceptance of all defaults without prompting.

#### Pulumi

**Source:** [github.com/pulumi/pulumi/issues/3435](https://github.com/pulumi/pulumi/issues/3435)

- Flag: `--yes`
- Behavior: Skips the confirmation prompt and approves all changes.
- Community discussion confirms: "the presence of a --yes flag indicates... the default is to reject any changes by default."

#### Industry Pattern Summary

| CLI Tool | Flag Name | Behavior |
|----------|-----------|----------|
| Terraform | `-auto-approve` | Skip prompt, approve all changes |
| gh CLI | `--yes` / `-y` | Skip prompt, approve action |
| npm | `--yes` / `-y` | Skip prompt, use defaults |
| Pulumi | `--yes` | Skip prompt, approve all |
| apt-get | `-y` / `--yes` | Skip prompt, approve all |
| kubectl | (no flag; pipe `yes`) | N/A |

**Consensus:** A "skip confirmation" flag IMPLIES approval in every major CLI. No popular CLI requires two separate flags (one to suppress prompts AND another to approve). The single flag means "I already consent, don't ask me."

---

### 6. `gh api /repos/{owner}/{repo}/actions/secrets` Response with `total_count`

**Verified from GitHub REST API documentation (fetched above):**

The response body for `GET /repos/{owner}/{repo}/actions/secrets` includes:
```json
{
  "total_count": 2,
  "secrets": [...]
}
```

- `total_count` is always present in the response (verified from example response in official docs).
- This is the **exact count of all repository secrets**, regardless of `per_page` — it's the total, not the page count.
- Pagination is handled via `per_page` (max 100) and `page` parameters.
- Setting `per_page=1` still returns the correct `total_count`.

**Efficient count-only query:**
```bash
gh api '/repos/{owner}/{repo}/actions/secrets?per_page=1' --jq '.total_count'
```

---

## Codebase Analysis

### Tech Stack

- **Runtime:** TypeScript ESM targeting Node 18+, built with Bun
- **Build:** `bun build src/secrets-sync.ts --outdir dist --target node`
- **Test Runner:** Bun's built-in test runner (`bun test`)
- **Dependencies (runtime):** `lru-cache`, `yaml`
- **Entry point:** `src/secrets-sync.ts` (single ~1773-line file containing all core logic)
- **Utilities:** `src/utils/` directory with focused modules

---

### 1. How `--no-confirm` Is Currently Implemented

#### Flag Parsing

**Location:** `src/secrets-sync.ts`, line 459-460

```typescript
case '--no-confirm':
  flags.noConfirm = true;
  break;
```

The `Flags` interface defines `noConfirm` at line 35:
```typescript
noConfirm?: boolean;
```

Default value set at line 421:
```typescript
noConfirm: false,
```

Config flags can also set `noConfirm` — `applyConfigFlags()` at line 281 checks for boolean keys including `noConfirm` and applies them from `env-config.yml`:
```typescript
const booleanKeys: (keyof Flags)[] = ['dryRun', 'overwrite', 'force', 'noConfirm', 'skipUnchanged', 'verbose', 'help', 'version'];
```

#### The Abort Logic (THE BUG)

**Location:** `src/secrets-sync.ts`, lines 1619–1641

```typescript
// Confirmation workflow (no mutations yet)
const mutating = plan.filter((p) => p.action === 'create' || p.action === 'update' || p.action === 'delete');
if (flags.dryRun) {
  logInfo('Dry-run mode: no prompts, no mutations.');
  printAuditSummary(plan, { mode: 'dry-run', skippedFromConfig: allSkipped });
  console.log('');
  logDebug('Initialization complete: files scanned, production resolved, dotenv parsed, drift warnings emitted.');
  return;
}

let approved: PlannedChange[] = [];
if (mutating.length === 0) {
  console.log('No changes to apply.');
} else if (flags.overwrite) {
  approved = mutating; // all changes approved without prompts
  console.log('--overwrite supplied: approving all planned changes without prompts.');
} else if (flags.noConfirm) {
  console.error('--no-confirm supplied without --overwrite; refusing to prompt. Aborting with no changes.');
  process.exitCode = 1;
  return;
} else {
  // interactive prompt loop (lines 1639–1660)
  const rl = createInterface({ input, output });
  try {
    let acceptAll = false;
    for (const change of mutating) {
      if (acceptAll) {
        approved.push(change);
        continue;
      }
      const answer = await rl.question(`Apply ${change.action.toUpperCase()} for ${change.name}? [y/N/a]: `);
      const normalized = answer.trim().toLowerCase();
      if (normalized === 'a' || normalized === 'all') {
        approved.push(change);
        acceptAll = true;
        logInfo('Accepting all remaining changes.');
        continue;
      }
      if (normalized === 'y' || normalized === 'yes') approved.push(change);
    }
  } finally {
    rl.close();
  }
}
```

**The exact condition and message:**
- Line 1635: `} else if (flags.noConfirm) {`
- Line 1636: `console.error('--no-confirm supplied without --overwrite; refusing to prompt. Aborting with no changes.');`
- Line 1637: `process.exitCode = 1;`
- Line 1638: `return;`

**The problem:** When `--no-confirm` is set but `--overwrite` is NOT set, the CLI aborts with exit code 1 before doing anything. The `if/else if` chain checks `flags.overwrite` FIRST (line 1632), so `--no-confirm` only triggers when `--overwrite` is false.

---

### 2. How the Confirmation/Prompt Flow Works

**What gets confirmed:** All "mutating" changes: creates, updates, and deletes. Each is prompted individually.

**Location:** Lines 1639–1660

The interactive loop:
1. Iterates over `mutating` array (filtered from `plan` — only create/update/delete actions)
2. For each change, prompts: `Apply ${change.action.toUpperCase()} for ${change.name}? [y/N/a]:`
3. User can respond:
   - `y` / `yes` → approve that single change
   - `N` (default, or anything else) → skip that change
   - `a` / `all` → approve this and all remaining changes
4. After the loop, `approved[]` contains only changes the user said "yes" to
5. `promptSkipped` = `mutating.filter(c => !approved.includes(c))` — the ones the user declined

**Post-confirmation summary (line 1664–1671):**
```typescript
const promptSkipped = mutating.filter((c) => !approved.includes(c));
console.log('');
console.log('Confirmation results (no mutations executed yet):');
console.log(`  approved: ${approved.length}, skipped: ${promptSkipped.length}`);
```

---

### 3. Where `--overwrite` Is Checked and What It Enables

`--overwrite` serves TWO distinct purposes in the current code:

#### Purpose 1: Diff Computation (forces all existing secrets to update)

**Location:** `src/secrets-sync.ts`, line 1600

```typescript
const { plan, skipped } = computeDiffPlan(
  desired,
  existing,
  validPrefixes,
  prodActive,
  sourceBySecret,
  manifest,
  flags.overwrite ?? false,   // ← passed as `forceOverwrite` parameter
  flags.skipUnchanged ?? false,
  skipSecrets
);
```

Inside `computeDiffPlan` (line 947):
```typescript
if (forceOverwrite) {
  // Force overwrite requested - always update
  plan.push({ action: 'update', name, sourceFile });
}
```

When `forceOverwrite` is true, ALL existing secrets are marked `update` instead of potentially becoming `noop`. Without it, the diff logic compares hashes, timestamps, and manifest entries to determine if an update is needed.

#### Purpose 2: Confirmation Bypass (approves all without prompting)

**Location:** `src/secrets-sync.ts`, lines 1632–1634

```typescript
} else if (flags.overwrite) {
  approved = mutating; // all changes approved without prompts
  console.log('--overwrite supplied: approving all planned changes without prompts.');
}
```

**Key insight for the fix:** `--no-confirm` should ONLY imply Purpose 2 (approval bypass). It should NOT imply Purpose 1 (forcing all secrets to update). The `--no-confirm` flag means "don't prompt me, approve what the plan says" — it does NOT mean "re-upload every secret regardless of whether it changed."

---

### 4. How `gh secret list` Is Called — The Adapter Pattern

**Location:** `src/secrets-sync.ts`, lines 1570–1590

```typescript
// Compute diff (use mock adapter only when MOCK_MODE is explicitly set)
const MOCK_MODE = process.env.SECRETS_SYNC_MOCK === '1';
let adapter: GitHubSecretsAdapter;
if (MOCK_MODE) {
  const mockExisting = loadMockSecrets(dir);
  logInfo('MOCK MODE enabled via SECRETS_SYNC_MOCK=1 — using in-memory mock adapter');
  adapter = new MockGitHubSecretsAdapter(mockExisting);
} else {
  logDebug('Using gh CLI adapter to read existing GitHub secrets');
  adapter = new GhCliSecretsAdapter();
}

// ...
const existing = await adapter.list();  // line 1590
```

**`adapter.list()` is called ONCE** at line 1590, before `computeDiffPlan`. The returned `Map<string, RemoteSecretInfo>` provides:
- Secret names (map keys)
- `updatedAt` timestamps (from GitHub API response)
- Empty `value` fields (gh CLI cannot read secret values)

**A second call to `publisher.list()` happens AFTER mutations** at line 1714 to refresh timestamps:
```typescript
const refreshed = await publisher.list();
```

---

### 5. The GhCliSecretsAdapter Interface and Implementation

**Interface definition:** `src/secrets-sync.ts`, line 724

```typescript
interface GitHubSecretsAdapter {
  list(): Promise<Map<string, RemoteSecretInfo>>; // name -> {value, updatedAt}
  set(name: string, value: string): Promise<void>;
  delete(name: string): Promise<void>;
}
```

**`RemoteSecretInfo` type:** Line 722
```typescript
type RemoteSecretInfo = { value: string; updatedAt?: string };
```

**`GhCliSecretsAdapter.list()` implementation:** Lines 748–770

```typescript
class GhCliSecretsAdapter implements GitHubSecretsAdapter {
  async list(): Promise<Map<string, RemoteSecretInfo>> {
    try {
      const proc = spawnSync('gh', ['secret', 'list', '--json', 'name,updatedAt']);
      if (proc.status !== 0) {
        console.warn('[WARN] gh secret list failed; falling back to empty set.');
        return new Map();
      }
      const text = proc.stdout?.toString() || '';
      const arr = JSON.parse(text) as Array<{ name: string; updatedAt: string }>;
      const map = new Map<string, RemoteSecretInfo>();
      for (const item of arr) {
        map.set(item.name, { value: '', updatedAt: item.updatedAt }); // gh CLI doesn't return values
      }
      return map;
    } catch (e) {
      console.warn('[WARN] Unable to invoke gh CLI:', (e as Error).message);
      return new Map();
    }
  }
  // ... set() and delete() methods
}
```

**Key observations:**
- Uses synchronous `spawnSync` (not async `exec`)
- Returns empty Map on failure (graceful degradation, does not throw)
- `value` is always `''` — gh CLI cannot retrieve secret values
- The `Map.size` after this call gives the current count of existing secrets

---

### 6. Where the Diff/Plan Is Computed

**`computeDiffPlan` function:** `src/secrets-sync.ts`, lines 916–995

**Signature:**
```typescript
function computeDiffPlan(
  desired: Map<string, string>,
  existing: Map<string, RemoteSecretInfo>,
  validPrefixes: Set<string>,
  prodActive: boolean,
  sourceBySecret: Map<string, string>,
  manifest: SecretManifest,
  forceOverwrite: boolean,
  skipUnchanged: boolean,
  skipSecrets: Set<string>
): { plan: PlannedChange[]; skipped: PlannedChange[] }
```

**Logic flow:**
1. **Creates/Updates** (lines 932–977): Iterates `desired` map entries:
   - Skip if matches `skipSecrets` → add to `skipped[]`
   - If not in `existing` → `action: 'create'`
   - If in `existing` AND `forceOverwrite` → `action: 'update'`
   - If in `existing`: compare values/hashes/timestamps → `action: 'update'` or `'noop'`

2. **Deletes** (lines 979–993): Iterates `existing` keys:
   - Skip if in `desired` (still wanted)
   - Skip if matches `skipSecrets`
   - If has a known prefix OR production is active → `action: 'delete'`

**Return:** `{ plan: PlannedChange[], skipped: PlannedChange[] }`

**`PlannedChange` type (line 849):**
```typescript
type PlannedChange = { action: DiffAction; name: string; sourceFile?: string };
type DiffAction = 'create' | 'update' | 'delete' | 'noop';
```

**Invocation (line 1593):**
```typescript
const { plan, skipped } = computeDiffPlan(
  desired,
  existing,
  validPrefixes,
  prodActive,
  sourceBySecret,
  manifest,
  flags.overwrite ?? false,
  flags.skipUnchanged ?? false,
  skipSecrets
);
```

**For secrets limit check — extracting counts from plan:**
```typescript
const creates = plan.filter(p => p.action === 'create').length;
const deletes = plan.filter(p => p.action === 'delete').length;
// After mutations: existing.size + creates - deletes = final count
```

---

### 7. How the Publisher/Sync Loop Works After Confirmation

**Location:** `src/secrets-sync.ts`, lines 1673–1750

**Step 1: Create publisher adapter (line 1678-1679):**
```typescript
const publisher = MOCK_MODE ? adapter : new GhCliSecretsAdapter();
console.log(`Executing approved changes with ${MOCK_MODE ? 'mock adapter' : 'gh CLI'}...`);
```

**Step 2: Execute mutations (lines 1683–1710):**
```typescript
for (const change of approved) {
  try {
    if (change.action === 'delete') {
      await publisher.delete(change.name);
      delete updatedManifest[change.name];
    } else if (change.action === 'create' || change.action === 'update') {
      const val = desired.get(change.name);
      if (typeof val !== 'string') throw new Error('missing desired value');
      await publisher.set(change.name, val);
      changedSecrets.push(change.name);
      updatedManifest[change.name] = {
        hash: computeHash(val),
        sourceFile: change.sourceFile || 'unknown',
        updatedAt: manifest[change.name]?.updatedAt || '',
      };
    }
  } catch (e) {
    failures.push({ name: change.name, action: change.action, error: (e as Error).message });
  }
}
```

**Step 3: Re-fetch timestamps (lines 1712–1729):**
After mutations, calls `publisher.list()` again to get real `updatedAt` values from GitHub.

**Step 4: Save manifest (line 1733):**
```typescript
if (approved.length > failures.length) {
  saveManifest(dir, updatedManifest);
}
```

**Step 5: Report failures (lines 1735–1739):**
```typescript
if (failures.length) {
  console.error('Some operations failed:');
  for (const f of failures) console.error(` - ${f.action} ${f.name}: ${f.error}`);
  process.exitCode = 1;
}
```

**Step 6: Print final audit summary (lines 1747–1753).**

---

### 8. Complete Execution Flow (Summary)

```
main() at line 1291
  ├── parseFlags() → Flags object
  ├── loadEnvConfig() → EnvConfig (includes flags, skipSecrets, etc.)
  ├── Apply environment config (SKIP_DEPENDENCY_CHECK, etc.)
  ├── Initialize logger
  ├── validateDependencies() [nodeVersion, ghCli, ghAuth, ghTokenScope]
  ├── applyConfigFlags() → merge config into flags (line 1373)
  ├── Load required secrets, skip secrets, backup retention
  ├── Handle --fix-gitignore early return
  ├── Validate .gitignore
  ├── Discover env files, parse dotenv, layer production, build envSummaries
  ├── Empty value validation (lines 1536+)
  ├── Create adapter (line 1570–1579)
  ├── Load manifest (line 1583)
  ├── buildDesiredWithSources() (line 1589)
  ├── adapter.list() (line 1590) → existing secrets Map
  ├── computeDiffPlan() (line 1593) → plan[]
  ├── printDiffSummary() (line 1616)
  │
  ├── ═══ CONFIRMATION WORKFLOW (line 1619) ═══
  │   ├── if dryRun → print audit, return
  │   ├── if mutating.length === 0 → "No changes"
  │   ├── if overwrite → approve all
  │   ├── if noConfirm → ❌ ABORT (the bug)
  │   └── else → interactive prompt loop
  │
  ├── ═══ SECRETS LIMIT CHECK WOULD GO HERE ═══
  │   (Between plan computation and execution)
  │   (After existing.size and plan creates/deletes are known)
  │
  ├── ═══ EXECUTION (line 1673) ═══
  │   ├── Create publisher adapter
  │   ├── Loop: approved changes → set/delete
  │   ├── Re-fetch timestamps
  │   ├── Save manifest
  │   └── Report failures
  │
  └── Print final audit summary
```

---

### 9. Dual Semantics of `--overwrite` (Important for Fix Design)

`--overwrite` conflates two behaviors:

1. **Diff behavior** — `forceOverwrite=true` in `computeDiffPlan` forces ALL existing secrets to `action: 'update'` even if unchanged (line 947). This means every secret gets re-uploaded to GitHub.

2. **Confirmation behavior** — Approves all mutations without prompting (line 1632-1634).

**For the `--no-confirm` fix:** Only the confirmation behavior (2) should be implied. The diff behavior (1) should NOT be activated by `--no-confirm`. Users running `--no-confirm` in CI want "apply whatever the plan says without asking me" — not "re-upload everything regardless of whether it changed."

**Fix approach:** Change line 1635 from:
```typescript
} else if (flags.noConfirm) {
  console.error('--no-confirm supplied without --overwrite; refusing to prompt. Aborting with no changes.');
  process.exitCode = 1;
  return;
```
To:
```typescript
} else if (flags.noConfirm) {
  approved = mutating; // --no-confirm implies consent for planned changes
  console.log('--no-confirm supplied: approving all planned changes without prompts.');
```

This preserves `--overwrite`'s dual purpose (force update + skip prompts) while making `--no-confirm` purely a "skip prompts" flag.

---

### 10. Secrets Limit Check — Best Integration Point

The limit check cannot be a `DependencyCheck` in `validateDependencies` because:
1. It needs `existing.size` (available only after `adapter.list()` at line 1590)
2. It needs `plan` (available only after `computeDiffPlan()` at line 1593)

**Best placement:** After `computeDiffPlan` returns (line 1593) and before the confirmation workflow begins (line 1619). This is the same region where `printDiffSummary()` runs.

**Integration pattern (conceptual):**
```typescript
// After computeDiffPlan returns at line ~1600
const creates = plan.filter(p => p.action === 'create').length;
const deletes = plan.filter(p => p.action === 'delete').length;
const projectedTotal = existing.size + creates - deletes;
const REPO_SECRET_LIMIT = 100;

if (projectedTotal > REPO_SECRET_LIMIT) {
  console.error(`❌ Would exceed GitHub repository secrets limit (${REPO_SECRET_LIMIT}).`);
  console.error(`   Current: ${existing.size}, Creating: ${creates}, Deleting: ${deletes}, Projected: ${projectedTotal}`);
  process.exitCode = 1;
  return;
}
```

**Considerations:**
- Should this be a hard block (exit 1) or a warning? Hard block is safer — prevents guaranteed API failures.
- Should respect `SECRETS_SYNC_MOCK=1` bypass (mock mode has no real limit).
- Should still show in `--dry-run` mode (inform user of the problem).
- The check should account for net changes: `existing.size + creates - deletes`.
- If `existing` is empty due to `adapter.list()` failure (graceful degradation returns empty Map), the limit check cannot be accurate — should warn but not block.

---

### 11. Existing Test Patterns (For Reference)

**Integration test pattern** (from `tests/integration/empty-value-validation.test.ts`):
```typescript
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

**Key test conventions:**
- `SKIP_DEPENDENCY_CHECK=1` bypasses gh CLI requirements
- `SECRETS_SYNC_MOCK=1` uses in-memory mock adapter (reads from `.secrets-mock.json`)
- `--dry-run` for non-mutation tests
- Assert on `exitCode`, `stdout`, and `stderr` content

**For testing `--no-confirm`:** Can use `SECRETS_SYNC_MOCK=1` with a `.secrets-mock.json` that has fewer entries than the desired secrets, then run without `--dry-run` to test that mutations are approved.

**For testing secrets limit:** Can use `SECRETS_SYNC_MOCK=1` with a `.secrets-mock.json` containing 98+ entries, then attempt to create new secrets that would exceed 100.

---

## Constraints

1. **No new runtime dependencies** — consistent with REQ-010 pattern from prior features.
2. **`gh secret list` already returns all secrets** — no additional API call needed for the count.
3. **The 100-secret limit applies to the `actions` application** — Dependabot and Codespaces have separate secret stores with their own limits.
4. **The CLI currently only manages repo-level secrets** — no `--org` flag, so only the 100-repo-secret limit is relevant.
5. **The `gh secret set` command uses "create or update" semantics** — updating an existing secret does NOT increase the count. Only truly new secrets count toward the limit.
6. **The pre-flight check from `validateDependencies` runs BEFORE the adapter is instantiated** — the secrets limit check must happen later in the flow.
7. **Mock mode (`SECRETS_SYNC_MOCK=1`) should bypass the limit check** — consistent with existing patterns.
8. **The limit check should account for net changes** — if the plan includes both creates and deletes, the net new count is what matters: `current + creates - deletes ≤ 100`.

---

## Summary

| Question | Answer | Verified? |
|----------|--------|-----------|
| Repository secrets limit | 100 | ✅ Verified |
| Organization secrets limit | 1,000 | ✅ Verified |
| Environment secrets limit | 100 | ✅ Verified |
| API error on exceeding limit | Likely HTTP 422 with validation message | ⚠️ UNVERIFIED |
| `gh secret list` returns count? | Returns full array; length = count | ✅ Verified |
| API has `total_count` field? | Yes, in list endpoint response | ✅ Verified |
| `--no-confirm` should imply consent? | Yes, per all major CLI conventions | ✅ Verified |
| Efficient count-only API call? | `?per_page=1` + `.total_count` | ✅ Verified |
| Current project already has count? | Yes, from `adapter.list()` Map.size | ✅ Verified |
| Net-new calculation needed? | Yes: current + creates - deletes | ✅ Design constraint |
