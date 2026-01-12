# Planning Skill v7.1

> For new features, design tasks, and architecture

## Triggers
- "new feature", "implement", "add functionality"
- "design", "architect", "plan"

## ⚠️ Critical Gotchas
- **Blueprint before code:** NEVER implement without design doc
- **Research first:** Check docs/ + codebase BEFORE external (saves tokens)
- **Scope creep:** Define boundaries in blueprint, stick to them
- **Complexity check:** Complex (6+ files) → MUST use planning

## Workflow: UNDERSTAND → RESEARCH → DESIGN → HANDOFF

| Phase | Action |
|-------|--------|
| UNDERSTAND | Clarify requirements, scope |
| RESEARCH | Local first: docs/, codebase, then external |
| DESIGN | Create blueprint in `.project/` |
| HANDOFF | Transition to BUILD phase |

## Research (Integrated)
1. **Local first:** grep/search docs/ + codebase
2. **External:** Industry standards only if needed
3. **Synthesize:** Document findings for reuse
4. **Time box:** <5 min per topic

## Blueprint Template
```markdown
# Feature: {name}

## Scope
- Goal:
- Files:
- Dependencies:

## Design
- Approach:
- Components:

## Tasks
1. [ ] Task 1
2. [ ] Task 2
```

## Rules
- Create blueprint BEFORE implementing
- Keep blueprints in `.project/`
- Update blueprint as design evolves
