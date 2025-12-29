---
description: 'Knowledge graph optimization'
mode: agent
---
# Update Knowledge

**Agents**: Researcher→Developer→Reviewer  
**Files**: project_knowledge.json + .github/global_knowledge.json

## Flow
```
[DELEGATE: agent=Researcher | task="Extract from workflow logs"]
→ Learnings, entities, relations from log/workflow/*.md

[DELEGATE: agent=Researcher | task="Assess knowledge state"]
→ Gaps, outdated, bloat

[DELEGATE: agent=Researcher | task="Scan codebase"]
→ Entity list, codegraph

[DELEGATE: agent=Developer | task="Update project knowledge"]
→ Integrate findings, optimize entities

[DELEGATE: agent=Researcher | task="Identify universal patterns"]
→ Global candidates

[DELEGATE: agent=Developer | task="Distill to global"]
→ Patterns added

[DELEGATE: agent=Reviewer | task="Validate"]
→ Size check
```

## Cleanup Targets
| Category | Action |
|----------|--------|
| Meta entities | Remove |
| Duplicates >80% | Merge |
| Obsolete 90+ days | Remove |
| Verbose >500 chars | Condense to 60-80 |

## Size Target: <100KB, Entity:Cluster ratio ≥6:1
