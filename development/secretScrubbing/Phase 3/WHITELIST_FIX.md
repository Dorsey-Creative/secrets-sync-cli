# Whitelist Fix: SECRETS_SYNC_TIMEOUT

**Date:** 2025-11-26  
**Issue:** Timeout suggestion value was being scrubbed  
**Priority:** P2  
**Status:** ✅ FIXED

---

## Problem

The timeout error message includes an actionable fix command:
```
Increase timeout: SECRETS_SYNC_TIMEOUT=60000 secrets-sync ...
```

However, the scrubber was treating `SECRETS_SYNC_TIMEOUT` as a secret key because:
1. `isSecretKey()` returns `true` for any key containing "secret"
2. No whitelist entry existed for this environment variable

This caused the output to be:
```
Increase timeout: SECRETS_SYNC_TIMEOUT=[REDACTED] secrets-sync ...
```

**Impact:** Users could not see the recommended timeout value, making the fix command non-actionable.

---

## Root Cause

In `src/utils/scrubber.ts`, the `WHITELIST_KEYS` Set did not include `secrets_sync_timeout`:

```typescript
const WHITELIST_KEYS = new Set([
  'debug', 'node_env', 'port',
  'host', 'hostname', 'path',
  'log_level', 'verbose',
  // Missing: 'secrets_sync_timeout'
]);
```

---

## Solution

Added `secrets_sync_timeout` to the whitelist:

```typescript
const WHITELIST_KEYS = new Set([
  'debug', 'node_env', 'port',
  'host', 'hostname', 'path',
  'log_level', 'verbose',
  'secrets_sync_timeout',  // ✅ Added
]);
```

---

## Verification

### Before Fix
```bash
$ bun -e "
import { formatTimeoutError } from './src/utils/errorMessages';
import { TimeoutError } from './src/utils/errors';
const error = new TimeoutError('GitHub API call', 30000);
console.log(formatTimeoutError(error));
"

# Output:
Increase timeout: SECRETS_SYNC_TIMEOUT=[REDACTED] secrets-sync ...
```

### After Fix
```bash
$ bun -e "
import { formatTimeoutError } from './src/utils/errorMessages';
import { TimeoutError } from './src/utils/errors';
const error = new TimeoutError('GitHub API call', 30000);
console.log(formatTimeoutError(error));
"

# Output:
Increase timeout: SECRETS_SYNC_TIMEOUT=60000 secrets-sync ...
```

---

## Test Coverage

### Updated Tests

**tests/unit/errorMessages.test.ts:**
- Restored original test expecting `60000` value (not just key name)

**tests/unit/scrubber.test.ts:**
- Added `SECRETS_SYNC_TIMEOUT=60000` to whitelist key test
- Added `secrets_sync_timeout: 60000` to whitelist object property test

### Test Results
```bash
bun test
✅ 219 pass, 0 fail
```

---

## Design Principle

**Whitelist Strategy:**
- Configuration values (DEBUG, NODE_ENV, PORT) → Never scrub
- Timeout values (SECRETS_SYNC_TIMEOUT) → Never scrub
- Actual secrets (API_KEY, PASSWORD, TOKEN) → Always scrub

**Rationale:**
- Fix commands must remain actionable
- Timeout values are not secrets
- Users need to see the recommended value to resolve the issue

---

## Related Files

**Modified:**
- `src/utils/scrubber.ts` - Added `secrets_sync_timeout` to whitelist
- `tests/unit/errorMessages.test.ts` - Restored original test expectation
- `tests/unit/scrubber.test.ts` - Added whitelist coverage

**No Breaking Changes:**
- All 219 tests pass
- Existing functionality preserved
- Only affects timeout error messages

---

## Lessons Learned

1. **Whitelist Review:** When adding scrubbing to new areas, review all fix commands for non-secret values
2. **Test Actionability:** Tests should verify fix commands remain actionable, not just that scrubbing occurs
3. **Documentation:** Whitelist entries should be documented with rationale

---

## Status

✅ **FIXED AND VERIFIED**

- Timeout suggestions now show actual values
- Fix commands remain actionable
- All tests pass
- No regression in security (actual secrets still scrubbed)
