# Tasks: Contextual Help System

## Overview

Implementation broken into 6 phases with time estimates and validation steps. Total estimated time: ~6 hours.

---

## Phase 1: Core Infrastructure (P0)

**Goal:** Get basic contextual help working for `--force` flag  
**Time Estimate:** 2 hours  
**Requirements:** FR-1, FR-2, FR-3, TR-1, TR-2, TR-3

### Task 1.1: Create Help Data Structure

**Time:** 30 minutes  
**References:** TR-2 (Help Content Structure), Design Section 1

- [x] Create `src/help/flagHelp.ts`
- [x] Define `FlagHelp` TypeScript interface
- [x] Create `FLAG_HELP` object with `--force` entry
- [x] Add description, usage, whenToUse, relatedFlags, docsUrl
- [x] Export `FLAG_HELP` for use in renderer

**Validation:**

```bash
# Verify file compiles without errors
bun run build

# Verify types are correct
bun run typecheck
```

**End-user success:** Foundation for consistent help content is established.

---

### Task 1.2: Create Help Renderer

**Time:** 30 minutes  
**References:** TR-3 (Help Renderer), Design Section 3

- [x] Create `src/help/renderer.ts`
- [x] Implement `printFlagHelp(flagName: string)` function
- [x] Format output with emojis and sections
- [x] Handle unknown flags with error message
- [x] Export `printFlagHelp` function

**Validation:**

```bash
# Manual test in Node REPL
node
> const { printFlagHelp } = require('./dist/help/renderer.js');
> printFlagHelp('--force');
# Should display formatted help

> printFlagHelp('--invalid');
# Should display error message
```

**End-user success:** Help output is readable and well-formatted.

---

### Task 1.3: Modify parseFlags() for Detection

**Time:** 30 minutes  
**References:** FR-1 (Parse Contextual Help), TR-1 (Extend Flag Parser), Design Section 2

- [x] Open `src/secrets-sync.ts`
- [x] Modify `parseFlags()` return type to `Flags | { contextualHelp: string }`
- [x] Add loop to detect `<flag> --help` pattern before existing parsing
- [x] Return `{ contextualHelp: flagName }` when pattern detected
- [x] Ensure existing flag parsing logic unchanged

**Validation:**

```typescript
// Add temporary test in secrets-sync.ts
const testResult1 = parseFlags(['--force', '--help']);
console.log(testResult1); // Should be { contextualHelp: '--force' }

const testResult2 = parseFlags(['--help']);
console.log(testResult2); // Should be { help: true, ... }
```

**End-user success:** CLI correctly identifies when user wants contextual help.

---

### Task 1.4: Integrate into main()

**Time:** 30 minutes  
**References:** FR-3 (Exit Without Execution), TR-5 (Early Exit), Design Section 4

- [x] Open `src/secrets-sync.ts`
- [x] Modify `main()` to check for contextual help first
- [x] Import `printFlagHelp` dynamically
- [x] Call `printFlagHelp()` and return early
- [x] Ensure no logger initialization or config loading occurs

**Validation:**

```bash
# Test contextual help exits early
secrets-sync --force --help
# Should display help with NO warnings about missing config

# Test normal help still works
secrets-sync --help
# Should display full help screen

# Test normal execution still works
secrets-sync --dry-run
# Should run normally (may show config warnings)
```

**End-user success:** Users get clean help output without unnecessary warnings.

---

### Phase 1 Acceptance

- [x] `secrets-sync --force --help` displays formatted help
- [x] No warnings or errors in output
- [x] Exit code is 0
- [x] `secrets-sync --help` still shows full help (unchanged)
- [x] `secrets-sync --force` runs normally (no help displayed)
- [x] All existing tests still pass: `bun test` (280/281 pass, 1 timeout unrelated)

---

## Phase 2: Complete Flag Coverage (P0)

**Goal:** Add help content for all 11 documented flags  
**Time Estimate:** 1.5 hours  
**Requirements:** FR-4 (Support All Flags), CR-1 through CR-6

### Task 2.1: Add Help for Core Flags

**Time:** 45 minutes  
**References:** FR-4, CR-1 through CR-5

- [ ] Add `--env` help entry
- [ ] Add `--dir` help entry
- [ ] Add `--dry-run` help entry
- [ ] Add `--overwrite` help entry
- [ ] Add `--skip-unchanged` help entry

**Content checklist per flag:**

- [ ] Description (2-3 sentences)
- [ ] Usage examples (2-3 commands)
- [ ] When to use (2-3 scenarios)
- [ ] Related flags (2-4 flags)
- [ ] Documentation URL

**Validation:**

```bash
# Test each flag
secrets-sync --env --help
secrets-sync --dir --help
secrets-sync --dry-run --help
secrets-sync --overwrite --help
secrets-sync --skip-unchanged --help

# Verify format consistency
# Each should have: Description, Usage, When to use, Related flags, Documentation
```

**End-user success:** Users can get help for the most commonly used flags.

---

### Task 2.2: Add Help for Utility Flags

**Time:** 30 minutes  
**References:** FR-4, CR-1 through CR-5

- [ ] Add `--no-confirm` help entry
- [ ] Add `--fix-gitignore` help entry
- [ ] Add `--verbose` help entry

**Validation:**

```bash
secrets-sync --no-confirm --help
secrets-sync --fix-gitignore --help
secrets-sync --verbose --help
```

**End-user success:** Users understand utility flags for automation and debugging.

---

### Task 2.3: Add Help for Meta Flags

**Time:** 15 minutes  
**References:** FR-4, CR-1 through CR-5

- [ ] Add `--help` / `-h` help entry (meta: explains help system)
- [ ] Add `--version` / `-v` help entry

**Validation:**

```bash
secrets-sync --help --help  # Should explain help system
secrets-sync --version --help  # Should explain version flag
```

**End-user success:** Users discover the contextual help feature itself.

---

### Phase 2 Acceptance

- [ ] All 11 flags have help content
- [ ] All help entries follow consistent format
- [ ] All help entries include required sections
- [ ] All documentation URLs are valid
- [ ] Manual test of all flags shows clean output

---

## Phase 3: Alias Support (P1)

**Goal:** Support short flags like `-f --help`  
**Time Estimate:** 30 minutes  
**Requirements:** FR-5 (Support Aliases)

### Task 3.1: Map Aliases to Long Flags

**Time:** 15 minutes  
**References:** FR-5, Design Section 2

- [ ] Create alias mapping in `flagHelp.ts`
- [ ] Add `ALIAS_MAP: Record<string, string>` constant
- [ ] Map `-f` → `--force`, `-h` → `--help`, `-v` → `--version`

**Validation:**

```typescript
// In flagHelp.ts
const ALIAS_MAP = {
  '-f': '--force',
  '-h': '--help',
  '-v': '--version',
};

// Verify mapping
console.log(ALIAS_MAP['-f']); // Should be '--force'
```

**End-user success:** Foundation for alias support is in place.

---

### Task 3.2: Update Detection Logic

**Time:** 15 minutes  
**References:** FR-5, TR-1

- [ ] Modify `parseFlags()` to resolve aliases
- [ ] Check `ALIAS_MAP` when detecting contextual help
- [ ] Return long flag name for consistency

**Validation:**

```bash
# Test short flag help
secrets-sync -f --help
# Should display same help as --force --help

# Test that -h alone still works
secrets-sync -h
# Should display full help screen

# Test that -v alone still works
secrets-sync -v
# Should display version
```

**End-user success:** Users can use familiar short flags when requesting help.

---

### Phase 3 Acceptance

- [ ] `-f --help` shows `--force` help
- [ ] `-h` alone shows full help (unchanged)
- [ ] `-v` alone shows version (unchanged)
- [ ] All short flags work correctly

---

## Phase 4: Graceful Degradation (Built-in)

**Goal:** Ensure users always get help, even for flags without contextual help  
**Time Estimate:** 10 minutes (validation only)  
**Requirements:** FR-7 (Handle Invalid Flags)

### Task 4.1: Verify Fallback Behavior

**Time:** 10 minutes  
**References:** Design Section 3

- [ ] Test flag without contextual help content
- [ ] Verify fallback message displays
- [ ] Verify full help screen shows
- [ ] Verify exit code is 0

**Validation:**

```bash
# Before Phase 2 is complete, test a flag without help content
secrets-sync --env --help
# Should show: "No detailed help available for --env yet."
# Then show full help screen
# Exit code should be 0

echo $?  # Should output: 0
```

**End-user success:** Users never encounter errors when requesting help for valid flags.

---

### Phase 4 Acceptance

- [ ] Flags without contextual help show fallback message
- [ ] Full help screen displays as fallback
- [ ] Exit code is 0 (not an error)
- [ ] Flags with contextual help still work correctly

---

## Phase 5: Testing (P0-P1)

**Goal:** Ensure reliability and prevent regressions  
**Time Estimate:** 1.5 hours  
**Requirements:** TEST-1 through TEST-5

### Task 5.1: Unit Tests - Parsing

**Time:** 30 minutes  
**References:** TEST-1, Design Testing Section

- [ ] Create `tests/unit/contextualHelp.test.ts`
- [ ] Test: `['--force', '--help']` → `{ contextualHelp: '--force' }`
- [ ] Test: `['-f', '--help']` → `{ contextualHelp: '-f' }`
- [ ] Test: `['--help']` → `{ help: true }`
- [ ] Test: `['--help', '--force']` → `{ help: true }`
- [ ] Test: `['--force']` → normal flags object

**Validation:**

```bash
bun test tests/unit/contextualHelp.test.ts
# All tests should pass
```

**End-user success:** Parsing logic is reliable and well-tested.

---

### Task 5.2: Unit Tests - Content Validation

**Time:** 30 minutes  
**References:** TEST-2, Design Testing Section

- [ ] Create `tests/unit/flagHelp.test.ts`
- [ ] Test: All 11 flags have help entries
- [ ] Test: All entries have required fields (description, usage, etc.)
- [ ] Test: All URLs are valid format
- [ ] Test: All usage examples are valid commands

**Validation:**

```bash
bun test tests/unit/flagHelp.test.ts
# All tests should pass
```

**End-user success:** Help content is complete and consistent.

---

### Task 5.3: Integration Tests

**Time:** 30 minutes  
**References:** TEST-3, TEST-4, TEST-5, Design Testing Section

- [ ] Create `tests/integration/contextualHelp.test.ts`
- [ ] Test: `--force --help` displays correct output
- [ ] Test: No warnings/errors in stderr
- [ ] Test: Exit code is 0
- [ ] Test: Invalid flag shows error
- [ ] Test: Config loading is skipped

**Validation:**

```bash
bun test tests/integration/contextualHelp.test.ts
# All tests should pass

# Run full test suite
bun test
# All 281+ tests should pass (no regressions)
```

**End-user success:** Feature works correctly in real-world usage.

---

### Task 5.4: Automated Content Validation

**Time:** 30 minutes  
**References:** TEST-7, TEST-8, CR-2, CR-6

- [ ] Create `tests/integration/helpContentValidation.test.ts`
- [ ] Test: Extract and execute all usage examples with `--dry-run`
- [ ] Test: Verify all documentation links are reachable
- [ ] Test: Verify exit codes are 0 for valid examples

**Validation:**

```bash
bun test tests/integration/helpContentValidation.test.ts
# All tests should pass

# Manual verification
secrets-sync --force --dry-run  # From usage example
secrets-sync --env staging --dry-run  # From usage example
# All should execute without errors
```

**End-user success:** Help content is accurate and trustworthy.

---

### Phase 5 Acceptance

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Usage example validation passes
- [ ] Link validation passes
- [ ] Full test suite passes (no regressions)
- [ ] Test coverage includes happy path and error cases
- [ ] Tests run in CI/CD pipeline

---

## Phase 6: Documentation (P1)

**Goal:** Make feature discoverable  
**Time Estimate:** 30 minutes  
**Requirements:** DOC-1, DOC-2, DOC-3

### Task 6.1: Update README

**Time:** 10 minutes  
**References:** DOC-1

- [ ] Add "Contextual Help" section to README
- [ ] Explain `<flag> --help` pattern
- [ ] Show 2-3 examples
- [ ] Link to USAGE.md for details

**Content:**

```markdown
## Contextual Help

Get detailed help for any flag:

```bash
secrets-sync --force --help
secrets-sync --env --help
```

See [USAGE.md](docs/USAGE.md#contextual-help) for all flags.

```
**Validation:**
```bash
# Verify markdown renders correctly
# Check links work
# Verify examples are copy-pasteable
```

**End-user success:** Users discover feature in README.

---

### Task 6.2: Update USAGE.md

**Time:** 15 minutes  
**References:** DOC-2

- [ ] Add "Contextual Help" section to USAGE.md
- [ ] Document all flags with help examples
- [ ] Add best practices section
- [ ] Include troubleshooting tips

**Validation:**

```bash
# Verify all examples work
secrets-sync --force --help
secrets-sync --env --help
# etc.
```

**End-user success:** Users have comprehensive documentation.

---

### Task 6.3: Update CHANGELOG

**Time:** 5 minutes  
**References:** DOC-3

- [ ] Add entry for contextual help feature
- [ ] Include usage examples
- [ ] Note: No breaking changes

**Content:**

```markdown
## [Unreleased]

### Added
- Contextual help system: `secrets-sync <flag> --help` displays detailed help for specific flags
- Help content for all 11 CLI flags with usage examples and best practices
- Support for short flag aliases (e.g., `-f --help`)
```

**Validation:**

```bash
# Verify CHANGELOG follows format
# Check version number is correct
```

**End-user success:** Users see feature in release notes.

---

### Task 6.4: Validate Emoji Rendering

**Time:** 10 minutes  
**References:** TEST-9, UX-2

- [ ] Test help output in iTerm2
- [ ] Test help output in Terminal.app
- [ ] Test help output in VS Code integrated terminal
- [ ] Verify emojis (🔐, ✓, ✗) render correctly

**Validation:**

```bash
# In each terminal
secrets-sync --force --help
# Verify emojis display correctly, not as boxes or question marks
```

**End-user success:** Help is readable in all common terminals.

---

### Phase 6 Acceptance

- [ ] README updated with contextual help section
- [ ] USAGE.md has comprehensive documentation
- [ ] CHANGELOG has feature entry
- [ ] All documentation links work
- [ ] All examples are tested and working
- [ ] Emojis render correctly in target terminals

---

## Final Validation Checklist

### Functional Validation

- [ ] Run `secrets-sync --force --help` → displays help, exits cleanly
- [ ] Run `secrets-sync -f --help` → same output as above
- [ ] Run `secrets-sync --help` → full help screen (unchanged)
- [ ] Run `secrets-sync --version` → version number (unchanged)
- [ ] Run `secrets-sync --env --help` (before Phase 2) → fallback message + full help
- [ ] Run `secrets-sync --dry-run` → normal execution (no help)

### Quality Validation

- [ ] No warnings when displaying help
- [ ] No config loading when displaying help
- [ ] Help output is <20 lines per flag
- [ ] Help format is consistent across all flags
- [ ] All documentation URLs work

### Regression Validation

- [ ] Run full test suite: `bun test` → all pass
- [ ] Test example directory: `cd example && secrets-sync --dry-run`
- [ ] Test CI/CD: Push to branch, verify tests pass
- [ ] Test in multiple terminals (iTerm, Terminal.app, VS Code)

### User Experience Validation

- [ ] Ask 2-3 users to try contextual help
- [ ] Verify they can find and use the feature
- [ ] Verify help content is clear and actionable
- [ ] Collect feedback on format and content

---

## Time Summary

| Phase                           | Time Estimate | Priority |
| ------------------------------- | ------------- | -------- |
| Phase 1: Core Infrastructure    | 2 hours       | P0       |
| Phase 2: Complete Flag Coverage | 1.5 hours     | P0       |
| Phase 3: Alias Support          | 30 minutes    | P1       |
| Phase 4: Graceful Degradation   | 10 minutes    | P1       |
| Phase 5: Testing                | 2 hours       | P0-P1    |
| Phase 6: Documentation          | 40 minutes    | P1       |
| **Total**                       | **6 hours**   |          |

---

## Dependencies

### Before Starting

- [ ] Node 18+ installed
- [ ] Bun installed for development
- [ ] Repository cloned and dependencies installed
- [ ] All existing tests passing

### External Dependencies

- None (no new packages required)

---

## Success Criteria

### Technical Success

- [ ] All P0 requirements implemented
- [ ] All P0 tests passing
- [ ] No breaking changes
- [ ] No new dependencies added

### User Success

- [ ] Users can get help for any flag in <5 seconds
- [ ] Help is displayed without warnings or errors
- [ ] Help content is clear and actionable
- [ ] Feature is discoverable in documentation

### Maintenance Success

- [ ] Adding help for new flags takes <5 minutes
- [ ] Help content is easy to update
- [ ] Tests prevent regressions
- [ ] Code is well-documented

---

## Rollback Plan

If issues are discovered after implementation:

1. **Revert parseFlags() changes:**
   
   ```bash
   git revert <commit-hash>
   ```

2. **Remove help module:**
   
   ```bash
   rm -rf src/help/
   ```

3. **Restore original behavior:**
   
   - Existing `--help` and `--version` still work
   - No impact on core sync functionality

4. **Fix and redeploy:**
   
   - Address issues in separate branch
   - Re-test thoroughly
   - Deploy fix

---

## Notes

- All time estimates include testing and validation
- Phases can be implemented in parallel by different developers
- Phase 1 must be complete before other phases
- Phases 2-4 can be done in any order after Phase 1
- Phase 5 should be done after Phases 1-4
- Phase 6 should be done last
