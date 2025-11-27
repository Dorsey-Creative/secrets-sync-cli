# BUG

These are bugs in production: 

1. There are duplicate logs, the time stamps should be stored somewhere correct? and have a limit as to how many logs to keep? Not sure if this is normal for cli apps. 
   
   ```log
   [2025-11-26T13:55:56.607Z] [WARN] [CONFIG] No required-secrets.json found, skipping validation
   [WARN] [CONFIG] No required-secrets.json found, skipping validation
   ```

2. The skipSecrets should not be `'[REDACTED]'` as you need to see the values that should not be uploaded. 

3. The secret in the `Audit Summary` should not be `'[REDACTED]'` as these are the names of the keys, or should they be? is that a threat vector? 

4. We need an `example/` directory that is never commited or shipped that we can run test locally to catch these. How can we add that.

```shell
➜  swarmer-marketing git:(landing-page) ✗ bunx secrets-sync --dry-run
[2025-11-26T13:55:56.607Z] [WARN] [CONFIG] No required-secrets.json found, skipping validation
[WARN] [CONFIG] No required-secrets.json found, skipping validation
🔐 Secrets Sync CLI
================================
⚠️  Security Warning: Your .gitignore may not protect secrets

Missing patterns in .gitignore:
  - .env
  - .env.*
  - **/bak/
  - *.bak

These files contain secrets and should not be committed.

Fix: Run with --fix-gitignore flag
  secrets-sync --fix-gitignore

Parsed options:
┌─────────────┬───────────────────┐
│ (index)     │ Values            │
├─────────────┼───────────────────┤
│ env         │ '(not specified)' │
│ dir         │ 'config/env'      │
│ dryRun      │ true              │
│ overwrite   │ false             │
│ force       │ false             │
│ noConfirm   │ false             │
│ skipSecrets │ '[REDACTED]'      │
└─────────────┴───────────────────┘

Discovered env files (ordered):
- .env -> env: production (keys: 7) prefix: (none)
[2025-11-26T13:55:56.617Z] [INFO] Using gh CLI adapter to read existing GitHub secrets
[INFO] Using gh CLI adapter to read existing GitHub secrets
[WARN] Unable to invoke gh CLI: Bun is not defined

Diff Summary (no mutations)
  create: 7, update: 0, delete: 0, unchanged: 0
  create:
   - GITHUB_PROFILE
   - INSTAGRAM_PROFILE
   - LINKEDIN_PROFILE
   - MAILGUN_API_KEY
   - MAILGUN_BASE_URL
   - MAILGUN_DOMAIN
   - TWITTER_PROFILE
[2025-11-26T13:55:56.619Z] [INFO] Dry-run mode: no prompts, no mutations.
[INFO] Dry-run mode: no prompts, no mutations.

Audit Summary
┌─────────┬──────────────┬────────┬──────────┬───────────┐
│ (index) │ secret       │ source │ action   │ status    │
├─────────┼──────────────┼────────┼──────────┼───────────┤
│ 0       │ '[REDACTED]' │ '.env' │ 'create' │ 'planned' │
│ 1       │ '[REDACTED]' │ '.env' │ 'create' │ 'planned' │
│ 2       │ '[REDACTED]' │ '.env' │ 'create' │ 'planned' │
│ 3       │ '[REDACTED]' │ '.env' │ 'create' │ 'planned' │
│ 4       │ '[REDACTED]' │ '.env' │ 'create' │ 'planned' │
│ 5       │ '[REDACTED]' │ '.env' │ 'create' │ 'planned' │
│ 6       │ '[REDACTED]' │ '.env' │ 'create' │ 'planned' │
└─────────┴──────────────┴────────┴──────────┴───────────┘

[2025-11-26T13:55:56.620Z] [INFO] Initialization complete: files scanned, production resolved, dotenv parsed, drift warnings emitted.
[OK] Initialization complete: files scanned, production resolved, dotenv parsed, drift warnings emitted.
```
