---
name: akis-development
description: Load when editing AKIS framework files including .github/copilot-instructions*, .github/skills/*, .github/agents/*, or project_knowledge.json. Provides token optimization and prompt engineering patterns.
---

# AKIS Development

## ⚠️ Critical Gotchas
- **Skills too terse:** Balance tokens with effectiveness (include Critical Gotchas)
- **Pre-loaded assumption:** Context is NOT pre-attached, require explicit reads
- **Missing enforcement:** Add HARD GATES for discipline

## Token Targets (Balanced)

| File Type | Target | Max | Notes |
|-----------|--------|-----|-------|
| Skills | <250 | 350 | Include gotchas! |
| Instructions | <150 | 200 | Complementary |
| INDEX.md | <100 | 150 | Quick reference |

## Rules
- **Skill cache:** Load once per domain per session
- **Tables > prose** for mappings and triggers
- **Symbols:** ✓ ◆ ○ ⊘ ⧖ ⚠️ ⭐
- **Always include:** Critical Gotchas section in skills

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Verbose paragraphs | Numbered steps |
| Token-only focus | Balance effectiveness |
| Skip gotchas | Include ⚠️ Critical Gotchas |

## Validation
```bash
python .github/scripts/audit.py --target skills
```
