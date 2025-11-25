# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Error handling foundation: structured error classes with context support (#5)
- Centralized error message catalog with consistent "what, why, how to fix" format (#5)
- Logger module with 4 levels (ERROR, WARN, INFO, DEBUG) and colored output (#5)
- `--verbose` flag to enable debug logging for troubleshooting (#5)
- Error message builder with ANSI colors and template interpolation (#5)
- Dependency validation at startup: checks for gh CLI, gh auth, and Node.js >= 18 (#5)
- Parallel dependency checks with session caching (< 1 second total) (#5)
- `SKIP_DEPENDENCY_CHECK` environment variable for CI/CD pipelines (#5)
- Platform-specific installation instructions for missing dependencies (#5)
- Safe file operations module with permission error handling (#5)
- Automatic fix commands for permission errors (chmod suggestions) (#5)
- Graceful handling of unreadable/unwritable files and directories (#5)
- Comprehensive unit tests for error handling (80 tests, 100% coverage) (#5)
- Integration tests for dependency validation (8 tests) (#5)
- Integration tests for file permissions (7 tests) (#5)
- TypeScript configuration (tsconfig.json) with strict mode enabled (#2)
- Proper type checking for all flags and function parameters

### Changed

- All file operations now use safe wrappers with error handling (#5)
- File permission errors now show exact paths and fix commands (#5)
- Error messages include context for easier debugging (#5)

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
