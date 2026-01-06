# Skills Index

Quick reference for common problems → solutions. **Load skills by domain trigger.**

---

## Domain Triggers (MANDATORY)

| Touching These Files | Load This Skill |
|---------------------|-----------------|
| `*.tsx`, `*.jsx`, `components/`, `pages/` | [frontend-react.md](frontend-react.md) |
| `backend/app/`, `endpoints/`, `*.py` API | [backend-api.md](backend-api.md) |
| `docker-compose*`, `Dockerfile` | [docker.md](docker.md) |
| Error/exception in output | [debugging.md](debugging.md) |
| Creating/updating docs | [documentation.md](documentation.md) |

---

## By Problem Type

### Build & Runtime Errors
- **Problem:** Build fails, runtime crashes, dependency issues
- **Skill:** [debugging.md](debugging.md)

### Knowledge System
- **Problem:** Query/update project_knowledge.json
- **Skill:** [knowledge.md](knowledge.md)

### Documentation
- **Problem:** Create/update docs
- **Skill:** [documentation.md](documentation.md)

---

## By Technology

### Backend Development
- **API patterns:** [backend-api.md](backend-api.md) - CRUD, services, websocket, agent config

### Frontend Development  
- **Component patterns:** [frontend-react.md](frontend-react.md) - JSX, hooks, POV mode

### DevOps
- **Docker/containers:** [docker.md](docker.md) - Compose, hot-reload, dev workflow

---

## Skill Creation

**Create when:** Pattern in >=5 sessions, reusable, copy-paste ready
**Format:** <50 lines (see `.github/templates/skill.md`)

---

## Usage Patterns

**During work:**
```bash
# Quick lookup
grep -r "keyword" .github/skills/

# Read specific skill
cat .github/skills/debugging.md
```

**At session end:**
```bash
# Suggest new skills (auto-runs in session_end.sh)
python .github/scripts/suggest_skill.py
```

---

*Update this INDEX when adding/removing skills*
