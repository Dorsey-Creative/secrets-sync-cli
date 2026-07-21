# Dependency Check: --no-confirm Flag Fix & GitHub Secrets Limit Pre-flight Check

## Overview

This feature does **NOT** add any new runtime or development dependencies. Both fixes are purely behavioral changes to existing logic in `src/secrets-sync.ts` using variables, APIs, and patterns already present in the codebase.

---

## New Runtime Dependencies Added

| Dependency | Status |
|------------|--------|
| **None** | ✅ CONFIRMED — REQ-015 satisfied |

The `package.json` `dependencies` field remains unchanged:
- `lru-cache: ^11.2.2` (existing, not used by this feature)
- `yaml: ^2.9.0` (existing, not used by this feature)

---

## New Dev Dependencies Added

| Dependency | Status |
|------------|--------|
| **None** | ✅ CONFIRMED |

The `package.json` `devDependencies` field remains unchanged:
- `@types/bun: latest` (existing)
- `bun-types: latest` (existing)
- `jscpd: ^4.0.5` (existing)

---

## Analysis: Fix A (--no-confirm Implies Consent)

### What it uses

| Construct | Source | Status |
|-----------|--------|--------|
| `approved` variable | Already declared at line ~1630 in confirmation workflow | ✅ EXISTING |
| `mutating` array | Already computed at line ~1619 via `plan.filter()` | ✅ EXISTING |
| `console.log()` | Node.js built-in global | ✅ BUILT-IN |
| `flags.noConfirm` | Already parsed by `parseFlags()` at line ~459 | ✅ EXISTING |

### New imports needed

None. The fix modifies 3 lines in an existing `else if` block using only variables already in scope.

---

## Analysis: Fix B (Secrets Limit Pre-flight Check)

### What it uses

| Construct | Source | Status |
|-----------|--------|--------|
| `plan` array | Return value of `computeDiffPlan()` at line ~1593 | ✅ EXISTING |
| `plan.filter()` | Built-in Array method | ✅ BUILT-IN |
| `existing.size` | `Map.size` property on return value of `adapter.list()` at line ~1590 | ✅ EXISTING |
| `MOCK_MODE` | Already declared at line ~1570: `process.env.SECRETS_SYNC_MOCK === '1'` | ✅ EXISTING |
| `flags.dryRun` | Already parsed by `parseFlags()` | ✅ EXISTING |
| `console.warn()` | Node.js built-in global | ✅ BUILT-IN |
| `console.error()` | Node.js built-in global | ✅ BUILT-IN |
| `process.exitCode` | Node.js built-in global | ✅ BUILT-IN |

### New imports needed

None. The limit check uses only local variables already in scope and Node.js built-in globals.

---

## Analysis: Integration Tests

### What they use

| Construct | Source | Status |
|-----------|--------|--------|
| `bun:test` (describe, test, expect, beforeEach, afterEach, beforeAll) | Bun built-in test runner | ✅ BUILT-IN |
| `node:fs` (mkdirSync, writeFileSync, rmSync, existsSync) | Node.js built-in module | ✅ BUILT-IN |
| `node:path` (join) | Node.js built-in module | ✅ BUILT-IN |
| `node:os` (tmpdir) | Node.js built-in module | ✅ BUILT-IN |
| `Bun.spawnSync` | Bun runtime API | ✅ BUILT-IN |
| `.secrets-mock.json` test fixture | Project convention for mock adapter | ✅ EXISTING PATTERN |

### New test imports needed

None. Tests follow the exact pattern established in `tests/integration/empty-value-validation.test.ts`.

---

## External Services & APIs

### GitHub REST API (Actions Secrets)

| Field | Value |
|-------|-------|
| **Status** | ✅ NOT AFFECTED |
| **Reason** | This feature does not add or change any API calls. The limit check uses data already fetched by the existing `adapter.list()` call (`gh secret list --json name,updatedAt`). |
| **Impact** | Zero additional network requests |

### GitHub CLI (`gh`)

| Field | Value |
|-------|-------|
| **Status** | ✅ NOT AFFECTED |
| **Reason** | No new `gh` commands are introduced. The existing `GhCliSecretsAdapter.list()` call provides all data needed for the limit calculation via `existing.size`. |
| **Minimum version** | Same as project requirement (any `gh` 2.x) |

---

## Node.js Built-in Modules Used

All constructs used by both fixes are available in Node.js 18+ (the project minimum):

| Module/API | Used For | Available Since |
|------------|----------|-----------------|
| `Array.prototype.filter()` | Counting creates/deletes from plan | ES5 (always) |
| `Map.prototype.size` | Getting existing secret count | ES6 (always in Node 18+) |
| `console.log/warn/error` | Output messages | Always |
| `process.exitCode` | Setting nonzero exit | Always |

---

## Risk Assessment

| Risk | Level | Notes |
|------|-------|-------|
| Breaking existing imports | None | No import changes |
| Package version conflicts | None | No package changes |
| Transitive vulnerability introduction | None | No new packages |
| Platform compatibility | None | Uses only universal JS/Node constructs |
| Build tool compatibility | None | No build config changes |

---

## Verification Commands

```bash
# Confirm no package.json changes after implementation
git diff --name-only | grep -v package  # Should not show package.json or lockfile

# Confirm build still works without new packages
bun run build

# Confirm tests pass without new packages
bun test
```

---

## Summary

| Category | New Dependencies | Justification |
|----------|-----------------|---------------|
| Runtime | 0 | Both fixes use existing in-scope variables and Node.js built-ins |
| Development | 0 | Tests use existing Bun test runner and Node.js built-in modules |
| External services | 0 | No new API calls; limit check reuses existing `adapter.list()` data |

**Verdict: No new dependencies required. REQ-015 satisfied by design — these are purely behavioral modifications to existing code paths.**
