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
3. Create todos: <MAIN> → <WORK>... → <END>
4. Say: "AKIS ready. [Simple/Medium/Complex]. Plan: [N tasks]"
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
1. Check ⊘ orphans → close ALL
2. Run scripts with --update flag (auto-apply changes):
   python .github/scripts/knowledge.py --update    # Auto-append entities
   python .github/scripts/skills.py --update       # Auto-create skill stubs
   python .github/scripts/instructions.py --update # Auto-create instruction files
   python .github/scripts/docs.py --update         # Auto-update docs
   python .github/scripts/agents.py --update       # Auto-update agents
3. CONFIRM: Check output shows success (no errors)
4. VERIFY: Modified files look correct, nothing destroyed
5. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md with:
   - Summary of changes
   - Worktree (todos with status symbols)
   - Files modified
   - Scripts run with --update
6. Show END summary → commit
```

**Scripts with --update = auto-apply | Agent = confirm success, verify files**

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
