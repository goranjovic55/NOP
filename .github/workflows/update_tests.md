# Update Tests Workflow

**Purpose**: Test ecosystem optimization via inventory→analysis→implementation | **Orchestrator**: DevTeam | **Specialists**: Researcher→Developer→Reviewer | **Target**: ≥85% coverage, ≥95% pass rate

## Agent Delegation

| Phase | Agent | Focus |
|-------|-------|-------|
| PRE | DevTeam | Inventory, detection |
| 0,1,3,5,7,9 | Researcher | Analysis phases |
| 2,4,6,8,10 | Developer | Implementation phases |
| POST | Reviewer | Verification |

## Execution Pattern

```
[DELEGATE: agent=Researcher | task="Inventory all tests"]
→ Returns: Test map, themes, gaps
[DELEGATE: agent=Researcher | task="Analyze coverage gaps"]
→ Returns: Untested paths, low-quality tests
[DELEGATE: agent=Developer | task="Create missing tests"]
→ Returns: New test suites
[DELEGATE: agent=Researcher | task="Analyze organization"]
→ Returns: Duplication, misplaced tests
[DELEGATE: agent=Developer | task="Reorganize by theme"]
→ Returns: Organized hierarchy
[DELEGATE: agent=Researcher | task="Check codebase alignment"]
→ Returns: Obsolete tests
[DELEGATE: agent=Developer | task="Remove obsolete tests"]
→ Returns: Aligned tests
[DELEGATE: agent=Reviewer | task="Validate test ecosystem"]
→ Returns: Coverage %, pass rate
```

## Phase Operations

| Phase | Agent | Operations |
|-------|-------|------------|
| PRE | DevTeam | scan_all_tests\|categorize |
| 0 | Researcher | scan_tests\|categorize\|map_hierarchy |
| 1 | Researcher | analyze_coverage\|identify_gaps |
| 2 | Developer | create_unit_tests\|create_integration |
| 3 | Researcher | analyze_themes\|detect_duplicates |
| 4 | Developer | reorganize_by_theme\|merge_duplicates |
| 5 | Researcher | validate_against_code\|detect_obsolete |
| 6 | Developer | remove_obsolete\|update_imports |
| 7 | Researcher | identify_untested\|detect_missing |
| 8 | Developer | create_missing\|create_edge_cases |
| 9 | Researcher | execute_suite\|measure_coverage |
| 10 | Developer | fix_flaky\|integrate_ci_cd |
| POST | Reviewer | validate_coverage\|verify_pass_rate |

## Test Hierarchy

| Type | Location | Scope |
|------|----------|-------|
| Unit | `tests/unit/` | Function/method |
| Integration | `tests/integration/` | Component |
| System | `tests/system/` | E2E |
| Regression | `tests/regression/` | Change impact |

## Targets

| Metric | Target |
|--------|--------|
| Coverage | ≥85% |
| Pass rate | ≥95% |
| Duplicates | 0 |

## Quality Gates

| Gate | Agent | Check |
|------|-------|-------|
| Inventory | Researcher | All tests scanned |
| Coverage | Developer | ≥85% achieved |
| Quality | Reviewer | ≥95% pass rate |

## Knowledge Contribution

After test updates:
- Update codegraph with test coverage
- Document test patterns in knowledge

## Handoff Format

```json
{
  "status": "complete",
  "metrics": { "coverage": 87, "pass_rate": 98, "tests_added": 15 },
  "artifacts": ["test suites", "coverage report"],
  "learnings": ["test patterns"]
}
```
