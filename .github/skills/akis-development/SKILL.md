---
name: akis-development
description: Load when editing AKIS framework files including .github/copilot-instructions*, .github/skills/*, .github/agents/*, or project_knowledge.json. Provides token optimization and prompt engineering patterns.
---

# AKIS Development

## ⚠️ Critical Gotchas
- **Skills too terse:** Balance tokens with effectiveness (include Critical Gotchas)
- **Pre-loaded assumption:** Context is NOT pre-attached, require explicit reads
- **Missing enforcement:** Add HARD GATES for discipline
- **Agent verbosity:** Remove ASCII art, use template references
- **Duplicate content:** Skills table in agent → reference INDEX.md
- **Script output ignored:** Agent MUST interpret script suggestions and implement approved ones

## Token Targets (Balanced)

| Component | Target | Max | Notes |
|-----------|--------|-----|-------|
| Skills | <250 | 350 | Include gotchas! |
| Instructions | <150 | 200 | Complementary |
| Agents | <300 | 500 | Essential only |
| INDEX.md | <100 | 150 | Quick reference |

## END Phase Scripts

**Two-step flow:**
1. Run WITHOUT flag → Show suggestions → Ask user
2. IF agreed → Run with `--update` → Verify files written correctly

| Script | Default | --update | After --update |
|--------|---------|----------|----------------|
| `knowledge.py` | Analyze | Auto-append | Verify entities |
| `skills.py` | Analyze | Auto-create | Verify files |
| `instructions.py` | Analyze | Auto-create | Verify files |
| `docs.py` | Analyze | Auto-update | Verify docs |
| `agents.py` | Analyze | Auto-update | Verify agents |

**Flow:** Analyze → Ask → (Agree? `--update` → Verify) or (Deviate? Agent writes)

## Agent Optimization Pattern

1. **Audit first:** `python .github/scripts/audit.py --target agents`
2. **Remove duplicates:** Skills table → reference INDEX.md
3. **Compress sections:** ASCII art → single line
4. **Use references:** Templates → `.github/templates/`
5. **Measure:** 100k simulation before/after

## Rules
- **Tables > prose** for mappings
- **Symbols:** ✓ ◆ ○ ⊘ ⧖ ⚠️ ⭐
- **Always include:** Critical Gotchas section
- **Reference templates:** Don't embed verbose examples

## Avoid

| ❌ Bad | ✅ Good |
|--------|---------|
| Verbose paragraphs | Numbered steps |
| Token-only focus | Balance effectiveness |
| Embedded templates | Reference .github/templates/ |
| ASCII art summaries | Single-line format |

## Validation
```bash
python .github/scripts/audit.py --target skills
python .github/scripts/audit.py --target agents
```
