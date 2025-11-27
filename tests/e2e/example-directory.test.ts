import { describe, it, expect } from "bun:test";
import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

const projectRoot = join(import.meta.dir, "../..");
const exampleDir = join(projectRoot, "example");
const exampleEnvDir = join(exampleDir, "config/env");
const hasEnvFiles = existsSync(exampleEnvDir) && 
  readdirSync(exampleEnvDir).some(f => f.startsWith(".env"));
const skipTests = !hasEnvFiles;

if (skipTests) {
  console.warn("⚠️  Skipping example directory tests - run 'bun run setup:example' first");
}

describe.skipIf(skipTests)("Example Directory E2E", () => {
  it("should run CLI against example directory successfully", () => {
    const output = execSync(
      `bun run dev -- --dir "${exampleEnvDir}" --dry-run`,
      { 
        cwd: projectRoot, 
        encoding: "utf-8",
        env: { ...process.env, SKIP_DEPENDENCY_CHECK: "1" },
      }
    );

    expect(output).toContain("Parsed options:");
    expect(output).toContain("dryRun");
    expect(output).toContain("true");
  });

  it("should not show example/ env files in git status", () => {
    const output = execSync("git status --short", {
      cwd: projectRoot,
      encoding: "utf-8",
    });

    // example/README.md is tracked, but .env files should not be
    expect(output).not.toContain("example/config/env");
    expect(output).not.toContain(".env.staging");
    expect(output).not.toContain(".env.development");
  });

  it("should exclude example/ from npm pack", () => {
    const output = execSync("npm pack --dry-run", {
      cwd: projectRoot,
      encoding: "utf-8",
      env: { ...process.env, CI: "true" },
    });

    expect(output).not.toContain("example/");
  });

  it("should show key names but not secret values in output", () => {
    const output = execSync(
      `bun run dev -- --dir "${exampleEnvDir}" --dry-run`,
      { 
        cwd: projectRoot, 
        encoding: "utf-8",
        env: { ...process.env, SKIP_DEPENDENCY_CHECK: "1" },
      }
    );
    
    // Key names should be visible in audit table
    expect(output).toContain("API_KEY");
    expect(output).toContain("DATABASE_URL");
    expect(output).toContain("Secret Name");
    
    // Actual secret values should NOT appear in output
    expect(output).not.toContain("test_api_key_abc123xyz");
    expect(output).not.toContain("testpass");
    expect(output).not.toContain("fake_jwt_secret");
  });
});
