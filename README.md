# @joedorsey/secrets-sync

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
bun add @joedorsey/secrets-sync

# Using npm
npm install @joedorsey/secrets-sync

# Using yarn
yarn add @joedorsey/secrets-sync
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

Create `env-config.yml` in your project root:

```yaml
flags:
  skipUnchanged: true
  backupRetention: 5

skipSecrets:
  - DEBUG
  - LOCAL_ONLY_VAR
```

Create `config/env/required-secrets.json`:

```json
{
  "shared": ["API_KEY", "DATABASE_URL"],
  "production": ["PROD_SECRET"],
  "staging": ["STAGING_SECRET"]
}
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
| `--help` | Show help message |
| `--version` | Show version |

## Examples

### Sync staging environment

```bash
secrets-sync --env staging --dry-run
secrets-sync --env staging
```

### Sync all environments with overwrite

```bash
secrets-sync --overwrite --no-confirm
```

### Custom directory

```bash
secrets-sync --dir ./environments
```

## How It Works

1. **Discovery** - Scans `config/env` for `.env` files (ignores templates/examples)
2. **Production First** - Loads `.env` as canonical, optionally layers `.env.production`
3. **Drift Detection** - Compares other environments against production
4. **Validation** - Checks for required secrets
5. **Sync** - Updates target environments with missing keys
6. **Backup** - Creates timestamped backups before changes

## Development

```bash
# Clone the repo
git clone https://github.com/joedorseyjr/secrets-sync-cli.git
cd secrets-sync-cli

# Install dependencies
bun install

# Run in dev mode
bun run dev -- --help

# Run tests
bun test

# Build
bun run build
```

## License

MIT © Joe Dorsey Jr.

## Contributing

Issues and PRs welcome! Please read the contributing guidelines first.

## Related Projects

- [dotenv](https://github.com/motdotla/dotenv) - Load environment variables
- [env-cmd](https://github.com/toddbluhm/env-cmd) - Run commands with environment variables

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.
