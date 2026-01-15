---
applyTo: '**'
description: 'Protocol details: skill triggers, pre-commit gate, simulation stats.'
---

# Protocol Details

> Core protocols in copilot-instructions.md. This file: detailed triggers + stats.

## Skill Triggers (Detailed)

| Trigger | Skill | Type |
|---------|-------|------|
| .tsx .jsx components/ | frontend-react | edit |
| .py backend/ api/ services/ | backend-api | edit |
| Dockerfile docker-compose*.yml | docker | edit |
| docker compose build up | docker | command |
| .github/workflows/*.yml | ci-cd | edit |
| .md docs/ README | documentation | edit |
| error traceback exception | debugging | analysis |
| test_* *.test.* pytest jest | testing | edit/command |
| .github/skills/* agents/* | akis-dev | edit |
| design blueprint architecture | planning | analysis |
| research compare standards | research | analysis |

## Pre-Commit Gate (G5)

Before `git commit`:
1. ✓ Syntax check (no errors)
2. ✓ Build passes (if applicable)
3. ✓ Tests pass (if test files edited)
4. ✓ Workflow log created (sessions >15 min)

**Block commit if any fails.**

## Simulation Stats (100k)

| Metric | Without G0 | With G0 | Change |
|--------|------------|---------|--------|
| File reads | 100% | 23.2% | -76.8% |
| Token consumption | 100% | 32.8% | -67.2% |
| Cache hit rate | 0% | 71.3% | +71.3% |

## Documentation Index

| Need | Location |
|------|----------|
| How-to | `docs/guides/` |
| Feature | `docs/features/` |
| API ref | `docs/technical/` |
| Architecture | `docs/architecture/` |
| Analysis | `docs/analysis/` |
