# Agent POV Testing Environment

This environment creates an isolated network topology for testing Agent Point-of-View (POV) functionality. The setup simulates a real-world scenario where an agent is deployed on a remote network that has access to hosts not visible from the main NOP platform network.

## Architecture

### Network Topology

```
┌─────────────────────────────────────────────────────────────┐
│ NOP Internal Network (172.28.0.0/16)                        │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Backend  │  │ Frontend │  │ Postgres │                   │
│  │.28.0.2   │  │.28.0.3   │  │.28.0.4   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                               │
│                    ┌─────────────┐                           │
│                    │ Agent Host  │ (Bridge)                  │
│                    │ .28.0.150   │                           │
└────────────────────┴─────────────┴───────────────────────────┘
                     │ .10.1.10    │
┌────────────────────┴─────────────┴───────────────────────────┐
│ Agent Network (10.10.0.0/16)                                 │
│                                                               │
│  Subnet 10.10.2.0/24 (Isolated Targets)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ SSH      │ │ Web      │ │ Database │ │ FTP      │        │
│  │.10.2.10  │ │.10.2.20  │ │.10.2.30  │ │.10.2.40  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│  ┌──────────┐ ┌──────────┐                                   │
│  │ VNC      │ │ File Srv │                                   │
│  │.10.2.50  │ │.10.2.60  │                                   │
│  └──────────┘ └──────────┘                                   │
│                                                               │
│  Subnet 10.10.3.0/24 (Additional Discovery Targets)          │
│  ┌──────────┐ ┌──────────┐                                   │
│  │ Web2     │ │ SSH2     │                                   │
│  │.10.3.10  │ │.10.3.20  │                                   │
│  └──────────┘ └──────────┘                                   │
└───────────────────────────────────────────────────────────────┘
```

### Key Features

- **Network Isolation**: Isolated hosts (10.10.x.x) are NOT accessible from NOP internal network (172.28.x.x)
- **Agent Host Bridge**: Agent host has interfaces on both networks, simulating a compromised host
- **Realistic Targets**: Multiple vulnerable services (SSH, Web, DB, FTP, VNC, File servers)
- **Multi-Subnet**: Two subnets in agent network for testing network discovery
- **POV Testing**: Frontend can only see isolated hosts when viewing from agent POV

## Quick Start

### 1. Start the Environment

```bash
cd /workspaces/NOP/test-environment

# Start agent POV environment
docker-compose -f docker-compose.agent-pov.yml up -d

# Setup networking and verify isolation
./setup-agent-pov.sh
```

### 2. Deploy Agent

```bash
# Copy agent to agent-host
docker cp /workspaces/NOP/agent.py agent-pov-host:/downloads/agent.py

# Option A: Interactive deployment
docker exec -it agent-pov-host bash
cd /downloads
python3 agent.py --backend-url http://backend:8000

# Option B: Using helper scripts
docker exec -it agent-pov-host run-agent.sh
```

### 3. Verify Agent POV

```bash
# Check network visibility from agent-host
docker exec -it agent-pov-host check-network.sh

# Scan isolated network
docker exec agent-pov-host nmap -sn 10.10.0.0/16

# Verify backend CANNOT reach isolated hosts
docker exec backend ping -c 2 10.10.2.10  # Should fail
```

### 4. Test in Frontend

1. Navigate to Agents page
2. Locate the deployed agent (should show as active)
3. Click "View from Agent POV" or switch POV mode
4. Verify dashboard/topology shows isolated hosts (10.10.x.x)
5. Switch back to normal view - isolated hosts should disappear

## Isolated Targets

| Service | IP | Credentials/Vulnerabilities |
|---------|----|-----------------------------|
| SSH Server | 10.10.2.10 | user: test, pass: test |
| Web Server | 10.10.2.20 | Apache with exploits |
| Database | 10.10.2.30 | root/root123, dbuser/dbpass123 |
| FTP Server | 10.10.2.40 | vsftpd 2.3.4 backdoor (CVE-2011-2523) |
| VNC Server | 10.10.2.50 | password: password |
| File Server | 10.10.2.60 | SMB open shares |
| Web Server 2 | 10.10.3.10 | Different subnet for discovery |
| SSH Server 2 | 10.10.3.20 | Different subnet for discovery |

## Testing Scenarios

### Scenario 1: Network Discovery from Agent POV

```bash
# Deploy agent on agent-host
docker exec agent-pov-host run-agent.sh

# Agent should discover:
# - 10.10.2.10 (SSH)
# - 10.10.2.20 (Web)
# - 10.10.2.30 (DB)
# - 10.10.2.40 (FTP)
# - 10.10.2.50 (VNC)
# - 10.10.2.60 (File)
# - 10.10.3.10 (Web2)
# - 10.10.3.20 (SSH2)

# Verify in frontend:
# - Switch to agent POV
# - Check Assets/Topology pages show 10.10.x.x hosts
# - Switch to normal view
# - Verify 10.10.x.x hosts are NOT shown
```

### Scenario 2: Vulnerability Scanning

```bash
# From agent POV, scan isolated targets
# Agent should detect vulnerabilities on 10.10.x.x network
# These vulnerabilities should only appear in agent POV mode
```

### Scenario 3: Credential Discovery

```bash
# Agent discovers credentials on isolated network
# Credentials for 10.10.x.x hosts should be POV-specific
# Test AccessHub from agent POV
```

## Helper Scripts

### On Agent Host

- `/usr/local/bin/download-agent.sh` - Download agent from backend
- `/usr/local/bin/run-agent.sh` - Execute agent with configuration
- `/usr/local/bin/check-network.sh` - Verify network setup and connectivity

### On Host Machine

- `./setup-agent-pov.sh` - Configure environment and verify isolation

## Troubleshooting

### Agent host cannot reach backend

```bash
# Check connectivity
docker exec agent-pov-host ping 172.28.0.2

# Check routing
docker exec agent-pov-host ip route
```

### Backend can reach isolated hosts (isolation broken)

```bash
# This should FAIL (100% packet loss)
docker exec backend ping -c 2 10.10.2.10

# If it succeeds, check network configuration
docker network inspect agent-network
docker network inspect nop_nop-internal
```

### Agent not showing in frontend

```bash
# Check agent registration
docker logs agent-pov-host

# Check backend logs
docker logs backend

# Verify WebSocket connection
docker exec agent-pov-host netstat -an | grep 8000
```

### POV mode not filtering data

```bash
# Check agent POV middleware
grep -r "get_agent_pov" backend/app/

# Verify frontend POV context
grep -r "usePOV" frontend/src/

# Check API requests include agent_pov parameter
# Open browser DevTools → Network → Check query params
```

## Cleanup

```bash
# Stop environment
docker-compose -f docker-compose.agent-pov.yml down

# Remove networks and volumes
docker-compose -f docker-compose.agent-pov.yml down -v

# Full cleanup including images
docker-compose -f docker-compose.agent-pov.yml down --rmi all -v
```

## Integration with Main Test Environment

This environment is separate from the main test-environment (docker-compose.yml) but can run simultaneously:

```bash
# Start main environment
cd /workspaces/NOP/test-environment
docker-compose up -d

# Start agent POV environment
docker-compose -f docker-compose.agent-pov.yml up -d

# Both environments share the nop_nop-internal network
# but have separate isolated networks
```

## Development Notes

- Agent host has NET_ADMIN capability for IP forwarding
- IP forwarding enabled on agent-host: `net.ipv4.ip_forward=1`
- No direct routing between nop-internal and agent-network
- Agent host acts as the only bridge between networks
- Simulates real-world agent deployment on remote network segment

## Related Documentation

- [Agent Testing Guide](AGENT-TESTING-GUIDE.md)
- [Main Test Environment](README.md)
- [Backend Agent API](../docs/technical/agent-api.md)
- [Frontend POV Context](../docs/technical/pov-context.md)
