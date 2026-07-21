# GitHub Token Scope Pre-flight Check Problem Statement

Detect missing GitHub token scopes before `gh secret set` calls and provide actionable remediation instead of cryptic 403 errors.

## Context

`secrets-sync` uses the GitHub CLI (`gh`) to push secrets to GitHub Actions. The `gh secret set` command requires specific OAuth token scopes depending on repository ownership:

- **Personal repos:** `repo` scope (included in default `gh auth login` scopes)
- **Organization repos:** `admin:org` scope (NOT included by default)

When the required scope is missing, `gh secret set` fails with the misleading error `HTTP 403: Must have admin rights to Repository`. This message does not mention scopes or provide a fix command. Users must independently research the issue to discover that `gh auth refresh -s admin:org` resolves it.

## Current Behavior

1. User authenticates with `gh auth login` (default scopes: `repo`, `read:org`).
2. User runs `secrets-sync` against an organization repository.
3. Pre-flight checks pass (gh CLI installed ✓, gh authenticated ✓).
4. CLI discovers env files, builds diff plan, prompts for confirmation.
5. User confirms, and `gh secret set` is called.
6. **Every secret set call fails** with: `gh secret set KEY failed: HTTP 403: Must have admin rights to Repository.`
7. All secrets are logged as failures. Exit code 1.
8. User has no idea the fix is a single scope refresh command.

The failure is:
- **Late** — happens after all planning, confirmation, and partial work.
- **Misleading** — "admin rights" suggests a permissions issue, not a token scope issue.
- **Repetitive** — fails once per secret instead of failing fast on the first attempt.
- **Not actionable** — user must Google the error to find the fix.

## Desired Behavior

1. Pre-flight checks detect that the token lacks required scopes **before** any mutation.
2. If `repo` scope is missing → clear error with `gh auth refresh -s repo` fix.
3. If `admin:org` scope is missing for org repos → clear error with `gh auth refresh -s admin:org` fix.
4. If scopes cannot be determined (fine-grained PATs, API failure) → warn but allow proceeding.
5. If scope check passes → normal operation continues.
6. If a 403 occurs at runtime despite passing pre-flight → enhanced error message with scope-specific fix.

## Who Is Impacted

- **Organization repo users** — most common case; `admin:org` is not in default scopes.
- **CI pipelines** — tokens provisioned without required scopes cause silent deploy failures.
- **New users** — first-time setup with org repos hits this immediately after `gh auth login`.

## End-User Success Outcomes

- Users see an actionable error with a copy-pasteable fix command **before** any secrets are mutated.
- Users fixing the scope and re-running succeed on the first attempt.
- Users with fine-grained PATs or unusual token setups are not blocked by the scope check.
- Existing `SKIP_DEPENDENCY_CHECK=1` bypass continues to work for tests and advanced users.

## Constraints

- Must not add runtime dependencies (aligns with REQ-011 precedent from empty-value validation).
- Must integrate with the existing `DependencyCheck` system in `src/utils/dependencies.ts`.
- Must respect `SKIP_DEPENDENCY_CHECK=1` env var bypass.
- Must handle fine-grained PATs gracefully (they may return empty `X-Oauth-Scopes` header).
- Must use `execWithTimeout` for subprocess calls (timeout safety).
- The `X-Oauth-Scopes` API header method is the most reliable detection approach.

## Assumptions

- The CLI currently only supports repo-level secrets (no `--org` flag in adapter).
- Organization detection requires an additional API call (`gh api /users/{owner} --jq '.type'`).
- Fine-grained PATs use a different permission model and may not report scopes via the `X-Oauth-Scopes` header — the check should pass gracefully in this case.
- The scope check should run even in `--dry-run` mode to validate CI readiness.

## Non-Goals

- Adding organization-level secret support (`--org` flag).
- Supporting fine-grained PAT permission validation (different permission model entirely).
- Replacing or modifying how `gh auth login` works.
- Caching scope results across CLI invocations (session cache only).

## Technical Approaches

### Preferred: API Header Check

```bash
gh api --include / 2>&1 | grep -i "x-oauth-scopes"
# Returns: X-Oauth-Scopes: repo, read:org, gist, ...
```

Parse the comma-separated scope list and check for required scopes. This is the most reliable method per GitHub documentation and works regardless of gh CLI version.

### Fallback: Graceful Pass

If the API call fails or returns no scopes header (fine-grained PATs), pass the check with a debug-level warning. The runtime 403 error enhancement will catch issues at execution time.

## Open Questions

None — the research brief resolved all key technical questions.
