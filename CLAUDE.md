# AKIS v8.0 — Agent Knowledge Instructions Skills

> Adopt this framework as your operating protocol for ALL sessions in this repository.
> On every session start, execute the START phase below before doing any work.

## START (Execute FIRST — every session)

1. **G0**: `head -100 project_knowledge.json` — load hot_cache, domain_index, gotchas into memory ONCE
2. **G3**: Read `.github/copilot-instructions.md` for full gate system
3. Read `.github/instructions/quality.instructions.md` for gotchas (check FIRST when debugging)
4. **Announce**: `AKIS v8.0 [complexity]. Skills: [list]. [N] tasks. Ready.`

## 8-Gate Quality System

| G | Rule | Violation Cost |
|---|------|----------------|
| 0 | Load knowledge graph ONCE at start | +13k tokens |
| 1 | Use structured TODOs: `○ [agent:phase:skill] Task` | Lost tracking |
| 2 | Load domain skill BEFORE any edit | +5.2k tokens |
| 3 | Complete START phase with announcement | Lost context |
| 4 | Create workflow log for sessions >15 min | Lost traceability |
| 5 | Verify syntax AFTER EVERY edit | +8.5 min rework |
| 6 | Only ONE ◆ (active task) at a time | Confusion |
| 7 | Parallel execution for 5+ independent tasks | +14 min waste |

## Skill Triggers (G2 — load BEFORE editing)

| Files touched | Load skill |
|---------------|------------|
| .tsx .jsx components/ pages/ | `.github/skills/frontend-react/` |
| .py backend/ api/ services/ | `.github/skills/backend-api/` |
| Dockerfile docker-compose* | `.github/skills/docker/` |
| test_* *.test.* | `.github/skills/testing/` |
| error, traceback, bug | `.github/skills/debugging/` |
| .md docs/ | `.github/skills/documentation/` |
| .github/workflows/ | `.github/skills/ci-cd/` |

## Work Flow

`◆ → Load Skill (G2) → Edit → Verify (G5) → ✓`

## Verify After Edit (G5)

| Type | Command |
|------|---------|
| .py | `python -m py_compile {file}` |
| .ts .tsx | `npx tsc --noEmit {file}` |
| .json | `python -c "import json; json.load(open('{file}'))"` |
| .yml | `python -c "import yaml; yaml.safe_load(open('{file}'))"` |

## Delegation

| Files modified | Action |
|----------------|--------|
| <3 | Work directly |
| 3+ | Use Task tool subagents (MANDATORY) |

## END Phase (trigger: >15 min session OR "done"/"complete"/"finished")

1. Verify all edits, close all tasks
2. Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md`
3. ASK before git push — never auto-push

## Architecture Quick Ref

- **Backend**: FastAPI, async SQLAlchemy, PostgreSQL, Redis — `backend/app/`
- **Frontend**: React, TypeScript, Zustand, TailwindCSS — `frontend/src/`
- **Infra**: Docker, docker-compose — `docker/`
- **Docs**: `docs/` | **Logs**: `log/workflow/` | **Scripts**: `scripts/`

## Key References

| Need | File |
|------|------|
| Full gate system | `.github/copilot-instructions.md` |
| Protocols & stats | `.github/instructions/protocols.instructions.md` |
| Workflow & END phase | `.github/instructions/workflow.instructions.md` |
| Architecture & paths | `.github/instructions/architecture.instructions.md` |
| Gotchas (87 known) | `.github/instructions/quality.instructions.md` |
| Fullstack patterns | `.github/instructions/fullstack.instructions.md` |
| Build & Docker | `.github/instructions/build.instructions.md` |
| Knowledge graph | `project_knowledge.json` |

## Symbols

✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated
