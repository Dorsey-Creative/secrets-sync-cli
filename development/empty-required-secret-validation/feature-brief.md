# Empty Required Secret Validation Feature Brief

## Refined Problem Statement

`secrets-sync` currently accepts empty dotenv values such as `JWT_SECRET=`, `JWT_SECRET=""`, and whitespace-only placeholders, then includes those values in sync planning and GitHub secret mutation. In real deployments this can silently replace a valid secret with an empty string and break authentication or downstream services after deploy. Users need early, visible validation that empty values exist before any mutation, while preserving backwards compatibility for teams that intentionally use empty placeholders.

## End-User Success Outcomes

- Users see an immediate warning when any discovered, non-skipped env key has an empty value.
- Users can make empty-value warnings fatal with a strict mode before GitHub secrets are mutated.
- Users can intentionally allow empty values from either CLI or `env-config.yml` without editing `required-secrets.json`.
- Teams using `skipSecrets` do not receive empty-value warnings for secrets they intentionally exclude from sync.
- Canonical production precedence remains intact: if `.env` defines a non-empty value, empty duplicate keys from production variants do not override it and do not produce false production-empty failures.

## Scope Boundaries

In scope:

- Detect empty values in all discovered `.env*` files after existing dotenv parsing.
- Treat exactly empty, whitespace-only, quoted empty, and quoted whitespace values as empty.
- Warn by default in dry-run and normal sync.
- Add strict behavior that stops before mutation and exits nonzero when empty values are found.
- Add CLI and `env-config.yml` controls to allow intentional empty values.
- Respect `skipSecrets` patterns and deprecated key exclusions.
- Document behavior and add tests.

Out of scope:

- GCP Secret Manager support.
- Reworking `required-secrets.json` schema.
- Changing secret diff semantics unrelated to empty values.
- Replacing the existing handwritten YAML parser.
- Persisting validation state.

## Constraints And Assumptions

- Backwards compatibility matters, so warnings are the default behavior.
- Strict mode drives fail-fast/nonzero behavior for both dry-run and normal sync.
- Empty-value allowlisting is configured through CLI and `env-config.yml`, not `required-secrets.json`.
- Deprecated keys should not trigger empty-value validation.
- Existing production layering rules stay unchanged: canonical `.env` values win over duplicate production variants.
- `skipSecrets` already uses uppercase wildcard matching and should suppress empty checks with the same matcher.

## Unresolved Questions

- Exact names for CLI/config controls are not finalized. The recommended names in this plan are `--strict-empty-values`, `--allow-empty`, `validation.strictEmptyValues`, and `allowEmptySecrets`.
- Whether strict empty validation should return immediately after the first finding or report all findings before exiting remains a product choice. This plan uses warn-fast/fail-fast on first finding to match the provided feedback.
