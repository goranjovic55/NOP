# Network Connectivity Guide

## Architecture Overview

NOP uses a hybrid network architecture for maximum functionality and portability:

### Services Network Configuration

| Service | Network Mode | Purpose |
|---------|--------------|---------|
| **Backend** | `host` | See real network interfaces for packet capture |
| **Guacd** | `bridge` (dual) | Reach internal services + test hosts |
| **Postgres** | `bridge` | Internal database, no external exposure |
| **Redis** | `bridge` | Internal cache, no external exposure |
| **Frontend** | `bridge` | Public UI access on port 12000 |

### Network Topology

```
┌─────────────────────────────────────────────────────┐
│ Host Network (e.g., 192.168.1.0/24, 10.0.0.0/16)  │
│                                                     │
│  Backend (host mode) ─┐                            │
│  Guacd (bridge) ──────┼─ Cannot reach host LAN    │
└───────────────────────┼─────────────────────────────┘
                        │
                        ├─ 172.28.0.0/16 (nop-internal)
                        │  ├─ 172.28.0.10 (postgres)
                        │  ├─ 172.28.0.11 (redis)
                        │  └─ 172.28.0.12 (guacd)
                        │
                        └─ 172.21.0.0/16 (test-network)
                           ├─ 172.21.0.50 (rdp-server)
                           ├─ 172.21.0.51 (vnc-server)
                           └─ 172.21.0.69 (ssh-server)
```

## VNC/RDP Remote Access

### Supported Scenarios

✅ **Works**: Test containers on test-network (172.21.0.x)
- RDP to 172.21.0.50
- VNC to 172.21.0.51
- SSH to 172.21.0.69

✅ **Works**: Docker containers on nop-internal (172.28.0.x)

❌ **Limited**: Real LAN hosts (192.168.x.x, 10.x.x.x)
- Guacd in bridge mode cannot reach hosts outside Docker networks
- Backend can discover these hosts via passive discovery
- But Guacamole VNC/RDP connections will fail

### Workarounds for Real LAN Hosts

#### Option 1: Connect Guacd to Your Network (Manual)

If you need VNC/RDP to real LAN hosts, connect guacd to your Docker network:

```bash
# Find your network bridge
docker network ls

# Connect guacd to it
docker network connect YOUR_NETWORK_NAME nop-guacd

# Restart guacd
docker compose restart guacd
```

#### Option 2: Use SSH for Remote Access

SSH works because the backend (in host mode) handles SSH connections directly, not through guacd.

#### Option 3: Deploy VNC/RDP Servers in Docker

For managed access, run VNC/RDP servers as containers on known networks.

## Why Not Host Mode for Guacd?

**Portability**: If guacd runs in `network_mode: host`, it binds to port 4822 on the host. This causes conflicts if:
- Another service uses port 4822
- Multiple NOP instances run on the same host
- System firewalls block the port

**Our Choice**: Bridge mode with static IP (172.28.0.12) ensures:
- No port conflicts
- Works on any system out of the box
- Predictable, repeatable deployments

## Trade-offs

| Configuration | Pros | Cons |
|---------------|------|------|
| **Current (Bridge)** | ✅ Portable<br>✅ No conflicts<br>✅ Works for test containers | ❌ Can't reach real LAN hosts |
| **Host Mode** | ✅ Reach any network<br>✅ Full LAN access | ❌ Port 4822 conflicts<br>❌ Not portable<br>❌ Security concerns |

## Future Improvements

Potential solutions for full LAN access while maintaining portability:

1. **Dynamic Network Detection**: Auto-connect guacd to detected networks
2. **Backend Proxy Mode**: Route VNC/RDP through backend instead of direct guacd
3. **Custom Port Configuration**: Allow users to configure guacd port
4. **Network Plugin System**: Extensible network connectivity

## Summary

The current architecture prioritizes **portability** and **reliability** over unrestricted network access. For development and testing with Docker-based targets, it works perfectly. For production use with real LAN hosts, manual network configuration may be required.
