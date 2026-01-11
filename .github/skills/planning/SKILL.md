# Planning Skill v7.1

> For new features, design tasks, and architecture

## Triggers
- "new feature", "implement", "add functionality"
- "design", "architect", "plan"

## ⚠️ Critical Gotchas
- **Blueprint before code:** NEVER implement without design doc
- **Research auto-chains:** Don't skip - improves resolution by 4.9%
- **Scope creep:** Define boundaries in blueprint, stick to them
- **Complexity check:** Complex (6+ files) → MUST use planning

## Workflow
1. **UNDERSTAND** - Clarify requirements, scope
2. **RESEARCH** - ⚡ Auto-chain: Load [research skill](../research/SKILL.md)
3. **DESIGN** - Create blueprint in `.project/blueprints/`
4. **VALIDATE** - Review approach against research findings
5. **HANDOFF** - Transition to BUILD phase

## Research Integration
```
UNDERSTAND → research skill (GATHER→ANALYZE→SYNTHESIZE) → DESIGN
```
- Research skill runs automatically during phase 2
- Findings inform DESIGN decisions
- Skip research only if trivial change

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
- Data flow:

## Tasks
1. [ ] Task 1
2. [ ] Task 2

## Risks
-
```

## Rules
- Create blueprint BEFORE implementing
- Keep blueprints in `.project/blueprints/`
- Update blueprint as design evolves
- Reference blueprint in workflow log
