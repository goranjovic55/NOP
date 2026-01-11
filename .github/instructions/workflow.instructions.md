---
applyTo: "**"
---

# Workflow v7.1

## Phases
| Phase | Actions |
|-------|---------|
| START | **Knowledge Query** → Skills → TODO → Announce |
| WORK | Knowledge → ◆ → Skill → Edit → Verify → ✓ |
| END | Close ⊘ → Scripts → Log → Commit |

## ⛔ G0: Knowledge First (BEFORE file reads)
```
1. hot_cache   → Entity info, exports, paths
2. gotchas     → Known issues + solutions
3. domain_index → File locations by domain
4. Read file   → ONLY if cache miss
```

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## TODO Rules
1. Create before multi-step work
2. **Annotate with skill:** `○ Task [skill-name]` when skill applies
3. Mark ◆ BEFORE edit, ✓ AFTER verify
4. Only ONE ◆ active
5. Close all ⊘ before END

**Example TODO:**
```
○ Create service for data [backend-api]
○ Add dropdown component [frontend-react]  
○ Update docker config [docker]
○ Simple cleanup (no skill)
```

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
