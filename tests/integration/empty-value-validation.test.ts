import { describe, test, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Empty Value Validation", () => {
  const testDir = join(tmpdir(), "secrets-sync-empty-val-test");

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

  // TC-REQ-002-A: Warning default, exits zero
  test("warns on empty value in dry-run without strict mode, exits zero", () => {
    writeFileSync(join(testDir, ".env"), "JWT_SECRET=\nAPI_KEY=valid\n");
    const { exitCode, stderr } = run(["--dry-run"]);
    expect(stderr).toContain("[WARN][Empty] Empty value for JWT_SECRET in .env (env: production)");
    expect(stderr).toContain("--allow-empty JWT_SECRET");
    expect(exitCode).toBe(0);
  });

  // TC-REQ-003-A: Strict mode exits nonzero
  test("strict mode exits nonzero on empty value", () => {
    writeFileSync(join(testDir, ".env"), "JWT_SECRET=\nAPI_KEY=valid\n");
    const { exitCode, stderr } = run(["--dry-run", "--strict-empty-values"]);
    expect(stderr).toContain("[WARN][Empty] Empty value for JWT_SECRET");
    expect(exitCode).toBe(1);
  });

  // TC-REQ-004-A: Strict mode in dry-run also exits nonzero
  test("strict mode in dry-run exits nonzero before diff output", () => {
    writeFileSync(join(testDir, ".env"), "EMPTY_KEY=\n");
    const { exitCode, stdout } = run(["--dry-run", "--strict-empty-values"]);
    expect(exitCode).toBe(1);
    // Should not reach diff summary
    expect(stdout).not.toContain("Diff Summary");
  });

  // TC-REQ-005-A: skipSecrets suppresses empty warning
  test("skipSecrets suppresses empty value warning", () => {
    writeFileSync(join(testDir, ".env"), "DEBUG=\nAPI_KEY=valid\n");
    writeFileSync(join(testDir, "env-config.yml"), "skipSecrets:\n  - DEBUG\n");
    const { exitCode, stderr } = run(["--dry-run", "--strict-empty-values"]);
    expect(stderr).not.toContain("[WARN][Empty]");
    expect(exitCode).toBe(0);
  });

  // TC-REQ-006-D: --allow-empty suppresses warning
  test("--allow-empty suppresses empty value warning", () => {
    writeFileSync(join(testDir, ".env"), "OPTIONAL_KEY=\nAPI_KEY=valid\n");
    const { exitCode, stderr } = run(["--dry-run", "--strict-empty-values", "--allow-empty", "OPTIONAL_KEY"]);
    expect(stderr).not.toContain("[WARN][Empty]");
    expect(exitCode).toBe(0);
  });

  // TC-REQ-006-E: allowEmptySecrets in config suppresses warning
  test("allowEmptySecrets in config suppresses empty value warning", () => {
    writeFileSync(join(testDir, ".env"), "PLACEHOLDER=\nAPI_KEY=valid\n");
    writeFileSync(join(testDir, "env-config.yml"), "allowEmptySecrets:\n  - PLACEHOLDER\n");
    const { exitCode, stderr } = run(["--dry-run", "--strict-empty-values"]);
    expect(stderr).not.toContain("[WARN][Empty]");
    expect(exitCode).toBe(0);
  });

  // TC-REQ-007-A: Production canonical precedence - non-empty canonical wins
  test("canonical .env non-empty value prevents false failure from production variant", () => {
    writeFileSync(join(testDir, ".env"), "JWT_SECRET=nonempty\n");
    writeFileSync(join(testDir, ".env.production"), "JWT_SECRET=\n");
    const { exitCode, stderr } = run(["--dry-run", "--strict-empty-values"]);
    // The canonical value wins in production layering, so validation should not fail
    expect(stderr).not.toContain("[WARN][Empty] Empty value for JWT_SECRET");
    expect(exitCode).toBe(0);
  });

  // TC-REQ-008-A: --force with production variant containing empty value
  test("--force validates production variant independently", () => {
    writeFileSync(join(testDir, ".env"), "API_KEY=valid\n");
    writeFileSync(join(testDir, ".env.production"), "JWT_SECRET=\n");
    const { exitCode, stderr } = run(["--dry-run", "--strict-empty-values", "--force"]);
    expect(stderr).toContain("[WARN][Empty] Empty value for JWT_SECRET");
    expect(exitCode).toBe(1);
  });

  // TC-REQ-009-A: Deprecated key suppressed
  test("deprecated key does not trigger empty value warning", () => {
    writeFileSync(join(testDir, ".env"), "MAGIC_LINK_BASE_URL=\nAPI_KEY=valid\n");
    const { exitCode, stderr } = run(["--dry-run", "--strict-empty-values"]);
    expect(stderr).not.toContain("[WARN][Empty] Empty value for MAGIC_LINK_BASE_URL");
    expect(exitCode).toBe(0);
  });

  // TC-REQ-010-A: Output includes key, file, env and no secret values
  test("output identifies key, file, and env without secret values", () => {
    writeFileSync(join(testDir, ".env"), "MY_SECRET=actualvalue\nEMPTY_ONE=\n");
    const { stderr } = run(["--dry-run"]);
    expect(stderr).toContain("EMPTY_ONE");
    expect(stderr).toContain(".env");
    expect(stderr).toContain("production");
    expect(stderr).not.toContain("actualvalue");
  });

  // TC-REQ-001-A: Detects various empty formats
  test("detects empty values in various formats", () => {
    writeFileSync(join(testDir, ".env"), 'EMPTY1=\nEMPTY2=""\nEMPTY3=\'  \'\nVALID=ok\n');
    const { stderr } = run(["--dry-run"]);
    expect(stderr).toContain("[WARN][Empty]");
  });

  // TC-REQ-006-A: Repeatable and comma-separated --allow-empty
  test("--allow-empty accepts comma-separated and repeated values", () => {
    writeFileSync(join(testDir, ".env"), "KEY_A=\nKEY_B=\nKEY_C=\nVALID=ok\n");
    const { exitCode, stderr } = run([
      "--dry-run", "--strict-empty-values",
      "--allow-empty", "KEY_A,KEY_B",
      "--allow-empty", "KEY_C",
    ]);
    expect(stderr).not.toContain("[WARN][Empty]");
    expect(exitCode).toBe(0);
  });

  // TC-REQ-006-B: Config parser test for allowEmptySecrets
  test("env-config.yml validation.strictEmptyValues enables strict mode", () => {
    writeFileSync(join(testDir, ".env"), "EMPTY_KEY=\n");
    writeFileSync(join(testDir, "env-config.yml"), "validation:\n  strictEmptyValues: true\n");
    const { exitCode, stderr } = run(["--dry-run"]);
    expect(stderr).toContain("[WARN][Empty]");
    expect(exitCode).toBe(1);
  });

  // Wildcard pattern in allowEmptySecrets
  test("allowEmptySecrets wildcard patterns work", () => {
    writeFileSync(join(testDir, ".env"), "DISABLED_FEATURE=\nAPI_KEY=valid\n");
    writeFileSync(join(testDir, "env-config.yml"), "allowEmptySecrets:\n  - DISABLED_*\n");
    const { exitCode, stderr } = run(["--dry-run", "--strict-empty-values"]);
    expect(stderr).not.toContain("[WARN][Empty]");
    expect(exitCode).toBe(0);
  });
});
