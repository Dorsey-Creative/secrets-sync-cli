# Features

Comprehensive guide to all features in secrets-sync-cli.

## Core Features

### 🔍 Discovery & Parsing

Automatically finds and parses `.env` files in your project.

**How it works:**

- Scans the configured directory (default: `config/env`)
- Discovers all `.env*` files
- Parses key-value pairs from each file
- Skips template/example files automatically

**Smart ignoring:**

- `.env.example` - Template files
- `.env.template` - Template files
- `.env.local` - Local development overrides
- `.env.test` - Test environment files

**Example:**

```bash
# Discovers all .env files in config/env
secrets-sync --dry-run

# Custom directory
secrets-sync --dir path/to/env --dry-run
```

### 🎯 Production-First Approach

Uses production (`.env`) as the canonical source of truth.

**Philosophy:**

- Production defines what secrets exist
- Other environments are compared against production
- Missing keys in non-production trigger warnings
- Extra keys in non-production are flagged

**Production file priority:**

1. `.env` - Primary canonical file
2. `.env.production` - Optional overrides (layered by default)
3. `.env.prod` - Alternative production file
4. `.env.prd` - Alternative production file

**Layering behavior:**

```bash
# Default: .env.production overrides .env
secrets-sync --dry-run

# Force mode: Use prefixes instead (PROD_SECRET_KEY)
secrets-sync --force --dry-run
```

### 🔄 Drift Detection

Warns when non-production environments are missing keys from production.

**What it detects:**

- Keys in production but missing in staging/dev
- Keys in staging/dev but not in production
- Value differences (via hash comparison)

**Example output:**

```
[WARN][Drift] Key present only in development but missing in production: DEBUG
[WARN][Drift] Key present only in staging but missing in production: STAGING_ONLY_VAR
```

**Use cases:**

- Catch configuration drift before deployment
- Ensure all environments have required secrets
- Identify orphaned secrets

### 🔐 GitHub Secrets Integration

Sync secrets to GitHub Actions using the GitHub CLI (`gh`).

**Requirements:**

- GitHub CLI (`gh`) installed and authenticated
- Repository access for secret management

**How it works:**

1. Lists existing GitHub secrets
2. Compares with local `.env` files
3. Shows planned changes (CREATE/UPDATE/DELETE)
4. Applies changes with confirmation

**Commands used:**

```bash
gh secret list --json name,updatedAt
gh secret set SECRET_NAME --body value
gh secret delete SECRET_NAME
```

**Example:**

```bash
# Preview GitHub sync
secrets-sync --dry-run

# Apply changes
secrets-sync --overwrite
```

**Drift detection:**

- Tracks GitHub `updatedAt` timestamps
- Detects out-of-band changes (manual edits in GitHub UI)
- Warns when remote secrets modified after last sync

### 🛡️ Safe by Default

Multiple safety mechanisms to prevent accidental changes.

**Dry-run mode:**

```bash
# Preview all changes without applying
secrets-sync --dry-run
```

**Interactive confirmations:**

```bash
# Prompts for each change
secrets-sync

# Approve all at once
secrets-sync --overwrite
```

**Automatic backups:**

- Creates timestamped backups before writing
- Stored in `config/env/bak/`
- Configurable retention (default: 3 backups)

**Backup retention:**

```yaml
# env-config.yml
flags:
  backupRetention: 5  # Keep 5 most recent backups
```

### 📋 Required Secrets Validation

Validate that required secrets exist in each environment.

**Configuration file:**
`config/env/required-secrets.json`

```json
{
  "shared": ["API_KEY", "DATABASE_URL"],
  "production": ["PROD_SECRET"],
  "staging": ["STAGING_SECRET"],
  "development": ["DEV_SECRET"]
}
```

**Validation rules:**

- `shared` - Required in ALL environments
- `production` - Required only in production
- `staging` - Required only in staging
- `development` - Required only in development

**Optional:**
The tool works without this file. Add it when you need validation.

**Location:**
Place in `config/env/` relative to your project root, or specify with `--dir` flag.

**Example:**

```bash
# Validates against required-secrets.json
secrets-sync --dry-run

# Error if required secrets missing
[ERROR] Missing required secrets in production: PROD_SECRET
```

### 🔒 Secret Scrubbing

Automatically redacts secrets from all CLI output to prevent accidental leaks.

**What gets scrubbed:**

- `KEY=value` patterns
- URL credentials (`https://user:pass@host`)
- JWT tokens
- Private keys
- Password fields

**Where scrubbing applies:**

- Console output
- Log files
- Error messages
- Stack traces

**Whitelist:**
Configuration field names are NOT scrubbed:

- `skipSecrets`
- `backupRetention`
- Audit table column names
- CLI option names

**Example:**

```bash
# Secret values show as [REDACTED]
API_KEY=[REDACTED]

# But key names are visible
Secret Name: API_KEY
```

**Best-effort:**
Scrubbing hides common patterns but is not foolproof. Avoid pasting real secrets into terminals or issue trackers.

### ✅ .gitignore Protection

Validates and auto-fixes `.gitignore` patterns to prevent committing secrets.

**Required patterns:**

```gitignore
# Environment files
.env
.env.*
!.env.example
!.env.template

# Backup files
config/env/bak/

# State files
config/env/.secrets-sync-state.json
```

**Validation:**

```bash
# Check .gitignore (warns if patterns missing)
secrets-sync --dry-run
```

**Auto-fix:**

```bash
# Add missing patterns automatically
secrets-sync --fix-gitignore
```

**Skip validation:**

```bash
# Skip .gitignore check
SKIP_GITIGNORE_CHECK=1 secrets-sync --dry-run
```

## Advanced Features

### Configuration File

Load CLI defaults from `env-config.yml` in your project root.

**Full example:**

```yaml
flags:
  skipUnchanged: true
  backupRetention: 5

skipSecrets:
  - DEBUG
  - LOCAL_ONLY_VAR
  - TEST_*
```

**Available options:**

| Option                  | Type    | Description                               |
| ----------------------- | ------- | ----------------------------------------- |
| `flags.skipUnchanged`   | boolean | Skip secrets with matching hashes         |
| `flags.backupRetention` | number  | Number of backups to keep (default: 3)    |
| `skipSecrets`           | array   | Secret names to skip (supports wildcards) |

**Wildcard support:**

```yaml
skipSecrets:
  - TEST_*      # Skips TEST_API_KEY, TEST_SECRET, etc.
  - *_LOCAL     # Skips DB_LOCAL, API_LOCAL, etc.
  - DEBUG       # Exact match only
```

See [USAGE.md](./USAGE.md) for complete configuration reference, environment variables, and CLI options.

### Manifest & State Tracking

Tracks sync state in `config/env/bak/.secrets-sync-state.json`.

**What's tracked:**

- SHA-256 hash of each secret value
- GitHub `updatedAt` timestamp
- Source file for traceability

**Drift detection logic:**

1. Secret missing remotely → CREATE
2. No manifest entry → UPDATE (first sync)
3. Local hash changed → UPDATE (local edit)
4. GitHub timestamp changed → UPDATE (drift detected!)
5. Hash + timestamp match → NOOP (already in sync)
6. Missing timestamp data → UPDATE (ensure convergence)

**With `--skip-unchanged`:**
Trust the manifest even when timestamps are absent. Use when confident in sync state to reduce prompts.

### Production File Layering

Multiple production files can be layered or prefixed.

**Default behavior (layering):**

```bash
# .env.production overrides .env
secrets-sync --dry-run
```

**Force mode (prefixes):**

```bash
# .env.production secrets get PROD_ prefix
secrets-sync --force --dry-run
```

**Example:**

```
.env:
  API_KEY=base_value

.env.production:
  API_KEY=prod_override
  PROD_SECRET=prod_only

# Default (layering):
API_KEY=prod_override
PROD_SECRET=prod_only

# Force mode (prefixes):
API_KEY=base_value
PROD_API_KEY=prod_override
PROD_PROD_SECRET=prod_only
```

### Backup Management

Automatic backup creation and retention management.

**Backup location:**
`config/env/bak/`

**Naming convention:**
`.env.staging-20251130-203045.bak`

**Retention policy:**

```yaml
# env-config.yml
flags:
  backupRetention: 5  # Keep 5 most recent backups per file
```

**Manual cleanup:**

```bash
# Backups are automatically cleaned up
# Oldest backups deleted when retention limit exceeded
```

## Feature Comparison

| Feature                | Free | Enterprise                                                              |
| ---------------------- | ---- | ----------------------------------------------------------------------- |
| Local .env sync        | ✅    | ✅                                                                       |
| GitHub Actions secrets | ✅    | ✅                                                                       |
| Drift detection        | ✅    | ✅                                                                       |
| Secret scrubbing       | ✅    | ✅                                                                       |
| .gitignore protection  | ✅    | ✅                                                                       |
| AWS Secrets Manager    | ❌    | 🔜 [#52](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/52) |
| Azure Key Vault        | ❌    | 🔜 [#52](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/52) |
| GCP Secret Manager     | ❌    | 🔜 [#52](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/52) |
| HashiCorp Vault        | ❌    | 🔜 [#52](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/52) |
| GitLab CI/CD           | ❌    | 🔜 [#54](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/54) |
| Org-level secrets      | ❌    | 🔜 [#53](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/53) |

## Limitations

**Current limitations:**

- GitHub Actions only (AWS/Azure/GCP/Vault coming soon)
- Repository secrets only (org/environment secrets coming soon)
- No GUI (CLI only)
- English only (no translations)
- Requires Node 18+ runtime

**Workarounds:**

- Use GitHub CLI for org-level secrets manually
- Use provider-specific CLIs for AWS/Azure/GCP
- Combine with other tools for advanced workflows

## Roadmap

See [GitHub Issues](https://github.com/Dorsey-Creative/secrets-sync-cli/issues) for planned features:

- [#52](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/52) - Multi-provider support (AWS/Azure/GCP/Vault)
- [#53](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/53) - GitHub org/environment secrets
- [#54](https://github.com/Dorsey-Creative/secrets-sync-cli/issues/54) - GitLab CI/CD support

## See Also

- [README](../README.md) - Quick start guide
- [CONTRIBUTING](../CONTRIBUTING.md) - Development guide
- [TROUBLESHOOTING](./TROUBLESHOOTING.md) - Common issues
- [ERROR_MESSAGES](./ERROR_MESSAGES.md) - Error handling
