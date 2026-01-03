# Agent Functionality - Design Summary

**Date:** 2026-01-03  
**Quick Reference for Implementation**

## Executive Decision: Hybrid Architecture (Recommended)

After analyzing community best practices and three architecture options (Fat Agent, Thin Proxy, Hybrid), we recommend **Hybrid Architecture** for general use. However, **all three agent types are fully supported** and can be selected during the build process based on deployment requirements.

### ✅ **Hybrid Architecture (Option C) - Recommended for General Use**

**Core Concept:**
- Lightweight agent core (~10MB)
- Built-in basic capabilities (discovery, heartbeat, system info)
- On-demand module loading for advanced features
- Best of both worlds

**All Agent Types Supported:**
| Criterion | Fat Agent | Thin Proxy | **Hybrid** |
|-----------|-----------|------------|------------|
| Binary Size | ❌ 50-100MB | ✅ 5-15MB | ✅ 10MB |
| Bandwidth | ✅ Low | ❌ High | ✅ Medium |
| Maintainability | ❌ Hard | ✅ Easy | ✅ Easy |
| Offline Capable | ✅ Yes | ❌ No | ⚠️ Partial |
| Latency | ✅ Low | ❌ High | ✅ Low |
| **Best For** | Long-term ops | Short tests | **General use** |

> **Note:** For detailed implementation of all three agent types, see [agent-types-and-build-config.md](./agent-types-and-build-config.md)

## Technology Stack

### Agent
- **Languages:** Go or Python (both supported)
- **Go Benefits:**
  - Single binary, no dependencies
  - Cross-compile to Linux/Windows/macOS
  - Small footprint (~10MB)
  - Good concurrency (goroutines)
  - Easy obfuscation with Garble
- **Python Benefits:**
  - Rapid development
  - Leverages existing NOP codebase
  - Rich ecosystem (scapy, nmap-python, etc.)
  - Easier debugging and prototyping

### Communication
- **Protocol:** WebSocket over TLS
- **Why WebSocket:**
  - Bidirectional real-time
  - Firewall-friendly (HTTPS)
  - Built-in reconnection
  - Efficient streaming

### C2 Backend
- **Language:** Python (FastAPI)
- **Database:** PostgreSQL (agent metadata, commands, results)
- **Real-time:** WebSocket for agent connections
- **Storage:** Redis for caching, session management

## Architecture Overview

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
└──────────────────┼───────────────────┘
                   │ WebSocket/TLS
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼──┐   ┌──▼───┐  ┌──▼───┐
    │Agent │   │Agent │  │Agent │
    │Sys A │   │Sys B │  │Sys C │
    └──────┘   └──────┘  └──────┘
```

## Key Features

### 1. Agent Capabilities

**Built-in (Always Available):**
- ✅ Registration & check-in
- ✅ Heartbeat monitoring
- ✅ Basic network discovery (ARP, ICMP)
- ✅ System information collection
- ✅ Command execution framework

**On-Demand (Downloaded when needed):**
- 📦 Port scanning (nmap integration)
- 📦 Traffic capture (pcap)
- 📦 Packet crafting
- 📦 Access testing (SSH, RDP, VNC, etc.)
- 📦 Traffic generation/storming
- 📦 Exploit execution

### 2. Point-of-View (POV) Switcher

**UI Component** (added to NOP header):
```
┌─────────────────────────────────────┐
│ NOP | [POV: C2 Local ▼]            │
│       └─ C2 Local (192.168.1.100)  │
│       └─ Agent: server01 (10.0.0.5)│
│       └─ Agent: workstation (.15)  │
└─────────────────────────────────────┘
```

**Behavior:**
- When `POV = C2`: Operations run locally (current behavior)
- When `POV = agent:abc123`: Operations route through agent
  - Network scans show **agent's network**
  - Traffic capture from **agent's interface**
  - Access tests from **agent's perspective**
  - Host info shows **agent's system**

### 3. Communication Protocol

**Message Types:**
```typescript
// C2 → Agent: Command
{
  type: "command",
  command_id: "uuid",
  module: "discovery",
  params: { subnet: "192.168.1.0/24" }
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
  timestamp: 1704326400,
  cpu: 25.5,
  memory: 1024,
  active_tasks: 2
}
```

## Database Schema

### Tables to Add

**agents**
- id, agent_id, hostname, os_type, ip_address
- capabilities[], modules[], status, last_seen

**agent_commands**
- id, agent_id, command_type, params, status
- result, error, execution_time

**agent_sessions**
- id, agent_id, session_token, expires_at

**agent_heartbeats** (time-series)
- agent_id, timestamp, cpu, memory, network_info

## API Endpoints

### Agent Management
```
POST   /api/v1/agents/register           # Register new agent
GET    /api/v1/agents                    # List all agents
GET    /api/v1/agents/{id}               # Get agent details
DELETE /api/v1/agents/{id}               # Deregister agent
```

### Command Execution
```
POST   /api/v1/agents/{id}/commands      # Queue command
GET    /api/v1/agents/{id}/commands      # List commands
GET    /api/v1/agents/{id}/commands/{cmd_id}  # Get result
```

### Agent Builder
```
POST   /api/v1/agents/build              # Build custom agent
GET    /api/v1/agents/download/{id}      # Download agent binary
```

### WebSocket
```
WSS    /ws/agent/{agent_id}              # Agent connection
```

## UI Pages

### New: Agents Page (`/agents`)
```
┌─────────────────────────────────────────┐
│ Agents                                  │
├──────────┬──────────────────────────────┤
│ Agent    │ Agent Details                │
│ List     │ ┌─────────────────────────┐  │
│ ┌──────┐ │ │ System Info             │  │
│ │server│ │ │ • OS: Ubuntu 22.04      │  │
│ │01    │ │ │ • IP: 10.0.0.5          │  │
│ │●     │ │ │ • CPU: 25% / Mem: 1GB   │  │
│ └──────┘ │ └─────────────────────────┘  │
│ ┌──────┐ │ ┌─────────────────────────┐  │
│ │work  │ │ │ Quick Actions           │  │
│ │st    │ │ │ [Discover] [Scan]       │  │
│ │●     │ │ │ [Capture]  [Test Access]│  │
│ └──────┘ │ └─────────────────────────┘  │
│          │ ┌─────────────────────────┐  │
│[+Agent]  │ │ Activity Log            │  │
│          │ │ • 10:30 Discovery OK    │  │
│          │ │ • 10:25 Port scan done  │  │
└──────────┴──┴─────────────────────────┴──┘
```

### Modified: Existing Pages
- **All pages** get POV switcher in header
- **Discovery/Assets** page shows agent's network when POV = agent
- **Traffic** page captures from agent's interface
- **Access** page tests from agent's location
- **Host** page shows agent's system info

## Security Considerations

### Authentication
- Pre-shared key or challenge-response for registration
- JWT session tokens
- Token rotation every 24 hours

### Encryption
- TLS 1.3 for transport
- Optional payload encryption
- Certificate pinning (optional)

### Obfuscation (Optional)
- Go: Garble for symbol/string obfuscation
- Strip debug symbols
- UPX compression

### Operational Security
- Configurable check-in jitter
- Domain fronting support
- Audit logging for all commands

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- ✅ Database schema
- ✅ Agent registration API
- ✅ WebSocket communication
- ✅ Basic Go agent (heartbeat only)
- ✅ Agent management UI

### Phase 2: Core Capabilities (Week 3-4)
- ✅ Command queue system
- ✅ Network discovery module (agent)
- ✅ POV switcher (UI)
- ✅ Discovery page integration

### Phase 3: Advanced Modules (Week 5-6)
- ✅ Port scanning module
- ✅ Traffic capture module
- ✅ Access testing module
- ✅ Integration with Traffic/Access pages

### Phase 4: Production (Week 7-8)
- ✅ Agent builder UI
- ✅ On-demand module loading
- ✅ Obfuscation pipeline
- ✅ Health monitoring dashboard

### Phase 5: Polish (Week 9-10)
- ✅ Cross-platform testing
- ✅ Performance optimization
- ✅ Documentation
- ✅ Deployment automation

## Quick Start (Post-Implementation)

### For Operators

**1. Build an Agent:**
```
1. Go to /agents
2. Click "Build Agent"
3. Select: Go, Linux, amd64, capabilities
4. Download agent binary
```

**2. Deploy Agent:**
```bash
# Copy to target system
scp agent-linux-amd64 user@target:/tmp/agent

# Run on target
ssh user@target
chmod +x /tmp/agent
./agent --c2-url https://nop.example.com:12001
```

**3. Use Agent:**
```
1. Switch POV to agent in header
2. Go to Assets → Discover Network
3. Discovery now shows agent's network
4. Scan, capture traffic, test access as usual
```

### For Developers

**1. Run C2:**
```bash
docker-compose up -d
# Backend: http://localhost:12001
# Frontend: http://localhost:12000
```

**2. Build Agent Locally:**
```bash
cd agent/
go build -o agent ./cmd/agent
./agent --c2-url http://localhost:12001
```

**3. Test Communication:**
```bash
# Check agent registered
curl http://localhost:12001/api/v1/agents

# Send command
curl -X POST http://localhost:12001/api/v1/agents/{id}/commands \
  -d '{"type": "discovery", "params": {"subnet": "192.168.1.0/24"}}'
```

## Best Practices

### Agent Deployment
- ✅ Use custom build with only needed capabilities
- ✅ Enable obfuscation for stealth operations
- ✅ Configure check-in jitter (random 10-60s)
- ✅ Use HTTPS with valid certificate

### C2 Operations
- ✅ Always specify timeout for commands
- ✅ Monitor agent health (heartbeat)
- ✅ Review audit logs regularly
- ✅ Rotate session tokens

### Security
- ✅ Change default C2 URL in agent builds
- ✅ Use strong TLS configuration
- ✅ Limit agent capabilities to minimum needed
- ✅ Enable full audit logging

## Community Research Summary

Reviewed approaches from:
- **Metasploit Framework**: Full-featured agents with module system
- **Cobalt Strike**: Beacon architecture with malleable profiles
- **Empire**: PowerShell-based with staging
- **Sliver**: Modern C2 with gRPC, HTTP/HTTPS, DNS

**Key Takeaways:**
1. Modularity is critical (don't bloat agent)
2. Reliable C2 communication more important than stealth initially
3. Async command execution essential for UX
4. POV/context switching improves operator efficiency
5. Good logging/auditing builds trust

## Success Criteria

**Functional:**
- ✅ All NOP features work through agents
- ✅ Agent deployment < 5 minutes
- ✅ Support 50+ concurrent agents
- ✅ Sub-second command delivery

**Performance:**
- ✅ Agent binary < 15MB
- ✅ Agent memory < 100MB
- ✅ Command latency < 100ms

**Security:**
- ✅ All comms encrypted (TLS)
- ✅ No credentials on agent
- ✅ Full audit logging

## FAQ

**Q: Go or Python for agents?**
A: Both are supported. Go offers single binary deployment (~10MB) with easy cross-compilation. Python offers rapid development and leverages existing NOP code. Choose based on deployment requirements and development speed needs.

**Q: Why not just use SSH tunneling?**
A: Agent provides structured command/result interface, health monitoring, module management, and better error handling than raw tunnels.

**Q: Can agents work offline?**
A: Partially. Commands queue when offline, execute when reconnected. Future: offline tasking with result sync on reconnect.

**Q: How to update agents?**
A: Module system allows updating individual components without full redeployment. Core updates require re-deployment.

**Q: What about detection?**
A: Obfuscation helps but not foolproof. Use legitimate-looking traffic patterns, custom ports, domain fronting for stealth ops.

---

**For Full Details:**
- Architecture: `agent-architecture-design.md`
- Implementation: `agent-implementation-roadmap.md`

**Next Steps:**
1. Review and approve design
2. Begin Phase 1 (database + registration)
3. Prototype Go agent
4. Test communication flow
