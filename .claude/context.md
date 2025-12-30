# Project Context

**Updated**: 2025-12-29 | **Status**: Active | **Phase**: COMPLETE (7/7)

## Stack
```
Backend:  Python + FastAPI + SQLAlchemy + PostgreSQL + Redis
Frontend: TypeScript + React + Tailwind CSS + Zustand
Database: PostgreSQL (persistent) + Redis (cache/pubsub)
Infra:    Docker Compose + Multi-container orchestration
```

## Structure
```
NOP/ (Network Observatory Platform)
├── backend/           # FastAPI REST API + WebSocket services
│   ├── app/
│   │   ├── api/       # API endpoints and WebSocket routers
│   │   ├── models/    # SQLAlchemy ORM models
│   │   ├── services/  # Business logic (Sniffer, Scanner, Discovery, etc.)
│   │   ├── schemas/   # Pydantic validation schemas
│   │   └── core/      # Config, database, security, init
│   └── tests/         # Backend test suites
├── frontend/          # React SPA with TypeScript
│   └── src/
│       ├── pages/     # Main application pages
│       ├── components/# Reusable UI components
│       ├── services/  # API client services
│       └── store/     # Zustand state management
├── docker/            # Dockerfiles for services
├── test-environment/  # Isolated test network containers
├── docs/              # Documentation and guides
├── scripts/           # Utility scripts (traffic gen, memory update)
├── log/workflow/      # Workflow session logs
├── .github/           # Agent definitions, workflows, global knowledge
└── .claude/           # Skills, context, commands
```

## Commands
```bash
# Build & Deploy
docker-compose up -d                    # Start all services
docker-compose -f docker-compose.test.yml up -d  # Test environment

# Test
cd scripts
python test_source_only_tracking.py    # Test passive discovery
python test_broadcast_filter.py         # Test broadcast filtering

# Run Individual Services
docker-compose up backend               # Backend only (port 12000)
docker-compose up frontend              # Frontend only (port 12001)

# Development
cd frontend && npm run dev              # Frontend dev server
cd backend && uvicorn app.main:app --reload  # Backend dev server

# Knowledge Management
# Run update_knowledge and update_skills workflows via agent orchestration
# See .github/workflows/ for workflow definitions
```

## Current State
- [x] Full-stack network operations platform implemented
- [x] Multi-protocol remote access (SSH, VNC, RDP, FTP)
- [x] Real-time packet capture and analysis
- [x] Network discovery and scanning (NMAP integration)
- [x] Traffic visualization and topology mapping
- [x] Credential vault with encryption
- [x] Host monitoring and terminal access
- [x] Docker-based deployment complete
- [x] Test environment with 7 service containers
- [ ] Comprehensive test suites (~15% coverage, in development)
- [x] Documentation and deployment guides
- [x] Knowledge graph system (project + global)
- [x] Skills framework configured
- [x] Skills framework configured

## Session Notes
**Task**: Execute update workflows (knowledge, skills, documents, tests)
**Changes**: 
- project_knowledge.json: Added PingService and NetworkScanner entities
- docs/: Consolidated documentation (12 core docs, 5 archived)
- backend/tests/: Created test structure (unit/, integration/)
- context.md: Updated with accurate test status
**Decisions**: 
- Documentation consolidated to meet 10-15 target (currently 12)
- Test infrastructure established, comprehensive coverage deferred
- Archive created for obsolete/duplicate documentation
**Next**: Complete workflow execution and generate workflow log

## Handover
**Branch**: copilot/update-all-3-workflows | **Uncommitted**: No | **Blockers**: None
