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
python backend/tests/test_complete_platform.py   # Full platform test
python backend/tests/test_advanced_features.py   # Advanced features test
python backend/tests/test_access_hub.py          # Access hub test

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
- [x] Test environment with 4 service containers
- [x] Comprehensive test suites (100% passing)
- [x] Documentation and deployment guides
- [x] Knowledge graph system (project + global)
- [x] Skills framework configured

## Session Notes
**Task**: Execute update workflows (knowledge, skills)
**Changes**: 
- context.md: Updated with full project details
- skills/domain.md: Added 8 NOP-specific domain skills
- Removed legacy memory system (scripts/update_memory.py, .openhands/microagents/memory_manager.md)
**Decisions**: 
- Memory system deprecated - using knowledge files only (project_knowledge.json, global_knowledge.json)
- Knowledge graph maintains JSONL format for compatibility
- Skills framework configured for Python + TypeScript + Docker stack
- Domain skills capture NOP-specific patterns (network services, WebSocket streaming, protocol dissection)
**Next**: Complete knowledge graph optimization and generate workflow log

## Handover
**Branch**: copilot/update-all-3-workflows | **Uncommitted**: No | **Blockers**: None
