---
applyTo: "**"
---

# Protocols v7.0 (100k Simulation Optimized)

## Enforcement (6 Hard Gates)

| Gate | Violation | Rate* | Action |
|------|-----------|-------|--------|
| G1 | No ◆ task | 10.1% | Create TODO first |
| G2 | No skill loaded | 31.1% | Load skill, announce |
| G3 | START not done | 8.1% | Do START steps |
| G4 | END skipped | 22.1% | Run END scripts |
| G5 | No verification | 17.9% | Check syntax/tests |
| G6 | Multiple ◆ | 5.2% | Only ONE ◆ |

*Baseline deviation rates from 100k simulation

## Skill Triggers (⛔ G2 - 31.1% deviation)

| Pattern | Skill | Pattern | Skill |
|---------|-------|---------|-------|
| .tsx .jsx | frontend-react ⭐ | Dockerfile | docker |
| .py backend/ | backend-api ⭐ | error | debugging |
| .md docs/ | documentation ⚠️ | test_* | testing |

**⭐ Pre-load for fullstack (40% of sessions)**

## Symbols
✓ done | ◆ working (ONE only) | ○ pending | ⊘ paused | ⧖ delegated

## Delegation
- **Simple (<3 files):** Handle directly
- **Complex (6+ files):** Delegate with `<DELEGATE> → agent ⧖`

## Improvements (100k Simulation)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Tokens | 21,751 | 16,301 | -25% |
| API Calls | 37.1 | 25.5 | -31% |
| Discipline | 83% | 88% | +5% |
