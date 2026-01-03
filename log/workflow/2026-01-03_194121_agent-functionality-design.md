# Agent Functionality Design - Workflow Log

**Date:** 2026-01-03  
**Time:** 19:30 - 19:41 UTC  
**Duration:** ~11 minutes  
**Branch:** `copilot/design-agent-functionality`  
**Agent:** Developer  
**Task:** Design comprehensive agent/C2 functionality for NOP

## Objective

Design and document a complete architecture for implementing agent functionality in NOP (Network Observatory Platform), enabling it to function as a Command and Control (C2) system with distributed proxy agents.

## Problem Statement (User Requirements)

From the issue description:

> "We need to analyze in-depth and propose a design for agent functionalities. At the moment in agent page branch that was active today, we worked on agent page and we are able to generate agent shell with download link and back connection etc. As visible, agents are going to be used as proxy NOP so if agent is executed on system A it connects to system X that has NOP C2 on, and on system X we go into NOP agent mode and we should have exactly same functionalities but originating from agent (network scans and discovery shows agent network, host page shows agent host info, access page shows that agent's access assets, scan page shows that agent's assets and can scan them, and traffic page gives sniffing pinging storming and crafting from agent system itself). 
>
> So we need solution how to design sending and receiving data and command execution. Should we incorporate all those functionalities in agent and then send request agent does the job and sends result? Should we use agent as proxy relay relaying only traffic through it? Search web for docs and community best practices please."

## Approach

### Phase: CONTEXT
1. ✅ Explored repository structure
2. ✅ Reviewed project_knowledge.json (406 entities)
3. ✅ Identified existing NOP capabilities:
   - Network discovery and scanning
   - Traffic analysis and capture
   - Access testing (SSH, RDP, VNC, etc.)
   - Host monitoring
   - Packet crafting and storming
4. ✅ Understood current architecture (FastAPI backend + React frontend)
5. ✅ Reviewed AKIS framework requirements

### Phase: PLAN
1. ✅ Researched C2 and agent architectures:
   - Metasploit Framework (module system)
   - Cobalt Strike (Beacon architecture)
   - Empire (PowerShell-based staging)
   - Sliver (modern gRPC/HTTP/DNS)
   - Community best practices

2. ✅ Analyzed three architecture options:
   - **Option A: Fat Agent** - All functionality built-in (50-100MB)
   - **Option B: Thin Proxy** - Just relay traffic (5-15MB)
   - **Option C: Hybrid** - Core + on-demand modules (10MB) **← RECOMMENDED**

3. ✅ Designed key components:
   - Communication protocol (WebSocket over TLS)
   - Agent structure (Go implementation)
   - C2 backend services (Python/FastAPI)
   - Database schema (4 new tables)
   - Frontend POV (Point-of-View) switcher
   - Security layers (7 levels)

### Phase: IMPLEMENT (Documentation)
Created 5 comprehensive design documents:

1. **`.project/README.md`** (9KB)
   - Project overview and navigation
   - Quick reference to all documents
   - Implementation status tracking
   - Contact information

2. **`.project/agent-design-summary.md`** (11KB)
   - Executive summary (10 min read)
   - Quick reference guide
   - Technology stack decisions
   - FAQ and best practices
   - **Target audience:** Stakeholders, decision makers

3. **`.project/agent-architecture-design.md`** (26KB)
   - Complete technical analysis (45-60 min read)
   - Three architecture options with detailed pros/cons
   - Hybrid architecture specification
   - Communication protocol design
   - Agent implementation (Go)
   - C2 implementation (Python/FastAPI)
   - Database schema (agents, agent_commands, agent_sessions, agent_heartbeats)
   - Frontend UI design (POV switcher, Agents page)
   - Security considerations (TLS, JWT, obfuscation)
   - Testing strategy
   - Success metrics
   - **Target audience:** Developers, architects

4. **`.project/agent-implementation-roadmap.md`** (25KB)
   - Detailed 10-week implementation plan
   - 5 phases with task breakdowns:
     - Phase 1 (Week 1-2): Foundation
     - Phase 2 (Week 3-4): Core capabilities
     - Phase 3 (Week 5-6): Advanced modules
     - Phase 4 (Week 7-8): Production features
     - Phase 5 (Week 9-10): Polish & testing
   - Acceptance criteria per task
   - Testing checklist (unit, integration, platform, security)
   - Deployment checklist
   - Risk mitigation
   - **Target audience:** Developers, project managers

5. **`.project/agent-visual-reference.md`** (20KB)
   - System architecture diagrams
   - Communication flow charts
   - POV switching behavior visualization
   - Module loading diagrams
   - Data flow examples (network discovery step-by-step)
   - Security layers diagram
   - Performance metrics tables
   - **Target audience:** Visual learners, presentations

### Phase: VERIFY
1. ✅ Reviewed all documents for:
   - Technical accuracy
   - Completeness (addresses all user requirements)
   - Clarity and readability
   - Consistent terminology
   - Proper formatting

2. ✅ Validated design decisions:
   - Hybrid architecture balances size and functionality
   - WebSocket/TLS provides reliable bidirectional communication
   - Go provides cross-platform single-binary deployment
   - POV switcher enables intuitive context switching
   - Module system allows incremental capability addition

3. ✅ Ensured all user questions answered:
   - ✅ How to send/receive data: WebSocket protocol specified
   - ✅ Command execution: Async queue system designed
   - ✅ Full vs relay: Hybrid approach recommended
   - ✅ Implementation path: 5-phase roadmap created

## Key Design Decisions

### 1. Architecture: Hybrid (Option C) ✅

**Decision:** Lightweight core with on-demand module loading

**Rationale:**
- Small initial deployment (~10MB vs 50-100MB fat agent)
- Flexible - can scale up capabilities as needed
- Bandwidth-efficient for common tasks
- Updates only require module refresh, not full redeployment
- Can cache modules for offline use
- Graceful degradation if modules unavailable

**Comparison:**

| Criterion | Fat Agent | Thin Proxy | **Hybrid** ✅ |
|-----------|-----------|------------|--------------|
| Binary Size | ❌ 50-100MB | ✅ 5-15MB | ✅ 10MB |
| Bandwidth | ✅ Low | ❌ High | ✅ Medium |
| Maintainability | ❌ Hard | ✅ Easy | ✅ Easy |
| Offline Capable | ✅ Yes | ❌ No | ⚠️ Partial |
| Latency | ✅ Low | ❌ High | ✅ Low |
| **Best For** | Long-term | Short tests | **General** |

### 2. Agent Languages: Go and Python ✅

**Decision:** Both Go and Python are fully supported for agent development

**Go Benefits:**
- Single binary, no dependencies
- Cross-platform compilation (Linux, Windows, macOS)
- Small binary size (~10MB with proper flags)
- Good concurrency support (goroutines)
- Easy obfuscation (Garble tool)
- Strong standard library for networking

**Python Benefits:**
- Rapid development and prototyping
- Leverages existing NOP backend codebase
- Rich ecosystem (scapy, nmap, psutil, etc.)
- Easier debugging and iteration
- PyInstaller for bundling (~25-50MB)

**Choice depends on:**
- Go: When deployment size and single-binary portability are critical
- Python: When development speed and codebase reuse are priorities

### 3. Communication: WebSocket over TLS ✅

**Decision:** WebSocket for bidirectional communication

**Rationale:**
- Real-time bidirectional messaging
- Built-in reconnection logic
- Firewall-friendly (standard HTTPS port)
- Efficient for streaming data (traffic capture, logs)
- Native browser support (future web-based agents)

**Alternatives Considered:**
- gRPC: More complex, not as firewall-friendly
- HTTP polling: Higher latency, more overhead
- Custom TCP: Harder to debug, less standard

### 4. POV (Point-of-View) Switcher ✅

**Decision:** Global UI component for context switching

**Rationale:**
- Intuitive operator experience
- Clear indication of operation origin
- Seamless switching between C2 and agents
- All existing NOP features work unchanged
- Transparent routing based on POV selection

**Implementation:**
```typescript
// Global state
currentPOV: "c2" | "agent:{id}"

// API wrapper
if (pov === "c2") {
  // Direct execution on C2
} else {
  // Queue command for agent
}
```

## Architecture Overview

### System Components

```
┌─────────────────────────────────────┐
│        NOP C2 (System X)            │
│  ┌───────────────────────────────┐  │
│  │  Web UI + POV Switcher        │  │
│  └───────────────┬───────────────┘  │
│  ┌───────────────▼───────────────┐  │
│  │  Agent Controller Service     │  │
│  │  • Registration               │  │
│  │  • Command Queue              │  │
│  │  • Module Distribution        │  │
│  └───────────────┬───────────────┘  │
│  ┌───────────────▼───────────────┐  │
│  │  Database (PostgreSQL)        │  │
│  │  • agents                     │  │
│  │  • agent_commands             │  │
│  │  • agent_sessions             │  │
│  │  • agent_heartbeats           │  │
│  └───────────────────────────────┘  │
└───────────────┬─────────────────────┘
                │ WebSocket/TLS
       ┌────────┼────────┐
       │        │        │
   ┌───▼──┐ ┌──▼──┐ ┌──▼──┐
   │Agent │ │Agent│ │Agent│
   │Sys A │ │Sys B│ │Sys C│
   └──────┘ └─────┘ └─────┘
```

### Agent Structure

**Built-in Core (Always Present):**
- Agent check-in / registration
- Heartbeat / health reporting
- Command queue processor
- Basic network discovery (ARP, ICMP)
- System information collection
- Secure communication (TLS)

**On-Demand Modules (Downloaded when needed):**
- Port scanning (nmap wrapper)
- Traffic capture (scapy/pcap)
- Protocol testing (SSH, RDP, etc.)
- Packet crafting
- Traffic storming
- Exploit execution

### Communication Protocol

**Message Types:**
```typescript
// C2 → Agent: Command
{
  type: "command",
  command_id: "uuid",
  module: "discovery",
  params: { subnet: "192.168.1.0/24" },
  timeout: 300
}

// Agent → C2: Result
{
  type: "result",
  command_id: "uuid",
  status: "success",
  data: [...],
  execution_time: 1250
}

// Agent → C2: Heartbeat
{
  type: "heartbeat",
  agent_id: "abc123",
  cpu_usage: 25.5,
  memory_usage: 1024,
  active_tasks: 2
}
```

### Database Schema

**agents table:**
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    agent_id VARCHAR(64) UNIQUE,
    hostname VARCHAR(255),
    os_type VARCHAR(50),
    ip_address INET,
    capabilities JSONB,
    modules JSONB,
    status VARCHAR(20),
    last_seen TIMESTAMP,
    metadata JSONB
);
```

**agent_commands table:**
```sql
CREATE TABLE agent_commands (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    command_type VARCHAR(50),
    params JSONB,
    status VARCHAR(20),
    result JSONB,
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

### API Endpoints

**Agent Management:**
```
POST   /api/v1/agents/register           # Register new agent
GET    /api/v1/agents                    # List all agents
GET    /api/v1/agents/{id}               # Get agent details
DELETE /api/v1/agents/{id}               # Deregister agent
```

**Command Execution:**
```
POST   /api/v1/agents/{id}/commands      # Queue command
GET    /api/v1/agents/{id}/commands      # List commands
GET    /api/v1/agents/{id}/commands/{cmd_id}  # Get result
```

**WebSocket:**
```
WSS    /ws/agent/{agent_id}              # Agent connection
```

## Implementation Plan (10 Weeks)

### Phase 1: Foundation (Week 1-2)
- Database schema and models
- Agent registration API
- WebSocket communication
- Basic Go agent with heartbeat
- Agent management UI

**Deliverables:**
- Agent can register and maintain connection
- Heartbeat updates visible in UI
- Basic agent list page

### Phase 2: Core Capabilities (Week 3-4)
- Command queue system
- Network discovery module (agent)
- POV switcher in UI
- Discovery page integration

**Deliverables:**
- Can send discovery command to agent
- Results show agent's network
- POV switcher functional

### Phase 3: Advanced Modules (Week 5-6)
- Port scanning module
- Traffic capture module
- Access testing module
- Integration with Traffic/Access pages

**Deliverables:**
- All scanning features work through agent
- Traffic capture from agent
- Access tests from agent's perspective

### Phase 4: Production Features (Week 7-8)
- Agent builder UI
- On-demand module loading
- Obfuscation pipeline (Garble)
- Health monitoring dashboard

**Deliverables:**
- Can build custom agents
- Modules download on-demand
- Obfuscated binaries

### Phase 5: Polish & Testing (Week 9-10)
- Cross-platform testing
- Performance optimization
- Documentation
- Deployment automation

**Deliverables:**
- Tested on Linux, Windows, macOS
- Performance benchmarks met
- User documentation complete

## Security Considerations

### 7 Security Layers

1. **Transport Security**
   - TLS 1.3 encryption
   - Certificate validation (optional pinning)
   - Strong cipher suites only

2. **Authentication**
   - Pre-shared key OR challenge-response
   - JWT session tokens (24h expiry)
   - Token rotation

3. **Authorization**
   - Role-based access control (RBAC)
   - Admin, operator, viewer roles
   - Command whitelisting per role

4. **Command Validation**
   - Parameter sanitization
   - Command whitelisting
   - Rate limiting per agent

5. **Obfuscation (Optional)**
   - Symbol obfuscation (Garble)
   - String encryption
   - Debug symbol stripping

6. **Operational Security**
   - Configurable check-in jitter
   - Domain fronting support
   - Traffic shaping (mimic HTTPS)

7. **Audit & Logging**
   - All commands logged
   - User, timestamp, agent, result
   - Compliance-ready

## Success Metrics

### Functional
- ✅ All NOP features work through agents
- ✅ Agent deployment < 5 minutes
- ✅ Support 50+ concurrent agents
- ✅ Sub-second command delivery

### Performance
- ✅ Agent binary < 15MB
- ✅ Agent memory < 100MB
- ✅ Command latency < 100ms
- ✅ Network overhead < 1KB/s idle

### Security
- ✅ All communications encrypted (TLS)
- ✅ No credentials stored on agent
- ✅ Full audit logging
- ✅ Obfuscation passes basic AV

## Deliverables

### Documentation (All Complete ✅)

1. ✅ Project README (`.project/README.md`)
2. ✅ Design Summary (`.project/agent-design-summary.md`)
3. ✅ Architecture Design (`.project/agent-architecture-design.md`)
4. ✅ Implementation Roadmap (`.project/agent-implementation-roadmap.md`)
5. ✅ Visual Reference (`.project/agent-visual-reference.md`)

**Total Documentation:** ~90KB, ~3,000 lines

### Git Commits

1. `9cb56ea` - Initial plan
2. `69c9b2d` - Comprehensive design and implementation plan
3. `5f02dc9` - Visual reference and project README

### Files Created

```
.project/
├── README.md                         (9KB)
├── agent-design-summary.md           (11KB)
├── agent-architecture-design.md      (26KB)
├── agent-implementation-roadmap.md   (25KB)
└── agent-visual-reference.md         (20KB)
```

## Recommendations

### Immediate Actions
1. **Review Design Documents**
   - Start with `.project/README.md` for overview
   - Read `.project/agent-design-summary.md` for quick reference
   - Review `.project/agent-architecture-design.md` for technical details

2. **Approve Architecture**
   - Confirm Hybrid Architecture (Option C) is acceptable
   - Review technology stack decisions (Go, WebSocket, PostgreSQL)
   - Validate security requirements

3. **Begin Implementation**
   - Set up Go development environment
   - Create agent project structure
   - Start Phase 1: Foundation

### Short-term (Next 3 months)
1. Implement Phases 1-3 (core + basic modules)
2. Test with 3-5 internal agents
3. Gather operational feedback
4. Iterate on design based on real-world usage

### Long-term (6+ months)
1. Add advanced modules (exploit execution, persistence)
2. Multi-tenant support (multiple operators, agent fleets)
3. Agent clustering (peer-to-peer communication)
4. Offline tasking (command caching when C2 unreachable)

## Lessons Learned

### What Went Well
- ✅ Comprehensive research into existing C2 frameworks
- ✅ Clear comparison of architecture options with pros/cons
- ✅ Detailed implementation plan with acceptance criteria
- ✅ Visual diagrams for better understanding
- ✅ Security considerations addressed upfront
- ✅ Realistic success metrics defined

### Challenges
- ⚠️ Balancing agent size vs functionality (resolved with hybrid approach)
- ⚠️ Choosing between gRPC and WebSocket (WebSocket better for firewall traversal)
- ⚠️ Deciding on module distribution mechanism (on-demand loading chosen)

### Best Practices Applied
- 📘 Started with problem understanding
- 📘 Researched community best practices
- 📘 Compared multiple options objectively
- 📘 Documented decisions with rationale
- 📘 Created multiple document types for different audiences
- 📘 Included visual aids for complex concepts

## Next Steps

### For User/Stakeholder
1. **Review design documents** in this order:
   - `.project/README.md` - Project overview
   - `.project/agent-design-summary.md` - Quick summary
   - `.project/agent-visual-reference.md` - Diagrams
   - `.project/agent-architecture-design.md` - Full technical details (if needed)

2. **Provide feedback** on:
   - Is Hybrid Architecture acceptable?
   - Are security requirements sufficient?
   - Is 10-week timeline realistic?
   - Any additional requirements?

3. **Approve to proceed** with implementation (Phase 1)

### For Development Team
1. **Set up development environment**
   - Install Go toolchain (1.21+)
   - Set up test NOP C2 instance
   - Create agent project structure

2. **Begin Phase 1 implementation**
   - Database schema migration
   - Agent registration API
   - Basic Go agent
   - WebSocket communication

3. **Create GitHub Project board**
   - Track tasks from roadmap
   - Weekly progress reviews
   - Regular demos

## Conclusion

This design provides a comprehensive blueprint for implementing agent/C2 functionality in NOP. The **Hybrid Architecture** balances deployment size, operational flexibility, and maintenance burden while enabling all NOP features to work seamlessly through remote agents.

The **Point-of-View (POV) switcher** provides an intuitive operator experience, allowing seamless context switching between local (C2) and remote (agent) perspectives without changing workflows.

The **10-week phased implementation** plan ensures incremental delivery of value with clear acceptance criteria and testing at each stage.

All user questions from the problem statement have been addressed:
- ✅ Communication protocol designed (WebSocket/TLS)
- ✅ Command execution pattern defined (async queue)
- ✅ Architecture choice made (Hybrid, not full nor relay)
- ✅ Implementation path created (5 phases, 10 weeks)
- ✅ Security considerations documented (7 layers)

**Ready for implementation approval and Phase 1 kickoff.**

---

**Workflow Log Version:** 1.0  
**Completed:** 2026-01-03 19:41 UTC  
**Status:** Design Complete - Awaiting Approval
