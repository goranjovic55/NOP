# Refactor Code

**Purpose**: Code optimization | **Agents**: Researcher→Developer→Reviewer

## Targets
| Metric | Good | Critical |
|--------|------|----------|
| File size | <500 | >1000 |
| Complexity | <10 | >20 |
| Nesting | <4 | >5 |

## Flow
```
[DELEGATE: agent=Researcher | task="Inventory + detect issues"]
→ Metrics, large files, unused code

[DELEGATE: agent=Developer | task="Remove dead code"]
→ Cleaned files

[DELEGATE: agent=Researcher | task="Detect duplicates"]
→ Merge candidates

[DELEGATE: agent=Developer | task="Consolidate"]
→ Merged utilities

[DELEGATE: agent=Researcher | task="Analyze large files"]
→ Split plan

[DELEGATE: agent=Developer | task="Split files"]
→ New structure

[DELEGATE: agent=Reviewer | task="Validate"]
→ No regressions
```

## Quality Gates
| Agent | Check |
|-------|-------|
| Researcher | Complete scan |
| Developer | Dead code removed |
| Reviewer | All tests pass |

## Knowledge: Update codegraph, document extracted patterns
