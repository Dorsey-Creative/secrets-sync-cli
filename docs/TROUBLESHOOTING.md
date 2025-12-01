# Troubleshooting Guide

Common issues and solutions for secrets-sync-cli.

## Configuration Issues

### "[CONFIG] No required-secrets.json found"

**What it means:** This is a warning, not an error.

**Solution:** The tool works without this file. Create it only if you need validation:

```json
{
  "shared": ["API_KEY", "DATABASE_URL"],
  "production": ["PROD_SECRET"],
  "staging": ["STAGING_SECRET"]
}
```

Place in `config/env/required-secrets.json`.

### "[CONFIG] Failed to load required-secrets.json"

**What it means:** The JSON file exists but has syntax errors.

**Solution:** Validate your JSON:

```bash
cat config/env/required-secrets.json | jq .
```

Fix any syntax errors reported by jq.

## Dependency Issues

### "GitHub CLI (gh) not found"

**What it means:** The GitHub CLI is not installed or not in PATH.

**Solution:** Install the GitHub CLI:

```bash
# macOS
brew install gh

# Linux (Debian/Ubuntu)
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Other platforms
# See https://cli.github.com for installation instructions
```

### "GitHub CLI not authenticated"

**What it means:** The GitHub CLI is installed but not authenticated.

**Solution:** Authenticate with GitHub:

```bash
gh auth login
```

Follow the prompts to authenticate via browser or token.

## Permission Issues

### "Permission denied" reading files

**What it means:** The CLI cannot read a file due to insufficient permissions.

**Solution:** Fix file permissions:

```bash
# For individual files
chmod 644 /path/to/file

# For directories
chmod 755 /path/to/directory

# For all .env files in config/env
chmod 644 config/env/.env*
```

### "Permission denied" writing files

**What it means:** The CLI cannot write to a file or directory.

**Solution:** Fix directory permissions:

```bash
# Make directory writable
chmod 755 /path/to/directory

# If file exists and is read-only
chmod 644 /path/to/file
```

## Network Issues

### "Operation timed out"

**What it means:** A network operation (like gh CLI) took longer than the timeout (default 30s).

**Solution:** Increase the timeout for slow networks:

```bash
# Set timeout to 60 seconds
SECRETS_SYNC_TIMEOUT=60000 secrets-sync --env staging

# Or export for multiple commands
export SECRETS_SYNC_TIMEOUT=60000
secrets-sync --env staging
```

**Other causes:**
- Check your internet connection
- Verify GitHub is accessible: `curl -I https://api.github.com`
- Check if you're behind a proxy or firewall

## Build Issues

### Build fails with "Could not resolve"

**What it means:** Module resolution error during build (fixed in v1.0.1+).

**Solution:** Update to the latest version:

```bash
npm install secrets-sync-cli@latest
# or
bun add secrets-sync-cli@latest
```

### "Cannot find module" errors

**What it means:** Dependencies are not installed or build is outdated.

**Solution:**

```bash
# Reinstall dependencies
rm -rf node_modules bun.lockb bun.lock
bun install

# Rebuild
bun run build
```

## Runtime Issues

### "No .env files found"

**What it means:** The CLI cannot find any `.env` files in the expected directory.

**Solution:**

1. Check the directory structure:
   ```bash
   ls -la config/env/
   ```

2. Verify files exist and are named correctly (`.env`, `.env.staging`, etc.)

3. Use `--dir` flag if files are in a different location:
   ```bash
   secrets-sync --dir ./environments
   ```

### "Drift detected" warnings

**What it means:** Non-production environments are missing keys that exist in production.

**Solution:** This is expected behavior. The CLI will show you what's missing:

```bash
# Preview what will be synced
secrets-sync --dry-run

# Sync the missing keys
secrets-sync --env staging
```

## CI/CD Issues

### Tests fail in CI with dependency errors

**What it means:** CI environment doesn't have gh CLI or authentication.

**Solution:** Skip dependency checks in CI:

```bash
SKIP_DEPENDENCY_CHECK=1 secrets-sync --dry-run
```

Or in GitHub Actions:

```yaml
- name: Run secrets-sync
  run: secrets-sync --dry-run
  env:
    SKIP_DEPENDENCY_CHECK: "1"
```

### Permission errors in CI

**What it means:** CI environment has restrictive file permissions.

**Solution:** Ensure files are readable before running:

```bash
chmod -R 755 config/
chmod 644 config/env/.env*
```

## Getting More Help

If you're still experiencing issues:

1. **Enable verbose mode** for detailed logs:
   ```bash
   secrets-sync --verbose
   ```

2. **Check the error message** - it should include:
   - What failed
   - Why it failed
   - How to fix it (copy-pasteable command)

3. **Search existing issues**: [GitHub Issues](https://github.com/Dorsey-Creative/secrets-sync-cli/issues)

4. **Open a new issue** with:
   - Error message and logs
   - Steps to reproduce
   - Environment details (OS, Bun version, etc.)
   - Output of `secrets-sync --verbose`

5. **Check the documentation**:
   - [README](../README.md) - Overview and usage
   - [CONTRIBUTING](../CONTRIBUTING.md) - Development setup
   - [ERROR_MESSAGES](ERROR_MESSAGES.md) - Error patterns
