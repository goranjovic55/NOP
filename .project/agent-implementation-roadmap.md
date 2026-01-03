# Agent Functionality - Implementation Roadmap

**Date:** 2026-01-03  
**Status:** Planning  
**Based on:** agent-architecture-design.md v1.0

## Quick Reference: Chosen Architecture

**Primary Approach:** Hybrid Architecture (Option C)
- Lightweight core agent (~10MB)
- Built-in basic capabilities
- On-demand module loading
- WebSocket/TLS communication
- Go for agent, Python/FastAPI for C2

## Phase 1: Foundation (Week 1-2)

### 1.1 Database Schema Setup

**Files to Create:**
```
backend/alembic/versions/002_add_agent_tables.py
backend/app/models/agent.py
backend/app/models/agent_command.py
backend/app/models/agent_session.py
backend/app/models/agent_heartbeat.py
backend/app/schemas/agent.py
```

**Tasks:**
- [ ] Create Agent model with fields: id, agent_id, hostname, os_type, capabilities, status
- [ ] Create AgentCommand model for command queue
- [ ] Create AgentSession model for WebSocket session management
- [ ] Create AgentHeartbeat model (time-series) for monitoring
- [ ] Create Pydantic schemas: AgentRegister, AgentUpdate, AgentResponse, CommandCreate, CommandResponse
- [ ] Write and test migration script
- [ ] Verify schema in test database

**Acceptance Criteria:**
- Models defined with proper relationships
- Migration runs successfully
- Can create/query agents via SQLAlchemy

### 1.2 Agent Registration API

**Files to Create/Modify:**
```
backend/app/api/v1/endpoints/agents.py
backend/app/services/agent_service.py
backend/app/api/v1/router.py (modify)
```

**Endpoints:**
```python
POST   /api/v1/agents/register          # Register new agent
GET    /api/v1/agents                   # List all agents  
GET    /api/v1/agents/{id}              # Get agent details
PATCH  /api/v1/agents/{id}              # Update agent
DELETE /api/v1/agents/{id}              # Deregister agent
```

**Tasks:**
- [ ] Implement AgentService.register_agent()
- [ ] Implement AgentService.list_agents() with filtering
- [ ] Implement AgentService.get_agent()
- [ ] Implement AgentService.update_agent()
- [ ] Implement AgentService.deregister_agent()
- [ ] Add authentication/authorization
- [ ] Write unit tests for service
- [ ] Write API endpoint tests

**Acceptance Criteria:**
- Can register agent via POST with agent_id, hostname, os_type
- Registration returns session_token (JWT)
- Can list agents with status filter (online/offline)
- Proper error handling (duplicate agent_id, etc.)

### 1.3 WebSocket Communication

**Files to Create:**
```
backend/app/api/websockets/agent.py
backend/app/services/agent_websocket_service.py
```

**Tasks:**
- [ ] Create WebSocket endpoint: `/ws/agent/{agent_id}`
- [ ] Implement agent authentication via JWT
- [ ] Implement bidirectional message handling
- [ ] Implement heartbeat receiver (update last_seen)
- [ ] Implement command sender (from queue to agent)
- [ ] Implement result receiver (from agent to database)
- [ ] Add connection state management (connect/disconnect events)
- [ ] Add error handling and reconnection logic
- [ ] Write WebSocket tests

**Message Protocol:**
```python
# Agent → C2: Heartbeat
{
  "type": "heartbeat",
  "agent_id": "abc123",
  "timestamp": 1704326400,
  "cpu_usage": 25.5,
  "memory_usage": 1024,
  "active_tasks": 2
}

# C2 → Agent: Command
{
  "type": "command",
  "command_id": "cmd-uuid",
  "module": "discovery",
  "params": {"subnet": "192.168.1.0/24", "method": "arp"}
}

# Agent → C2: Result
{
  "type": "result",
  "command_id": "cmd-uuid",
  "status": "success",
  "data": [...],
  "execution_time": 1250
}
```

**Acceptance Criteria:**
- Agent can establish WebSocket connection with valid token
- Heartbeat updates last_seen in database
- Commands sent to agent are received
- Results from agent are stored in database
- Connection survives network interruptions (auto-reconnect)

### 1.4 Basic Go Agent

**Directory Structure:**
```
agent/
├── cmd/agent/main.go
├── internal/
│   ├── core/
│   │   ├── agent.go
│   │   ├── config.go
│   │   └── connection.go
│   ├── comm/
│   │   └── websocket.go
│   └── modules/
│       └── heartbeat.go
├── go.mod
├── go.sum
└── README.md
```

**Tasks:**
- [ ] Initialize Go module: `go mod init github.com/goranjovic55/NOP/agent`
- [ ] Implement config loading (from file or env vars)
- [ ] Implement WebSocket client with TLS
- [ ] Implement registration flow (POST → WebSocket)
- [ ] Implement heartbeat sender (every 30s)
- [ ] Implement command receiver (from WebSocket)
- [ ] Implement result sender (to WebSocket)
- [ ] Add basic logging
- [ ] Build script with cross-compilation (Linux, Windows, macOS)
- [ ] Test agent→C2 communication

**Config Example:**
```yaml
c2:
  url: "https://nop.example.com"
  api_port: 12001
  ws_path: "/ws/agent"
  
agent:
  id: "auto-generated-or-specified"
  hostname: "auto-detect"
  heartbeat_interval: 30
  
tls:
  verify: true
  ca_cert: ""  # Path to CA cert for pinning
```

**Acceptance Criteria:**
- Agent binary compiles for Linux, Windows, macOS
- Agent can register with C2 and get session token
- Agent maintains WebSocket connection
- Heartbeat sent every 30 seconds
- Agent visible in C2 UI as "online"

### 1.5 Agent Management UI - Basic

**Files to Create:**
```
frontend/src/pages/Agents.tsx
frontend/src/services/agentService.ts
frontend/src/store/agentStore.ts
```

**UI Components:**
```
Agents Page
├── Agent List (left sidebar, 300px)
│   ├── Search/Filter
│   ├── Agent Cards
│   │   ├── Hostname
│   │   ├── IP Address
│   │   ├── OS Icon
│   │   ├── Status (online/offline)
│   │   └── Last Seen
│   └── "Register Agent" button
└── Agent Details (main area)
    ├── System Info
    │   ├── OS Type & Version
    │   ├── Architecture
    │   ├── Network Interfaces
    │   └── Capabilities
    ├── Health Stats
    │   ├── CPU Usage (real-time)
    │   ├── Memory Usage
    │   └── Uptime
    └── Activity Log (recent commands)
```

**Tasks:**
- [ ] Create agentService API client
- [ ] Create agentStore (Zustand) for state management
- [ ] Implement Agents page with list view
- [ ] Add real-time status updates (WebSocket or polling)
- [ ] Add agent details panel
- [ ] Style with cyber theme (matching existing pages)
- [ ] Add to navigation menu in Layout.tsx

**Acceptance Criteria:**
- Agents page accessible at /agents
- Shows list of registered agents
- Status updates in real-time (online → offline when agent disconnects)
- Can view agent details (system info, capabilities)
- Cyber theme consistent with rest of UI

---

## Phase 2: Core Capabilities (Week 3-4)

### 2.1 Command Queue System

**Files to Create/Modify:**
```
backend/app/services/command_queue_service.py
backend/app/api/v1/endpoints/agents.py (extend)
```

**New Endpoints:**
```python
POST   /api/v1/agents/{id}/commands            # Queue command
GET    /api/v1/agents/{id}/commands            # List commands
GET    /api/v1/agents/{id}/commands/{cmd_id}   # Get result
DELETE /api/v1/agents/{id}/commands/{cmd_id}   # Cancel command
```

**Tasks:**
- [ ] Implement CommandQueueService.queue_command()
- [ ] Implement priority queue (high/normal/low)
- [ ] Implement command timeout handling
- [ ] Implement result retrieval with pagination
- [ ] Implement command cancellation
- [ ] Add WebSocket command delivery
- [ ] Write tests for queue system

**Acceptance Criteria:**
- Can queue command via API
- Command delivered to agent via WebSocket
- Result stored and retrievable via API
- High-priority commands sent first
- Timeout cancels long-running commands

### 2.2 Network Discovery Module (Agent)

**Files to Create:**
```
agent/internal/modules/discovery.go
agent/internal/utils/network.go
```

**Tasks:**
- [ ] Implement ARP scan (Layer 2)
- [ ] Implement ICMP ping sweep (Layer 3)
- [ ] Implement combined discovery
- [ ] Return structured host data (IP, MAC, hostname)
- [ ] Handle platform differences (Linux vs Windows)
- [ ] Add timeout and cancellation support
- [ ] Write unit tests

**Discovery Methods:**
```go
func (d *DiscoveryModule) ARPScan(subnet string) ([]Host, error)
func (d *DiscoveryModule) PingScan(subnet string) ([]Host, error)
func (d *DiscoveryModule) CombinedScan(subnet string) ([]Host, error)
```

**Acceptance Criteria:**
- ARP scan discovers hosts on local subnet
- Ping scan works across routed networks
- Results returned in <30s for /24 network
- Works on Linux and Windows

### 2.3 POV (Point of View) Switcher

**Files to Modify:**
```
frontend/src/store/povStore.ts (new)
frontend/src/components/Layout.tsx
frontend/src/services/apiClient.ts
```

**UI Component (in Layout.tsx):**
```tsx
<POVSwitcher>
  <select>
    <option value="c2">🖥️ C2 Local (192.168.1.100)</option>
    {agents.filter(a => a.status === 'online').map(agent => (
      <option value={`agent:${agent.id}`}>
        🤖 {agent.hostname} ({agent.ip_address})
      </option>
    ))}
  </select>
</POVSwitcher>
```

**API Client Modification:**
```typescript
// Before
const response = await fetch('/api/v1/discovery');

// After (with POV awareness)
const pov = usePOVStore.getState().currentPOV;
const params = new URLSearchParams({ pov });
const response = await fetch(`/api/v1/discovery?${params}`);
```

**Tasks:**
- [ ] Create POV store (current POV, list of agents)
- [ ] Add POV selector to Layout header
- [ ] Modify API client to include POV in requests
- [ ] Add backend POV parameter handling
- [ ] Route commands through agent when POV = agent:*
- [ ] Show visual indicator of current POV (badge/color)

**Acceptance Criteria:**
- Can switch between C2 and agent POVs
- Current POV visible in UI (header, sidebar)
- API requests include POV context
- Commands execute on correct system (C2 or agent)

### 2.4 Discovery Page Integration

**Files to Modify:**
```
frontend/src/pages/Assets.tsx (or new Discovery.tsx)
backend/app/api/v1/endpoints/discovery.py
```

**Tasks:**
- [ ] Modify discovery endpoint to handle POV parameter
- [ ] When POV = agent, queue discovery command for agent
- [ ] Poll for results or use WebSocket for live updates
- [ ] Display discovered hosts in UI (same as local discovery)
- [ ] Add "Discovered via: C2/Agent" indicator
- [ ] Update topology view with agent-discovered hosts

**Acceptance Criteria:**
- Discovery from agent POV shows agent's network
- Results appear in Assets page
- Topology shows agent's network when agent POV selected
- Clear indication of which system performed discovery

---

## Phase 3: Advanced Modules (Week 5-6)

### 3.1 Port Scanning Module (Agent)

**Files to Create:**
```
agent/internal/modules/scanner.go
agent/pkg/nmap/wrapper.go (optional - nmap wrapper)
```

**Options:**
1. **Native Go Implementation**: Use `net.Dial()` for TCP, raw sockets for SYN scan
2. **Nmap Wrapper**: Execute nmap binary, parse XML output
3. **Hybrid**: Basic scanning native, advanced via nmap

**Recommendation:** Start with native implementation, add nmap wrapper later

**Tasks:**
- [ ] Implement TCP connect scan
- [ ] Implement SYN scan (requires raw sockets)
- [ ] Implement UDP scan
- [ ] Parse and return port states (open/closed/filtered)
- [ ] Add service banner grabbing
- [ ] Handle scan options (ports, timing, etc.)
- [ ] Write tests

**Acceptance Criteria:**
- Can scan common ports (<5s for top 100)
- Returns accurate port states
- Works without nmap dependency
- Optional nmap integration for advanced scans

### 3.2 Traffic Capture Module (Agent)

**Files to Create:**
```
agent/internal/modules/traffic.go
agent/pkg/pcap/capture.go
```

**Dependencies:**
- Linux: libpcap
- Windows: Npcap
- macOS: BPF

**Tasks:**
- [ ] Implement packet capture using gopacket
- [ ] Support BPF filters
- [ ] Stream packets to C2 (chunked)
- [ ] Support PCAP export
- [ ] Implement start/stop controls
- [ ] Add interface selection
- [ ] Handle permissions (raw socket access)

**Streaming Protocol:**
```json
{
  "type": "stream_data",
  "stream_id": "traffic-abc123",
  "chunk_id": 1,
  "data": "base64-encoded-packets",
  "is_final": false
}
```

**Acceptance Criteria:**
- Can capture packets on agent's interface
- Packets streamed to C2 in real-time
- Can apply BPF filters
- Works on Linux and Windows

### 3.3 Access Testing Module (Agent)

**Files to Create:**
```
agent/internal/modules/access.go
```

**Protocols to Support:**
- SSH (port 22)
- RDP (port 3389)
- VNC (port 5900)
- FTP (port 21)
- Telnet (port 23)
- HTTP/HTTPS (ports 80/443)

**Tasks:**
- [ ] Implement SSH connectivity test
- [ ] Implement RDP connectivity test
- [ ] Implement VNC connectivity test
- [ ] Implement FTP connectivity test
- [ ] Implement HTTP/HTTPS test with status codes
- [ ] Test with credentials (optional)
- [ ] Return detailed error messages

**Test Result Format:**
```json
{
  "protocol": "ssh",
  "host": "192.168.1.50",
  "port": 22,
  "reachable": true,
  "banner": "SSH-2.0-OpenSSH_8.2p1",
  "auth_methods": ["password", "publickey"],
  "latency_ms": 15
}
```

**Acceptance Criteria:**
- Can test all major protocols
- Returns detailed connection info
- Handles timeouts gracefully
- Works from agent POV

### 3.4 Traffic Page Integration

**Files to Modify:**
```
frontend/src/pages/Traffic.tsx
backend/app/api/v1/endpoints/traffic.py
```

**Tasks:**
- [ ] Add POV awareness to traffic page
- [ ] When POV = agent, show agent's interfaces
- [ ] Stream captured packets from agent
- [ ] Display packets in existing packet table
- [ ] Add "Captured by: C2/Agent" indicator
- [ ] Support packet crafting from agent (if time permits)

**Acceptance Criteria:**
- Traffic capture works from agent POV
- Packets displayed in UI same as local capture
- Can select agent's interface
- Clear indication of capture source

### 3.5 Access Page Integration

**Files to Modify:**
```
frontend/src/pages/Access.tsx
backend/app/api/v1/endpoints/access.py
```

**Tasks:**
- [ ] Add POV awareness to access page
- [ ] Access tests route through agent when POV = agent
- [ ] Display test results (same UI as local tests)
- [ ] Add "Tested from: C2/Agent" indicator
- [ ] Support quick connect via agent (if feasible)

**Acceptance Criteria:**
- Access tests execute from agent's perspective
- Results show what's reachable from agent
- UI indicates test origin
- Error handling for agent offline/unreachable

---

## Phase 4: Production Features (Week 7-8)

### 4.1 Agent Builder UI

**Files to Create:**
```
frontend/src/pages/AgentBuilder.tsx
frontend/src/components/AgentConfigForm.tsx
backend/app/api/v1/endpoints/agent_builder.py
backend/app/services/agent_builder_service.py
```

**Build Configuration Options:**
```
- Agent Type: Fat / Hybrid (recommended) / Thin Proxy
  • Fat: All modules built-in (50-100MB) - best for long-term, offline
  • Hybrid: Core + on-demand modules (10-50MB) - best for general use
  • Thin: Minimal relay (5-15MB) - best for short-term, high-bandwidth

- Language: Go / Python
- Target OS: Linux / Windows / macOS
- Architecture: amd64 / arm64 / 386

- Capabilities (varies by agent type):
  Fat Agent:
    ☑ All modules included (discovery, scan, traffic, access, exploit)
  
  Hybrid Agent:
    ☑ Network Discovery (built-in)
    ☑ Heartbeat & System Info (built-in)
    ☐ Port Scanning (on-demand)
    ☐ Traffic Capture (on-demand)
    ☐ Access Testing (on-demand)
    ☐ Packet Crafting (on-demand)
  
  Thin Proxy:
    ☑ SOCKS5 Proxy
    ☑ HTTP Proxy
    ☑ TCP/UDP Port Forwarding

- Advanced:
  ☐ Obfuscation (Garble for Go, PyArmor for Python)
  ☐ Persistence
    - Linux: systemd / cron
    - Windows: service / registry
  ☐ Custom C2 URL
  ☐ Custom check-in interval
  ☐ Check-in jitter (0-100%)
```

**Build Process:**
```
1. User selects agent type (Fat / Hybrid / Thin)
2. User configures based on selected type
3. Backend generates config file
4. Backend runs build script:
   
   Fat Agent (Go):
   - GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -tags "all_modules"
   - Includes all dependencies statically linked
   - Result: 80-100MB (50-60MB with UPX)
   
   Hybrid Agent (Go):
   - GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -tags "core_only"
   - Core modules only
   - Result: 10-15MB
   
   Thin Proxy (Go):
   - CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w"
   - Minimal dependencies
   - Result: 5-10MB
   
   Python (all types):
   - PyInstaller with type-specific requirements
   - Fat: 50-70MB, Hybrid: 25-50MB, Thin: 15-20MB

5. Apply obfuscation if selected (Garble/PyArmor)
6. Store built binary
7. Return download link
```

**Tasks:**
- [ ] Create agent type selection UI (radio buttons: Fat/Hybrid/Thin)
- [ ] Create agent configuration form (conditional based on type)
- [ ] Implement build service for all three agent types
- [ ] Handle build artifacts (store in volumes/)
- [ ] Implement download endpoint
- [ ] Add build status tracking (queued/building/ready/failed)
- [ ] Add build history/logs
- [ ] Support batch builds (multiple OS/arch)
- [ ] Add agent type templates (fat, hybrid, thin)

**Acceptance Criteria:**
- Can select and configure any of the three agent types
- Binary builds successfully for selected type
- Binary size matches expected range for type
- Built agent connects to C2
- Agent capabilities match selected type
- Obfuscation option works (if selected)

### 4.2 Module System (On-Demand Loading)

**Enhancement to Agent:**
```
agent/internal/core/module_loader.go
```

**Concept:**
```go
// Built-in modules (always available)
var builtInModules = map[string]Module{
    "heartbeat": &HeartbeatModule{},
    "discovery": &DiscoveryModule{},
}

// Downloaded modules (loaded on-demand)
var downloadedModules = map[string]Module{}

func LoadModule(name string) (Module, error) {
    // Check if built-in
    if mod, ok := builtInModules[name]; ok {
        return mod, nil
    }
    
    // Check if already downloaded
    if mod, ok := downloadedModules[name]; ok {
        return mod, nil
    }
    
    // Download from C2
    moduleData := downloadModuleFromC2(name)
    mod := loadModuleFromBytes(moduleData)
    downloadedModules[name] = mod
    return mod, nil
}
```

**Tasks:**
- [ ] Implement module loader
- [ ] Create module repository on C2
- [ ] Implement module download protocol
- [ ] Add module signature verification
- [ ] Implement module caching
- [ ] Add module version tracking

**Acceptance Criteria:**
- Agent can download modules on-demand
- Modules verified before execution
- Cached modules reused
- Module size < 5MB each

### 4.3 Obfuscation Pipeline

**Tools:**
- **Go**: [Garble](https://github.com/burrowers/garble) - symbol/string obfuscation
- **Python**: PyInstaller + UPX + custom encryption

**Build Scripts:**
```bash
# build/obfuscate-go.sh
garble -literals -tiny build \
  -ldflags="-s -w -X main.c2URL=$C2_URL" \
  -o agent-obfuscated \
  ./cmd/agent

# Optional: UPX compression
upx --best --lzma agent-obfuscated
```

**Tasks:**
- [ ] Integrate Garble into build pipeline
- [ ] Add string encryption for sensitive data (C2 URL, etc.)
- [ ] Strip debug symbols
- [ ] Implement custom packing (optional)
- [ ] Test against antivirus (VirusTotal scan)
- [ ] Document obfuscation options

**Acceptance Criteria:**
- Obfuscated binary different from non-obfuscated
- Strings (C2 URL) not visible in binary
- Binary still functions correctly
- Size increase acceptable (<2x)

### 4.4 Health Monitoring Dashboard

**Files to Create:**
```
frontend/src/components/AgentHealthDashboard.tsx
```

**Metrics to Display:**
```
- Agent Fleet Overview
  - Total Agents: 25
  - Online: 23
  - Offline: 2
  - Avg Response Time: 45ms

- Resource Usage (per agent)
  - CPU: [graph]
  - Memory: [graph]  
  - Network: [graph]

- Command Stats
  - Commands Sent: 150
  - Success Rate: 98%
  - Avg Execution Time: 2.3s

- Agent Activity Timeline
  - [visualization of agent check-ins/commands over time]
```

**Tasks:**
- [ ] Create health dashboard component
- [ ] Fetch heartbeat history from backend
- [ ] Implement real-time charts (Recharts)
- [ ] Add alert indicators (agent offline, high CPU, etc.)
- [ ] Add filtering (by agent, time range)

**Acceptance Criteria:**
- Dashboard shows fleet health at a glance
- Charts update in real-time
- Can drill down into individual agent metrics
- Alerts visible for issues

### 4.5 Security Hardening

**Backend Security:**
- [ ] Implement rate limiting on agent registration
- [ ] Add agent authentication challenges (prevent spoofing)
- [ ] Implement command authorization (RBAC)
- [ ] Add audit logging for all agent commands
- [ ] Encrypt sensitive command parameters
- [ ] Implement session token rotation

**Agent Security:**
- [ ] Add TLS certificate pinning
- [ ] Implement anti-debugging checks (optional)
- [ ] Add domain fronting support
- [ ] Implement jitter in check-in intervals
- [ ] Add self-destruct on detection (optional)

**Tasks:**
- [ ] Security code review
- [ ] Penetration testing
- [ ] Update security documentation
- [ ] Implement recommendations from review

---

## Phase 5: Polish & Testing (Week 9-10)

### 5.1 Cross-Platform Testing

**Test Matrix:**
| OS | Arch | Agent Type | Status |
|----|------|------------|--------|
| Ubuntu 22.04 | amd64 | Go | ☐ |
| Ubuntu 22.04 | arm64 | Go | ☐ |
| CentOS 8 | amd64 | Go | ☐ |
| Windows 10 | amd64 | Go | ☐ |
| Windows 11 | amd64 | Go | ☐ |
| macOS 12 | amd64 | Go | ☐ |
| macOS 13 | arm64 | Go | ☐ |

**Test Cases per Platform:**
- [ ] Agent builds successfully
- [ ] Agent runs without dependencies
- [ ] Agent registers with C2
- [ ] Heartbeat functional
- [ ] Network discovery works
- [ ] Port scanning works
- [ ] Traffic capture works (with elevated privileges)
- [ ] Access testing works

### 5.2 Performance Optimization

**Agent Optimizations:**
- [ ] Reduce memory allocations in hot paths
- [ ] Implement connection pooling
- [ ] Optimize JSON serialization
- [ ] Add compression for large payloads
- [ ] Profile and fix bottlenecks

**C2 Optimizations:**
- [ ] Add database query optimization (indexes)
- [ ] Implement result caching (Redis)
- [ ] Optimize WebSocket message handling
- [ ] Add pagination for large result sets
- [ ] Load test with 50+ concurrent agents

**Performance Targets:**
- Agent idle memory: < 50MB
- Agent idle CPU: < 1%
- Command delivery latency: < 100ms
- Result retrieval latency: < 200ms
- Support 100+ concurrent agents

### 5.3 Documentation

**User Documentation:**
- [ ] Agent Deployment Guide
  - How to build custom agent
  - Deployment methods (manual, automated)
  - Configuration options
- [ ] Operator Manual
  - Using POV switcher
  - Running commands through agents
  - Interpreting results
- [ ] Troubleshooting Guide
  - Agent won't connect
  - Commands timing out
  - Traffic capture issues

**Developer Documentation:**
- [ ] Agent Architecture (technical deep-dive)
- [ ] Adding New Modules (developer guide)
- [ ] API Reference (OpenAPI spec)
- [ ] Contributing Guide

**Tasks:**
- [ ] Write all documentation
- [ ] Add screenshots/diagrams
- [ ] Review for clarity
- [ ] Publish to docs/ directory

### 5.4 Integration Testing

**End-to-End Tests:**
```
Test: Full Agent Lifecycle
1. Build agent via UI
2. Download and deploy agent
3. Verify agent registration
4. Switch POV to agent
5. Run network discovery from agent
6. Run port scan from agent
7. Capture traffic from agent
8. Test access from agent
9. Verify all results correct
10. Deregister agent
```

**Automated Test Suite:**
- [ ] Agent registration test
- [ ] Command execution test
- [ ] Module loading test
- [ ] POV switching test
- [ ] WebSocket reconnection test
- [ ] Heartbeat test
- [ ] Result retrieval test

### 5.5 Deployment Automation

**Docker Integration:**
```yaml
# docker-compose.yml (add to existing)
services:
  agent-builder:
    build: ./agent-builder
    volumes:
      - ./volumes/agents:/builds
    environment:
      - GARBLE_ENABLED=true
```

**CI/CD:**
- [ ] Add agent build to GitHub Actions
- [ ] Publish agent binaries to releases
- [ ] Automated testing on PR
- [ ] Security scanning (gosec, bandit)

**Deployment Scripts:**
```bash
# scripts/deploy-agent.sh
#!/bin/bash
# Automated agent deployment via SSH

TARGET_HOST=$1
AGENT_PATH=$2

scp $AGENT_PATH $TARGET_HOST:/tmp/agent
ssh $TARGET_HOST "chmod +x /tmp/agent && /tmp/agent --config /tmp/agent.yaml"
```

---

## Testing Checklist

### Unit Tests
- [ ] Agent models (Python)
- [ ] Agent services (Python)
- [ ] Agent endpoints (Python)
- [ ] WebSocket communication (Python)
- [ ] Agent core (Go)
- [ ] Agent modules (Go)
- [ ] Agent communication (Go)

### Integration Tests
- [ ] Agent registration flow
- [ ] Command execution flow
- [ ] Result retrieval flow
- [ ] Heartbeat mechanism
- [ ] Module loading
- [ ] POV switching

### UI Tests
- [ ] Agents page loads
- [ ] Agent list displays
- [ ] Agent details shows
- [ ] POV switcher works
- [ ] Commands can be sent
- [ ] Results display correctly

### Security Tests
- [ ] TLS configuration
- [ ] Authentication bypass attempts
- [ ] SQL injection
- [ ] Command injection
- [ ] XSS in agent data

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Security review complete
- [ ] Performance benchmarks met
- [ ] Cross-platform testing complete

### Deployment Steps
1. [ ] Database migration
2. [ ] Deploy backend updates
3. [ ] Deploy frontend updates
4. [ ] Verify agent registration endpoint
5. [ ] Build and test sample agents
6. [ ] Update documentation
7. [ ] Announce feature

### Post-Deployment
- [ ] Monitor for errors
- [ ] Collect user feedback
- [ ] Fix critical bugs (if any)
- [ ] Plan next iteration

---

## Success Metrics

### Functional
- [ ] 100% of NOP features work through agents
- [ ] Agent deployment in < 5 minutes
- [ ] Support 50+ concurrent agents
- [ ] Sub-second command delivery

### Performance
- [ ] Agent binary < 15MB
- [ ] Agent memory < 100MB
- [ ] Network overhead < 1KB/s idle
- [ ] Command latency < 100ms

### Security
- [ ] All communications encrypted
- [ ] No credentials on agent
- [ ] Full audit logging
- [ ] Obfuscation functional

---

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Agent detection by AV | High | Medium | Obfuscation, legitimate-looking traffic |
| Network latency | Medium | High | Async operations, result caching |
| Platform compatibility | High | Medium | Extensive testing, fallback options |
| Security vulnerabilities | Critical | Low | Code review, penetration testing |
| Scalability issues | Medium | Low | Load testing, optimization |

---

## Next Steps

1. **Review this roadmap** - Ensure alignment with requirements
2. **Begin Phase 1** - Database schema and registration API
3. **Set up development environment** - Go toolchain, test C2 instance
4. **Create project board** - Track progress on GitHub Projects
5. **Schedule check-ins** - Weekly progress reviews

---

**Document Version History:**
- v1.0 (2026-01-03): Initial roadmap based on architecture design
