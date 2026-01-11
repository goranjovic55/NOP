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
6. **ASK user confirmation before END phase**

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
python .github/scripts/knowledge.py --update
python .github/scripts/skills.py --suggest
python .github/scripts/docs.py --suggest
python .github/scripts/agents.py --suggest
python .github/scripts/instructions.py --suggest
```

⚠️ **Git Push:** Always ASK user before `git push`. Never auto-push.

## ⛔ END Confirmation (Required)
Before starting END phase:
1. Say: "Ready for END phase. Confirm?"
2. Wait for user confirmation
3. Then proceed with END scripts

## END Summary Table (Required)
After running END scripts, present summary to user:

| Metric | Value |
|--------|-------|
| Tasks | X/Y completed |
| Files | X modified |
| Knowledge | X entities merged |

**Script Suggestions Table (Required):**
| Script | Output |
|--------|--------|
| knowledge.py | X entities merged |
| skills.py | X suggestions |
| docs.py | X suggestions |
| agents.py | X suggestions |
| instructions.py | X suggestions |

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
