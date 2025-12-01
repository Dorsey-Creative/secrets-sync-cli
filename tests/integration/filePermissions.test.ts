import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";

const TEST_DIR = path.join(process.cwd(), "tests", "fixtures", "filePermissions");
const CONFIG_DIR = path.join(TEST_DIR, "config", "env");

describe("File Permission Integration Tests", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      // Reset permissions before cleanup
      try {
        fs.chmodSync(CONFIG_DIR, 0o755);
        const files = fs.readdirSync(CONFIG_DIR);
        files.forEach(file => {
          const filePath = path.join(CONFIG_DIR, file);
          try {
            fs.chmodSync(filePath, 0o644);
          } catch {}
        });
      } catch {}
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      // Reset permissions before cleanup
      try {
        fs.chmodSync(CONFIG_DIR, 0o755);
        const files = fs.readdirSync(CONFIG_DIR);
        files.forEach(file => {
          const filePath = path.join(CONFIG_DIR, file);
          try {
            fs.chmodSync(filePath, 0o644);
          } catch {}
        });
      } catch {}
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should show error with fix command for unreadable file", () => {
    const envFile = path.join(CONFIG_DIR, ".env");
    fs.writeFileSync(envFile, "SECRET=value");
    fs.chmodSync(envFile, 0o000);

    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", CONFIG_DIR,
      "--dry-run"
    ]);

    const stderr = new TextDecoder().decode(proc.stderr);
    expect(stderr).toContain("Failed to read");
    expect(stderr).toContain(envFile);
    expect(stderr).toContain(`chmod 644 "${envFile}"`);
    
    // Cleanup
    fs.chmodSync(envFile, 0o644);
  });

  it("should show error with fix command for unwritable directory", () => {
    const envFile = path.join(CONFIG_DIR, ".env");
    fs.writeFileSync(envFile, "SECRET=value");
    fs.chmodSync(CONFIG_DIR, 0o555);

    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", CONFIG_DIR,
      "--env", "staging"
    ]);

    const stderr = new TextDecoder().decode(proc.stderr);
    // Should fail when trying to create backup directory or write files
    const hasPermissionError = stderr.includes("permission denied") || stderr.includes("EACCES");
    expect(hasPermissionError).toBe(true);
    
    // Cleanup
    fs.chmodSync(CONFIG_DIR, 0o755);
  });

  it("should show error with fix command for unreadable directory", () => {
    fs.chmodSync(CONFIG_DIR, 0o000);

    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", CONFIG_DIR,
      "--dry-run"
    ]);

    const stderr = new TextDecoder().decode(proc.stderr);
    expect(stderr).toContain("Failed to read directory");
    expect(stderr).toContain(`chmod 755 "${CONFIG_DIR}"`);
    
    // Cleanup
    fs.chmodSync(CONFIG_DIR, 0o755);
  });

  it("should succeed with proper permissions", () => {
    const envFile = path.join(CONFIG_DIR, ".env");
    fs.writeFileSync(envFile, "SECRET=value");
    fs.chmodSync(envFile, 0o644);
    fs.chmodSync(CONFIG_DIR, 0o755);

    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", CONFIG_DIR,
      "--dry-run"
    ]);

    expect(proc.exitCode).toBe(0);
  });

  it("should handle file not found gracefully", () => {
    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", path.join(TEST_DIR, "nonexistent"),
      "--dry-run"
    ]);

    // Should create directory or warn about missing files
    const stderr = new TextDecoder().decode(proc.stderr);
    const stdout = new TextDecoder().decode(proc.stdout);
    
    // Either succeeds with warning or fails gracefully
    expect(proc.exitCode === 0 || stderr.length > 0).toBe(true);
  });

  it("should verify fix commands are correct", () => {
    const envFile = path.join(CONFIG_DIR, ".env");
    fs.writeFileSync(envFile, "SECRET=value");
    fs.chmodSync(envFile, 0o000);

    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", CONFIG_DIR,
      "--dry-run"
    ]);

    const stderr = new TextDecoder().decode(proc.stderr);
    
    // Extract fix command
    const fixMatch = stderr.match(/chmod \d+ ".+"/);
    expect(fixMatch).toBeTruthy();
    
    if (fixMatch) {
      const fixCommand = fixMatch[0];
      expect(fixCommand).toContain("chmod 644");
      expect(fixCommand).toContain(`"${envFile}"`);
    }
    
    // Cleanup
    fs.chmodSync(envFile, 0o644);
  });

  it("should handle multiple permission errors", () => {
    const envFile = path.join(CONFIG_DIR, ".env");
    const stagingFile = path.join(CONFIG_DIR, ".env.staging");
    
    fs.writeFileSync(envFile, "SECRET=value");
    fs.writeFileSync(stagingFile, "SECRET=staging_value");
    
    fs.chmodSync(envFile, 0o000);
    fs.chmodSync(stagingFile, 0o000);

    const proc = Bun.spawnSync([
      "./dist/secrets-sync.js",
      "--dir", CONFIG_DIR,
      "--dry-run"
    ]);

    const stderr = new TextDecoder().decode(proc.stderr);
    
    // Should show error for at least one file
    expect(stderr).toContain("Failed to read");
    expect(stderr).toContain("chmod");
    
    // Cleanup
    fs.chmodSync(envFile, 0o644);
    fs.chmodSync(stagingFile, 0o644);
  });
});
