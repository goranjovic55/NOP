# Skills Index

Quick reference for common problems → solutions. Query skills during work when stuck.

---

## By Problem Type

### Build & Runtime Errors
- **Problem:** Build fails, runtime crashes, dependency issues
- **Skill:** [debugging.md](debugging.md)
- **Keywords:** error, exception, build, crash, dependency

### Knowledge System
- **Problem:** Query/update project_knowledge.json, understand entities
- **Skill:** [knowledge.md](knowledge.md)
- **Keywords:** knowledge, entities, relations, codegraph, map

### Documentation
- **Problem:** Create/update docs, organize documentation structure
- **Skill:** [documentation.md](documentation.md)
- **Keywords:** docs, README, guides, INDEX

### UI Design
- **Problem:** Consistent styling, cyberpunk theme, components
- **Skill:** [ui-consistency.md](ui-consistency.md)
- **Keywords:** UI, styling, components, theme

---

## By Technology

### Backend Development
- **API patterns:** [backend-api.md](backend-api.md)
- **Keywords:** FastAPI, endpoints, CRUD, REST

### Frontend Development
- **Component patterns:** [frontend-react.md](frontend-react.md)
- **Keywords:** React, TypeScript, components, state

### DevOps
- Docker/containers: TBD (create when pattern emerges)
- CI/CD: TBD (create when pattern emerges)

---

## Session Workflow (Instructions)

For AKIS framework enforcement, see instruction files:

| Phase | Instruction File |
|-------|-----------------|
| Session Start | [context-loading.md](../instructions/context-loading.md) |
| Planning | [task-tracking.md](../instructions/task-tracking.md) |
| Execution | [session-discipline.md](../instructions/session-discipline.md) |
| Session End | [session-end.md](../instructions/session-end.md) |
| Error Recovery | [edge-cases.md](../instructions/edge-cases.md) |
| File Placement | [structure.md](../instructions/structure.md) |

---

## Skill Creation Guidelines

**When to create:**
- Pattern appears in >=5 sessions
- Solution is reusable across projects
- Commands/code can be copy-pasted

**When NOT to create:**
- Project-specific implementation details
- One-off solutions
- Frequently changing patterns

**Format:** <50 lines, executable patterns (see `.github/templates/skill.md`)

---

## Usage Patterns

**During work:**
```bash
# Quick lookup
grep -r "keyword" .github/skills/

# Read specific skill
cat .github/skills/debugging.md
```

**At session end:**
```bash
# Suggest new skills (auto-runs in session_end.py)
python .github/scripts/suggest_skill.py
```

---

*Update this INDEX when adding/removing skills*
