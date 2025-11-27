# Example Directory

**Purpose:** Local testing environment for secrets-sync-cli development.

**⚠️ WARNING:** This directory is excluded from git and npm packages. Never commit real secrets here.

## Quick Setup

```bash
# Run setup script to create example files
bun run setup:example

# Test CLI with example files
bun run dev -- --dir example/config/env --dry-run
```

## Usage

```bash
# Test CLI with example files
bun run dev -- --dir example/config/env --dry-run

# Test sync to staging
bun run dev -- --dir example/config/env --env staging --dry-run

# Test with overwrite
bun run dev -- --dir example/config/env --env staging --overwrite --dry-run
```

## Setup

1. Create sample `.env` files in `example/config/env/`:
   ```bash
   # Production (canonical)
   echo "API_KEY=test_api_key_123" > example/config/env/.env
   echo "DATABASE_URL=postgres://user:pass@localhost/db" >> example/config/env/.env
   
   # Staging
   echo "API_KEY=staging_key_456" > example/config/env/.env.staging
   echo "STAGING_ONLY=staging_value" >> example/config/env/.env.staging
   ```

2. Run CLI against example directory:
   ```bash
   bun run dev -- --dir example/config/env --dry-run
   ```

## Safety

- **Git:** `example/` is in `.gitignore` - files never committed
- **NPM:** `example/` excluded from package distribution
- **Fake Data:** Only use test/fake secrets in this directory
- **Local Only:** This directory exists only on your machine

## Testing Scenarios

### Drift Detection
```bash
# Create production with keys staging is missing
echo "NEW_KEY=value" >> example/config/env/.env
bun run dev -- --dir example/config/env --env staging --dry-run
# Expected: Warning about missing NEW_KEY in staging
```

### Scrubbing
```bash
# Verify secrets are redacted in output
bun run dev -- --dir example/config/env --dry-run
# Expected: Values show [REDACTED], keys visible
```

### Options Table
```bash
# Verify configuration visible
bun run dev -- --dir example/config/env --skip-unchanged --dry-run
# Expected: Options table shows skipUnchanged: true
```
