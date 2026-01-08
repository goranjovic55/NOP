# AKIS v6.0 (Prompt-Optimized)

## START
```
1. Context pre-loaded via attachment ✓ (skip explicit reads)
2. Create todos: <MAIN> → <WORK>... → <END>
3. Tell user: "[session type]. Plan: [N tasks]"
```

**Session skills cache:** [track loaded skills here - don't reload!]

## WORK
**◆ BEFORE edit → Trigger? → [Load skill if NEW domain] → Edit → ✓ AFTER**

| Pattern | Skill (load ONCE) |
|---------|-------------------|
| .tsx .jsx components/ pages/ | frontend-react ⭐ |
| .py backend/ api/ routes/ | backend-api ⭐ |
| Dockerfile docker-compose .yml | docker |
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
2. If code files: generate_codemap.py && suggest_skill.py
   If docs only: suggest_skill.py only  
3. session_cleanup.py && update_docs.py
4. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md
5. Show END summary → Wait approval → commit
```

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused

## Efficiency
- **Context:** Pre-attached (no explicit knowledge read)
- **Skills:** Load ONCE per domain per session
- **Scripts:** Conditional on file types

## If Lost
```
1. Show worktree  
2. Find ◆ or ⊘ or next ○
3. Check skill cache, orphans
4. Continue
```
