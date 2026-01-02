---
description: 'Test optimization'
mode: agent
---
# Update Tests

**Agents**: Researcher→Developer→Reviewer

## Targets
- Coverage: ≥85%
- Pass rate: ≥95%
- Duplicates: 0

## Flow
```
[DELEGATE: agent=Researcher | task="Inventory tests"]
→ Test map, gaps

[DELEGATE: agent=Researcher | task="Analyze coverage"]
→ Untested paths

[DELEGATE: agent=Developer | task="Create missing tests"]
→ New suites

[DELEGATE: agent=Researcher | task="Analyze organization"]
→ Duplicates, misplaced

[DELEGATE: agent=Developer | task="Reorganize"]
→ Organized hierarchy

[DELEGATE: agent=Researcher | task="Check alignment"]
→ Obsolete tests

[DELEGATE: agent=Developer | task="Remove obsolete"]
→ Aligned tests

[DELEGATE: agent=Reviewer | task="Validate"]
→ Coverage %, pass rate
```

## Hierarchy
| Type | Location |
|------|----------|
| Unit | tests/unit/ |
| Integration | tests/integration/ |

## Knowledge: Update codegraph with coverage, document test patterns
