# AKIS v7.1 (Token-Optimized)

## ⛔ GATES (7)
| G | Check | Fix |
|---|-------|-----|
| 1 | No ◆ | Create TODO, mark ◆ |
| 2 | No skill for edit OR command | Load skill FIRST |
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
**◆ → Skill → Edit/Command → Verify → ✓**

| Trigger | Skill | Applies To |
|---------|-------|------------|
| .tsx .jsx components/ | frontend-react ⭐ | edits |
| .py backend/ api/ | backend-api ⭐ | edits |
| docker compose build restart | docker | commands |
| Dockerfile docker-compose.yml | docker | edits |
| .github/workflows/* | ci-cd | edits |
| .md docs/ | documentation | edits |
| error traceback | debugging | analysis |
| test_* pytest jest | testing | edits + commands |
| .github/skills/* agents/* | akis-development | edits |
| new feature, design | planning | analysis |

⭐ Pre-load fullstack

⚠️ **G2 Enforcement:** Load skill BEFORE edits AND domain commands (docker, npm, pytest, etc.)

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
4. Present END Summary Table to user
5. ASK before applying script suggestions
6. Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md`

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
