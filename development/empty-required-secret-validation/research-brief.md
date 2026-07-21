# Research Brief

## External Research

No external service or third-party API is required for this feature. The implementation uses existing Node/Bun runtime behavior and the repository's current handwritten dotenv and `env-config.yml` parsers.

Verified findings:

- Dotenv-style empty assignments are already parsed by local code as `''` after trimming and quote stripping. This is verified from `src/secrets-sync.ts` `parseDotenvFile`, not external documentation.
- Bun supports `package.json` `overrides`; this repository already uses overrides for vulnerability remediation, but this feature does not add dependencies.

UNVERIFIED:

- No current external dotenv specification was used as normative input. This plan intentionally follows the repository's current parser behavior instead of introducing a new parser dependency.

## Codebase Analysis

Tech stack:

- TypeScript ESM CLI targeting Node 18+.
- Bun for build and tests.
- CLI entrypoint: `src/secrets-sync.ts`.
- Tests use Bun's built-in test runner.

Relevant existing patterns:

- Flags are parsed by `parseFlags(argv)` and merged with `env-config.yml` in `mergeConfigFlags`.
- `env-config.yml` is parsed by a small local parser in `parseEnvConfig`.
- `skipSecrets` is loaded from `env-config.yml`, uppercased, and matched through existing wildcard helpers.
- Dotenv parsing happens in `parseDotenvFile`, which trims values and strips surrounding quotes.
- Required production key existence validation currently runs after env summaries are built in `validateRequiredProductionKeys`.
- Deprecated keys are represented by `DEPRECATED_KEYS` and should be excluded from empty-value checks.
- Desired secrets are built from `envSummaries`; strict validation must run before adapter mutation and preferably before diff planning output becomes misleading.

Integration points:

- Add new `Flags` fields for strict empty validation and allow-empty controls.
- Add new `EnvConfig` fields for validation/allow-empty configuration.
- Add validation after production variants are resolved and env summaries are available, before GitHub adapter/list/diff mutation logic.
- Reuse `matchesSkipPattern` to suppress checks for skipped secrets and allow-empty patterns.
- Update help text, README, docs, and examples.

Risks:

- The current `parseEnvConfig` supports only simple sections and scalar/list values. New config shape should stay simple.
- `--allow-empty` should support repeatable values or comma-separated values without breaking existing flag parsing.
- Warning default may surprise users with intentionally blank placeholders; docs and config examples must make suppression clear.
