# Agent Functionality - Visual Reference

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              NOP C2 SERVER (System X)                    │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                         FRONTEND (React)                           │  │
│  │  ┌──────────┬──────────┬──────────┬──────────┬──────────────────┐ │  │
│  │  │Dashboard │ Assets   │ Scans    │ Traffic  │ Access │ Agents  │ │  │
│  │  └──────────┴──────────┴──────────┴──────────┴────────┴─────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │           POV SWITCHER (Context Selector)                    │  │  │
│  │  │  ○ C2 Local (192.168.1.100)                                 │  │  │
│  │  │  ● Agent: server01 (10.0.0.5)    ← ACTIVE                   │  │  │
│  │  │  ○ Agent: workstation (172.16.0.15)                         │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────┬──────────────────────────────────────┘  │
│                                 │ REST API / WebSocket                   │
│  ┌─────────────────────────────▼──────────────────────────────────────┐  │
│  │                        BACKEND (FastAPI)                           │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │  Agent Controller Service                                    │ │  │
│  │  │  • Agent Registration & Authentication                       │ │  │
│  │  │  • Command Queue Management                                  │ │  │
│  │  │  • Result Aggregation & Storage                             │ │  │
│  │  │  • Health Monitoring & Heartbeat Processing                 │ │  │
│  │  │  • Module Distribution & Versioning                         │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │  WebSocket Manager                                           │ │  │
│  │  │  • /ws/agent/{id}  ← Agent connections                      │ │  │
│  │  │  • Bidirectional messaging                                   │ │  │
│  │  │  • Connection pool & state management                        │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────┬──────────────────────────────────────┘  │
│                                 │                                         │
│  ┌─────────────────────────────▼──────────────────────────────────────┐  │
│  │                    DATABASE (PostgreSQL)                           │  │
│  │  • agents          • agent_commands     • agent_sessions          │  │
│  │  • agent_heartbeats (time-series)       • agent_modules           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ WebSocket over TLS (wss://)
                                 │ Encrypted, Bidirectional
                                 │
                ┌────────────────┼────────────────┬───────────────┐
                │                │                │               │
    ┌───────────▼──────────┐ ┌──▼──────────┐ ┌──▼─────────┐ ┌──▼─────────┐
    │  AGENT (System A)   │ │ AGENT (B)   │ │ AGENT (C)  │ │ AGENT (D)  │
    │  server01           │ │ workstation │ │ gateway    │ │ laptop     │
    │  10.0.0.5           │ │ 172.16.0.15 │ │ 10.1.1.1   │ │ 10.2.2.2   │
    ├─────────────────────┤ ├─────────────┤ ├────────────┤ ├────────────┤
    │ ┌─────────────────┐ │ │             │ │            │ │            │
    │ │ CORE MODULE     │ │ │   (Same     │ │   (Same    │ │   (Same    │
    │ │ • Check-in      │ │ │  structure  │ │  structure │ │  structure │
    │ │ • Heartbeat     │ │ │   as left)  │ │   as left) │ │   as left) │
    │ │ • Cmd Queue     │ │ │             │ │            │ │            │
    │ │ • TLS Comms     │ │ │             │ │            │ │            │
    │ └────────┬────────┘ │ │             │ │            │ │            │
    │ ┌────────▼────────┐ │ │             │ │            │ │            │
    │ │ CAPABILITY MODS │ │ │             │ │            │ │            │
    │ │ ┌─────────────┐ │ │ │             │ │            │ │            │
    │ │ │ Discovery   │ │ │ │             │ │            │ │            │
    │ │ │ (Built-in)  │ │ │ │             │ │            │ │            │
    │ │ └─────────────┘ │ │ │             │ │            │ │            │
    │ │ ┌─────────────┐ │ │ │             │ │            │ │            │
    │ │ │ Port Scan   │ │ │ │             │ │            │ │            │
    │ │ │ (On-demand) │ │ │ │             │ │            │ │            │
    │ │ └─────────────┘ │ │ │             │ │            │ │            │
    │ │ ┌─────────────┐ │ │ │             │ │            │ │            │
    │ │ │ Traffic Cap │ │ │ │             │ │            │ │            │
    │ │ │ (On-demand) │ │ │ │             │ │            │ │            │
    │ │ └─────────────┘ │ │ │             │ │            │ │            │
    │ │ ┌─────────────┐ │ │ │             │ │            │ │            │
    │ │ │ Access Test │ │ │ │             │ │            │ │            │
    │ │ │ (On-demand) │ │ │ │             │ │            │ │            │
    │ │ └─────────────┘ │ │ │             │ │            │ │            │
    │ └─────────────────┘ │ │             │ │            │ │            │
    └─────────────────────┘ └─────────────┘ └────────────┘ └────────────┘
            │                      │              │              │
            │ Monitors             │ Monitors     │ Monitors     │ Monitors
            ▼                      ▼              ▼              ▼
    Network 10.0.0.0/24   Network 172.16.0.0/16  Network      Network
    ┌─────────────────┐   ┌─────────────────┐   10.1.1.0/24  10.2.2.0/24
    │ Host .10        │   │ Host .20        │
    │ Host .15        │   │ Host .25        │
    │ Host .20        │   │ Host .30        │
    └─────────────────┘   └─────────────────┘
```

## Communication Flow

### 1. Agent Registration
```
Agent                          C2 Server
  │                               │
  │  POST /api/v1/agents/register │
  │ ─────────────────────────────>│
  │  {                            │
  │    agent_id: "abc123",        │
  │    hostname: "server01",      │
  │    os: "linux",               │
  │    capabilities: [...]        │
  │  }                            │
  │                               │
  │     Session Token (JWT)       │
  │ <─────────────────────────────│
  │  {                            │
  │    token: "eyJ...",           │
  │    c2_config: {...}           │
  │  }                            │
  │                               │
  │ WebSocket wss://c2/ws/agent/  │
  │        abc123                 │
  │ <────────────────────────────>│
  │     (Connection established)  │
  │                               │
```

### 2. Heartbeat Flow
```
Agent                          C2 Server
  │                               │
  │ Every 30s                     │
  │ ───────────────────────────>  │
  │  {                            │
  │    type: "heartbeat",         │
  │    cpu: 25.5,                 │
  │    memory: 1024,              │
  │    active_tasks: 2            │
  │  }                            │
  │                               │
  │     ACK                       │
  │ <─────────────────────────────│
  │                               │
  │ (Updates last_seen in DB)     │
```

### 3. Command Execution Flow
```
Operator                 C2 Server                  Agent
  │                         │                         │
  │ 1. Select POV: Agent    │                         │
  │    server01             │                         │
  │ ──────────────────────> │                         │
  │                         │                         │
  │ 2. Click "Discover      │                         │
  │    Network"             │                         │
  │ ──────────────────────> │                         │
  │                         │                         │
  │                         │ 3. Queue Command        │
  │                         │    (DB: agent_commands) │
  │                         │                         │
  │                         │ 4. Send Command         │
  │                         │ ──────────────────────> │
  │                         │  {                      │
  │                         │    type: "command",     │
  │                         │    command_id: "...",   │
  │                         │    module: "discovery", │
  │                         │    params: {...}        │
  │                         │  }                      │
  │                         │                         │
  │                         │                         │ 5. Execute
  │                         │                         │    Discovery
  │                         │                         │    on local
  │                         │                         │    network
  │                         │                         │
  │                         │ 6. Return Result        │
  │                         │ <────────────────────── │
  │                         │  {                      │
  │                         │    type: "result",      │
  │                         │    command_id: "...",   │
  │                         │    status: "success",   │
  │                         │    data: [hosts...]     │
  │                         │  }                      │
  │                         │                         │
  │                         │ 7. Store Result (DB)    │
  │                         │                         │
  │ 8. Display Results      │                         │
  │    (Agent's network)    │                         │
  │ <────────────────────── │                         │
  │                         │                         │
```

## POV Switching Behavior

### When POV = "C2 Local"
```
User clicks "Discover Network"
         │
         ▼
   Discovery Service
   (Local execution)
         │
         ▼
   Shows C2's network
   (192.168.1.0/24)
```

### When POV = "Agent: server01"
```
User clicks "Discover Network"
         │
         ▼
   Agent Controller
         │
         ▼
   Queue command for
   agent "server01"
         │
         ▼
   WebSocket → Agent
         │
         ▼
   Agent executes locally
         │
         ▼
   Result sent back
         │
         ▼
   Shows Agent's network
   (10.0.0.0/24)
```

## Module Loading

### Built-in Modules (Always Available)
```
agent binary (10MB)
├── core (2MB)
│   ├── registration
│   ├── heartbeat
│   ├── command queue
│   └── websocket client
└── basic modules (8MB)
    ├── discovery (ARP, ICMP)
    ├── system info
    └── network utils
```

### On-Demand Modules (Downloaded when needed)
```
Agent requests "port_scan" module
         │
         ▼
   C2 checks agent capabilities
         │
         ▼
   Sends module binary (5MB)
   via WebSocket
         │
         ▼
   Agent caches module
   in ~/.nop/modules/
         │
         ▼
   Module loaded & executed
         │
         ▼
   Results sent to C2
```

## Data Flow: Network Discovery Example

### Step-by-Step
```
1. Operator                 2. Frontend              3. Backend
   ┌────────────────┐          ┌──────────────┐        ┌────────────────┐
   │ Select POV:    │          │ POV Store:   │        │ Agent Service: │
   │ Agent server01 │ ───────> │ currentPOV = │ ────>  │ Check agent    │
   │                │          │ "agent:abc"  │        │ status         │
   └────────────────┘          └──────────────┘        └────────────────┘
                                                                │
   ┌────────────────┐          ┌──────────────┐                │
   │ Click:         │          │ Call API:    │                │
   │ "Discover      │ ───────> │ POST /api/v1 │ ───────────────┘
   │ Network"       │          │ /agents/abc/ │
   └────────────────┘          │ commands     │
                               └──────────────┘
                                                                │
4. Database                5. WebSocket              6. Agent
   ┌────────────────┐          ┌──────────────┐        ┌────────────────┐
   │ INSERT INTO    │          │ Send command │        │ Receive cmd    │
   │ agent_commands │ ───────> │ to agent via │ ────>  │ via WebSocket  │
   │ (queued)       │          │ WebSocket    │        │                │
   └────────────────┘          └──────────────┘        └────────────────┘
                                                                │
                                                                ▼
                                                        ┌────────────────┐
                                                        │ Execute:       │
                                                        │ ARP scan on    │
                                                        │ 10.0.0.0/24    │
                                                        └────────────────┘
                                                                │
   ┌────────────────┐          ┌──────────────┐                │
   │ UPDATE         │          │ Receive      │                │
   │ agent_commands │ <─────── │ result via   │ <──────────────┘
   │ (completed)    │          │ WebSocket    │
   │ Store result   │          │              │
   └────────────────┘          └──────────────┘
                                      │
7. Frontend Update                    │
   ┌────────────────┐                 │
   │ Poll for       │                 │
   │ results OR     │ <───────────────┘
   │ WebSocket      │
   │ notification   │
   └────────────────┘
           │
           ▼
   ┌────────────────┐
   │ Display hosts: │
   │ • 10.0.0.5     │
   │ • 10.0.0.10    │
   │ • 10.0.0.15    │
   │                │
   │ Source: Agent  │
   │ server01       │
   └────────────────┘
```

## Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TRANSPORT SECURITY                                         │
│     ┌──────────────────────────────────────────────────────┐  │
│     │ TLS 1.3 Encryption                                   │  │
│     │ • Certificate validation (optional pinning)          │  │
│     │ • Strong cipher suites only                          │  │
│     └──────────────────────────────────────────────────────┘  │
│                                                                 │
│  2. AUTHENTICATION                                             │
│     ┌──────────────────────────────────────────────────────┐  │
│     │ Agent Registration                                   │  │
│     │ • Pre-shared key OR                                  │  │
│     │ • Challenge-response                                 │  │
│     │ → JWT session token (24h expiry)                     │  │
│     └──────────────────────────────────────────────────────┘  │
│                                                                 │
│  3. AUTHORIZATION                                              │
│     ┌──────────────────────────────────────────────────────┐  │
│     │ Role-Based Access Control                            │  │
│     │ • Admin: Full control                                │  │
│     │ • Operator: Execute commands                         │  │
│     │ • Viewer: Read-only                                  │  │
│     └──────────────────────────────────────────────────────┘  │
│                                                                 │
│  4. COMMAND VALIDATION                                         │
│     ┌──────────────────────────────────────────────────────┐  │
│     │ • Whitelist allowed commands                         │  │
│     │ • Parameter sanitization                             │  │
│     │ • Rate limiting per agent                            │  │
│     └──────────────────────────────────────────────────────┘  │
│                                                                 │
│  5. OBFUSCATION (Optional)                                     │
│     ┌──────────────────────────────────────────────────────┐  │
│     │ Agent Binary                                         │  │
│     │ • Symbol obfuscation (Garble)                        │  │
│     │ • String encryption                                  │  │
│     │ • Debug symbol stripping                             │  │
│     └──────────────────────────────────────────────────────┘  │
│                                                                 │
│  6. OPERATIONAL SECURITY                                       │
│     ┌──────────────────────────────────────────────────────┐  │
│     │ • Configurable check-in jitter                       │  │
│     │ • Domain fronting support                            │  │
│     │ • Traffic shaping (mimic HTTPS)                      │  │
│     └──────────────────────────────────────────────────────┘  │
│                                                                 │
│  7. AUDIT & LOGGING                                            │
│     ┌──────────────────────────────────────────────────────┐  │
│     │ All commands logged with:                            │  │
│     │ • Timestamp                                          │  │
│     │ • User who issued command                            │  │
│     │ • Agent ID                                           │  │
│     │ • Command details                                    │  │
│     │ • Result status                                      │  │
│     └──────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Performance Expectations

### Agent Performance
```
┌─────────────────┬──────────┬─────────────┐
│ Metric          │ Target   │ Maximum     │
├─────────────────┼──────────┼─────────────┤
│ Binary Size     │ 10MB     │ 15MB        │
│ Idle Memory     │ 50MB     │ 100MB       │
│ Idle CPU        │ 0.5%     │ 1%          │
│ Check-in Freq   │ 30s      │ Adjustable  │
│ Network (idle)  │ 500 B/s  │ 1KB/s       │
└─────────────────┴──────────┴─────────────┘
```

### C2 Performance
```
┌─────────────────────┬──────────┬─────────────┐
│ Metric              │ Target   │ Maximum     │
├─────────────────────┼──────────┼─────────────┤
│ Concurrent Agents   │ 50       │ 100         │
│ Cmd Delivery Latency│ 50ms     │ 100ms       │
│ Result Latency      │ 100ms    │ 200ms       │
│ DB Query Time       │ 10ms     │ 50ms        │
│ WebSocket Msg/sec   │ 100      │ 500         │
└─────────────────────┴──────────┴─────────────┘
```

### Network Discovery Performance
```
Network Size: /24 (254 hosts)
Method: Combined (ARP + ICMP)

┌─────────────┬────────────────┐
│ Environment │ Time           │
├─────────────┼────────────────┤
│ Local LAN   │ 5-10 seconds   │
│ Remote      │ 15-30 seconds  │
│ High Latency│ 30-60 seconds  │
└─────────────┴────────────────┘
```

---

**Legend:**
- `→` Direction of data flow
- `┌─┐` Component boundary
- `│` Vertical connection
- `─` Horizontal connection
- `▼` Flow direction
- `●` Active/Selected
- `○` Inactive/Available

**For Full Details:**
- Architecture: `.project/agent-architecture-design.md`
- Implementation: `.project/agent-implementation-roadmap.md`
- Quick Summary: `.project/agent-design-summary.md`
