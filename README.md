# secrets-sync-cli

CLI tool for syncing environment secrets across environments with drift detection and GitHub Secrets integration.

## Features

- 🔍 **Discovery & Parsing** - Automatically finds and parses `.env` files
- 🎯 **Production-First** - Uses production as canonical source of truth
- 🔄 **Drift Detection** - Warns when non-production environments are missing keys
- 🔐 **GitHub Secrets** - Sync secrets to GitHub Actions
- 🛡️ **Safe by Default** - Dry-run mode, confirmations, backups
- 📋 **Required Secrets** - Validate against required secrets config
- 🚫 **Smart Ignoring** - Skips `.example`, `.template`, `.local`, `.test` files

## Installation

```bash
# Using bun
bun add secrets-sync-cli

# Using npm
npm install secrets-sync-cli

# Using yarn
yarn add secrets-sync-cli
```

## Usage

### Basic Commands

```bash
# Dry run (preview changes without applying)
secrets-sync --dry-run

# Sync secrets
secrets-sync

# Sync specific environment
secrets-sync --env staging

# Overwrite without confirmation
secrets-sync --overwrite --no-confirm

# Show help
secrets-sync --help
```

### Configuration

Create `config/env/required-secrets.json` to validate required secrets:

```json
{
  "shared": ["API_KEY", "DATABASE_URL"],
  "production": ["PROD_SECRET"],
  "staging": ["STAGING_SECRET"]
}
```

**Optional:** The tool works without this file. Add it when you need validation.

**Location:** Place in `config/env/` relative to your project root, or specify with `--dir` flag.

Create `env-config.yml` in your project root:

```yaml
flags:
  skipUnchanged: true
  backupRetention: 5

skipSecrets:
  - DEBUG
  - LOCAL_ONLY_VAR
```

### Directory Structure

```
your-project/
├── config/
│   └── env/
│       ├── .env                    # Production (canonical)
│       ├── .env.production         # Production overrides (optional)
│       ├── .env.staging
│       ├── .env.development
│       └── required-secrets.json
└── env-config.yml
```

## CLI Options

| Flag | Description |
|------|-------------|
| `--env <name>` | Target specific environment |
| `--dir <path>` | Custom env directory (default: `config/env`) |
| `--dry-run` | Preview changes without applying |
| `--overwrite` | Overwrite existing files |
| `--force` | Skip all confirmations |
| `--no-confirm` | Skip confirmation prompts |
| `--skip-unchanged` | Skip files with no changes |
| `--verbose` | Show detailed debug output |
| `--help` | Show help message |
| `--version` | Show version |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRETS_SYNC_TIMEOUT` | Timeout for network operations (ms) | `30000` (30s) |
| `SKIP_DEPENDENCY_CHECK` | Skip dependency validation (for CI/CD) | `false` |

## Examples

### Basic Usage

```bash
# Sync staging environment
secrets-sync --env staging --dry-run
secrets-sync --env staging

# Sync all environments with overwrite
secrets-sync --overwrite --no-confirm

# Custom directory
secrets-sync --dir ./environments
```

### Environment Variables

```bash
# Increase timeout for slow networks
SECRETS_SYNC_TIMEOUT=60000 secrets-sync --env staging

# Skip dependency checks in CI
SKIP_DEPENDENCY_CHECK=1 secrets-sync --dry-run
```

## How It Works

1. **Discovery** - Scans `config/env` for `.env` files (ignores templates/examples)
2. **Production First** - Loads `.env` as canonical, optionally layers `.env.production`
3. **Drift Detection** - Compares other environments against production
4. **Validation** - Checks for required secrets
5. **Sync** - Updates target environments with missing keys
6. **Backup** - Creates timestamped backups before changes

## Troubleshooting

### Common Issues

**"GitHub CLI (gh) not found"**
```bash
brew install gh  # macOS
# See https://cli.github.com for other platforms
```

**"GitHub CLI not authenticated"**
```bash
gh auth login
```

**"Permission denied" errors**
```bash
chmod 644 /path/to/file      # For files
chmod 755 /path/to/directory # For directories
```

**"Operation timed out"**
```bash
SECRETS_SYNC_TIMEOUT=60000 secrets-sync --env staging
```

For more troubleshooting help, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Documentation

- [Contributing Guidelines](CONTRIBUTING.md) - Development setup and contribution process
- [Changelog](CHANGELOG.md) - Release history and version notes
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Detailed troubleshooting guide
- [Error Message Patterns](docs/ERROR_MESSAGES.md) - Error handling standards

## License

MIT © Dorsey Creative

## Contributing

Issues and PRs welcome! Please read the [contributing guidelines](CONTRIBUTING.md) first.

## Related Projects

- [dotenv](https://github.com/motdotla/dotenv) - Load environment variables
- [env-cmd](https://github.com/toddbluhm/env-cmd) - Run commands with environment variables
