# NOP - Network Observatory Platform

A comprehensive, self-contained network assessment platform designed for deployment as a network monitoring appliance. Provides complete visibility into LAN environments through passive discovery, real-time traffic analysis, and intelligent topology mapping.

## Core Value Proposition

- **Single-pane visibility** into all network assets and traffic
- **Zero-configuration discovery** of network devices
- **Browser-based remote access** eliminating the need for multiple client tools
- **Operator-controlled escalation** for security testing when needed
- **SBC-optimized** for efficient edge deployment

## Key Differentiators

Unlike existing solutions (NetAlertX, ntopng, Security Onion), NOP uniquely combines:
- Automatic topology inference with confidence scoring
- Integrated credential vault with browser-based access
- Unified monitoring and optional security testing
- Single Docker Compose deployment on ARM64

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Interface                         │
│  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │
│  │Topology  │ Traffic  │ Assets   │ Access   │ Tools  │ │
│  └──────────┴──────────┴──────────┴──────────┴────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ REST API / WebSocket
┌────────────────────────▼────────────────────────────────┐
│            Backend Orchestrator (FastAPI)                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Auth │ Config │ Jobs │ Docker Control │ Crypto  │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    Data Layer                            │
│  ┌─────────────────┬──────────────────┬──────────────┐  │
│  │   PostgreSQL    │      Redis       │   Volumes    │  │
│  │  (State/Config) │  (Cache/Queues)  │  (Evidence)  │  │
│  └─────────────────┴──────────────────┴──────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│            Discovery & Analysis Plane                    │
│  ┌─────────────┬──────────────┬────────────────────┐    │
│  │  Passive    │    ntopng    │    Topology        │    │
│  │  Discovery  │   (Traffic)  │    Inference       │    │
│  └─────────────┴──────────────┴────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 🏗️ Repository Structure

```
NOP/
├── .github/                    # GitHub configuration & agent framework
│   ├── agents/                 # Multi-agent system (*.agent.md)
│   ├── chatmodes/             # Legacy chatmodes (deprecated, use agents/)
│   ├── instructions/          # Agent instruction modules
│   ├── workflows/             # GitHub Actions workflows
│   ├── scripts/               # Automation scripts
│   ├── backups/               # Knowledge backups
│   ├── copilot-instructions.md # Main agent framework guide
│   └── global_knowledge.json  # Universal patterns (JSONL)
│
├── backend/                   # FastAPI backend service
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── core/             # Core configurations
│   │   ├── models/           # Database models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utility functions
│   ├── Dockerfile
│   ├── requirements.txt
│   └── start.sh
│
├── frontend/                  # React/TypeScript frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   └── store/            # State management (Zustand)
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── docker/                    # Docker service configurations
│   └── ntopng/               # Network traffic analysis
│
├── test-environment/          # Test infrastructure
│   ├── ssh-server/           # SSH test target
│   ├── vnc-server/           # VNC test target
│   ├── rdp-server/           # RDP test target
│   ├── ftp-server/           # FTP test target
│   ├── web-server/           # HTTP test target
│   ├── database-server/      # MySQL test target
│   └── file-server/          # SMB test target
│
├── scripts/                   # Utility scripts
│   ├── generate_traffic.py   # Network traffic generator
│   └── update_memory.py      # Knowledge update script
│
├── docs/                      # Documentation
│   ├── architecture/          # System architecture docs
│   ├── technical/             # API specs and technical details
│   ├── guides/                # Configuration and deployment guides
│   ├── features/              # Implemented and proposed features
│   ├── development/           # Development docs (roadmap, contributing)
│   └── design/                # UI/UX specifications
│
├── volumes/                   # Persistent data
│   ├── evidence/             # Captured network data
│   └── logs/                 # Application logs
│
├── project_knowledge.json     # Project-specific knowledge (JSONL)
├── docker-compose.yml         # Main service orchestration
├── docker-compose.test.yml    # Test environment
└── docker-compose.debug.yml   # Debug configuration
```

## 📋 Knowledge System

This project follows the **Universal Agent Framework** for AI-assisted development:

### Knowledge Files
- **`project_knowledge.json`** - Project-specific entities, code graph, relations
- **`.github/global_knowledge.json`** - Universal patterns and best practices

### Format (JSONL)
```json
{"type":"entity","name":"Domain.Module.Component","entityType":"Type","observations":["desc","upd:YYYY-MM-DD,refs:N"]}
{"type":"codegraph","name":"Component","nodeType":"module|class|function","dependencies":[],"dependents":[]}
{"type":"relation","from":"A","to":"B","relationType":"USES|IMPLEMENTS|DEPENDS_ON"}
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Start Main Services
```bash
docker-compose up -d --build
```

### Start Test Environment
```bash
docker-compose -f docker-compose.test.yml up -d --build
```

### Access Points
- **Frontend**: http://localhost:12000
- **Backend API**: http://localhost:12001
- **API Docs**: http://localhost:12001/docs

## 🔑 Key Features

### Network Monitoring & Analysis
- **Real-time Traffic Analysis** - Powered by ntopng with protocol detection
- **Automatic Asset Discovery** - Passive and active discovery modes
- **Interactive Topology** - EtherApe-style visualization with protocol coloring
- **Vulnerability Scanning** - Integrated scanning capabilities
- **Advanced Ping Tools** - Multi-protocol connectivity testing (ICMP, TCP, UDP, HTTP/HTTPS)

### Access Hub
- **Credential Vault** - Password-protected storage with group management
- **Quick Connect** - One-click access to saved hosts
- **Sorting** - Recent, Frequent, or Name-based organization
- **Fullscreen Mode** - Resizable connection area
- **Multiple Protocols** - SSH, VNC, RDP, FTP, Telnet, Web

### Security
- JWT authentication
- Encrypted credential storage
- Access logging and audit trails
- Password-protected quick connect

## 🤖 Agent Framework

> **✅ Official GitHub Custom Agents**: These agents use GitHub's official custom agent format and are automatically available in GitHub Copilot when merged to the default branch.

This project uses GitHub's official custom agent system for organizing development workflows. See `.github/agents/README.md` for complete documentation.

### Agents (Official GitHub Custom Agents)
- **DevTeam (Orchestrator)** - Coordinates tasks, delegates to specialists, integrates results
- **Architect** - Design decisions, patterns, system architecture
- **Developer** - Implementation, debugging, code
- **Reviewer** - Testing, validation, quality assurance
- **Researcher** - Investigation, codebase exploration, analysis

### Usage
Select agents in GitHub Copilot using `@AgentName` or the agent picker. Agents can delegate to sub-agents for specialized tasks. Knowledge is preserved in `project_knowledge.json` and `.github/global_knowledge.json`.

For detailed agent documentation, see `.github/agents/`.

**Format**: https://gh.io/customagents/config | **CLI**: https://gh.io/customagents/cli

## 📦 Tech Stack

### Backend
- FastAPI (Python 3.11)
- PostgreSQL 15
- Redis
- SQLAlchemy
- Asyncpg

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Recharts (Visualizations)

### Infrastructure
- Docker & Docker Compose
- Nginx
- Apache Guacamole
- ntopng

## 🧪 Test Credentials

**Vault Unlock**: `admin123`
**Reconnect Password**: `admin123`

**Test Servers**:
- SSH: `testuser:testpass123` or `admin:admin123`
- VNC: `vncuser:vnc123`
- RDP: `rdpuser:rdp123`
- FTP: `ftpuser:ftp123`
- SMB: `smbuser:smbpass123`

## 📝 License

[Add License Information]

## 👥 Contributors

[Add Contributors]

## 📚 Documentation

For detailed documentation, see:
- **Architecture**: `docs/architecture/ARCH_system_v1.md` - Complete system architecture
- **API Reference**: `docs/technical/API_rest_v1.md` - REST API specification
- **Configuration**: `docs/guides/CONFIGURATION.md` - Configuration reference
- **Deployment**: `docs/guides/DEPLOYMENT.md` - Deployment guide
- **Features**: `docs/features/` - Implemented and proposed features
- **Roadmap**: `docs/development/ROADMAP.md` - Development roadmap
