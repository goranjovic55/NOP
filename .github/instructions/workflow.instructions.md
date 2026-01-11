---
applyTo: "**"
---

# Workflow v7.1

## Phases
| Phase | Actions |
|-------|---------|
| START | Knowledge → Skills → TODO → Announce |
| WORK | ◆ → Skill → Edit → Verify → ✓ |
| END | Close ⊘ → Scripts → Log → Commit |

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## TODO Rules
1. Create before multi-step work
2. Mark ◆ BEFORE edit, ✓ AFTER verify
3. Only ONE ◆ active
4. Close all ⊘ before END

## Verification
After EVERY edit:
1. Syntax check
2. Import validation
3. Test if applicable
4. Mark ✓

## END Scripts
```bash
python .github/scripts/knowledge.py
python .github/scripts/skills.py
python .github/scripts/docs.py
python .github/scripts/agents.py
```

## END Summary Table (Required)
After running END scripts, present summary to user:

| Metric | Value |
|--------|-------|
| Tasks | X/Y completed |
| Tokens | ~X saved |
| API Calls | ~X saved |
| Resolution | X% |
| Files | X modified |
| Commits | X pushed |

**Script Suggestions:** Present, ASK user before applying.

## Workflow Phases
| Phase | Skill | Action |
|-------|-------|--------|
| PLAN | planning | Analyze, design |
| BUILD | frontend/backend | Implement |
| VERIFY | testing/debugging | Test, check |
| DOCUMENT | documentation | Update docs |

## Log
Create `log/workflow/YYYY-MM-DD_HHMMSS_task.md` at session end.
