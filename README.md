# NOP - Network Operations Platform

A comprehensive network operations and security management platform with advanced credential vaulting, network monitoring, and remote access capabilities.

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
│   ├── FEATURE_MOCKUP_VAULT_AND_RECENT_ACCESS.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── TOPOLOGY_IMPROVEMENTS.md
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

### Access Hub
- **Credential Vault** - Password-protected storage with group management
- **Quick Connect** - One-click access to saved hosts
- **Sorting** - Recent, Frequent, or Name-based organization
- **Fullscreen Mode** - Resizable connection area
- **Multiple Protocols** - SSH, VNC, RDP, FTP, Telnet, Web

### Network Monitoring
- Real-time traffic analysis
- Asset discovery
- Vulnerability scanning
- Topology visualization

### Security
- JWT authentication
- Encrypted credential storage
- Access logging and audit trails
- Password-protected quick connect

## 🤖 Agent Framework

> **Note**: This is a custom organizational framework for documenting development workflows, not GitHub's official agent system. Agents serve as reference documentation and are manually invoked.

This project uses a custom multi-agent architecture for organizing development workflows. See `.github/agents/README.md` for complete documentation.

### Agents (Documentation Roles)
- **DevTeam (Orchestrator)** - Coordinates tasks, integrates results
- **Architect** - Design decisions, patterns, structure
- **Developer** - Implementation, debugging, code
- **Reviewer** - Testing, validation, quality
- **Researcher** - Investigation, analysis, documentation

### Usage
Agents serve as workflow documentation and can be manually referenced in development. Knowledge is preserved in `project_knowledge.json` and `.github/global_knowledge.json`.

For detailed agent documentation, see `.github/agents/`.

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
