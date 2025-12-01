# Requirements: Contextual Help System

## Overview

Implement flag-specific help using the pattern `secrets-sync <flag> --help` to provide detailed, contextual documentation without leaving the terminal.

---

## User Stories

### US-1: Get Detailed Flag Help

**As a** CLI user  
**I want to** run `secrets-sync --force --help`  
**So that** I can understand what `--force` does without reading the full help screen or external docs

**Acceptance Criteria:**

- Displays detailed help for `--force` flag only
- Exits without executing the sync command
- Shows description, usage examples, and related flags

---

### US-2: Understand Flag Differences

**As a** CLI user confused about similar flags  
**I want to** compare `--overwrite` vs `--skip-unchanged` behavior  
**So that** I can choose the correct flag for my use case

**Acceptance Criteria:**

- Each flag's help explains its specific purpose
- Help content includes "when to use" and "when not to use" guidance
- Related flags are cross-referenced

---

### US-3: Learn Flag Combinations

**As a** CI/CD engineer  
**I want to** understand which flags work together  
**So that** I can automate secrets sync safely

**Acceptance Criteria:**

- Help shows related flags that are commonly used together
- Examples demonstrate flag combinations
- Warns about incompatible flag combinations if applicable

---

### US-4: Discover Advanced Features

**As a** power user  
**I want to** explore all available flags and their options  
**So that** I can leverage advanced features

**Acceptance Criteria:**

- All documented flags have contextual help
- Help includes links to full documentation
- Configuration file options are explained

---

## Functional Requirements

### FR-1: Parse Contextual Help Pattern

**Requirement:** Detect `<flag> --help` pattern in CLI arguments  
**Verification:** Unit test confirms `['--force', '--help']` triggers contextual help  
**Priority:** P0 (Critical)

---

### FR-2: Display Flag-Specific Help

**Requirement:** Show detailed help for the specified flag only  
**Verification:** Integration test confirms `--force --help` outputs only `--force` documentation  
**Priority:** P0 (Critical)

---

### FR-3: Exit Without Execution

**Requirement:** Exit process after displaying contextual help without running sync  
**Verification:** Test confirms no config loading or file operations occur  
**Priority:** P0 (Critical)

---

### FR-4: Support All Documented Flags

**Requirement:** Provide contextual help for every flag in the main help screen  
**Verification:** Test iterates all flags and confirms help content exists  
**Priority:** P0 (Critical)

**Flags requiring help content:**

- `--env`
- `--dir`
- `--dry-run`
- `--overwrite`
- `--force` / `-f`
- `--skip-unchanged`
- `--no-confirm`
- `--fix-gitignore`
- `--verbose`
- `--help` / `-h`
- `--version` / `-v`

---

### FR-5: Support Flag Aliases

**Requirement:** Contextual help works with short flags (e.g., `-f --help`)  
**Verification:** Test confirms `-f --help` shows same output as `--force --help`  
**Priority:** P1 (High)

---

### FR-6: Maintain Existing Help Behavior

**Requirement:** `secrets-sync --help` continues to show full help screen  
**Verification:** Test confirms `--help` alone shows all flags  
**Priority:** P0 (Critical)

---

### FR-7: Handle Invalid Flags

**Requirement:** Show error for `--invalid-flag --help`  
**Verification:** Test confirms error message and non-zero exit code  
**Priority:** P2 (Medium)

---

## Technical Requirements

### TR-1: Extend Flag Parser

**Requirement:** Modify `parseFlags()` to detect `<flag> --help` pattern  
**Implementation:** Check if next argument after any flag is `--help` or `-h`  
**Verification:** Code review confirms parsing logic handles edge cases  
**Priority:** P0 (Critical)

---

### TR-2: Create Help Content Structure

**Requirement:** Define TypeScript interface for flag help metadata  
**Implementation:**

```typescript
interface FlagHelp {
  flag: string;
  aliases?: string[];
  description: string;
  usage: string[];
  whenToUse: string[];
  whenNotToUse?: string[];
  relatedFlags?: string[];
  docsUrl?: string;
}
```

**Verification:** Type checking passes, all flags conform to interface  
**Priority:** P0 (Critical)

---

### TR-3: Implement Help Renderer

**Requirement:** Create `printFlagHelp(flagName: string)` function  
**Implementation:** Format and display help content with consistent styling  
**Verification:** Visual inspection confirms readable output  
**Priority:** P0 (Critical)

---

### TR-4: Store Help Content

**Requirement:** Maintain help content for all flags  
**Implementation:** Inline TypeScript object in `src/help/flagHelp.ts` (new file)  
**Verification:** All flags have complete help content  
**Priority:** P0 (Critical)

---

### TR-5: Early Exit Pattern

**Requirement:** Exit before config loading when contextual help is triggered  
**Implementation:** Check for contextual help pattern immediately after parsing, before any config loading or file operations  
**Verification:** Test confirms no config warnings, no file system operations, no unnecessary logging  
**Priority:** P0 (Critical)

---

## Content Requirements

### CR-1: Description Field

**Requirement:** Each flag has a detailed description (2-3 sentences)  
**Verification:** Manual review confirms clarity and completeness  
**Priority:** P0 (Critical)

---

### CR-2: Usage Examples

**Requirement:** Each flag includes 2-3 practical usage examples  
**Verification:** Examples are valid CLI commands that can be executed with `--dry-run` (automated test)  
**Priority:** P0 (Critical)

---

### CR-3: When to Use Guidance

**Requirement:** Each flag lists 2-3 scenarios when it should be used  
**Verification:** Use cases are clear and actionable  
**Priority:** P0 (Critical)

---

### CR-4: When Not to Use Guidance

**Requirement:** Flags with potential misuse include "when not to use" section  
**Verification:** Warnings prevent common mistakes  
**Priority:** P1 (High)

---

### CR-5: Related Flags

**Requirement:** Each flag lists 2-4 related flags with brief context  
**Verification:** Cross-references are accurate and helpful  
**Priority:** P1 (High)

---

### CR-6: Documentation Links

**Requirement:** Each flag includes URL to full documentation  
**Verification:** Links are valid and point to correct sections (automated link checker)  
**Priority:** P1 (High)

---

## UX Requirements

### UX-1: Consistent Formatting

**Requirement:** All flag help uses identical structure and styling  
**Verification:** Visual inspection confirms consistency  
**Priority:** P1 (High)

---

### UX-2: Scannable Output

**Requirement:** Use emojis, colors, or formatting to improve readability  
**Verification:** User testing confirms quick comprehension  
**Priority:** P2 (Medium)

---

### UX-3: Concise Output

**Requirement:** Flag help should be concise (target: ~20 lines, avoid scrolling)  
**Verification:** Manual review confirms help is scannable without scrolling  
**Priority:** P2 (Medium - Guideline)

---

### UX-4: Clear Section Headers

**Requirement:** Help sections have clear labels (Description, Usage, When to use, etc.)  
**Verification:** Visual inspection confirms clarity  
**Priority:** P1 (High)

---

## Testing Requirements

### TEST-1: Unit Test - Parse Contextual Help

**Requirement:** Test `parseFlags()` detects `<flag> --help` pattern  
**Test Cases:**

- `['--force', '--help']` → triggers contextual help
- `['--help', '--force']` → shows full help (not contextual)
- `['-f', '-h']` → triggers contextual help
- `['--help']` → shows full help

**Verification:** All test cases pass  
**Priority:** P0 (Critical)

---

### TEST-2: Unit Test - Help Content Exists

**Requirement:** Verify all documented flags have help content  
**Test Cases:**

- Iterate all flags from main help screen
- Confirm each has entry in help content store
- Confirm each entry has required fields

**Verification:** Test passes for all flags  
**Priority:** P0 (Critical)

---

### TEST-3: Integration Test - Help Output

**Requirement:** Test actual help output for each flag  
**Test Cases:**

- `--force --help` outputs expected content
- `-f --help` outputs same content
- Output includes all required sections

**Verification:** Snapshot tests or string matching  
**Priority:** P0 (Critical)

---

### TEST-4: Integration Test - No Execution

**Requirement:** Confirm contextual help exits without running sync  
**Test Cases:**

- Mock config loader
- Run `--force --help`
- Verify config loader never called

**Verification:** Mock assertions pass  
**Priority:** P0 (Critical)

---

### TEST-5: Integration Test - Fallback Behavior

**Requirement:** Test fallback for flags without help content  
**Test Cases:**

- `--env --help` (before Phase 2) shows fallback message + full help
- Exit code is 0 (not an error)
- Fallback message is clear and helpful

**Verification:** Test assertions pass  
**Priority:** P1 (High)

---

### TEST-6: E2E Test - User Workflow

**Requirement:** Test complete user workflow  
**Test Cases:**

- User runs `secrets-sync --overwrite --help`
- Reads output
- Runs actual command with correct flags

**Verification:** Manual testing confirms smooth experience  
**Priority:** P2 (Medium)

---

### TEST-7: Integration Test - Usage Examples

**Requirement:** Verify all usage examples are valid commands  
**Test Cases:**

- Extract all usage examples from help content
- Execute each with `--dry-run` flag
- Verify exit code is 0 (valid command)

**Verification:** Automated test passes for all examples  
**Priority:** P1 (High)

---

### TEST-8: Integration Test - Documentation Links

**Requirement:** Verify all documentation links are valid  
**Test Cases:**

- Extract all docsUrl values from help content
- Check each URL is reachable (HTTP 200)
- Verify URLs point to correct sections

**Verification:** Automated link checker passes  
**Priority:** P1 (High)

---

### TEST-9: Manual Test - Emoji Rendering

**Requirement:** Verify emojis render correctly in target terminals  
**Test Cases:**

- Test in iTerm2
- Test in Terminal.app
- Test in VS Code integrated terminal

**Verification:** Visual confirmation emojis display correctly  
**Priority:** P2 (Medium)

---

## Documentation Requirements

### DOC-1: Update README

**Requirement:** Add contextual help section to README  
**Content:**

- Explain `<flag> --help` pattern
- Show 1-2 examples
- Link to full flag documentation

**Verification:** README review confirms clarity  
**Priority:** P1 (High)

---

### DOC-2: Update USAGE.md

**Requirement:** Document contextual help in usage guide  
**Content:**

- Detailed explanation of feature
- Examples for all flags
- Best practices

**Verification:** Documentation review  
**Priority:** P1 (High)

---

### DOC-3: Update CHANGELOG

**Requirement:** Add feature to changelog  
**Content:**

- Feature description
- Usage examples
- Breaking changes (none expected)

**Verification:** Changelog follows format  
**Priority:** P1 (High)

---

## Non-Functional Requirements

### NFR-1: Maintainability

**Requirement:** Adding help for new flags requires <5 minutes  
**Verification:** Developer experience feedback  
**Priority:** P1 (High)

---

### NFR-2: Backward Compatibility

**Requirement:** No breaking changes to existing CLI behavior  
**Verification:** All existing tests pass  
**Priority:** P0 (Critical)

---

### NFR-3: Accessibility

**Requirement:** Help output is readable in all terminal types  
**Verification:** Test in multiple terminals (iTerm, Terminal.app, VS Code)  
**Priority:** P2 (Medium)

---

## Out of Scope

- Interactive help browser
- Man page generation
- Multi-language support
- Help search functionality
- Configuration file help (future enhancement)
- Performance testing (help is fast enough by design)

---

## Dependencies

- Existing `parseFlags()` function in `src/secrets-sync.ts`
- Existing `printHelp()` function as reference
- No external dependencies required

---

## Success Metrics

### Quantitative

- 100% of documented flags have contextual help
- Help output <20 lines per flag
- Zero breaking changes to existing behavior
- All tests pass
- No unnecessary logging when displaying help

### Qualitative

- Users report faster onboarding
- Reduced questions about flag usage in issues
- Positive feedback on help clarity

---

## Implementation Phases

### Phase 1: Core Functionality (P0)

- FR-1: Parse contextual help pattern
- FR-2: Display flag-specific help
- FR-3: Exit without execution
- TR-1: Extend flag parser
- TR-2: Create help content structure
- TR-3: Implement help renderer

### Phase 2: Content & Testing (P0-P1)

- FR-4: Support all documented flags
- FR-5: Support flag aliases
- TR-4: Store help content
- TEST-1 through TEST-5
- TEST-7: Usage example validation
- TEST-8: Link validation

### Phase 3: Polish & Documentation (P1-P2)

- UX requirements
- Documentation requirements
- TEST-6: User workflow
- TEST-9: Emoji rendering

---

## Acceptance Checklist

- [ ] All P0 functional requirements implemented
- [ ] All P0 technical requirements implemented
- [ ] All P0 test requirements passing
- [ ] Help content exists for all documented flags
- [ ] No breaking changes to existing behavior
- [ ] No unnecessary logging when displaying help
- [ ] README updated with feature documentation
- [ ] CHANGELOG updated
- [ ] Code review completed
- [ ] Manual testing in multiple terminals
