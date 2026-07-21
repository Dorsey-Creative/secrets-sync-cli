import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("Empty Value Validation - Additional Coverage", () => {
  const root = join(import.meta.dir, "../..");

  // TC-REQ-011-A: No new runtime dependency added for empty-value validation (REQ-011)
  test("no new runtime dependencies added for empty-value validation", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
    const deps = Object.keys(pkg.dependencies || {});
    // Only pre-existing dependencies should be present
    expect(deps).toEqual(["lru-cache", "yaml"]);
  });

  // TC-REQ-013-A: Documentation mentions strict mode and allow-empty (REQ-013)
  test("README documents strict-empty-values and allow-empty", () => {
    const readme = readFileSync(join(root, "README.md"), "utf-8");
    expect(readme).toContain("--strict-empty-values");
    expect(readme).toContain("--allow-empty");
  });

  test("docs/USAGE.md documents empty value validation", () => {
    const usage = readFileSync(join(root, "docs/USAGE.md"), "utf-8");
    expect(usage).toContain("strict-empty-values");
  });

  test("docs/FEATURES.md documents empty value validation", () => {
    const features = readFileSync(join(root, "docs/FEATURES.md"), "utf-8");
    expect(features).toContain("strict-empty-values");
  });

  test("examples/env-config.example.yml documents allowEmptySecrets and strictEmptyValues", () => {
    const example = readFileSync(join(root, "examples/env-config.example.yml"), "utf-8");
    expect(example).toContain("allowEmptySecrets");
    expect(example).toContain("strictEmptyValues");
  });

  // TC-REQ-015-A: Help output includes new flags (REQ-015)
  test("--help output includes --strict-empty-values and --allow-empty", () => {
    const proc = Bun.spawnSync(["./dist/secrets-sync.js", "--help"], {
      env: { ...process.env, SKIP_DEPENDENCY_CHECK: "1" },
    });
    const stdout = new TextDecoder().decode(proc.stdout);
    expect(stdout).toContain("--strict-empty-values");
    expect(stdout).toContain("--allow-empty");
  });
});
