# Research Skill v7.1

> Gather industry/community standards before design

## Triggers
- "research", "investigate", "compare", "best practice"
- Auto-chain from planning skill (RESEARCH phase)
- External standards needed

## ⚠️ Critical Gotchas
- **Local first:** Always check docs/ + codebase BEFORE external (saves tokens)
- **Time box:** Keep research <5 min per topic
- **Cache findings:** Update project_knowledge.json with discoveries
- **Cite sources:** Document where standards came from

## Sources (Priority Order)
1. **Local docs/** - Project documentation
2. **Codebase** - Existing patterns, implementations
3. **External** - Industry standards, community practices

## Workflow: GATHER→ANALYZE→SYNTHESIZE

### 1. GATHER
```
Local:  grep/semantic_search docs/ + codebase
External: fetch industry patterns, community standards
```

### 2. ANALYZE
| Source | Check |
|--------|-------|
| Local | Existing patterns, conventions |
| Industry | Standards (REST, OAuth, WCAG) |
| Community | Best practices, common pitfalls |

### 3. SYNTHESIZE
Return to caller with:
- Applicable standards
- Recommended patterns
- Gotchas to avoid

## Research Template
```markdown
## Research: {topic}

### Local Patterns
- Found:
- Gaps:

### Industry Standards
- Applicable:
- Compliance:

### Community Practices
- Recommended:
- Avoid:

### Recommendation
-
```

## Rules
- Check local FIRST (saves tokens)
- Document findings for reuse
- Update project_knowledge.json with discoveries
- Keep research <5 min per topic
