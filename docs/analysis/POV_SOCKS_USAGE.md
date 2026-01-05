# POV Mode with SOCKS Proxy - Implementation Guide

## Overview

You already have a **SOCKS5 proxy system** built into NOP! Each connected agent automatically gets a local SOCKS5 proxy on port 10080+. This is **much simpler** than HTTP tunnels for POV features.

## How It Works

### 1. Agent Connection
When an agent connects via WebSocket (`/api/v1/agents/ws`):
- Agent registers with credentials
- C2 creates SOCKS5 proxy on `127.0.0.1:10080+` (increments for each agent)
- Proxy port stored in `agent.agent_metadata["socks_proxy_port"]`
- All traffic through proxy is tunneled through agent's network

### 2. SOCKS Proxy Architecture

```
┌─────────────────┐
│   C2 Server     │
│  (Your tools)   │
└────────┬────────┘
         │ SOCKS5 Proxy
         │ 127.0.0.1:10080
         ▼
┌─────────────────┐
│  SOCKS Proxy    │
│   (per agent)   │
└────────┬────────┘
         │ WebSocket Tunnel
         │
         ▼
┌─────────────────┐
│     Agent       │
│  (10.10.1.10)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Isolated Network│
│  (10.10.x.x)    │
└─────────────────┘
```

## POV Features Using SOCKS Proxy

### ✅ Already Implemented

1. **Scans via SOCKS** - [scanner.py](backend/app/services/scanner.py) lines 73-160
   ```python
   # Ping sweep through agent
   await scanner.ping_sweep("10.10.2.0/24", proxy_port=10080)
   
   # Port scan through agent
   await scanner.port_scan("10.10.2.10", proxy_port=10080)
   ```

2. **SOCKS Proxy Service** - [agent_socks_proxy.py](backend/app/services/agent_socks_proxy.py)
   - Full SOCKS5 server implementation
   - Handles CONNECT, IPv4/IPv6/DNS
   - Tunnels through agent WebSocket
   - Auto-cleanup on disconnect

### ⚠️ Partially Implemented (POV notices added)

3. **Terminal Access**
   - **Current:** Shows SOCKS proxy port and SSH command
   - **Usage:** `ssh -o ProxyCommand='nc -x 127.0.0.1:10080 %h %p' test@10.10.2.10`
   - **Better:** Implement WebSocket terminal relay through SOCKS

4. **Advanced Ping**
   - **Current:** Returns SOCKS port in response
   - **Usage:** Run ping commands via SOCKS-enabled tools
   - **Better:** Execute ping on agent, return results

5. **Traffic Stats**
   - **Current:** Reads from `agent.agent_metadata["traffic_stats"]`
   - **Needs:** Agent must send traffic data periodically
   - **Better:** Agent runs sniffer, sends stats to C2

### ❌ Not Implemented

6. **Packet Crafting via SOCKS**
   - Scapy/raw sockets don't work through SOCKS5
   - Need agent-side packet crafting service
   - Send craft commands via WebSocket

7. **Packet Storm via SOCKS**
   - Same limitation as packet crafting
   - Need agent to execute storm locally

## How to Use SOCKS Proxy for POV

### Get Agent's SOCKS Port

```python
# In any endpoint with agent POV
agent_pov = get_agent_pov(request)
agent = await AgentService.get_agent(db, agent_pov)
socks_port = agent.agent_metadata.get("socks_proxy_port")
```

### Route Traffic Through SOCKS

#### Option 1: Direct Socket Connection
```python
import socks
import socket

# Configure SOCKS proxy
socks.set_default_proxy(socks.SOCKS5, "127.0.0.1", socks_port)
socket.socket = socks.socksocket

# Now all socket connections go through agent
conn = socket.create_connection(("10.10.2.10", 22))
```

#### Option 2: HTTP Requests via SOCKS
```python
import requests

proxies = {
    'http': f'socks5://127.0.0.1:{socks_port}',
    'https': f'socks5://127.0.0.1:{socks_port}'
}

response = requests.get('http://10.10.2.20', proxies=proxies)
```

#### Option 3: SSH via ProxyCommand
```bash
ssh -o ProxyCommand="nc -x 127.0.0.1:10080 %h %p" test@10.10.2.10
```

#### Option 4: ProxyChains (already used in scanner.py)
```bash
# Create config
cat > /tmp/proxychains.conf << EOF
[ProxyList]
socks5 127.0.0.1 10080
EOF

# Run tools through proxy
proxychains4 -f /tmp/proxychains.conf nmap 10.10.2.0/24
```

## Why You See Same Data in Dashboard

The issue is **NOT** the POV implementation - it's that:

1. ✅ **Backend POV works** - Filters by agent_id correctly
2. ✅ **Frontend POV context works** - Passes X-Agent-POV header
3. ❌ **No data difference** - Because agent hasn't discovered different assets yet!

### To Test POV Filtering is Working:

```bash
# 1. Check assets WITHOUT POV (should show C2's discoveries)
curl "http://localhost:8000/api/v1/assets" \
  -H "Authorization: Bearer $TOKEN" | jq '.assets[].ip_address'

# 2. Check assets WITH POV (should show ONLY agent's discoveries)
curl "http://localhost:8000/api/v1/assets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-POV: 74513ce3-3c48-4b82-a17b-ff7de9cf9416" | jq '.assets[].ip_address'
```

If both show same IPs, it means:
- Agent has discovered the same hosts as C2
- OR agent hasn't sent discovery data yet
- OR all discoveries were made BY the agent (agent_id column matches)

### Solution: Make Agent Discover Isolated Network

The agent needs to:
1. Scan 10.10.x.x network (which C2 cannot reach)
2. Send discovered assets with `asset_data` message type
3. Assets stored with `agent_id = 74513ce3-3c48-4b82-a17b-ff7de9cf9416`

Then POV mode will show DIFFERENT data!

## Recommended POV Implementation Priority

### High Priority (Simple with SOCKS)

1. **SSH Terminal Access**
   ```python
   # In terminal WebSocket, create SSH connection via SOCKS
   import asyncssh
   
   async def connect_via_socks(host, port, socks_port):
       conn = await asyncssh.connect(
           host, port,
           tunnel=f'socks5://127.0.0.1:{socks_port}'
       )
       return conn
   ```

2. **Traffic Stats from Agent**
   ```python
   # Agent sends traffic data periodically
   await websocket.send_json({
       "type": "traffic_data",
       "traffic_stats": {
           "total_packets": 1234,
           "protocols": {"tcp": 800, "udp": 400},
           "top_talkers": [...]
       }
   })
   
   # C2 stores in agent.agent_metadata["traffic_stats"]
   # POV endpoint returns this data
   ```

3. **Host Discovery via SOCKS Scans**
   ```python
   # Already works! Just need to trigger
   if agent_pov:
       socks_port = agent.agent_metadata["socks_proxy_port"]
       results = await scanner.ping_sweep("10.10.2.0/24", proxy_port=socks_port)
       # Results will have agent_id set automatically
   ```

### Medium Priority (Need Agent Commands)

4. **Advanced Ping**
   - Send ping command to agent via WebSocket
   - Agent executes locally, returns results
   - No SOCKS needed for this

5. **Packet Crafting**
   - Send craft command to agent via WebSocket
   - Agent uses Scapy to craft packet
   - Returns success/failure

### Low Priority (Complex)

6. **Real-time Terminal Relay**
   - WebSocket → SOCKS → SSH → Agent Terminal → back
   - Multiple layers of async communication
   - Better to just show SOCKS proxy command

## Testing SOCKS Proxy

### 1. Check Agent is Connected and has SOCKS Port

```bash
curl "http://localhost:8000/api/v1/agents/74513ce3-3c48-4b82-a17b-ff7de9cf9416" \
  -H "Authorization: Bearer $TOKEN" | jq '.agent_metadata.socks_proxy_port'
```

### 2. Test SOCKS Proxy with netcat

```bash
# Get SOCKS port (e.g., 10080)
SOCKS_PORT=10080

# Test connection to isolated host via SOCKS
nc -X 5 -x 127.0.0.1:$SOCKS_PORT 10.10.2.10 22
```

Should connect if agent is online!

### 3. SSH via SOCKS

```bash
ssh -o ProxyCommand="nc -X 5 -x 127.0.0.1:10080 %h %p" test@10.10.2.10
# Password: test
```

### 4. HTTP Request via SOCKS

```bash
curl --socks5 127.0.0.1:10080 http://10.10.2.20
```

## Summary

**You don't need HTTP tunnels!** Your SOCKS proxy system is perfect for POV mode:

✅ **SOCKS proxy exists** - One per connected agent  
✅ **Scanner uses SOCKS** - Already routing scans through agent  
✅ **POV filtering works** - Backend correctly filters by agent_id  
✅ **Frontend sends header** - X-Agent-POV passes correctly  

❌ **Same data showing** - Because:
- Agent hasn't scanned isolated network yet
- No traffic stats being sent by agent
- Need to trigger discovery from agent POV

**Next Steps:**
1. Restart frontend (done above)
2. Run scan FROM agent POV to discover 10.10.x.x hosts
3. Agent sends traffic stats periodically
4. Dashboard will show different data in POV mode

**For terminal/ping/crafting:**
- Use agent WebSocket commands (not SOCKS)
- Agent executes locally, returns results
- Much simpler than SOCKS relay
