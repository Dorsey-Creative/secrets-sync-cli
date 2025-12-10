# Tasks: Backup Retention Deduplication

## Overview

Implementation broken into 3 phases with time estimates and validation steps. Total estimated time: ~3 hours.

---

## Phase 1: Core Deduplication Infrastructure (P0)

**Goal:** Implement content-based deduplication for backup cleanup  
**Time Estimate:** 1.5 hours  
**Requirements:** FR-1, FR-2, TR-1, TR-3, REQ-1, REQ-2, REQ-3

### Task 1.1: Create Backup Utilities Module

**Time:** 30 minutes  
**References:** TR-1 (Content Hash Comparison), Design Section 1

- [x] Create `src/utils/backupUtils.ts`
- [x] Define `BackupInfo` interface
- [x] Implement `generateContentHash()` function using SHA-256
- [x] Add error handling for file read failures
- [x] Export utilities for use in cleanup logic

**Validation:**

```bash
# Unit test the hash function
bun test tests/unit/backupUtils.test.ts

# Manual verification
node -e "
const { generateContentHash } = require('./dist/utils/backupUtils.js');
console.log(generateContentHash('config/env/.env'));
"
```

**End-user success:** Foundation for detecting identical backup content is established.

---

### Task 1.2: Implement Duplicate Detection

**Time:** 30 minutes  
**References:** FR-1 (Duplicate Detection), Design Section 2

- [x] Implement `findDuplicateBackups()` function
- [x] Group backups by content hash
- [x] Handle hash generation failures gracefully
- [x] Add debug logging for duplicate detection

**Validation:**

```typescript
// Test with sample backup files
const backups = [
  { path: 'file1.bak', hash: 'abc123', mtime: 1000, name: 'file1.bak' },
  { path: 'file2.bak', hash: 'abc123', mtime: 2000, name: 'file2.bak' }, // duplicate
  { path: 'file3.bak', hash: 'def456', mtime: 3000, name: 'file3.bak' }
];
const groups = findDuplicateBackups(backups);
// Should group file1 and file2 together
```

**End-user success:** System can identify which backups contain identical content.

---

### Task 1.3: Implement Deduplication Logic

**Time:** 30 minutes  
**References:** FR-2 (Content-Based Deduplication), FR-3 (Preserve Recent Timestamp), REQ-3, REQ-4

- [x] Implement `deduplicateBackups()` function
- [x] Keep newest timestamp for each unique content
- [x] Sort final result by modification time
- [x] Add comprehensive unit tests

**Validation:**

```typescript
// Test deduplication keeps newest of duplicates
const backups = [
  { hash: 'same', mtime: 1000, name: 'old.bak' },
  { hash: 'same', mtime: 2000, name: 'new.bak' },
  { hash: 'diff', mtime: 1500, name: 'unique.bak' }
];
const result = deduplicateBackups(backups);
// Should return: [new.bak (mtime: 2000), unique.bak (mtime: 1500)]
```

**End-user success:** Users get distinct backup versions, not duplicate content.

---

### Task 1.4: Integrate with Cleanup Function

**Time:** 30 minutes  
**References:** TR-3 (Backward Compatibility), REQ-2 (Duplicate Cleanup)

- [x] Modify `cleanupOldBackups()` in `src/secrets-sync.ts`
- [x] Import and use deduplication utilities
- [x] Add debug logging for cleanup operations
- [x] Ensure existing backup structure is preserved

**Validation:**

```bash
# Create test backups with duplicate content
echo "content1" > config/env/bak/.env-20251209T100000Z.bak
echo "content1" > config/env/bak/.env-20251209T110000Z.bak
echo "content2" > config/env/bak/.env-20251209T120000Z.bak

# Run sync to trigger cleanup
secrets-sync --dry-run --verbose

# Verify only unique backups remain
ls config/env/bak/.env-*.bak
# Should show 2 files (content1 newest + content2)
```

**End-user success:** Backup cleanup removes duplicate content automatically.

---

### Phase 1 Acceptance

- [x] Hash generation works for typical .env files
- [x] Duplicate detection identifies identical content
- [x] Deduplication keeps newest timestamp per unique content
- [x] Cleanup removes duplicate backups
- [x] Retention count applies to unique versions only
- [x] All unit tests pass: `bun test tests/unit/backupUtils.test.ts`

---

## Phase 2: Smart Backup Creation (P1)

**Goal:** Prevent duplicate backup creation at source  
**Time Estimate:** 1 hour  
**Requirements:** FR-1, TR-5, REQ-1, REQ-7

### Task 2.1: Implement Smart Backup Creation

**Time:** 45 minutes  
**References:** Design Section 5, REQ-1 (No Duplicate Backups)

- [ ] Create `createBackupIfNeeded()` function
- [ ] Compare content hash before backup creation
- [ ] Skip backup if content matches most recent backup
- [ ] Add debug logging for skipped backups

**Validation:**

```bash
# Test scenario: no changes
echo "API_KEY=test123" > config/env/.env
secrets-sync --dry-run  # Creates first backup

# Run again without changes
secrets-sync --dry-run  # Should skip backup creation

# Verify only 1 backup exists
ls config/env/bak/.env-*.bak | wc -l
# Should output: 1
```

**End-user success:** Users don't get unnecessary duplicate backups when content hasn't changed.

---

### Task 2.2: Integrate Smart Creation

**Time:** 15 minutes  
**References:** TR-3 (Backward Compatibility)

- [ ] Replace `createBackup()` calls with `createBackupIfNeeded()`
- [ ] Ensure all backup creation points use smart logic
- [ ] Maintain existing backup behavior for changed content

**Validation:**

```bash
# Test with content changes
echo "API_KEY=test123" > config/env/.env
secrets-sync --dry-run  # Creates backup

echo "API_KEY=changed" > config/env/.env
secrets-sync --dry-run  # Creates new backup (content changed)

# Verify 2 distinct backups exist
ls config/env/bak/.env-*.bak | wc -l
# Should output: 2
```

**End-user success:** Backups are created only when content actually changes.

---

### Phase 2 Acceptance

- [ ] Backup creation skipped when content unchanged
- [ ] Backup created when content changes
- [ ] Debug logs show skip/create decisions
- [ ] No performance regression in sync operations
- [ ] Integration tests pass

---

## Phase 3: Performance and Polish (P2)

**Goal:** Optimize performance and add monitoring  
**Time Estimate:** 30 minutes  
**Requirements:** TR-2, TR-5, NFR-1

### Task 3.1: Performance Optimization

**Time:** 20 minutes  
**References:** TR-2 (Efficient Hash Algorithm), TR-5 (Performance Impact)

- [ ] Add performance timing for hash operations
- [ ] Optimize for large files (>1MB)
- [ ] Add file size limits if needed
- [ ] Monitor memory usage during deduplication

**Validation:**

```bash
# Test with larger env file
head -c 1048576 /dev/zero > config/env/.env  # 1MB file
time secrets-sync --dry-run --verbose
# Hash generation should complete in <100ms
```

**End-user success:** Backup operations remain fast even with larger files.

---

### Task 3.2: Enhanced Logging and Monitoring

**Time:** 10 minutes  
**References:** Design Monitoring Section

- [ ] Add summary logging for cleanup operations
- [ ] Log storage savings from deduplication
- [ ] Add performance metrics to debug output

**Validation:**

```bash
# Run with verbose logging
secrets-sync --dry-run --verbose

# Should see logs like:
# [DEBUG] Kept 3 unique backups out of 5 total
# [DEBUG] Deduplication saved 2 duplicate files
# [DEBUG] Hash generation took 15ms for .env
```

**End-user success:** Users can understand backup behavior and performance impact.

---

### Phase 3 Acceptance

- [ ] Performance meets targets (<100ms overhead)
- [ ] Logging provides useful insights
- [ ] Memory usage is stable
- [ ] Large files are handled efficiently

---

## Final Validation Checklist

### Functional Validation

- [ ] Run `secrets-sync` multiple times without changes → only 1 backup per file
- [ ] Make 3 different changes → 3 distinct backups created
- [ ] Set `backupRetention: 2` → only 2 unique versions kept
- [ ] Multiple env files → retention works independently

### Performance Validation

- [ ] Backup operations complete within normal time
- [ ] Hash generation <50ms for typical files
- [ ] Cleanup <100ms for 10 backup files
- [ ] Memory usage stable during operations

### Integration Validation

- [ ] All existing tests pass: `bun test`
- [ ] No regression in sync functionality
- [ ] Backup/restore workflow unchanged
- [ ] Cross-platform compatibility maintained

### User Experience Validation

- [ ] Users can roll back to distinct versions
- [ ] Storage usage reflects actual file versions
- [ ] No unnecessary duplicate backups created
- [ ] Retention setting works as expected

---

## Time Summary

| Phase                              | Time Estimate | Priority |
| ---------------------------------- | ------------- | -------- |
| Phase 1: Core Deduplication       | 1.5 hours     | P0       |
| Phase 2: Smart Backup Creation    | 1 hour        | P1       |
| Phase 3: Performance and Polish   | 30 minutes    | P2       |
| **Total**                          | **3 hours**   |          |

---

## Dependencies

### Before Starting
- [ ] All existing tests passing
- [ ] Understanding of current backup creation points
- [ ] Access to test environment with backup directory

### External Dependencies
- Node.js `crypto` module (already available)
- Existing `safeFs` utilities
- Current backup file structure and naming

---

## Risk Mitigation

### Data Loss Prevention
- Always create backup before attempting deduplication
- Use safe defaults (keep duplicates if unsure)
- Comprehensive testing before deployment

### Performance Risk
- Monitor hash generation time
- Add file size limits if needed
- Fallback to original logic if performance degrades

### Compatibility Risk
- Test with existing backup directories
- Ensure no changes to backup file format
- Validate cross-platform behavior
