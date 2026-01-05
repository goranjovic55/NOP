# POV Mode Implementation Status

## Overview
POV (Point of View) mode allows viewing the network from an agent's perspective instead of the C2 server's perspective. This is critical for:
- Seeing isolated networks (10.10.x.x) that only the agent can reach
- Executing commands FROM the agent, not the C2
- Verifying agent capabilities and access

## ✅ Fully Implemented POV Features

### 1. Dashboard
- **Status:** WORKING
- **Backend:** `dashboard.py` + `dashboard_service.py`
  - Accepts `X-Agent-POV` header
  - Filters metrics by `agent_id`
- **Frontend:** `Dashboard.tsx`
  - Uses `usePOV()` context
  - Passes `activeAgent.id` to services
  - Refreshes when switching POV modes
- **Test:** Switch to POV mode → should see different asset counts

### 2. Asset List  
- **Status:** WORKING
- **Backend:** `assets.py` (line 33) + `asset_service.py` (line 22)
  - Already had POV filtering
  - Filters WHERE `Asset.agent_id == agent_id`
- **Frontend:** `Assets.tsx` (line 109)
  - Already passing `activeAgent?.id`
  - Dependency array includes `activeAgent`
- **Test:** POV mode should show 10.10.2.40 and other isolated hosts

### 3. Asset Statistics
- **Status:** WORKING
- **Backend:** `assets.py` (/stats endpoint) + `asset_service.py`
  - Added POV support
  - Filters total/online/offline counts by agent_id
- **Frontend:** `dashboardService.ts`
  - Passes `agentPOV` parameter
  - Adds `X-Agent-POV` header
- **Test:** POV mode asset stats should differ from C2

### 4. Host System Info
- **Status:** WORKING
- **Backend:** `host.py` (line 45)
  - Already had POV support
  - Returns agent's `host_info` from metadata
- **Frontend:** `Host.tsx` (line 195)
  - Already passing `activeAgent?.id`
- **Test:** POV mode should show agent's hostname/OS/interfaces

## ⚠️ Partially Implemented (With Notices)

### 5. Terminal
- **Status:** NOTICE SHOWN - Not Yet Functional
- **Backend:** `host.py` terminal websocket (line 548)
  - Accepts `agent_pov` query parameter
  - Shows notice: "POV Terminal not yet implemented"
  - Falls back to C2 terminal
- **Frontend:** `Host.tsx` (line 121)
  - Passes `agent_pov` in WebSocket URL
- **TODO:** 
  - Implement agent HTTP tunnel relay for terminal
  - Route terminal I/O through agent
- **Workaround:** SSH directly to agent at 10.10.1.10

### 6. Traffic Statistics
- **Status:** NOTICE SHOWN - Returns Empty Stats
- **Backend:** `traffic.py` /stats endpoint (line 126)
  - Accepts POV header
  - Returns placeholder response
- **TODO:**
  - Get traffic stats from agent via HTTP tunnel
  - Aggregate agent's sniffer data
- **Test:** Returns note about POV not implemented

### 7. Advanced Ping/Traceroute
- **Status:** NOTICE SHOWN - Not Functional
- **Backend:** `traffic.py` /ping/advanced (line 223)
  - Accepts POV header
  - Returns notice message
- **TODO:**
  - Route ping/traceroute commands through agent
  - Parse results from agent execution
- **Workaround:** Use terminal to run commands on agent

## ❌ Not Implemented

### 8. File Browser POV
- **Status:** NOT STARTED
- **Location:** `Host.tsx` filesystem tab
- **Issue:** Shows C2 files, not agent files
- **TODO:**
  - Add POV routing for file operations
  - Route through agent HTTP tunnel

### 9. Desktop/VNC POV  
- **Status:** NOT STARTED
- **Location:** `Host.tsx` desktop tab
- **Issue:** Connects to C2's desktop
- **TODO:**
  - Route VNC/RDP connections through agent
  - May need port forwarding via HTTP tunnel

### 10. Packet Crafting POV
- **Status:** NOT CHECKED
- **Location:** `traffic.py` /craft endpoint
- **TODO:**
  - Verify if POV routing exists
  - Add agent execution if missing

### 11. Storm Detection POV
- **Status:** NOT CHECKED
- **Location:** `traffic.py` /storm/* endpoints
- **TODO:**
  - Verify POV routing
  - Ensure storms run FROM agent

## Network Topology (Verified)

```
C2 Server (172.28.0.x)
    ↓
    Cannot reach 10.10.x.x network
    
Agent (172.28.0.150 + 10.10.1.10)
    ↓
    Can reach both networks:
    - 172.28.x.x (C2 network)
    - 10.10.x.x (isolated test network)
```

### Test Network Hosts (Only visible from agent)
- 10.10.2.10 - SSH Server (test/test)
- 10.10.2.20 - Web Server
- 10.10.2.30 - Database Server (root/root123)
- 10.10.2.40 - FTP Server
- 10.10.2.50 - VNC Server (password: password)
- 10.10.2.60 - SMB Server
- 10.10.2.70 - Web Server 2
- 10.10.2.80 - SSH Server 2

## Testing Checklist

### Dashboard POV
- [ ] Switch to POV mode
- [ ] Verify asset count changes (should show isolated hosts)
- [ ] Verify metrics reflect agent's perspective
- [ ] Switch back to C2 mode, verify counts change back

### Asset List POV
- [ ] Enable POV mode
- [ ] Verify 10.10.2.40 (FTP server) is visible
- [ ] Verify all 10.10.x.x hosts appear
- [ ] Switch to C2 mode, verify isolated hosts disappear

### Host Page POV
- [ ] Enable POV mode
- [ ] Check System Info tab shows agent's interfaces
- [ ] Verify hostname is agent's, not C2's
- [ ] Verify Network Interfaces shows 10.10.1.10 interface

### Terminal POV (Pending Implementation)
- [ ] Enable POV mode
- [ ] Open terminal
- [ ] Verify notice message appears
- [ ] Workaround: SSH to 10.10.1.10 for agent terminal

### Advanced Ping POV (Pending Implementation)
- [ ] Enable POV mode
- [ ] Try ping to 10.10.2.10
- [ ] Verify notice message (or successful routing if implemented)
- [ ] Try traceroute, verify route starts from agent

## Implementation Priority

### High Priority (Breaks POV UX)
1. Terminal routing - Users expect terminal in POV
2. File browser - Data vault requires agent's files
3. Packet crafting - Key feature for testing

### Medium Priority (Has Workarounds)
4. Traffic stats - Can use C2 stats as proxy
5. Desktop/VNC - Can connect separately

### Low Priority (Nice to Have)
6. Storm detection - Less common use case

## Technical Notes

### POV Middleware
- **File:** `backend/app/core/pov_middleware.py`
- **Function:** `get_agent_pov(request) -> Optional[UUID]`
- Extracts `X-Agent-POV` header from requests
- Returns agent UUID or None

### Frontend Context
- **File:** `frontend/src/context/POVContext.tsx`
- **Hook:** `usePOV()`
- **Storage:** `localStorage.getItem('activeAgent')`
- **Headers:** Added via `getPOVHeaders()` utility

### Backend Pattern
```python
from app.core.pov_middleware import get_agent_pov

@router.get("/endpoint")
async def my_endpoint(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    agent_pov = get_agent_pov(request)
    if agent_pov:
        # Filter/route through agent
        pass
    # Normal C2 behavior
```

### Frontend Pattern
```typescript
import { usePOV } from '../context/POVContext';

const MyComponent = () => {
  const { activeAgent } = usePOV();
  
  useEffect(() => {
    fetchData();
  }, [activeAgent]); // Refetch when POV changes
  
  const fetchData = async () => {
    const data = await myService.getData(token, activeAgent?.id);
  };
};
```

## Recent Changes

### 2025-01-05
- Fixed Dashboard POV: Added useEffect dependency on `activeAgent`
- Fixed Terminal WebSocket: Added `agent_pov` query parameter
- Fixed Traffic Stats: Added POV check with placeholder
- Fixed Advanced Ping: Added POV check with notice
- Updated Host.tsx: WebSocket URL includes agent_pov when active

All changes preserve backward compatibility - C2 mode still works when POV is disabled.
