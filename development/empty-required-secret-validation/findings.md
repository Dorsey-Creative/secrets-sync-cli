# Findings

## Findings

### HIGH

None.

### MEDIUM

None.

### LOW

- [ ] F-001: The exact CLI flag names should be confirmed before implementation.
  - Evidence: The feature brief recommends `--strict-empty-values` and `--allow-empty`, but these names were not explicitly provided by the user.
  - Recommendation: Confirm names or proceed with recommended names because they are explicit and narrow.
  - Status: Open

- [ ] F-002: The local YAML parser may become harder to maintain as `env-config.yml` grows.
  - Evidence: `parseEnvConfig` is handwritten and section-based.
  - Recommendation: Keep the new config shape simple for this feature; consider a future parser refactor separately.
  - Status: Open

## Code Review — Security

### HIGH

None.

### MEDIUM

None.

### LOW

- [ ] F-003: `--allow-empty '*'` bypasses all empty-value validation.
  - Evidence: `matchesSkipPattern` treats `*` as a prefix pattern with an empty prefix (`"".slice(0,-1)` = `""`), and `String.startsWith("")` is always `true`. Any user passing `--allow-empty '*'` or via config `allowEmptySecrets: ['*']` silently disables all empty-value checking.
  - Impact: Low — this is a local CLI tool where the user controls their own config. An attacker with config write access already has full system access. However, in CI pipelines with strict mode, a misconfigured allow-all pattern could silently disable the safety gate.
  - Recommendation: Document that `*` alone matches all keys. Optionally warn when a bare `*` pattern is used with strict mode (defeats the purpose). No code change strictly required.
  - Status: Open

- [ ] F-004: Env key names containing ANSI escape sequences are passed unsanitized to terminal output.
  - Evidence: `parseDotenvFile` does not sanitize key names. A crafted `.env` file with a key like `$'\x1b[31mFAKE_ERROR\x1b[0m'=` would render colored/misleading terminal output in the warning message. The scrubber operates on `KEY=value` patterns, not on raw key names.
  - Impact: Low — requires the attacker to control `.env` file content, which already implies full access to secrets. Terminal escape injection is cosmetic/confusing, not a data exfiltration vector.
  - Recommendation: No immediate fix needed. If hardening is desired in the future, strip non-printable characters from key names before including them in log output.
  - Status: Open

- [ ] F-005: `--allow-empty` silently consumes the next positional argument if no value is provided.
  - Evidence: When `--allow-empty` is the last flag, `argv[++i]` is `undefined` and the `if (val)` guard silently skips. If `--allow-empty` is followed by another flag (e.g., `--allow-empty --dry-run`), it consumes `--dry-run` as the pattern value instead of the intended flag.
  - Impact: Low — this is consistent with how `--dir` and `--env` are handled in the same parser. The user would notice `--dry-run` not taking effect. Not a security vulnerability, but could cause unexpected behavior where strict mode runs without dry-run protection.
  - Recommendation: Consider validating that the consumed value doesn't start with `--`. No security fix required; this matches existing conventions.
  - Status: Open

### Summary

**Secret value leakage (REQ-010):** PASS. The `validateEmptyValues` function constructs warning messages using only `key`, `summary.file` (basename only), and `summary.name` (env name). The `value` variable is checked for emptiness but never interpolated into output. The logger additionally applies `scrubSecrets()` defense-in-depth on all output strings.

**Input validation on --allow-empty patterns:** PASS (with F-003 noting the `*` edge case). Patterns are simple string comparisons with a single trailing-wildcard feature — no regex, no glob expansion, no ReDoS risk.

**Validation bypass vectors:** PASS. No environment variable or hidden mechanism can skip the validation. The only suppression paths are `skipSecrets`, `allowEmpty`, deprecated keys — all explicitly designed and documented.

**Test fixture secrets:** PASS. All test values use obvious placeholders (`valid`, `nonempty`, `ok`, `actualvalue`). No real credentials present.

**CLI flag injection:** PASS. The flag parser uses a simple `switch/case` on `argv` entries. No shell expansion, template literals, or `eval` — values are consumed as plain strings.

**Error message information disclosure:** PASS. Error messages reference key names and file basenames only. The scrubber provides a second defense layer.

## Code Review — Functional

### HIGH

None.

### MEDIUM

- [ ] F-003: In non-strict (warn) mode, only the first empty value is reported across all summaries; subsequent empty values are silently ignored.
  - Evidence: `validateEmptyValues` returns `true` after the first warning (`logWarn(msg); return true;`), short-circuiting iteration. If a user has 5 empty keys, they only learn about 1 per CLI invocation.
  - Requirement reference: REQ-002 says "warn by default when it encounters the first non-skipped, non-allowed, non-deprecated empty value." Design says "Warn/fail on the first invalid empty value." The implementation matches spec.
  - Impact: UX friction — users must fix one key at a time, re-running CLI each time to discover the next empty key.
  - Recommendation: This is by-spec (design explicitly states first-finding behavior). Consider a future enhancement to warn-all in non-strict mode. No code change needed now.
  - Status: Closed (by-design per findings.md Q6 answer and design.md)

### LOW

- [ ] F-004: `--allow-empty` silently consumes the next positional arg if placed at end of argv without a value.
  - Evidence: `case '--allow-empty': { const val = argv[++i]; if (val) { ... } }` — if `--allow-empty` is the last flag, `argv[++i]` is `undefined` and no error is emitted.
  - Impact: Silent no-op; user may not realize their allow-empty didn't register. Low severity because this is consistent with how `--env` and `--dir` handle missing values in this codebase.
  - Recommendation: Consider emitting a warning when `--allow-empty` has no following value. Not a blocker.
  - Status: Open

- [ ] F-005: No test for an `.env` file containing ONLY empty values (no valid keys) to verify behavior when all keys are suppressed by allow-empty or when all keys are empty.
  - Evidence: All test cases include at least one `VALID=ok` or `API_KEY=valid` key alongside empty keys. An edge case where `.env` is entirely empty keys (e.g., `KEY=\n`) or all keys match `allowEmpty` is not explicitly tested.
  - Impact: Low — the code handles this correctly (no crash, returns `true` when all empty keys are suppressed), but adding the test would increase confidence.
  - Recommendation: Add a test with an all-empty `.env` where all keys are allow-listed to confirm zero warnings. Not a blocker.
  - Status: Open

- [ ] F-006: Wildcard pattern matching supports only suffix wildcards (`PREFIX_*`), not leading wildcards (`*_SUFFIX`).
  - Evidence: `matchesSkipPattern` checks `pattern.endsWith('*')` and does prefix matching only. A pattern like `*_DISABLED` (from findings.md Q6 answer and design examples) would not match keys like `FEATURE_DISABLED`.
  - Impact: The `allowEmptySecrets` example in findings.md uses `*_DISABLED` but this won't work as expected because `matchesSkipPattern` only supports trailing wildcards. However, this is a **pre-existing limitation** of the `skipSecrets` pattern matching, not a regression introduced by this feature.
  - Recommendation: Document the supported pattern syntax (trailing wildcard only) in the config example or help text. Not a blocker for this feature.
  - Status: Open
