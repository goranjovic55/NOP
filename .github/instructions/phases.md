---
applyTo: '**'
---

# Workflow Phases

Flexible phase system - use what's needed, skip what's not. Main thread always maintains task control.

---

## Phase Overview

| Phase | Purpose | When to Use |
|-------|---------|-------------|
| **CONTEXT** | Load memory, understand scope | Always (can be quick) |
| **PLAN** | Break down complex tasks | Multi-step work |
| **DESIGN** | Architecture decisions | New features, refactors |
| **IMPLEMENT** | Write/modify code | Code changes |
| **DEBUG** | Fix issues | Test failures, bugs |
| **TEST** | Verify changes | After implementation |
| **LEARN** | Update memory | Significant discoveries |
| **COMPLETE** | Summarize, handoff | Task end |

---

## Phase Details

### CONTEXT
**Always first, can be quick for simple tasks**

```
Actions:
- Load project_memory.json (if exists)
- Load global_memory.json (if exists)
- Scan project structure
- Understand user request

Output: Understanding of scope and context
```

### PLAN
**For complex, multi-step tasks**

```
Actions:
- Break down into subtasks
- Identify dependencies
- Estimate scope
- Document approach

Output: Task breakdown with clear deliverables
```

### DESIGN
**For architectural decisions**

```
Actions:
- Analyze existing patterns
- Consider alternatives
- Document trade-offs
- Get approval for major changes

Output: Design decision with rationale
```

### IMPLEMENT
**For code changes**

```
Actions:
- Write/modify code
- Follow project conventions
- Add comments where needed
- Update related files

Output: Working code changes
```

### DEBUG
**For fixing issues**

```
Actions:
- Reproduce issue
- Identify root cause
- Apply fix
- Verify fix works

Output: Fixed code with explanation
```

### TEST
**After implementation**

```
Actions:
- Run existing tests
- Verify no regressions
- Add tests for new code if appropriate
- Report results

Output: Test results, pass/fail status
```

### LEARN
**For significant discoveries**

```
Actions:
- Extract 2-5 key entities
- Update project_memory.json or global_memory.json
- Document patterns worth remembering

Output: Memory updated with learnings
```

### COMPLETE
**Task handoff**

```
Actions:
- Summarize what was done
- List any follow-ups
- Confirm with user if needed

Output: Clear task completion status
```

---

## Phase Selection Guide

| Task Type | Phases |
|-----------|--------|
| **Quick fix** | CONTEXT → IMPLEMENT → TEST |
| **Bug fix** | CONTEXT → DEBUG → TEST → LEARN |
| **New feature** | CONTEXT → PLAN → DESIGN → IMPLEMENT → TEST → LEARN |
| **Refactor** | CONTEXT → PLAN → DESIGN → IMPLEMENT → TEST → LEARN |
| **Investigation** | CONTEXT → PLAN → COMPLETE |
| **Documentation** | CONTEXT → IMPLEMENT → COMPLETE |

---

## Nested Work

When main task requires investigation:

```
[NEST: parent=<main_task> | child=<investigation>]
  ... work on nested task (abbreviated phases) ...
[RETURN: to=<main_task> | result=<findings>]
```

Nested work uses abbreviated phase sets - minimum needed to resolve the issue.

---

## Quality Checkpoints

| Checkpoint | When | Action |
|------------|------|--------|
| **Context verified** | Before IMPLEMENT | Confirm understanding |
| **Design approved** | After DESIGN | User confirmation for major changes |
| **Tests pass** | After TEST | 100% pass required |
| **Task complete** | After COMPLETE | User verification |
