# Canonical Override Pattern

## Overview

The **Canonical Override Pattern** is a strategy for managing environment-specific secrets that minimizes duplication by establishing a canonical (production) baseline and selectively overriding values for other environments.

## Problem

Traditional multi-environment secret management requires duplicating every secret for each environment:

```
# ❌ Traditional approach - lots of duplication
MAILGUN_API_KEY=prod-key-123
MAILGUN_DOMAIN=notifications.example.com
RATE_LIMIT_MAX=100
PROFILE_TWITTER=https://twitter.com/example
# ... 50 more secrets

STAGING_MAILGUN_API_KEY=staging-key-456
STAGING_MAILGUN_DOMAIN=staging.notifications.example.com
STAGING_RATE_LIMIT_MAX=100  # Same as production!
STAGING_PROFILE_TWITTER=https://twitter.com/example  # Same as production!
# ... 50 more duplicated secrets
```

**Issues:**
- High maintenance burden (update secrets in multiple places)
- Easy to miss updates (staging gets stale)
- Verbose configuration files

## Solution

Use **canonical (unprefixed) secrets as defaults** and only override what differs per environment:

```
# ✅ Canonical Override Pattern
# Production/canonical values (unprefixed)
MAILGUN_API_KEY=prod-key-123
MAILGUN_DOMAIN=notifications.example.com
RATE_LIMIT_MAX=100
PROFILE_TWITTER=https://twitter.com/example

# Staging overrides (only what's different)
STAGING_MAILGUN_API_KEY=staging-key-456
STAGING_MAILGUN_DOMAIN=staging.notifications.example.com
```

**Benefits:**
- **DRY (Don't Repeat Yourself):** Only specify differences
- **Maintainable:** Update shared values once
- **Clear intent:** Overrides explicitly show what differs per environment

## Implementation with secrets-sync-cli

### Step 1: Structure Your Secrets

**config/env/.env** (canonical/production):
```bash
# Mailgun Configuration
MAILGUN_API_KEY=prod-api-key
MAILGUN_DOMAIN=notifications.example.com
MAILGUN_BASE_URL=https://api.mailgun.net

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_HOURS=1

# Social Profiles (shared across all environments)
PROFILE_TWITTER=https://twitter.com/example
PROFILE_INSTAGRAM=https://instagram.com/example
PROFILE_LINKEDIN=https://linkedin.com/company/example
```

**config/env/.env.staging** (overrides only):
```bash
# Only override what's different for staging
MAILGUN_API_KEY=staging-api-key
MAILGUN_DOMAIN=staging.notifications.example.com
```

### Step 2: Sync to GitHub

```bash
# Sync all secrets to GitHub
bun run secrets-sync

# Result in GitHub Secrets:
# - MAILGUN_API_KEY (production value)
# - MAILGUN_DOMAIN (production value)
# - MAILGUN_BASE_URL (shared)
# - RATE_LIMIT_MAX_REQUESTS (shared)
# - RATE_LIMIT_WINDOW_HOURS (shared)
# - PROFILE_TWITTER (shared)
# - PROFILE_INSTAGRAM (shared)
# - PROFILE_LINKEDIN (shared)
# - STAGING_MAILGUN_API_KEY (staging override)
# - STAGING_MAILGUN_DOMAIN (staging override)
```

### Step 3: Apply Overrides in GitHub Actions

Use a two-pass approach in your workflow:

```yaml
- name: Apply Canonical Override Pattern
  env:
    SECRETS_JSON: ${{ toJSON(secrets) }}
  run: |
    # Pass 1: Write all canonical (unprefixed) secrets
    echo "$SECRETS_JSON" | jq -r 'to_entries[] | select(.key | startswith("STAGING_") | not) | select(.key | startswith("FIREBASE_SERVICE_ACCOUNT") | not) | select(.key | startswith("GITHUB_") | not) | "\(.key)=\(.value)"' > .env
    
    # Pass 2: Override with STAGING_ prefixed secrets
    echo "$SECRETS_JSON" | jq -r 'to_entries[] | select(.key | startswith("STAGING_")) | "\(.key)=\(.value)"' | while IFS='=' read -r key value; do
      if [ -n "$value" ]; then
        # Strip STAGING_ prefix
        canonical_key="${key#STAGING_}"
        # Replace or append
        if grep -q "^${canonical_key}=" .env; then
          sed -i "s|^${canonical_key}=.*|${canonical_key}=${value}|" .env
        else
          echo "${canonical_key}=${value}" >> .env
        fi
      fi
    done
```

**Result in .env:**
```bash
MAILGUN_API_KEY=staging-api-key  # ← Overridden
MAILGUN_DOMAIN=staging.notifications.example.com  # ← Overridden
MAILGUN_BASE_URL=https://api.mailgun.net  # ← Canonical
RATE_LIMIT_MAX_REQUESTS=100  # ← Canonical
RATE_LIMIT_WINDOW_HOURS=1  # ← Canonical
PROFILE_TWITTER=https://twitter.com/example  # ← Canonical
PROFILE_INSTAGRAM=https://instagram.com/example  # ← Canonical
PROFILE_LINKEDIN=https://linkedin.com/company/example  # ← Canonical
```

## Use Cases

### Firebase Cloud Functions

Deploy functions with environment-specific configuration:

```yaml
deploy-staging:
  runs-on: ubuntu-latest
  steps:
    - name: Create functions .env with overrides
      env:
        SECRETS_JSON: ${{ toJSON(secrets) }}
      run: |
        cd functions
        # Apply canonical override pattern (see above)
        # ... two-pass script ...
        
    - name: Deploy to Firebase
      run: firebase deploy --only functions --project staging
```

### Multi-Region Deployments

```bash
# .env (canonical - us-east-1)
AWS_REGION=us-east-1
DATABASE_URL=postgres://prod-us-east.example.com

# .env.eu (EU overrides)
AWS_REGION=eu-west-1
DATABASE_URL=postgres://prod-eu-west.example.com
```

### Feature Flags

```bash
# .env (production - conservative)
FEATURE_NEW_UI=false
FEATURE_BETA_API=false

# .env.staging (staging - test new features)
FEATURE_NEW_UI=true
FEATURE_BETA_API=true
```

## Best Practices

### 1. Establish Clear Canonical Values

Choose production as your canonical environment:
- Most stable
- Most scrutinized
- Represents "source of truth"

### 2. Use Consistent Prefixes

```bash
# ✅ Good - clear prefix convention
STAGING_API_KEY=...
STAGING_DATABASE_URL=...

# ❌ Bad - inconsistent
STG_API_KEY=...
STAGING_DATABASE_URL=...
```

### 3. Document Overrides

Add comments explaining why overrides exist:

```bash
# .env.staging
# Use test Mailgun account to avoid sending real emails
STAGING_MAILGUN_API_KEY=test-key-456
STAGING_MAILGUN_DOMAIN=sandbox.mailgun.org
```

### 4. Minimize Overrides

Only override what's truly different:

```bash
# ✅ Good - only override what differs
STAGING_API_KEY=staging-key

# ❌ Bad - unnecessary override
STAGING_APP_NAME=MyApp  # Same as production!
```

### 5. Validate Overrides

Use `env-config.yml` to document expected overrides:

```yaml
# env-config.yml
environments:
  staging:
    requiredOverrides:
      - MAILGUN_API_KEY
      - MAILGUN_DOMAIN
    optionalOverrides:
      - RATE_LIMIT_MAX_REQUESTS
```

## Troubleshooting

### Override Not Applied

**Problem:** Staging still uses production value

**Solution:** Check prefix matches exactly:
```bash
# ❌ Wrong
staging_MAILGUN_API_KEY=...  # lowercase prefix

# ✅ Correct
STAGING_MAILGUN_API_KEY=...  # uppercase prefix
```

### Secrets Out of Sync

**Problem:** Staging has stale canonical values

**Solution:** Re-run secrets-sync after updating canonical secrets:
```bash
# Update .env
vim config/env/.env

# Sync to GitHub
bun run secrets-sync --overwrite
```

### Missing Canonical Secret

**Problem:** Override exists but no canonical value

**Solution:** Add canonical value to `.env`:
```bash
# .env
NEW_SECRET=canonical-value

# .env.staging (override)
STAGING_NEW_SECRET=staging-value
```

## Related Patterns

- **Environment Prefixing:** Use `STAGING_`, `DEV_`, `PROD_` prefixes
- **Layered Configuration:** Merge multiple config sources (env vars, files, secrets)
- **Secrets Inheritance:** Child environments inherit from parent

## See Also

- [USAGE.md](./USAGE.md) - Basic secrets-sync-cli usage
- [FEATURES.md](./FEATURES.md) - Environment prefixing feature
- [examples/](../examples/) - Example configurations
