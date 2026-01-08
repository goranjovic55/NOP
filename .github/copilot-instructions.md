# AKIS v6.1 (Prompt-Optimized + Knowledge Cache)

## START
```
1. Context pre-loaded via attachment ✓ (skip explicit reads)
2. Knowledge v2.0: hot_cache (line 1) has top 20 entities + common answers
3. Create todos: <MAIN> → <WORK>... → <END>
4. Tell user: "[session type]. Plan: [N tasks]"
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

**Knowledge v2.0:** Use hot_cache for quick answers (60% hit rate):
- `where_is_auth`, `where_is_models`, `how_to_add_page`, etc.
- Only read domain_index (line 2) if hot_cache insufficient
- Only full scan if truly needed (10% of queries)

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
- **Knowledge:** v2.0 hot_cache (87% token reduction)
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
