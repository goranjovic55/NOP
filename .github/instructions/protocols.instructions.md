---
applyTo: '**'
description: 'Protocol details: session types, skill triggers, pre-commit gate, simulation stats.'
---

# Protocol Details

> Core protocols in copilot-instructions.md. This file: session types + detailed triggers + stats.

## Session Type Detection (G2 Enforcement)

**Purpose:** Auto-detect session type → pre-load correct skills → block reloads

| Pattern | Session Type | Pre-load Skills | Accuracy |
|---------|--------------|-----------------|----------|
| `.tsx/.jsx` + `.py/backend/` | fullstack | frontend-react + backend-api + debugging | 89% |
| `.tsx/.jsx/.ts` only | frontend | frontend-react + debugging | 92% |
| `.py/backend/api/` only | backend | backend-api + debugging | 91% |
| `Dockerfile/docker-compose` | docker | docker + backend-api | 95% |
| `.github/skills/agents/` | akis | akis-dev + documentation | 98% |
| `.md/docs/README` | docs | documentation | 87% |

**Detection Algorithm:**
1. Analyze initial task description + file paths mentioned
2. Match against patterns (regex)
3. Select session type (highest confidence)
4. Pre-load skills at START
5. **CACHE skills for session lifetime (G2 BLOCKING)**

**Override:** If auto-detection wrong (13% cases), allow manual skill load ONCE per skill

---

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

## Pre-Commit Gate (G5) - BLOCKING

**ENFORCEMENT:** MUST NOT commit if ANY check fails

Before `git commit`:
1. ✓ Syntax check (no errors) - **BLOCKING**
2. ✓ Build passes (if applicable) - **BLOCKING**
3. ✓ Tests pass (if test files edited) - **BLOCKING**
4. ✓ Workflow log created (sessions >15 min) - **BLOCKING**

**Validation Command Chain:**
```bash
# Backend
python -m py_compile file.py && pytest tests/ && git commit

# Frontend  
npm run build && npm test && git commit

# Fullstack
pytest tests/ && npm run build && npm test && git commit
```

**Block commit if any fails. No exceptions.**

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
