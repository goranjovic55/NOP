---
name: akis-development
description: Load when editing AKIS framework files including .github/copilot-instructions*, .github/skills/*, .github/agents/*, or project_knowledge.json. Provides token optimization and prompt engineering patterns.
---

# AKIS Development

## ⚠️ Critical Gotchas
- **Skills too terse:** Balance tokens with effectiveness (include Critical Gotchas)
- **Pre-loaded assumption:** Context is NOT pre-attached, require explicit reads
- **Missing enforcement:** Add HARD GATES for discipline
- **Script output ignored:** Agent MUST present script suggestions, ASK user before applying
- **No END summary:** MUST present END summary table to user

## Optimization Targets (⛔ MANDATORY)

| Target | Goal | How |
|--------|------|-----|
| Tokens | MIN | Tables > prose, symbols, no filler |
| API Calls | MIN | Batch reads, parallel tools |
| Speed | MAX | Pre-load skills, hot cache |
| Resolution | MAX | Gotchas, patterns, examples |
| Traceability | MAX | TODO states, END summary |
| Performance | MAX | G7 parallel, smart delegation |
| Cognitive | MIN | Clear triggers, one ◆ rule |

## Standardized Edit Rules (⛔ ENFORCED)

| Content | Format | Structure |
|---------|--------|----------|
| Skills | Tables + code blocks | Gotchas → Rules → Patterns |
| Agents | Tables + output template | Triggers → Checklist → Output |
| Instructions | Bullet tables | Phase → Action → Tool |
| Knowledge | JSONL, dedup | module + context |

## Compliance Checks
```bash
# Before commit
python .github/scripts/skills.py   # <350 words, has Gotchas
python .github/scripts/agents.py   # <500 words, has triggers
```

## END Summary Table (Required)

| Metric | Value |
|--------|-------|
| Tasks | X/Y completed |
| Tokens | ~X saved |
| API Calls | ~X saved |
| Resolution | X% |
| Files | X modified |
| Commits | X pushed |

**After scripts:** Present suggestions → ASK user → Apply if approved

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
