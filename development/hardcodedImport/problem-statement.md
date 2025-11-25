# Problem Statement: Hardcoded Import Path

**Issue:** #1  
**Date:** 2025-11-24  
**Status:** Planning

---

## Problem Description

The CLI tool has a hardcoded import statement that references a file path relative to the source code location:

```typescript
import requiredSecretsRaw from '../config/env/required-secrets.json' assert { type: 'json' };
```

This creates **three critical failures**:

### 1. Build Failure
The build process fails because the path `../config/env/required-secrets.json` doesn't exist relative to the source file during compilation:
```
error: Could not resolve: "../config/env/required-secrets.json"
```

### 2. Package Installation Failure
When users install the package via npm/bun/yarn, the compiled code will reference a path that doesn't exist in their `node_modules` directory. The `config/env/` directory is not included in the package distribution.

### 3. Runtime Configuration Inflexibility
Users cannot customize their required secrets configuration because the path is hardcoded into the compiled binary. The tool expects the file to exist at a fixed location relative to the source code, not the user's project.

---

## Current Behavior

1. Source code imports JSON file using relative path
2. Build fails because path doesn't resolve during compilation
3. Even if build succeeded, installed package would fail at runtime
4. Users have no way to provide their own required secrets configuration

---

## Root Cause

The tool is trying to use a **compile-time import** for what should be a **runtime configuration file**. The `required-secrets.json` file is:
- User-specific configuration (should live in user's project)
- Not part of the package distribution
- Should be loaded dynamically at runtime, not bundled at compile time

---

## End-User Success Criteria

Once this issue is resolved, users should be able to:

### ✅ Install the Package
```bash
npm install @dorsey-creative/secrets-sync
# Installation completes without errors
```

### ✅ Run the CLI Tool
```bash
secrets-sync --help
# Tool runs successfully, shows help text
```

### ✅ Use Default Configuration
```bash
secrets-sync --dry-run
# Tool runs with sensible defaults if no required-secrets.json exists
# No validation errors, just warnings about missing optional config
```

### ✅ Provide Custom Required Secrets
```bash
# User creates config/env/required-secrets.json in their project
secrets-sync --dry-run
# Tool loads and validates against user's required secrets
```

### ✅ Build from Source
```bash
git clone https://github.com/Dorsey-Creative/secrets-sync-cli.git
cd secrets-sync-cli
bun install
bun run build
# Build completes successfully, creates dist/secrets-sync.js
```

### ✅ Develop Locally
```bash
bun run dev -- --help
# Development mode works without requiring config/env/ to exist
```

---

## Technical Requirements

### 1. Dynamic Loading
- Replace compile-time import with runtime file loading
- Use `readFileSync` or similar to load JSON at runtime
- Handle file not found gracefully

### 2. Configurable Path
- Allow users to specify config location via CLI flag or environment variable
- Default to `config/env/required-secrets.json` in user's project root
- Fall back to empty/default configuration if file doesn't exist

### 3. Graceful Degradation
- Tool should work without required-secrets.json
- Validation should be optional, not required for basic operations
- Provide clear warnings when config is missing but continue execution

### 4. Package Distribution
- Ensure build process doesn't require config files to exist
- Don't bundle user configuration into the package
- Include example configuration in package for reference

---

## Proposed Solution Approach

### Option A: Runtime Loading with Defaults (Recommended)
```typescript
function loadRequiredSecrets(configDir: string): RequiredSecretConfig {
  const configPath = join(configDir, 'required-secrets.json');
  
  if (!existsSync(configPath)) {
    logWarn('No required-secrets.json found, skipping validation');
    return { production: [], shared: [], staging: [] };
  }
  
  try {
    const raw = readFileSync(configPath, 'utf8');
    return JSON.parse(raw) as RequiredSecretConfig;
  } catch (e) {
    logWarn(`Failed to load required-secrets.json: ${e.message}`);
    return { production: [], shared: [], staging: [] };
  }
}
```

### Option B: Make Validation Opt-In
- Remove required secrets validation from core flow
- Add `--validate-required` flag to enable validation
- Only load config when validation is explicitly requested

### Option C: Embed Defaults, Allow Override
- Include minimal default configuration in source
- Allow users to override with their own config file
- Merge user config with defaults

---

## Success Metrics

- [ ] Build completes without errors
- [ ] Package installs successfully via npm
- [ ] CLI runs without config file present
- [ ] CLI loads and uses config file when present
- [ ] Clear error messages when config is malformed
- [ ] Documentation updated with configuration instructions
- [ ] Tests cover all loading scenarios (missing, invalid, valid)

---

## Impact Assessment

**Severity:** Critical - Blocks all usage of the tool  
**Affected Users:** All users (100%)  
**Workaround:** None - tool cannot be built or installed  
**Dependencies:** Blocks issues #2, #3, #4 (build, tests, distribution)

---

## Related Issues

- #2 - Add TypeScript configuration (needs working build)
- #3 - Implement comprehensive test suite (needs working build)
- #4 - Fix build configuration (related to this issue)
- #8 - Add comprehensive validation (validation should be optional)

---

## Notes

- This is the highest priority issue - nothing else can be tested until build works
- Solution should maintain backward compatibility with existing config format
- Consider making validation entirely optional for simpler use cases
- Example config should be included in package for user reference
