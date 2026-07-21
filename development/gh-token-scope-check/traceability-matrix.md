# Traceability Matrix: GitHub Token Scope Pre-flight Check

## Overview

Maps each requirement (REQ-ID) to the corresponding design section, implementation task(s), and test case(s) to ensure full coverage and traceability.

---

## Requirements → Design → Tasks → Tests

| REQ-ID | Requirement Summary | Design Section(s) | Task ID(s) | Test Case ID(s) |
|--------|--------------------|--------------------|------------|-----------------|
| REQ-001 | Pre-flight scope detection before mutation | §3 ghTokenScopeCheck, §6 Integration in main() | T1.2, T1.4, T1.5 | TC-REQ-001-A, TC-REQ-001-B, TC-REQ-001-C, TC-REQ-001-D, TC-REQ-001-E, TC-REQ-001-F, TC-REQ-011-A |
| REQ-002 | Verify `repo` scope for repository operations | §3 repo scope check logic | T1.4 | TC-REQ-002-A, TC-REQ-002-B, TC-REQ-002-C, TC-REQ-002-D |
| REQ-003 | Verify `admin:org` scope for org repos | §3 admin:org check after org detection | T1.3, T1.4 | TC-REQ-003-A, TC-REQ-003-B, TC-REQ-003-C, TC-REQ-011-B |
| REQ-004 | Detect org vs personal repo | §2 Organization Detection | T1.3 | TC-REQ-004-A through TC-REQ-004-J |
| REQ-005 | Actionable error messages with fix commands | §3 Dynamic error message, §4 Error Catalog | T1.1, T1.4 | TC-REQ-005-A through TC-REQ-005-G |
| REQ-006 | Graceful handling when scopes undetermined | §1 Returns null → graceful pass | T1.2, T1.4 | TC-REQ-006-A through TC-REQ-006-K |
| REQ-007 | Integration with DependencyCheck system | §3 DependencyCheck interface, §6 Integration | T1.4, T1.5 | TC-REQ-007-A, TC-REQ-007-B, TC-REQ-007-C |
| REQ-008 | Respect SKIP_DEPENDENCY_CHECK bypass | §6 Existing SKIP_DEPENDENCY_CHECK guard | T1.5 | TC-REQ-008-A through TC-REQ-008-D |
| REQ-009 | Runtime 403 error enhancement | §5 Runtime 403 Error Enhancement | T2.1, T2.2 | TC-REQ-009-A through TC-REQ-009-G |
| REQ-010 | No new runtime dependencies | All sections (no new imports) | All tasks (implicit) | TC-REQ-010-A |
| REQ-011 | Fail-fast on missing scopes (exit before mutation) | §3 Returns false → exit 1 | T1.4, T1.5 | TC-REQ-011-A, TC-REQ-011-B, TC-REQ-011-C |
| REQ-012 | Scope check runs in `--dry-run` mode | §6 Scope check in validateDependencies (pre-dry-run) | T1.5 | TC-REQ-012-A, TC-REQ-012-B |
| REQ-013 | ERR_TOKEN_SCOPE error catalog entry | §4 Error Catalog Entry | T1.1 | TC-REQ-013-A, TC-REQ-013-B, TC-REQ-013-C |
| REQ-014 | Use execWithTimeout for subprocess calls | §1 getTokenScopes, §2 isOrgRepo | T1.2, T1.3 | TC-REQ-014-A, TC-REQ-014-B, TC-REQ-014-C |
| REQ-015 | Mock mode bypass | §3 SECRETS_SYNC_MOCK early return | T1.4 | TC-REQ-015-A, TC-REQ-015-B, TC-REQ-015-C |
| REQ-016 | Performance (<5s execution) | §1, §2 execWithTimeout with timeout | T1.2, T1.3 | TC-REQ-016-A, TC-REQ-016-B |
| REQ-017 | Test coverage | Testing Strategy section | T3.1, T3.2 | TC-REQ-017-A, TC-REQ-017-B, TC-REQ-017-C |
| REQ-018 | Documentation in troubleshooting docs | Phase 3 documentation | T3.3 | TC-REQ-018-A through TC-REQ-018-E |

---

## Reverse Traceability: Design → Requirements

| Design Section | Requirements Addressed |
|----------------|------------------------|
| §1 Scope Detection via API Header | REQ-001, REQ-006, REQ-014, REQ-016 |
| §2 Organization Detection | REQ-004, REQ-014, REQ-016 |
| §3 ghTokenScopeCheck Implementation | REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007, REQ-011, REQ-015 |
| §4 Error Catalog Entry | REQ-005, REQ-013 |
| §5 Runtime 403 Error Enhancement | REQ-009 |
| §6 Integration in main() | REQ-001, REQ-007, REQ-008, REQ-011, REQ-012 |
| Testing Strategy | REQ-017 |
| Phase 3 Documentation | REQ-018 |

---

## Reverse Traceability: Tasks → Requirements

| Task ID | Task Name | Requirements Covered |
|---------|-----------|---------------------|
| T1.1 | Add ERR_TOKEN_SCOPE to Error Catalog | REQ-005, REQ-013 |
| T1.2 | Implement getTokenScopes() | REQ-001, REQ-006, REQ-014, REQ-016 |
| T1.3 | Implement isOrgRepo() | REQ-003, REQ-004, REQ-014, REQ-016 |
| T1.4 | Implement getGhTokenScopeCheck() Factory | REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007, REQ-010, REQ-011, REQ-015 |
| T1.5 | Integrate into validateDependencies Array | REQ-007, REQ-008, REQ-011, REQ-012 |
| T2.1 | Enhance GhCliSecretsAdapter.set() | REQ-009 |
| T2.2 | Enhance GhCliSecretsAdapter.delete() | REQ-009 |
| T3.1 | Unit Tests | REQ-017 |
| T3.2 | Integration Tests | REQ-017 |
| T3.3 | Troubleshooting Documentation | REQ-018 |

---

## Reverse Traceability: Test Cases → Requirements

| Requirement | Test Case Count | Test Categories Covered |
|-------------|-----------------|------------------------|
| REQ-001 | 7 | Unit (parsing), Integration (blocking), Edge (whitespace) |
| REQ-002 | 4 | Happy path, Edge (org vs personal), Negative |
| REQ-003 | 4 | Happy path, Edge, Negative |
| REQ-004 | 10 | Happy path, Edge, Negative, Boundary |
| REQ-005 | 7 | Happy path, Edge, Negative (output format) |
| REQ-006 | 11 | Happy path, Edge, Negative, Boundary (comprehensive) |
| REQ-007 | 3 | Happy path, Structural |
| REQ-008 | 4 | Happy path, Edge |
| REQ-009 | 7 | Happy path, Edge, Negative, Boundary |
| REQ-010 | 1 | Structural |
| REQ-011 | 3 | Negative, Edge |
| REQ-012 | 2 | Happy path, Negative |
| REQ-013 | 3 | Structural |
| REQ-014 | 3 | Edge, Structural |
| REQ-015 | 3 | Happy path, Edge |
| REQ-016 | 2 | Performance |
| REQ-017 | 3 | Verification |
| REQ-018 | 5 | Documentation |

---

## Coverage Summary

| Category | Total | Covered | Coverage |
|----------|-------|---------|----------|
| Requirements → Design | 18 | 18 | 100% |
| Requirements → Tasks | 18 | 18 | 100% |
| Requirements → Test Cases | 18 | 18 | 100% |
| Design Sections → Requirements | 8 | 8 | 100% |
| Tasks → Requirements (reverse) | 10 | 10 | 100% |

**All 18 requirements have full traceability from problem statement through test verification.**

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
| Orphan test cases (no requirement) | ✅ None |
