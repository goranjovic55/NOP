# Agent & Command-and-Control (C2) System

**Deploy and manage headless NOP agents for remote network monitoring**

---

## Overview

The Agent/C2 system enables deployment of lightweight agents on remote networks to collect data from isolated subnets. Agents connect back to the main NOP instance via WebSocket and support Point of View (POV) switching for seamless multi-network monitoring.

### Key Features
- ✅ Deploy Python, C, or ASM agents to remote networks
- ✅ WebSocket-based C2 with auto-reconnection
- ✅ POV switching to view data from agent perspectives
- ✅ Token-based authentication and capability control
- ✅ Real-time status monitoring with heartbeats
- ✅ Code generation with embedded configurations

---

## Quick Start

### 1. Create Agent
1. Navigate to **Agents** page
2. Click **+ CREATE AGENT**
3. Configure:
   - **Name**: `Remote-Office-Alpha`
   - **Type**: Python
   - **Connection URL**: Use auto-detected or custom
   - **Capabilities**: Select Assets, Traffic, Scans
4. Click **CREATE AGENT**

### 2. Deploy Agent
1. Click **DOWNLOAD** on agent card
2. Transfer `nop_agent_*.py` to remote machine
3. Run: `python3 nop_agent_*.py`
4. Agent status changes to **ONLINE** (green)

### 3. Switch POV
1. Click **SWITCH POV** on agent card
2. Navigate to **Dashboard** or **Assets**
3. View data from agent's subnet
4. Click **EXIT POV** to return

---

## Agent Types

### Python Agent
- **Runtime**: Python 3.7+
- **Dependencies**: `websockets`, `aiohttp`
- **Size**: ~5KB script
- **Features**: Auto-reconnect, heartbeat, capability-based commands
- **Use Case**: Quick deployment, cross-platform

### C Binary Agent
- **Runtime**: Compiled binary
- **Dependencies**: `libwebsockets`, `json-c`
- **Size**: ~50KB executable
- **Features**: Low overhead, native performance
- **Use Case**: Production environments, resource-constrained

### ASM Binary Agent
- **Runtime**: Compiled binary (x86_64)
- **Dependencies**: None (pure syscalls)
- **Size**: ~10KB executable
- **Features**: Ultra-lightweight, minimal footprint
- **Use Case**: Stealth deployment, embedded systems

---

## UI Components

### Agent Card
Displays agent status and controls:

**Status Indicators**:
- 🟢 Green = Online
- ⚪ Gray = Offline
- 🟡 Yellow = Disconnected
- 🔴 Red = Error

**Agent Types**:
- 🐍 Python
- ⚙️ C
- ⚡ ASM

**Actions**:
- **Download**: Get agent code
- **Switch POV**: Activate agent perspective
- **Delete**: Remove agent

### POV Banner
Purple banner displayed when agent POV is active:
- 🟢 **AGENT POV ACTIVE: [Name]**
- Shows which agent's perspective is active
- **EXIT POV** button to return to normal view

### Connection URL Editor
Separate protocol/host/port inputs with auto-detection:
- **Protocol**: `ws` or `wss` dropdown
- **Host**: IP/hostname input (auto-detects Codespaces)
- **Port**: Port number input
- **Live Preview**: Shows final URL: `ws://host:port/api/v1/agents/{agent_id}/connect`

---

## WebSocket Protocol

### Agent → Server Messages

**Registration**:
```json
{
  "type": "register",
  "agent_id": "uuid",
  "agent_name": "Branch-Office",
  "capabilities": {"assets": true, "traffic": true, "scans": true},
  "system_info": {"hostname": "remote", "platform": "Linux", "version": "5.15"}
}
```

**Heartbeat** (every 30s):
```json
{
  "type": "heartbeat",
  "agent_id": "uuid",
  "timestamp": "2026-01-04T14:00:00Z"
}
```

**Data Stream**:
```json
{
  "type": "assets_discovered",
  "agent_id": "uuid",
  "assets": [
    {"ip": "192.168.50.1", "mac": "aa:bb:cc:dd:ee:ff", "hostname": "router"}
  ],
  "timestamp": "2026-01-04T14:00:00Z"
}
```

### Server → Agent Commands

**Ping**:
```json
{"type": "ping"}
```

**Execute Command**:
```json
{
  "type": "command",
  "command": "discover_assets"
}
```

```json
{
  "type": "command",
  "command": "run_scan",
  "target": "192.168.50.0/24"
}
```

---

## API Endpoints

### REST API

- `GET /api/v1/agents/` - List all agents
- `POST /api/v1/agents/` - Create new agent
- `GET /api/v1/agents/{id}` - Get agent details
- `PUT /api/v1/agents/{id}` - Update agent
- `DELETE /api/v1/agents/{id}` - Delete agent
- `POST /api/v1/agents/{id}/generate` - Generate agent code
- `GET /api/v1/agents/{id}/status` - Get connection status

### WebSocket

- `WS /api/v1/agents/{id}/connect` - Agent connection endpoint
  - Validates auth token
  - Updates agent status (online/offline)
  - Handles bidirectional messaging

---

## Security

### Authentication
- **32-byte auth token** per agent (secure random)
- Token embedded in generated code
- Token validation on WebSocket connect
- Invalid tokens rejected with code 1008

### Capability Control
- Agents limited to configured capabilities
- Unauthorized commands logged and rejected
- Capabilities updatable via API

### Connection Security
- TLS support (`wss://` URLs)
- Configurable connection endpoints
- Agent status tracking (online/offline/error)

### Audit Trail
- All agent actions logged
- Last seen timestamps
- Connection lifecycle events

---

## POV (Point of View) Switching

### Concept
Switch your NOP view to see data from an agent's perspective

### What Changes
When POV is active:
- **Dashboard**: Statistics from agent's subnet
- **Assets**: Devices discovered by agent
- **Traffic**: Network flows from agent
- **Scans**: Vulnerability scans from agent location
- **Topology**: Network map from agent perspective

### Use Case Example

**Scenario**: Monitor remote branch office (192.168.50.0/24) from main office (10.0.0.0/24)

**Steps**:
1. Create "Branch-Office" Python agent
2. Download and deploy to 192.168.50.10
3. Agent connects, status → ONLINE
4. Click **SWITCH POV** on agent
5. Navigate to **Assets** → see 192.168.50.0/24 devices
6. Navigate to **Dashboard** → see remote subnet stats

All processing on main NOP instance - agent only streams data.

---

## Implementation Details

### Backend

**Files**:
- `backend/app/models/agent.py` - Agent database model
- `backend/app/schemas/agent.py` - Pydantic validation schemas
- `backend/app/services/agent_service.py` - Business logic
- `backend/app/api/v1/endpoints/agents.py` - REST & WebSocket endpoints

**Database Schema**:
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    agent_type VARCHAR(20) NOT NULL,  -- python, c, asm
    status VARCHAR(20) NOT NULL,       -- online, offline, disconnected, error
    connection_url VARCHAR(255) NOT NULL,
    auth_token VARCHAR(255) NOT NULL UNIQUE,
    capabilities JSON NOT NULL,
    metadata JSON,
    last_seen TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Frontend

**Files**:
- `frontend/src/pages/Agents.tsx` - Main agents page (UI)
- `frontend/src/services/agentService.ts` - API client

**State Management** (Zustand):
```typescript
{
  agents: Agent[],           // All agents
  activeAgent: Agent | null, // Active POV agent
  connectedCount: number,    // Online agents count
  setAgents(),
  addAgent(),
  updateAgent(),
  removeAgent(),
  setActiveAgent()
}
```

---

## Troubleshooting

### Agent Won't Connect

**Check**:
1. Connection URL correct: `ws://host:port/api/v1/agents/{uuid}/connect`
2. Backend accessible from agent machine
3. Firewall allows WebSocket connections
4. Auth token matches (re-download if unsure)

**Debug**:
```bash
# Test connection from agent machine
curl -v ws://nop-host:8000/api/v1/agents/uuid/connect
```

### URL Placeholder Not Replaced

**Symptom**: Agent URL shows `{agent_id}` instead of actual UUID

**Fix**: Ensure backend has `import json` and pre-computes `capabilities_json` before f-string template

**Verify**:
1. Download agent
2. Check file contains actual UUID in connection URL
3. If still shows placeholder, check backend logs for errors

### POV Shows No Data

**Check**:
1. Agent capabilities include desired data type (Assets/Traffic/Scans)
2. Agent has discovered data (may take time)
3. Agent is ONLINE (green status)
4. Backend logs show data received from agent

---

## Obfuscation & Persistence (Advanced)

### Go Agent Compilation

Go agents support advanced obfuscation and persistence options:

**Build Pipeline**:
```bash
# Standard build
GOOS=linux GOARCH=amd64 go build -o nop-agent-linux

# Obfuscated build (using Garble)
GOOS=linux GOARCH=amd64 garble -literals -tiny -seed=random build \
  -ldflags="-s -w" -trimpath -o nop-agent-linux

# Compressed (UPX)
upx --best --lzma nop-agent-linux
```

**Cross-Platform Targets**:
- Linux: amd64, arm64
- Windows: amd64, 386
- macOS: amd64, arm64 (Apple Silicon)
- FreeBSD: amd64

### Startup Modes

**AUTO**: Installs systemd/service/LaunchAgent for auto-start on boot
**SINGLE**: Runs once and exits (no persistence)

### Persistence Levels

- **LOW**: No persistence, memory-resident, self-deletes on exit
- **MEDIUM**: Service installation, restart on crash, visible in process list
- **HIGH**: Multiple persistence mechanisms, process hiding, anti-forensics

### Stealth Features

When configured for high stealth:
- Process name mimicry (appears as system process)
- Domain fronting via CDN
- Randomized beacon intervals (jitter)
- Anti-VM and anti-debugging detection
- File timestamp manipulation
- Self-destruct on detection

**Configuration Example**:
```json
{
  "name": "DC-Monitor",
  "agent_type": "go",
  "obfuscate": true,
  "startup_mode": "auto",
  "persistence_level": "high",
  "capabilities": {"assets": true, "traffic": true}
}
```

---

## Future Enhancements

- Agent groups/tagging for organization
- Multi-agent POV (aggregate data from multiple agents)
- Agent metrics dashboard (CPU, memory, bandwidth)
- Push code updates to deployed agents
- End-to-end encryption for agent communications
- Task scheduling (periodic scans/discovery)
- Alert routing through specific agents
- Agent clustering for load balancing

---

## Related Documentation

- [API Reference](../technical/API_rest_v1.md) - Full API documentation
- [Deployment Guide](../guides/DEPLOYMENT.md) - Production deployment
- [Network Architecture](../architecture/ARCH_system_v1.md) - System design
- [Archived Agent Docs](../archive/agent-docs-2026-01-04/) - Historical implementation details
