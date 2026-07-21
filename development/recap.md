# Recap

## GitHub Token Scope Pre-flight Check (started 2026-07-20T20:21, completed 2026-07-20T20:35)

- Implemented pre-flight token scope detection as a DependencyCheck in src/utils/dependencies.ts
- Added getTokenScopes(), isOrgRepo(), getGhTokenScopeCheck() with graceful degradation for fine-grained PATs
- Enhanced GhCliSecretsAdapter.set() and .delete() with 403 scope error detection and fix suggestions
- Added ERR_TOKEN_SCOPE to error catalog, unit/integration tests, and TROUBLESHOOTING.md section
- All 18 requirements (REQ-001–REQ-018) covered; 351 tests pass, 0 failures
- Feature branch: `feature/gh-token-scope-check`

## Empty Required Secret Validation

- Added fail-fast empty `.env` value detection with `--strict-empty-values` and `--allow-empty` allowlists; 336 tests pass, all 15 requirements (REQ-001–REQ-015) covered in code and tests
- Feature branch: `feature/empty-required-secret-validation`
