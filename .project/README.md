# Agent Functionality Design Documents

This directory contains comprehensive design documentation for implementing agent/C2 functionality in NOP (Network Observatory Platform).

## 📚 Documents

### 1. [agent-design-summary.md](./agent-design-summary.md)
**Quick Reference** - Start here!
- Executive decision: Hybrid Architecture (Option C)
- Technology stack justification
- Key features overview
- Quick start guide
- FAQ

**Read time:** 10 minutes  
**Best for:** Stakeholders, quick overview, decision makers

### 2. [agent-architecture-design.md](./agent-architecture-design.md)
**Complete Architecture Analysis**
- Problem statement and requirements
- Three architecture options (Fat, Thin, Hybrid) with pros/cons
- Detailed hybrid architecture design
- Communication protocol specification
- Agent implementation details (Go)
- C2 backend implementation (Python/FastAPI)
- Database schema (4 tables)
- Frontend UI design (POV switcher)
- Security considerations
- Success metrics

**Read time:** 45-60 minutes  
**Best for:** Developers, architects, technical review

### 3. [agent-implementation-roadmap.md](./agent-implementation-roadmap.md)
**Detailed Implementation Plan**
- 5 phases over 10 weeks
- Phase 1: Foundation (database, registration, WebSocket)
- Phase 2: Core capabilities (discovery, POV switcher)
- Phase 3: Advanced modules (scan, traffic, access)
- Phase 4: Production features (builder, obfuscation)
- Phase 5: Polish and testing
- Task breakdown for each phase
- Acceptance criteria
- Testing strategy
- Deployment checklist

**Read time:** 60-90 minutes  
**Best for:** Developers implementing the feature, project managers

### 4. [agent-visual-reference.md](./agent-visual-reference.md)
**Visual Diagrams & Flow Charts**
- System architecture diagram
- Communication flow diagrams
- POV switching behavior
- Module loading visualization
- Data flow examples
- Security layers
- Performance metrics

**Read time:** 20-30 minutes  
**Best for:** Visual learners, presentations, onboarding

## 🎯 Executive Summary

### Problem
NOP can only monitor/test the network where it's deployed. Need ability to deploy lightweight agents on remote systems and operate NOP features through those agents.

### Solution
**Hybrid Architecture** - Lightweight Go agent (~10MB) with:
- Built-in core capabilities (discovery, heartbeat)
- On-demand module loading (scan, traffic, access)
- WebSocket/TLS communication to C2
- Point-of-View (POV) switcher in UI
- All NOP features work through agents

### Implementation
10 weeks, 5 phases:
1. **Foundation** (Week 1-2): Database, registration, WebSocket
2. **Core** (Week 3-4): Discovery module, POV switcher
3. **Advanced** (Week 5-6): Scan, traffic, access modules
4. **Production** (Week 7-8): Agent builder, obfuscation
5. **Polish** (Week 9-10): Testing, docs, deployment

### Benefits
- ✅ Deploy in <5 minutes
- ✅ All NOP features work remotely
- ✅ Small footprint (<15MB, <100MB RAM)
- ✅ Secure (TLS, JWT, optional obfuscation)
- ✅ Support 50+ concurrent agents

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────┐
│   NOP C2 (System X)             │
│   ┌─────────────────────────┐   │
│   │ UI + POV Switcher       │   │
│   └──────────┬──────────────┘   │
│   ┌──────────▼──────────────┐   │
│   │ Agent Controller        │   │
│   │ • Registration          │   │
│   │ • Command Queue         │   │
│   │ • WebSocket Manager     │   │
│   └──────────┬──────────────┘   │
│   ┌──────────▼──────────────┐   │
│   │ Database (PostgreSQL)   │   │
│   └─────────────────────────┘   │
└───────────────┬─────────────────┘
                │ WebSocket/TLS
       ┌────────┼────────┐
       │        │        │
   ┌───▼──┐ ┌──▼──┐ ┌──▼──┐
   │Agent │ │Agent│ │Agent│
   │Sys A │ │Sys B│ │Sys C│
   └──────┘ └─────┘ └─────┘
```

## 🔑 Key Design Decisions

### 1. Agent Languages: **Go or Python**

**Go:**
- Single binary, no dependencies
- Cross-platform (Linux, Windows, macOS)
- Small size (~10MB)
- Easy obfuscation (Garble)

**Python:**
- Rapid development
- Leverages existing NOP codebase
- Rich ecosystem (scapy, requests, etc.)
- Easier debugging

### 2. Communication: **WebSocket over TLS**
- Bidirectional real-time
- Firewall-friendly (HTTPS)
- Built-in reconnection
- Efficient for streaming

**Alternative:** gRPC (considered, rejected for complexity)

### 3. Architecture: **Hybrid (Option C)**
- Lightweight core (always present)
- On-demand modules (downloaded as needed)
- Best balance of size vs functionality

**Alternatives:**
- Fat Agent (50-100MB, all features built-in)
- Thin Proxy (5-15MB, just relay traffic)

### 4. POV (Point-of-View) Switcher
- Global UI component in header
- Switch between C2 local and any agent
- All operations transparently routed
- Clear visual indication of active POV

## 📋 API Overview

### Agent Management
```
POST   /api/v1/agents/register           # Register new agent
GET    /api/v1/agents                    # List all agents
GET    /api/v1/agents/{id}               # Get details
DELETE /api/v1/agents/{id}               # Deregister
```

### Command Execution
```
POST   /api/v1/agents/{id}/commands      # Queue command
GET    /api/v1/agents/{id}/commands      # List commands
GET    /api/v1/agents/{id}/commands/{cmd_id}  # Get result
```

### WebSocket
```
WSS    /ws/agent/{agent_id}              # Agent connection
```

### Agent Builder
```
POST   /api/v1/agents/build              # Build custom agent
GET    /api/v1/agents/download/{id}      # Download binary
```

## 💾 Database Schema

### Tables
1. **agents** - Agent metadata, status, capabilities
2. **agent_commands** - Command queue and results
3. **agent_sessions** - WebSocket session tokens
4. **agent_heartbeats** - Time-series health data

### Key Relationships
```
agents (1) ──< (many) agent_commands
agents (1) ──< (many) agent_sessions
agents (1) ──< (many) agent_heartbeats
```

## 🔒 Security

### Layers
1. **Transport**: TLS 1.3
2. **Authentication**: JWT session tokens
3. **Authorization**: RBAC (admin, operator, viewer)
4. **Obfuscation**: Garble (optional)
5. **Audit**: Full command logging

### Best Practices
- Change default C2 URL in builds
- Use strong TLS configuration
- Minimum capabilities per agent
- Enable full audit logging

## 🧪 Testing Strategy

### Unit Tests
- Agent modules (Go)
- Agent services (Python)
- API endpoints

### Integration Tests
- Registration flow
- Command execution
- Module loading
- POV switching

### Platform Tests
- Linux (Ubuntu, CentOS)
- Windows (10, 11, Server)
- macOS (Intel, Apple Silicon)

### Load Tests
- 50 concurrent agents
- 1000 commands/minute
- Traffic streaming

## 📈 Success Metrics

**Functional:**
- ✅ All NOP features through agents
- ✅ Agent deploy < 5 min
- ✅ Support 50+ agents
- ✅ Command latency < 100ms

**Performance:**
- ✅ Binary < 15MB
- ✅ Memory < 100MB
- ✅ Network < 1KB/s idle

**Security:**
- ✅ TLS encrypted
- ✅ No stored credentials
- ✅ Full audit logs

## 🚀 Quick Start (Post-Implementation)

### Build Agent
```bash
# Via UI
1. Go to /agents
2. Click "Build Agent"
3. Select: Go, Linux, amd64, capabilities
4. Download binary
```

### Deploy Agent
```bash
scp agent user@target:/tmp/
ssh user@target
chmod +x /tmp/agent
./agent --c2-url https://nop.example.com:12001
```

### Use Agent
```bash
1. Switch POV to agent in header
2. Use NOP normally
3. All operations run through agent
```

## 📝 Implementation Status

| Phase | Status | Start | End |
|-------|--------|-------|-----|
| Planning & Design | ✅ Complete | 2026-01-03 | 2026-01-03 |
| Phase 1: Foundation | ⏳ Pending | TBD | TBD |
| Phase 2: Core | ⏳ Pending | TBD | TBD |
| Phase 3: Advanced | ⏳ Pending | TBD | TBD |
| Phase 4: Production | ⏳ Pending | TBD | TBD |
| Phase 5: Polish | ⏳ Pending | TBD | TBD |

## 🤝 Contributing

This is a design document. Implementation will follow in phases. See:
- [ROADMAP](./agent-implementation-roadmap.md) for detailed plan
- [ARCHITECTURE](./agent-architecture-design.md) for technical details

## 📚 References

### External Research
- Metasploit Framework - Module architecture
- Cobalt Strike - Beacon design
- Empire - PowerShell agent patterns
- Sliver - Modern C2 with gRPC

### Internal Documents
- `docs/architecture/ARCH_system_v1.md` - Current NOP architecture
- `project_knowledge.json` - Project entities and relations
- `.github/skills/` - Development patterns

## 📞 Contact

For questions about this design:
- Review the documents in order (summary → architecture → roadmap)
- Check visual reference for diagrams
- Open a discussion in the repository

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-03  
**Status:** Design Complete - Awaiting Implementation Approval
