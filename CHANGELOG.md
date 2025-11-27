# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Publish workflow now correctly bumps patch versions from prerelease format (e.g., 1.1.0-20251126.1 → 1.1.1)
- Pre-commit hook now allows version changes on release branch (CI-managed)
- Version command now reads from package.json instead of hardcoded value
- Version and help commands now exit early without loading config (no unnecessary warnings)

### Changed

- Post-release sync now pushes to version-specific develop branch (e.g., 1.1.1-develop) instead of creating PR
- Help screen simplified and cleaned up (removed technical details, added examples)
- Flag descriptions clarified: `--overwrite` vs `--force` distinction now clear

### Added

- Integration tests for version command (-v and --version flags)

## [1.1.1] - 2025-11-26

### Fixed

- Configuration fields and audit table columns now display correctly
- Logger output no longer duplicates (each message appears exactly once)

### Added

- Example directory for local testing (`bun run setup:example`)
- Pre-commit hook to validate version format

## [1.1.0] - 2025-11-26

### Added

- **Secret Scrubbing**: Automatic redaction of secrets from all CLI output (#11)
  - Always-on scrubbing for console, logs, errors, and stack traces
  - Pattern detection for KEY=value, URLs, JWT tokens, and private keys
  - High performance with minimal overhead
  - User-configurable patterns via `env-config.yml`
  - 62 tests: 27 unit + 17 integration + 8 E2E + 10 security audit
- **.gitignore Protection**: Validation and auto-fix for secret file patterns (#11)
  - Startup validation warns about missing patterns
  - `--fix-gitignore` flag to automatically add required patterns
  - Preserves existing .gitignore configuration
  - Cross-platform path normalization
  - 17 tests: 12 unit + 5 integration
- Comprehensive error handling with structured error classes and centralized message catalog (#5)
- Logger module with 4 levels (ERROR, WARN, INFO, DEBUG) and `--verbose` flag (#5, #7)
- Dependency validation at startup (gh CLI, gh auth, Node.js >= 18) with parallel checks < 1s (#5)
- Safe file operations with automatic fix commands for permission errors (#5)
- Network timeout protection (default 30s) with AbortController cleanup (#5)
- Environment variables: `SKIP_DEPENDENCY_CHECK` for CI/CD, `SECRETS_SYNC_TIMEOUT` for slow networks (#5)
- CONTRIBUTING.md with development guidelines, code style, testing requirements, and PR process (#14)
- docs/TROUBLESHOOTING.md with detailed solutions for common issues (#14)
- TypeScript strict mode configuration (#2)
- Code quality checks with jscpd (0% duplication) (#5)

### Changed

- All file operations use safe wrappers with error handling and context (#5)
- All command executions have timeout protection to prevent infinite hangs (#5)
- Error messages show exact paths, reasons, and copy-pasteable fix commands (#5)
- README simplified and restructured: moved development details to CONTRIBUTING.md, detailed troubleshooting to docs/ (#14)

### Fixed

- CI publish workflow now versions before build to ensure correct version in dist/ artifacts
- CI publish workflow commits and tags after npm publish for atomic releases
- CI publish workflow builds before testing to ensure dist/ artifacts exist
- CI publish workflow fetches full git history for correct version detection
- Added separate pre-flight checks workflow for PRs to release branch

## [1.0.6] - 2025-11-24

### Fixed

- Fixed hardcoded import path that prevented package installation (#1)
- Configuration now loads at runtime instead of compile-time
- Tool works without required-secrets.json (validation is optional)
- Workflows now only trigger manually or on schedule (not on every push)
- Fixed develop-build workflow permissions for automated version bumps
- Fixed current version format to use date-based format (YYYYMMDD.X) in `package.json`

### Changed

- Required secrets configuration is now optional
- Improved error messages for missing or invalid configuration
- All configuration warnings now use [CONFIG] prefix for easy filtering
- Updated package name from `@dorsey-creative/secrets-sync` to `secrets-sync-cli`
- Build versions now use date-based format (YYYYMMDD.X) that resets daily
- Recreated publish workflow with fresh workflow_dispatch trigger

### Added

- Comprehensive test suite with 11 passing tests (5 unit + 5 integration)
- Troubleshooting guide in README
- Cross-platform support for test fixtures
- CI-only publishing enforcement
- Changelog update checks in pre-push hook and GitHub Actions
- npm provenance and trusted publishing (no tokens required)
- Release script for controlled publishing from release branch only
- Dedicated release branch for production deployments
- Nightly builds from develop branch published with `next` tag

## [1.0.0] - 2025-11-23

### Added

- Initial release
- Environment file discovery with smart ignoring
- Production-first secret resolution
- Drift detection across environments
- GitHub Secrets integration
- Dry-run mode
- Backup creation with retention
- Required secrets validation
- YAML configuration support
- Comprehensive CLI options
