# Traceability Matrix: --no-confirm Flag Fix & GitHub Secrets Limit Pre-flight Check

## Overview

Maps each requirement (REQ-ID) to the corresponding design section, implementation task(s), and test case(s) to ensure full coverage and traceability.

---

## Requirements → Design → Tasks → Tests

| REQ-ID | Requirement Summary | Design Section(s) | Task ID(s) | Test Case ID(s) |
|--------|--------------------|--------------------|------------|-----------------|
| REQ-001 | `--no-confirm` implies consent for all planned mutations | Fix A: `approved = mutating` | T1.1, T2.2 | TC-REQ-001-A through E, TC-COMBO-A/B/C/E/F/G |
| REQ-002 | `--no-confirm` does NOT imply force-update-all | Fix A: No `forceOverwrite` activation | T1.1, T2.2 | TC-REQ-002-A through E |
| REQ-003 | `--no-confirm` alone proceeds without `--overwrite` | Fix A: Replace abort with approval | T1.1, T2.2 | TC-REQ-003-A, TC-REQ-003-B, TC-REQ-001-A/E |
| REQ-004 | `--overwrite` behavior unchanged | Fix A: `--overwrite` branch unchanged | T1.1, T2.2 | TC-REQ-004-A through D, TC-REQ-002-E, TC-COMBO-D |
| REQ-005 | `--overwrite --no-confirm` unchanged | Fix A: `if/else if` chain, overwrite checked first | T1.1, T2.2 | TC-REQ-005-A, TC-REQ-005-B, TC-REQ-007-C |
| REQ-006 | Interactive mode unchanged | Fix A: `else` interactive branch unchanged | T1.1 | TC-REQ-006-A through D |
| REQ-007 | `--no-confirm` log output message | Fix A: `console.log` message | T1.1, T2.2 | TC-REQ-007-A through D |
| REQ-008 | Limit check runs before mutation | Fix B: Placement before confirmation workflow | T1.2, T2.3 | TC-REQ-008-A through F, TC-COMBO-A/B/D |
| REQ-009 | Hard block on limit exceeded (normal mode) | Fix B: Hard block with exit 1 | T1.2, T2.3 | TC-REQ-009-A through E, TC-REQ-013-D |
| REQ-010 | Warning in dry-run mode | Fix B: `flags.dryRun` branch with `console.warn` | T1.2, T2.3 | TC-REQ-010-A through F, TC-REQ-014-C, TC-COMBO-C |
| REQ-011 | Mock mode compatibility | Fix B: Data-driven (no mock guard — small mock data naturally passes) | T1.2, T2.3 | TC-REQ-011-A through E, TC-COMBO-G |
| REQ-012 | Net-change calculation (creates − deletes) | Fix B: `existing.size + creates - deletes` formula | T1.2, T2.3 | TC-REQ-012-A through G |
| REQ-013 | Graceful handling of unknown existing count | Fix B: `existing.size === 0 && creates > 0` heuristic | T1.2, T2.3 | TC-REQ-013-A through E, TC-REQ-012-G |
| REQ-014 | Error message shows all counts | Fix B: Error message format with all counts | T1.2, T2.3 | TC-REQ-014-A through D |
| REQ-015 | No new runtime dependencies | Both fixes: No imports, no package.json changes | All tasks (implicit) | TC-REQ-015-A, TC-REQ-015-B |
| REQ-016 | Test coverage for all scenarios | Testing Strategy section | T2.1, T2.2, T2.3, T2.4 | TC-REQ-016-A through C |
| REQ-017 | Minimal code change | Both fixes: minimal surgical changes | T1.1, T1.2 | TC-REQ-017-A through C |

---

## Reverse Traceability: Design → Requirements

| Design Section | Requirements Addressed |
|----------------|------------------------|
| Fix A: `approved = mutating` | REQ-001, REQ-003 |
| Fix A: No `forceOverwrite` activation | REQ-002 |
| Fix A: `--overwrite` branch unchanged | REQ-004, REQ-005 |
| Fix A: `else` interactive branch unchanged | REQ-006 |
| Fix A: `console.log` message | REQ-007 |
| Fix B: Placement before confirmation workflow | REQ-008 |
| Fix B: Hard block with exit 1 | REQ-009 |
| Fix B: `flags.dryRun` branch | REQ-010 |
| Fix B: Data-driven (no mock guard) | REQ-011 |
| Fix B: Net-change formula | REQ-012 |
| Fix B: `existing.size === 0` heuristic | REQ-013 |
| Fix B: Error message format | REQ-014 |
| Both fixes: No imports/package.json changes | REQ-015 |
| Testing Strategy | REQ-016 |
| Both fixes: Surgical changes only | REQ-017 |

---

## Reverse Traceability: Tasks → Requirements

| Task ID | Task Name | Requirements Covered |
|---------|-----------|---------------------|
| T1.1 | Fix --no-confirm Abort Logic | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007 |
| T1.2 | Add Secrets Limit Pre-flight Check | REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014 |
| T2.1 | Create Integration Test File | REQ-016 |
| T2.2 | Write --no-confirm Tests | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-007, REQ-016 |
| T2.3 | Write Secrets Limit Tests | REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-016 |
| T2.4 | Run Full Test Suite | REQ-016 |

---

## Reverse Traceability: Test Cases → Requirements

| Requirement | Test Case Count | Test Categories Covered |
|-------------|-----------------|------------------------|
| REQ-001 | 12 | Happy path, Edge, Negative, Combo |
| REQ-002 | 5 | Happy path, Edge, Negative |
| REQ-003 | 4 | Happy path, Negative |
| REQ-004 | 6 | Happy path, Edge, Negative, Combo |
| REQ-005 | 3 | Happy path, Edge |
| REQ-006 | 4 | Happy path, Edge, Negative |
| REQ-007 | 4 | Happy path, Edge, Negative |
| REQ-008 | 9 | Happy path, Edge, Negative, Combo |
| REQ-009 | 6 | Happy path, Edge, Negative |
| REQ-010 | 8 | Happy path, Edge, Negative, Combo |
| REQ-011 | 6 | Happy path, Edge, Negative, Combo |
| REQ-012 | 7 | Happy path, Edge, Negative |
| REQ-013 | 6 | Happy path, Edge, Negative |
| REQ-014 | 4 | Happy path, Edge, Negative |
| REQ-015 | 2 | Structural |
| REQ-016 | 3 | Verification |
| REQ-017 | 3 | Structural |

---

## Coverage Summary

| Category | Total | Covered | Coverage |
|----------|-------|---------|----------|
| Requirements → Design | 17 | 17 | 100% |
| Requirements → Tasks | 17 | 17 | 100% |
| Requirements → Test Cases | 17 | 17 | 100% |
| Design Sections → Requirements (reverse) | 15 | 15 | 100% |
| Tasks → Requirements (reverse) | 6 | 6 | 100% |

**All 17 requirements have full traceability from problem statement through test verification.**

---

## Gap Analysis

| Check | Result |
|-------|--------|
| Requirements without design coverage | ✅ None |
| Requirements without task coverage | ✅ None |
| Requirements without test coverage | ✅ None |
| Design sections without requirement justification | ✅ None |
| Tasks without clear requirement tracing | ✅ None |
| Test cases without requirement reference | ✅ None |
| Orphan test cases (no requirement) | ✅ None (COMBO tests trace to multiple REQs) |

---

## Cross-Document Consistency Summary

| Check | Result |
|-------|--------|
| Problem statement → Requirements alignment | ✅ All user stories map to REQ-IDs |
| Requirements → Design coverage | ✅ All 17 REQs have design sections |
| Design → Tasks implementation | ✅ All design components have tasks |
| Tasks → Test plan coverage | ✅ All tasks have corresponding test cases |
| Research brief → Design accuracy | ✅ Design follows verified research approaches |
| Dependency check → Design feasibility | ✅ All dependencies verified, no blockers |
