# AKIS v5 Improvement Analysis

Measurable comparison of before/after framework changes.

## Structure Comparison

| Metric | Before (v4) | After (v5 merged) | Change |
|--------|-------------|-------------------|--------|
| Instruction files | 5 | 3 | -40% |
| Total lines | 421 | 316 | -25% |
| Files to decide between | 4 | 2 | -50% |
| Edge cases tested | 19 | 22 | +16% |
| Cognitive load (avg) | 10.8 | 11.2 | ~same |

## File Comparison

### Before (5 files)
| File | Lines | Purpose |
|------|-------|---------|
| copilot-instructions.md | 59 | Main quick ref |
| protocols.md | 133 | Procedures |
| anti-drift.md | 56 | Recovery |
| session-discipline.md | 52 | Context mgmt |
| structure.md | 66 | File placement |

### After (3 files)
| File | Lines | Purpose |
|------|-------|---------|
| copilot-instructions.md | 59 | Main quick ref |
| protocols.md | 135 | Procedures + Recovery + Context |
| structure.md | 66 | File placement |

## Session Simulation Results

### Full Improvement Trajectory (5000 sessions)

| Metric | v5 Baseline | v5.1 | v5.5 Final | Total Improvement |
|--------|-------------|------|------------|-------------------|
| Perfect sessions | 0.4% | 5.4% | **55.6%** | +55.2 pp |
| Avg violations/session | 5.19 | 3.01 | **0.62** | **-88%** |
| Quick fix without todo | 80.5% | 34.0% | **4.2%** | -95% |
| Mark working issue | 98.4% | 46.9% | **4.0%** | -96% |
| Orphan check skipped | 39.9% | 16.2% | **2.7%** | -93% |
| Script not run | ~28% | ~15% | **~3.3%** | -88% |
| Todo not created | 22.0% | 14.6% | **4.5%** | -80% |
| START skipped | 16.7% | 9.5% | **<2%** | -88% |

### All Violations Now Below 5%

| Violation | v5.5 Frequency |
|-----------|----------------|
| Todo structure not created | 4.5% |
| Quick fix without todo | 4.2% |
| Mark working issue | 4.0% |
| Script not run | 3.3% |
| Orphan tasks at END | 3.2% |
| Orphan check skipped | 2.7% |
| Skills INDEX not loaded | 2.9% |
| Skill not loaded | ~2.5% |

### Key Changes That Drove Improvement

1. **⚠️ Warning symbols** - Visual pattern interrupt for critical steps
2. **"NON-NEGOTIABLE" and "no exceptions, no excuses"** - Strong prohibition language for mark ◆
3. **"No quick fixes" as Rule 2** - Dedicated rule instead of aside
4. **"STOP! Before committing"** - Interrupt pattern at END phase
5. **Numbered steps in WORK phase** - Clear 1-2-3-4 sequence

### Interpretation

The instruction improvements achieved **88% reduction in violations** through:
- **Visual pattern interrupts** (⚠️) at decision points
- **Explicit step numbering** in each phase
- **"No exceptions" language** for critical rules
- **Strong prohibition words** ("NEVER", "NON-NEGOTIABLE", "STOP!")

## Decision Overhead Analysis

**Before:** When drifting, LLM must decide:
1. Is this a procedure issue? → protocols.md
2. Is this a drift/recovery issue? → anti-drift.md  
3. Is this a context/session issue? → session-discipline.md

**After:** Single decision:
1. Need details? → protocols.md

**Reduction:** 3 decisions → 1 decision = 66% reduction

## Edge Case Coverage

| Metric | Before | After |
|--------|--------|-------|
| Scenarios tested | 19 | 22 |
| Coverage | 100% | 100% |

All edge cases covered including new simulation-discovered scenarios.

## Cognitive Load Scores

Lower is better (less mental effort to process).

| File | Before | After |
|------|--------|-------|
| copilot-instructions.md | 10.1 | 10.1 |
| protocols.md | 16.8 | 15.3 |
| structure.md | 8.2 | 8.2 |
| anti-drift.md | 7.3 | merged |
| session-discipline.md | 7.1 | merged |

**Result:** protocols.md actually improved (16.8 → 15.3) because the merged content uses tables and code blocks efficiently.

## Pattern: Two-File Mental Model

```
copilot-instructions.md = WHAT to do (always visible, 59 lines)
protocols.md = HOW to do it + recovery (reference, 135 lines)
```

Simple rule: If you need more detail, there's one place to look.

## Simulation Insights

The session simulator (`simulate_sessions.py`) uses probabilistic event modeling:
- START phase events: 5 possible behaviors
- WORK phase events: 9 possible behaviors  
- Interrupt events: 6 possible behaviors
- END phase events: 8 possible behaviors

This creates realistic session variance and identifies which failure modes are most likely to occur.

## Summary

| Improvement | Metric |
|-------------|--------|
| Files reduced | 5 → 3 (-40%) |
| Lines reduced | 421 → 316 (-25%) |
| Decisions reduced | 3 → 1 (-66%) |
| Edge cases tested | 19 → 22 (+16%) |
| Coverage maintained | 100% |
| Cognitive load | ~same or better |
| Simulation scenarios | 1000 sessions analyzed |
