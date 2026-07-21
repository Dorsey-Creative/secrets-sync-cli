import { describe, test, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("--no-confirm Flag Fix & Secrets Limit Check", () => {
  const testDir = join(tmpdir(), "secrets-sync-no-confirm-limit-test");

  beforeAll(async () => {
    const buildProc = Bun.spawnSync(["bun", "run", "build"]);
    if (buildProc.exitCode !== 0) {
      throw new Error("Failed to build CLI for tests");
    }
  });

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

  function run(args: string[], env?: Record<string, string>) {
    const proc = Bun.spawnSync(["./dist/secrets-sync.js", "--dir", testDir, ...args], {
      env: {
        ...process.env,
        SKIP_DEPENDENCY_CHECK: "1",
        SKIP_GITIGNORE_CHECK: "1",
        SECRETS_SYNC_MOCK: "1",
        ...env,
      },
    });
    return {
      exitCode: proc.exitCode,
      stdout: new TextDecoder().decode(proc.stdout),
      stderr: new TextDecoder().decode(proc.stderr),
    };
  }

  /** Generate a mock secrets JSON with N entries */
  function generateMockSecrets(count: number): Record<string, string> {
    const secrets: Record<string, string> = {};
    for (let i = 1; i <= count; i++) {
      secrets[`SECRET_${String(i).padStart(3, "0")}`] = `value_${i}`;
    }
    return secrets;
  }

  // ===========================================================================
  // --no-confirm Tests
  // ===========================================================================

  describe("--no-confirm flag", () => {
    // TC-REQ-001-A, TC-REQ-003-A: --no-confirm approves creates without aborting
    test("approves all planned changes without prompting (REQ-001, REQ-003)", () => {
      writeFileSync(join(testDir, ".env"), "NEW_KEY=newvalue\nANOTHER=hello\n");
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify({}));

      const { exitCode, stdout, stderr } = run(["--no-confirm"]);
      expect(stderr).not.toContain("refusing to prompt");
      expect(stderr).not.toContain("Aborting");
      expect(stdout).toContain("--no-confirm supplied: approving all planned changes without prompts.");
      expect(exitCode).toBe(0);
    });

    // TC-REQ-002-A: --no-confirm does not force-update unchanged secrets
    test("does not force-update unchanged secrets (REQ-002)", () => {
      const mockSecrets = { EXISTING_KEY: "existingvalue" };
      writeFileSync(join(testDir, ".env"), "EXISTING_KEY=existingvalue\n");
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));

      const { exitCode, stdout } = run(["--no-confirm"]);
      // No changes should be needed — values match
      expect(stdout).toContain("No changes to apply.");
      expect(exitCode).toBe(0);
    });

    // TC-REQ-002-E: --overwrite forces all updates (control test)
    test("--overwrite forces all updates for unchanged secrets (REQ-004)", () => {
      const mockSecrets = { EXISTING_KEY: "existingvalue" };
      writeFileSync(join(testDir, ".env"), "EXISTING_KEY=existingvalue\n");
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));

      const { exitCode, stdout } = run(["--overwrite"]);
      expect(stdout).toContain("--overwrite supplied: approving all planned changes without prompts.");
      expect(exitCode).toBe(0);
    });

    // TC-REQ-005-A: --overwrite --no-confirm behaves like --overwrite alone
    test("--overwrite --no-confirm behaves like --overwrite alone (REQ-005)", () => {
      const mockSecrets = { KEY1: "val1" };
      writeFileSync(join(testDir, ".env"), "KEY1=val1\nKEY2=val2\n");
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));

      const { exitCode, stdout } = run(["--overwrite", "--no-confirm"]);
      // --overwrite branch is checked first, so its message appears
      expect(stdout).toContain("--overwrite supplied: approving all planned changes without prompts.");
      expect(stdout).not.toContain("--no-confirm supplied:");
      expect(exitCode).toBe(0);
    });

    // TC-REQ-007-A: --no-confirm outputs auto-approval message
    test("outputs auto-approval message in stdout (REQ-007)", () => {
      writeFileSync(join(testDir, ".env"), "NEW_SECRET=value123\n");
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify({}));

      const { stdout } = run(["--no-confirm"]);
      expect(stdout).toContain("--no-confirm supplied: approving all planned changes without prompts.");
    });

    // TC-REQ-001-D: --no-confirm with no changes outputs "No changes to apply"
    test("with no changes outputs 'No changes to apply' (REQ-001)", () => {
      writeFileSync(join(testDir, ".env"), "");
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify({}));

      const { exitCode, stdout } = run(["--no-confirm"]);
      expect(stdout).toContain("No changes to apply.");
      expect(exitCode).toBe(0);
    });
  });

  // ===========================================================================
  // Secrets Limit Check Tests
  // ===========================================================================

  describe("secrets limit check", () => {
    // TC-REQ-008-A, TC-REQ-009-A: Blocks when projected > 100
    test("blocks with exit 1 when projected total exceeds 100 (REQ-008, REQ-009)", () => {
      // 98 existing secrets + 5 new = 103 projected
      const mockSecrets = generateMockSecrets(98);
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));
      // Include all existing keys plus 5 new ones in .env so existing aren't deleted
      let envContent = Object.keys(mockSecrets).map(k => `${k}=${mockSecrets[k]}`).join("\n") + "\n";
      envContent += "NEW_ONE=a\nNEW_TWO=b\nNEW_THREE=c\nNEW_FOUR=d\nNEW_FIVE=e\n";
      writeFileSync(join(testDir, ".env"), envContent);

      const { exitCode, stderr } = run(["--no-confirm"]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("100");
      expect(stderr).toContain("98");
      expect(stderr).toContain("+5");
      expect(stderr).toContain("103");
    });

    // TC-REQ-009-B: Error message contains counts (REQ-014)
    test("error message contains current, creates, deletes, projected (REQ-014)", () => {
      const mockSecrets = generateMockSecrets(95);
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));
      // Include existing keys + 10 new secrets = projected 105
      let envContent = Object.keys(mockSecrets).map(k => `${k}=${mockSecrets[k]}`).join("\n") + "\n";
      for (let i = 1; i <= 10; i++) {
        envContent += `BRAND_NEW_${i}=val${i}\n`;
      }
      writeFileSync(join(testDir, ".env"), envContent);

      const { exitCode, stderr } = run(["--no-confirm"]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Current: 95");
      expect(stderr).toContain("Creating: +10");
      expect(stderr).toContain("Deleting: -0");
      expect(stderr).toContain("Projected: 105");
    });

    // TC-REQ-010-A, TC-REQ-010-B: Warning in dry-run mode, exit 0
    test("warns in dry-run mode but exits 0 (REQ-010)", () => {
      const mockSecrets = generateMockSecrets(98);
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));
      // Include existing keys + 5 new ones in .env
      let envContent = Object.keys(mockSecrets).map(k => `${k}=${mockSecrets[k]}`).join("\n") + "\n";
      envContent += "NEW_ONE=a\nNEW_TWO=b\nNEW_THREE=c\nNEW_FOUR=d\nNEW_FIVE=e\n";
      writeFileSync(join(testDir, ".env"), envContent);

      const { exitCode, stderr } = run(["--dry-run"]);
      expect(exitCode).toBe(0);
      expect(stderr).toContain("Plan would exceed GitHub repository secrets limit");
      expect(stderr).toContain("103");
    });

    // TC-REQ-012-A: Deletes offset creates — projected passes
    test("accounts for deletes offsetting creates (REQ-012)", () => {
      // 99 existing, 5 creates, 4 deletes → projected 100 → passes
      const mockSecrets = generateMockSecrets(99);
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));
      // Add 5 new keys; exclude 4 existing keys (they'll be marked for delete)
      // Remove SECRET_096..SECRET_099 from .env so they get deleted
      let envContent = "";
      for (let i = 1; i <= 95; i++) {
        envContent += `SECRET_${String(i).padStart(3, "0")}=value_${i}\n`;
      }
      // Add 5 new
      envContent += "NEW_A=a\nNEW_B=b\nNEW_C=c\nNEW_D=d\nNEW_E=e\n";
      writeFileSync(join(testDir, ".env"), envContent);

      const { exitCode, stderr } = run(["--no-confirm"]);
      // 99 existing + 5 creates - 4 deletes = 100, which is exactly at limit (not over)
      expect(exitCode).toBe(0);
      expect(stderr).not.toContain("Would exceed");
    });

    // TC-REQ-012-C: Deletes don't offset enough — projected fails
    test("blocks when deletes don't sufficiently offset creates (REQ-012)", () => {
      // 99 existing, 5 creates, 3 deletes → projected 101 → fails
      const mockSecrets = generateMockSecrets(99);
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));
      // Keep 96 of the existing keys, remove 3 (SECRET_097..SECRET_099)
      let envContent = "";
      for (let i = 1; i <= 96; i++) {
        envContent += `SECRET_${String(i).padStart(3, "0")}=value_${i}\n`;
      }
      // Add 5 new
      envContent += "NEW_A=a\nNEW_B=b\nNEW_C=c\nNEW_D=d\nNEW_E=e\n";
      writeFileSync(join(testDir, ".env"), envContent);

      const { exitCode, stderr } = run(["--no-confirm"]);
      // 99 existing + 5 creates - 3 deletes = 101
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Would exceed");
    });

    // TC-REQ-013-A: Graceful when existing.size === 0 and creates > 100
    test("warns but proceeds when existing count is 0 (REQ-013)", () => {
      // Empty mock secrets (simulates API failure or fresh repo)
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify({}));
      // Add 105 new secrets
      let envContent = "";
      for (let i = 1; i <= 105; i++) {
        envContent += `KEY_${String(i).padStart(3, "0")}=val${i}\n`;
      }
      writeFileSync(join(testDir, ".env"), envContent);

      const { exitCode, stderr } = run(["--no-confirm"]);
      // Should warn but proceed (not block)
      expect(exitCode).toBe(0);
      expect(stderr).toContain("Cannot verify secrets limit");
    });

    // TC-REQ-008-C: Exactly at limit (100) does not trigger
    test("does not fire when projected equals exactly 100 (REQ-008)", () => {
      const mockSecrets = generateMockSecrets(95);
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));
      // 5 new keys = projected 100 (at limit, not over)
      writeFileSync(
        join(testDir, ".env"),
        Object.keys(mockSecrets).map(k => `${k}=value\n`).join("") +
        "NEW_ONE=a\nNEW_TWO=b\nNEW_THREE=c\nNEW_FOUR=d\nNEW_FIVE=e\n"
      );

      const { exitCode, stderr } = run(["--no-confirm"]);
      expect(exitCode).toBe(0);
      expect(stderr).not.toContain("Would exceed");
      expect(stderr).not.toContain("Cannot verify");
    });

    // TC-REQ-008-F: Well under limit — no warnings
    test("does not produce any limit warning when well under 100 (REQ-008)", () => {
      const mockSecrets = generateMockSecrets(5);
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));
      writeFileSync(join(testDir, ".env"), "NEW_KEY=hello\nSECRET_001=value_1\nSECRET_002=value_2\nSECRET_003=value_3\nSECRET_004=value_4\nSECRET_005=value_5\n");

      const { exitCode, stderr } = run(["--no-confirm"]);
      expect(exitCode).toBe(0);
      expect(stderr).not.toContain("limit");
      expect(stderr).not.toContain("Cannot verify");
    });

    // TC-COMBO-A: --no-confirm with limit exceeded — blocks before approval
    test("--no-confirm with limit exceeded blocks before approval (TC-COMBO-A)", () => {
      const mockSecrets = generateMockSecrets(98);
      writeFileSync(join(testDir, ".secrets-mock.json"), JSON.stringify(mockSecrets));
      // Include existing keys + 5 new ones
      let envContent = Object.keys(mockSecrets).map(k => `${k}=${mockSecrets[k]}`).join("\n") + "\n";
      envContent += "NEW_ONE=a\nNEW_TWO=b\nNEW_THREE=c\nNEW_FOUR=d\nNEW_FIVE=e\n";
      writeFileSync(join(testDir, ".env"), envContent);

      const { exitCode, stdout, stderr } = run(["--no-confirm"]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Would exceed");
      // Should not reach the approval message since limit check fires first
      expect(stdout).not.toContain("--no-confirm supplied: approving all planned changes");
    });
  });
});
