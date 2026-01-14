---
title: Agent C2 Architecture
type: explanation
category: architecture
last_updated: 2026-01-14
---

# Agent C2 Architecture Plan

## Overview

Transform NOP into a C2 (Command & Control) platform where agents deployed on remote networks relay data back to the main NOP instance. Users can view data from any agent's perspective (POV).

## Architecture

### 1. **Agent Layer** (Remote Networks)
- **Python/Go agents** deployed on target networks
- Each agent runs NOP modules locally:
  - Asset Discovery: ARP scans, port scanning
  - Traffic Monitoring: Packet capture, protocol analysis
  - Host Monitoring: System resources, processes
  - Access Control: Remote command execution
- Agents connect to C2 via WebSocket with auth token
- All data relayed to C2 server in real-time

### 2. **C2 Server** (Backend)
- **WebSocket Handler**: Manages agent connections
- **Data Routing**: Routes agent data to appropriate endpoints
- **Agent Registry**: Tracks connected/disconnected agents
- **POV Proxy**: When agent POV is active, proxy all frontend requests through agent

### 3. **Frontend POV System**
- **Agent Switcher**: Select which agent's data to view
- **Transparent Routing**: All existing NOP pages work with agent data
- **Agent Status Indicator**: Shows active POV in header
- **Agent List**: See all agents (wild/connected status)

## Data Flow

```
[Remote Network] → [Agent] → WebSocket → [C2 Server] → [Storage/API] → [Frontend]
                                            ↓
                                      [POV Router]
                                            ↓
                              [Route to specific agent's data]
```

## Implementation Plan

### Backend Changes

1. **Agent WebSocket Enhancement** (`backend/app/api/v1/websockets/agent.py`)
   - Handle asset_data, traffic_data, host_data messages
   - Store agent data with agent_id tagging
   - Broadcast to connected frontend clients

2. **POV Middleware** (`backend/app/core/pov_middleware.py`)
   - Check for X-Agent-POV header
   - Route requests to agent-specific data
   - Fallback to local data if no POV set

3. **Agent Data Storage**
   - Tag all discovered assets/traffic/hosts with `agent_id`
   - Filter queries by agent_id when POV is active
   - Database schema update: Add `agent_id` foreign key to relevant tables

4. **API Endpoints Enhancement**
   - `/api/v1/assets/` - Filter by agent_id if X-Agent-POV header present
   - `/api/v1/traffic/` - Filter by agent_id
   - `/api/v1/discovery/` - Filter by agent_id
   - New: `/api/v1/agents/{agent_id}/data` - Get all data from specific agent

### Frontend Changes

1. **POV Context** (`frontend/src/context/POVContext.tsx`)
   - Global state for active agent POV
   - Provides POV to all components
   - Adds X-Agent-POV header to API calls

2. **Service Layer Update**
   - `assetService.ts`: Add agent_id header
   - `trafficService.ts`: Add agent_id header
   - `discoveryService.ts`: Add agent_id header

3. **Agent View** (`frontend/src/pages/AgentView.tsx`)
   - Full NOP interface with all tabs (Dashboard, Assets, Traffic, etc.)
   - Data sourced from specific agent
   - Identical UI to main NOP view

4. **Header Update** (`frontend/src/components/Layout.tsx`)
   - Show active POV banner
   - Quick POV exit button

## Database Schema Updates

```sql
-- Add agent_id to asset table
ALTER TABLE assets ADD COLUMN agent_id UUID REFERENCES agents(id);

-- Add agent_id to traffic table  
ALTER TABLE traffic ADD COLUMN agent_id UUID REFERENCES agents(id);

-- Add agent_id to discovered_hosts
ALTER TABLE discovered_hosts ADD COLUMN agent_id UUID REFERENCES agents(id);

-- Indexes for performance
CREATE INDEX idx_assets_agent_id ON assets(agent_id);
CREATE INDEX idx_traffic_agent_id ON traffic(agent_id);
CREATE INDEX idx_discovered_hosts_agent_id ON discovered_hosts(agent_id);
```

## Security Considerations

1. **Authentication**: Each agent has unique auth token
2. **Encryption**: WebSocket over TLS (wss://)
3. **Command Authorization**: Access module requires explicit permission
4. **Data Isolation**: Agent data tagged and isolated by agent_id

## User Workflow

1. **Create Agent**: User configures agent (Python/Go, modules, persistence)
2. **Download**: User downloads generated agent file
3. **Deploy**: User deploys agent on remote network
4. **Connect**: Agent auto-connects to C2 server
5. **Monitor**: User sees agent in "connected" status
6. **Switch POV**: Click agent → See all NOP pages with agent's data
7. **Multi-Agent**: Create multiple agents for different networks
8. **Comparison**: Switch between agent POVs to compare networks

## Next Steps

1. ✅ Database migration for agent_id columns
2. ✅ WebSocket message handlers for agent data
3. ✅ POV middleware implementation
4. ✅ Frontend POV context
5. ✅ Agent View page
6. ✅ Testing with live agent
