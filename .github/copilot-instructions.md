# AKIS v7.4

## Gates
| G | Check | Fix |
|---|-------|-----|
| 0 | No knowledge | `head -100 project_knowledge.json` ONCE |
| 1 | No ◆ | `manage_todo_list` → mark ◆ |
| 2 | No skill | Load skill FIRST |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Syntax check |
| 6 | Multi ◆ | One only |
| 7 | No parallel | Use runSubagent pairs for 6+ |

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

| Trigger | Skill |
|---------|-------|
| .tsx .jsx | frontend-react |
| .py backend/ | backend-api |
| Dockerfile | docker |
| error | debugging |
| test_* | testing |
| .md docs/ | documentation |

**Flow:** ◆ → Skill → Edit → Verify → ✓

## END
1. Close ⊘, verify edits
2. Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md`
3. Run scripts, present table
4. **ASK before git push**

## Delegation (6+ = MANDATORY)
| Tasks | Action |
|-------|--------|
| <3 | Direct |
| 3-5 | Consider |
| 6+ | **runSubagent** (parallel when possible) |

| Agent | Use |
|-------|-----|
| architect | Design |
| code | Implement |
| debugger | Fix bugs |
| documentation | Docs (parallel runSubagent) |

## Context Isolation (Clean Handoffs)
| Phase | Handoff |
|-------|---------|
| planning → code | Artifact only |
| research → design | Summary + decisions |
| code → review | Code changes only |

**Rule:** Produce typed artifact, not conversation history. -48.5% tokens.

## Parallel (G7: 60%)
**Use runSubagent for parallel execution:**

| Pair | Pattern |
|------|---------|
| code + docs | ✓ Parallel runSubagent calls |
| research + code | Sequential |

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## Gotchas
| Issue | Fix |
|-------|-----|
| Query knowledge repeatedly | Read 100 lines ONCE |
| Text TODOs | Use `manage_todo_list` |
| Edit without skill | Load skill FIRST |
| Reload same skill | Cache: load ONCE per session |
| Skip announcement | Announce before WORK |
| Multiple ◆ | One only |
| Auto-push | ASK first |
| Context pollution | Use artifact handoffs |
