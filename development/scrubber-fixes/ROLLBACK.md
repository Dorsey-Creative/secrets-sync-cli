# Rollback Plan: v1.1.1

## Overview

Emergency rollback procedure if v1.1.1 has critical issues after release.

**Version:** 1.1.1 → 1.1.0  
**Risk Level:** Low (patch release, no breaking changes)  
**Rollback Time:** < 15 minutes

---

## When to Rollback

Rollback if any of these occur within 24 hours of release:

1. **Critical Security Issue**
   - Secrets exposed in output
   - Whitelist allows actual secret leakage
   - Scrubber bypass discovered

2. **Critical Functionality Broken**
   - CLI crashes on startup
   - Cannot sync secrets
   - Data loss or corruption

3. **Performance Degradation**
   - CLI startup > 2x slower
   - Scrubbing causes timeouts
   - Memory leaks

4. **Widespread User Reports**
   - Multiple users report same issue
   - Issue affects core functionality
   - No immediate fix available

---

## Rollback Steps

### Step 1: Verify Issue (5 minutes)

```bash
# Install v1.1.1 and reproduce issue
npm install secrets-sync-cli@1.1.1
secrets-sync --version
# Reproduce reported issue

# Verify issue doesn't exist in v1.1.0
npm install secrets-sync-cli@1.1.0
secrets-sync --version
# Verify issue resolved
```

**Decision Point:** If issue confirmed in v1.1.1 only, proceed with rollback

---

### Step 2: Deprecate v1.1.1 on npm (2 minutes)

```bash
# Deprecate the problematic version
npm deprecate secrets-sync-cli@1.1.1 "Critical issue - use v1.1.0 instead"
```

**Result:** Users see warning when installing v1.1.1

---

### Step 3: Update npm Latest Tag (1 minute)

```bash
# Point latest tag back to v1.1.0
npm dist-tag add secrets-sync-cli@1.1.0 latest
```

**Result:** `npm install secrets-sync-cli` installs v1.1.0

---

### Step 4: Revert Git Changes (3 minutes)

```bash
# Create revert branch
git checkout release
git pull origin release
git checkout -b revert-v1.1.1

# Revert the release commit
git revert <v1.1.1-commit-hash>

# Push revert
git push origin revert-v1.1.1

# Create PR to release branch
# Merge after review
```

**Result:** Release branch back to v1.1.0 state

---

### Step 5: Communicate Rollback (4 minutes)

1. **GitHub Release**
   - Edit v1.1.1 release
   - Add warning banner
   - Link to v1.1.0

2. **Issue Tracker**
   - Create incident issue
   - Document problem and rollback
   - Link to fix timeline

3. **Users (if applicable)**
   - Post announcement
   - Provide upgrade/downgrade instructions

---

## Post-Rollback Actions

### Immediate (Day 1)

- [ ] Verify v1.1.0 is latest on npm
- [ ] Verify v1.1.1 is deprecated
- [ ] Monitor for additional reports
- [ ] Create hotfix branch from v1.1.0
- [ ] Identify root cause

### Short-term (Week 1)

- [ ] Fix root cause
- [ ] Add regression tests
- [ ] Test fix thoroughly
- [ ] Prepare v1.1.2 with fix
- [ ] Update rollback plan with lessons learned

### Long-term (Month 1)

- [ ] Review release process
- [ ] Improve pre-release testing
- [ ] Update CI/CD checks
- [ ] Document incident in postmortem

---

## Specific Rollback Scenarios

### Scenario 1: Whitelist Too Broad

**Symptom:** Actual secrets not being redacted

**Immediate Action:**
```bash
# Deprecate immediately
npm deprecate secrets-sync-cli@1.1.1 "Security issue - secrets may not be redacted"

# Rollback to v1.1.0
npm dist-tag add secrets-sync-cli@1.1.0 latest
```

**Fix for v1.1.2:**
- Review whitelist entries
- Remove problematic entries
- Add security audit tests
- Test with real secret patterns

---

### Scenario 2: Logger Duplicates Worse

**Symptom:** More duplicate logs than before

**Immediate Action:**
```bash
# Deprecate with explanation
npm deprecate secrets-sync-cli@1.1.1 "Logging issue - use v1.1.0"

# Rollback
npm dist-tag add secrets-sync-cli@1.1.0 latest
```

**Fix for v1.1.2:**
- Revert logger changes
- Re-investigate duplicate source
- Test more thoroughly
- Consider deferring fix to v1.2.0

---

### Scenario 3: Performance Regression

**Symptom:** CLI significantly slower

**Immediate Action:**
```bash
# Deprecate with metrics
npm deprecate secrets-sync-cli@1.1.1 "Performance regression - use v1.1.0"

# Rollback
npm dist-tag add secrets-sync-cli@1.1.0 latest
```

**Fix for v1.1.2:**
- Profile performance
- Optimize whitelist lookups
- Add performance benchmarks to CI
- Test with large .env files

---

### Scenario 4: Pre-commit Hook Issues

**Symptom:** Hook prevents legitimate commits

**Immediate Action:**
```bash
# Less critical - can provide workaround
npm deprecate secrets-sync-cli@1.1.1 "Pre-commit hook issue - see workaround"
```

**Workaround for Users:**
```bash
# Temporarily disable hook
chmod -x .husky/pre-commit

# Or skip hook for specific commit
git commit --no-verify
```

**Fix for v1.1.2:**
- Fix hook logic
- Add hook tests
- Document hook behavior

---

## Prevention Measures

### Before Next Release

1. **Enhanced Testing**
   - [ ] Run all manual tests from TESTING.md
   - [ ] Test with real .env files (fake secrets)
   - [ ] Performance benchmarks
   - [ ] Security audit

2. **Staged Rollout**
   - [ ] Publish as `next` tag first
   - [ ] Test in production-like environment
   - [ ] Wait 24 hours before promoting to `latest`

3. **Monitoring**
   - [ ] Watch npm download stats
   - [ ] Monitor GitHub issues
   - [ ] Check error tracking (if available)

4. **Communication**
   - [ ] Clear CHANGELOG
   - [ ] Migration guide (if needed)
   - [ ] Known issues documented

---

## Rollback Checklist

When executing rollback:

- [ ] Issue verified and reproduced
- [ ] v1.1.1 deprecated on npm
- [ ] v1.1.0 tagged as latest
- [ ] Git changes reverted
- [ ] GitHub release updated
- [ ] Incident issue created
- [ ] Users notified (if applicable)
- [ ] Root cause identified
- [ ] Fix plan created
- [ ] Postmortem scheduled

---

## Contact Information

**Rollback Authority:**
- Primary: [Maintainer Name]
- Secondary: [Backup Maintainer]

**Communication Channels:**
- GitHub Issues: [Link]
- Discord/Slack: [Link if applicable]
- Email: [Support email]

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.1.1 | 2025-11-26 | Released | Scrubber fixes |
| 1.1.0 | 2025-11-26 | Stable | Current fallback |
| 1.0.6 | 2025-11-24 | Stable | Previous stable |

---

## References

- **npm Deprecate Docs:** https://docs.npmjs.com/cli/v8/commands/npm-deprecate
- **npm Dist-tag Docs:** https://docs.npmjs.com/cli/v8/commands/npm-dist-tag
- **Git Revert Docs:** https://git-scm.com/docs/git-revert
- **Release Checklist:** `development/scrubber-fixes/RELEASE_CHECKLIST.md`
