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
{"type":"entity","name":"Domain.Module","entityType":"type","observations":["desc, upd:YYYY-MM-DD"]}
{"type":"codegraph","name":"file.py","language":"python","exports":["Class"],"imports":["module"]}
{"type":"relation","from":"A","to":"B","relationType":"USES"}
```

## File Limits

| Type | Max Lines |
|------|-----------|
| copilot-instructions | 100 |
| Instructions | 50 |
| Agent files | 50 |
| Skills | 100 |
