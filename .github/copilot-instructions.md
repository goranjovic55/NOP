# AKIS v6.2 (Prompt-Optimized + Knowledge Cache v3.0)

## START
```
1. Context pre-loaded via attachment ✓ (skip explicit reads)
2. Knowledge v3.0: 
   - hot_cache (line 1): top 20 entities + common answers + quick facts
   - gotchas (line 4): historical issues + solutions for debug
   - session_patterns (line 5): predictive file loading
   - interconnections (line 6): service→model→endpoint mapping
3. Docs: docs/INDEX.md → documentation map for reference
4. Create todos: <MAIN> → <WORK>... → <END>
5. Tell user: "[session type]. Plan: [N tasks]"
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

**Todo Protocol:** Sync with `manage_todo_list` on every state change (◆/✓/⊘)

**Drift Check (every 5 tasks):** ✓ All active work has ◆? ✓ Skills cached? ✓ Any ⊘ orphans?

**Knowledge v3.0:** (90% token reduction verified via 100k simulations)
- hot_cache: 31% of queries → instant answers
- gotchas: 11% of queries → debug acceleration
- predictive: 7% of queries → session pattern preload  
- interconnections: 14% of queries → dependency lookup
- domain_index: 22% of queries → entity lookup
- **Only 15% need file reads**

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

## Efficiency (v3.0 verified)
- **Knowledge:** v3.0 hot_cache (90% token reduction)
- **Gotchas:** 75% of debug queries answered instantly
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
