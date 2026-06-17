# Test Plan

## Unit And Parser Tests

- TC-REQ-001-A: Given `KEY=`, `KEY=   `, `KEY=""`, and `KEY="   "`, parsed values are detected as empty. Covers REQ-001.
- TC-REQ-003-A: `parseFlags(['--strict-empty-values'])` enables strict empty validation. Covers REQ-003, REQ-015.
- TC-REQ-006-A: `parseFlags(['--allow-empty', 'OPTIONAL_ONE', '--allow-empty', 'OPTIONAL_TWO,OPTIONAL_THREE'])` collects all allow-empty patterns. Covers REQ-006, REQ-015.
- TC-REQ-006-B: `env-config.yml` with `allowEmptySecrets` parses list patterns. Covers REQ-006.
- TC-REQ-006-C: `env-config.yml` with `validation.strictEmptyValues: true` enables strict mode. Covers REQ-006.

## Integration Tests

- TC-REQ-002-A: In dry-run without strict mode, an empty `.env` key emits a warning and exits zero. Covers REQ-002, REQ-004.
- TC-REQ-003-A: In normal sync mode with strict mode, an empty key exits nonzero before mutation. Covers REQ-003, REQ-012.
- TC-REQ-004-A: In dry-run with strict mode, an empty key exits nonzero. Covers REQ-004.
- TC-REQ-005-A: A key matching `skipSecrets` does not emit an empty warning or strict failure. Covers REQ-005.
- TC-REQ-006-D: A key matching `--allow-empty` does not emit an empty warning or strict failure. Covers REQ-006.
- TC-REQ-006-E: A key matching `allowEmptySecrets` in config does not emit an empty warning or strict failure. Covers REQ-006.
- TC-REQ-007-A: `.env` has `JWT_SECRET=nonempty` and `.env.production` has `JWT_SECRET=`; validation does not fail production output because canonical wins. Covers REQ-007.
- TC-REQ-008-A: With `--force`, `.env.production` containing `JWT_SECRET=` is validated as its own prefixed summary and warns/fails unless allowed. Covers REQ-008.
- TC-REQ-009-A: Deprecated key `MAGIC_LINK_BASE_URL=` does not emit empty warning or strict failure. Covers REQ-009.
- TC-REQ-010-A: Empty validation output includes key, file, and env, and does not include any non-empty secret values. Covers REQ-010.
- TC-REQ-011-A: Dependency diff confirms no new runtime dependency is added for empty-value validation. Covers REQ-011.
- TC-REQ-014-A: Full `bun test` suite passes after adding parser, validation, integration, and docs coverage. Covers REQ-014.

## Documentation Checks

- TC-REQ-013-A: README, usage docs, feature docs, and example config mention strict mode and allow-empty configuration. Covers REQ-013.
- TC-REQ-015-A: Help output includes the new flags and examples. Covers REQ-015.
