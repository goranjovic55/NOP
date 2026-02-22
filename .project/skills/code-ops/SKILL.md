---
name: code-ops
description: Code operations and development using Claude Code, terminal, and development tools. Use when writing code, running commands, managing git, or developing in the NOP repository. Covers CT102 dev container, Claude Code integration, AKIS framework, and standard dev workflows.
---

# Code Operations Skill

Interface with development environment on CT102 (dev container) and Claude Code for software development.

## Quick Access

**Claude Code (Shared Session):**
- Web: http://10.10.10.102:7682 (via Dashy)
- TMUX: `tmux attach -t claude-nop`
- Location: `/root/dev/NOP`

**Direct SSH to Dev Container:**
```bash
ssh root@10.10.10.102
cd /root/dev/NOP
```

## Claude Code Integration

### Via TMUX (Shared)
```bash
# Attach to shared session
tmux attach -t claude-nop

# Or via TTYD web interface
curl http://10.10.10.102:7682
```

### Running Claude Code
```bash
# In NOP directory with AKIS framework
cd /root/dev/NOP
claude

# With specific prompt
claude "Implement routing module from blueprint"
```

### Claude Code Configuration
Global config at `~/.claude/settings.json`:
- Model: MiniMax-M2.5
- API: https://api.minimax.io/anthropic
- AKIS v8.0 framework loaded

## Development Workflows

### Git Operations
```bash
# Standard NOP workflow
cd /root/dev/NOP
git status
git add .
git commit -m "feat: description"
git push origin main
```

### Backend (Python/FastAPI)
```bash
# Run development server
cd /root/dev/NOP/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest

# Database migrations
alembic upgrade head
```

### Frontend (React/TypeScript)
```bash
# Install dependencies
cd /root/dev/NOP/frontend
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## AKIS Framework (v8.0)

Claude Code uses AKIS gates for quality control:

| Gate | Purpose | Check |
|------|---------|-------|
| G0 | Framework Load | CLAUDE.md, skills.yaml |
| G1 | Context Understanding | Project structure, patterns |
| G2 | Solution Design | Architecture, dependencies |
| G3 | Implementation | Code, tests, docs |
| G4 | Self-Review | Quality, standards |
| G5 | Testing | Unit, integration tests |
| G6 | Documentation | README, API docs |
| G7 | Final Delivery | Commit, push, verify |

### Triggering AKIS
Claude Code automatically loads AKIS when it sees `CLAUDE.md` in the project.

## NOP Project Structure

```
/root/dev/NOP/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/v1/    # API endpoints
│   │   ├── models/    # Database models
│   │   ├── services/  # Business logic
│   │   └── core/      # Config, auth
│   └── tests/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── api/
│   └── public/
├── .claude/           # Claude Code config
│   └── settings.json
├── CLAUDE.md          # AKIS framework
└── .project/          # Blueprints, proposals
    └── blueprints/
```

## Common Commands

### Docker Operations
```bash
# Build NOP containers
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart backend
```

### Database Operations
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U nop -d nop

# Redis CLI
docker-compose exec redis redis-cli

# Backup database
docker-compose exec postgres pg_dump -U nop nop > backup.sql
```

### Testing
```bash
# Backend tests
cd backend
pytest -v

# Frontend tests
cd frontend
npm test

# Linting
flake8 backend/
npm run lint
```

## Claude Code Prompts

### Starting Development
```
Read the routing module blueprint from .project/blueprints/ and implement the backend API endpoints.
```

### Code Review
```
Review the changes in backend/app/api/v1/endpoints/routing.py and suggest improvements following FastAPI best practices.
```

### Testing
```
Write unit tests for the route service in backend/app/services/route_service.py
```

### Documentation
```
Update the API documentation for the new routing endpoints in docs/api/routing.md
```

## Integration with Other Skills

- **nop-ops**: Use for network discovery, traffic analysis
- **web-ops**: Use for research, documentation lookup
- **skill-creator**: Use for packaging new skills

## Safety Rules

- Always test in dev before production
- Use git branches for major changes
- Run tests before committing
- Follow AKIS gate requirements
- Backup database before migrations

## References

- AKIS Framework: `CLAUDE.md` in NOP repo
- Blueprints: `.project/blueprints/`
- API Docs: `http://radxa-e54c:12001/docs`
