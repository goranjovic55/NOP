```markdown
---
applyTo: '**'
---

# Structure

## AKIS Files

```
.github/
├── agents/              # WHO: _DevTeam, Architect, Developer, Reviewer, Researcher
├── instructions/        # HOW: phases, protocols, templates, structure
├── skills/              # PATTERNS: backend-api, security, testing, etc.
└── copilot-instructions.md  # Entry point

project_knowledge.json   # WHAT: entities, relations, codegraph
log/workflow/            # Session logs
```

## Knowledge Format (JSONL)

```json
{"type":"entity","name":"Module.Component","entityType":"type","observations":["desc, upd:YYYY-MM-DD"]}
{"type":"relation","from":"A","to":"B","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
{"type":"codegraph","name":"file.ext","dependencies":["X"],"dependents":["Y"]}
```

## File Limits

| Type | Max Lines |
|------|-----------|
| copilot-instructions | 100 |
| Instructions | 50 |
| Agent files | 50 |
| Skills | 100 |

## Project Structure

```
src/backend/, src/frontend/  →  tests/  →  docs/  →  scripts/  →  docker/  →  log/workflow/
```

**Layer**: Route/Page → Service → Model/Store
