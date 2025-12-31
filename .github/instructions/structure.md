---
applyTo: '**'
---

# Structure

## AKIS Framework

```
.github/
├── agents/                  # Defines WHO and WHEN
│   ├── _DevTeam.agent.md   # Orchestrator (delegation)
│   ├── Architect.agent.md  # Design (how to design)
│   ├── Developer.agent.md  # Code (how to implement)
│   ├── Reviewer.agent.md   # Test (how to validate)
│   └── Researcher.agent.md # Investigate (how to research)
├── instructions/            # Framework protocols
│   ├── phases.md           # 7-phase flow
│   ├── protocols.md        # Emissions, delegation
│   ├── structure.md        # This file
│   └── templates.md        # Output formats
├── prompts/
│   └── update_akis.prompt.md
└── copilot-instructions.md # Entry point

.claude/
└── skills.md               # 9 core patterns

project_knowledge.json      # Entities, codegraph, relations

log/workflow/               # Session logs
└── YYYY-MM-DD_HHMMSS_task-slug.md
```

## Knowledge Format (JSONL)

```json
{"type":"entity","name":"Domain.Module","entityType":"type","observations":["desc, upd:YYYY-MM-DD"]}
{"type":"codegraph","name":"file.py","language":"python","exports":["Class"],"imports":["module"]}
{"type":"relation","from":"A","to":"B","relationType":"USES"}
```

## File Limits

| Type | Max |
|------|-----|
| Instructions | <200 lines |
| Agent files | <100 lines |
| Individual Skills | <300 lines (SKILL.md with examples) |
| Knowledge | <100KB |
