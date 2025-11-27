# Traceability Matrix: Scrubber Over-Redaction Fixes

## Overview

This matrix maps requirements → design → tasks → validation to ensure complete coverage and traceability.

**Version:** 1.1.1 (patch release)  
**Last Updated:** 2025-11-26

---

## Forward Traceability: Requirements → Design → Tasks

### User Story US-1: View Skip Configuration

| Requirement | Design Component | Tasks | Validation Method |
|-------------|------------------|-------|-------------------|
| US-1 | Component 1: Scrubber Whitelist | Task 1.1, 1.3, 1.4, 1.5 | Manual CLI test + Integration test |
| AC: skipSecrets visible | Add `skipsecrets` to whitelist | Task 1.1 | `bun run dev -- --dry-run` |
| AC: No redaction | Whitelist all option fields | Task 1.3 | Integration test: options-output.test.ts |

### User Story US-2: View Audit Key Names

| Requirement | Design Component | Tasks | Validation Method |
|-------------|------------------|-------|-------------------|
| US-2 | Component 1: Scrubber Whitelist | Task 1.2, 1.4, 1.6 | Manual CLI test + Integration test |
| AC: Key names visible | Add `secret`, `key`, `name` to whitelist | Task 1.2 | `bun run dev -- --dry-run` |
| AC: Values redacted | Verify scrubber still works | Task 1.6 | Integration test: audit-output.test.ts |

### User Story US-3: Single Log Output

| Requirement | Design Component | Tasks | Validation Method |
|-------------|------------------|-------|-------------------|
| US-3 | Component 2: Logger Deduplication | Task 2.1-2.7 | Manual CLI test + Integration test |
| AC: No duplicates | Fix logger/bootstrap | Task 2.5 | `grep "WARN" \| wc -l` = 1 |
| AC: Consistent timestamps | Verify log format | Task 2.7 | Integration test: logger-output.test.ts |

### User Story US-4: Local Testing Environment

| Requirement | Design Component | Tasks | Validation Method |
|-------------|------------------|-------|-------------------|
| US-4 | Component 3: Example Directory | Task 3.1-3.6 | Manual test + E2E test |
| AC: example/ exists | Create directory structure | Task 3.1 | `ls -la example/` |
| AC: Git ignored | Add to .gitignore | Task 3.2 | `git status` |
| AC: NPM excluded | Verify package.json | Task 3.3 | `npm pack` + inspect tarball |

---

## Functional Requirements Traceability

### FR-1: Scrubber Whitelist Enhancement

| Sub-Req | Design | Task | Test | Validation Command |
|---------|--------|------|------|-------------------|
| FR-1.1 | Component 1 | Task 1.1 | Unit: scrubber-whitelist.test.ts | `isSecretKey('skipsecrets')` = false |
| FR-1.2 | Component 1 | Task 1.2 | Unit: scrubber-whitelist.test.ts | `isSecretKey('secret')` = false |
| FR-1.3 | Component 1 | Task 1.3 | Integration: options-output.test.ts | Options table readable |
| FR-1.4 | Component 1 | Task 1.2 | Integration: audit-output.test.ts | Audit table shows key names |
| FR-1.5 | Component 1 | Task 1.4 | Unit: scrubber-whitelist.test.ts | All whitelist tests pass |

### FR-2: Logging Deduplication

| Sub-Req | Design | Task | Test | Validation Command |
|---------|--------|------|------|-------------------|
| FR-2.1 | Component 2 | Task 2.1-2.4 | Manual investigation | Debug logging traces duplicates |
| FR-2.2 | Component 2 | Task 2.5 | Unit: logger-singleton.test.ts | Logger outputs once per call |
| FR-2.3 | Component 2 | Task 2.5 | Integration: logger-output.test.ts | Timestamps consistent |
| FR-2.4 | Component 2 | Task 2.7 | Integration: logger-output.test.ts | No duplicate entries |

### FR-3: Example Directory Setup

| Sub-Req | Design | Task | Test | Validation Command |
|---------|--------|------|------|-------------------|
| FR-3.1 | Component 3 | Task 3.1 | Manual | `ls -la example/config/env/` |
| FR-3.2 | Component 3 | Task 3.2 | E2E: example-directory.test.ts | `git status` excludes example/ |
| FR-3.3 | Component 3 | Task 3.3 | E2E: example-directory.test.ts | `npm pack` excludes example/ |
| FR-3.4 | Component 3 | Task 3.4, 3.5 | Manual | Documentation complete |

---

## Technical Requirements Traceability

### TR-1: Scrubber Pattern Matching

| Test Case | Design | Task | Validation |
|-----------|--------|------|------------|
| TR-1.1 | Component 1 | Task 1.4 | Unit test: `isSecretKey('skipsecrets')` = false |
| TR-1.2 | Component 1 | Task 1.4 | Unit test: `isSecretKey('secret')` = false |
| TR-1.3 | Component 1 | Task 1.4 | Unit test: `isSecretKey('API_KEY')` = true |
| TR-1.4 | Component 1 | Task 1.4 | Unit test: Case-insensitive matching |

### TR-2: Logger Architecture

| Investigation | Design | Task | Validation |
|---------------|--------|------|------------|
| TR-2.1 | Component 2 | Task 2.2 | `grep "new Logger()"` finds instances |
| TR-2.2 | Component 2 | Task 2.4 | Map log flow diagram |
| TR-2.3 | Component 2 | Task 2.3 | Check bootstrap patch guard |
| TR-2.4 | Component 2 | Task 2.4 | Verify scrubber integration |

### TR-3: Package Distribution

| Implementation | Design | Task | Validation |
|----------------|--------|------|------------|
| TR-3.1 | Component 3 | Task 3.2 | example/ in .gitignore |
| TR-3.2 | Component 3 | Task 3.3 | `npm pack` + inspect tarball |
| TR-3.3 | Component 3 | Task 3.3 | Test installation from tarball |
| TR-3.4 | Component 3 | Task 3.5 | CONTRIBUTING.md updated |

---

## Testing Requirements Traceability

### Test-1: Unit Tests for Scrubber

| Test Requirement | Task | File | Validation |
|------------------|------|------|------------|
| Whitelist prevents redaction | Task 1.4 | scrubber-whitelist.test.ts | 7+ test cases pass |
| Secret values still redacted | Task 1.4 | scrubber-whitelist.test.ts | `isSecretKey('API_KEY')` = true |
| Case-insensitive matching | Task 1.4 | scrubber-whitelist.test.ts | Test passes |

### Test-2: Integration Tests for CLI Output

| Test Requirement | Task | File | Validation |
|------------------|------|------|------------|
| Options table shows values | Task 1.5 | options-output.test.ts | No [REDACTED] in output |
| Audit table shows key names | Task 1.6 | audit-output.test.ts | Key names visible |
| No duplicate log entries | Task 2.7 | logger-output.test.ts | Count = 1 per message |
| Log format consistency | Task 2.7 | logger-output.test.ts | Timestamps consistent |

### Test-3: E2E Tests with Example Directory

| Test Requirement | Task | File | Validation |
|------------------|------|------|------------|
| CLI runs against example/ | Task 3.6 | example-directory.test.ts | No errors |
| example/ not in git | Task 3.6 | example-directory.test.ts | `git status` clean |
| example/ not in npm | Task 3.6 | example-directory.test.ts | Tarball inspection |
| Scrubbing works | Task 3.6 | example-directory.test.ts | Values redacted |

---

## Acceptance Criteria Traceability

### AC-1: Configuration Visibility

| Criterion | Requirement | Task | Validation |
|-----------|-------------|------|------------|
| skipSecrets visible | FR-1.1 | Task 1.1, 1.5 | Manual: `bun run dev -- --dry-run` |
| No [REDACTED] in config | FR-1.3 | Task 1.3, 1.5 | Integration test passes |
| All CLI options readable | FR-1.3 | Task 1.3, 1.5 | Options table complete |

### AC-2: Audit Table Clarity

| Criterion | Requirement | Task | Validation |
|-----------|-------------|------|------------|
| Key names visible | FR-1.2, FR-1.4 | Task 1.2, 1.6 | Manual: Audit table shows names |
| Values remain redacted | FR-1.5 | Task 1.6 | Integration test verifies |

### AC-3: Clean Logging

| Criterion | Requirement | Task | Validation |
|-----------|-------------|------|------------|
| Each message once | FR-2.4 | Task 2.5, 2.7 | `wc -l` = 1 per message |
| Timestamps consistent | FR-2.3 | Task 2.5, 2.7 | Integration test passes |
| No duplicates | FR-2.4 | Task 2.7 | Integration test passes |

### AC-4: Local Testing

| Criterion | Requirement | Task | Validation |
|-----------|-------------|------|------------|
| example/ created | FR-3.1 | Task 3.1 | `ls -la example/` |
| example/ in .gitignore | FR-3.2 | Task 3.2 | `git status` |
| example/ excluded from npm | FR-3.3 | Task 3.3 | `npm pack` |
| Documentation updated | FR-3.4 | Task 3.4, 3.5 | Manual review |

### AC-5: Test Coverage

| Criterion | Requirement | Task | Validation |
|-----------|-------------|------|------------|
| Unit tests | Test-1 | Task 1.4, 2.6 | Tests pass |
| Integration tests | Test-2 | Task 1.5, 1.6, 2.7 | Tests pass |
| E2E tests | Test-3 | Task 3.6 | Tests pass |
| All existing tests pass | All | Task 4.3 | 254+ tests pass |

---

## Reverse Traceability: Tasks → Design → Requirements

### Phase 1: Whitelist Enhancement

| Task | Design Component | Requirements Satisfied | User Story |
|------|------------------|------------------------|------------|
| Task 1.1 | Component 1 | FR-1.1, TR-1.1, AC-1 | US-1 |
| Task 1.2 | Component 1 | FR-1.2, FR-1.4, TR-1.2, AC-2 | US-2 |
| Task 1.3 | Component 1 | FR-1.3, AC-1 | US-1 |
| Task 1.4 | Component 1 | FR-1.5, TR-1, Test-1, AC-5 | US-1, US-2 |
| Task 1.5 | Component 1 | Test-2, AC-1, AC-5 | US-1 |
| Task 1.6 | Component 1 | Test-2, AC-2, AC-5 | US-2 |

### Phase 2: Logger Deduplication

| Task | Design Component | Requirements Satisfied | User Story |
|------|------------------|------------------------|------------|
| Task 2.1 | Component 2 | FR-2.1, TR-2 | US-3 |
| Task 2.2 | Component 2 | FR-2.1, TR-2.1 | US-3 |
| Task 2.3 | Component 2 | FR-2.1, TR-2.3 | US-3 |
| Task 2.4 | Component 2 | FR-2.1, TR-2.2, TR-2.4 | US-3 |
| Task 2.5 | Component 2 | FR-2.2, FR-2.3, AC-3 | US-3 |
| Task 2.6 | Component 2 | Test-1, AC-5 | US-3 |
| Task 2.7 | Component 2 | FR-2.4, Test-2, AC-3, AC-5 | US-3 |

### Phase 3: Example Directory

| Task | Design Component | Requirements Satisfied | User Story |
|------|------------------|------------------------|------------|
| Task 3.1 | Component 3 | FR-3.1, AC-4 | US-4 |
| Task 3.2 | Component 3 | FR-3.2, TR-3.1, AC-4 | US-4 |
| Task 3.3 | Component 3 | FR-3.3, TR-3.2, TR-3.3, AC-4 | US-4 |
| Task 3.4 | Component 3 | FR-3.4, AC-4 | US-4 |
| Task 3.5 | Component 3 | FR-3.4, TR-3.4, AC-4 | US-4 |
| Task 3.6 | Component 3 | Test-3, AC-5 | US-4 |

### Phase 4: Release

| Task | Design Component | Requirements Satisfied | User Story |
|------|------------------|------------------------|------------|
| Task 4.1 | Success Metrics | Version 1.1.1 | All |
| Task 4.2 | Success Metrics | Documentation | All |
| Task 4.3 | Success Metrics | AC-5 (all tests pass) | All |
| Task 4.4 | Success Metrics | All AC manual validation | All |
| Task 4.5 | Success Metrics | Release to npm | All |

---

## Coverage Analysis

### Requirements Coverage

| Requirement | Design Components | Tasks | Tests | Status |
|-------------|-------------------|-------|-------|--------|
| US-1 | Component 1 | 1.1, 1.3, 1.4, 1.5 | Unit + Integration | ✅ Complete |
| US-2 | Component 1 | 1.2, 1.4, 1.6 | Unit + Integration | ✅ Complete |
| US-3 | Component 2 | 2.1-2.7 | Unit + Integration | ✅ Complete |
| US-4 | Component 3 | 3.1-3.6 | E2E | ✅ Complete |
| FR-1 | Component 1 | 1.1-1.6 | Unit + Integration | ✅ Complete |
| FR-2 | Component 2 | 2.1-2.7 | Unit + Integration | ✅ Complete |
| FR-3 | Component 3 | 3.1-3.6 | E2E | ✅ Complete |
| TR-1 | Component 1 | 1.4 | Unit | ✅ Complete |
| TR-2 | Component 2 | 2.1-2.4 | Manual + Integration | ✅ Complete |
| TR-3 | Component 3 | 3.2-3.5 | E2E | ✅ Complete |

### Design Coverage

| Design Component | Requirements | Tasks | Tests | Status |
|------------------|--------------|-------|-------|--------|
| Component 1: Whitelist | FR-1, TR-1, US-1, US-2 | 1.1-1.6 | Unit + Integration | ✅ Complete |
| Component 2: Logger | FR-2, TR-2, US-3 | 2.1-2.7 | Unit + Integration | ✅ Complete |
| Component 3: Example | FR-3, TR-3, US-4 | 3.1-3.6 | E2E | ✅ Complete |

### Task Coverage

| Phase | Tasks | Requirements | Tests | Validation | Status |
|-------|-------|--------------|-------|------------|--------|
| Phase 1 | 6 | FR-1, TR-1, US-1, US-2 | Unit + Integration | Manual + Automated | ✅ Complete |
| Phase 2 | 7 | FR-2, TR-2, US-3 | Unit + Integration | Manual + Automated | ✅ Complete |
| Phase 3 | 6 | FR-3, TR-3, US-4 | E2E | Manual + Automated | ✅ Complete |
| Phase 4 | 5 | All | All | Manual + Automated | ✅ Complete |

### Test Coverage

| Test Type | Requirements | Tasks | Files | Status |
|-----------|--------------|-------|-------|--------|
| Unit | FR-1, FR-2, TR-1 | 1.4, 2.6 | 2 files | ✅ Complete |
| Integration | FR-1, FR-2, Test-2 | 1.5, 1.6, 2.7 | 3 files | ✅ Complete |
| E2E | FR-3, Test-3 | 3.6 | 1 file | ✅ Complete |
| Manual | All AC | 4.4 | Checklist | ✅ Complete |

---

## Validation Methods Summary

### Automated Validation

| Requirement | Validation Command | Expected Result | Task |
|-------------|-------------------|-----------------|------|
| FR-1.1 | `bun test scrubber-whitelist.test.ts` | Tests pass | 1.4 |
| FR-1.3 | `bun test options-output.test.ts` | No [REDACTED] | 1.5 |
| FR-1.4 | `bun test audit-output.test.ts` | Key names visible | 1.6 |
| FR-2.4 | `bun test logger-output.test.ts` | No duplicates | 2.7 |
| FR-3.2 | `bun test example-directory.test.ts` | Git excludes | 3.6 |
| FR-3.3 | `bun test example-directory.test.ts` | NPM excludes | 3.6 |

### Manual Validation

| Requirement | Validation Command | Expected Result | Task |
|-------------|-------------------|-----------------|------|
| US-1 | `bun run dev -- --dry-run` | skipSecrets visible | 1.1 |
| US-2 | `bun run dev -- --dry-run` | Key names in audit | 1.2 |
| US-3 | `bun run dev -- --dry-run \| grep WARN \| wc -l` | Output = 1 | 2.5 |
| US-4 | `git status` | example/ not shown | 3.2 |
| US-4 | `npm pack && tar -tzf *.tgz \| grep example` | No output | 3.3 |

### End-to-End Validation

| User Story | Validation Workflow | Expected Outcome | Task |
|------------|---------------------|------------------|------|
| US-1 | Run CLI with config → Check options table | Config visible | 4.4 |
| US-2 | Run CLI → Check audit table | Key names visible | 4.4 |
| US-3 | Run CLI → Count log lines | No duplicates | 4.4 |
| US-4 | Create example/ → Run CLI → Check git/npm | Works + excluded | 4.4 |

---

## Gaps and Risks

### Coverage Gaps
✅ **None identified** - All requirements have design, tasks, and validation

### Validation Gaps
✅ **None identified** - All requirements have concrete, testable validation methods

### Traceability Gaps
✅ **None identified** - Complete forward and reverse traceability

### Risks
1. **Logger investigation complexity** - May take longer than estimated (Task 2.1-2.4)
   - Mitigation: Can defer to separate issue if needed
2. **Whitelist too broad** - Adding "secret" to whitelist
   - Mitigation: Only matches exact field name, comprehensive tests

---

## Success Criteria

### All Requirements Traceable
- [x] Every requirement maps to design component
- [x] Every design component maps to tasks
- [x] Every task has validation method
- [x] Reverse traceability complete

### All Requirements Testable
- [x] Unit tests for whitelist logic
- [x] Integration tests for CLI output
- [x] E2E tests for example/ directory
- [x] Manual validation for user workflows

### All Requirements Validated
- [x] Automated tests cover 80%+ of requirements
- [x] Manual tests cover user-facing features
- [x] End-to-end validation simulates real usage
- [x] All validation methods documented

---

## References

- **Requirements:** `development/scrubber-fixes/requirements.md`
- **Design:** `development/scrubber-fixes/design.md`
- **Tasks:** `development/scrubber-fixes/tasks.md`
- **Problem Statement:** `development/scrubber-fixes/problem-statement.md`
