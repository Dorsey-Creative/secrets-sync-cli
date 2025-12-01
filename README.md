# secrets-sync-cli

Sync `.env` files and GitHub Actions secrets with lightweight drift detection and guardrails built for monorepos and multi-env apps.

## Why this tool
- Keep production as the canonical source of truth while highlighting drift in other env files.
- Avoid tedious copy/paste when updating GitHub Actions secrets.
- Preview every change with dry-run and optional confirmation gates.

## Prerequisites
- Node 18+ runtime. Development and tests use Bun (`bun install`, `bun test`).
- GitHub CLI (`gh`) authenticated if you want to sync to GitHub Secrets.
- Env files live in `config/env` by default (configurable via `--dir`).

## Install

```bash
# Add to your project (recommended for pinned version)
bun add -D secrets-sync-cli
# or
npm install -D secrets-sync-cli

# Ad-hoc without installing
bunx secrets-sync --help
# or
npx secrets-sync --help
```

## 🚀 Quick start
1) Ensure you have a production file at `config/env/.env` (canonical) and any env-specific files like `.env.staging`.
2) Validate and preview changes:
```bash
# Using bunx/npx (no install needed)
bunx secrets-sync --dry-run
bunx secrets-sync --env staging --dry-run

# If installed locally
secrets-sync --dry-run
```
3) Apply changes (writes backups first):
```bash
secrets-sync --env staging
```
4) Sync to GitHub Actions when `gh` is available:
```bash
secrets-sync --env production --dry-run
```

## Default directory structure
```
your-project/
├── config/
│   └── env/
│       ├── .env                # production (canonical)
│       ├── .env.production     # optional overrides
│       ├── .env.staging
│       ├── .env.development
│       └── required-secrets.json (optional)
└── env-config.yml              # optional CLI defaults
```

## What it does
1. Discover `.env*` files under the configured directory (skips templates/examples).
2. Treat `.env` as canonical; compare other envs against it for missing or extra keys.
3. Optionally validate against `required-secrets.json`.
4. Show a diff and audit summary; in non-dry runs, write updates and timestamped backups.
5. When enabled, push secrets to GitHub Actions using the GitHub CLI (`gh secret` commands).

## ✨ Key features
- Drift detection between production and other environments.
- GitHub Actions sync via `gh` with dry-run safety.
- Optional required-secrets validation.
- Smart skipping for `.example`, `.template`, `.local`, `.test` env files.
- .gitignore protection with `--fix-gitignore`.
- Best-effort secret scrubbing in console/log output to reduce accidental leaks.

## 🔌 Provider support

**Currently supported:**
- ✅ GitHub Actions (via GitHub CLI)

**Planned (see [issue #52](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/52)):**
- ⬜ AWS Secrets Manager
- ⬜ Azure Key Vault
- ⬜ GCP Secret Manager
- ⬜ HashiCorp Vault

## ⚙️ Configuration

**Required secrets (optional)**
`config/env/required-secrets.json`:
```json
{
  "shared": ["API_KEY", "DATABASE_URL"],
  "production": ["PROD_SECRET"],
  "staging": ["STAGING_SECRET"]
}
```

**CLI defaults**
`env-config.yml` (project root):
```yaml
flags:
  skipUnchanged: true
  backupRetention: 5

skipSecrets:
  - DEBUG
  - LOCAL_ONLY_VAR
```

## CLI options

| Flag | Description |
|------|-------------|
| `--env <name>` | Target specific environment |
| `--dir <path>` | Env files directory (default: `config/env`) |
| `--dry-run` | Preview changes without applying |
| `--overwrite` | Apply all changes without prompts |
| `--force, -f` | Use prefixes for production files |
| `--skip-unchanged` | Skip secrets with matching hashes |
| `--no-confirm` | Non-interactive mode |
| `--fix-gitignore` | Add missing .gitignore patterns |
| `--verbose` | Show detailed output |
| `--help, -h` | Show help message |
| `--version, -v` | Show version |

## 💡 Examples

```bash
# Preview changes
secrets-sync --dry-run

# Sync specific environment
secrets-sync --env staging

# Fix .gitignore patterns
secrets-sync --fix-gitignore

# Non-interactive mode (requires --overwrite)
secrets-sync --overwrite --no-confirm
```

## 🔒 Security and data handling
- Scrubbing is best-effort: it hides common secret patterns, but you should still avoid pasting real secrets into terminals or issue trackers.
- Backups are stored locally with timestamps; review before discarding.
- `.gitignore` checks aim to keep env files out of version control, but verify your ignore rules before committing.

## Troubleshooting and docs
- [Contributing Guidelines](CONTRIBUTING.md) — Development setup and workflows.
- [Changelog](CHANGELOG.md) — Release history.
- [Troubleshooting](docs/TROUBLESHOOTING.md) — Common fixes.
- [Error Message Patterns](docs/ERROR_MESSAGES.md) — Error handling standards.

## License
MIT © Dorsey Creative

## Contributing
Issues and PRs welcome. Please read the [contributing guidelines](CONTRIBUTING.md) first.
