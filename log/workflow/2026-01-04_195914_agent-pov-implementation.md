# Workflow Log: Agent POV & Internal Network Support

**Date:** 2026-01-04  
**Duration:** ~3 hours  
**Branch:** copilot/create-agent-page  
**Status:** Completed (requires debugging in next session)

## Objective

Implement Agent Point-of-View (POV) functionality to view host metrics from agent perspective, and add internal Docker network support for agent deployment.

## Tasks Completed

### 1. Agent POV Backend Implementation
- **File:** `backend/app/api/v1/endpoints/host.py`
- **Changes:**
  - Added `get_agent_pov()` helper function to detect `X-Agent-POV` header
  - Modified `get_system_info()` endpoint to return agent system info when in POV mode
  - Modified `get_system_metrics()` endpoint to return agent metrics in full format matching frontend expectations
  - Transformed simplified agent metrics (`cpu_percent`, `memory_percent`, `disk_percent`) into complete structure with `cpu.percent_total`, `memory.percent`, `disk[].percent` fields

### 2. Agent POV Frontend Implementation
- **File:** `frontend/src/pages/Host.tsx`
- **Changes:**
  - Integrated `usePOV()` hook from POVContext
  - Added `activeAgent?.id` parameter to `hostService` API calls
  - Added `useEffect` dependency on `activeAgent` to re-fetch data when switching POV

- **File:** `frontend/src/services/hostService.ts`
- **Changes:**
  - Added optional `agentPOV` parameter to `getSystemInfo()` and `getSystemMetrics()`
  - Conditionally adds `X-Agent-POV` header when agentPOV is provided

### 3. Internal Network Support
- **File:** `frontend/src/pages/Agents.tsx`
- **Changes:**
  - Changed "Internal" connection option from `nop-backend-1` to `172.28.0.1` (Docker gateway IP)
  - Updated button selection logic to highlight correct option
  - Added internal download commands section in agent sidebar showing `wget` and `curl` with `http://nop-backend-1:8000`

### 4. Agent Termination Feature
- **File:** `backend/app/api/v1/endpoints/agents.py`
- **Changes:**
  - Added `terminate_agent()` POST endpoint to send terminate command via websocket
  - Modified `delete_agent()` to send terminate command before deletion
  - Updated websocket message handler to process terminate commands
  - Added `asyncio` import for sleep during graceful shutdown

- **File:** `backend/app/services/agent_service.py`
- **Changes:**
  - Updated agent template `message_handler()` to handle `terminate` message type
  - Sets `self.running = False` and breaks loop on terminate command

- **File:** `frontend/src/services/agentService.ts`
- **Changes:**
  - Added `terminateAgent()` function to call terminate endpoint

- **File:** `frontend/src/pages/Agents.tsx`
- **Changes:**
  - Added `handleTerminateAgent()` function with confirmation dialog
  - Added "⚠ Kill" button to active agents list (only visible for online agents)
  - Auto-refreshes agent list after termination

## Technical Details

### Data Structure Transformation
Agent metrics from metadata (simplified):
```json
{
  "cpu_percent": 19.0,
  "memory_percent": 38.9,
  "disk_percent": 71.7
}
```

Transformed to frontend-expected format:
```json
{
  "cpu": {
    "percent_total": 19.0,
    "percent_per_core": [],
    "core_count": 0,
    "thread_count": 0,
    "frequency": {"current": 0, "min": 0, "max": 0}
  },
  "memory": {
    "total": 0,
    "available": 0,
    "percent": 38.9,
    "used": 0,
    "free": 0,
    "swap_total": 0,
    "swap_used": 0,
    "swap_free": 0,
    "swap_percent": 0
  },
  "disk": [{
    "device": "agent",
    "mountpoint": "/",
    "fstype": "unknown",
    "total": 0,
    "used": 0,
    "free": 0,
    "percent": 71.7
  }],
  "network": {
    "bytes_sent": 0,
    "bytes_recv": 0,
    "packets_sent": 0,
    "packets_recv": 0
  },
  "processes": 0,
  "timestamp": "...",
  "_source": "agent",
  "_agent_id": "...",
  "_agent_name": "..."
}
```

### Network Configuration Discovery

**Backend Host Mode (docker-compose.dev.yml):**
- Backend uses `network_mode: host`
- Container hostname `nop-backend-1` not resolvable from other networks
- Gateway IP `172.28.0.1` works for cross-network communication

**Agent Connection URLs:**
- External (Codespaces): `wss://automatic-adventure-9xvpqrr5p45f97xr-8000.app.github.dev`
- Internal (Docker): `ws://172.28.0.1:8000`
- Note: `ws://nop-backend-1:8000` doesn't work due to host network mode

## Testing Performed

### Agent Connection Test
1. Created agent "Gateway Test" with connection URL: `ws://172.28.0.1:8000`
2. Downloaded to nop-agent-test container via `wget http://172.28.0.1:8000/api/v1/agents/download/{token}`
3. Executed agent: `python3 /tmp/agent.py`
4. **Result:** ✅ Agent connected successfully, registered with C2
5. Backend logs show: `Agent Gateway Test registered: {'type': 'register', ...}`

### Created Agents
- `internal_test` - Connected successfully with internal IP
- `Gateway Test` - Connected successfully with gateway IP  
- Multiple test agents created during development (deleted)

## Known Issues & Next Steps

### 🐛 Issues Requiring Debug
1. **Host Page Black Screen:** Initial POV implementation had data structure mismatch (FIXED)
2. **Agent Termination:** Kill button added but not tested in this session
3. **External Agent Connectivity:** Codespaces URL requires GitHub auth, blocks external agents

### 📋 Remaining Work
1. Test terminate/kill functionality end-to-end
2. Verify POV switching works correctly after rebuild
3. Test external agent deployment on non-Codespaces environment
4. Document POV usage in user guide
5. Add visual indicator when in POV mode on Host page

## Files Modified

### Backend
- `backend/app/api/v1/endpoints/host.py` - POV support in metrics/info endpoints
- `backend/app/api/v1/endpoints/agents.py` - Terminate endpoint, delete enhancement
- `backend/app/services/agent_service.py` - Agent template terminate handler

### Frontend
- `frontend/src/pages/Host.tsx` - POV integration
- `frontend/src/pages/Agents.tsx` - Internal network option, terminate button
- `frontend/src/services/hostService.ts` - POV parameter support
- `frontend/src/services/agentService.ts` - Terminate function

## Build Commands Used

```bash
# Full rebuild
cd /workspaces/NOP
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml build backend frontend
docker compose -f docker-compose.dev.yml up -d

# Individual rebuilds
docker compose -f docker-compose.dev.yml build frontend
docker compose -f docker-compose.dev.yml up -d frontend
```

## Agent Creation & Testing

```bash
# Create agent via API
curl -X POST http://localhost:8000/api/v1/agents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Gateway Test","connection_url":"ws://172.28.0.1:8000/api/v1/agents/{agent_id}/connect",...}'

# Download and run on test host
docker exec nop-agent-test wget -O /tmp/agent.py 'http://172.28.0.1:8000/api/v1/agents/download/{token}'
docker exec nop-agent-test python3 /tmp/agent.py &

# Check connection
docker logs nop-backend-1 --tail 10 | grep "registered"
```

## Lessons Learned

1. **Docker Networking:** Host network mode requires gateway IP for cross-network communication
2. **Data Structure Compatibility:** Frontend components need complete data structures even when displaying partial data
3. **Agent Metadata:** Stored simplified metrics to reduce bandwidth, must transform for frontend
4. **Build Caching:** Docker build caches aggressively - need full rebuild when files aren't in git
5. **Multiple Deployments:** Support both internal (Docker) and external (public) deployment scenarios

## Session Statistics

- **Commands Executed:** ~150+
- **Container Rebuilds:** 8-10 full builds
- **Agent Connections Tested:** 5+ agents
- **Lines of Code Modified:** ~500 lines across 7 files
- **Token Usage:** ~100k tokens

---

**Next Session Priority:** Debug and test terminate/kill functionality, verify POV mode rendering
