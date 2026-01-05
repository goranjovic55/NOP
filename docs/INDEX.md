# NOP Documentation Index

**Network Observatory Platform** - Comprehensive documentation for developers and operators.

**Last Updated**: 2026-01-04  
**Version**: 2.0

---

## 📍 Navigation

| Category | Description | Location |
|----------|-------------|----------|
| 🚀 **Getting Started** | Quick setup and deployment | [guides/](#guides) |
| 🏗️ **Architecture** | System design and structure | [architecture/](#architecture) |
| 🛠️ **Technical** | API references and specs | [technical/](#technical) |
| ✨ **Features** | Feature documentation | [features/](#features) |
| 🎨 **Design** | UI/UX specifications | [design/](#design) |
| 💻 **Development** | Contributing and testing | [development/](#development) |
| 📦 **Archive** | Historical documentation | [archive/](#archive) |

---

## Quick Start

| Document | Purpose | Audience |
|----------|---------|----------|
| [Quick Start](guides/QUICK_START.md) | Get running in 5 minutes | All users |
| [Deployment Guide](guides/DEPLOYMENT.md) | Full installation & production setup | DevOps/SysAdmins |
| [Portable Executable Quick Start](PORTABLE_EXECUTABLE_QUICK_START.md) | **NEW**: Docker-free portable deployment options | DevOps/Developers |
| [API Reference](technical/API_rest_v1.md) | REST API documentation | Developers |
| [Contributing](development/CONTRIBUTING.md) | How to contribute | Contributors |

---

## Guides

### [QUICK_START.md](guides/QUICK_START.md)
**Quick Setup Guide**
- Docker Compose installation
- First login and navigation
- Basic network scanning
- Quick troubleshooting

**Audience**: New users

---

### [DEPLOYMENT.md](guides/DEPLOYMENT.md)  
**Complete Deployment & Configuration Guide**
- Prerequisites and hardware requirements
- Docker installation and configuration
- Development vs production setup
- Container management and rebuilding
- Multi-architecture support (amd64/arm64)
- Production deployment checklist
- Environment configuration
- Security hardening
- Troubleshooting

**Audience**: DevOps, System administrators, Production deployments

**Consolidated from**: DEPLOYMENT.md, DOCKER_REBUILD.md, PRODUCTION_DEPLOYMENT.md, NETWORK_CONNECTIVITY.md

---

### [PORTABLE_BUILD_GUIDE_NUITKA.md](guides/PORTABLE_BUILD_GUIDE_NUITKA.md)
**Portable Executable Build Guide (Nuitka)**
- Single executable without Docker
- Database migration (PostgreSQL → SQLite)
- Redis replacement with in-memory cache
- Guacamole handling options
- Frontend embedding
- Nuitka compilation process
- Cross-platform builds (Windows/Linux/macOS)
- Distribution and packaging

**Audience**: Developers, DevOps, Portable deployment users

**Time to implement**: 1-2 weeks

---

### [CONFIGURATION.md](guides/CONFIGURATION.md)
**Configuration Guide**
- Environment variables
- Database configuration
- Redis settings
- Network interface configuration
- Security settings (JWT, encryption)
- Docker Compose parameters

**Audience**: System administrators

---

## Architecture

### [ARCH_system_v1.md](architecture/ARCH_system_v1.md)
**System Architecture Overview**
- Multi-tier architecture: Frontend, Backend, Database, Infrastructure
- Service layer patterns and interactions
- Technology stack: FastAPI, React, PostgreSQL, Redis
- Docker-based deployment architecture
- Data flow and security architecture

**Topics**: System design, Component architecture, Security architecture

---

### [PORTABLE_EXECUTABLE_SOLUTIONS.md](architecture/PORTABLE_EXECUTABLE_SOLUTIONS.md)
**Portable Executable Solutions - Comprehensive Analysis**
- Overview of 4 different approaches for Docker-free deployment
- **Option 1**: Nuitka-based all-in-one executable (1-2 weeks)
- **Option 2**: Electron/Tauri desktop application (2-4 weeks)
- **Option 3**: Separate server-client architecture (1-3 weeks)
- **Option 4**: Go/Rust complete rewrite (4-6 months)
- Detailed comparison matrix and use case recommendations
- Implementation steps, pros/cons, and effort estimates
- Hybrid approach and migration paths

**Topics**: Deployment options, Portable executables, Architecture decisions

**Related**: [PORTABLE_EXECUTABLE_QUICK_START.md](PORTABLE_EXECUTABLE_QUICK_START.md), [PORTABLE_BUILD_GUIDE_NUITKA.md](guides/PORTABLE_BUILD_GUIDE_NUITKA.md)

---

## Technical

### [API_rest_v1.md](technical/API_rest_v1.md)
**REST API Reference**
- Authentication endpoints (JWT)
- Asset management API
- Network scanning and discovery
- Traffic analysis WebSocket API
- Agent/C2 endpoints
- Settings and configuration endpoints

**Topics**: API endpoints, Request/response schemas, Authentication, WebSocket protocols

---

## Features

### [AGENTS_C2.md](features/AGENTS_C2.md)
**Agent & Command-and-Control System**
- Deploy Python, C, or ASM agents to remote networks
- WebSocket-based C2 with auto-reconnection
- POV (Point of View) switching
- Token-based authentication
- Real-time status monitoring
- Go agent obfuscation and persistence
- Stealth features and anti-forensics
- Code generation with embedded configurations

**Topics**: Remote agents, C2 protocol, WebSocket, POV switching, Agent obfuscation

**Consolidated from**: AGENT_C2_PAGE_DOCUMENTATION.md, AGENT_C2_SCREENSHOTS.md, AGENT_C2_VISUAL_MOCKUPS.md, AGENT_OBFUSCATION_PERSISTENCE.md, IMPLEMENTATION_SUMMARY_AGENTS.md

---

### [STORM_FEATURE.md](features/STORM_FEATURE.md)
**Real-Time Traffic Analysis**
- Live packet capture and visualization
- Protocol dissection
- Connection tracking
- Performance optimization

**Topics**: Packet capture, Traffic analysis, STORM engine

---

### [GRANULAR_TRAFFIC_FILTERING.md](features/GRANULAR_TRAFFIC_FILTERING.md)
**Advanced Traffic Filtering**
- Source-only tracking
- Broadcast filtering
- Protocol-based filtering
- Performance tuning

**Topics**: Traffic filtering, Network optimization

---

### [IMPLEMENTED_FEATURES.md](features/IMPLEMENTED_FEATURES.md)
**Complete Feature List**
- Network discovery and scanning
- Real-time packet capture
- Protocol dissection and analysis
- Multi-protocol remote access
- Credential vault
- Topology visualization
- Host monitoring
- Agent/C2 system

**Audience**: Users, Product team

---

### [FEATURE_PROPOSALS.md](features/FEATURE_PROPOSALS.md)
**Proposed Features**
- Community requests
- Planned enhancements
- Feature voting

**Audience**: Product team, Contributors

---

## Design

### [UI_UX_SPEC.md](design/UI_UX_SPEC.md)
**UI/UX Specifications**
- Cyberpunk theme design system
- Component library (CyberUI)
- Color palette and typography
- Layout patterns
- Interaction patterns
- Accessibility guidelines

**Audience**: Frontend developers, Designers

---

### [UNIFIED_STYLE_GUIDE.md](design/UNIFIED_STYLE_GUIDE.md)
**Unified Style Guidelines**
- Component standardization
- CSS variables and theming
- Responsive design patterns

**Audience**: Frontend developers

---

## Development

### [CONTRIBUTING.md](development/CONTRIBUTING.md)
**Contributing Guidelines**
- Code style and standards
- Git workflow and branching
- Pull request process
- Testing requirements
- Documentation standards

**Audience**: Contributors, Developers

---

### [TESTING.md](development/TESTING.md)
**Testing Guide**
- Test environment setup
- Unit testing patterns
- Integration testing with Docker
- Test suites overview
- Running tests
- CI/CD integration

**Audience**: Developers, QA

---

### [ROADMAP.md](development/ROADMAP.md)
**Product Roadmap**
- Completed features
- In-progress development
- Planned enhancements
- Future vision
- Version history

**Audience**: Product team, Contributors

---

## Archive

Historical documentation preserved for reference:

### [agent-docs-2026-01-04/](archive/agent-docs-2026-01-04/)
- AGENT_C2_PAGE_DOCUMENTATION.md
- AGENT_C2_SCREENSHOTS.md  
- AGENT_C2_VISUAL_MOCKUPS.md
- AGENT_OBFUSCATION_PERSISTENCE.md
- IMPLEMENTATION_SUMMARY_AGENTS.md

**Note**: Content consolidated into [features/AGENTS_C2.md](features/AGENTS_C2.md)

---

### [akis-analysis/](archive/akis-analysis/)
AKIS framework analysis documents:
- AKIS_CONCEPTUAL_AUDIT.md
- AKIS_EDGE_FAILURE_SCENARIOS_2026-01-01.md
- AKIS_FRAMEWORK_STRESS_ANALYSIS.md
- AKIS_IMPROVEMENT_PROPOSALS_2025-12-31.md
- Complex session simulations
- Failure mode detection
- Streamlined protocol versions

**Note**: Historical framework development analysis

---

### Deployment Archives
- DEPLOYMENT.md (older version)
- DOCKER_REBUILD.md
- PRODUCTION_DEPLOYMENT.md
- NETWORK_CONNECTIVITY.md

**Note**: Content consolidated into [guides/DEPLOYMENT.md](guides/DEPLOYMENT.md)

---

## Documentation Standards

### File Naming Convention
- `CATEGORY_NAME.md` - Primary category documentation
- `FEATURE_NAME.md` - Feature-specific documentation
- `GUIDE_NAME.md` - User/deployment guides
- `SPEC_NAME.md` - Technical specifications

### Directory Structure
```
docs/
├── INDEX.md (this file)
├── guides/          # User-facing guides
├── features/        # Feature documentation
├── technical/       # API references, specs
├── architecture/    # System design
├── design/          # UI/UX specifications
├── development/     # Contributing, testing
├── analysis/        # Current project analysis
├── screenshots/     # Visual documentation
└── archive/         # Historical documentation
```

### Linking Guidelines
- Use relative paths: `[Link](features/FEATURE.md)`
- Link to specific sections: `[Section](DOC.md#section-name)`
- Always update INDEX.md when adding new documents

### Consolidation Policy
- Archive old versions before major updates
- Merge duplicate/scattered documentation
- Maintain single source of truth per topic
- Cross-reference related documents

---

## Changelog

### 2026-01-04 (v2.0) - Major Reorganization
- **Consolidated**: 7 agent docs → [features/AGENTS_C2.md](features/AGENTS_C2.md)
- **Consolidated**: 4 deployment docs → [guides/DEPLOYMENT.md](guides/DEPLOYMENT.md)
- **Archived**: AKIS analysis documents to [archive/akis-analysis/](archive/akis-analysis/)
- **Archived**: Legacy agent docs to [archive/agent-docs-2026-01-04/](archive/agent-docs-2026-01-04/)
- **Standardized**: File naming and directory structure
- **Updated**: INDEX.md with comprehensive navigation

### 2025-12-29 (v1.0) - Initial Organization
- Created directory structure
- Organized existing documentation
- Added INDEX.md

---

**Maintained by**: GitHub Copilot + AKIS Framework  
**Last Review**: 2026-01-04  
**Next Review**: Every 10 sessions or major feature addition
- Feature specifications
- Implementation considerations

**Audience**: Product team, Contributors

---

## 🔍 Document Categories

### By Role
- **New Users**: Quick Start → Configuration → Deployment
- **Developers**: Contributing → Testing → API Reference → Architecture
- **DevOps**: Deployment → Configuration → Architecture
- **Designers**: UI/UX Spec
- **Product Team**: Roadmap → Implemented Features → Feature Proposals

### By Topic
- **Setup**: Quick Start, Configuration, Deployment
- **Development**: Contributing, Testing, Roadmap
- **Technical**: Architecture, API Reference
- **Features**: Implemented Features, Feature Proposals
- **Design**: UI/UX Spec

---

## 📊 Documentation Statistics

- **Total Documents**: 11 core documents
- **Total Size**: ~176 KB
- **Categories**: 6 (Architecture, Technical, Guides, Development, Design, Features)
- **Coverage**: System architecture, API, deployment, development, design
- **Duplication**: <5% (consolidated approach)

---

## 🔄 Related Resources

### Agent Framework
- **Skills**: `.claude/skills.md` - 13 core coding skills
- **Domain Skills**: `.claude/skills/domain.md` - 8 NOP-specific patterns
- **Knowledge Graph**: `project_knowledge.json` - Entity-relation model
- **Global Patterns**: `.github/global_knowledge.json` - Universal patterns
- **Workflows**: `.github/workflows/` - Agent workflow definitions

### Code Documentation
- **Backend**: `backend/app/` - Inline docstrings and type hints
- **Frontend**: `frontend/src/` - JSDoc comments and TypeScript types
- **Tests**: `backend/tests/` - Test documentation

---

## 📝 Documentation Maintenance

### Update Workflows
1. **update_documents**: Run to consolidate and optimize documentation
2. **update_knowledge**: Sync with knowledge graph
3. **update_skills**: Update skill patterns

### Standards
- Use Markdown for all documentation
- Include examples and code snippets
- Keep TOC for documents >1000 lines
- Version with `_v[N]` suffix for major changes
- Update this index when adding/removing documents

### Naming Conventions
| Type | Pattern | Example |
|------|---------|---------|
| Architecture | `ARCH_[system]_v[N].md` | `ARCH_system_v1.md` |
| API | `API_[service]_v[N].md` | `API_rest_v1.md` |
| Guides | `[PURPOSE].md` | `QUICK_START.md` |
| Development | `[PURPOSE].md` | `CONTRIBUTING.md` |

---

**Version**: 1.0  
**Maintained by**: NOP Development Team  
**Feedback**: Submit issues or suggestions via GitHub issues
