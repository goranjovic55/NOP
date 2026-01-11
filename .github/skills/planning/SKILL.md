---
name: planning
description: Load when defining new features, designing architecture, brainstorming solutions, or researching options. Combines architect + research into one planning workflow.
---

# Planning

## ⚠️ Critical Gotchas
- **Design before code:** Create blueprint in `.project/blueprints/` first
- **Research first:** Gather info before making decisions
- **Document decisions:** Capture why, not just what

## Triggers

| Context | Load? |
|---------|-------|
| "new feature", "new api", "new component" | ✓ |
| "design", "architect", "blueprint" | ✓ |
| "how should we", "what approach" | ✓ |
| "research", "investigate", "explore" | ✓ |
| "compare options", "pros and cons" | ✓ |
| "add a [feature]", "build a [feature]" | ✓ |

## Workflow

```
UNDERSTAND → What problem? What scope?
RESEARCH   → Options, patterns, existing solutions
DESIGN     → Blueprint in .project/blueprints/
VALIDATE   → Check against existing code
HANDOFF    → Ready for implementation skills
```

## Blueprint Template

Create in `.project/blueprints/FEATURE-NAME.md`:

```markdown
# Feature: [Name]

## Problem
What we're solving and why.

## Design
- Components needed
- Integration points
- Data flow

## Implementation
1. Backend: [what] → load backend-api skill
2. Frontend: [what] → load frontend-react skill
3. Tests: [what] → load testing skill
```

## Output

After planning, the next skills to load:
- `backend-api` for Python/FastAPI work
- `frontend-react` for React/TypeScript work
- `testing` for test implementation
