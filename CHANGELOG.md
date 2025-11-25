# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-11-24

### Fixed
- Fixed hardcoded import path that prevented package installation (#1)
- Configuration now loads at runtime instead of compile-time
- Tool works without required-secrets.json (validation is optional)

### Changed
- Required secrets configuration is now optional
- Improved error messages for missing or invalid configuration
- All configuration warnings now use [CONFIG] prefix for easy filtering
- Updated package name from `@dorsey-creative/secrets-sync` to `secrets-sync-cli`

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
