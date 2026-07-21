# Dependency Check: GitHub Token Scope Pre-flight Check

## Overview

This feature does **NOT** add any new runtime dependencies to `package.json` (REQ-010). All functionality is implemented using existing internal utilities and the already-required `gh` CLI external tool.

---

## External Dependencies (Runtime CLI Tools)

### GitHub CLI (`gh`)

| Field | Value |
|-------|-------|
| **Status** | ✅ VERIFIED |
| **Type** | External CLI tool (already required by project) |
| **Latest Stable** | v2.96.0 (released July 2, 2026) |
| **Repository** | https://github.com/cli/cli |
| **License** | MIT |
| **Maintainer** | GitHub, Inc. (official) |
| **Actively Maintained** | Yes — 11,582 commits, 45.3K stars, frequent releases |
| **Known Vulnerabilities** | CVE-2026-48501 (fixed in v2.93.0) — auth token leakage to TUF mirrors; CVE-2026-45803 (fixed in v2.92.0) — terminal escape injection in log output. Both fixed in current latest. |
| **Min Version Required** | No specific minimum; `gh api --include` and `gh repo view --json` available since gh 2.x |

**Notes:**
- The design uses `gh api --include /`, `gh repo view --json owner --jq ".owner.login"`, `gh api /users/{owner} --jq ".type"`, and `gh auth refresh -s <scope>` commands. All are stable, documented commands available in the current gh CLI.
- Users should run gh >= 2.93.0 to avoid CVE-2026-48501 (unrelated to this feature but a known security fix).
- The project already requires `gh` for existing `ghCliCheck` and `ghAuthCheck` pre-flight checks.

---

## External Services (APIs)

### GitHub REST API — Root Endpoint (`GET /`)

| Field | Value |
|-------|-------|
| **Status** | ✅ VERIFIED |
| **Documentation** | https://docs.github.com/en/rest/meta/meta |
| **Used For** | Fetching `X-Oauth-Scopes` response header |
| **Authentication** | Required (token-based, handled by `gh` CLI) |
| **Rate Limiting** | Standard GitHub API limits (5,000/hour for authenticated) |
| **Stability** | Stable — documented since GitHub API v3 inception |

**Notes:**
- The `X-Oauth-Scopes` header is returned on ALL authenticated API responses per [GitHub OAuth Scopes documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps).
- Fine-grained PATs may return an empty `X-Oauth-Scopes` header — the design handles this gracefully (returns null → check passes).
- The root endpoint (`/`) is lightweight and returns API metadata only.

### GitHub REST API — Users Endpoint (`GET /users/{username}`)

| Field | Value |
|-------|-------|
| **Status** | ✅ VERIFIED |
| **Documentation** | https://docs.github.com/en/rest/users/users |
| **Used For** | Checking if repo owner is an Organization or User (`.type` field) |
| **Authentication** | Optional for public profiles (handled by `gh` CLI) |
| **Rate Limiting** | Standard GitHub API limits |
| **Stability** | Stable — documented since GitHub API v3 inception |

**Notes:**
- The `.type` field returns `"Organization"` or `"User"` — used for org detection.
- No special scopes required to read public user/org profiles.

### GitHub REST API — Actions Secrets (`PUT /repos/{owner}/{repo}/actions/secrets/{name}`)

| Field | Value |
|-------|-------|
| **Status** | ✅ VERIFIED |
| **Documentation** | https://docs.github.com/en/rest/actions/secrets |
| **Used For** | Understanding scope requirements (`repo` for personal repos, `admin:org` for org repos) |
| **Required Scopes** | `repo` scope (personal repos); `admin:org` scope (organization repos) |

**Notes:**
- Confirmed via [GitHub CLI issue #2845](https://github.com/cli/cli/issues/2845): org secrets require `admin:org` scope.
- The misleading `HTTP 403: Must have admin rights to Repository` error is confirmed as a scope issue, not a permissions issue.
- [Official docs](https://docs.github.com/rest/actions/secrets) state: "OAuth app tokens and personal access tokens (classic) need the `admin:org` scope to use this endpoint."

---

## Internal Dependencies (Existing Project Utilities)

### `execWithTimeout` (`src/utils/timeout.ts`)

| Field | Value |
|-------|-------|
| **Status** | ✅ VERIFIED |
| **Type** | Internal utility (already exists) |
| **Purpose** | Execute shell commands with configurable timeout |
| **Uses** | `child_process.exec` (Node.js built-in) wrapped with AbortController |
| **Timeout** | Configurable via `SECRETS_SYNC_TIMEOUT` env var (default 30s) |

### `DependencyCheck` interface (`src/utils/dependencies.ts`)

| Field | Value |
|-------|-------|
| **Status** | ✅ VERIFIED |
| **Type** | Internal interface (already exists) |
| **Purpose** | Standard interface for pre-flight validation checks |
| **Pattern** | Parallel execution via `Promise.all`, session caching via `validationCache` |

### Error Catalog (`src/messages/errors.json`)

| Field | Value |
|-------|-------|
| **Status** | ✅ VERIFIED |
| **Type** | Internal JSON catalog (already exists) |
| **Purpose** | Structured error messages with what/why/howToFix format |
| **Extension** | New `ERR_TOKEN_SCOPE` entry to be added (no schema change) |

---

## Node.js Built-in Modules

### `child_process` (exec, spawnSync)

| Field | Value |
|-------|-------|
| **Status** | ✅ VERIFIED |
| **Type** | Node.js built-in (stable API) |
| **Documentation** | https://nodejs.org/api/child_process.html |
| **Node.js Version** | Available since Node.js 0.1.90; stable across all supported versions |

**Notes:**
- `exec` is used via `execWithTimeout` for async checks (scope detection, org detection).
- `spawnSync` is used in `GhCliSecretsAdapter` for mutation commands (existing pattern).
- No stability concerns — this is a core Node.js module.

---

## Build/Test Dependencies (Dev Only)

### Bun Runtime

| Field | Value |
|-------|-------|
| **Status** | ✅ VERIFIED |
| **Type** | Dev dependency (build tool + test runner) |
| **Latest Stable** | v1.3.14 (May 2026) |
| **Repository** | https://github.com/oven-sh/bun |
| **License** | MIT |
| **Actively Maintained** | Yes — very active development, frequent releases |
| **Known Vulnerabilities** | None affecting this feature's testing |

---

## Risk Assessment

### Node.js 18 EOL Status

| Field | Value |
|-------|-------|
| **Status** | ⚠️ RISK (pre-existing, not introduced by this feature) |
| **Issue** | Node.js 18 reached End-of-Life on April 30, 2025 |
| **Impact** | The project's `engines` field specifies `>=18.0.0`; Node 18 no longer receives security patches |
| **Recommendation** | Consider updating minimum to Node 20 in a separate effort. This feature does not change or worsen this situation. |
| **Source** | https://nodejs.org/en/about/eol |

---

## New Runtime Dependencies Added

| Dependency | Status |
|------------|--------|
| **None** | ✅ CONFIRMED — REQ-010 satisfied |

The `package.json` `dependencies` field remains unchanged:
- `lru-cache: ^11.2.2` (existing, latest 11.5.1, 0 vulnerabilities, BlueOak-1.0 license)
- `yaml: ^2.9.0` (existing, not used by this feature)

---

## Summary

| Dependency/Service | Type | Status | Notes |
|-------------------|------|--------|-------|
| GitHub CLI (`gh`) | External CLI | ✅ VERIFIED | MIT, v2.96.0, actively maintained |
| GitHub REST API — root `/` | External service | ✅ VERIFIED | Stable, documented |
| GitHub REST API — `/users/{owner}` | External service | ✅ VERIFIED | Stable, documented |
| GitHub OAuth scopes system | External service | ✅ VERIFIED | Stable, documented |
| `node:child_process` | Node.js built-in | ✅ VERIFIED | Stable core module |
| `execWithTimeout` | Internal utility | ✅ VERIFIED | Already exists in project |
| `DependencyCheck` interface | Internal interface | ✅ VERIFIED | Already exists in project |
| `errors.json` catalog | Internal resource | ✅ VERIFIED | Already exists, to be extended |
| Bun (dev only) | Dev tool | ✅ VERIFIED | MIT, v1.3.14, actively maintained |
| Node.js 18 minimum | Runtime target | ⚠️ RISK | EOL since April 2025 (pre-existing issue) |

**Verdict: All dependencies are verified and actively maintained. No new runtime dependencies introduced. No blockers for implementation.**
