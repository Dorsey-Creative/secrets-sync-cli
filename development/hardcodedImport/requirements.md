# Requirements: Dynamic Required Secrets Loading

**Issue:** #1  
**Date:** 2025-11-24  
**Solution:** Option A - Runtime Loading with Defaults

---

## User Stories

### US-1: Package Installation

**As a** developer  
**I want to** install the secrets-sync package via npm/bun/yarn  
**So that** I can use the CLI tool in my project without build errors

**Acceptance Criteria:**

- Package installs without errors
- No missing file errors during installation
- Tool is available in PATH after installation

---

### US-2: Basic CLI Usage Without Configuration

**As a** developer  
**I want to** run the CLI tool without providing a required-secrets.json file  
**So that** I can use basic features without complex setup

**Acceptance Criteria:**

- Tool runs successfully when config file is missing
- Warning message indicates config file not found
- Tool continues execution with default empty configuration
- No fatal errors or crashes

---

### US-3: Custom Required Secrets Configuration

**As a** developer  
**I want to** provide my own required-secrets.json configuration  
**So that** I can validate my project's specific secret requirements

**Acceptance Criteria:**

- Tool detects and loads config file from project root
- Config file is parsed correctly
- Validation runs against loaded configuration
- Invalid JSON produces clear error message

---

### US-4: Build from Source

**As a** contributor  
**I want to** build the project from source  
**So that** I can develop and test changes locally

**Acceptance Criteria:**

- Build completes without file resolution errors
- Compiled output is executable
- Build doesn't require config files to exist
- Development mode works without config

---

## Functional Requirements

### FR-1: Dynamic Configuration Loading

**Priority:** Critical  
**Requirement:** The system shall load required-secrets.json at runtime, not compile-time

**Verification Method:** Code inspection, build test  
**Test Case:** Build succeeds without config file present

---

### FR-2: Default Configuration Fallback

**Priority:** Critical  
**Requirement:** The system shall use empty default configuration when required-secrets.json is not found

**Verification Method:** Unit test  
**Test Case:** Function returns `{ production: [], shared: [], staging: [] }` when file missing

---

### FR-3: Configuration File Discovery

**Priority:** High  
**Requirement:** The system shall search for required-secrets.json in the user's project config directory

**Verification Method:** Integration test  
**Test Case:** Tool finds config at `config/env/required-secrets.json` relative to project root

---

### FR-4: Graceful Error Handling

**Priority:** High  
**Requirement:** The system shall continue execution when config file is missing or invalid

**Verification Method:** Integration test  
**Test Case:** Tool runs successfully with missing config, logs warning, continues

---

### FR-5: JSON Parsing with Error Recovery

**Priority:** High  
**Requirement:** The system shall catch and handle JSON parsing errors gracefully

**Verification Method:** Unit test  
**Test Case:** Invalid JSON produces warning message and returns default config

---

### FR-6: Warning Messages for Missing Config

**Priority:** Medium  
**Requirement:** The system shall log a warning when required-secrets.json is not found

**Verification Method:** Integration test  
**Test Case:** Console output contains "[WARN] No required-secrets.json found"

---

### FR-7: Warning Messages for Invalid Config

**Priority:** Medium  
**Requirement:** The system shall log a warning when required-secrets.json cannot be parsed

**Verification Method:** Integration test  
**Test Case:** Console output contains "[WARN] Failed to load required-secrets.json: {error}"

---

### FR-8: Configuration Type Safety

**Priority:** Medium  
**Requirement:** The system shall validate loaded configuration matches RequiredSecretConfig type

**Verification Method:** Unit test  
**Test Case:** Type assertion succeeds for valid config structure

---

## Technical Requirements

### TR-1: Remove Compile-Time Import

**Priority:** Critical  
**Requirement:** Remove the hardcoded import statement from line 17 of secrets-sync.ts

**Implementation:**

```typescript
// REMOVE:
import requiredSecretsRaw from '../config/env/required-secrets.json' assert { type: 'json' };
```

**Verification Method:** Code inspection  
**Test Case:** No import statements reference required-secrets.json

---

### TR-2: Implement loadRequiredSecrets Function

**Priority:** Critical  
**Requirement:** Create function to load configuration at runtime

**Implementation:**

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
    logWarn(`Failed to load required-secrets.json: ${(e as Error).message}`);
    return { production: [], shared: [], staging: [] };
  }
}
```

**Verification Method:** Unit test  
**Test Cases:**

- Returns default config when file missing
- Returns parsed config when file valid
- Returns default config when JSON invalid
- Logs warning for missing file
- Logs warning for invalid JSON

---

### TR-3: Update REQUIRED_SECRETS Initialization

**Priority:** Critical  
**Requirement:** Replace static initialization with function call

**Implementation:**

```typescript
// REPLACE:
const REQUIRED_SECRETS = requiredSecretsRaw as RequiredSecretConfig;

// WITH (inside main function):
const REQUIRED_SECRETS = loadRequiredSecrets(dir);
```

**Verification Method:** Code inspection, integration test  
**Test Case:** REQUIRED_SECRETS is populated from runtime loading

---

### TR-4: Update REQUIRED_PROD_KEYS Initialization

**Priority:** High  
**Requirement:** Move REQUIRED_PROD_KEYS initialization to runtime

**Implementation:**

```typescript
// MOVE from global scope to inside main() after loadRequiredSecrets call
const REQUIRED_PROD_KEYS: string[] = Array.isArray(REQUIRED_SECRETS.production) 
  ? [...REQUIRED_SECRETS.production] 
  : [];
```

**Verification Method:** Code inspection  
**Test Case:** Variable is initialized after config loading

---

### TR-5: Maintain Backward Compatibility

**Priority:** High  
**Requirement:** Configuration file format shall remain unchanged

**Verification Method:** Integration test  
**Test Case:** Existing required-secrets.json files work without modification

---

### TR-6: Build Process Independence

**Priority:** Critical  
**Requirement:** Build process shall not require config files to exist

**Verification Method:** Build test  
**Test Case:** `bun run build` succeeds in clean repository

---

### TR-7: Development Mode Support

**Priority:** High  
**Requirement:** Development mode shall work without config files

**Verification Method:** Manual test  
**Test Case:** `bun run dev -- --help` succeeds without config directory

---

### TR-8: Path Resolution

**Priority:** High  
**Requirement:** Config path shall resolve relative to user's project root, not package location

**Verification Method:** Integration test  
**Test Case:** Tool finds config in user's project, not in node_modules

---

## Non-Functional Requirements

### NFR-1: Error Message Clarity

**Requirement:** Error messages shall clearly indicate the problem and suggest solutions

**Verification Method:** Manual review  
**Test Case:** Error messages are understandable to non-expert users

---

### NFR-2: Error Message Format

**Requirement:** Configuration-related warning messages shall use consistent [CONFIG] prefix for easier filtering

**Verification Method:** Unit test, code inspection  
**Test Case:** All config warnings include [CONFIG] prefix

---

### NFR-3: Logging Consistency

**Requirement:** Warning messages shall use existing logging infrastructure (logWarn), not console.warn

**Verification Method:** Unit test  
**Test Case:** loadRequiredSecrets uses logWarn(), not console.warn()

---

### NFR-4: Code Maintainability

**Requirement:** New function shall follow existing code style and patterns

**Verification Method:** Code review  
**Test Case:** Function matches style of other utility functions in codebase
**Test Case:** Function matches style of other utility functions in codebase

---

## Test Requirements

### Test-1: Unit Test - Missing Config File

**Requirement:** Test loadRequiredSecrets with non-existent file

**Test Case:**

```typescript
test('loadRequiredSecrets returns default when file missing', () => {
  const result = loadRequiredSecrets('/nonexistent/path');
  expect(result).toEqual({ production: [], shared: [], staging: [] });
});
```

---

### Test-2: Unit Test - Valid Config File

**Requirement:** Test loadRequiredSecrets with valid JSON

**Test Case:**

```typescript
test('loadRequiredSecrets parses valid config', () => {
  // Create temp file with valid JSON
  const result = loadRequiredSecrets(tempDir);
  expect(result.production).toContain('PROD_SECRET');
});
```

---

### Test-3: Unit Test - Invalid JSON

**Requirement:** Test loadRequiredSecrets with malformed JSON

**Test Case:**

```typescript
test('loadRequiredSecrets handles invalid JSON', () => {
  // Create temp file with invalid JSON
  const result = loadRequiredSecrets(tempDir);
  expect(result).toEqual({ production: [], shared: [], staging: [] });
});
```

---

### Test-4: Integration Test - Build Success

**Requirement:** Verify build completes without config files

**Test Case:**

```bash
rm -rf config/
bun run build
# Exit code should be 0
```

---

### Test-5: Integration Test - CLI Runs Without Config

**Requirement:** Verify CLI executes with missing config

**Test Case:**

```bash
rm -rf config/
./dist/secrets-sync.js --help
# Should display help, exit code 0
```

---

### Test-6: Integration Test - Warning Logged

**Requirement:** Verify warning appears when config missing

**Test Case:**

```bash
rm -rf config/
./dist/secrets-sync.js --dry-run 2>&1 | grep "No required-secrets.json found"
# Should find warning message
```

---

### Test-7: Integration Test - Config Loaded

**Requirement:** Verify config is loaded when present

**Test Case:**

```bash
# Create config with known values
./dist/secrets-sync.js --dry-run
# Validation should run against config values
```

---

## Acceptance Criteria Breakdown

### AC-1: Package Installation Success

- **AC-1.1:** `npm install @dorsey-creative/secrets-sync` exits with code 0
- **AC-1.2:** No error messages appear during installation
- **AC-1.3:** `secrets-sync` command is available in PATH after install

**Verification:** Manual installation test in clean environment

---

### AC-2: CLI Execution Without Config

- **AC-2.1:** `secrets-sync --help` exits with code 0
- **AC-2.2:** Help text is displayed correctly
- **AC-2.3:** No fatal errors or stack traces appear

**Verification:** Integration test

---

### AC-3: Default Configuration Behavior

- **AC-3.1:** Tool runs when config file is missing
- **AC-3.2:** Warning message "[WARN] No required-secrets.json found" appears
- **AC-3.3:** Validation is skipped (no validation errors)
- **AC-3.4:** Other features continue to work normally

**Verification:** Integration test with assertions on output

---

### AC-4: Custom Configuration Loading

- **AC-4.1:** Tool detects config at `config/env/required-secrets.json`
- **AC-4.2:** JSON is parsed successfully
- **AC-4.3:** Validation runs using loaded configuration
- **AC-4.4:** Required secrets are enforced per config

**Verification:** Integration test with sample config

---

### AC-5: Invalid Configuration Handling

- **AC-5.1:** Malformed JSON produces warning message
- **AC-5.2:** Warning includes error details
- **AC-5.3:** Tool continues with default configuration
- **AC-5.4:** No crashes or unhandled exceptions

**Verification:** Integration test with invalid JSON file

---

### AC-6: Build from Source Success

- **AC-6.1:** `bun run build` exits with code 0
- **AC-6.2:** `dist/secrets-sync.js` file is created
- **AC-6.3:** Output file is executable
- **AC-6.4:** No file resolution errors during build

**Verification:** CI/CD pipeline test

---

### AC-7: Development Mode Success

- **AC-7.1:** `bun run dev -- --help` exits with code 0
- **AC-7.2:** Works without config directory present
- **AC-7.3:** No import errors or missing file errors

**Verification:** Manual test in development environment

---

## Dependencies

### Internal Dependencies

- Existing `logWarn()` function for warning messages
- Existing `join()` from node:path for path construction
- Existing `existsSync()` and `readFileSync()` from node:fs

### External Dependencies

- None (uses only Node.js built-ins)

---

## Risks and Mitigations

### Risk-1: Breaking Changes for Existing Users

**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:** Configuration file format remains unchanged; only loading mechanism changes

---

### Risk-2: Path Resolution Issues

**Likelihood:** Medium  
**Impact:** High  
**Mitigation:** Thorough testing across different project structures and installation methods

---

### Risk-3: Performance Degradation

**Likelihood:** Low  
**Impact:** Low  
**Mitigation:** File I/O is minimal and only happens once at startup

---

## Success Metrics

- [ ] All 7 test requirements pass
- [ ] All 7 acceptance criteria verified
- [ ] Build succeeds in CI/CD pipeline
- [ ] Package installs successfully via npm
- [ ] Zero regression bugs reported
- [ ] Documentation updated
- [ ] Code review approved

---

## Out of Scope

- Configuration file format changes
- Additional configuration sources (env vars, CLI flags)
- Configuration validation beyond JSON parsing
- Configuration file generation or scaffolding
- Migration tools for existing configurations

---

## Implementation Checklist

- [ ] Remove hardcoded import (TR-1)
- [ ] Implement loadRequiredSecrets function (TR-2)
- [ ] Update REQUIRED_SECRETS initialization (TR-3)
- [ ] Update REQUIRED_PROD_KEYS initialization (TR-4)
- [ ] Write unit tests (Test-1, Test-2, Test-3)
- [ ] Write integration tests (Test-4, Test-5, Test-6, Test-7)
- [ ] Verify all acceptance criteria (AC-1 through AC-7)
- [ ] Update documentation
- [ ] Code review
- [ ] Merge to develop branch
