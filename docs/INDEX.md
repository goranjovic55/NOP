# NOP Documentation Index

**Network Observatory Platform** - Comprehensive documentation for developers and operators.

**Last Updated**: 2025-12-29

---

## Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [Quick Start](guides/QUICK_START.md) | Get up and running in 5 minutes | All users |
| [Deployment Guide](guides/DEPLOYMENT.md) | Production deployment instructions | DevOps |
| [API Reference](technical/API_rest_v1.md) | REST API documentation | Developers |
| [Contributing](development/CONTRIBUTING.md) | How to contribute to the project | Contributors |

---

## 📐 Architecture

### [ARCH_system_v1.md](architecture/ARCH_system_v1.md)
**System Architecture Overview**
- Multi-tier architecture: Frontend, Backend, Database, Infrastructure
- Service layer patterns and interactions
- Technology stack: FastAPI, React, PostgreSQL, Redis
- Docker-based deployment architecture

**Topics**: System design, Component architecture, Data flow, Security architecture

---

## 🛠️ Technical Documentation

### [API_rest_v1.md](technical/API_rest_v1.md)
**REST API Reference**
- Authentication endpoints (JWT)
- Asset management API
- Network scanning and discovery
- Traffic analysis WebSocket API
- Settings and configuration endpoints

**Topics**: API endpoints, Request/response schemas, Authentication, WebSocket protocols

---

## 📚 User Guides

### [QUICK_START.md](guides/QUICK_START.md)
**Quick Start Guide**
- Installation prerequisites
- Docker Compose setup
- First login and navigation
- Basic network scanning
- Quick troubleshooting

**Audience**: New users, Quick setup

### [CONFIGURATION.md](guides/CONFIGURATION.md)
**Configuration Guide**
- Environment variables
- Database configuration
- Redis settings
- Network interface configuration
- Security settings (JWT, encryption)
- Docker Compose parameters

**Audience**: System administrators

### [DEPLOYMENT.md](guides/DEPLOYMENT.md)
**Deployment Guide**
- Production deployment checklist
- Docker deployment patterns
- Security hardening
- Performance tuning
- Backup and recovery
- Monitoring and logging

**Audience**: DevOps, System administrators

---

## 💻 Development

### [CONTRIBUTING.md](development/CONTRIBUTING.md)
**Contributing Guidelines**
- Code style and standards
- Git workflow and branching
- Pull request process
- Testing requirements
- Documentation standards

**Audience**: Contributors, Developers

### [TESTING.md](development/TESTING.md)
**Testing Guide**
- Test environment setup
- Unit testing patterns
- Integration testing with Docker
- Test suites overview
- Running tests
- CI/CD integration

**Audience**: Developers, QA

### [ROADMAP.md](development/ROADMAP.md)
**Product Roadmap**
- Completed features
- In-progress development
- Planned enhancements
- Future vision
- Version history

**Audience**: Product team, Contributors

---

## 🎨 Design

### [UI_UX_SPEC.md](design/UI_UX_SPEC.md)
**UI/UX Specifications**
- Cyberpunk theme design system
- Component library
- Color palette and typography
- Layout patterns
- Interaction patterns
- Accessibility guidelines

**Audience**: Frontend developers, Designers

---

## ✨ Features

### [IMPLEMENTED_FEATURES.md](features/IMPLEMENTED_FEATURES.md)
**Implemented Features**
- Network discovery and scanning
- Real-time packet capture
- Protocol dissection and analysis
- Multi-protocol remote access
- Credential vault
- Topology visualization
- Host monitoring

**Audience**: Users, Product team

### [FEATURE_PROPOSALS.md](features/FEATURE_PROPOSALS.md)
**Feature Proposals**
- Proposed enhancements
- Community requests
- Feature specifications
- Implementation considerations

**Audience**: Product team, Contributors

### [EXPLOIT_FEATURE.md](features/EXPLOIT_FEATURE.md)
**Exploit Feature Documentation**
- Vulnerability database integration
- Exploit search and filtering
- CVE tracking and analysis
- Exploit execution workflow

**Audience**: Security analysts, Penetration testers

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

- **Total Documents**: 12 core documents
- **Total Size**: ~205 KB
- **Categories**: 6 (Architecture, Technical, Guides, Development, Design, Features)
- **Coverage**: System architecture, API, deployment, development, design, security features
- **Duplication**: <5% (consolidated approach)
- **Archive**: 5 obsolete documents moved to /docs/archive/

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
