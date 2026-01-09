---
applyTo: "**"
---

# Protocols v6.3

## ⛔ HARD GATES (STOP if violated)
| Gate | Violation | Action |
|------|-----------|--------|
| G1 | No ◆ task active | Create ◆ TODO first |
| G2 | No skill loaded | Load skill, announce |
| G3 | START not done | Do START steps first |

## START (Do ALL)
```
1. Read project_knowledge.json lines 1-4 (hot_cache, domain_index, gotchas)
2. Read .github/skills/INDEX.md (skill catalog)
3. Create todos: <MAIN> → <WORK>... → <END>
4. Say: "AKIS ready. [Simple/Medium/Complex]. Plan: [N tasks]"
```

## WORK
**◆ BEFORE edit** | Mark ◆ → Skill? → Edit → get_errors → ✓

**Cache:** Load skill ONCE per domain

| Pattern | Skill | Pattern | Skill |
|---------|-------|---------|-------|
| .tsx .jsx | frontend-react ⭐ | Dockerfile | docker |
| .py backend/ | backend-api ⭐ | error | debugging |
| .md docs/ | documentation ⚠️ | test_* | testing |

## END
1. ⊘ orphans | 2. Scripts | 3. Workflow log | 4. Commit

## Symbols
✓ done | ◆ working | ○ pending | ⊘ paused | ⧖ delegated
