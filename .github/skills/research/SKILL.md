# Research Skill v7.1

> Gather standards and best practices before design

## Triggers
- "research", "investigate", "compare", "best practice"
- Called from planning phase
- External standards needed

## ⚠️ Critical Gotchas
- **Local first:** Check docs/ + codebase BEFORE external (saves tokens)
- **Time box:** Keep research <5 min per topic
- **Cache findings:** Update knowledge file with discoveries
- **Cite sources:** Document where standards came from

## Sources (Priority Order)

| Priority | Source | When |
|----------|--------|------|
| 1 | Project docs/ | Always first |
| 2 | Codebase patterns | Existing implementations |
| 3 | External | Industry standards, community |

## Workflow: GATHER → ANALYZE → SYNTHESIZE

| Phase | Action |
|-------|--------|
| GATHER | grep/search local, then external |
| ANALYZE | Compare patterns, check standards |
| SYNTHESIZE | Return findings + recommendation |

## Output Format
```
## Research: {topic}
### Local: [patterns found]
### Standards: [applicable]
### Recommendation: [action]
```

## Rules
- Check local FIRST (saves tokens)
- Document findings for reuse
- Keep research <5 min per topic
