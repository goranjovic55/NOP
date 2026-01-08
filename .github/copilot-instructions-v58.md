# AKIS v5.8 (Token-Optimized)

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
| .py backend/ api/ | backend-api |
| Dockerfile docker-compose | docker |
| .md docs/ README | documentation |
| error traceback | debugging |
| test_* *_test.py | testing |

**Interrupt:** ⊘ → <SUB:N> → handle → resume

## END
```
1. Check ⊘ orphans → close all
2. python scripts/generate_codemap.py && suggest_skill.py
3. Create log/workflow/YYYY-MM-DD_task.md
4. THEN commit
```

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused
