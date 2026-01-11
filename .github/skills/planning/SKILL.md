# Planning Skill

> For new features, design tasks, and research phases

## Triggers
- "new feature", "implement", "add functionality"
- "design", "architect", "plan"
- "research", "investigate", "compare"

## Workflow
1. **UNDERSTAND** - Clarify requirements, scope
2. **RESEARCH** - Check existing code, patterns, external sources
3. **DESIGN** - Create blueprint in `.project/blueprints/`
4. **VALIDATE** - Review approach
5. **HANDOFF** - Transition to BUILD phase

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
