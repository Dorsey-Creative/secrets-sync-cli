import { describe, test, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("loadRequiredSecrets", () => {
  const testDir = join(tmpdir(), "secrets-sync-test");
  
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
  
  test("returns default config when file missing", async () => {
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
    
    const output = new TextDecoder().decode(proc.stdout);
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
    expect(output).toContain("[CONFIG] Failed to parse required-secrets.json");
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
    const examplePath = "examples/required-secrets.example.json";
    if (existsSync(examplePath)) {
      const exampleContent = readFileSync(examplePath, "utf8");
      const cleanContent = exampleContent.replace(/"_comment":[^,]*,?\s*/g, "");
      writeFileSync(join(testDir, "required-secrets.json"), cleanContent);
      
      const proc = Bun.spawnSync([
        "./dist/secrets-sync.js",
        "--dir", testDir,
        "--help"
      ]);
      
      expect(proc.exitCode).toBe(0);
      const output = new TextDecoder().decode(proc.stdout);
      expect(output).toContain("[CONFIG] Loaded required secrets");
    }
  });
});
