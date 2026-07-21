# --no-confirm Flag Fix & GitHub Secrets Limit Pre-flight Check Problem Statement

Fix --no-confirm to imply consent (not abort) and add a pre-flight check preventing sync beyond GitHub's 100 repo secret limit.

## Context

`secrets-sync` has two independent issues that affect CI/CD reliability:

1. **The `--no-confirm` flag aborts instead of implying consent.** Every major CLI tool (`terraform -auto-approve`, `gh --yes`, `npm -y`, `pulumi --yes`) treats a "skip confirmation" flag as implicit approval. The current implementation does the opposite — it refuses to proceed and exits with code 1 if `--overwrite` is not also supplied. This forces CI pipelines to use `--overwrite`, which conflates two distinct behaviors: force-updating all secrets (diff semantic) and skipping prompts (confirmation semantic).

2. **No pre-flight check for GitHub's 100 repository secret limit.** When a sync plan would create enough new secrets to exceed GitHub's hard 100-secret-per-repository limit, the CLI attempts all mutations, fails partway through with opaque API errors, and leaves the repository in a partially-synced state. The information needed to detect this (existing count + planned creates − planned deletes) is already available before mutations begin.

---

## Problem A: --no-confirm Aborts Instead of Approving

### Current Behavior

1. User runs `secrets-sync --no-confirm` in a CI pipeline (no TTY, cannot prompt).
2. The CLI computes the diff plan correctly (creates, updates, deletes).
3. At the confirmation workflow, the `if/else if` chain hits: `else if (flags.noConfirm)`.
4. The CLI prints: `--no-confirm supplied without --overwrite; refusing to prompt. Aborting with no changes.`
5. Exit code 1. No mutations applied.
6. CI pipeline fails despite valid secrets and correct plan.

### Location of Bug

`src/secrets-sync.ts`, lines 1635–1638:
```typescript
} else if (flags.noConfirm) {
  console.error('--no-confirm supplied without --overwrite; refusing to prompt. Aborting with no changes.');
  process.exitCode = 1;
  return;
}
```

### Desired Behavior

1. `--no-confirm` alone approves all planned mutations without prompting — identical to what a user typing "a" (all) at the interactive prompt achieves.
2. `--no-confirm` does NOT activate `--overwrite`'s force-update-all diff semantic. The diff plan remains based on actual change detection (hashes, timestamps, manifest).
3. `--overwrite --no-confirm` continues to work as before (force all + skip prompts).
4. Interactive mode (no flags) is unchanged.

### Why This Matters

- CI pipelines cannot use interactive prompts — `--no-confirm` is the standard escape hatch.
- Requiring `--overwrite` alongside `--no-confirm` forces unnecessary re-uploads of every secret on every run, wasting API calls and time.
- The current behavior contradicts every major CLI convention for confirmation-bypass flags.

---

## Problem B: No Warning When Sync Would Exceed 100 Repo Secret Limit

### Current Behavior

1. User has 95 existing repository secrets.
2. User adds 10 new env keys to their `.env` files and runs `secrets-sync`.
3. The plan shows 10 creates. No warning about the limit.
4. After confirmation, the CLI attempts all 10 `gh secret set` calls.
5. The first 5 succeed (reaching 100 total).
6. The remaining 5 fail with API errors (likely HTTP 422).
7. Repository is left in a partially-synced state (5 of 10 created).
8. User must manually investigate which secrets were created and which weren't.

### Desired Behavior

1. After `computeDiffPlan()` returns, the CLI calculates: `existing.size + creates - deletes`.
2. If projected total > 100: hard block with clear error showing counts and the limit.
3. In `--dry-run` mode: warn about the limit violation but don't set exit code to 1 (informational).
4. In mock mode (`SECRETS_SYNC_MOCK=1`): skip the check entirely (no real GitHub limit).
5. If `existing` is empty due to `adapter.list()` failure: warn that the limit cannot be verified, but don't block.

### Why This Matters

- Partial sync failures are hard to diagnose and recover from.
- The information needed to prevent this is already available before mutations start.
- GitHub's error message for exceeding the limit is opaque and does not mention the 100-secret cap.
- Prevention is strictly better than post-failure diagnosis.

---

## Who Is Impacted

- **CI/CD pipelines** — the `--no-confirm` bug makes the CLI unusable without `--overwrite` in non-interactive contexts.
- **Teams with many secrets** — approaching the 100-secret limit without awareness leads to partial failures.
- **New users** — encountering the abort message when using `--no-confirm` is confusing; it reads as if the flag is deliberately unsupported without `--overwrite`.

---

## End-User Success Outcomes

After completion:

- Users can run `secrets-sync --no-confirm` in CI and have all planned changes applied without prompts.
- Users running `secrets-sync --no-confirm` get the same diff-based plan as interactive mode (no force-update-all side effect).
- Users approaching the 100-secret limit see a clear error with current count, projected count, and the limit — before any mutations are attempted.
- Users in `--dry-run` mode see a warning about limit violations as part of their plan review.
- Existing `--overwrite` behavior is unchanged.
- Existing `--overwrite --no-confirm` behavior is unchanged.

---

## Constraints

- No new runtime dependencies (consistent with REQ-010 precedent from prior features).
- The limit check must use data already available (`existing.size` from `adapter.list()`, plan counts from `computeDiffPlan()`).
- Mock mode (`SECRETS_SYNC_MOCK=1`) should bypass the limit check.
- The fix must not change `--overwrite`'s existing diff behavior (force-update-all).
- Changes should be minimal and surgical — both fixes are small in scope.

---

## Assumptions

- The 100-secret limit is a hard GitHub platform constraint that will not change without notice.
- `adapter.list()` returning an empty Map (due to API failure) means the limit cannot be reliably calculated — warn but don't block.
- The `--no-confirm` flag is primarily used in CI/non-interactive contexts.
- Updates to existing secrets do NOT count toward the limit (only net-new creations matter).

---

## Non-Goals

- Adding organization or environment secret limit checks (only repo-level is managed by this CLI).
- Changing the `--overwrite` flag's dual semantics (that's a separate concern).
- Adding a `--yes` / `-y` alias for `--no-confirm` (possible future enhancement, not in scope).
- Implementing pagination or count-only API calls for the limit check (existing `adapter.list()` already provides the count).

---

## Technical Approaches

### Problem A Fix (--no-confirm)

Replace the abort logic at lines 1635–1638 with approval logic that matches `--overwrite`'s confirmation bypass but does NOT activate the diff force-update behavior:

```typescript
} else if (flags.noConfirm) {
  approved = mutating;
  console.log('--no-confirm supplied: approving all planned changes without prompts.');
}
```

### Problem B Fix (Secrets Limit)

Insert a limit check between `computeDiffPlan()` and the confirmation workflow:

```typescript
const creates = plan.filter(p => p.action === 'create').length;
const deletes = plan.filter(p => p.action === 'delete').length;
const projectedTotal = existing.size + creates - deletes;
const REPO_SECRET_LIMIT = 100;

if (projectedTotal > REPO_SECRET_LIMIT && !MOCK_MODE) {
  if (flags.dryRun) {
    console.warn(`⚠️  Plan would exceed GitHub repository secrets limit (${REPO_SECRET_LIMIT}). Current: ${existing.size}, +${creates}, -${deletes} → ${projectedTotal}`);
  } else {
    console.error(`❌ Would exceed GitHub repository secrets limit (${REPO_SECRET_LIMIT}).`);
    console.error(`   Current: ${existing.size}, Creating: +${creates}, Deleting: -${deletes}, Projected: ${projectedTotal}`);
    process.exitCode = 1;
    return;
  }
}
```
