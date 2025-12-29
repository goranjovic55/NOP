---
description: 'Agent/instruction optimization from session analysis'
mode: agent
---
# Update Agents

**Agents**: Researcher→Developer→Reviewer

## Sources
- `log/workflow/*.md` - Session decision trees, blockers
- `project_knowledge.json` - Entity gaps
- `.github/agents/*.agent.md` - Protocol gaps
- `.github/instructions/*.md` - Missing patterns

## Flow
```
[DELEGATE: agent=Researcher | task="Analyze workflow logs"]
→ Extract decision trees, blockers, delegation failures from log/workflow/*.md

[DELEGATE: agent=Researcher | task="Cross-reference knowledge"]
→ Map gaps: knowledge entities vs agent capabilities

[DELEGATE: agent=Researcher | task="Detect effectiveness issues"]
→ Repeated patterns, slow resolutions, missing handoffs

[DELEGATE: agent=Developer | task="Update agent protocols"]
→ Add missing decision paths, clarify handoffs

[DELEGATE: agent=Developer | task="Update instructions"]
→ Add patterns that prevent rediscovery

[DELEGATE: agent=Reviewer | task="Validate"]
→ No regressions, faster task completion
```

## Effectiveness Signals
| Pattern | Issue | Fix |
|---------|-------|-----|
| Multiple [ATTEMPT:] | Missing skill/pattern | Add to instructions |
| [DECISION:] repeated | Unclear protocol | Update agent |
| Blocker in logs | Missing capability | Extend agent scope |
| Same fix twice | Pattern not codified | Add to skills |

## Commands
```bash
# Decision tree gaps
grep -h "DECISION\|ATTEMPT" log/workflow/*.md | sort | uniq -c | sort -rn | head -10

# Blockers and failures
grep -h "blocked\|failed\|✗" log/workflow/*.md | head -10

# Delegation patterns
grep -h "DELEGATE\|SUBAGENT" log/workflow/*.md | cut -d'|' -f2 | sort | uniq -c
```

## Quality Gates
| Agent | Check |
|-------|-------|
| Researcher | All logs analyzed, gaps identified |
| Developer | Minimal edits, no bloat |
| Reviewer | Future sessions faster |

## Knowledge: Update codegraph with agent dependencies
