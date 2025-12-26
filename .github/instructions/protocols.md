---
applyTo: '**'
---

# Multi-Agent Protocols

Structured communication for orchestrator-specialist collaboration.

---

## Session Protocol

### Session Start (Orchestrator)
```
[SESSION: role=Lead | task=<description> | phase=CONTEXT]
```

### Session Start (Specialist - Direct)
```
[SESSION: role=<Architect|Developer|Reviewer|Researcher> | task=<description>]
```

---

## Delegation Protocol

### Orchestrator → Specialist
```
[DELEGATE: agent=<specialist> | task=<description>]
Context: {problem, constraints, files, expected_output}
```

### Specialist → Orchestrator
```
[RETURN: to=DevTeam | status=<complete|partial|blocked> | result=<summary>]
Artifacts: [files]
Learnings: [patterns]
```

---

## Context Handoff

### Full Context (Complex Tasks)
```json
{
  "task": "specific task description",
  "context": {
    "problem": "what needs solving",
    "constraints": ["list of constraints"],
    "existing_patterns": "from knowledge",
    "files_involved": ["file1.py"],
    "expected_output": "deliverable"
  },
  "knowledge_snapshot": {
    "relevant_entities": ["Entity.A"],
    "relevant_codegraph": ["Component.X"],
    "recent_decisions": ["decision1"]
  }
}
```

### Minimal Context (Simple Tasks)
```json
{
  "task": "brief description",
  "files": ["file.py"],
  "expected": "what to return"
}
```

---

## Return Contract

### Complete
```json
{
  "status": "complete",
  "result": "what was done",
  "artifacts": ["files modified"],
  "learnings": ["patterns found"],
  "codegraph_updates": ["nodes to add"]
}
```

### Partial
```json
{
  "status": "partial",
  "result": "what was done",
  "remaining": "what's left",
  "blockers": ["why stopped"]
}
```

### Blocked
```json
{
  "status": "blocked",
  "blocker": "what's blocking",
  "need": "what's required",
  "recommendations": ["alternatives"]
}
```

---

## Nesting Protocol

### Enter Nested Task
```
[NEST: parent=<main_task> | child=<sub_task> | reason=<why>]
```

### Exit Nested Task
```
[RETURN: to=<main_task> | result=<findings>]
```

---

## Knowledge Protocol

### Knowledge Update
```
[KNOWLEDGE: added=<N> | updated=<M> | type=<project|global>]
```

### Learning Categories
| Type | Target | Examples |
|------|--------|----------|
| entity | project_knowledge.json | Domain concepts, config |
| codegraph | project_knowledge.json | Code structure, deps |
| relation | project_knowledge.json | Connections between entities |
| pattern | global_knowledge.json | Universal reusable patterns |

---

## Completion Protocol

### Task Complete
```
[COMPLETE: task=<description> | result=<summary> | learnings=<N>]
```

### Session End
```
[SESSION: end | knowledge_updated=<bool> | duration=<time>]
```

---

## Phase Transitions

### Orchestrator Phases
```
CONTEXT → PLAN → COORDINATE → INTEGRATE → VERIFY → LEARN → COMPLETE
```

### Phase Announcement
```
[PHASE: <phase_name> | progress=<X/Y> | next=<next_phase>]
```

---

## Error Protocol

### Error Encountered
```
[ERROR: type=<error_type> | context=<where> | action=<recovery>]
```

### Recovery Actions
| Error | Action |
|-------|--------|
| Knowledge corrupt | Backup, create fresh |
| Specialist blocked | Escalate to orchestrator |
| Context lost | Re-emit SESSION tag |
| Validation failed | Delegate to Reviewer |
