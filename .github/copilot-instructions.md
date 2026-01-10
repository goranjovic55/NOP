# AKIS v6.5 (Scripts Suggest, Agent Implements)

## ⛔ HARD GATES (STOP if violated)
| Gate | Violation | Action |
|------|-----------|--------|
| G1 | No ◆ task active | Create TODO with ◆ first |
| G2 | Editing without skill | Load skill, announce it |
| G3 | START not done | Do START steps 1-4 first |
| G4 | Session ending without END | Do END steps 1-5 before closing |

## START (Do ALL steps)
```
1. Read project_knowledge.json lines 1-4 (hot_cache, domain_index, gotchas)
2. Read .github/skills/INDEX.md (skill catalog)
3. Read docs/INDEX.md (documentation map)
4. Create todos: <MAIN> → <WORK>... → <END>
5. Say: "AKIS ready. [Simple/Medium/Complex]. Plan: [N tasks]"
```

**Session skills cache:** [track loaded skills here - don't reload!]

## WORK
**◆ BEFORE edit → Trigger? → [Load skill if NEW domain] → Edit → ✓ AFTER**

| Pattern | Skill (load ONCE) |
|---------|-------------------|
| .tsx .jsx components/ pages/ | frontend-react ⭐ |
| .py backend/ api/ routes/ | backend-api ⭐ |
| Dockerfile docker-compose .yml | docker |
| .github/workflows/* deploy.sh | ci-cd |
| .md docs/ README | documentation ⚠️ |
| error traceback failed | debugging |
| test_* *_test.py | testing |
| .github/skills/* copilot-instructions* | akis-development ⚠️ |

**⭐ = Pre-load for fullstack | ⚠️ = Low compliance, always load**

**Cache rule:** Don't reload skill already loaded this session!

**Interrupt:** ⊘ current → <SUB:N> → handle → ⊘→◆ resume (no orphans!)

## END (⛔ G4 - MANDATORY before session close)
```
1. Close ⊘ orphans
2. Run scripts WITHOUT flag: knowledge.py, skills.py, instructions.py, docs.py, agents.py
3. Ask: "Implement? [y/n/select]"
4. y → Run with --update → VERIFY files → Report ✓
5. select → Agent implements manually
6. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md → commit
```

**Flow:** Analyze → Ask → (y? --update → Verify) or (select? Agent writes)

**Trigger:** User says "wrap up", "done", "end session", "commit"

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

## Delegation (use ⧖)
| Complexity | Action |
|------------|--------|
| Simple (<3 files) | Handle directly |
| Medium (3-5 files) | Consider delegation |
| Complex (6+ files) | **Delegate** to specialist |

**Mark in TODO:** `<DELEGATE> → agent-name ⧖`

## Efficiency
- **Knowledge:** Read once at START (lines 1-4 only)
- **Skills:** Load ONCE per domain per session
- **Scripts:** Run at END only

## If Lost
```
1. Show worktree  
2. Find ◆ or ⊘ or next ○
3. Check skill cache, orphans
4. Continue
```
