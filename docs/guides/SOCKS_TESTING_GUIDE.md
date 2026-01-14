---
title: SOCKS Relay Testing
type: guide
category: testing
last_updated: 2026-01-14
---

# SOCKS Relay Testing Guide

## Current Status

✅ **AKIS Session Loaded**
✅ **Dev Containers Running** (backend built from source with SOCKS implementation)
✅ **Agent Deployed** to vulnerable-web container at `/tmp/agent.py`
✅ **Agent ID**: `d9298941-3bd6-4b74-a04c-1fe8feecf9ac`

## Quick Start

### 1. Start the Agent

**Interactive (see live output):**
```bash
docker exec -it vulnerable-web python3 /tmp/agent.py
```

**Background (production mode):**
```bash
docker exec -d vulnerable-web sh -c 'python3 /tmp/agent.py > /tmp/agent.log 2>&1 &'
```

### 2. Monitor Agent

**View logs:**
```bash
docker exec vulnerable-web tail -f /tmp/agent.log
```

**Check process:**
```bash
docker exec vulnerable-web ps aux | grep agent.py
```

### 3. Verify Connection via API

**Get authentication token:**
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=admin&password=admin123" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
```

**Check online agents:**
```bash
curl -s "http://localhost:8000/api/v1/agents/" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -m json.tool | grep -A 10 "test-host-socks"
```

**Look for SOCKS port in agent metadata:**
```bash
curl -s "http://localhost:8000/api/v1/agents/" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
agents = data.get('agents', [])
for agent in agents:
    if agent.get('status') == 'online':
        print(f\"Agent: {agent['name']}\")
        metadata = agent.get('agent_metadata', {})
        socks_port = metadata.get('socks_proxy_port')
        if socks_port:
            print(f\"  SOCKS: 127.0.0.1:{socks_port}\")
"
```

## Expected Behavior

### Phase 1: Connection
- Agent connects to `ws://172.21.0.1:8000/api/v1/agents/ws`
- WebSocket handshake completes
- Agent registers with C2
- Status changes to "online"

### Phase 2: SOCKS Module
- `socks_proxy_module()` starts
- Agent logs: "SOCKS proxy module started"
- Agent ready to relay SOCKS requests

### Phase 3: SOCKS Proxy Assignment (Backend)
⚠️ **NOTE**: This requires backend WebSocket handler updates:
- Backend receives agent connection
- Backend calls `create_agent_proxy(agent_id)`
- SOCKS5 server binds to `127.0.0.1:10080+`
- Port stored in `agent_metadata.socks_proxy_port`

### Phase 4: POV Mode Scanning (Backend)
⚠️ **NOTE**: This requires discovery endpoint updates:
- User sends scan request with `X-Agent-POV: <agent_id>` header
- Backend looks up agent's SOCKS port
- Scanner uses ProxyChains with agent's SOCKS proxy
- Traffic routes: C2 → SOCKS → Agent → Target

## Testing Steps

### Manual Test 1: Agent Connection
1. Start agent in terminal window
2. Watch for connection logs
3. Verify "Connected" message
4. Check API for online status

### Manual Test 2: SOCKS Module Verification
1. Confirm agent logs show "SOCKS proxy module started"
2. Check agent doesn't crash
3. Verify WebSocket stays connected

### Manual Test 3: Backend Integration (Pending)
⚠️ **Requires backend updates**:
- agents.py: WebSocket handler with SOCKS lifecycle
- agent_socks_proxy.py: SOCKS5 server implementation
- discovery.py: POV mode support
- scanner.py: ProxyChains integration

## Troubleshooting

### Agent Won't Connect
- Check connection URL: `ws://172.21.0.1:8000/api/v1/agents/ws`
- Verify backend is running: `curl http://localhost:8000/docs`
- Check WebSocket logs: `docker logs nop-backend-1 | grep WebSocket`

### Dependencies Missing
```bash
docker exec vulnerable-web pip3 install --break-system-packages \
  websockets psutil cryptography aiohttp scapy
```

### Agent Crashes
```bash
# View full error
docker exec vulnerable-web cat /tmp/agent.log

# Run in foreground to see errors
docker exec -it vulnerable-web python3 /tmp/agent.py
```

## Test Environment Details

- **Test Host**: `vulnerable-web` container (172.21.0.20)
- **C2 Backend**: Host network (172.21.0.1:8000)
- **Gateway**: 172.21.0.1
- **Agent File**: `/tmp/agent.py` (19,579 bytes with SOCKS module)

## Files Changed

### Backend (SOCKS Implementation)
- ✅ `backend/app/services/agent_service.py` - Agent template with SOCKS module
- ⚠️ `backend/app/services/agent_socks_proxy.py` - Needs deployment
- ⚠️ `backend/app/api/v1/endpoints/agents.py` - Needs WebSocket updates
- ⚠️ `backend/app/api/v1/endpoints/discovery.py` - Needs POV mode
- ⚠️ `backend/app/services/scanner.py` - Needs ProxyChains

### Generated Agent
- ✅ `/tmp/test_socks_agent.py` - Contains full SOCKS relay implementation
- ✅ Deployed to: `vulnerable-web:/tmp/agent.py`

## Next Steps

1. **Manual Test**: Start agent and verify connection ✅
2. **Backend Integration**: Deploy remaining SOCKS components
3. **E2E Test**: POV mode scan through agent's network
4. **Documentation**: Update user guide with SOCKS workflow

---

*Ready for manual testing - start the agent and verify connection!*
