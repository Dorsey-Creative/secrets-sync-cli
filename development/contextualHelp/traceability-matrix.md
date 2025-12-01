# Traceability Matrix: Contextual Help System

## Forward Traceability: Requirements → Design → Tasks

### User Stories

| ID   | User Story                  | Design Section                 | Task(s)                | Validation Method                     |
| ---- | --------------------------- | ------------------------------ | ---------------------- | ------------------------------------- |
| US-1 | Get Detailed Flag Help      | Design §3 (Help Renderer)      | Phase 1: Task 1.2      | Manual: `secrets-sync --force --help` |
| US-2 | Understand Flag Differences | Design §1 (Flag Help Data)     | Phase 2: Task 2.1, 2.2 | Manual: Compare help outputs          |
| US-3 | Learn Flag Combinations     | Design §1 (relatedFlags field) | Phase 2: Task 2.1, 2.2 | Manual: Check related flags section   |
| US-4 | Discover Advanced Features  | Design §1 (docsUrl field)      | Phase 2: All tasks     | Manual: Check documentation links     |

---

### Functional Requirements

| ID   | Requirement                   | Design Section               | Task(s)                      | Validation Method                                            |
| ---- | ----------------------------- | ---------------------------- | ---------------------------- | ------------------------------------------------------------ |
| FR-1 | Parse Contextual Help Pattern | Design §2 (Detection)        | Phase 1: Task 1.3            | Unit test: `tests/unit/contextualHelp.test.ts`               |
| FR-2 | Display Flag-Specific Help    | Design §3 (Renderer)         | Phase 1: Task 1.2            | Integration test: `tests/integration/contextualHelp.test.ts` |
| FR-3 | Exit Without Execution        | Design §4 (Main Integration) | Phase 1: Task 1.4            | Integration test: Mock config loader                         |
| FR-4 | Support All Documented Flags  | Design §1 (FLAG_HELP)        | Phase 2: Tasks 2.1, 2.2, 2.3 | Unit test: `tests/unit/flagHelp.test.ts`                     |
| FR-5 | Support Flag Aliases          | Design §2 (ALIAS_MAP)        | Phase 3: Tasks 3.1, 3.2      | Manual: `secrets-sync -f --help`                             |
| FR-6 | Maintain Existing Help        | Design §4 (Main Integration) | Phase 1: Task 1.4            | Manual: `secrets-sync --help`                                |
| FR-7 | Handle Invalid Flags          | Design §3 (Fallback)         | Phase 4: Task 4.1            | Manual: `secrets-sync --env --help` (before Phase 2)         |

---

### Technical Requirements

| ID   | Requirement                   | Design Section | Task(s)                         | Validation Method                     |
| ---- | ----------------------------- | -------------- | ------------------------------- | ------------------------------------- |
| TR-1 | Extend Flag Parser            | Design §2      | Phase 1: Task 1.3               | Code review + unit tests              |
| TR-2 | Create Help Content Structure | Design §1      | Phase 1: Task 1.1               | Type checking: `bun run build`        |
| TR-3 | Implement Help Renderer       | Design §3      | Phase 1: Task 1.2               | Visual inspection + integration tests |
| TR-4 | Store Help Content            | Design §1      | Phase 1: Task 1.1, Phase 2: All | Unit test: Content validation         |
| TR-5 | Early Exit Pattern            | Design §4      | Phase 1: Task 1.4               | Integration test: No config warnings  |

---

### Content Requirements

| ID   | Requirement              | Design Section                    | Task(s)                      | Validation Method            |
| ---- | ------------------------ | --------------------------------- | ---------------------------- | ---------------------------- |
| CR-1 | Description Field        | Design §1 (FlagHelp.description)  | Phase 2: Tasks 2.1, 2.2, 2.3 | Manual review                |
| CR-2 | Usage Examples           | Design §1 (FlagHelp.usage)        | Phase 2: Tasks 2.1, 2.2, 2.3 | Manual execution of examples |
| CR-3 | When to Use Guidance     | Design §1 (FlagHelp.whenToUse)    | Phase 2: Tasks 2.1, 2.2, 2.3 | Manual review                |
| CR-4 | When Not to Use Guidance | Design §1 (FlagHelp.whenNotToUse) | Phase 2: Tasks 2.1, 2.2, 2.3 | Manual review                |
| CR-5 | Related Flags            | Design §1 (FlagHelp.relatedFlags) | Phase 2: Tasks 2.1, 2.2, 2.3 | Manual review                |
| CR-6 | Documentation Links      | Design §1 (FlagHelp.docsUrl)      | Phase 2: Tasks 2.1, 2.2, 2.3 | Link validation              |

---

### UX Requirements

| ID   | Requirement           | Design Section       | Task(s)            | Validation Method |
| ---- | --------------------- | -------------------- | ------------------ | ----------------- |
| UX-1 | Consistent Formatting | Design §3 (Renderer) | Phase 1: Task 1.2  | Visual inspection |
| UX-2 | Scannable Output      | Design §3 (Emojis)   | Phase 1: Task 1.2  | User testing      |
| UX-3 | Concise Output        | Design §3 (Format)   | Phase 2: All tasks | Line count check  |
| UX-4 | Clear Section Headers | Design §3 (Renderer) | Phase 1: Task 1.2  | Visual inspection |

---

### Testing Requirements

| ID     | Requirement                            | Design Section    | Task(s)           | Validation Method                                          |
| ------ | -------------------------------------- | ----------------- | ----------------- | ---------------------------------------------------------- |
| TEST-1 | Unit Test - Parse Contextual Help      | Design Testing §1 | Phase 5: Task 5.1 | `bun test tests/unit/contextualHelp.test.ts`               |
| TEST-2 | Unit Test - Help Content Exists        | Design Testing §1 | Phase 5: Task 5.2 | `bun test tests/unit/flagHelp.test.ts`                     |
| TEST-3 | Integration Test - Help Output         | Design Testing §2 | Phase 5: Task 5.3 | `bun test tests/integration/contextualHelp.test.ts`        |
| TEST-4 | Integration Test - No Execution        | Design Testing §2 | Phase 5: Task 5.3 | Mock assertions                                            |
| TEST-5 | Integration Test - Fallback Behavior   | Design Testing §2 | Phase 5: Task 5.3 | Fallback message check                                     |
| TEST-6 | E2E Test - User Workflow               | Design Testing §3 | Phase 6: Manual   | Manual testing                                             |
| TEST-7 | Integration Test - Usage Examples      | Design Testing §4 | Phase 5: Task 5.4 | `bun test tests/integration/helpContentValidation.test.ts` |
| TEST-8 | Integration Test - Documentation Links | Design Testing §4 | Phase 5: Task 5.4 | Link checker                                               |
| TEST-9 | Manual Test - Emoji Rendering          | Design Testing §5 | Phase 6: Task 6.4 | Visual confirmation                                        |

---

### Documentation Requirements

| ID    | Requirement      | Design Section | Task(s)           | Validation Method    |
| ----- | ---------------- | -------------- | ----------------- | -------------------- |
| DOC-1 | Update README    | Design §6      | Phase 6: Task 6.1 | Markdown rendering   |
| DOC-2 | Update USAGE.md  | Design §6      | Phase 6: Task 6.2 | Documentation review |
| DOC-3 | Update CHANGELOG | Design §6      | Phase 6: Task 6.3 | Format check         |

---

### Non-Functional Requirements

| ID    | Requirement            | Design Section               | Task(s)                   | Validation Method           |
| ----- | ---------------------- | ---------------------------- | ------------------------- | --------------------------- |
| NFR-1 | Maintainability        | Design Decision §4           | Phase 1: Task 1.1         | Developer feedback          |
| NFR-2 | Backward Compatibility | Design §4 (Main Integration) | Phase 1: Task 1.4         | Full test suite: `bun test` |
| NFR-3 | Accessibility          | Design Decision §5           | Phase 6: Final validation | Multi-terminal testing      |

---

## Reverse Traceability: Tasks → Design → Requirements

### Phase 1: Core Infrastructure

| Task                            | Design Section | Requirements Satisfied             | Validation        |
| ------------------------------- | -------------- | ---------------------------------- | ----------------- |
| 1.1: Create Help Data Structure | Design §1      | TR-2, TR-4, NFR-1                  | Type checking     |
| 1.2: Create Help Renderer       | Design §3      | FR-2, TR-3, UX-1, UX-2, UX-4, US-1 | Visual inspection |
| 1.3: Modify parseFlags()        | Design §2      | FR-1, TR-1                         | Unit tests        |
| 1.4: Integrate into main()      | Design §4      | FR-3, FR-6, TR-5, NFR-2            | Integration tests |

---

### Phase 2: Complete Flag Coverage

| Task                            | Design Section | Requirements Satisfied        | Validation     |
| ------------------------------- | -------------- | ----------------------------- | -------------- |
| 2.1: Add Help for Core Flags    | Design §1      | FR-4, CR-1 through CR-6, US-2 | Manual testing |
| 2.2: Add Help for Utility Flags | Design §1      | FR-4, CR-1 through CR-6       | Manual testing |
| 2.3: Add Help for Meta Flags    | Design §1      | FR-4, CR-1 through CR-6, US-4 | Manual testing |

---

### Phase 3: Alias Support

| Task                           | Design Section | Requirements Satisfied | Validation     |
| ------------------------------ | -------------- | ---------------------- | -------------- |
| 3.1: Map Aliases to Long Flags | Design §2      | FR-5                   | Type checking  |
| 3.2: Update Detection Logic    | Design §2      | FR-5                   | Manual testing |

---

### Phase 4: Graceful Degradation

| Task                          | Design Section | Requirements Satisfied | Validation     |
| ----------------------------- | -------------- | ---------------------- | -------------- |
| 4.1: Verify Fallback Behavior | Design §3      | FR-7                   | Manual testing |

---

### Phase 5: Testing

| Task                      | Design Section    | Requirements Satisfied             | Validation      |
| ------------------------- | ----------------- | ---------------------------------- | --------------- |
| 5.1: Unit Tests - Parsing | Design Testing §1 | TEST-1, FR-1                       | Test execution  |
| 5.2: Unit Tests - Content | Design Testing §1 | TEST-2, FR-4                       | Test execution  |
| 5.3: Integration Tests    | Design Testing §2 | TEST-3, TEST-4, TEST-5, FR-2, FR-3 | Test execution  |
| 5.4: Content Validation   | Design Testing §4 | TEST-7, TEST-8, CR-2, CR-6         | Automated tests |

---

### Phase 6: Documentation

| Task                          | Design Section    | Requirements Satisfied | Validation           |
| ----------------------------- | ----------------- | ---------------------- | -------------------- |
| 6.1: Update README            | Design §6         | DOC-1                  | Markdown review      |
| 6.2: Update USAGE.md          | Design §6         | DOC-2                  | Documentation review |
| 6.3: Update CHANGELOG         | Design §6         | DOC-3                  | Format check         |
| 6.4: Validate Emoji Rendering | Design Testing §5 | TEST-9, NFR-3          | Visual confirmation  |

---

## Coverage Analysis

### Requirements Coverage

| Priority  | Total  | Covered by Design | Covered by Tasks | Coverage % |
| --------- | ------ | ----------------- | ---------------- | ---------- |
| P0        | 15     | 15                | 15               | 100%       |
| P1        | 14     | 14                | 14               | 100%       |
| P2        | 5      | 5                 | 5                | 100%       |
| **Total** | **34** | **34**            | **34**           | **100%**   |

---

### Design Coverage

| Design Section                | Requirements Mapped | Tasks Mapped | Complete |
| ----------------------------- | ------------------- | ------------ | -------- |
| §1: Flag Help Data Structure  | 10                  | 7            | ✓        |
| §2: Contextual Help Detection | 4                   | 3            | ✓        |
| §3: Help Renderer             | 8                   | 2            | ✓        |
| §4: Main Function Integration | 5                   | 1            | ✓        |
| Testing Strategy              | 6                   | 3            | ✓        |
| Documentation                 | 3                   | 3            | ✓        |

---

### Task Coverage

| Phase   | Requirements Satisfied | Design Sections Used | Validation Methods          |
| ------- | ---------------------- | -------------------- | --------------------------- |
| Phase 1 | 10 (P0)                | §1, §2, §3, §4       | Unit + Integration + Manual |
| Phase 2 | 7 (P0-P1)              | §1                   | Manual + Unit               |
| Phase 3 | 1 (P1)                 | §2                   | Manual                      |
| Phase 4 | 1 (P2)                 | §3                   | Manual                      |
| Phase 5 | 6 (P0-P1)              | Testing §1, §2       | Automated tests             |
| Phase 6 | 3 (P1)                 | §6                   | Manual review               |

---

## Gap Analysis

### Requirements Without Direct Tasks

- **None identified** - All requirements have corresponding tasks

### Tasks Without Clear Requirements

- **None identified** - All tasks trace back to requirements

### Design Decisions Without Requirements

- **Design Decision §1** (Inline Object vs JSON) - Supports NFR-1 (Maintainability)
- **Design Decision §2** (Early Exit Pattern) - Supports TR-5, FR-3
- **Design Decision §3** (Return Type Change) - Supports TR-1, FR-1
- **Design Decision §4** (Separate Help Module) - Supports NFR-1
- **Design Decision §5** (Simple Console Output) - Supports NFR-3, UX-2

All design decisions support existing requirements.

---

## Validation Traceability

### Automated Validation

| Requirement | Test File                                         | Test Method             | Command                                                    |
| ----------- | ------------------------------------------------- | ----------------------- | ---------------------------------------------------------- |
| FR-1        | `tests/unit/contextualHelp.test.ts`               | Unit test               | `bun test tests/unit/contextualHelp.test.ts`               |
| FR-2        | `tests/integration/contextualHelp.test.ts`        | Integration test        | `bun test tests/integration/contextualHelp.test.ts`        |
| FR-3        | `tests/integration/contextualHelp.test.ts`        | Mock assertions         | `bun test tests/integration/contextualHelp.test.ts`        |
| FR-4        | `tests/unit/flagHelp.test.ts`                     | Content validation      | `bun test tests/unit/flagHelp.test.ts`                     |
| CR-2        | `tests/integration/helpContentValidation.test.ts` | Usage example execution | `bun test tests/integration/helpContentValidation.test.ts` |
| CR-6        | `tests/integration/helpContentValidation.test.ts` | Link checking           | `bun test tests/integration/helpContentValidation.test.ts` |
| NFR-2       | All test files                                    | Regression suite        | `bun test`                                                 |

---

### Manual Validation

| Requirement | Validation Command                             | Expected Result              | Success Criteria                 |
| ----------- | ---------------------------------------------- | ---------------------------- | -------------------------------- |
| FR-2        | `secrets-sync --force --help`                  | Displays contextual help     | Help output visible, exit code 0 |
| FR-3        | `secrets-sync --force --help`                  | No config warnings           | stderr is empty                  |
| FR-5        | `secrets-sync -f --help`                       | Same as `--force --help`     | Identical output                 |
| FR-6        | `secrets-sync --help`                          | Full help screen             | All flags listed                 |
| FR-7        | `secrets-sync --env --help` (before Phase 2)   | Fallback message + full help | Exit code 0                      |
| UX-3        | `secrets-sync --force --help`                  | Concise output               | No scrolling required            |
| NFR-3       | Test in iTerm, Terminal.app, VS Code           | Readable output              | Visual confirmation              |
| TEST-9      | `secrets-sync --force --help` in each terminal | Emojis render                | 🔐, ✓, ✗ display correctly       |

---

### User Validation

| Requirement | Validation Method                                 | Success Criteria                 |
| ----------- | ------------------------------------------------- | -------------------------------- |
| US-1        | User runs `--force --help`                        | User understands flag purpose    |
| US-2        | User compares `--overwrite` vs `--skip-unchanged` | User chooses correct flag        |
| US-3        | CI/CD engineer reads help                         | Engineer automates safely        |
| US-4        | Power user explores flags                         | User discovers advanced features |

---

## Traceability Summary

✅ **100% Forward Traceability**: All requirements map to design and tasks  
✅ **100% Reverse Traceability**: All tasks map back to requirements  
✅ **100% Coverage**: All P0, P1, P2 requirements have validation methods  
✅ **No Gaps**: No orphaned requirements, design sections, or tasks  
✅ **Validation Mix**: Automated (50%), Manual (40%), User (10%)

---

## Notes

1. **FR-7 Priority Change**: Originally P2 (Medium), but implemented as graceful degradation in Phase 1 (built-in safety)
2. **Phase 4 Simplification**: Changed from error handling to validation-only since fallback is built into renderer
3. **Validation Balance**: Mix of automated tests (fast feedback) and manual validation (user experience)
4. **User Stories**: All map to multiple requirements, ensuring end-user value is preserved throughout implementation
5. **New Tests Added**: TEST-7 (usage examples), TEST-8 (link validation), TEST-9 (emoji rendering) for comprehensive validation
6. **CR-6 Priority Elevated**: From P2 to P1 due to importance of documentation links
7. **UX-3 Relaxed**: Changed from hard requirement (≤20 lines) to guideline (avoid scrolling)
