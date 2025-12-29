---
description: 'Onboard existing project'
mode: agent
---
# Import Project

**Agents**: Researcher→Developer→Reviewer

## Flow
```
[DELEGATE: agent=Researcher | task="Analyze tech stack"]
→ Tech report, patterns

[DELEGATE: agent=Developer | task="Create standard structure"]
→ Dirs, configs

[DELEGATE: agent=Researcher | task="Scan codebase"]
→ Code inventory, patterns

[DELEGATE: agent=Developer | task="Generate knowledge graph"]
→ project_knowledge.json

[DELEGATE: agent=Reviewer | task="Validate compliance"]
→ Readiness status
```

## Structure Output
```
project/
├── src/ (preserve + organize)
├── tests/
├── docs/
├── .github/
├── project_knowledge.json
└── [configs]
```

## Knowledge: EMPTY entities (build during work) + codegraph from scan

## Quality Gates
| Agent | Check |
|-------|-------|
| Researcher | Patterns identified |
| Developer | Knowledge initialized |
| Reviewer | All compliant |
