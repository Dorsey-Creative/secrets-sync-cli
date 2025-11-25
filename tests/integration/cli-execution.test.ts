import { describe, test, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("CLI Execution", () => {
  const testDir = join(tmpdir(), "secrets-sync-cli-test");
  
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
    
    const stdout = new TextDecoder().decode(proc.stdout);
    expect(stdout).toContain("[CONFIG] Loaded required secrets");
  });
  
  test("loads config from custom directory via --dir flag", () => {
    const customDir = join(tmpdir(), "custom-secrets-config");
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
    
    const stdout = new TextDecoder().decode(proc.stdout);
    expect(stdout).toContain("[CONFIG] Loaded required secrets");
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
