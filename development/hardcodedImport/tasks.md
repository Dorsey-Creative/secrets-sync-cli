# Implementation Tasks: Dynamic Required Secrets Loading

**Issue:** #1  
**Branch:** `1-fix-hardcoded-import-path-for-required-secretsjson`  
**Estimated Total Time:** 5-6.5 hours

---

## Phase 1: Core Implementation (Critical Path)

**Goal:** Make build work and tool runnable  
**Time Estimate:** 1-2 hours  
**Requirements:** TR-1, TR-2, TR-3, TR-4, FR-1  
**Design:** Section "Phase 1: Core Implementation"

---

### Task 1.1: Remove Hardcoded Import
**Time:** 5 minutes  
**Requirement:** TR-1

- [x] Open `src/secrets-sync.ts`
- [x] Locate line 17: `import requiredSecretsRaw from '../config/env/required-secrets.json' assert { type: 'json' };`
- [x] Delete the import statement
- [x] Save file

**Validation:**
```bash
# Technical: No import errors
grep -n "required-secrets.json" src/secrets-sync.ts
# Should return no results

# End-User: Build no longer fails on import
bun run build 2>&1 | grep "Could not resolve"
# Should return no results
```

**End-User Success:** Build process can now proceed past import resolution.

---

### Task 1.2: Implement loadRequiredSecrets Function
**Time:** 30 minutes  
**Requirement:** TR-2, FR-2, FR-4, FR-5, NFR-2

- [x] Open `src/secrets-sync.ts`
- [x] Find location after `RequiredSecretConfig` type definition (around line 60)
- [x] Add the following function:

```typescript
/**
 * Load required secrets configuration from user's project
 * @param configDir - Directory containing required-secrets.json
 * @returns Parsed configuration or default empty config
 */
function loadRequiredSecrets(configDir: string): RequiredSecretConfig {
  const configPath = join(configDir, 'required-secrets.json');
  
  // Check if file exists
  if (!existsSync(configPath)) {
    logWarn('[CONFIG] No required-secrets.json found, skipping validation');
    return { production: [], shared: [], staging: [] };
  }
  
  // Attempt to read and parse
  try {
    const raw = readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw) as RequiredSecretConfig;
    logInfo(`[CONFIG] Loaded required secrets from ${configPath}`);
    return config;
  } catch (e) {
    logWarn(`[CONFIG] Failed to load required-secrets.json: ${(e as Error).message}`);
    return { production: [], shared: [], staging: [] };
  }
}
```

- [x] Verify imports are available (`join`, `existsSync`, `readFileSync`)
- [x] Save file

**Validation:**
```bash
# Technical: Function exists and compiles
grep -A 20 "function loadRequiredSecrets" src/secrets-sync.ts
# Should show the function

# End-User: Function handles missing config gracefully
# (Will test in integration phase)
```

**End-User Success:** Tool can now load config at runtime without crashing.

---

### Task 1.3: Update REQUIRED_SECRETS Initialization
**Time:** 15 minutes  
**Requirement:** TR-3

- [x] Open `src/secrets-sync.ts`
- [x] Find line 63: `const REQUIRED_SECRETS = requiredSecretsRaw as RequiredSecretConfig;`
- [x] Delete this line (it's in global scope)
- [x] Locate the `main()` function
- [x] Find where `dir` variable is set (after flag parsing)
- [x] Add after `const dir = flags.dir ?? DEFAULTS.dir;`:

```typescript
  // Load required secrets configuration at runtime
  const REQUIRED_SECRETS = loadRequiredSecrets(dir);
```

- [x] Save file

**Validation:**
```bash
# Technical: Variable moved to main function
grep -n "const REQUIRED_SECRETS" src/secrets-sync.ts
# Should show line inside main() function, not global scope

# End-User: Config loads from user's project directory
# (Will test in integration phase)
```

**End-User Success:** Config path respects user's `--dir` flag.

---

### Task 1.4: Update REQUIRED_PROD_KEYS Initialization
**Time:** 10 minutes  
**Requirement:** TR-4

- [x] Open `src/secrets-sync.ts`
- [x] Find line 481: `const REQUIRED_PROD_KEYS: string[] = Array.isArray(REQUIRED_SECRETS.production) ? [...REQUIRED_SECRETS.production] : [];`
- [x] Delete this line (it's in global scope)
- [x] In `main()` function, add after the `REQUIRED_SECRETS` initialization:

```typescript
  const REQUIRED_PROD_KEYS: string[] = Array.isArray(REQUIRED_SECRETS.production) 
    ? [...REQUIRED_SECRETS.production] 
    : [];
```

- [x] Save file

**Validation:**
```bash
# Technical: Variable moved to main function
grep -n "const REQUIRED_PROD_KEYS" src/secrets-sync.ts
# Should show line inside main() function

# End-User: Validation uses runtime-loaded config
# (Will test in integration phase)
```

**End-User Success:** Validation rules come from user's config, not hardcoded values.

---

### Task 1.5: Verify Build Success
**Time:** 10 minutes  
**Requirement:** TR-6, AC-6

- [x] Clean previous build artifacts:
```bash
rm -rf dist/
```

- [x] Run build:
```bash
bun run build
```

- [x] Verify exit code is 0
- [x] Verify `dist/secrets-sync.js` exists
- [x] Check file is executable:
```bash
ls -l dist/secrets-sync.js
```

**Validation:**
```bash
# Technical: Build succeeds
bun run build
echo "Exit code: $?"
# Should output: Exit code: 0

# Technical: Output file created
test -f dist/secrets-sync.js && echo "File exists" || echo "File missing"
# Should output: File exists

# End-User: Can build package for distribution
bun run build && echo "✅ Package can be built"
```

**End-User Success:** Package can now be built and distributed to npm.

---

### Phase 1 Validation Checklist

- [x] Build completes without errors
- [x] No import resolution errors
- [x] dist/secrets-sync.js created
- [x] File is executable
- [x] No TypeScript errors
- [x] Code compiles successfully

**End-User Success:** Users can now install the package via npm.

---

## Phase 2: Error Handling & Robustness

**Goal:** Handle all error cases gracefully  
**Time Estimate:** 1 hour  
**Requirements:** FR-4, FR-5, FR-6, FR-7, NFR-2  
**Design:** Section "Phase 2: Error Handling"

---

### Task 2.1: Test Missing Config File Scenario
**Time:** 15 minutes  
**Requirement:** FR-2, FR-6, AC-3

- [ ] Remove config directory:
```bash
rm -rf config/
```

- [ ] Run CLI help command:
```bash
./dist/secrets-sync.js --help
```

- [ ] Verify exit code is 0
- [ ] Verify help text displays
- [ ] Check for warning message

**Validation:**
```bash
# End-User: Tool works without config
rm -rf config/
./dist/secrets-sync.js --help > /tmp/output.txt 2>&1
EXIT_CODE=$?

# Should succeed
test $EXIT_CODE -eq 0 && echo "✅ Tool runs without config"

# Should show help
grep -q "Usage:" /tmp/output.txt && echo "✅ Help text displayed"

# Should warn about missing config with [CONFIG] prefix
grep -q "\[CONFIG\] No required-secrets.json found" /tmp/output.txt && echo "✅ Warning shown"
```

**End-User Success:** New users can run tool immediately after install.

---

### Task 2.2: Test Invalid JSON Scenario
**Time:** 15 minutes  
**Requirement:** FR-5, FR-7, AC-5

- [ ] Create config directory:
```bash
mkdir -p config/env
```

- [ ] Write invalid JSON:
```bash
echo "{ invalid json }" > config/env/required-secrets.json
```

- [ ] Run CLI:
```bash
./dist/secrets-sync.js --help 2>&1 | tee /tmp/output.txt
```

- [ ] Verify exit code is 0
- [ ] Verify warning message appears
- [ ] Verify tool continues execution

**Validation:**
```bash
# End-User: Tool handles bad config gracefully
mkdir -p config/env
echo "not valid json" > config/env/required-secrets.json
./dist/secrets-sync.js --help > /tmp/output.txt 2>&1
EXIT_CODE=$?

# Should not crash
test $EXIT_CODE -eq 0 && echo "✅ Tool doesn't crash on bad config"

# Should show warning with error details and [CONFIG] prefix
grep -q "\[CONFIG\] Failed to load required-secrets.json" /tmp/output.txt && echo "✅ Error message shown"

# Should still work
grep -q "Usage:" /tmp/output.txt && echo "✅ Tool continues working"
```

**End-User Success:** Users can't break tool with malformed config.

---

### Task 2.3: Test Valid Config Scenario
**Time:** 15 minutes  
**Requirement:** FR-3, FR-8, AC-4

- [ ] Create valid config:
```bash
mkdir -p config/env
cat > config/env/required-secrets.json << 'EOF'
{
  "production": ["TEST_SECRET_1", "TEST_SECRET_2"],
  "shared": ["SHARED_SECRET"],
  "staging": []
}
EOF
```

- [ ] Run CLI:
```bash
./dist/secrets-sync.js --dry-run 2>&1 | tee /tmp/output.txt
```

- [ ] Verify config loaded message appears
- [ ] Verify no errors

**Validation:**
```bash
# End-User: Tool loads and uses custom config
mkdir -p config/env
cat > config/env/required-secrets.json << 'EOF'
{
  "production": ["MY_API_KEY"],
  "shared": [],
  "staging": []
}
EOF

./dist/secrets-sync.js --dry-run > /tmp/output.txt 2>&1

# Should load config with [CONFIG] prefix
grep -q "\[CONFIG\] Loaded required secrets" /tmp/output.txt && echo "✅ Config loaded"

# Should not show missing config warning
! grep -q "No required-secrets.json found" /tmp/output.txt && echo "✅ No warning for valid config"
```

**End-User Success:** Users can customize validation rules via config file.

---

### Task 2.4: Test Permission Denied Scenario
**Time:** 15 minutes  
**Requirement:** FR-4, FR-7

- [ ] Create config with no read permissions:
```bash
mkdir -p config/env
echo '{"production":[]}' > config/env/required-secrets.json
chmod 000 config/env/required-secrets.json
```

- [ ] Run CLI:
```bash
./dist/secrets-sync.js --help 2>&1 | tee /tmp/output.txt
```

- [ ] Verify tool doesn't crash
- [ ] Verify warning message
- [ ] Restore permissions:
```bash
chmod 644 config/env/required-secrets.json
```

**Validation:**
```bash
# End-User: Tool handles permission errors
mkdir -p config/env
echo '{"production":[]}' > config/env/required-secrets.json
chmod 000 config/env/required-secrets.json

./dist/secrets-sync.js --help > /tmp/output.txt 2>&1
EXIT_CODE=$?

# Should not crash
test $EXIT_CODE -eq 0 && echo "✅ Tool handles permission errors"

# Should show error with [CONFIG] prefix
grep -q "\[CONFIG\] Failed to load" /tmp/output.txt && echo "✅ Permission error handled"

# Cleanup
chmod 644 config/env/required-secrets.json
```

**End-User Success:** Tool provides clear error when config isn't readable.

---

### Phase 2 Validation Checklist

- [ ] Tool runs with missing config
- [ ] Tool runs with invalid JSON
- [ ] Tool runs with valid config
- [ ] Tool handles permission errors
- [ ] All warnings are clear and helpful
- [ ] No crashes or unhandled exceptions

**End-User Success:** Tool is resilient and provides helpful feedback.

---

## Phase 3: Automated Testing

**Goal:** Comprehensive test coverage  
**Time Estimate:** 3-3.5 hours  
**Requirements:** Test-1 through Test-7, AC-4.4, TR-8, NFR-2, NFR-3  
**Design:** Section "Testing Strategy"

---

### Task 3.1: Create Test Directory Structure
**Time:** 5 minutes

- [ ] Create test directories:
```bash
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/fixtures
```

- [ ] Create fixture config:
```bash
cat > tests/fixtures/valid-config.json << 'EOF'
{
  "production": ["PROD_SECRET"],
  "shared": ["SHARED_SECRET"],
  "staging": ["STAGING_SECRET"]
}
EOF
```

**Validation:**
```bash
# Technical: Structure exists
test -d tests/unit && test -d tests/integration && echo "✅ Test structure created"
```

---

### Task 3.2: Write Unit Tests for loadRequiredSecrets
**Time:** 60 minutes  
**Requirement:** Test-1, Test-2, Test-3, NFR-2, NFR-3

- [ ] Create `tests/unit/config-loader.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

// Import function to test (will need to export it)
// For now, we'll test via CLI execution

describe("loadRequiredSecrets", () => {
  const testDir = "/tmp/secrets-sync-test";
  
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });
  
  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });
  
  test("returns default config when file missing", async () => {
    // Test via CLI since function is not exported
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--help"
    ]);
    
    const output = new TextDecoder().decode(proc.stderr);
    expect(output).toContain("[CONFIG] No required-secrets.json found");
    expect(proc.exitCode).toBe(0);
  });
  
  test("loads valid config successfully", async () => {
    const configPath = join(testDir, "required-secrets.json");
    writeFileSync(configPath, JSON.stringify({
      production: ["TEST_SECRET"],
      shared: [],
      staging: []
    }));
    
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--help"
    ]);
    
    const output = new TextDecoder().decode(proc.stderr);
    expect(output).toContain("[CONFIG] Loaded required secrets");
    expect(proc.exitCode).toBe(0);
  });
  
  test("handles invalid JSON gracefully", async () => {
    const configPath = join(testDir, "required-secrets.json");
    writeFileSync(configPath, "invalid json content");
    
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--help"
    ]);
    
    const output = new TextDecoder().decode(proc.stderr);
    expect(output).toContain("[CONFIG] Failed to load required-secrets.json");
    expect(proc.exitCode).toBe(0);
  });
  
  test("uses [CONFIG] prefix for all config warnings (NFR-2)", async () => {
    // Test missing config
    const proc1 = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--help"
    ]);
    const output1 = new TextDecoder().decode(proc1.stderr);
    expect(output1).toMatch(/\[CONFIG\]/);
    
    // Test invalid JSON
    writeFileSync(join(testDir, "required-secrets.json"), "bad json");
    const proc2 = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--help"
    ]);
    const output2 = new TextDecoder().decode(proc2.stderr);
    expect(output2).toMatch(/\[CONFIG\]/);
  });
  
  test("loads existing example config format (backward compatibility)", async () => {
    // Copy example config if it exists
    const examplePath = "examples/required-secrets.example.json";
    if (existsSync(examplePath)) {
      const exampleContent = require("node:fs").readFileSync(examplePath, "utf8");
      // Remove comment line if present
      const cleanContent = exampleContent.replace(/"_comment":[^,]*,?\s*/g, "");
      writeFileSync(join(testDir, "required-secrets.json"), cleanContent);
      
      const proc = Bun.spawnSync([
        "./dist/secrets-sync.js",
        "--dir", testDir,
        "--help"
      ]);
      
      expect(proc.exitCode).toBe(0);
      const output = new TextDecoder().decode(proc.stderr);
      expect(output).toContain("[CONFIG] Loaded required secrets");
    }
  });
});
```

- [ ] Save file
- [ ] Run tests:
```bash
bun test tests/unit/config-loader.test.ts
```

**Validation:**
```bash
# Technical: Tests pass
bun test tests/unit/config-loader.test.ts
# All tests should pass

# End-User: Confidence in reliability
echo "✅ Unit tests verify config loading works correctly"

# End-User: Error messages are consistent
echo "✅ [CONFIG] prefix helps users filter config-related messages"

# End-User: Backward compatibility maintained
echo "✅ Existing config files continue to work"
```

**End-User Success:** High confidence that config loading is reliable.

---

### Task 3.3: Write Integration Tests for CLI
**Time:** 60 minutes  
**Requirement:** Test-4, Test-5, Test-6, Test-7, AC-4.4

- [ ] Create `tests/integration/cli-execution.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("CLI Execution", () => {
  const testDir = "/tmp/secrets-sync-cli-test";
  
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });
  
  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });
  
  test("runs help without config directory", () => {
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--help"
    ]);
    
    expect(proc.exitCode).toBe(0);
    const output = new TextDecoder().decode(proc.stdout);
    expect(output).toContain("Usage:");
  });
  
  test("runs dry-run without config", () => {
    mkdirSync(testDir, { recursive: true });
    
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--dry-run"
    ]);
    
    const stderr = new TextDecoder().decode(proc.stderr);
    expect(stderr).toContain("[CONFIG] No required-secrets.json found");
    expect(proc.exitCode).toBe(0);
  });
  
  test("loads config when present", () => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(
      join(testDir, "required-secrets.json"),
      JSON.stringify({
        production: ["TEST_KEY"],
        shared: [],
        staging: []
      })
    );
    
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--dry-run"
    ]);
    
    const stderr = new TextDecoder().decode(proc.stderr);
    expect(stderr).toContain("[CONFIG] Loaded required secrets");
  });
  
  test("loads config from custom directory via --dir flag", () => {
    const customDir = "/tmp/custom-secrets-config";
    mkdirSync(customDir, { recursive: true });
    writeFileSync(
      join(customDir, "required-secrets.json"),
      JSON.stringify({
        production: ["CUSTOM_SECRET"],
        shared: [],
        staging: []
      })
    );
    
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", customDir,
      "--dry-run"
    ]);
    
    const stderr = new TextDecoder().decode(proc.stderr);
    expect(stderr).toContain("[CONFIG] Loaded required secrets");
    expect(proc.exitCode).toBe(0);
    
    rmSync(customDir, { recursive: true });
  });
  
  test("enforces required secrets from config", () => {
    mkdirSync(testDir, { recursive: true });
    
    // Create config requiring specific secret
    writeFileSync(
      join(testDir, "required-secrets.json"),
      JSON.stringify({
        production: ["MUST_HAVE_SECRET"],
        shared: [],
        staging: []
      })
    );
    
    // Create .env without required secret
    writeFileSync(
      join(testDir, ".env"),
      "OTHER_SECRET=value\n"
    );
    
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--dry-run"
    ]);
    
    const output = new TextDecoder().decode(proc.stdout) + 
                   new TextDecoder().decode(proc.stderr);
    
    // Should report missing required secret
    expect(output).toContain("MUST_HAVE_SECRET");
  });
});
```

- [ ] Save file
- [ ] Run tests:
```bash
bun test tests/integration/cli-execution.test.ts
```

**Validation:**
```bash
# Technical: Integration tests pass
bun test tests/integration/cli-execution.test.ts
# All tests should pass

# End-User: Real-world scenarios verified
echo "✅ Integration tests verify actual CLI usage works"

# End-User: Custom directory flag works
echo "✅ Users can specify custom config location with --dir"

# End-User: Validation enforcement works
echo "✅ Required secrets are enforced when config present"
```

**End-User Success:** Confidence that real-world usage scenarios work, including custom config locations and validation enforcement.

---

### Task 3.4: Run Full Test Suite
**Time:** 10 minutes

- [ ] Run all tests:
```bash
bun test
```

- [ ] Verify all tests pass
- [ ] Check test coverage (if available)
- [ ] Fix any failing tests

**Validation:**
```bash
# Technical: All tests pass
bun test 2>&1 | tee /tmp/test-results.txt
grep -q "0 fail" /tmp/test-results.txt && echo "✅ All tests passing"

# End-User: Quality assurance complete
echo "✅ Comprehensive testing ensures reliability for users"
```

**End-User Success:** Users receive well-tested, reliable software.

---

### Task 3.5: Update Test Script in package.json
**Time:** 5 minutes

- [ ] Verify test script exists:
```json
"test": "bun test"
```

- [ ] Add test:watch if not present:
```json
"test:watch": "bun test --watch"
```

**Validation:**
```bash
# Technical: Test commands work
bun run test
# Should run all tests

# End-User: Contributors can easily run tests
echo "✅ Test infrastructure ready for contributors"
```

---

### Phase 3 Validation Checklist

- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] All test scenarios covered
- [ ] Test coverage > 80% (if measurable)
- [ ] Tests run in CI/CD (future)
- [ ] Test documentation clear

**End-User Success:** Users receive thoroughly tested, reliable software.

---

## Phase 4: Documentation & Polish

**Goal:** Clear guidance for users  
**Time Estimate:** 1 hour  
**Requirements:** NFR-2, AC-1 through AC-7  
**Design:** Section "Phase 4: Documentation"

---

### Task 4.1: Update README - Configuration Section
**Time:** 20 minutes

- [ ] Open `README.md`
- [ ] Find or create "Configuration" section
- [ ] Add configuration documentation:

```markdown
### Configuration

Create `config/env/required-secrets.json` to validate required secrets:

\`\`\`json
{
  "shared": ["API_KEY", "DATABASE_URL"],
  "production": ["PROD_SECRET"],
  "staging": ["STAGING_SECRET"]
}
\`\`\`

**Optional:** The tool works without this file. Add it when you need validation.

**Location:** Place in `config/env/` relative to your project root, or specify with `--dir` flag.
```

- [ ] Save file

**Validation:**
```bash
# End-User: Documentation is clear
grep -A 10 "Configuration" README.md
# Should show new section

# End-User: Users know config is optional
grep -q "Optional" README.md && echo "✅ Users know config is optional"
```

**End-User Success:** Users understand how to configure the tool.

---

### Task 4.2: Add Troubleshooting Section
**Time:** 15 minutes

- [ ] Add to README.md:

```markdown
## Troubleshooting

### "[CONFIG] No required-secrets.json found"
This is a warning, not an error. The tool works without this file. Create it only if you need validation.

### "[CONFIG] Failed to load required-secrets.json"
Check that your JSON is valid:
\`\`\`bash
cat config/env/required-secrets.json | jq .
\`\`\`

### Build fails with "Could not resolve"
This was fixed in version 1.0.1. Update to latest version:
\`\`\`bash
npm install @dorsey-creative/secrets-sync@latest
\`\`\`
```

- [ ] Save file

**Validation:**
```bash
# End-User: Common issues documented
grep -q "Troubleshooting" README.md && echo "✅ Troubleshooting guide added"

# End-User: Solutions are actionable
grep -q "jq" README.md && echo "✅ Concrete solutions provided"

# End-User: Version number helps users know when fix was released
grep -q "1.0.1" README.md && echo "✅ Version number documented"
```

**End-User Success:** Users can self-serve when encountering issues.

---

### Task 4.3: Update CHANGELOG
**Time:** 10 minutes

- [ ] Open `CHANGELOG.md`
- [ ] Add entry for this fix:

```markdown
## [1.0.1] - 2025-11-24

### Fixed
- Fixed hardcoded import path that prevented package installation (#1)
- Configuration now loads at runtime instead of compile-time
- Tool works without required-secrets.json (validation is optional)

### Changed
- Required secrets configuration is now optional
- Improved error messages for missing or invalid configuration
```

- [ ] Save file

**Validation:**
```bash
# End-User: Release notes clear
grep -A 5 "\[1.0.1\]" CHANGELOG.md
# Should show new entry

# End-User: Users understand what changed
echo "✅ Changelog documents user-facing changes"
```

**End-User Success:** Users understand what changed and why to upgrade.

---

### Task 4.4: Update Example Config
**Time:** 5 minutes

- [ ] Verify `examples/required-secrets.example.json` exists
- [ ] Add comment to example:

```json
{
  "_comment": "This file is OPTIONAL. The tool works without it. Add it to enable validation.",
  "shared": [
    "API_KEY",
    "DATABASE_URL"
  ],
  "production": [
    "PROD_SECRET",
    "MAILGUN_API_KEY"
  ],
  "staging": [
    "STAGING_SECRET"
  ]
}
```

- [ ] Save file

**Validation:**
```bash
# End-User: Example shows config is optional
grep -q "OPTIONAL" examples/required-secrets.example.json && echo "✅ Example clarifies optional nature"
```

**End-User Success:** Users have clear example to follow.

---

### Task 4.5: Test Installation Flow
**Time:** 10 minutes

- [ ] Create clean test directory:
```bash
mkdir -p /tmp/test-install
cd /tmp/test-install
```

- [ ] Initialize npm project:
```bash
npm init -y
```

- [ ] Install from local build:
```bash
npm install /path/to/secrets-sync-cli
```

- [ ] Test CLI:
```bash
npx secrets-sync --help
```

- [ ] Verify it works without config
- [ ] Clean up:
```bash
cd -
rm -rf /tmp/test-install
```

**Validation:**
```bash
# End-User: Installation works
mkdir -p /tmp/test-install
cd /tmp/test-install
npm init -y
npm install /path/to/secrets-sync-cli
npx secrets-sync --help > /tmp/install-test.txt 2>&1
EXIT_CODE=$?

test $EXIT_CODE -eq 0 && echo "✅ Package installs and runs successfully"
grep -q "Usage:" /tmp/install-test.txt && echo "✅ CLI works after install"

cd -
rm -rf /tmp/test-install
```

**End-User Success:** Users can install and use package immediately.

---

### Phase 4 Validation Checklist

- [ ] README updated with configuration docs
- [ ] Troubleshooting section added
- [ ] CHANGELOG updated
- [ ] Example config updated
- [ ] Installation flow tested
- [ ] All documentation clear and accurate

**End-User Success:** Users can successfully install, configure, and troubleshoot.

---

## Final Validation: End-to-End User Journey

**Time:** 15 minutes  
**Goal:** Simulate complete user experience

### Journey 1: New User (No Config)

```bash
# Step 1: Install
npm install @dorsey-creative/secrets-sync

# Step 2: Run immediately
npx secrets-sync --help
# ✅ Should work, show help

# Step 3: Try dry-run
npx secrets-sync --dry-run
# ✅ Should work, show warning about missing config

# Step 4: Verify no crashes
echo $?
# ✅ Should be 0
```

**Expected:** User can use tool immediately without setup.

---

### Journey 2: User Adds Config

```bash
# Step 1: Create config
mkdir -p config/env
cat > config/env/required-secrets.json << 'EOF'
{
  "production": ["MY_SECRET"],
  "shared": [],
  "staging": []
}
EOF

# Step 2: Run with config
npx secrets-sync --dry-run
# ✅ Should load config, run validation

# Step 3: Verify config loaded
# ✅ Should see "Loaded required secrets" message
```

**Expected:** User can add config and validation works.

---

### Journey 3: User Has Bad Config

```bash
# Step 1: Break config
echo "bad json" > config/env/required-secrets.json

# Step 2: Run tool
npx secrets-sync --help
# ✅ Should show warning, still work

# Step 3: Fix config
cat > config/env/required-secrets.json << 'EOF'
{"production": []}
EOF

# Step 4: Run again
npx secrets-sync --help
# ✅ Should work normally
```

**Expected:** User can recover from config errors.

---

## Completion Checklist

### Phase 1: Core Implementation
- [ ] Hardcoded import removed
- [ ] loadRequiredSecrets function implemented
- [ ] REQUIRED_SECRETS initialization updated
- [ ] REQUIRED_PROD_KEYS initialization updated
- [ ] Build succeeds

### Phase 2: Error Handling
- [ ] Missing config handled
- [ ] Invalid JSON handled
- [ ] Valid config loaded
- [ ] Permission errors handled
- [ ] All warnings clear

### Phase 3: Testing
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] All tests passing
- [ ] Test coverage adequate

### Phase 4: Documentation
- [ ] README updated
- [ ] Troubleshooting added
- [ ] CHANGELOG updated
- [ ] Example config updated
- [ ] Installation tested

### Final Validation
- [ ] New user journey works
- [ ] Config addition works
- [ ] Error recovery works
- [ ] All acceptance criteria met
- [ ] Ready for PR

---

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1 | 1-2h | | |
| Phase 2 | 1h | | |
| Phase 3 | 2-3h | | |
| Phase 4 | 1h | | |
| **Total** | **4-6h** | | |

---

## Success Criteria Summary

**Technical Success:**
- [ ] Build completes without errors
- [ ] All tests pass
- [ ] No regressions introduced
- [ ] Code follows existing patterns

**End-User Success:**
- [ ] Users can install package via npm
- [ ] Users can run tool without config
- [ ] Users can add config when needed
- [ ] Users get clear error messages
- [ ] Users can troubleshoot issues

**Business Success:**
- [ ] Issue #1 resolved
- [ ] Blocks removed for other issues
- [ ] Package ready for distribution
- [ ] Documentation complete

---

## Next Steps After Completion

1. [ ] Commit changes with message: `fix: load required-secrets.json at runtime (#1)`
2. [ ] Push to branch: `1-fix-hardcoded-import-path-for-required-secretsjson`
3. [ ] Create pull request to `develop`
4. [ ] Request code review
5. [ ] Address review feedback
6. [ ] Merge to `develop`
7. [ ] Verify CI/CD passes
8. [ ] Close issue #1

---

## Rollback Plan

If critical issues discovered:

1. [ ] Revert commit on develop branch
2. [ ] Document issue in GitHub
3. [ ] Create hotfix plan
4. [ ] Re-test thoroughly
5. [ ] Re-deploy when fixed

**Risk:** Low - changes are isolated and well-tested
