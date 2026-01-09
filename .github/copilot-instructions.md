# AKIS v6.3 (Enforced Discipline + Knowledge Cache v3.0)

## ⛔ HARD GATES (STOP if violated)
| Gate | Violation | Action |
|------|-----------|--------|
| G1 | No ◆ task active | Create TODO with ◆ first |
| G2 | Editing without skill | Load skill, announce it |
| G3 | START not done | Do START steps 1-4 first |

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

## END
```
1. Check ⊘ orphans → close ALL
2. Run scripts: knowledge.py && skills.py && instructions.py && docs.py && session_cleanup.py
3. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md
4. Show END summary (all script outputs) → Wait approval → commit
```

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated

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
