# NOP Agent Modules - Updated Architecture

## Overview

NOP Agents are **proxy relays** that collect data from remote networks and stream it back to the main NOP C2 server for processing. The agent acts as a lightweight collector while all heavy processing, analysis, and storage happens on the C2 server.

## Agent Types

### Python Agent 🐍
- **Use Case**: Quick deployment, flexibility
- **Benefits**: No compilation needed, easy to modify
- **Requirements**: Python 3.8+, pip packages (websockets, psutil, scapy)
- **Deployment**: Copy script, install dependencies, run

### Go Agent 🔷
- **Use Case**: Cross-platform deployment
- **Benefits**: Single binary, no dependencies, fast
- **Cross-Compilation**:
  ```bash
  # Linux (AMD64)
  GOOS=linux GOARCH=amd64 go build -o nop-agent-linux
  
  # Windows (AMD64)
  GOOS=windows GOARCH=amd64 go build -o nop-agent.exe
  
  # macOS (AMD64)
  GOOS=darwin GOARCH=amd64 go build -o nop-agent-macos
  
  # Linux (ARM64) - For Raspberry Pi, ARM servers
  GOOS=linux GOARCH=arm64 go build -o nop-agent-arm
  ```
- **Deployment**: Copy binary, execute

## Module System

Each agent can have the following modules enabled/disabled:

### 1. Asset Module 🔵
**Purpose**: Network asset discovery and monitoring

**Capabilities**:
- ARP scanning for live hosts
- Device fingerprinting
- MAC address tracking
- Online/offline status monitoring
- Subnet mapping

**Data Relayed to C2**:
- Discovered IP addresses
- MAC addresses
- Device status (online/offline)
- Discovery timestamps
- Network range information

**Update Frequency**: Every 5 minutes

### 2. Traffic Module 🟣
**Purpose**: Network traffic monitoring and analysis

**Capabilities**:
- Network interface statistics
- Packet counters (sent/received)
- Bytes transferred tracking
- Error rate monitoring
- Real-time traffic metrics

**Data Relayed to C2**:
- Bytes sent/received
- Packets sent/received
- Error counts
- Interface statistics
- Traffic timestamps

**Update Frequency**: Every 1 minute

### 3. Host Module 🟢
**Purpose**: Local system information and resource monitoring

**Capabilities**:
- System information collection
- CPU utilization monitoring
- Memory usage tracking
- Disk space monitoring
- Platform detection

**Data Relayed to C2**:
- Hostname
- OS type and version
- Architecture (x86_64, arm64, etc.)
- CPU usage percentage
- Memory usage percentage
- Disk usage percentage
- System boot time
- Processor information

**Update Frequency**: Every 2 minutes

### 4. Access Module 🟡
**Purpose**: Remote command execution and access

**Capabilities**:
- Execute shell commands
- File transfer operations
- Process management
- Service control
- Configuration retrieval

**Data Relayed to C2**:
- Command execution results
- File contents
- Process lists
- Service status
- Configuration dumps

**Update Frequency**: On-demand (C2 triggered only)

**Security Note**: Access module is disabled by default and only responds to authenticated C2 commands.

## Proxy Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Remote Network (Agent)                    │
│                                                                │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │ Asset Module │   │Traffic Module│   │  Host Module │     │
│  │              │   │              │   │              │     │
│  │  Discovers   │   │   Monitors   │   │  Collects    │     │
│  │  192.168.x.x │   │   Traffic    │   │  System Info │     │
│  └───────┬──────┘   └───────┬──────┘   └───────┬──────┘     │
│          │                  │                   │             │
│          └──────────────────┴───────────────────┘             │
│                             │                                 │
│                     ┌───────▼────────┐                        │
│                     │  NOP Agent     │                        │
│                     │  (Proxy Relay) │                        │
│                     └───────┬────────┘                        │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                              │ WebSocket Connection
                              │ (Data Stream)
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│                     NOP C2 Server                              │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │          Data Processing & Analysis                     │   │
│  │                                                         │   │
│  │  • Asset database storage                              │   │
│  │  • Traffic analysis and visualization                  │   │
│  │  • Host monitoring and alerts                          │   │
│  │  • Command execution and response handling             │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │          NOP Web Dashboard                              │   │
│  │                                                         │   │
│  │  User views data through "Agent POV"                   │   │
│  │  - Switch between different agents                      │   │
│  │  - See network as agent sees it                         │   │
│  │  - All NOP features work through agent perspective      │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

## Agent POV (Point of View)

When you **Switch POV** to an agent in the NOP dashboard:

### What Changes:
1. **Header**: Shows "NOP - [AGENT NAME]" in purple
2. **Purple Banner**: "AGENT POV ACTIVE" notification
3. **Data Source**: All pages show data FROM that agent
4. **Dashboard**: Stats from agent's network
5. **Assets Page**: Devices discovered by agent
6. **Traffic Page**: Traffic monitored by agent
7. **Host Page**: Systems in agent's network

### What Stays The Same:
- NOP interface and functionality
- All features available
- Processing power of C2 server
- Data storage and analysis

The agent is simply a **data collector** - the NOP application stack runs entirely on your C2 server, just using the agent's data stream.

## Example Use Cases

### Use Case 1: Branch Office Monitoring
**Scenario**: Monitor remote branch office network (192.168.50.0/24) from headquarters

**Setup**:
1. Create agent "Branch Office Monitor"
2. Enable: Asset, Traffic, Host modules
3. Deploy Python agent to branch office server
4. Agent discovers 24 devices on 192.168.50.x network
5. Traffic flows back to headquarters C2
6. Switch POV to see branch office network

### Use Case 2: DMZ Monitoring
**Scenario**: Monitor DMZ network segment from internal network

**Setup**:
1. Create agent "DMZ Monitor" (Go for performance)
2. Enable: Asset, Traffic, Host modules
3. Deploy Go binary to DMZ host
4. Agent monitors DMZ assets and traffic
5. Data relayed to internal C2 server
6. View DMZ status without direct access

### Use Case 3: Air-Gapped Network Collection
**Scenario**: Collect data from isolated network

**Setup**:
1. Create agent with offline delivery mode
2. Enable: Asset, Host modules only
3. Deploy agent to isolated network
4. Agent collects and buffers data
5. Periodic manual data extraction
6. Import data into C2 for analysis

### Use Case 4: Multi-Site Deployment
**Scenario**: Monitor 5 different office locations

**Setup**:
1. Create 5 agents (one per site)
2. Enable all modules on each
3. Deploy appropriate type per site
4. Each agent streams site data
5. Switch POV between sites
6. Unified view of entire enterprise

## Configuration

### Minimal Configuration (Monitoring Only)
```json
{
  "asset": true,
  "traffic": true,
  "host": false,
  "access": false
}
```

### Standard Configuration (Full Visibility)
```json
{
  "asset": true,
  "traffic": true,
  "host": true,
  "access": false
}
```

### Advanced Configuration (With Access)
```json
{
  "asset": true,
  "traffic": true,
  "host": true,
  "access": true
}
```

## Security Considerations

1. **Agent Authentication**: Each agent has unique auth token
2. **Encrypted Transport**: WebSocket connections use TLS (if configured)
3. **Module Isolation**: Disabled modules don't load code
4. **Access Control**: Access module requires explicit C2 commands
5. **No Data Storage**: Agents don't store collected data locally
6. **Least Privilege**: Agents run with minimal required permissions

## Performance

### Python Agent:
- **Memory**: ~50-100MB depending on modules
- **CPU**: <5% idle, <20% during active scanning
- **Network**: Minimal (heartbeat + data relay)

### Go Agent:
- **Memory**: ~20-40MB depending on modules
- **CPU**: <2% idle, <10% during active scanning
- **Network**: Minimal (heartbeat + data relay)
- **Binary Size**: 5-15MB (all dependencies included)

## Troubleshooting

### Agent Won't Connect
1. Check C2 server URL is correct
2. Verify firewall allows WebSocket connection
3. Confirm auth token matches
4. Check agent logs for errors

### Missing Data
1. Verify module is enabled
2. Check agent is ONLINE status
3. Confirm network access for discovery
4. Review module-specific permissions

### High Resource Usage
1. Disable unused modules
2. Increase update intervals
3. Limit asset discovery scope
4. Use Go agent instead of Python

## Future Enhancements

- **Custom module development**
- **Plugin system for extensions**
- **Agent-to-agent mesh networking**
- **Automated agent updates**
- **Enhanced traffic capture (full pcap)**
- **Vulnerability scanning integration**
