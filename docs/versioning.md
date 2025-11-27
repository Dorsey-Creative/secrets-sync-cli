# Versioning Strategy

This project maintains two long-lived branches (`release` and `develop`) to separate production-ready builds from nightly builds published under the `next` npm tag. Release tags follow plain SemVer, while development builds attach a date-based suffix that resets every day.

## Branch Structure

- **release** – Default branch. Only stabilized commits land here and every merge is followed by a tagged release (`vMAJOR.MINOR.PATCH`). GitHub Actions publishes from this branch to npm with the `latest` tag.
- **develop** – Integration branch. Nightly builds are cut here with a date-based suffix and published (via workflow) to npm under the `next` tag so they never override production installs.
- **feature/*** – Short-lived branches that merge into `develop`. They never bump versions directly.

## Version Formats

### Production Releases (`release` branch)

- Format: `MAJOR.MINOR.PATCH`
- Examples: `1.0.5`, `1.0.6`
- Tagged as `v1.0.6`, `v1.0.5`, etc. These tags match the versions listed in `CHANGELOG.md`.

### Nightly / Develop Builds (`develop` branch)

- Format: `MAJOR.MINOR.PATCH-YYYYMMDD.N`
- Example: `1.0.6-20251125.3`
- `YYYYMMDD` is the UTC date when the build script runs. `N` is a counter that starts at `1` each day and increments on subsequent bumps.
- Nightly builds always inherit the base SemVer from the next planned release. (e.g., after releasing `1.0.6`, `develop` starts producing `1.0.7-YYYYMMDD.1`).

## Supporting Scripts

### `bun run version:build`

Invokes `scripts/bump-build.sh` to update `package.json` on `develop`:

- Reads the current base version (`MAJOR.MINOR.PATCH`).
- Injects the current date and increments the per-day counter.
- Updates `package.json` without creating a git tag so the change can land in a normal commit/PR.

Run this any time you need a new develop build (typically right before opening a PR that should trigger the nightly publishing workflow).

### `bun run version:release [patch|minor|major]`

Utility for local prep before cutting a release. It removes any `-YYYYMMDD.N` suffix in `package.json`, bumps the SemVer portion, and leaves the result staged for commit. Use this if you need to preflight a release manually before switching to the dedicated release script.

### `bun run release [patch|minor|major]`

Wrapper around `scripts/release.sh` that enforces the official release process:

1. Verifies you are on the `release` branch and the working tree is clean.
2. Pulls the latest `release` branch and runs the full Bun test suite.
3. Calls `npm version <type>` to bump `package.json`, commit `chore: release vX.Y.Z [skip ci]`, and create the `vX.Y.Z` git tag.
4. Pushes both the commit and tag to `origin/release`, letting GitHub Actions publish the new version to npm.

## Workflow Summary

1. **Feature work** – Branch from `develop`, implement changes, and merge back through PRs.
2. **Nightly build bump** – On `develop`, run `bun run version:build` whenever you want CI to publish a new pre-release (`next` tag). Commit the updated `package.json` (and lock file if necessary).
3. **Release prep** – Once `develop` is stable, merge it into `release` (or fast-forward `release` to the desired commit). If needed, run `bun run version:release patch` to strip any develop suffix locally.
4. **Cut the release** – On `release`, execute `bun run release patch` (or `minor`/`major`). This produces the `vMAJOR.MINOR.PATCH` tag and pushes all changes.
5. **Back to develop** – Merge `release` back into `develop` so it picks up the new base version. Immediately run `bun run version:build` to seed the next nightly (`MAJOR.MINOR.(PATCH+1)-YYYYMMDD.1`).

## Example Timeline

```
develop: 1.0.6-20251124.2 → 1.0.6-20251125.1 → 1.0.6-20251125.2
             (merge into release)
release: 1.0.6 (tagged v1.0.6 and published as latest)
             (merge release back into develop)
develop: 1.0.7-20251125.1 → 1.0.7-20251126.1 → …
```

## Quick Reference

```bash
# Nightly build bump (develop)
bun run version:build

# Prep a release without running full release script (rare)
bun run version:release patch

# Full release from the release branch (runs tests, tags, pushes)
bun run release patch
```
