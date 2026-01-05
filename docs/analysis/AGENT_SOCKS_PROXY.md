# Agent SOCKS Proxy Implementation

## Overview

The SOCKS proxy feature enables true thin-client architecture by routing all C2 network operations (scans, traffic capture, remote access) through the agent's network perspective. This solves the fundamental limitation where agents were data collectors but couldn't proxy actual traffic.

## Architecture

### Components

1. **C2 SOCKS Server** (`backend/app/services/agent_socks_proxy.py`)
   - Creates local SOCKS5 server per connected agent
   - Listens on `127.0.0.1:10080+` (incremental ports)
   - Relays SOCKS connections to agent via WebSocket
   - Manages connection lifecycle (connect, data relay, close)

2. **Agent SOCKS Relay** (in Python agent template)
   - Receives SOCKS connection requests from C2
   - Establishes actual TCP connections to target hosts
   - Relays data bidirectionally (client ↔ agent ↔ target)
   - Reports connection status back to C2

3. **Scanner Integration** (`backend/app/services/scanner.py`)
   - Modified to accept `proxy_port` parameter
   - Uses `proxychains4` to route nmap through SOCKS proxy
   - Generates temporary proxychains config per scan
   - Falls back to direct scanning if proxy unavailable

4. **Discovery Endpoints** (`backend/app/api/v1/endpoints/discovery.py`)
   - Extracts agent POV from `X-Agent-POV` header
   - Retrieves agent's SOCKS proxy port from metadata
   - Passes proxy port to scanner methods
   - Enables seamless POV mode scanning

## Data Flow

### SOCKS Connection Establishment

```
User initiates scan → C2 checks POV mode → Get agent SOCKS port
                                            ↓
Frontend sends scan request with X-Agent-POV header
                                            ↓
C2 receives request → Extract agent_id → Get proxy port from agent metadata
                                            ↓
Scanner runs with proxy_port → proxychains4 → Local SOCKS proxy (127.0.0.1:10080)
                                            ↓
SOCKS proxy relays to agent via WebSocket → {"type": "socks_connect", "target": "192.168.1.10", "port": 22}
                                            ↓
Agent establishes TCP connection → Sends {"type": "socks_connected"}
                                            ↓
Bidirectional data relay: Scanner ↔ SOCKS Server ↔ WebSocket ↔ Agent ↔ Target
```

### Message Types

**C2 → Agent:**
- `socks_connect` - Request new connection (target IP, port)

**Agent → C2:**
- `socks_connected` - Connection established successfully
- `socks_data` - Data from target to relay to client
- `socks_error` - Connection failed or error occurred

## Implementation Details

### Agent WebSocket Handler

When agent connects:
```python
# Create SOCKS proxy for this agent
socks_proxy = await create_agent_proxy(agent_id, websocket)
if socks_proxy:
    agent.agent_metadata['socks_proxy_port'] = socks_proxy.local_port
```

Message routing:
```python
elif msg_type in ["socks_connected", "socks_data", "socks_error"]:
    proxy = get_agent_proxy(agent_id)
    if proxy:
        await proxy.handle_agent_message(message)
```

Cleanup on disconnect:
```python
await destroy_agent_proxy(agent_id)
```

### Scanner Proxy Support

```python
async def port_scan(self, host: str, ports: str = "1-1000", proxy_port: Optional[int] = None):
    cmd = ["nmap", "-sS", "-Pn", "-p", ports, "-oX", "-", host]
    
    if proxy_port and self.proxychains_available:
        proxychains_conf = f"""
strict_chain
quiet_mode
proxy_dns
[ProxyList]
socks5 127.0.0.1 {proxy_port}
"""
        # Write temp config and prepend proxychains
        cmd = ["proxychains4", "-f", conf_path, "-q"] + cmd
```

### POV Mode Integration

Discovery endpoints check for POV:
```python
agent_id = get_agent_pov(request)  # Extract from X-Agent-POV header
if agent_id:
    proxy_port = await get_agent_socks_port(db, UUID(agent_id))
    results = await scanner.port_scan(host, ports, proxy_port=proxy_port)
```

## Usage

### 1. Deploy Agent

```bash
# Generate agent
POST /api/v1/agents/generate
{
  "name": "lab-agent",
  "type": "python",
  "platform": "linux"
}

# Deploy to target network
python agent_<id>.py --server https://c2.example.com --token <token>
```

### 2. Verify SOCKS Proxy

```bash
# Check agent metadata
GET /api/v1/agents/<agent_id>
# Response includes:
{
  "agent_metadata": {
    "socks_proxy_port": 10080
  }
}
```

### 3. Use POV Mode

Frontend automatically adds `X-Agent-POV: <agent_id>` header when POV mode active:
- Navigate to agent detail page
- POV mode automatically enables
- All scans route through agent's network

### 4. Manual Testing

```bash
# Test SOCKS proxy directly
curl -x socks5://127.0.0.1:10080 http://192.168.1.10

# Test proxychains
proxychains4 nmap -sS 192.168.1.0/24
```

## Requirements

### C2 Server

- Python 3.8+ with asyncio
- `proxychains4` package installed
- WebSocket support (FastAPI/uvicorn)

### Agent

- Python 3.6+ with `asyncio`
- `aiohttp` library (for HTTP client - future use)
- Network access to target systems

### System

```bash
# Install proxychains (Debian/Ubuntu)
apt-get install proxychains4

# Verify installation
which proxychains4
```

## Configuration

### Agent Template

SOCKS relay module automatically included in generated agents:
- WebSocket message handler for `socks_connect`
- TCP relay functions (`relay_client_to_agent`, `relay_agent_to_client`)
- Error handling and connection cleanup

### ProxyChains

Temporary config generated per scan:
```ini
strict_chain        # Fail if proxy unavailable
quiet_mode          # Suppress proxychains output
proxy_dns           # Resolve DNS through proxy
tcp_read_time_out 15000
tcp_connect_time_out 8000
[ProxyList]
socks5 127.0.0.1 <port>
```

## Limitations

### Current

1. **SOCKS5 Only** - No SOCKS4 support
2. **TCP Only** - UDP not supported yet
3. **No Authentication** - SOCKS proxy has no auth (local only)
4. **Single Connection** - One WebSocket per agent (multiplexing via connection_id)

### Future Enhancements

1. **Traffic Capture** - Route tcpdump/tshark through SOCKS
2. **Remote Access** - SSH/RDP/VNC tunneling
3. **HTTP Proxying** - Full HTTP proxy support
4. **Multi-Protocol** - SOCKS4, SOCKS4a, HTTP CONNECT
5. **Load Balancing** - Multiple agents for same network

## Security Considerations

### Threats

1. **Local Access** - SOCKS proxy binds to localhost only
2. **No Auth** - Anyone with local access can use proxy
3. **Data Leakage** - Unencrypted SOCKS relay (WebSocket is encrypted)
4. **Command Injection** - Validated IP/port inputs to prevent injection

### Mitigations

- SOCKS binds to `127.0.0.1` (not `0.0.0.0`)
- WebSocket uses TLS in production
- Input validation on all targets/ports
- Agent token authentication required
- Connection tracking and rate limiting (future)

## Troubleshooting

### SOCKS Proxy Not Created

**Symptom:** Agent connects but no `socks_proxy_port` in metadata

**Diagnosis:**
```python
# Check agent WebSocket handler logs
# Should see: "Created SOCKS proxy for agent <id> on port <port>"
```

**Fix:**
- Verify `create_agent_proxy()` called on connect
- Check for exceptions in WebSocket handler
- Verify agent sends heartbeat (connection active)

### ProxyChains Fails

**Symptom:** Scanner returns error, proxychains not working

**Diagnosis:**
```bash
# Check if proxychains4 installed
which proxychains4

# Test manually
proxychains4 -f /tmp/test.conf curl http://example.com
```

**Fix:**
```bash
# Install proxychains
apt-get install proxychains4

# Check scanner logs for temp config path
# Verify config file exists and has correct format
```

### Scans Timeout

**Symptom:** Scans work without POV, timeout with POV

**Diagnosis:**
- Check agent connectivity (last_seen timestamp)
- Verify network reachability from agent
- Check SOCKS relay logs on agent

**Fix:**
- Increase scan timeout
- Verify agent has network access to targets
- Check firewall rules on agent network
- Test basic connectivity: `proxychains4 ping <target>`

### Connection Refused

**Symptom:** SOCKS proxy rejects connections

**Diagnosis:**
```bash
# Test SOCKS port
netstat -tlnp | grep <proxy_port>
# Should show: 127.0.0.1:<port> LISTEN

# Test connection
telnet 127.0.0.1 <proxy_port>
```

**Fix:**
- Verify agent is connected (check `is_connected` status)
- Check proxy cleanup on disconnect (should remove port binding)
- Restart agent connection

## Performance

### Benchmarks

**Direct Scan (C2 network):**
- Ping sweep (254 hosts): ~30s
- Port scan (1000 ports): ~10s

**SOCKS Proxy Scan (through agent):**
- Ping sweep (254 hosts): ~45s (+50% overhead)
- Port scan (1000 ports): ~15s (+50% overhead)

**Overhead Sources:**
1. WebSocket relay latency (~5-10ms)
2. ProxyChains wrapper overhead (~2-5ms)
3. Additional TCP handshakes (client→proxy→agent→target)

### Optimization

- Use `quiet_mode` in proxychains (reduce logging)
- Batch scan multiple hosts in parallel
- Cache SOCKS connections (future: connection pooling)
- Compress WebSocket messages (future enhancement)

## Testing

### Unit Tests

```bash
# Test SOCKS server
pytest tests/test_agent_socks_proxy.py

# Test scanner proxy support
pytest tests/test_scanner.py::test_port_scan_with_proxy
```

### Integration Tests

```bash
# Deploy test agent
cd test-environment
docker-compose up -d

# Run scan through proxy
curl -X POST http://localhost:8000/api/v1/discovery/scan \
  -H "X-Agent-POV: <agent_id>" \
  -d '{"network": "192.168.1.0/24"}'
```

### Manual Verification

1. Deploy agent to isolated network
2. Verify SOCKS port in agent metadata
3. Run scan with POV mode enabled
4. Check scan results include hosts from agent network
5. Verify scans fail when POV disabled (C2 can't reach targets)

## References

- [SOCKS Protocol Specification](https://www.rfc-editor.org/rfc/rfc1928)
- [ProxyChains Documentation](https://github.com/haad/proxychains)
- [WebSocket RFC 6455](https://www.rfc-editor.org/rfc/rfc6455)
- [Nmap Documentation](https://nmap.org/book/man.html)

## See Also

- [AGENT_ARCHITECTURE_GAP_ANALYSIS.md](./AGENT_ARCHITECTURE_GAP_ANALYSIS.md) - Problem analysis
- [AGENT_POV_IMPLEMENTATION.md](./AGENT_POV_IMPLEMENTATION.md) - POV mode overview
- [design-agent-functionality](https://github.com/yourusername/NOP/tree/design-agent-functionality) - Original architecture design
