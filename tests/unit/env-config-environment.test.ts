import { describe, test, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("env-config.yml environment section", () => {
  const testDir = join(tmpdir(), "secrets-sync-env-test");
  
  beforeAll(async () => {
    // Ensure CLI is built before running tests
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

  test("loads environment variables from env-config.yml", async () => {
    const configPath = join(testDir, "env-config.yml");
    writeFileSync(configPath, `
environment:
  skipDependencyCheck: true
  skipGitignoreCheck: true
  timeout: 45000
  mock: true
`);
    
    // Create a dummy .env file so it doesn't exit early
    writeFileSync(join(testDir, ".env"), "TEST=1");

    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--dry-run",
      "--verbose"
    ], {
      env: {
        ...process.env,
        SKIP_DEPENDENCY_CHECK: "",
        SKIP_GITIGNORE_CHECK: "",
        SECRETS_SYNC_TIMEOUT: "",
        SECRETS_SYNC_MOCK: ""
      }
    });
    
    const output = new TextDecoder().decode(proc.stdout);
    const errOutput = new TextDecoder().decode(proc.stderr);
    
    // Check if Applied environment config is logged
    expect(output).toContain("Applied environment config");
    expect(output).toContain("MOCK MODE enabled");
    expect(output).not.toContain("Security Warning: Your .gitignore may not protect secrets");
    expect(errOutput).not.toContain("Missing required dependencies");
    expect(proc.exitCode).toBe(0);
  });

  test("shell environment variables override env-config.yml", async () => {
    const configPath = join(testDir, "env-config.yml");
    writeFileSync(configPath, `
environment:
  mock: true
`);
    
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", testDir,
      "--dry-run"
    ], {
      env: {
        ...process.env,
        SECRETS_SYNC_MOCK: "0",
        SKIP_DEPENDENCY_CHECK: "1", // avoid noise
        SKIP_GITIGNORE_CHECK: "1"   // avoid noise
      }
    });
    
    const output = new TextDecoder().decode(proc.stdout);
    expect(output).not.toContain("MOCK MODE enabled");
    expect(proc.exitCode).toBe(0);
  });
});
