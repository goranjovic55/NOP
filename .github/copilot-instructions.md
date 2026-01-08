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
| .tsx .jsx pages/ components/ | frontend-react |
| .py backend/ api/ routes/ | backend-api |
| Dockerfile docker-compose .yml | docker |
| .md docs/ README | documentation ⚠️ |
| error traceback failed | debugging |
| test_* *_test.py | testing |
| .github/skills/* copilot-instructions* | akis-development ⚠️ |

**Interrupt:** ⊘ → <SUB:N> → handle → resume (no orphan ⊘!)

## END
```
1. Check ⊘ orphans → close all
2. python .github/scripts/generate_codemap.py && python .github/scripts/suggest_skill.py
3. Create log/workflow/YYYY-MM-DD_HHMMSS_task.md
4. THEN commit
```

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused

## If Lost
```
1. Show worktree
2. Find ◆ or ⊘ or next ○
3. Continue
```
