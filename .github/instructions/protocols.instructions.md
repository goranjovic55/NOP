---
applyTo: "**"
---

# Protocols v7.0.1 (100k Simulation Optimized + Microadjustments)

## Enforcement (7 Hard Gates)

| Gate | Violation | Rate* | Action |
|------|-----------|-------|--------|
| G1 | No ◆ task | 10.1% | Create TODO first |
| G2 | No skill loaded | **31.1%** | ⚠️ Load skill, announce |
| G3 | START not done | 8.1% | Do START steps |
| G4 | END skipped | **21.9%** | ⚠️ Run END scripts |
| G5 | No verification | **17.9%** | ⚠️ Check syntax/tests |
| G6 | Multiple ◆ | 5.2% | Only ONE ◆ |
| G7 | Skip parallel | 10.7% | Use parallel when compatible |

*Baseline deviation rates from 100k simulation
**Bold = High priority for enforcement**

## Skill Triggers (⛔ G2 - 31.1% deviation - HIGHEST)

| Pattern | Skill | Pattern | Skill |
|---------|-------|---------|-------|
| .tsx .jsx | frontend-react ⭐ | Dockerfile | docker |
| .py backend/ | backend-api ⭐ | error | debugging |
| .md docs/ | documentation ⚠️31% | test_* | testing |

**⭐ Pre-load for fullstack (40% of sessions)**
**⚠️31% = Low compliance - ALWAYS load**

## Symbols
✓ done | ◆ working (ONE only) | ○ pending | ⊘ paused | ⧖ delegated

## Delegation (23.4% skip rate for complex)
- **Simple (<3 files):** Handle directly
- **Medium (3-5 files):** Smart delegation (task-match)
- **Complex (6+ files):** ⛔ MUST delegate with `<DELEGATE> → agent ⧖`

## Parallel Execution (⛔ G7 - 10.7% deviation)

**Compatible pairs - parallelize when possible:**
- code + documentation
- code + reviewer
- research + code
- architect + research
- debugger + documentation

**Saves: 9,395 hours over 100k sessions (with G7 enforcement)**

## Verification (⛔ G5 - 17.9% deviation)

After EVERY edit:
1. Syntax check (no errors)
2. Import validation (resolves)
3. Test run (if applicable)
4. THEN mark ✓

## Improvements (100k Simulation v7.0.1)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Tokens | 20,442 | 15,297 | **-25%** |
| API Calls | 38.0 | 26.1 | **-31%** |
| Discipline | 80.7% | 86.8% | **+7.6%** |
| Cognitive Load | 80.1% | 68.1% | **-15%** |
| Speed (P50) | 50.4 min | 42.9 min | **-15%** |
| Parallel Time Saved | 4,402 hrs | 9,395 hrs | **+113%** |
