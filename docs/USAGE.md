# Usage Guide

Practical guide for using secrets-sync-cli in real-world scenarios.

## Table of Contents

- [Contextual Help](#contextual-help)
- [CLI Options](#cli-options)
- [Environment Variables](#environment-variables)
- [Configuration File](#configuration-file)
- [Common Workflows](#common-workflows)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Contextual Help

Get detailed, contextual help for any flag by adding `--help` after it:

```bash
secrets-sync --force --help
secrets-sync --env --help
secrets-sync --dry-run --help
```

### What You Get

Each flag's help includes:
- **Description**: What the flag does
- **Usage Examples**: Real commands you can copy-paste
- **When to Use**: Scenarios where this flag is helpful
- **When NOT to Use**: Common mistakes to avoid (when applicable)
- **Related Flags**: Other flags that work well together
- **Documentation**: Link to detailed docs

### Examples

```bash
# Learn about the --force flag
secrets-sync --force --help

# Get help for --env flag
secrets-sync --env --help

# Works with short flags too
secrets-sync -f --help
```

### Best Practices

- **Start with contextual help**: Before using a new flag, check its help
- **Copy examples**: Usage examples are tested and safe to copy-paste
- **Check related flags**: Often used together for better workflows
- **Use --dry-run first**: Most examples include --dry-run for safety

### All Flags with Help

All documented flags support contextual help:
- `--env` - Target specific environment
- `--dir` - Custom env files directory
- `--dry-run` - Preview changes
- `--overwrite` - Apply without prompts
- `--skip-unchanged` - Skip unchanged secrets
- `--force` - Use prefixes for production
- `--no-confirm` - Non-interactive mode
- `--fix-gitignore` - Fix .gitignore patterns
- `--verbose` - Detailed output
- `--help` - Show help
- `--version` - Show version

## CLI Options

Complete reference for all command-line flags.

### Basic Options

#### `--env <name>`
Target a specific environment file.

```bash
# Sync staging environment
secrets-sync --env staging

# Sync production
secrets-sync --env production

# Sync development
secrets-sync --env development
```

**How it works:**
- Looks for `.env.<name>` file
- Compares against canonical `.env`
- Shows drift and planned changes

#### `--dir <path>`
Specify custom directory for env files.

```bash
# Custom directory
secrets-sync --dir path/to/env

# Absolute path
secrets-sync --dir /absolute/path/to/env

# Relative path
secrets-sync --dir ../other-project/config/env
```

**Default:** `config/env`

#### `--dry-run`
Preview changes without applying them.

```bash
# Always use dry-run first
secrets-sync --dry-run

# Check specific environment
secrets-sync --env staging --dry-run

# Verify GitHub sync
secrets-sync --dry-run
```

**Best practice:** Always run with `--dry-run` first to preview changes.

### Safety Options

#### `--overwrite`
Apply all changes without prompts.

```bash
# Non-interactive mode (requires --overwrite)
secrets-sync --overwrite --no-confirm

# Preview first, then apply
secrets-sync --dry-run
secrets-sync --overwrite
```

**Use cases:**
- CI/CD pipelines
- Batch updates
- Automated deployments

**Warning:** Skips all confirmation prompts. Use with caution.

#### `--force, -f`
Use prefixes for production files instead of layering.

```bash
# Default behavior (layering)
secrets-sync --dry-run

# Force mode (prefixes)
secrets-sync --force --dry-run
```

**Difference:**
- **Default:** `.env.production` overrides `.env` values
- **Force:** `.env.production` values get `PROD_` prefix

**Example:**
```
.env:
  API_KEY=base

.env.production:
  API_KEY=prod

# Default: API_KEY=prod
# Force: API_KEY=base, PROD_API_KEY=prod
```

#### `--skip-unchanged`
Skip secrets with matching hashes (optimization).

```bash
# Skip unchanged secrets
secrets-sync --skip-unchanged

# Combine with other flags
secrets-sync --skip-unchanged --dry-run
```

**When to use:**
- Large number of secrets
- Frequent syncs
- Confident in sync state

#### `--no-confirm`
Non-interactive mode (requires `--overwrite`).

```bash
# CI/CD mode
secrets-sync --overwrite --no-confirm

# Will fail without --overwrite
secrets-sync --no-confirm  # ERROR
```

**Use cases:**
- Automated scripts
- CI/CD pipelines
- Cron jobs

### Utility Options

#### `--fix-gitignore`
Add missing .gitignore patterns and exit.

```bash
# Check and fix .gitignore
secrets-sync --fix-gitignore
```

**What it adds:**
```gitignore
.env
.env.*
!.env.example
!.env.template
config/env/bak/
config/env/.secrets-sync-state.json
```

#### `--verbose`
Show detailed debug output.

```bash
# Verbose mode
secrets-sync --verbose --dry-run

# See all operations
secrets-sync --verbose
```

**Shows:**
- File discovery process
- Parsing details
- Comparison logic
- API calls

#### `--help, -h`
Show help message.

```bash
secrets-sync --help
secrets-sync -h
```

#### `--version, -v`
Show version number.

```bash
secrets-sync --version
secrets-sync -v
```

## Environment Variables

Control tool behavior via environment variables.

> **Note:** Currently, environment variables must be set via shell. Support for configuring these in `env-config.yml` is planned in [issue #55](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/55).

### `SKIP_DEPENDENCY_CHECK`

Skip dependency validation (useful in CI/CD).

```bash
# Skip gh CLI check
SKIP_DEPENDENCY_CHECK=1 secrets-sync --dry-run

# CI/CD pipeline
SKIP_DEPENDENCY_CHECK=1 secrets-sync --overwrite --no-confirm
```

**When to use:**
- CI/CD environments where gh CLI isn't needed
- Testing without GitHub integration
- Local development without gh CLI

**Default:** `false` (checks are performed)

### `SKIP_GITIGNORE_CHECK`

Skip .gitignore validation.

```bash
# Skip .gitignore check
SKIP_GITIGNORE_CHECK=1 secrets-sync --dry-run

# Useful when .gitignore is managed elsewhere
SKIP_GITIGNORE_CHECK=1 secrets-sync
```

**When to use:**
- .gitignore managed by another tool
- Testing in isolated environments
- Custom ignore patterns

**Default:** `false` (validation performed)

### `SECRETS_SYNC_TIMEOUT`

Custom timeout for network operations (milliseconds).

```bash
# Increase timeout for slow networks
SECRETS_SYNC_TIMEOUT=60000 secrets-sync --dry-run

# Very slow connection
SECRETS_SYNC_TIMEOUT=120000 secrets-sync
```

**Default:** `30000` (30 seconds)

**When to use:**
- Slow network connections
- Large number of secrets
- Rate-limited APIs

### `SECRETS_SYNC_MOCK`

Enable mock mode for testing (internal use).

```bash
# Mock mode (testing only)
SECRETS_SYNC_MOCK=1 secrets-sync --dry-run
```

**Use cases:**
- Unit testing
- Integration testing
- Development without real secrets

**Warning:** For testing only. Do not use in production.

### Combining Environment Variables

```bash
# CI/CD with custom timeout
SKIP_DEPENDENCY_CHECK=1 \
SECRETS_SYNC_TIMEOUT=60000 \
secrets-sync --overwrite --no-confirm

# Testing mode
SKIP_DEPENDENCY_CHECK=1 \
SKIP_GITIGNORE_CHECK=1 \
SECRETS_SYNC_MOCK=1 \
secrets-sync --dry-run
```

## Configuration File

Load CLI defaults from `env-config.yml` in your project root.

### Location

```
your-project/
├── env-config.yml          # Configuration file
├── config/
│   └── env/
│       ├── .env
│       └── .env.staging
└── package.json
```

### Full Example

```yaml
# env-config.yml
flags:
  skipUnchanged: true
  backupRetention: 5

skipSecrets:
  - DEBUG
  - LOCAL_ONLY_VAR
  - TEST_*
  - *_LOCAL
```

### Options Reference

#### `flags.skipUnchanged`

Skip secrets with matching hashes.

```yaml
flags:
  skipUnchanged: true
```

**Type:** `boolean`  
**Default:** `false`

#### `flags.backupRetention`

Number of backup files to keep per env file.

```yaml
flags:
  backupRetention: 5
```

**Type:** `number`  
**Default:** `3`

**Backup location:** `config/env/bak/`

#### `skipSecrets`

Array of secret names to skip (supports wildcards).

```yaml
skipSecrets:
  - DEBUG              # Exact match
  - TEST_*             # Prefix wildcard
  - *_LOCAL            # Suffix wildcard
  - *_TEMP_*           # Contains wildcard
```

**Type:** `array<string>`  
**Default:** `[]`

**Wildcard patterns:**
- `TEST_*` - Matches `TEST_API_KEY`, `TEST_SECRET`, etc.
- `*_LOCAL` - Matches `DB_LOCAL`, `API_LOCAL`, etc.
- `*_TEMP_*` - Matches `API_TEMP_KEY`, `DB_TEMP_URL`, etc.

### Configuration Priority

1. CLI flags (highest priority)
2. Configuration file (`env-config.yml`)
3. Default values (lowest priority)

**Example:**
```bash
# Config file sets skipUnchanged: true
# CLI flag overrides it
secrets-sync --skip-unchanged=false
```

## Common Workflows

### First-Time Setup

```bash
# 1. Install
npm install -D secrets-sync-cli

# 2. Create directory structure
mkdir -p config/env

# 3. Create production file
touch config/env/.env

# 4. Fix .gitignore
secrets-sync --fix-gitignore

# 5. Preview
secrets-sync --dry-run
```

### Daily Development

```bash
# Check for drift
secrets-sync --dry-run

# Sync staging
secrets-sync --env staging --dry-run
secrets-sync --env staging

# Update production
secrets-sync --dry-run
secrets-sync --overwrite
```

### Adding New Secrets

```bash
# 1. Add to production .env
echo "NEW_SECRET=value" >> config/env/.env

# 2. Preview changes
secrets-sync --dry-run

# 3. Sync to GitHub
secrets-sync --overwrite

# 4. Update other environments
secrets-sync --env staging
secrets-sync --env development
```

### Syncing Across Environments

```bash
# Sync all environments
for env in staging development; do
  echo "Syncing $env..."
  secrets-sync --env $env --dry-run
  secrets-sync --env $env --overwrite
done
```

### Batch Updates

```bash
# Preview all changes first
secrets-sync --dry-run

# Apply all changes
secrets-sync --overwrite --no-confirm
```

### Recovering from Backups

```bash
# Backups are in config/env/bak/
ls -la config/env/bak/

# Restore from backup
cp config/env/bak/.env.staging-20251130-203045.bak config/env/.env.staging
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Sync Secrets

on:
  push:
    branches: [main]
    paths:
      - 'config/env/.env'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Sync secrets
        env:
          SKIP_DEPENDENCY_CHECK: '1'
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx secrets-sync --overwrite --no-confirm
```

### GitLab CI

```yaml
sync-secrets:
  stage: deploy
  script:
    - npm ci
    - SKIP_DEPENDENCY_CHECK=1 npx secrets-sync --overwrite --no-confirm
  only:
    changes:
      - config/env/.env
```

### Jenkins

```groovy
pipeline {
  agent any
  
  stages {
    stage('Sync Secrets') {
      when {
        changeset "config/env/.env"
      }
      steps {
        sh '''
          npm ci
          SKIP_DEPENDENCY_CHECK=1 npx secrets-sync --overwrite --no-confirm
        '''
      }
    }
  }
}
```

### CircleCI

```yaml
version: 2.1

jobs:
  sync-secrets:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run: npm ci
      - run:
          name: Sync secrets
          command: |
            SKIP_DEPENDENCY_CHECK=1 npx secrets-sync --overwrite --no-confirm
          environment:
            SKIP_DEPENDENCY_CHECK: '1'

workflows:
  version: 2
  sync:
    jobs:
      - sync-secrets:
          filters:
            branches:
              only: main
```

## Troubleshooting

### Common Issues

#### "gh CLI not found"

```bash
# Install GitHub CLI
brew install gh  # macOS
# or
winget install GitHub.cli  # Windows

# Authenticate
gh auth login
```

#### "Permission denied" errors

```bash
# Check file permissions
ls -la config/env/

# Fix permissions
chmod 644 config/env/.env*
chmod 755 config/env/
```

#### Secrets not syncing

```bash
# Check GitHub authentication
gh auth status

# Verify repository access
gh repo view

# Check for errors
secrets-sync --verbose --dry-run
```

#### Backup directory full

```bash
# Reduce retention
# env-config.yml
flags:
  backupRetention: 3

# Or manually clean up
rm config/env/bak/*.bak
```

### Debug Mode

```bash
# Verbose output
secrets-sync --verbose --dry-run

# Check dependency status
gh --version
node --version

# Verify configuration
cat env-config.yml
```

### Getting Help

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review [ERROR_MESSAGES.md](./ERROR_MESSAGES.md)
3. Search [GitHub Issues](https://github.com/Dorsey-Creative/secrets-sync-cli/issues)
4. Open a new issue with `--verbose` output

## See Also

- [README](../README.md) - Quick start guide
- [FEATURES](./FEATURES.md) - Feature documentation
- [CONTRIBUTING](../CONTRIBUTING.md) - Development guide
- [TROUBLESHOOTING](./TROUBLESHOOTING.md) - Common issues
