---
name: akis-development
description: Load when editing AKIS framework files including .github/copilot-instructions*, .github/skills/*, .github/agents/*, or project_knowledge.json. Provides token optimization and prompt engineering patterns.
---

# AKIS Development

## Rules
- **<200 tokens** per skill/instruction file
- **Skill cache:** Load once per domain per session
- **Tables > prose** for mappings and triggers
- **Symbols:** ✓ ◆ ○ ⊘ ⧖ ⚠️ ⭐

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Verbose paragraphs | Numbered steps |
| Reload same skill | Cache loaded skills |
| Long code examples | Essential pattern only |

## Token Targets

| File Type | Target | Max |
|-----------|--------|-----|
| Skills | <200 | 350 |
| Instructions | <150 | 200 |
| INDEX.md | <100 | 150 |

## Validation
```bash
python .github/scripts/audit.py --target skills
```
