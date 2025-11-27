import { describe, it, expect } from "bun:test";
import { execSync } from "child_process";
import { join } from "path";

const projectRoot = join(import.meta.dir, "../..");

describe("Version Command", () => {
  it("should display version from package.json", () => {
    const output = execSync("bun run dev -- -v", {
      cwd: projectRoot,
      encoding: "utf-8",
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: "1" },
    });

    const { version } = require("../../package.json");
    expect(output).toContain(`secrets-sync version ${version}`);
  });

  it("should match package.json version format", () => {
    const output = execSync("bun run dev -- -v", {
      cwd: projectRoot,
      encoding: "utf-8",
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: "1" },
    });

    // Should match X.Y.Z or X.Y.Z-prerelease format
    expect(output).toMatch(/secrets-sync version \d+\.\d+\.\d+/);
  });

  it("should work with --version flag", () => {
    const output = execSync("bun run dev -- --version", {
      cwd: projectRoot,
      encoding: "utf-8",
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: "1" },
    });

    const { version } = require("../../package.json");
    expect(output).toContain(`secrets-sync version ${version}`);
  });
});
