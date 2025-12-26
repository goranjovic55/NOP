# Refactor Code Workflow

**Purpose**: Code optimization via legacy removal, consolidation, splitting, performance tuning | **Orchestrator**: DevTeam | **Specialists**: Researcher→Developer→Reviewer | **Target**: Clean codebase, optimal file sizes, improved performance, zero breakage

## Agent Delegation

| Phase | Agent | Focus |
|-------|-------|-------|
| 0 | Researcher | Code inventory, metrics |
| 1,3,5,7,9 | Researcher | Analysis phases |
| 2,4,6,8,10 | Developer | Implementation phases |
| POST | Reviewer | Verification, testing |

## Execution Pattern

```
[DELEGATE: agent=Researcher | task="Inventory codebase and detect issues"]
→ Returns: Metrics, large files, unused code, duplicates
[DELEGATE: agent=Developer | task="Remove dead code"]
→ Returns: Cleaned files, removed lines count
[DELEGATE: agent=Researcher | task="Detect duplication patterns"]
→ Returns: Duplication report, merge candidates
[DELEGATE: agent=Developer | task="Consolidate duplicates"]
→ Returns: Merged utilities, updated references
[DELEGATE: agent=Researcher | task="Analyze large files for splitting"]
→ Returns: Split plan, module boundaries
[DELEGATE: agent=Developer | task="Split large files"]
→ Returns: New file structure, updated imports
[DELEGATE: agent=Reviewer | task="Run full test suite and validate"]
→ Returns: Test results, regression check
```

## Refactoring Targets

| Metric | Good | Review | Critical |
|--------|------|--------|----------|
| File size | <500 lines | 500-1000 | >1000 |
| Complexity | <10 | 10-20 | >20 |
| Nesting | <4 levels | 4-5 | >5 |

## Phase Operations

| Phase | Agent | Operations |
|-------|-------|------------|
| 0 | Researcher | scan_codebase\|measure_sizes\|calculate_complexity |
| 1 | Researcher | analyze_usage\|track_refs\|detect_unused |
| 2 | Developer | remove_unused\|clean_comments |
| 3 | Researcher | detect_duplicates\|analyze_similarity |
| 4 | Developer | extract_common\|create_utilities |
| 5 | Researcher | identify_large_files\|analyze_cohesion |
| 6 | Developer | split_files\|update_imports |
| 7 | Researcher | profile_performance\|detect_bottlenecks |
| 8 | Developer | optimize_algorithms\|add_caching |
| 9 | Researcher | run_suite\|check_coverage |
| 10 | Developer | fix_tests\|final_validation |
| POST | Reviewer | compare_metrics\|validate_no_breakage |

## Quality Gates

| Gate | Agent | Check |
|------|-------|-------|
| Inventory | Researcher | Complete scan, metrics calculated |
| Removal | Developer | Dead code removed, imports cleaned |
| Tests | Reviewer | All tests pass, no regressions |

## Knowledge Contribution

After refactoring:
- Update codegraph in `project_knowledge.json`
- Document extracted patterns in global knowledge
- Map new module structure

## Handoff Format

```json
{
  "status": "complete",
  "metrics": { "lines_removed": 500, "files_split": 3 },
  "artifacts": ["refactored files", "new utilities"],
  "learnings": ["patterns extracted", "bottlenecks fixed"]
}
```
