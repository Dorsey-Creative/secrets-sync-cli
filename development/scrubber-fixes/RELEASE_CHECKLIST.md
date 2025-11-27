# Release Checklist: v1.1.1

## Pre-Release (Day Before)

### Code Complete
- [ ] All Phase 1 tasks complete (whitelist enhancement)
- [ ] All Phase 2 tasks complete (logger deduplication)
- [ ] All Phase 3 tasks complete (example directory + pre-commit hook)
- [ ] All Phase 4 tasks complete (performance testing + documentation)

### Testing
- [ ] All automated tests pass (254+ tests)
- [ ] All manual tests from TESTING.md pass
- [ ] Performance benchmarks pass (< 1ms, < 500ms startup)
- [ ] Test coverage > 80%
- [ ] Security audit tests pass
- [ ] No regressions found

### Documentation
- [ ] CHANGELOG.md updated (high-level only, no implementation details)
- [ ] README.md reviewed (no changes needed for patch)
- [ ] TESTING.md complete
- [ ] ROLLBACK.md complete
- [ ] RELEASE_CHECKLIST.md complete (this file)

### Version
- [ ] package.json version = 1.1.1
- [ ] Version committed to git

---

## Release Day - Morning

### Final Validation (30 minutes)
- [ ] Pull latest from release branch
- [ ] Clean install dependencies
  ```bash
  rm -rf node_modules bun.lockb
  bun install
  ```
- [ ] Build project
  ```bash
  bun run build
  ```
- [ ] Run full test suite
  ```bash
  bun test
  ```
- [ ] Run manual tests (critical paths only)
  ```bash
  bun run dev -- --dry-run
  bun run dev -- --dir example/config/env --dry-run
  ```

### Pre-flight Checks (15 minutes)
- [ ] Git status clean
- [ ] No uncommitted changes
- [ ] On release branch
- [ ] Latest commit is version bump
- [ ] All CI checks passing

---

## Release Day - Publish

### Create Release PR (10 minutes)
- [ ] Create PR from develop to release
- [ ] PR title: "Release v1.1.1"
- [ ] PR description includes:
  - [ ] Link to CHANGELOG
  - [ ] Summary of fixes
  - [ ] Testing completed
  - [ ] Breaking changes: None
- [ ] Request review
- [ ] Wait for approval

### Merge and Tag (5 minutes)
- [ ] Merge PR to release
- [ ] Verify CI passes on release branch
- [ ] Create git tag
  ```bash
  git tag v1.1.1
  git push origin v1.1.1
  ```

### Publish to npm (5 minutes)
- [ ] Trigger publish workflow (manual or automatic)
- [ ] Verify workflow completes successfully
- [ ] Check npm registry
  ```bash
  npm view secrets-sync-cli version
  # Should show: 1.1.1
  ```
- [ ] Test installation
  ```bash
  npm install secrets-sync-cli@1.1.1
  secrets-sync --version
  # Should show: 1.1.1
  ```

### Create GitHub Release (10 minutes)
- [ ] Go to GitHub Releases
- [ ] Create new release from v1.1.1 tag
- [ ] Release title: "v1.1.1 - Scrubber Fixes"
- [ ] Release notes (copy from CHANGELOG, high-level only):
  ```markdown
  ## Fixes
  
  - Fixed scrubber over-redaction of configuration values
  - Fixed scrubber over-redaction of audit table key names
  - Fixed duplicate log entries
  - Added example/ directory for local testing
  - Added pre-commit hook to prevent example/ commits
  - Performance validated (no regressions)
  
  ## Installation
  
  \`\`\`bash
  npm install secrets-sync-cli@1.1.1
  \`\`\`
  
  ## Full Changelog
  
  See [CHANGELOG.md](link)
  ```
- [ ] Publish release

---

## Post-Release - Immediate (1 hour)

### Verification (15 minutes)
- [ ] Verify npm shows v1.1.1 as latest
  ```bash
  npm view secrets-sync-cli dist-tags
  ```
- [ ] Test fresh installation
  ```bash
  mkdir test-install
  cd test-install
  npm init -y
  npm install secrets-sync-cli
  npx secrets-sync --version
  ```
- [ ] Verify GitHub release visible
- [ ] Verify git tag pushed

### Monitoring (30 minutes)
- [ ] Watch npm download stats
- [ ] Monitor GitHub issues for new reports
- [ ] Check CI/CD for any failures
- [ ] Review error logs (if available)

### Communication (15 minutes)
- [ ] Update project status (if applicable)
- [ ] Notify team of release
- [ ] Post announcement (if applicable)

---

## Post-Release - Day 1

### Issue Triage
- [ ] Review any new issues reported
- [ ] Categorize by severity
- [ ] Respond to user questions
- [ ] Create hotfix branch if critical issue found

### Metrics
- [ ] Check npm download count
- [ ] Review installation success rate
- [ ] Monitor performance metrics (if available)
- [ ] Check error rates (if available)

### Decision Point
- [ ] If critical issues: Execute ROLLBACK.md
- [ ] If minor issues: Plan v1.1.2
- [ ] If no issues: Continue monitoring

---

## Post-Release - Week 1

### Stability Assessment
- [ ] No critical issues reported
- [ ] No rollback required
- [ ] Download stats normal
- [ ] User feedback positive

### Cleanup
- [ ] Close completed issues
- [ ] Update project board
- [ ] Archive release branch (optional)
- [ ] Plan next release (if needed)

### Documentation
- [ ] Update any outdated docs
- [ ] Add FAQ entries if needed
- [ ] Document lessons learned

---

## Rollback Trigger

If any of these occur, execute ROLLBACK.md immediately:

- [ ] Secrets exposed in output
- [ ] CLI crashes on startup
- [ ] Data loss or corruption
- [ ] Performance degradation > 2x
- [ ] Multiple critical bug reports

---

## Success Criteria

Release considered successful if after 7 days:

- [ ] No critical issues reported
- [ ] No rollback required
- [ ] Download stats stable or increasing
- [ ] No performance regressions
- [ ] User feedback neutral or positive
- [ ] All tests still passing

---

## Lessons Learned Template

After release (Week 1):

```markdown
## Release Postmortem: v1.1.1

### What Went Well
- [List successes]

### What Could Be Improved
- [List improvements]

### Action Items
- [ ] [Specific improvements for next release]

### Metrics
- Time to release: X hours
- Issues found: X
- Rollback required: Yes/No
- User satisfaction: X/10
```

---

## Emergency Contacts

**Release Manager:** [Name]  
**Backup:** [Name]  
**Security Contact:** [Name]  
**Infrastructure:** [Name]

---

## References

- **CHANGELOG:** `CHANGELOG.md`
- **Testing Guide:** `development/scrubber-fixes/TESTING.md`
- **Rollback Plan:** `development/scrubber-fixes/ROLLBACK.md`
- **Requirements:** `development/scrubber-fixes/requirements.md`
- **Design:** `development/scrubber-fixes/design.md`
- **Tasks:** `development/scrubber-fixes/tasks.md`
