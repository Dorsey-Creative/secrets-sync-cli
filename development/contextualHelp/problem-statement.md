# Problem Statement: Contextual Help System

## Problem

Users cannot get detailed help about specific CLI flags without reading the entire help screen or consulting external documentation. When a user wants to understand what `--force` does or how `--overwrite` differs from `--skip-unchanged`, they must:

1. Read the full `--help` output (all flags listed)
2. Consult the README on GitHub
3. Trial-and-error with `--dry-run`

This creates friction and slows down adoption, especially for flags with nuanced behavior like `--force` vs `--overwrite`.

### Current State

**Existing help system:**
- Single `--help` screen shows all flags with one-line descriptions
- No way to get detailed information about a specific flag
- No examples or use cases for individual flags
- No explanation of flag interactions (e.g., `--overwrite` + `--no-confirm`)

**Example of current limitation:**
```bash
$ secrets-sync --help
# Shows ALL flags with brief descriptions
# User must parse entire output to find --force info
# No detailed explanation of when/why to use --force
```

### What Users Need

Users need **contextual help** - detailed information about a specific flag exactly when they need it:

```bash
$ secrets-sync --force --help
# Shows ONLY detailed help about --force
# Includes examples, use cases, related flags
# Exits without running the command
```

## Proposed Solution

Implement a **contextual help system** that detects `--help` after any flag and displays detailed, flag-specific documentation.

### User Experience

**Pattern:** `secrets-sync <flag> --help`

**Example 1: Understanding --force**
```bash
$ secrets-sync --force --help

🔐 Help: --force, -f

Use prefixes for production files instead of layering.

Description:
  By default, multiple production files (.env, .env.prod) are layered
  with .env as canonical. The --force flag changes this behavior to
  use prefixes (e.g., PROD_SECRET_KEY) for additional production files.

Usage:
  secrets-sync --force --dry-run
  secrets-sync --force --env production

When to use:
  ✓ You want explicit prefixes for production overrides
  ✓ You need to distinguish between .env and .env.prod secrets
  ✗ Don't use if you want layered overrides (default behavior)

Related flags:
  --overwrite    Apply all changes without prompts
  --dry-run      Preview changes before applying

Documentation: https://github.com/Dorsey-Creative/secrets-sync-cli#force-flag
```

**Example 2: Clarifying --overwrite vs --skip-unchanged**
```bash
$ secrets-sync --overwrite --help

🔐 Help: --overwrite

Apply all changes without prompts.

Description:
  Skips interactive confirmation prompts and applies all planned
  changes automatically. Useful for CI/CD pipelines and automation.

Usage:
  secrets-sync --overwrite --dry-run        # Preview first
  secrets-sync --overwrite --no-confirm     # Non-interactive mode

When to use:
  ✓ CI/CD pipelines (automated deployments)
  ✓ Batch updates across multiple environments
  ✓ When you trust the diff output

Difference from --skip-unchanged:
  --overwrite       Applies ALL changes without prompts
  --skip-unchanged  Skips secrets with matching hashes (optimization)

Related flags:
  --no-confirm       Non-interactive mode (requires --overwrite)
  --dry-run          Preview changes first (recommended)
  --skip-unchanged   Skip unchanged secrets

Documentation: https://github.com/Dorsey-Creative/secrets-sync-cli#overwrite
```

**Example 3: Configuration help**
```bash
$ secrets-sync --config --help

🔐 Help: Configuration File

Load CLI defaults from env-config.yml

Description:
  Place env-config.yml in your project root to set default values
  for flags and configure tool behavior.

Location:
  ./env-config.yml (project root)

Example configuration:
  flags:
    skipUnchanged: true
    backupRetention: 5
  
  skipSecrets:
    - DEBUG
    - LOCAL_ONLY_VAR

Available options:
  flags.skipUnchanged    Skip secrets with matching hashes
  flags.backupRetention  Number of backups to keep (default: 3)
  skipSecrets            Array of secret names to skip

Documentation: https://github.com/Dorsey-Creative/secrets-sync-cli#configuration
```

## End-User Success Criteria

When this feature is complete, users should be able to:

1. **Get instant help for any flag:**
   ```bash
   secrets-sync --force --help
   secrets-sync --env --help
   secrets-sync --dry-run --help
   ```

2. **Understand flag behavior without leaving the terminal:**
   - No need to open browser/README
   - No need to read full help output
   - Contextual examples right in the CLI

3. **Learn flag interactions and best practices:**
   - See related flags
   - Understand when to use vs when not to use
   - Get practical examples

4. **Discover advanced features:**
   - Configuration file options
   - Environment variables
   - Hidden/debugging flags

5. **Reduce trial-and-error:**
   - Clear use cases
   - Common pitfalls explained
   - Recommended flag combinations

## Existing Infrastructure to Leverage

**Current help system:**
- `printHelp()` function in `src/secrets-sync.ts` (line 303)
- `--help` flag parsing in `parseFlags()` (line 372)
- Early exit pattern already implemented (line 1008)

**Modifications needed:**
1. Extend `parseFlags()` to detect `<flag> --help` pattern
2. Create `printFlagHelp(flagName: string)` function
3. Add help content for each flag (can be inline or separate file)
4. Maintain existing `--help` behavior (show all flags)

**No breaking changes:**
- `secrets-sync --help` still shows full help
- New pattern: `secrets-sync <flag> --help` shows contextual help
- Backward compatible

## Technical Considerations

### Flag Help Content Structure
```typescript
interface FlagHelp {
  flag: string;
  aliases?: string[];
  description: string;
  usage: string[];
  whenToUse: string[];
  whenNotToUse?: string[];
  relatedFlags?: string[];
  examples?: string[];
  docsUrl?: string;
}
```

### Parsing Strategy
```typescript
// Detect: secrets-sync --force --help
function parseFlags(argv: string[]): Flags {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    
    if (next === '--help' || next === '-h') {
      // Show contextual help for 'arg'
      printFlagHelp(arg);
      process.exit(0);
    }
    // ... existing parsing logic
  }
}
```

### Help Content Storage
**Option 1:** Inline object (simple, fast)
```typescript
const FLAG_HELP: Record<string, FlagHelp> = {
  '--force': { ... },
  '--overwrite': { ... },
  // ...
};
```

**Option 2:** Separate JSON file (maintainable, translatable)
```json
// src/help/flags.json
{
  "--force": { ... },
  "--overwrite": { ... }
}
```

**Recommendation:** Start with inline object, migrate to JSON if help content grows large.

## Acceptance Criteria

### Functional Requirements
- [ ] `secrets-sync <flag> --help` shows detailed help for that flag
- [ ] Works with all documented flags (--env, --dir, --dry-run, etc.)
- [ ] Works with flag aliases (--help, -h)
- [ ] Exits without running the command
- [ ] Maintains existing `--help` behavior (show all flags)

### Content Requirements
- [ ] Each flag has detailed description
- [ ] Usage examples provided
- [ ] "When to use" guidance included
- [ ] Related flags listed
- [ ] Link to documentation included

### UX Requirements
- [ ] Help output is formatted and readable
- [ ] Uses emojis/colors for scannability
- [ ] Consistent format across all flags
- [ ] No more than 20 lines per flag help

### Testing Requirements
- [ ] Unit tests for flag help parsing
- [ ] Integration tests for help output
- [ ] Test all flags have help content
- [ ] Test invalid flag shows error

## Out of Scope

- **Interactive help browser** - Keep it simple, text-based
- **Man pages** - Focus on CLI-native help
- **Translations** - English only for now
- **Help for configuration file options** - Phase 2 feature
- **Search functionality** - Not needed for small flag set

## Success Metrics

**User behavior:**
- Reduced GitHub issue questions about flag usage
- Fewer README page views (help is self-contained)
- Faster onboarding (users don't leave terminal)

**Developer experience:**
- Easy to add help for new flags
- Consistent help format enforced
- Help content co-located with flag logic

## Related Issues

- None yet (new feature)

## Priority

**Medium** - Quality of life improvement that reduces friction and improves discoverability without blocking core functionality.

## Estimated Effort

- **Design:** 30 minutes (help content structure)
- **Implementation:** 2 hours (parsing + help function + content)
- **Testing:** 1 hour (unit + integration tests)
- **Documentation:** 30 minutes (README update)
- **Total:** ~4 hours
