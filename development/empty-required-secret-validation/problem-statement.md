# Problem Statement

## Problem

`secrets-sync` currently treats blank dotenv values as valid secret values. A placeholder such as `JWT_SECRET=` can be included in a dry-run plan and later pushed to GitHub Actions secrets as an empty string without a clear warning. This creates a high-risk misconfiguration path: the CLI appears to succeed, but the deployed application may fail only after the empty value is consumed.

## Target Personas

- Application developers managing local `.env*` files and GitHub Actions secrets.
- DevOps maintainers running `secrets-sync` in CI.
- Teams adopting prefix-based multi-environment secret workflows.

## Goals

- Detect empty env values early in both dry-run and normal sync.
- Preserve backwards compatibility by warning by default.
- Support strict mode for CI or release workflows that must fail before mutation.
- Support intentional empty values through CLI/config allowlists.
- Keep validation consistent with existing `skipSecrets`, deprecated key, and production layering semantics.

## Non-Goals

- Do not add a new provider.
- Do not redesign `required-secrets.json`.
- Do not replace the dotenv parser.
- Do not change GitHub secret sync behavior except when strict validation blocks execution.

## Success Criteria

- Empty values are visible in CLI output before mutation.
- `--strict-empty-values` exits nonzero in dry-run and normal sync when a non-allowed, non-skipped empty value is found.
- `--allow-empty KEY` and config-based allowlists suppress warnings/failures for intentional empty values.
- `skipSecrets` suppresses empty validation for matching keys.
- Production canonical precedence does not produce false failures for duplicate empty keys from production variants when `.env` has a non-empty value.
- Tests cover parser handling, CLI warnings, strict failure, skip suppression, allow-empty suppression, and production layering.

## Assumptions And Constraints

- Empty values include exact empty, whitespace-only, quoted empty, and quoted whitespace.
- Deprecated keys are ignored by empty validation.
- The first empty finding should warn/fail immediately.
- Existing backup and diff behavior should remain unchanged when strict mode is not enabled.
