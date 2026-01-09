# NOP Agent/C2 Visual Mockups - Updated (Python/Go with Modules)

## 1. Agents Page - Empty State

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  NOP                                                  ⚡SYSTEM ONLINE  14:32:15║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  AGENT MANAGEMENT                              [+ CREATE AGENT]             ║
║  Deploy and manage clone agents for remote network operations               ║
║                                                                              ║
║                                                                              ║
║                                  ◎                                          ║
║                                                                              ║
║                         NO AGENTS DEPLOYED                                  ║
║                                                                              ║
║              Create your first agent to start remote network operations      ║
║                                                                              ║
║                                                                              ║
║                          [+ CREATE AGENT]                                   ║
║                                                                              ║
║                                                                              ║
║                                                                              ║
║                                                                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## 2. Agents Page - With Multiple Agents (Python/Go, New Modules)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  NOP                                                  ⚡SYSTEM ONLINE  14:32:45║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  AGENT MANAGEMENT                              [+ CREATE AGENT]             ║
║  Deploy and manage clone agents for remote network operations               ║
║                                                                              ║
║  ┌────────────────────────────┬────────────────────────────┬──────────────┐ ║
║  │ 🐍  REMOTE OFFICE ALPHA    │ 🔷  DATACENTER MONITOR     │ 🐍  BRANCH   │ ║
║  │ Monitoring remote branch   │ Production DC monitoring   │ Office B     │ ║
║  │                          ● │                          ● │            ● │ ║
║  │ Type: PYTHON               │ Type: GO                   │ Type: PYTHON │ ║
║  │ Status: ONLINE             │ Status: ONLINE             │ Status: OFFL │ ║
║  │ Last Seen:                 │ Last Seen:                 │ Last Seen:   │ ║
║  │   12/28/2025, 2:32:15 PM   │   12/28/2025, 2:32:18 PM   │   12/28, 9:15│ ║
║  │                            │                            │              │ ║
║  │ MODULES:                   │ MODULES:                   │ MODULES:     │ ║
║  │ ┌──────┐ ┌─────────┐      │ ┌──────┐ ┌─────────┐      │ ┌──────┐     │ ║
║  │ │ASSET │ │ TRAFFIC │      │ │ASSET │ │ TRAFFIC │      │ │ASSET │     │ ║
║  │ └──────┘ └─────────┘      │ └──────┘ └─────────┘      │ └──────┘     │ ║
║  │ ┌──────┐ ┌─────────┐      │ ┌──────┐ ┌─────────┐      │ ┌──────┐     │ ║
║  │ │ HOST │ │ ACCESS  │      │ │ HOST │ │ ACCESS  │      │ │ HOST │     │ ║
║  │ └──────┘ └─────────┘      │ └──────┘ └─────────┘      │ └──────┘     │ ║
║  │                            │                            │              │ ║
║  │ [DOWNLOAD] [SWITCH POV] [×]│ [DOWNLOAD] [SWITCH POV] [×]│[DOWNLOAD][×] │ ║
║  └────────────────────────────┴────────────────────────────┴──────────────┘ ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Legend:
  ● Green = ONLINE
  ● Gray = OFFLINE
  🐍 = Python Agent
  🔷 = Go Agent (cross-platform)
  
Module Colors:
  ASSET (blue) - Network asset discovery
  TRAFFIC (purple) - Traffic monitoring
  HOST (green) - System information
  ACCESS (yellow) - Remote command execution
```

## 3. Create Agent Modal - Updated (Python/Go with Modules)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CREATE NEW AGENT                                                         [×]║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  AGENT NAME *                                                                ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ Remote Office Alpha                                                  │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  DESCRIPTION                                                                 ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ Monitoring remote branch office network                              │   ║
║  │                                                                      │   ║
║  │                                                                      │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  AGENT TYPE * (Python for ease, Go for cross-platform)                      ║
║  ┌──────────────────────────────┬──────────────────────────────────────┐   ║
║  │          🐍                   │          🔷                           │   ║
║  │                               │                                      │   ║
║  │         PYTHON                │           GO                         │   ║
║  │  (Selected - Red Highlight)   │    (Cross-compilation)               │   ║
║  └──────────────────────────────┴──────────────────────────────────────┘   ║
║                                                                              ║
║  CONNECTION URL *                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ ws://localhost:12001/api/v1/agents/{agent_id}/connect               │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  MODULES (Agent relays data to C2 server)                                   ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ ☑ ASSET MODULE                                                       │   ║
║  │   Network asset discovery                                            │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ ☑ TRAFFIC MODULE                                                     │   ║
║  │   Traffic monitoring                                                 │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ ☑ HOST MODULE                                                        │   ║
║  │   System information                                                 │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ ☐ ACCESS MODULE                                                      │   ║
║  │   Remote command execution                                           │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║                                              [CANCEL]  [CREATE AGENT]        ║
╚══════════════════════════════════════════════════════════════════════════════╝

Notes:
  - Python: Easy deployment, no compilation needed
  - Go: Single binary, cross-platform (Linux, Windows, macOS, ARM)
  - Each module can be enabled/disabled independently
  - Agent acts as proxy, relaying data to C2 server for processing
```

## 4. Agent POV Active - Dashboard

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  AGENT POV ACTIVE: REMOTE OFFICE ALPHA                      [EXIT POV]      ║
║  All data is now streamed from this agent's perspective                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  NOP - REMOTE OFFICE ALPHA          ● AGENT POV ACTIVE    ⚡SYSTEM ONLINE    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌──────────────────┬──────────────────┬──────────────────┬────────────────┐║
║  │ TOTAL ASSETS     │ ONLINE ASSETS    │ ACTIVE SCANS     │ ACTIVE CONNS   ││
║  │       24         │       18         │        2         │        0       ││
║  └──────────────────┴──────────────────┴──────────────────┴────────────────┘║
║                                                                              ║
║  NETWORK TRAFFIC                        ASSET DISTRIBUTION                  ║
║  Data from Remote Office Alpha          Devices in 192.168.50.x             ║
║  ┌───────────────────────────────┐     ┌───────────────────────────────┐   ║
║  │                          ▄▄▄  │     │ 💻 Workstations     15        │   ║
║  │                      ▄▄▄████  │     │ 🖨 Printers          3        │   ║
║  │              ▄▄▄▄▄▄▄███████  │     │ 📱 Mobile            4        │   ║
║  │      ▄▄▄▄▄▄▄█████████████    │     │ ❓ Unknown           2        │   ║
║  │  ▄▄▄███████████████████       │     │                               │   ║
║  │ ███████████████████████        │     │ Total: 24 devices             │   ║
║  └───────────────────────────────┘     └───────────────────────────────┘   ║
║                                                                              ║
║  RECENT EVENTS                                                               ║
║  From Remote Office Alpha                                                    ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │ 14:30:15  Asset discovered: 192.168.50.25 (PC-SALES-03)              │   ║
║  │ 14:28:42  Scan completed: 192.168.50.0/24 (0 vulnerabilities)        │   ║
║  │ 14:25:18  Traffic spike detected on interface eth0                   │   ║
║  │ 14:20:33  Asset went offline: 192.168.50.100                         │   ║
║  │ 14:15:22  New device detected: 192.168.50.150 (Unknown)              │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Note: Purple banner and header indicate Agent POV is active
      All statistics and data are from the agent's remote network
      C2 server processes all data - agent is just a relay
```

## 5. Navigation with Agents

```
╔══════════════════════════════════════════╗
║  NOP                                     ║
╠══════════════════════════════════════════╣
║                                          ║
║  ◆ DASHBOARD                             ║
║  ◆ ASSETS                                ║
║  ◆ TRAFFIC                               ║
║  ◆ SECURITY                              ║
║  ◆ ACCESS HUB                            ║
║                                          ║
║  ◈ AGENTS                         (3)    ║
║    └─ Remote Office Alpha (ONLINE)       ║
║    └─ Datacenter Monitor (ONLINE)        ║
║    └─ Branch Office B (OFFLINE)          ║
║                                          ║
║  ◆ HOST                                  ║
║  ◆ SETTINGS                              ║
║  ◆ LOGOUT                                ║
║                                          ║
╚══════════════════════════════════════════╝

Note: (3) badge shows count of connected agents
      Purple indicator shows which agent has active POV
```

## 6. Detailed Agent Card (Go Agent with All Modules)

```
┌────────────────────────────────────────────────────────┐
│ 🔷  DATACENTER MONITOR                               ● │
│ Production DC monitoring                               │
│                                                        │
│ Type: GO                                               │
│ Status: ONLINE                                         │
│ Last Seen: 12/28/2025, 2:32:18 PM                      │
│                                                        │
│ MODULES:                                               │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────┐│
│ │   ASSET    │ │  TRAFFIC   │ │    HOST    │ │ACCESS││
│ │   (Blue)   │ │  (Purple)  │ │   (Green)  │ │(Ylw) ││
│ └────────────┘ └────────────┘ └────────────┘ └──────┘│
│                                                        │
│ Connection: ws://10.0.0.1:12001/api/v1/agents/...     │
│ Subnet: 10.10.10.0/24                                  │
│ Assets Discovered: 48                                  │
│                                                        │
│ [DOWNLOAD]  [SWITCH POV]  [×]                          │
└────────────────────────────────────────────────────────┘

Go Agent Benefits:
  ✓ Single binary - no dependencies
  ✓ Cross-compile for any platform
  ✓ Low resource usage (~20MB RAM)
  ✓ Fast startup and execution
```

## 7. Agent Download Options

```
╔══════════════════════════════════════════════════════════╗
║  DOWNLOAD AGENT: DATACENTER MONITOR                      ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Agent Type: GO                                          ║
║                                                          ║
║  Select Platform:                                        ║
║  ┌──────────────────────────────────────────────────┐   ║
║  │ ● Linux (AMD64)      - nop-agent-linux           │   ║
║  │ ○ Windows (AMD64)    - nop-agent.exe             │   ║
║  │ ○ macOS (AMD64)      - nop-agent-macos           │   ║
║  │ ○ Linux (ARM64)      - nop-agent-arm             │   ║
║  │ ○ Source Code (.go)  - Build yourself            │   ║
║  └──────────────────────────────────────────────────┘   ║
║                                                          ║
║  Download includes:                                      ║
║  • Compiled binary with all dependencies                 ║
║  • Connection URL pre-configured                         ║
║  • Auth token embedded                                   ║
║  • Enabled modules: Asset, Traffic, Host, Access         ║
║                                                          ║
║  Deployment:                                             ║
║  1. Copy binary to target system                         ║
║  2. Make executable: chmod +x nop-agent-linux            ║
║  3. Run: ./nop-agent-linux                               ║
║                                                          ║
║                              [CANCEL]  [DOWNLOAD]        ║
╚══════════════════════════════════════════════════════════╝
```

## 8. Agent Module Status (Real-time)

```
┌────────────────────────────────────────────────────────┐
│ REMOTE OFFICE ALPHA - Module Status                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 🔵 ASSET MODULE           [ACTIVE]                     │
│    Last Discovery: 2 min ago                           │
│    Assets Found: 24                                    │
│    Next Scan: 3 min                                    │
│                                                        │
│ 🟣 TRAFFIC MODULE         [ACTIVE]                     │
│    Last Update: 15 sec ago                             │
│    Bytes Sent: 1.2 GB                                  │
│    Bytes Recv: 3.4 GB                                  │
│    Next Update: 45 sec                                 │
│                                                        │
│ 🟢 HOST MODULE            [ACTIVE]                     │
│    Last Update: 1 min ago                              │
│    CPU Usage: 23%                                      │
│    Memory: 45%                                         │
│    Next Update: 1 min                                  │
│                                                        │
│ 🟡 ACCESS MODULE          [STANDBY]                    │
│    Status: Listening for commands                      │
│    Last Command: Never                                 │
│    Security: Enabled                                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Color Legend

**Status Indicators:**
- ● Green  = Agent ONLINE and connected
- ● Gray   = Agent OFFLINE
- ● Yellow = Agent DISCONNECTED (was online, now offline)
- ● Red    = Agent ERROR state

**Module Colors:**
- 🔵 Blue   = Asset Module (discovery and monitoring)
- 🟣 Purple = Traffic Module (network monitoring)
- 🟢 Green  = Host Module (system information)
- 🟡 Yellow = Access Module (remote execution)

**Agent Types:**
- 🐍 Python = Python agent (easy deployment)
- 🔷 Go     = Go agent (cross-platform binary)

**POV Indicator:**
- Purple Banner = Active agent POV
- Purple Header Text = Agent name in POV mode
- Purple Pulsing Dot = POV active indicator
