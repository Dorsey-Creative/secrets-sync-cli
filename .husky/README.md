# Git Hooks

This directory contains Git hooks managed by Husky.

## Pre-commit Hook

Validates that `package.json` version follows the dev branch format:
- **Required format:** `X.Y.Z-YYYYMMDD.N` (e.g., `1.1.1-20251126.1`)
- **Purpose:** Ensures version is managed by CI/CD, not manually changed

### Why This Matters

Version numbers are automatically managed by the CI/CD pipeline:
- **Dev branch:** Uses date-stamped versions (`1.1.1-20251126.1`)
- **Release branch:** Uses clean versions (`1.1.1`)

Manual version changes can cause conflicts with the automated release process.

### If the Hook Fails

```
❌ ERROR: Invalid version format in package.json
   Current: 1.1.1
   Expected: X.Y.Z-YYYYMMDD.N (e.g., 1.1.1-20251126.1)
```

**Solution:** Revert the version change in `package.json` and let CI/CD handle it.

### Testing the Hook

```bash
# Test manually
.husky/pre-commit

# Expected output
✅ Version format valid: 1.1.0-20251126.1
```

### Bypassing the Hook (Not Recommended)

```bash
# Only use in emergencies
git commit --no-verify
```

## Setup

Hooks are automatically installed when you run:
```bash
bun install
```

This triggers the `prepare` script which configures Git to use `.husky` for hooks.
