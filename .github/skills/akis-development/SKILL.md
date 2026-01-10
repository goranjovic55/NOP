---
name: akis-development
description: Load when editing AKIS framework files including .github/copilot-instructions*, .github/skills/*, .github/agents/*, or project_knowledge.json. Provides token optimization and prompt engineering patterns.
---

# AKIS Development

## ⚠️ Critical Gotchas
- **Skills too terse:** Balance tokens with effectiveness (include Critical Gotchas)
- **Pre-loaded assumption:** Context is NOT pre-attached, require explicit reads
- **Missing enforcement:** Add HARD GATES for discipline
- **Script output ignored:** Agent MUST interpret script suggestions and implement approved ones

## Token Targets

| Component | Target | Max |
|-----------|--------|-----|
| Skills | <250 | 350 |
| Instructions | <150 | 200 |
| Agents | <300 | 500 |
| INDEX.md | <100 | 150 |

## END Phase Scripts

1. Run WITHOUT flag → Show suggestions → Ask user
2. IF agreed → Run with `--update` → Verify files written correctly

**Flow:** Analyze → Ask → (Agree? `--update` → Verify) or (Deviate? Agent writes)

## Rules
- **Tables > prose** for mappings
- **Symbols:** ✓ ◆ ○ ⊘ ⧖ ⚠️ ⭐
- **Always include:** Critical Gotchas section

## Validation
```bash
python .github/scripts/audit.py --target skills
python .github/scripts/audit.py --target agents
```
