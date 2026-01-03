# Agent/C2 Page - Detailed Explanation

## Overview

The Agent/C2 (Command & Control) page is a comprehensive interface for deploying and managing headless NOP agents on remote networks. This enables data collection from isolated subnets through agent Point of View (POV) switching.

---

## Page Layout & Components

### 1. Main Agents Page (`/agents`)

#### Header Section
- **Title**: "AGENT MANAGEMENT" in red cyberpunk font with glow effect
- **Subtitle**: "Deploy and manage clone agents for remote network operations"
- **Create Button**: Large red "+ CREATE AGENT" button in the top-right corner

#### Active Agent POV Banner (when agent POV is active)
- **Purple banner** spanning the full width
- **Left side**: Green pulsing dot + "AGENT POV ACTIVE: [Agent Name]"
- **Description**: "All data is now streamed from this agent's perspective"
- **Right side**: White bordered "EXIT POV" button
- **Purpose**: Shows when user is viewing NOP through an agent's perspective

#### Agents Grid
A responsive grid (1-3 columns based on screen size) displaying agent cards:

**Each Agent Card Contains:**

1. **Status Indicator** (top-right corner):
   - Green dot = Online
   - Gray dot = Offline
   - Yellow dot = Disconnected
   - Red dot = Error

2. **Agent Header**:
   - **Icon**: Large emoji indicating agent type
     - 🐍 = Python agent
     - ⚙ = C binary agent
     - ⚡ = ASM binary agent
   - **Name**: Red bold text, uppercase
   - **Description**: Gray text below name (if provided)

3. **Agent Details**:
   - **Type**: Python/C/ASM in uppercase
   - **Status**: Color-coded (GREEN for online, GRAY for offline, etc.)
   - **Last Seen**: Timestamp of last heartbeat

4. **Capabilities Section**:
   - Title: "CAPABILITIES" in small gray text
   - **Badges** for each enabled capability:
     - Assets - Blue badge
     - Traffic - Purple badge
     - Scans - Green badge
     - Access - Yellow badge

5. **Action Buttons** (bottom row):
   - **Download**: Blue bordered button - generates and downloads agent script
   - **Switch POV**: Green bordered button (or purple if active) - switches to agent's perspective
   - **Delete**: Red bordered button with "×" symbol

#### Empty State (when no agents exist)
- Large circular icon (◎)
- "NO AGENTS DEPLOYED" heading
- Description: "Create your first agent to start remote network operations"
- Centered "+ CREATE AGENT" button

---

### 2. Create Agent Modal

A full-screen overlay modal with dark background (80% opacity).

#### Modal Structure:

**Header** (sticky, red bordered):
- Title: "CREATE NEW AGENT" in red
- Close button: Large "×" in top-right

**Body** (scrollable):

1. **Agent Name** (required):
   - Text input with placeholder "e.g., Remote Office Alpha"
   - Black background, gray border that turns red on focus

2. **Description** (optional):
   - Textarea, 3 rows
   - Placeholder: "Optional description"

3. **Agent Type Selection** (required):
   - Three large buttons in a grid:
     - **Python**: 🐍 icon + "PYTHON" label
     - **C**: ⚙ icon + "C" label
     - **ASM**: ⚡ icon + "ASM" label
   - Selected type has red background and white text
   - Unselected types have gray borders and can be hovered (blue)

4. **Connection URL** (required):
   - Text input in monospace font
   - Default: `ws://localhost:12001/api/v1/agents/{agent_id}/connect`
   - This is where the agent will connect back to

5. **Capabilities Checkboxes**:
   - Four options, each with colored label:
     - ☑ **Asset Discovery** (blue)
     - ☑ **Traffic Monitoring** (purple)
     - ☑ **Security Scanning** (green)
     - ☐ **Remote Access** (yellow)
   - Each checkbox is in a bordered container that highlights on hover

**Footer**:
- **Cancel** button: Gray bordered, left side
- **Create Agent** button: Red background, bold, right side
  - Disabled if name is empty
  - Shows "Creating..." when loading

---

### 3. Navigation Integration

#### Sidebar Addition:
- New menu item: **"Agents"** with diamond icons (◆/◇)
- Position: Between "Access Hub" and "Host"
- **Connected Count Badge**: Purple circle showing number of online agents (when > 0)

#### Header Integration:
When an agent POV is active, the header changes:
- **Standard**: "DASHBOARD" (or other page name) in red
- **Agent POV**: "NOP - [AGENT NAME]" with agent name in purple
- **Additional Indicator**: Purple pulsing dot + "AGENT POV ACTIVE" label

---

## Agent Types & Generated Code

### 1. Python Agent
**File**: `nop_agent_{name}.py`

**Features**:
- WebSocket client using `websockets` library
- Automatic reconnection with 5-second retry
- Heartbeat every 30 seconds
- System info collection (hostname, platform, version)
- Command handling based on capabilities:
  - `discover_assets` - Network asset discovery
  - `capture_traffic` - Traffic monitoring
  - `run_scan` - Security scanning
- Pre-configured with:
  - Agent ID (UUID)
  - Auth token (32-byte secure random)
  - Connection URL
  - Capabilities JSON

**Usage**:
```bash
python3 nop_agent_remote_office.py
```

### 2. C Binary Agent
**File**: `nop_agent_{name}.c`

**Features**:
- Stub code with header includes
- Defines for agent ID, name, auth token, server URL
- Ready for WebSocket implementation (requires libwebsockets)
- Compilation instructions included

**Compilation**:
```bash
gcc -o agent nop_agent_{name}.c -lwebsockets -ljson-c
```

### 3. ASM Binary Agent
**File**: `nop_agent_{name}.asm`

**Features**:
- x86_64 assembly stub
- Data section with agent configuration
- Basic syscall structure (write message, exit)
- Ready for low-level WebSocket implementation

**Assembly**:
```bash
nasm -f elf64 nop_agent_{name}.asm && ld -o agent nop_agent_{name}.o
```

---

## Agent POV (Point of View) Switching

### Concept
When you "Switch POV" to an agent, the NOP interface transforms to show data from that agent's perspective:

### What Changes:

1. **Header**:
   - Shows "NOP - [AGENT NAME]" instead of page name
   - Purple indicator shows "AGENT POV ACTIVE"

2. **Data Sources** (all pages affected):
   - **Dashboard**: Statistics from agent's subnet
   - **Assets**: Devices discovered by the agent
   - **Traffic**: Network flows captured by the agent
   - **Scans**: Vulnerability scans run from agent's location
   - **Topology**: Network map from agent's perspective

3. **Visual Indicators**:
   - Purple banner at top of Agents page
   - Purple badge on active agent card
   - "Active POV" button label instead of "Switch POV"

### Use Case Example:

**Scenario**: You have NOP running in your main office (10.0.0.0/24), but need to monitor a remote branch office (192.168.50.0/24).

**Solution**:
1. Create a Python agent named "Branch Office"
2. Download the generated script
3. Deploy it to a machine in the remote subnet (192.168.50.10)
4. Agent connects back to your main NOP instance
5. Click "Switch POV" on the Branch Office agent
6. Now when you view:
   - **Assets page**: Shows devices in 192.168.50.0/24 (discovered by agent)
   - **Traffic page**: Shows network flows in remote subnet
   - **Dashboard**: Shows statistics from remote subnet

**All processing happens on your main NOP instance** - the agent is headless and just streams raw data.

---

## WebSocket Communication Protocol

### Agent → Server Messages:

1. **Registration**:
```json
{
  "type": "register",
  "agent_id": "uuid",
  "agent_name": "Branch Office",
  "capabilities": {
    "assets": true,
    "traffic": true,
    "scans": true
  },
  "system_info": {
    "hostname": "remote-host",
    "platform": "Linux",
    "version": "5.15.0"
  }
}
```

2. **Heartbeat** (every 30s):
```json
{
  "type": "heartbeat",
  "agent_id": "uuid",
  "timestamp": "2025-12-28T02:00:00Z"
}
```

3. **Data Streaming** (assets discovered):
```json
{
  "type": "assets_discovered",
  "agent_id": "uuid",
  "assets": [
    {"ip": "192.168.50.1", "mac": "aa:bb:cc:dd:ee:ff", "hostname": "router"},
    {"ip": "192.168.50.10", "mac": "11:22:33:44:55:66", "hostname": "pc-01"}
  ],
  "timestamp": "2025-12-28T02:00:00Z"
}
```

### Server → Agent Commands:

1. **Ping**:
```json
{
  "type": "ping"
}
```

2. **Command Execution**:
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

## Security Features

### 1. Authentication
- Each agent has a **unique 32-byte auth token** generated at creation
- Token is embedded in generated agent code
- Server validates token on WebSocket connection
- Invalid tokens are rejected with code 1008

### 2. Capability-Based Access Control
- Agents can only execute commands they have capabilities for
- Attempting unauthorized command is logged and ignored
- Capabilities can be updated after creation

### 3. Connection Security
- WebSocket connections support TLS (wss://)
- Connection URL configurable per agent
- Agent status tracked (online/offline/error)

### 4. Audit Trail
- All agent actions logged
- Last seen timestamp tracked
- Connected at timestamp recorded
- Agent lifecycle events stored

---

## Database Schema

### Agent Table:
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

---

## API Endpoints

### RESTful Endpoints:

1. **GET /api/v1/agents/** - List all agents
2. **POST /api/v1/agents/** - Create new agent
3. **GET /api/v1/agents/{id}** - Get agent details
4. **PUT /api/v1/agents/{id}** - Update agent
5. **DELETE /api/v1/agents/{id}** - Delete agent
6. **POST /api/v1/agents/{id}/generate** - Generate agent code
7. **GET /api/v1/agents/{id}/status** - Get connection status

### WebSocket Endpoint:

**WS /api/v1/agents/{id}/connect** - Agent connection endpoint
- Accepts agent connections
- Validates auth token
- Updates agent status
- Handles bidirectional messaging

---

## User Workflows

### Workflow 1: Deploy New Agent

1. Click "+ CREATE AGENT" button
2. Fill in agent details:
   - Name: "Remote Office Alpha"
   - Description: "Monitoring remote branch"
   - Type: Select Python
   - URL: (use default)
   - Capabilities: Check Assets, Traffic, Scans
3. Click "CREATE AGENT"
4. Agent appears in grid with "DISCONNECTED" status
5. Click "DOWNLOAD" button
6. Save `nop_agent_remote_office_alpha.py`
7. Deploy to remote machine
8. Run: `python3 nop_agent_remote_office_alpha.py`
9. Agent status changes to "ONLINE" (green dot)
10. Badge shows "1" on Agents menu item

### Workflow 2: Switch to Agent POV

1. Navigate to Agents page
2. Find desired agent (must be ONLINE)
3. Click "SWITCH POV" button
4. Purple banner appears: "AGENT POV ACTIVE: Remote Office Alpha"
5. Navigate to Dashboard
6. Header shows: "NOP - REMOTE OFFICE ALPHA"
7. Statistics show data from agent's subnet
8. Navigate to Assets
9. See devices discovered by remote agent
10. Return to Agents page
11. Click "EXIT POV" or click agent's "ACTIVE POV" button
12. Return to normal NOP view

### Workflow 3: Manage Agents

1. View all agents in grid
2. See real-time status (online/offline)
3. Check last seen timestamps
4. Update agent capabilities (edit functionality)
5. Delete agents no longer needed
6. Monitor connected count in sidebar badge

---

## Technical Architecture

### Frontend State Management:

**Agent Store** (Zustand):
```typescript
{
  agents: Agent[],           // All agents
  activeAgent: Agent | null, // Currently active POV agent
  connectedCount: number,    // Count of online agents
  setAgents(),
  addAgent(),
  updateAgent(),
  removeAgent(),
  setActiveAgent()
}
```

### Backend Service Layer:

**AgentService** provides:
- CRUD operations for agents
- Auth token generation
- Agent code generation (Python/C/ASM)
- Status management
- WebSocket connection handling

---

## Color Coding & Visual Design

### Status Colors:
- **Online**: Cyber Green (#00ff00)
- **Offline**: Cyber Gray (#6b7280)
- **Disconnected**: Cyber Yellow (#ffff00)
- **Error**: Cyber Red (#ff0000)

### Capability Colors:
- **Assets**: Cyber Blue (#00bfff)
- **Traffic**: Cyber Purple (#9f7aea)
- **Scans**: Cyber Green (#00ff00)
- **Access**: Cyber Yellow (#ffff00)

### Theme:
- Cyberpunk aesthetic matching existing NOP design
- Geometric symbols (◆ ◇ ◎)
- Glow effects on red elements
- Border-based UI components
- Dark backgrounds with neon accents

---

## Future Enhancements

### Planned Features:
1. **Agent Groups**: Organize agents by location/function
2. **Multi-Agent POV**: View data from multiple agents simultaneously
3. **Agent Metrics**: CPU, memory, bandwidth usage on agent
4. **Auto-Discovery**: Agents automatically discover and connect
5. **Agent Updates**: Push code updates to deployed agents
6. **Encryption**: End-to-end encryption for agent communications
7. **Agent Logs**: View agent execution logs in UI
8. **Task Scheduling**: Schedule scans/discovery on agents
9. **Alert Routing**: Route alerts through specific agents
10. **Agent Clustering**: Load balance across multiple agents

---

## Summary

The Agent/C2 page provides a complete solution for deploying and managing remote NOP agents. Key benefits:

✅ **Remote Monitoring**: Monitor isolated networks without VPN
✅ **Flexible Deployment**: Python scripts or compiled binaries
✅ **Capability Control**: Enable only needed features per agent
✅ **POV Switching**: Seamlessly view data from any agent's perspective
✅ **Real-time Status**: Live connection monitoring and heartbeats
✅ **Secure**: Token-based auth and capability restrictions
✅ **Cyberpunk UI**: Consistent with NOP's visual design

This enables network operators to extend NOP's reach across multiple subnets while maintaining centralized control and visualization.
