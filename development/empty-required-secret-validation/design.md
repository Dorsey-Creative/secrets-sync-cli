# Design

## Architecture Overview

Add an empty-value validation pass inside `src/secrets-sync.ts` after env files are parsed and production layering has produced `envSummaries`, but before GitHub secret adapter operations and mutation planning. This keeps validation aligned with the actual desired secret values and preserves canonical production precedence.

## CLI And Configuration

Add flags:

- `--strict-empty-values`: make invalid empty values fatal.
- `--allow-empty <pattern>`: allow a key or wildcard pattern to be empty. This flag should be repeatable and should also accept comma-separated values for shell ergonomics.

Add `env-config.yml` options:

```yaml
validation:
  strictEmptyValues: false

allowEmptySecrets:
  - OPTIONAL_PLACEHOLDER
  - '*_DISABLED'
```

Parser notes:

- Extend the local `parseEnvConfig` section parser to recognize `validation` scalar values and `allowEmptySecrets` list values.
- Merge config and CLI values so CLI values take precedence/add to allowlists.
- Keep `required-secrets.json` unchanged.

## Validation Model

Create a validation helper that receives:

- `envSummaries`
- `skipSecrets`
- `allowEmptySecrets`
- `strictEmptyValues`
- `DEPRECATED_KEYS`

Validation rules:

- A value is empty if `value.trim().length === 0` after existing dotenv parsing.
- Ignore keys matching `skipSecrets`.
- Ignore keys matching `allowEmptySecrets`.
- Ignore keys in `DEPRECATED_KEYS`.
- Inspect summaries produced after production layering so canonical production data wins.
- Warn/fail on the first invalid empty value.
- Include key, source file, and env summary name in the message.
- Do not print secret values.

Recommended message:

```text
[WARN][Empty] Empty value for JWT_SECRET in .env (env: production). Use --allow-empty JWT_SECRET or env-config.yml allowEmptySecrets to allow this intentionally.
```

Strict mode:

- Set `process.exitCode = 1`.
- Return from `main` before adapter/list/diff/mutation operations.
- In dry-run, still exit nonzero because strict mode is intended for CI gating.

## Production Precedence

Default production layering already ignores duplicate keys from `.env.production`, `.env.prod`, and `.env.prd` when `.env` defines the key. Empty validation should operate on `envSummaries`, not raw files, so ignored duplicate values do not cause false failures in production output.

When `--force` is used, production variants become separate prefixed summaries and should be validated independently.

## Error Handling

- Warnings default to stdout/stderr through existing logger helpers.
- Strict failures should use error-level output or clear warning plus nonzero exit; implementation can reuse `logErr` if the message is framed as strict validation failure.
- No stack traces or secret values should be printed.

## Testing Strategy

- Add focused integration tests in `tests/integration/cli-execution.test.ts` or a new integration file.
- Use temporary env directories and `SKIP_DEPENDENCY_CHECK=1`.
- Use `--dry-run` to avoid mutation.
- Include strict-mode assertions for nonzero exit and lack of diff/mutation progression.
- Add config parser tests for `validation.strictEmptyValues` and `allowEmptySecrets`.

## Documentation

Update:

- README safety/config sections.
- `docs/USAGE.md` options/config reference.
- `docs/FEATURES.md` validation features.
- `examples/env-config.example.yml`.
- CLI help/contextual help if this repo supports contextual flag help for new flags.

## Phased Implementation Plan

Phase 1: Parser and flag foundation.

Phase 2: Validation helper and integration before mutation.

Phase 3: Tests and documentation.

Phase 4: Final verification and cleanup.
