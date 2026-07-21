# Requirements

## Functional Requirements

- REQ-001: The CLI must detect empty values in every discovered `.env*` file after current dotenv parsing, where empty includes `KEY=`, whitespace-only, quoted empty, and quoted whitespace values.
- REQ-002: The CLI must warn by default when it encounters the first non-skipped, non-allowed, non-deprecated empty value in dry-run or normal sync.
- REQ-003: The CLI must support strict empty-value validation that exits nonzero and stops before any GitHub mutation when an invalid empty value is found.
- REQ-004: Strict empty-value validation must apply to both `--dry-run` and normal sync.
- REQ-005: `skipSecrets` patterns from `env-config.yml` must suppress empty-value validation for matching keys.
- REQ-006: The CLI must support explicit empty-value allowlists from CLI flags and `env-config.yml` without changing `required-secrets.json`.
- REQ-007: Production layering must respect canonical `.env` precedence: a non-empty canonical value must prevent duplicate empty production variant values from becoming invalid production output.
- REQ-008: Empty values in production variants, non-production envs, and prefix-forced production files must be validated unless skipped, deprecated, or explicitly allowed.
- REQ-009: Deprecated keys must be ignored by empty-value validation.
- REQ-010: CLI output must identify the key, file, and environment context for the empty value warning or strict failure without printing secret values.

## Non-Functional Requirements

- REQ-011: The implementation must not add runtime dependencies.
- REQ-012: Validation must run before mutation in normal sync mode.
- REQ-013: Validation behavior must be documented in README, usage docs, and the example `env-config.yml`.
- REQ-014: Tests must cover warning, strict failure, skip suppression, allow-empty suppression, deprecated key suppression, and production precedence.
- REQ-015: New CLI/config options must follow existing parsing and help-output conventions.
