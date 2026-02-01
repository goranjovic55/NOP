---
name: planning
description: Task breakdown, complexity analysis, and work organization. Load for new features, multi-step tasks, or when planning is needed.
---

# Planning

## Complexity Levels

| Level | Files | Tasks | Delegation |
|-------|-------|-------|------------|
| Simple | 1-2 | 1-3 | Optional |
| Medium | 3-5 | 4-5 | Recommended |
| Complex | 6+ | 6+ | MANDATORY |

## Task Breakdown

1. **Identify scope**: What needs to change?
2. **List files**: Which files will be modified?
3. **Dependencies**: What order is required?
4. **Estimate**: How complex is each task?

## TODO Creation

```
○ [agent:phase:skill] Task description [context]
```

### Context Tags
- `parent→X` - Parent task ID
- `deps→Y,Z` - Dependencies
- `blocks→A` - Blocks other task

## Delegation Decision

| Criteria | Action |
|----------|--------|
| 3+ files | Delegate to specialized agent |
| 6+ tasks | Use parallel agent pairs |
| Mixed domains | Split by domain (frontend/backend) |
| Research needed | Research agent first |

## Parallel Pairs

| Pair | When |
|------|------|
| code + docs | Feature with documentation |
| code + tests | TDD or test addition |
| debugger + docs | Bug fix with docs update |
| frontend + backend | SEQUENTIAL (API contract first) |

## Planning Template

```markdown
## Task: [Name]

### Scope
[What needs to change]

### Files
- [ ] file1.py - [change]
- [ ] file2.tsx - [change]

### Dependencies
1. [First] → 2. [Second] → 3. [Third]

### Delegation
- @code: Implementation tasks
- @documentation: Doc updates
- @debugger: If issues arise

### Complexity: [simple|medium|complex]
```
