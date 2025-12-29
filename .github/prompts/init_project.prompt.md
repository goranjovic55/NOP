---
description: 'New project creation'
mode: agent
---
# Init Project

**Agents**: Architect→Developer→Reviewer

## Flow
```
[DELEGATE: agent=Architect | task="Design architecture"]
→ ARCH blueprint, components

[DELEGATE: agent=Developer | task="Create structure + configs"]
→ Directories, knowledge files

[DELEGATE: agent=Architect | task="Technical specs"]
→ TECH blueprint, APIs

[DELEGATE: agent=Developer | task="Implement skeleton"]
→ Entry points, boilerplate

[DELEGATE: agent=Reviewer | task="Validate"]
→ Compliance report
```

## Structure Output
```
project/
├── src/
├── tests/
├── docs/
├── .github/ (agents/, workflows/, instructions/)
├── project_knowledge.json
└── [lang configs]
```

## Knowledge: 10-20 entities + codegraph from blueprints

## Quality Gates
| Agent | Check |
|-------|-------|
| Architect | Alternatives considered |
| Developer | Conventions followed |
| Reviewer | Tests pass |
