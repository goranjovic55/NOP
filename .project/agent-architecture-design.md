# Agent Functionality Architecture Design

**Date:** 2026-01-03  
**Status:** Design Phase  
**Version:** 1.0

## Executive Summary

This document proposes a comprehensive architecture for implementing agent functionality in NOP (Network Observatory Platform), enabling it to function as a Command and Control (C2) system with distributed proxy agents. The design supports remote network reconnaissance and security testing through deployed agents while maintaining the full feature set of NOP.

## 1. Problem Statement

### Current State
- NOP runs on System X as a standalone network monitoring platform
- All network operations (scans, traffic analysis, access testing) originate from System X
- Limited to monitoring/testing only the network segment where NOP is deployed

### Requirements
- Deploy lightweight agents on remote systems (System A, B, C, etc.)
- Agents connect back to NOP C2 on System X
- When operating through an agent, all NOP functionalities should work:
  - **Network Discovery & Scans**: Show agent's network, not C2 network
  - **Host Info**: Display agent's system information
  - **Access Testing**: Test assets accessible from agent
  - **Asset Discovery**: Discover and scan assets from agent's perspective
  - **Traffic Analysis**: Capture/analyze traffic on agent's network interface
  - **Packet Operations**: Sniffing, pinging, storming, crafting from agent system

### Design Questions
1. Should agents have full functionality embedded (fat agent)?
2. Should agents relay traffic/commands (thin agent/proxy)?
3. How to handle command execution and data transfer?
4. How to maintain session state and context switching?

## 2. Architecture Options Analysis

### Option A: Full Capability Agent (Fat Agent)

**Description**: Agent contains all NOP functionality modules (nmap, scapy, network libraries). Commands are sent, agent executes locally, returns results.

**Pros:**
- ✅ Lower network bandwidth usage (only commands in, results out)
- ✅ Better operational security (less network traffic patterns)
- ✅ Agent can operate with intermittent connectivity
- ✅ Faster execution (no round-trip latency per operation)
- ✅ Can cache results and sync later

**Cons:**
- ❌ Larger agent binary size (50-100MB+)
- ❌ More dependencies to install/compile
- ❌ Harder to maintain (updates require agent redeployment)
- ❌ Different behavior across platforms (library availability)
- ❌ Higher memory footprint on target system

**Best For:**
- Long-term deployments
- Low-bandwidth connections
- Stealth operations
- Scenarios requiring offline capability

### Option B: Thin Agent with Tunneling (Proxy/Relay)

**Description**: Agent acts as SOCKS/HTTP proxy or network tunnel. NOP tools run on C2, traffic routes through agent.

**Pros:**
- ✅ Minimal agent size (5-15MB)
- ✅ Easier to update (C2-side changes only)
- ✅ Consistent behavior (tools run on known environment)
- ✅ Simpler agent code (just network relay)
- ✅ Lower memory footprint on target

**Cons:**
- ❌ Higher network bandwidth (all scan traffic flows through tunnel)
- ❌ More detectable (continuous network activity)
- ❌ Requires persistent connection
- ❌ Latency affects operation speed
- ❌ Complex network setup (NAT, firewall issues)

**Best For:**
- Short-term engagements
- High-bandwidth connections
- Rapid deployment scenarios
- Testing across multiple agents sequentially

### Option C: Hybrid Architecture (Recommended)

**Description**: Combine both approaches - lightweight core with plugin system. Agent has basic capabilities built-in, can download/execute additional modules on-demand.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                         NOP C2 (System X)                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Web UI (Agent Mode Toggle)                            │ │
│  │  • Network View    • Host Info    • Access Testing     │ │
│  │  • Traffic Analysis • Scans       • Asset Discovery    │ │
│  └─────────────┬──────────────────────────────────────────┘ │
│                │                                              │
│  ┌─────────────▼──────────────────────────────────────────┐ │
│  │  Agent Controller Service                              │ │
│  │  • Agent Registration    • Session Management          │ │
│  │  • Command Queue        • Result Aggregation           │ │
│  │  • Module Distribution  • Health Monitoring            │ │
│  └─────────────┬──────────────────────────────────────────┘ │
└────────────────┼──────────────────────────────────────────────┘
                 │ WebSocket/gRPC (Encrypted)
                 │
    ┌────────────▼─────────────┬──────────────┬──────────────┐
    │                          │              │              │
┌───▼─────────────────┐ ┌─────▼────────┐ ┌──▼───────────┐ │
│  Agent (System A)   │ │Agent (Sys B) │ │Agent (Sys C) │ │
│  ┌───────────────┐  │ │              │ │              │ │
│  │  Core Module  │  │ │              │ │              │ │
│  │ • Check-in    │  │ │              │ │              │ │
│  │ • Heartbeat   │  │ │              │ │              │ │
│  │ • Exec Queue  │  │ │              │ │              │ │
│  └───────┬───────┘  │ │              │ │              │ │
│  ┌───────▼───────┐  │ │              │ │              │ │
│  │ Capability    │  │ │              │ │              │ │
│  │ Modules       │  │ │              │ │              │ │
│  │ ┌───────────┐ │  │ │              │ │              │ │
│  │ │Discovery  │ │  │ │              │ │              │ │
│  │ │(Built-in) │ │  │ │              │ │              │ │
│  │ └───────────┘ │  │ │              │ │              │ │
│  │ ┌───────────┐ │  │ │              │ │              │ │
│  │ │Network    │ │  │ │              │ │              │ │
│  │ │Scan       │ │  │ │              │ │              │ │
│  │ │(On-demand)│ │  │ │              │ │              │ │
│  │ └───────────┘ │  │ │              │ │              │ │
│  │ ┌───────────┐ │  │ │              │ │              │ │
│  │ │Traffic    │ │  │ │              │ │              │ │
│  │ │Capture    │ │  │ │              │ │              │ │
│  │ │(On-demand)│ │  │ │              │ │              │ │
│  │ └───────────┘ │  │ │              │ │              │ │
│  └───────────────┘  │ │              │ │              │ │
└─────────────────────┘ └──────────────┘ └──────────────┘
```

**Built-in Core (Always Present):**
- Agent check-in / registration
- Heartbeat / health reporting
- Command queue processor
- Basic network discovery (ARP, ICMP ping)
- System information collection
- Secure communication (TLS)

**On-Demand Modules (Downloaded when needed):**
- Port scanning (nmap wrapper)
- Traffic capture (scapy/pcap)
- Protocol testing (SSH, RDP, etc.)
- Packet crafting
- Traffic storming
- Exploit execution

**Benefits:**
- ✅ Small initial deployment (<10MB)
- ✅ Flexible - can scale up capabilities as needed
- ✅ Updates only require module refresh
- ✅ Bandwidth-efficient for common tasks
- ✅ Can cache modules for offline use
- ✅ Graceful degradation if modules unavailable

## 3. Communication Protocol Design

### 3.1 Connection Method: WebSocket over TLS

**Rationale:**
- Bidirectional communication for real-time updates
- Built-in reconnection logic
- Firewall-friendly (standard HTTPS port)
- Efficient for streaming data (traffic capture, logs)

**Connection Flow:**
```
1. Agent → C2: HTTPS POST /api/v1/agents/register
   Payload: { agent_id, hostname, os, capabilities[], network_info }
   Response: { session_token, c2_config, modules[] }

2. Agent → C2: WebSocket wss://c2.example.com/ws/agent/{agent_id}
   Headers: { Authorization: Bearer {session_token} }

3. C2 sends: { type: "heartbeat_interval", interval: 30 }
   Agent responds every 30s with health data

4. Ongoing communication via JSON messages
```

### 3.2 Message Protocol

**Message Types:**

```typescript
// Command from C2 to Agent
interface Command {
  id: string;                    // Unique command ID
  type: CommandType;             // discovery, scan, traffic, access, etc.
  module: string;                // Module to execute
  params: Record<string, any>;   // Command parameters
  timeout: number;               // Max execution time (seconds)
  priority: number;              // Execution priority (1-10)
}

// Result from Agent to C2
interface Result {
  command_id: string;
  status: "success" | "error" | "partial";
  data: any;                     // Result data
  error?: string;                // Error message if failed
  timestamp: number;
  execution_time: number;        // Milliseconds
}

// Heartbeat from Agent
interface Heartbeat {
  agent_id: string;
  timestamp: number;
  cpu_usage: number;
  memory_usage: number;
  network_interfaces: NetworkInterface[];
  active_tasks: number;
}

// Stream data (for traffic capture, logs)
interface StreamData {
  stream_id: string;
  chunk_id: number;
  data: string;                  // Base64 encoded
  is_final: boolean;
}
```

**Command Types:**
- `discovery` - Network discovery (ARP, ping sweep)
- `scan_ports` - Port scanning
- `scan_services` - Service version detection
- `traffic_capture` - Packet capture
- `traffic_craft` - Packet crafting
- `traffic_storm` - Traffic generation
- `access_test` - Protocol access testing (SSH, RDP, etc.)
- `host_info` - System information
- `execute_exploit` - Run exploit module

### 3.3 Security Considerations

**Authentication:**
- Initial registration with pre-shared key or challenge-response
- Session token (JWT) for ongoing communication
- Token rotation every 24 hours

**Encryption:**
- TLS 1.3 for transport encryption
- Optional payload encryption for sensitive commands
- Certificate pinning to prevent MitM

**Authorization:**
- Role-based capabilities per agent
- Command whitelisting/blacklisting
- Rate limiting per agent

## 4. Agent Implementation Details

### 4.1 Core Agent Structure

**Both Go and Python implementations are supported. Choose based on your requirements:**

#### Go Implementation

**Benefits:**
- Single binary, no dependencies
- Cross-platform (Linux, Windows, macOS)
- Small binary size with proper compilation flags (~10MB)
- Good concurrency support (goroutines)
- Easy obfuscation (garble)

**Directory Structure:**
```
agent/
├── cmd/
│   └── agent/
│       └── main.go           # Entry point
├── internal/
│   ├── core/
│   │   ├── agent.go          # Main agent logic
│   │   ├── config.go         # Configuration
│   │   ├── connection.go     # WebSocket handling
│   │   └── heartbeat.go      # Health monitoring
│   ├── modules/
│   │   ├── discovery.go      # Network discovery
│   │   ├── scanner.go        # Port scanning
│   │   ├── traffic.go        # Traffic capture
│   │   ├── access.go         # Access testing
│   │   └── executor.go       # Command execution
│   ├── comm/
│   │   ├── protocol.go       # Message protocol
│   │   └── crypto.go         # Encryption helpers
│   └── utils/
│       ├── network.go        # Network utilities
│       └── system.go         # System info
├── pkg/
│   └── api/                  # Shared API types
├── build/
│   ├── build.sh             # Build script
│   └── obfuscate.sh         # Obfuscation script
└── configs/
    └── agent.yaml           # Default config
```

#### Python Implementation

**Benefits:**
- Rapid development and prototyping
- Leverages existing NOP backend codebase
- Rich ecosystem (scapy, nmap, psutil, etc.)
- Easier debugging and iteration

**Directory Structure:**
```
agent/
├── main.py                  # Entry point
├── core/
│   ├── agent.py             # Main agent logic
│   ├── config.py            # Configuration
│   ├── connection.py        # WebSocket handling
│   └── heartbeat.py         # Health monitoring
├── modules/
│   ├── discovery.py         # Network discovery
│   ├── scanner.py           # Port scanning
│   ├── traffic.py           # Traffic capture
│   ├── access.py            # Access testing
│   └── executor.py          # Command execution
├── comm/
│   ├── protocol.py          # Message protocol
│   └── crypto.py            # Encryption helpers
├── utils/
│   ├── network.py           # Network utilities
│   └── system.py            # System info
├── requirements.txt         # Dependencies
├── build/
│   └── build.sh            # PyInstaller build script
└── config/
    └── agent.yaml          # Default config
```

**Deployment Options:**
- **PyInstaller**: Bundle as single executable (~25-50MB)
- **Raw Python**: Deploy as script (requires Python runtime on target)
- **Docker**: Containerized deployment

### 4.2 Module System

**Both Go and Python implementations use the same module interface:**

**Go Example:**
```go
type Module interface {
    Name() string
    Execute(params map[string]interface{}) (interface{}, error)
    Requirements() []string  // System requirements
    Capabilities() []string  // What this module can do
}

// Discovery Module
type DiscoveryModule struct {}

func (m *DiscoveryModule) Execute(params map[string]interface{}) (interface{}, error) {
    subnet := params["subnet"].(string)
    method := params["method"].(string) // "arp", "ping", "both"
    
    var hosts []Host
    switch method {
    case "arp":
        hosts = m.arpScan(subnet)
    case "ping":
        hosts = m.pingScan(subnet)
    case "both":
        hosts = m.combinedScan(subnet)
    }
    
    return hosts, nil
}
```

**Python Example:**
```python
from abc import ABC, abstractmethod
from typing import Dict, Any, List

class Module(ABC):
    @abstractmethod
    def name(self) -> str:
        pass
    
    @abstractmethod
    def execute(self, params: Dict[str, Any]) -> Any:
        pass
    
    @abstractmethod
    def requirements(self) -> List[str]:
        pass
    
    @abstractmethod
    def capabilities(self) -> List[str]:
        pass

# Discovery Module
class DiscoveryModule(Module):
    def name(self) -> str:
        return "discovery"
    
    def execute(self, params: Dict[str, Any]) -> List[Dict]:
        subnet = params["subnet"]
        method = params["method"]  # "arp", "ping", "both"
        
        if method == "arp":
            return self.arp_scan(subnet)
        elif method == "ping":
            return self.ping_scan(subnet)
        elif method == "both":
            return self.combined_scan(subnet)
    
    def requirements(self) -> List[str]:
        return ["scapy", "netifaces"]
    
    def capabilities(self) -> List[str]:
        return ["network_discovery", "arp_scan", "ping_sweep"]
```

**On-Demand Modules:**
- Downloaded as separate binaries or scripts
- Verified with signature before execution
- Cached in agent's module directory
- Version-controlled

### 4.3 Platform-Specific Adaptations

**Linux:**
- Raw socket access for packet crafting
- libpcap for traffic capture
- Direct interface enumeration

**Windows:**
- Npcap/WinPcap for packet operations
- WMI for system information
- PowerShell integration for certain tasks

**macOS:**
- Berkeley Packet Filter (BPF) for capture
- Network Extensions framework

## 5. C2 Backend Implementation

### 5.1 New Backend Services

**AgentService** (`backend/app/services/agent_service.py`):
```python
class AgentService:
    def register_agent(self, agent_info: AgentRegister) -> AgentSession:
        """Register new agent and create session"""
        
    def get_agents(self, filters: AgentFilters) -> List[Agent]:
        """List registered agents"""
        
    def send_command(self, agent_id: str, command: Command) -> str:
        """Queue command for agent execution"""
        
    def get_results(self, command_id: str) -> CommandResult:
        """Retrieve command execution results"""
        
    def stream_data(self, stream_id: str) -> AsyncGenerator:
        """Stream real-time data (traffic, logs)"""
```

**AgentWebSocket** (`backend/app/api/websockets/agent.py`):
```python
@router.websocket("/ws/agent/{agent_id}")
async def agent_websocket(websocket: WebSocket, agent_id: str):
    # Authenticate agent
    # Handle bidirectional communication
    # Process commands and results
    # Manage heartbeat
```

### 5.2 Database Schema

**Agents Table:**
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(64) UNIQUE NOT NULL,  -- Agent-generated ID
    hostname VARCHAR(255),
    os_type VARCHAR(50),                    -- linux, windows, macos
    os_version VARCHAR(100),
    architecture VARCHAR(20),               -- amd64, arm64, etc.
    ip_address INET,
    external_ip INET,
    network_interfaces JSONB,               -- Array of interface info
    capabilities JSONB,                     -- Array of capability strings
    modules JSONB,                          -- Installed modules
    status VARCHAR(20),                     -- online, offline, error
    last_seen TIMESTAMP,
    registered_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB                          -- Custom fields
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_last_seen ON agents(last_seen);
```

**Agent Commands Table:**
```sql
CREATE TABLE agent_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    command_type VARCHAR(50),
    module VARCHAR(100),
    params JSONB,
    status VARCHAR(20),                     -- queued, sent, executing, completed, failed
    priority INTEGER DEFAULT 5,
    timeout INTEGER DEFAULT 300,
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB,
    error TEXT
);

CREATE INDEX idx_commands_agent ON agent_commands(agent_id);
CREATE INDEX idx_commands_status ON agent_commands(status);
```

**Agent Sessions Table:**
```sql
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    session_token VARCHAR(512),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    last_activity TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

**Agent Heartbeats Table** (Time-series, can use partitioning):
```sql
CREATE TABLE agent_heartbeats (
    agent_id UUID REFERENCES agents(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    cpu_usage FLOAT,
    memory_usage FLOAT,
    disk_usage FLOAT,
    active_tasks INTEGER,
    network_info JSONB
);

CREATE INDEX idx_heartbeats_agent_time ON agent_heartbeats(agent_id, timestamp DESC);
```

## 6. Frontend UI Design

### 6.1 Agent Management Page

**Route:** `/agents`

**Components:**
```
AgentsPage
├── AgentList (sidebar)
│   ├── Agent cards with status indicators
│   ├── Filter (online/offline/all)
│   └── Sort (name, last seen, OS)
├── AgentDetails (main panel)
│   ├── Agent Info
│   │   ├── System details
│   │   ├── Network interfaces
│   │   └── Capabilities
│   ├── Quick Actions
│   │   ├── Network Discovery
│   │   ├── Port Scan
│   │   ├── Traffic Capture
│   │   └── Access Test
│   └── Activity Log
└── AgentBuilder (modal)
    ├── Agent Configuration
    │   ├── Type (Python/Go)
    │   ├── Capabilities selection
    │   └── Obfuscation options
    └── Download/Deploy
```

### 6.2 Point-of-View (POV) Switcher

**Global UI Component** - Add to existing pages:

```typescript
// Component in Layout.tsx
<POVSwitcher>
  <option value="c2">C2 Local (System X)</option>
  <option value="agent:abc123">Agent: server01 (192.168.1.10)</option>
  <option value="agent:def456">Agent: workstation (10.0.0.15)</option>
</POVSwitcher>
```

**Behavior:**
- When POV = "c2": Current behavior (local operations)
- When POV = "agent:abc123": All operations route through agent
  - Network scans show agent's network
  - Traffic capture uses agent's interface
  - Access tests originate from agent
  - Host info shows agent's system

**Implementation:**
```typescript
// Global state (Zustand)
interface POVStore {
  currentPOV: string;  // "c2" or "agent:{id}"
  agents: Agent[];
  setCurrentPOV: (pov: string) => void;
}

// API wrapper
async function executeCommand(command: Command) {
  const pov = usePOVStore.getState().currentPOV;
  
  if (pov === "c2") {
    // Direct API call
    return await api.execute(command);
  } else {
    // Route through agent
    const agentId = pov.replace("agent:", "");
    return await api.sendAgentCommand(agentId, command);
  }
}
```

### 6.3 Page Adaptations

**Discovery Page:**
- Add POV selector at top
- When agent selected: "Discovering network from agent: {name}"
- Results show agent's network topology

**Traffic Page:**
- Interface selector shows agent's interfaces
- Capture streams from agent
- Packet crafting sends from agent

**Access Page:**
- Quick connect tests from agent's perspective
- Assets show what's accessible from agent

**Host Page:**
- Shows agent system info when agent selected
- Terminal connects to agent (WebSocket relay)

## 7. Security & Operational Considerations

### 7.1 Agent Security

**Obfuscation:**
- Use Garble for Go agents (symbol obfuscation)
- Strip debug symbols
- Encrypt strings

**Persistence:**
- Optional - user choice during build
- Methods: systemd service, cron, registry (Windows)
- Auto-update capability

**Anti-Detection:**
- Configurable check-in jitter
- Domain fronting support
- Custom User-Agent strings
- Sleep/awake cycles

### 7.2 Network Security

**C2 Communications:**
- TLS mutual authentication (optional)
- Certificate pinning
- Domain fronting / redirectors support
- Traffic shaping to mimic normal HTTPS

**Data Protection:**
- Command payload encryption
- Result encryption for sensitive data
- Secure credential passing

### 7.3 Operational Security

**Logging:**
- All agent commands logged
- Audit trail for compliance
- Correlation with user actions

**Access Control:**
- User permissions for agent control
- Read-only vs execute permissions
- Command approval workflow (optional)

## 8. Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Database schema and models
- [ ] Agent registration API
- [ ] WebSocket communication
- [ ] Basic agent (Go) with heartbeat
- [ ] Agent management UI (list, register)

### Phase 2: Basic Capabilities (Week 3-4)
- [ ] Network discovery module
- [ ] Command queue system
- [ ] Result storage and retrieval
- [ ] POV switcher in UI
- [ ] Discovery page integration

### Phase 3: Advanced Modules (Week 5-6)
- [ ] Port scanning module
- [ ] Traffic capture module
- [ ] Access testing module
- [ ] Traffic page integration
- [ ] Access page integration

### Phase 4: Production Features (Week 7-8)
- [ ] Agent builder UI
- [ ] Module system (on-demand loading)
- [ ] Obfuscation pipeline
- [ ] Health monitoring dashboard
- [ ] Security hardening

### Phase 5: Polish & Testing (Week 9-10)
- [ ] Cross-platform testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] User guides
- [ ] Deployment automation

## 9. API Endpoints Specification

### Agent Management

```
POST   /api/v1/agents/register          # Register new agent
GET    /api/v1/agents                   # List all agents
GET    /api/v1/agents/{id}              # Get agent details
PATCH  /api/v1/agents/{id}              # Update agent info
DELETE /api/v1/agents/{id}              # Deregister agent

GET    /api/v1/agents/{id}/heartbeat    # Get heartbeat history
GET    /api/v1/agents/{id}/capabilities # Get capabilities
POST   /api/v1/agents/{id}/modules      # Install module
```

### Command Execution

```
POST   /api/v1/agents/{id}/commands            # Send command
GET    /api/v1/agents/{id}/commands            # List commands
GET    /api/v1/agents/{id}/commands/{cmd_id}   # Get command result
DELETE /api/v1/agents/{id}/commands/{cmd_id}   # Cancel command
```

### Agent Builder

```
POST   /api/v1/agents/build          # Build custom agent
GET    /api/v1/agents/build/{id}     # Get build status
GET    /api/v1/agents/download/{id}  # Download built agent
```

### POV Operations (Transparent routing)

```
# Existing endpoints work the same, but include agent context
GET    /api/v1/discovery?pov=agent:abc123
POST   /api/v1/scans?pov=agent:abc123
GET    /api/v1/traffic?pov=agent:abc123
```

## 10. Deployment Strategy

### C2 Deployment
1. Update NOP via docker-compose (new agent service)
2. Database migrations run automatically
3. Agent management UI available at `/agents`

### Agent Deployment

**Option A: Manual Deploy**
1. Build agent via UI
2. Download binary
3. SCP/RDP to target system
4. Execute with config

**Option B: Automated Deploy**
1. Use existing access (SSH, RDP) from NOP
2. Upload agent binary
3. Install and start automatically
4. Verify check-in

**Option C: Dropbox Deploy**
1. Generate agent with dropbox config
2. Host on neutral server
3. Victim fetches and executes
4. Agent connects back to C2

## 11. Alternative Architectures Considered

### gRPC vs WebSocket
- **Chosen**: WebSocket
- **Reason**: Better firewall traversal, built-in browser support for future web-based agents

### Custom Binary Protocol vs JSON
- **Chosen**: JSON
- **Reason**: Easier debugging, extensibility, interoperability

### Agent Languages: Go and Python
- **Both Supported**: Go and Python are both fully supported for agent development
- **Go**: Small binaries (~10MB), easy cross-compilation, single file deployment
- **Python**: Rapid development, existing NOP codebase reuse, rich ecosystem
- **Choice depends on**: Deployment requirements (size, dependencies) vs development speed

### Direct Database Access vs API
- **Chosen**: API-only
- **Reason**: Security, abstraction, easier to add authentication/authorization

## 12. Success Metrics

**Functional:**
- [ ] Agent deployment in <5 minutes
- [ ] All NOP features work through agent
- [ ] Sub-second command delivery
- [ ] Support for 50+ concurrent agents

**Performance:**
- [ ] Agent binary <15MB (Go), <25MB (Python with deps)
- [ ] Memory usage <100MB per agent
- [ ] Network overhead <1KB/s per idle agent
- [ ] Command execution latency <100ms

**Security:**
- [ ] All communications encrypted (TLS)
- [ ] No credentials stored on agent
- [ ] Audit logging for all commands
- [ ] Agent obfuscation passes basic AV

## 13. Documentation Requirements

- [ ] Agent Architecture Guide (this document)
- [ ] Agent Development Guide (for contributors)
- [ ] Agent Deployment Guide (for operators)
- [ ] API Reference (OpenAPI spec)
- [ ] Security Best Practices
- [ ] Troubleshooting Guide

## 14. Testing Strategy

**Unit Tests:**
- Agent modules (discovery, scan, traffic)
- Communication protocol
- Encryption/decryption

**Integration Tests:**
- Agent registration flow
- Command execution end-to-end
- Result retrieval
- Heartbeat mechanism

**Platform Tests:**
- Linux (Ubuntu, CentOS, Alpine)
- Windows (10, 11, Server 2019)
- macOS (Intel, Apple Silicon)

**Load Tests:**
- 50 concurrent agents
- 1000 commands/minute
- Traffic streaming bandwidth

**Security Tests:**
- TLS configuration
- Authentication bypass attempts
- Injection attacks
- Agent detection evasion

## 15. Recommendations

### Immediate Actions
1. **Prototype Phase 1** - Validate WebSocket communication and basic agent
2. **User Testing** - Get feedback on POV switcher UX
3. **Security Review** - Third-party review of communication protocol

### Short-term (Next 3 months)
1. Implement Phases 1-3 (core + basic modules)
2. Test on 3-5 internal agents
3. Gather operational feedback

### Long-term (6+ months)
1. Add advanced modules (exploit execution, persistence)
2. Multi-tenant support (different operators, different agent fleets)
3. Agent clustering (agents communicate peer-to-peer)
4. Offline tasking (agents cache commands when C2 unreachable)

## 16. Conclusion

The **Hybrid Architecture (Option C)** with a lightweight core and on-demand modules provides the best balance of:
- Deployment speed (small binary)
- Operational flexibility (scale capabilities as needed)
- Maintenance burden (update modules without redeploying agents)
- Security (minimal footprint, encrypted communications)

This design enables NOP to function as a full-featured C2 while maintaining its intuitive UI and comprehensive network operations toolkit. The POV switcher allows seamless context switching between local (C2) and remote (agent) perspectives.

**Next Steps:**
1. Review and approve this design
2. Begin Phase 1 implementation
3. Set up development/testing environment
4. Create detailed technical specifications for each module

---

**Document Version History:**
- v1.0 (2026-01-03): Initial design proposal
