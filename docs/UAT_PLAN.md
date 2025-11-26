# User Acceptance Testing Plan

## Objective
Validate that error messages are clear, actionable, and enable users to resolve issues independently within 5 minutes.

## Test Scenarios

### Scenario 1: Fresh Install Without gh CLI

**Setup:**
```bash
# Temporarily hide gh from PATH
export PATH=/usr/bin:/bin
```

**Steps:**
1. Run `secrets-sync --help`
2. Observe error message
3. Follow installation instructions
4. Retry command

**Success Criteria:**
- [ ] User sees clear error about missing gh CLI
- [ ] Installation URL is visible and clickable
- [ ] Platform-specific command is provided
- [ ] User can install gh and retry successfully
- [ ] Time to resolution < 5 minutes

**Expected Output:**
```
❌ Missing required dependencies:

1. GitHub CLI (gh) not found
   Install: https://cli.github.com
   Or run: brew install gh
```

---

### Scenario 2: Permission Denied on .env File

**Setup:**
```bash
chmod 000 config/env/.env
```

**Steps:**
1. Run `secrets-sync --dry-run`
2. Observe error message
3. Copy-paste fix command
4. Retry command

**Success Criteria:**
- [ ] User sees exact file path with permission error
- [ ] chmod command is provided and copy-pasteable
- [ ] User can apply fix without modification
- [ ] Retry succeeds after fix
- [ ] Time to resolution < 2 minutes

**Expected Output:**
```
❌ Failed to read /path/to/config/env/.env
   EACCES: permission denied
   chmod 644 "/path/to/config/env/.env"
```

---

### Scenario 3: Slow Network Timeout

**Setup:**
```bash
# Simulate slow network (if possible)
# Or set very short timeout
export SECRETS_SYNC_TIMEOUT=1000
```

**Steps:**
1. Run `secrets-sync --env staging`
2. Observe timeout error
3. Follow suggestion to increase timeout
4. Retry with increased timeout

**Success Criteria:**
- [ ] User sees timeout duration in error
- [ ] Suggestions are actionable
- [ ] User understands how to increase timeout
- [ ] Retry with longer timeout succeeds
- [ ] Time to resolution < 3 minutes

**Expected Output:**
```
❌ Operation timed out after 1 seconds
   Check your internet connection
   Increase timeout: SECRETS_SYNC_TIMEOUT=60000 secrets-sync ...
```

---

### Scenario 4: Multiple Errors at Once

**Setup:**
```bash
export PATH=/usr/bin:/bin
chmod 000 config/env/.env
```

**Steps:**
1. Run `secrets-sync --dry-run`
2. Observe all errors shown together
3. Resolve each error in order
4. Retry command

**Success Criteria:**
- [ ] User sees all errors at once (not fail-fast)
- [ ] Each error has clear fix instructions
- [ ] User can resolve all issues systematically
- [ ] No hidden errors after first fix
- [ ] Time to resolution < 10 minutes

---

## Feedback Collection

### Questions for Users

1. **Clarity:** Were the error messages clear and understandable?
   - [ ] Very clear
   - [ ] Somewhat clear
   - [ ] Confusing

2. **Actionability:** Could you resolve the issue from the error message alone?
   - [ ] Yes, without external help
   - [ ] Yes, with some searching
   - [ ] No, needed assistance

3. **Time:** How long did it take to resolve the issue?
   - [ ] < 2 minutes
   - [ ] 2-5 minutes
   - [ ] 5-10 minutes
   - [ ] > 10 minutes

4. **Commands:** Were the fix commands copy-pasteable and working?
   - [ ] Yes, worked as-is
   - [ ] Needed minor modification
   - [ ] Didn't work

5. **Improvements:** What would make the error messages better?
   - (Open feedback)

---

## Success Metrics

- **Resolution Time:** Average < 5 minutes per error
- **Self-Service Rate:** 100% of users resolve without asking for help
- **Command Success:** 100% of fix commands work as-is
- **Clarity Score:** 90%+ rate messages as "Very clear"
- **Satisfaction:** 90%+ report positive experience

---

## Test Results

### User 1: [Name]
- Date: [Date]
- Scenarios Tested: [List]
- Resolution Times: [Times]
- Feedback: [Notes]
- Issues Found: [List]

### User 2: [Name]
- Date: [Date]
- Scenarios Tested: [List]
- Resolution Times: [Times]
- Feedback: [Notes]
- Issues Found: [List]

### User 3: [Name]
- Date: [Date]
- Scenarios Tested: [List]
- Resolution Times: [Times]
- Feedback: [Notes]
- Issues Found: [List]

---

## Action Items

Based on UAT feedback:
- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

---

## Sign-off

- [ ] All scenarios tested
- [ ] Success metrics met
- [ ] Feedback incorporated
- [ ] Ready for production

**Tested by:** [Names]  
**Date:** [Date]  
**Approved by:** [Name]
