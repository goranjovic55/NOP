---
applyTo: '**'
---

# Structure

## Project Layout
```
project/
├── src/                    # Source (or lib/, app/)
│   ├── models/
│   ├── services/
│   ├── controllers/
│   └── utils/
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
├── .github/
│   ├── agents/             # *.agent.md
│   ├── instructions/
│   ├── workflows/
│   └── global_knowledge.json
└── project_knowledge.json
```

## Agent Framework (.github/)
```
.github/
├── agents/
│   ├── _DevTeam.agent.md    # Orchestrator
│   ├── Architect.agent.md
│   ├── Developer.agent.md
│   ├── Reviewer.agent.md
│   └── Researcher.agent.md
├── instructions/
│   ├── protocols.md
│   ├── phases.md
│   ├── standards.md
│   └── structure.md
├── workflows/
│   └── *.md
└── global_knowledge.json
```

## Knowledge Files
| File | Location | Portable |
|------|----------|----------|
| project_knowledge.json | Root | No |
| global_knowledge.json | .github/ | Yes |

## File Limits
| Type | Max |
|------|-----|
| Source files | 500 lines |
| Test files | 500 lines |
| Knowledge files | 5000 lines |

## Language Conventions
- Python: `snake_case.py`
- JS/TS: `camelCase.ts` or `PascalCase.tsx`
- Tests: `test_*.py` or `*.test.ts`
