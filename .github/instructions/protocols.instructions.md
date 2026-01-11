---
applyTo: "**"
---

# Protocols v9.0 (Skills-Based Workflow)

## Enforcement (6 Hard Gates)

| Gate | Violation | Rate* | Action |
|------|-----------|-------|--------|
| G1 | No ◆ task | 4.4% | Create TODO first |
| G2 | No skill loaded | 8.4% | Load skill, announce |
| G3 | START not done | 3.6% | Do START steps |
| G4 | END skipped | 6.8% | Run END scripts |
| G5 | No verification | 5.0% | Check syntax/tests |
| G6 | Multiple ◆ | 2.2% | Only ONE ◆ |

*100k simulation optimized deviation rates

## Skill Triggers (⛔ G2)

| Situation | Skill | Keywords |
|-----------|-------|----------|
| PLAN phase | planning | design, research, brainstorm |
| Backend | backend-api ⭐ | *.py, backend/, api |
| Frontend | frontend-react ⭐ | *.tsx, components/ |
| Errors | debugging | error, bug, traceback |
| Tests | testing | test_*, *_test.py |
| Docs | documentation | *.md, docs/, README |
| Containers | docker | Dockerfile, container |
| CI/Deploy | ci-cd | .github/workflows/, deploy |

**⭐ Pre-load for fullstack (40% of sessions)**

## Symbols
✓ done | ◆ working (ONE only) | ○ pending | ⊘ paused

## Verification (⛔ G5)

After EVERY edit:
1. Syntax check (no errors)
2. Import validation (resolves)
3. Test run (if applicable)
4. THEN mark ✓

## 100k Simulation Results (v9.0)

| Metric | Value |
|--------|-------|
| Avg Tokens | 16,508 |
| Discipline | 91.5% |
| Skill Detection | 88.5% |
| Success Rate | 92.0% |
