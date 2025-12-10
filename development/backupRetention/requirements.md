# Requirements: Backup Retention Deduplication

## Overview

Fix backup retention to prevent duplicate backups with identical content. Ensure users get meaningful, distinct versions for rollback rather than multiple copies of the same content.

---

## User Stories

### US-1: Meaningful Backup Retention

**As a** secrets-sync user  
**I want** backup retention to keep distinct versions of my files  
**So that** I can roll back to different states, not duplicate copies

### US-2: Efficient Storage Usage

**As a** secrets-sync user  
**I want** backup retention to avoid storing duplicate content  
**So that** my disk space isn't wasted on identical backups

### US-3: Reliable Rollback Options

**As a** secrets-sync user  
**I want** each backup to represent a different version  
**So that** I have meaningful rollback options when needed

---

## Functional Requirements

### FR-1: Duplicate Detection

**Requirement:** System must detect when backup content is identical to existing backups  
**Verification:** Test creates multiple backups with same content, system identifies duplicates  
**Priority:** P0 (Critical)

### FR-2: Content-Based Deduplication

**Requirement:** System must remove or skip backups with duplicate content  
**Verification:** Test verifies only unique content versions are retained  
**Priority:** P0 (Critical)

### FR-3: Preserve Most Recent Timestamp

**Requirement:** When deduplicating, system must keep the most recent timestamp for each unique content  
**Verification:** Test verifies newest timestamp is preserved for duplicate content  
**Priority:** P1 (High)

### FR-4: Maintain Retention Count

**Requirement:** System must respect configured retention count for unique versions  
**Verification:** Test verifies exactly N unique versions are kept when configured  
**Priority:** P0 (Critical)

### FR-5: Cross-File Independence

**Requirement:** Deduplication must work independently for each env file (.env, .env.staging, etc.)  
**Verification:** Test verifies retention applies separately to each file's backups  
**Priority:** P1 (High)

---

## Technical Requirements

### TR-1: Content Hash Comparison

**Requirement:** System must use file content hashing to identify duplicates  
**Verification:** Unit test verifies hash-based duplicate detection  
**Priority:** P0 (Critical)

### TR-2: Efficient Hash Algorithm

**Requirement:** System must use fast, collision-resistant hash algorithm (SHA-256 or similar)  
**Verification:** Performance test verifies hashing doesn't significantly slow backup process  
**Priority:** P1 (High)

### TR-3: Backward Compatibility

**Requirement:** Solution must work with existing backup file naming and structure  
**Verification:** Test verifies existing backups are handled correctly  
**Priority:** P0 (Critical)

### TR-4: Error Handling

**Requirement:** System must handle file read errors gracefully during content comparison  
**Verification:** Test verifies graceful handling of permission errors, missing files  
**Priority:** P1 (High)

### TR-5: Performance Impact

**Requirement:** Content comparison must not significantly impact sync performance  
**Verification:** Performance test verifies <100ms overhead for typical backup operations  
**Priority:** P2 (Medium)

---

## Detailed Requirements (from Acceptance Criteria)

### REQ-1: No Duplicate Backups (from AC-1)

**Requirement:** When user runs sync multiple times without changing .env files, duplicate backups are not kept  
**Verification:** 

1. Create initial .env file
2. Run sync 3 times without changes
3. Verify only 1 backup exists (not 3 duplicates)  
   **Priority:** P0 (Critical)

### REQ-2: Duplicate Cleanup (from AC-1)

**Requirement:** When backup retention cleanup runs, duplicate backups with same content are removed  
**Verification:**

1. Manually create 3 backups with identical content
2. Run cleanup process
3. Verify only 1 backup remains  
   **Priority:** P0 (Critical)

### REQ-3: Content-Based Deduplication (from AC-2)

**Requirement:** When multiple backups exist with identical content, only one copy of each unique version is kept  
**Verification:**

1. Create backups: A, A, B, B, C
2. Run deduplication
3. Verify result: A, B, C (one of each)  
   **Priority:** P0 (Critical)

### REQ-4: Timestamp Preservation (from AC-2)

**Requirement:** When deduplicating, the most recent timestamp is preserved for each unique version  
**Verification:**

1. Create: file-v1-10am.bak, file-v1-11am.bak (same content)
2. Run deduplication
3. Verify: file-v1-11am.bak remains (newer timestamp)  
   **Priority:** P1 (High)

### REQ-5: Distinct Version Availability (from AC-3)

**Requirement:** When user has made 5 changes over time, up to N distinct versions are available  
**Verification:**

1. Make 5 different changes to .env file
2. Run sync after each change
3. Verify up to retention-count distinct backups exist  
   **Priority:** P0 (Critical)

### REQ-6: Unique File States (from AC-3)

**Requirement:** Each backup must represent a different state of the file  
**Verification:**

1. Create backups with different content
2. Verify each backup has unique content hash
3. Verify no two backups are identical  
   **Priority:** P0 (Critical)

### REQ-7: Storage Efficiency (from AC-4)

**Requirement:** When user runs sync frequently without changes, storage usage doesn't grow unnecessarily with duplicates  
**Verification:**

1. Run sync 10 times without file changes
2. Verify backup directory size doesn't grow linearly
3. Verify only necessary backups are stored  
   **Priority:** P1 (High)

---

## Non-Functional Requirements

### NFR-1: Performance

**Requirement:** Backup deduplication must complete within 500ms for typical scenarios  
**Verification:** Performance test with 10 backup files  
**Priority:** P2 (Medium)

### NFR-2: Reliability

**Requirement:** Deduplication must not corrupt or lose backup data  
**Verification:** Integrity test verifies backup content after deduplication  
**Priority:** P0 (Critical)

### NFR-3: Cross-Platform Compatibility

**Requirement:** Solution must work on macOS, Linux, and Windows  
**Verification:** Test on all supported platforms  
**Priority:** P1 (High)

---

## Implementation Constraints

- Must use existing `safeReadFile`, `safeWriteFile` utilities
- Must work with current backup file naming: `{filename}-{timestamp}.bak`
- Must not break existing backup/restore functionality
- Must handle file permission errors gracefully
- Should minimize performance impact on sync operations

---

## Success Criteria

1. **Functional:** No duplicate content in backup retention
2. **Performance:** <100ms overhead for backup operations
3. **Reliability:** 100% data integrity during deduplication
4. **Usability:** Users get meaningful rollback options
5. **Efficiency:** Storage usage reflects actual file versions, not duplicates

---

## Testing Requirements

### Unit Tests

- Content hash generation and comparison
- Duplicate detection logic
- Timestamp preservation logic
- Error handling for file operations

### Integration Tests

- End-to-end backup and cleanup process
- Multiple env file handling
- Retention count enforcement
- Cross-platform compatibility

### Performance Tests

- Backup operation timing with/without deduplication
- Memory usage during content comparison
- Large file handling (>1MB env files)

---

## Dependencies

- Existing backup creation logic in `src/secrets-sync.ts`
- `cleanupOldBackups()` function modification
- Node.js `crypto` module for hashing
- Existing `safeFs` utilities for file operations
