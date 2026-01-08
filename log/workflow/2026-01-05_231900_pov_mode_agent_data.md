# Session: POV Mode Agent Data Integration

**Date:** 2026-01-05 23:19:00  
**Branch:** copilot/create-agent-page  
**Commit:** decb656

## Summary
Completed Point-of-View (POV) mode implementation with full agent data persistence and display. Fixed critical JSONB persistence issue preventing agent metadata storage, and implemented data transformation for frontend compatibility.

## Problem Statement
- Agent connected successfully but host data and network interfaces not visible in Host page POV mode
- Agent data (traffic stats, host_info) received but not persisting to database
- Interface format mismatch between agent output and frontend expectations

## Changes Made

### 1. Agent Data Persistence Fix
**File:** `backend/app/services/agent_data_service.py`
- **Issue:** SQLAlchemy not detecting JSONB field modifications
- **Solution:** Added `flag_modified(agent, 'agent_metadata')` after updating nested JSON
- **Impact:** Agent traffic and host data now persists correctly to PostgreSQL

### 2. Traffic Data Storage
**File:** `backend/app/services/agent_data_service.py`
- Implemented `ingest_traffic_data()` to store interfaces from agent
- Discovered agent sends traffic stats (bytes/packets) not interfaces
- Interfaces come from `host_info` module, sent every 2 minutes

### 3. Host Info Storage  
**File:** `backend/app/services/agent_data_service.py`
- Implemented `ingest_host_data()` with proper JSONB persistence
- Stores complete host_info including: hostname, platform, interfaces, CPU, memory, disk

### 4. POV Mode Endpoint Updates
**Files:** `backend/app/api/v1/endpoints/host.py`, `traffic.py`
- Added POV filtering to: `get_processes()`, `get_network_connections()`, `get_disk_io()`
- All endpoints return empty data (no C2 fallback) when agent metadata unavailable
- Traffic interfaces endpoint already had POV support, verified working

### 5. Interface Format Transformation
**File:** `backend/app/api/v1/endpoints/host.py` - `/system/info` endpoint
- Agent sends: `interfaces` array with `{name, ip, status}` fields
- Frontend expects: `network_interfaces` array with `{name, address}` fields
- Added transformation layer in POV mode to map `ip` → `address`
- Filters out loopback interfaces (127.x.x.x) matching C2 behavior

## Technical Discoveries

### Agent Data Flow
1. **Connection:** Agent connects via WebSocket to `ws://172.28.0.1:8000/api/v1/agents/{id}/connect`
2. **Registration:** Immediate on connect (~0-30s)
3. **Data Intervals:**
   - Heartbeat: Every 30s (configurable via `heartbeat_interval`)
   - Traffic Stats: Every 60s (configurable via `data_interval`)
   - Host Info: Every 120s (configurable via `data_interval`)
4. **First Data:** Arrives ~10-60s after agent start depending on intervals

### JSONB Persistence Gotcha
```python
# ❌ WRONG - SQLAlchemy doesn't detect nested changes
agent.agent_metadata['host_info'] = data
await db.commit()  # Changes NOT saved!

# ✅ CORRECT - Must flag field as modified
from sqlalchemy.orm.attributes import flag_modified
agent.agent_metadata['host_info'] = data
flag_modified(agent, 'agent_metadata')
await db.commit()  # Changes saved!
```

### Docker Networking Context
- Backend: Host network mode (can't use container DNS)
- Agents: Bridge network `nop_nop-internal` (172.28.0.0/16)
- Connection: Gateway IP `172.28.0.1` accessible from both networks
- Database: Two PostgreSQL containers exist (`nop-postgres` at 172.29.0.10 is active)

## Validation Results

### Database Verification
```sql
-- Agent exists with metadata
SELECT id, name, agent_metadata->'host_info' IS NOT NULL 
FROM agents WHERE id = '7c7c59e1-6cc0-4d52-a272-2c312dcf2c68';
-- Result: TRUE

-- Interfaces stored correctly
SELECT agent_metadata->'host_info'->'interfaces' 
FROM agents WHERE id = '7c7c59e1-6cc0-4d52-a272-2c312dcf2c68';
-- Result: [{"name":"lo","ip":"127.0.0.1","status":"up"},
--          {"name":"eth0","ip":"172.28.0.150","status":"up"},
--          {"name":"eth1","ip":"10.10.1.10","status":"up"}]
```

### POV Mode API Tests
```bash
# Traffic Interfaces - Returns 3 agent interfaces
curl -H "X-Agent-POV: 7c7c59e1-..." /api/v1/traffic/interfaces
# Result: [{"name":"lo",...}, {"name":"eth0",...}, {"name":"eth1",...}]

# System Info - Returns transformed interfaces
curl -H "X-Agent-POV: 7c7c59e1-..." /api/v1/host/system/info
# Result: {"network_interfaces":[{"name":"eth0","address":"172.28.0.150"},
#                                  {"name":"eth1","address":"10.10.1.10"}]}

# Host Endpoints - Return empty (no C2 fallback)
curl -H "X-Agent-POV: 7c7c59e1-..." /api/v1/host/processes  # []
curl -H "X-Agent-POV: 7c7c59e1-..." /api/v1/host/connections  # []
curl -H "X-Agent-POV: 7c7c59e1-..." /api/v1/host/disk-io  # {}
```

## Skills Used
1. **POV Mode Architecture** - Header-based filtering with UUID extraction
2. **SQLAlchemy JSONB** - flag_modified() for nested field changes
3. **WebSocket Message Handling** - Agent data ingestion patterns
4. **Data Transformation** - Backend-to-frontend format mapping

## Future Work
- Add process tracking to agent (currently empty in POV mode)
- Add network connection tracking to agent
- Add disk I/O monitoring to agent
- Consider caching agent metadata for faster endpoint responses
- Terminal and Filesystem POV modes (currently show SOCKS proxy message)

## Related Files
- `backend/app/services/agent_data_service.py` - Data ingestion logic
- `backend/app/api/v1/endpoints/host.py` - Host system endpoints
- `backend/app/api/v1/endpoints/traffic.py` - Traffic interfaces endpoint
- `backend/app/api/v1/endpoints/agents.py` - WebSocket message handler
- `scripts/create_fresh_agent.py` - Agent creation helper
