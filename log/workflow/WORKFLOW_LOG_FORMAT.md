# Workflow Log Format v2.1

Machine-parseable workflow logs for AKIS script precision.

**⚠️ CRITICAL:** Workflow log MUST be created BEFORE running END scripts so scripts can parse session data.

## END Phase Order

1. User confirms END phase
2. **Create workflow log** (this format)
3. Run END scripts (they read this log)
4. Present suggestions
5. User confirms/rejects
6. Commit & push

## Format: YAML Front Matter + Markdown Body

```yaml
---
session:
  id: "2026-01-11_task_name"
  date: "2026-01-11"
  complexity: medium  # simple | medium | complex
  domain: fullstack   # frontend_only | backend_only | fullstack | docker_heavy

skills:
  loaded: [frontend-react, debugging]
  suggested: [testing]

files:
  modified:
    - {path: "frontend/src/Example.tsx", type: tsx, domain: frontend}
    - {path: "backend/app/routes.py", type: py, domain: backend}
  types: {tsx: 2, py: 1, md: 1}

agents:
  delegated: []  # or [{name: code, task: "desc", result: success}]

commands:
  - {cmd: "docker-compose up -d", domain: docker, success: true}
  - {cmd: "npm test", domain: testing, success: true}

errors:
  - type: TypeError
    message: "Cannot read property 'x' of undefined"
    file: "Example.tsx"
    fixed: true
    root_cause: "API returned null"

gates:
  passed: [G1, G2, G3, G4, G5, G6]
  violations: []

root_causes:
  - problem: "Dropdown flickering"
    solution: "Added hasLoaded state guard"
    skill: frontend-react

gotchas:
  - pattern: "useEffect with array dependencies"
    warning: "Infinite re-render loops"
    solution: "Use useRef for mutable state"
    applies_to: [frontend-react]
---

# Session Log: Task Name

## Summary
Brief description.

## Tasks Completed
- ✓ Task 1
- ✓ Task 2
```

## Domain Types

| Domain | Skills |
|--------|--------|
| `frontend_only` | frontend-react |
| `backend_only` | backend-api |
| `fullstack` | frontend-react, backend-api |
| `docker_heavy` | docker |
| `documentation` | documentation |

## Complexity

| Level | Criteria |
|-------|----------|
| `simple` | 1-2 files, <30 min |
| `medium` | 3-5 files, 30-90 min |
| `complex` | 6+ files, >90 min |

## Script Parsing

Scripts parse YAML front matter for:
- `skills.py` → `skills.loaded`, `skills.suggested`
- `agents.py` → `agents.delegated`, `session.complexity`
- `docs.py` → `files.modified`, `gotchas`, `root_causes`
- `instructions.py` → `gates.violations`, `gotchas`

Latest log gets **3x weight** in suggestions.
