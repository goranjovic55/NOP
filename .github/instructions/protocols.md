---
applyTo: '**'
---

# Protocols

## Session
```
[SESSION: role=Lead|Architect|Developer|Reviewer|Researcher | task=<desc> | phase=CONTEXT]
```

## Delegation
```
[DELEGATE: agent=<specialist> | task=<desc>]
Context: {"task":"...", "context":{"problem":"...", "files":[]}, "expected":"..."}

[RETURN: to=DevTeam | status=complete|partial|blocked | result=<summary>]
Artifacts: [files] | Learnings: [patterns]
```

## Return Contract
```json
{"status":"complete", "result":"...", "artifacts":[], "learnings":[], "blockers":[]}
```

## Nesting
```
# Simple:
[NEST: parent=<main> | child=<sub> | reason=<why>]
[RETURN: to=<main> | result=<findings>]

# Multi-level stack:
[STACK: push | task=<sub> | depth=N | parent=<main>]
[STACK: pop | task=<sub> | depth=N-1 | result=<findings>]
```

## Phases (Horizontal)
```
[PHASE: CONTEXT|PLAN|COORDINATE|INTEGRATE|VERIFY|LEARN|COMPLETE | progress=N/7 | next=<phase>]
```

## Knowledge
```
[KNOWLEDGE: added=N | updated=M | type=project|global]
```
| Type | Target | Examples |
|------|--------|----------|
| entity | project_knowledge.json | Domain concepts |
| codegraph | project_knowledge.json | Code structure |
| relation | project_knowledge.json | Connections |
| pattern | global_knowledge.json | Universal patterns |

## Completion
```
[COMPLETE: task=<desc> | result=<summary> | learnings=N]
[SESSION: end | knowledge_updated=bool]
```

## Workflow Log (Significant Work)
```
[WORKFLOW_LOG: task=<desc>]
## Summary | Agent Interactions | Files | Quality Gates | Learnings
[/WORKFLOW_LOG]
```

## Error Recovery
| Error | Action |
|-------|--------|
| Knowledge corrupt | Backup, create fresh |
| Specialist blocked | Escalate to orchestrator |
| Context lost | Re-emit SESSION |
