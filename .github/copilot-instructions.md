# AKIS v7.4

## Gates
| G | Check | Fix | Violation Cost |
|---|-------|-----|----------------|
| 0 | No knowledge | `head -100 project_knowledge.json` ONCE | +13k tokens |
| 1 | No ◆ | `manage_todo_list` → mark ◆ | Lost tracking |
| 2 | ⚠️ No skill | Load skill FIRST (MANDATORY) | +5.2k tokens |
| 3 | No START | Do START | Lost context |
| 4 | ⚠️ No END | Do END (>15 min sessions) | Lost traceability |
| 5 | ⚠️ No verify | Syntax check AFTER EVERY edit | +8.5 min rework |
| 6 | Multi ◆ | One only | Confusion |
| 7 | ⚠️ No parallel | Use pairs for 6+ (60% target) | +14 min/session |

## START
1. `head -100 project_knowledge.json` → IN MEMORY: hot_cache, domain_index, gotchas
2. Read `skills/INDEX.md` → pre-load: frontend-react + backend-api
3. `manage_todo_list` → structured TODO naming
4. **Announce:** `AKIS v7.4 [complexity]. Skills: [list]. [N] tasks. Ready.`

## TODO Format
`○ [agent:phase:skill] Task [context]`

| Field | Values |
|-------|--------|
| agent | AKIS, code, architect, debugger, reviewer, documentation, research, devops |
| phase | START, WORK, END, VERIFY |
| skill | backend-api, frontend-react, docker, testing, debugging, documentation |
| context | `parent→X` `deps→Y,Z` |

## WORK
**Check memory first:** domain_index → paths, gotchas → bugs, hot_cache → entities

| Trigger | Skill | MANDATORY |
|---------|-------|-----------|
| .tsx .jsx | frontend-react | ✅ BEFORE ANY EDIT |
| .py backend/ | backend-api | ✅ BEFORE ANY EDIT |
| Dockerfile | docker | ✅ BEFORE ANY EDIT |
| error | debugging | ✅ BEFORE ANY EDIT |
| test_* | testing | ✅ BEFORE ANY EDIT |
| .md docs/ | documentation | ✅ BEFORE ANY EDIT |

**Flow:** ◆ → **Load Skill (G2)** → Edit → **Verify (G5)** → ✓

⚠️ **G2 VIOLATION = +5,200 tokens waste**. Load skill BEFORE first edit, not after.

## END
**Trigger:** Session >15 min OR when you see "done", "complete", "finished"

1. Close ⊘, verify all edits
2. **Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md`** (G4 - MANDATORY)
3. Run scripts, present table
4. **ASK before git push**

⚠️ **G4 VIOLATION = Lost traceability**. Workflow log REQUIRED for sessions >15 min.

## Delegation (Simplified Binary Decision)
| File Count | Action | Efficiency |
|------------|--------|------------|
| <3 files | Optional (AKIS direct) | 0.594 |
| 3+ files | **runSubagent** (MANDATORY) | 0.789 (+33%) |

**Agent Selection:**
| Task Type | Agent | Success Rate |
|-----------|-------|--------------|
| design, blueprint | architect | 97.7% |
| code changes | code | 93.6% |
| bug fix, error | debugger | 97.3% |
| docs, readme | documentation | 89.2% |
| research, standards | research | 76.6% |

**Delegation saves:** 10.9 min average, +8% quality improvement

## Context Isolation (Clean Handoffs)
| Phase | Handoff |
|-------|---------|
| planning → code | Artifact only |
| research → design | Summary + decisions |
| code → review | Code changes only |

**Rule:** Produce typed artifact, not conversation history. -48.5% tokens.

## Parallel (G7: 60% TARGET)
**Current:** 19.1% parallel rate. **Goal:** 60%+

| Pair | Pattern | Time Saved |
|------|---------|------------|
| code + docs | ✅ Parallel | 8.5 min |
| code + tests | ✅ Parallel | 12.3 min |
| debugger + docs | ✅ Parallel | 6.2 min |
| research + code | ❌ Sequential | - |
| frontend + backend | ❌ Sequential (API contract) | - |

**Decision:** Independent tasks = Parallel. Same files or dependencies = Sequential.

⚠️ **G7 GAP = -294k minutes** across 100k sessions. Use runSubagent for parallel work.

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## Gotchas
| Issue | Fix | Gate |
|-------|-----|------|
| Edit without skill | Load skill FIRST (30.8% violation) | G2 |
| Skip workflow log | Create log for >15 min sessions (21.8% violation) | G4 |
| Skip verification | Verify syntax after EVERY edit (18.0% violation) | G5 |
| Skip parallel | Use parallel pairs for 6+ tasks (target 60%) | G7 |
| Query knowledge repeatedly | Read 100 lines ONCE | G0 |
| Text TODOs | Use `manage_todo_list` | G1 |
| Skip announcement | Announce before WORK | G3 |
| Multiple ◆ | One only | G6 |
| Auto-push | ASK first | END |
| Skip delegation for 3+ files | Use runSubagent (MANDATORY) | Delegation |
