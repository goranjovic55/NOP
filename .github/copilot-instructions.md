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
2. Run scripts WITHOUT flag (analyze mode - show suggestions):
   python .github/scripts/knowledge.py      # Shows entity suggestions
   python .github/scripts/skills.py         # Shows skill gaps
   python .github/scripts/instructions.py   # Shows instruction gaps
   python .github/scripts/docs.py           # Shows doc updates
   python .github/scripts/agents.py         # Shows agent updates
3. SHOW suggestions to user and ASK:
   "Scripts suggest these updates. Implement? [y/n/select]"
4. IF user AGREES (no changes needed):
   → Run with --update flag: python .github/scripts/{script}.py --update
   → VERIFY: Read modified files to confirm content is correct
   → Report: "✓ {N} files updated successfully"
5. IF user wants CHANGES or DEVIATIONS:
   → Agent implements manually based on user feedback
6. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md
7. Show END summary → commit
```

**Flow:** Analyze → Ask → (Agree? --update → Verify) or (Deviate? Agent writes)

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
