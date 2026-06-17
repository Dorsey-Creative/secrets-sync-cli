# Tasks

## Phase 1: Parser And Flag Foundation

- [x] T1.1 Add `strictEmptyValues` and `allowEmpty` fields to CLI flag types. Covers REQ-003, REQ-006, REQ-015.
- [x] T1.2 Parse `--strict-empty-values` and repeatable/comma-separated `--allow-empty <pattern>` CLI input. Covers REQ-003, REQ-006, REQ-015.
- [x] T1.3 Extend `EnvConfig` and `parseEnvConfig` for `validation.strictEmptyValues` and `allowEmptySecrets`. Covers REQ-006, REQ-015.
- [x] T1.4 Merge CLI/config strict and allow-empty values with CLI precedence. Covers REQ-006, REQ-015.
- [x] T1.5 Add parser/unit tests for new flags and config fields. Covers REQ-006, REQ-014, REQ-015.

## Phase 2: Empty Value Validation

- [x] T2.1 Add an empty-value validation helper that accepts env summaries, skip patterns, allow-empty patterns, strict mode, and deprecated keys without adding runtime dependencies. Covers REQ-001, REQ-005, REQ-006, REQ-009, REQ-011.
- [x] T2.2 Integrate validation after env summaries are built and before adapter/list/diff/mutation work. Covers REQ-002, REQ-003, REQ-004, REQ-012.
- [x] T2.3 Ensure validation uses existing production-layered summaries rather than raw duplicate production variant data. Covers REQ-007, REQ-008.
- [x] T2.4 Implement warning-first default and strict nonzero fail-fast behavior. Covers REQ-002, REQ-003, REQ-004, REQ-010.
- [x] T2.5 Add integration tests for warning default, strict failure, dry-run strict failure, skip suppression, allow-empty suppression, deprecated suppression, and production precedence. Covers REQ-001 through REQ-014.

## Phase 3: Documentation And Help

- [x] T3.1 Update README with empty-value validation behavior and examples. Covers REQ-013.
- [x] T3.2 Update `docs/USAGE.md` and `docs/FEATURES.md` with flags/config reference and strict-mode behavior. Covers REQ-013.
- [x] T3.3 Update `examples/env-config.example.yml` with `validation.strictEmptyValues` and `allowEmptySecrets`. Covers REQ-013.
- [x] T3.4 Update CLI help/contextual help for new flags. Covers REQ-013, REQ-015.

## Phase 4: Verification

- [x] T4.1 Run `bun test` and fix failures. Covers REQ-014.
- [x] T4.2 Run targeted manual dry-run examples for warning, strict failure, skip suppression, and allow-empty suppression. Covers REQ-002, REQ-003, REQ-005, REQ-006.
- [x] T4.3 Confirm no secret values appear in validation output. Covers REQ-010.
