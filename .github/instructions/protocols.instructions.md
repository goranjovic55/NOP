````instructions
# Protocols v6.2 (Optimized)

## START
1. Context pre-loaded ✓ | 2. Create todos: <MAIN>→<WORK>→<END> | 3. Tell user plan

## WORK
⚠️ **◆ BEFORE edit** | **NO quick fixes** - todo first!

`Mark ◆ → Trigger? → [Load skill] → Edit → get_errors → Mark ✓`

**Skill Cache:** Load ONCE per domain. Check cache before reading!

**Interrupt:** ⊘ current → <SUB:N> → handle → resume

## END
1. Close ⊘ orphans | 2. Run scripts | 3. ⚠️ Create workflow log | 4. Commit

## Scripts
`python .github/scripts/{script}.py [--update|--generate|--suggest|--dry-run]`

Scripts: `docs.py`, `knowledge.py`, `skills.py`, `instructions.py`, `agents.py`

## Triggers
| Pattern | Skill | | Pattern | Skill |
|---------|-------|-|---------|-------|
| .tsx .jsx | frontend-react ⭐ | | Dockerfile | docker |
| .py backend/ | backend-api ⭐ | | error traceback | debugging |
| .md docs/ | documentation ⚠️ | | test_* | testing |

⭐ = Pre-load fullstack | ⚠️ = Always load

## Todo: ✓ done | ◆ working | ○ pending | ⊘ paused

## Drift Check (every 5 tasks)
□ All active has ◆? □ Skills cached? □ ⊘ orphans? □ Syntax errors?

## Standards
Files <500 lines | Functions <50 lines | Type hints required

## Log: `log/workflow/YYYY-MM-DD_HHMMSS_task.md`
````
