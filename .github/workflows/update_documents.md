# Update Documents Workflow

**Purpose**: Documentation compliance via analysis→implementation | **Orchestrator**: DevTeam | **Specialists**: Researcher→Developer→Reviewer | **Target**: Ultra-condensed compliant documentation

## Agent Delegation

| Phase | Agent | Focus |
|-------|-------|-------|
| PRE | DevTeam | Inventory, validation |
| 0,1,3,5,7 | Researcher | Analysis phases |
| 2,4,6,8,9 | Developer | Implementation phases |
| POST | Reviewer | Verification |

## Execution Pattern

```
[DELEGATE: agent=Researcher | task="Plan consolidation strategy"]
→ Returns: Consolidation map, target 10-15 core docs
[DELEGATE: agent=Researcher | task="Analyze template compliance"]
→ Returns: Gaps, condensation opportunities
[DELEGATE: agent=Developer | task="Apply template fixes"]
→ Returns: Condensed compliant docs
[DELEGATE: agent=Researcher | task="Detect duplication clusters"]
→ Returns: Merge opportunities
[DELEGATE: agent=Developer | task="Consolidate to core docs"]
→ Returns: Comprehensive docs, archived obsolete
[DELEGATE: agent=Researcher | task="Check codebase alignment"]
→ Returns: Coverage gaps, outdated references
[DELEGATE: agent=Developer | task="Create documentation index"]
→ Returns: Navigation, cross-refs
[DELEGATE: agent=Reviewer | task="Validate structure"]
→ Returns: Compliance report
```

## Phase Operations

| Phase | Agent | Operations |
|-------|-------|------------|
| PRE | DevTeam | list_all_docs\|identify_orphaned\|validate_links |
| 0 | Researcher | cluster_duplicates\|identify_core\|plan_merges |
| 1 | Researcher | analyze_template_compliance |
| 2 | Developer | apply_template\|compress_content |
| 3 | Researcher | analyze_duplication |
| 4 | Developer | consolidate_to_core\|archive_obsolete |
| 5 | Researcher | analyze_naming\|identify_placement |
| 6 | Developer | rename_docs\|move_to_location |
| 7 | Researcher | analyze_codebase_alignment |
| 8 | Developer | update_references |
| 9 | Developer | create_index\|generate_navigation |
| POST | Reviewer | validate_core\|verify_archive |

## Document Naming

| Type | Pattern | Location |
|------|---------|----------|
| ARCH | `ARCH_[system]_v[N].md` | `/docs/architecture/` |
| API | `API_[service]_v[N].md` | `/docs/technical/` |
| PROC | `PROC_[process]_v[N].md` | `/docs/blueprints/` |
| GUIDE | `GUIDE_[feature]_v[N].md` | `/docs/user/` |

## Consolidation Targets

| Metric | Target |
|--------|--------|
| Core docs | 10-15 |
| Archive rate | 70%+ |
| Duplication | <5% |

## Quality Gates

| Gate | Agent | Check |
|------|-------|-------|
| Analysis | Researcher | Clusters identified |
| Consolidation | Developer | Merge completed |
| Compliance | Reviewer | All docs standardized |

## Handoff Format

```json
{
  "status": "complete",
  "metrics": { "initial_docs": 150, "core_docs": 12, "archived": 110 },
  "artifacts": ["core docs", "index"],
  "learnings": ["consolidation patterns"]
}
```
