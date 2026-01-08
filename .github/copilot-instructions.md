# AKIS v5.8

## START
```
1. view project_knowledge.json (1-50) + skills/INDEX.md
2. Create: <MAIN> → <WORK>... → <END>
3. Tell user: "[context]. Plan: [todos]"
```

## WORK
**◆ BEFORE any edit → Check trigger → Edit → ✓ AFTER**

| Pattern | Skill |
|---------|-------|
| .tsx .jsx pages/ components/ | .github/skills/frontend-react/SKILL.md |
| .py backend/ api/ routes/ | .github/skills/backend-api/SKILL.md |
| Dockerfile docker-compose .yml | .github/skills/docker/SKILL.md |
| .md docs/ README | .github/skills/documentation/SKILL.md ⚠️ |
| error traceback failed | .github/skills/debugging/SKILL.md |
| test_* *_test.py | .github/skills/testing/SKILL.md |
| .github/skills/* copilot-instructions* | .github/skills/akis-development/SKILL.md ⚠️ |

**Interrupt:** ⊘ → <SUB:N> → handle → resume (no orphan ⊘!)

## END
```
1. Check ⊘ orphans → close all
2. python .github/scripts/generate_codemap.py && python .github/scripts/suggest_skill.py
   → Show skill suggestions from output
3. python .github/scripts/session_cleanup.py && python .github/scripts/update_docs.py
4. Collect metrics: duration, tasks, files, skills
5. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md (with metrics)
6. Show END summary block
7. THEN commit
```

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused

## If Lost
```
1. Show worktree
2. Find ◆ or ⊘ or next ○
3. Continue
```
