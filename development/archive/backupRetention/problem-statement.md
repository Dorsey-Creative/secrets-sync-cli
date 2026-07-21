# Problem Statement: Backup Retention Creating Duplicate Files

## Problem Description

The backup retention mechanism is creating duplicate backup files instead of keeping distinct versions. When `backupRetention` is set to 3, the tool keeps 3 backup files but 2 of them contain identical content, rather than 3 different versions of the file.

## Current Behavior

**Configuration:**
```yaml
# env-config.yml
flags:
  backupRetention: 3
```

**Observed behavior:**
- User runs sync operation (no changes to .env file)
- New backup is created with current timestamp
- Cleanup keeps 3 most recent backups by timestamp
- **Problem:** 2+ backups contain identical content (duplicates)
- User cannot roll back to truly different versions

**Example scenario:**
```
10:00 AM → .env-20251209T150000Z.bak (version A)
11:00 AM → .env-20251209T160000Z.bak (version A - duplicate!)
12:00 PM → .env-20251209T170000Z.bak (version A - duplicate!)
```

All 3 backups exist but contain the same content, providing no rollback value.

## Expected Behavior

When `backupRetention: 3` is configured:
1. Tool creates backup only when file content has changed
2. OR tool detects duplicate content and skips backup creation
3. OR tool removes duplicate backups during cleanup
4. Users get 3 distinct versions for meaningful rollback

**Example timeline:**
```
Day 1, 10:00 AM → .env-20251208T150000Z.bak (version A)
Day 1, 2:00 PM  → .env-20251208T190000Z.bak (version B - content changed)
Day 2, 9:00 AM  → No backup (no changes)
Day 2, 11:00 AM → .env-20251209T160000Z.bak (version C - content changed)

Result: 3 distinct versions available for rollback
```

## Root Cause Analysis

**Current backup logic:** Always creates backup before sync, regardless of content changes

**Potential solutions:**
1. **Skip duplicate backups:** Compare file content before creating backup
2. **Deduplicate during cleanup:** Remove backups with identical content
3. **Hash-based detection:** Use file hashes to identify duplicates

**Investigation needed:**
- Where is backup creation triggered?
- Is content comparison feasible at backup time?
- Should we dedupe during cleanup or prevent creation?

## Acceptance Criteria

### AC-1: No Duplicate Backups
**Given** user runs sync multiple times without changing .env files  
**When** backup retention cleanup runs  
**Then** duplicate backups (same content) are not kept  
**And** only distinct versions are retained

### AC-2: Content-Based Deduplication
**Given** multiple backups exist with identical content  
**When** cleanup runs  
**Then** only one copy of each unique version is kept  
**And** the most recent timestamp is preserved for each unique version

### AC-3: Meaningful Rollback Options
**Given** user has made 5 changes over time  
**When** they check backup directory  
**Then** up to N distinct versions are available  
**And** each backup represents a different state of the file

### AC-4: Efficient Storage
**Given** user runs sync frequently without changes  
**When** backups are created  
**Then** storage usage doesn't grow unnecessarily with duplicates

## End-User Success

Users can:
- **Roll back to distinct versions** - each backup represents a different file state
- **Trust backup quality** - no wasted storage on duplicate content
- **Understand backup value** - each backup file serves a purpose
- **Run sync frequently** - without creating meaningless duplicate backups
- **Rely on retention count** - N backups = up to N distinct versions

## Technical Approaches

### Option 1: Skip Duplicate Creation
- Compare file content hash before creating backup
- Skip backup if content matches most recent backup
- Pros: Prevents duplicates at source
- Cons: Requires content comparison on every sync

### Option 2: Deduplicate During Cleanup
- Create backups as normal
- During cleanup, identify duplicates by content hash
- Keep most recent timestamp for each unique content
- Pros: Simpler backup logic, handles existing duplicates
- Cons: Temporary storage of duplicates

### Option 3: Hybrid Approach
- Quick timestamp check for recent backup
- Content hash only if recent backup exists
- Cleanup handles edge cases and existing duplicates

## Out of Scope

- Changing the backup file naming format
- Adding compression for old backups
- Implementing backup rotation strategies (daily/weekly/monthly)
- Cross-environment backup management
- Backup verification or integrity checks

## Technical Constraints

- Must work with existing backup file naming: `{filename}-{timestamp}.bak`
- Must use existing `safeReadDir` and `safeFs` utilities
- Must handle permission errors gracefully
- Must work on all platforms (macOS, Linux, Windows)
- Should not break existing backups or cleanup behavior

## Success Metrics

- Backup count matches `backupRetention` setting after cleanup
- Oldest backups are deleted first (by mtime)
- No orphaned backup files
- Cleanup runs on every backup creation
- Tests verify retention logic works correctly
