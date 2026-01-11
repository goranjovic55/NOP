# AKIS v7.1 (Token-Optimized)

## ⛔ GATES (7)
| G | Check | Fix |
|---|-------|-----|
| 1 | No ◆ | Create TODO, mark ◆ |
| 2 | No skill | Load skill |
| 3 | No START | Do START |
| 4 | No END | Do END |
| 5 | No verify | Syntax/test check |
| 6 | Multi ◆ | One ◆ only |
| 7 | No parallel | Use parallel pairs |

## START
1. `project_knowledge.json` (hot_cache, gotchas)
2. `skills/INDEX.md` → pre-load: frontend-react + backend-api
3. Create TODO → Say: "AKIS v7.1 [complexity]. [N] tasks."

## WORK
**◆ → Skill → Edit → Verify → ✓**

| Situation | Skill |
|-----------|-------|
| new feature, design, research | planning |
| .tsx .jsx components/ | frontend-react ⭐ |
| .py backend/ api/ | backend-api ⭐ |
| Dockerfile docker-compose | docker |
| .github/workflows/* | ci-cd |
| .md docs/ | documentation |
| error traceback | debugging |
| test_* *_test.py | testing |
| .github/skills/* | akis-development |

⭐ Pre-load fullstack

## Workflow Phases
| Phase | Action | Skill |
|-------|--------|-------|
| PLAN | Analyze, design | planning |
| BUILD | Implement | frontend/backend |
| VERIFY | Test, check | testing/debugging |
| DOCUMENT | Update docs | documentation |

## END
1. Close ⊘ orphans
2. Verify all edits
3. Run: `knowledge.py`, `skills.py`, `docs.py`, `agents.py`
4. Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md`

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## Delegation
| Complexity | Strategy |
|------------|----------|
| Simple (<3) | Direct or delegate |
| Medium (3-5) | Smart delegate |
| Complex (6+) | Delegate |

| Agent | Triggers |
|-------|----------|
| architect | design, blueprint |
| code | implement, create |
| debugger | error, bug |
| reviewer | review, audit |
| documentation | docs, readme |
| research | research, compare |
| devops | deploy, docker |

## Parallel (G7)
| Pair 1 | Pair 2 |
|--------|--------|
| code | documentation |
| code | reviewer |
| research | code |
| architect | research |

**Sequential:** architect→code→debugger→reviewer

## Recovery
`git status` → Find ◆/⊘ → Continue
