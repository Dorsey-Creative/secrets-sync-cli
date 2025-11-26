# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-11-25

### Added

- Comprehensive error handling with structured error classes and centralized message catalog (#5)
- Logger module with 4 levels (ERROR, WARN, INFO, DEBUG) and `--verbose` flag (#5, #7)
- Dependency validation at startup (gh CLI, gh auth, Node.js >= 18) with parallel checks < 1s (#5)
- Safe file operations with automatic fix commands for permission errors (#5)
- Network timeout protection (default 30s) with AbortController cleanup (#5)
- Environment variables: `SKIP_DEPENDENCY_CHECK` for CI/CD, `SECRETS_SYNC_TIMEOUT` for slow networks (#5)
- 116 new tests: 89 unit, 22 integration, 5 E2E (100% coverage for error modules) (#5)
- Documentation: error patterns, troubleshooting guide, UAT plan, performance benchmarks (#5, #16)
- Code quality checks with jscpd (0% duplication) (#5)
- TypeScript strict mode configuration (#2)

### Changed

- All file operations use safe wrappers with error handling and context (#5)
- All command executions have timeout protection to prevent infinite hangs (#5)
- Error messages show exact paths, reasons, and copy-pasteable fix commands (#5)

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
