---
name: documentation
description: Update docs, READMEs, comments. Returns trace to AKIS.
---

# Documentation Agent

> `@documentation` | Update docs with trace

## Triggers
| Pattern | Type |
|---------|------|
| doc, readme, explain, document | Keywords |
| .md | Extensions |
| docs/, .github/agents/, .github/instructions/ | Directories |
| .github/skills/, project_knowledge | AKIS |

## Requirements (⛔ ENFORCED)
| Section | Required |
|---------|----------|
| Examples | ⛔ Code samples mandatory |
| Usage | ⛔ Quickstart section |
| Updated | ⛔ Last-updated date |

## Output
```markdown
## Documentation: [Target]
### Files: path/README.md (changes)
### Examples: ✓ included
### Last Updated: YYYY-MM-DD
[RETURN] ← documentation | result: updated | files: N
```

## ⚠️ Gotchas
- Check docs/INDEX.md | Match existing style
- Update INDEX.md if adding new docs

## Orchestration
| From | To |
|------|----|
| AKIS, architect | AKIS |
