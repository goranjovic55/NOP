# Agent Types and Build Configuration

**Date:** 2026-01-03  
**Status:** Design Extension  
**Related:** agent-architecture-design.md, agent-implementation-roadmap.md

## Overview

This document provides detailed implementation specifications for all three agent types (Fat, Thin, Hybrid) and defines the build configuration system that allows operators to select agent type during the build process.

## Agent Type Selection During Build

### Build Configuration UI

The agent builder allows operators to select the agent type based on deployment requirements:

```tsx
// Agent Builder UI Component
<AgentBuilder>
  <ConfigSection title="Agent Type">
    <RadioGroup name="agentType">
      <Radio value="fat">
        <Label>Fat Agent (Full Capability)</Label>
        <Description>
          All modules built-in. Best for: long-term deployments, low-bandwidth,
          offline operations. Size: 50-100MB
        </Description>
      </Radio>
      <Radio value="hybrid">
        <Label>Hybrid Agent (Recommended)</Label>
        <Description>
          Core capabilities + on-demand modules. Best for: general use,
          flexible deployments. Size: 10-50MB
        </Description>
      </Radio>
      <Radio value="thin">
        <Label>Thin Proxy Agent</Label>
        <Description>
          Minimal relay only. Best for: short-term, high-bandwidth,
          rapid deployment. Size: 5-15MB
        </Description>
      </Radio>
    </RadioGroup>
  </ConfigSection>
  
  {/* Conditional configuration based on agent type */}
  {agentType === 'fat' && <FatAgentConfig />}
  {agentType === 'hybrid' && <HybridAgentConfig />}
  {agentType === 'thin' && <ThinAgentConfig />}
</AgentBuilder>
```

### Build Configuration Schema

```typescript
interface AgentBuildConfig {
  // Agent Type Selection
  agentType: 'fat' | 'hybrid' | 'thin';
  
  // Common Configuration
  language: 'go' | 'python';
  targetOS: 'linux' | 'windows' | 'macos';
  architecture: 'amd64' | 'arm64' | '386';
  c2URL: string;
  c2Port: number;
  checkInInterval: number; // seconds
  
  // Fat Agent Specific
  fatAgent?: {
    includeAllModules: boolean;
    modules: {
      discovery: boolean;
      portScan: boolean;
      serviceScan: boolean;
      trafficCapture: boolean;
      trafficCraft: boolean;
      trafficStorm: boolean;
      accessTest: boolean;
      exploitExec: boolean;
    };
  };
  
  // Hybrid Agent Specific
  hybrid?: {
    builtInModules: string[];      // e.g., ['discovery', 'heartbeat']
    onDemandModules: string[];     // e.g., ['portScan', 'trafficCapture']
    moduleCache: boolean;          // Cache downloaded modules
    moduleCachePath: string;       // Where to cache modules
  };
  
  // Thin Agent Specific
  thinAgent?: {
    proxyType: 'socks5' | 'http' | 'custom';
    proxyPort: number;
    tunnelProtocol: 'tcp' | 'udp' | 'both';
    compression: boolean;
  };
  
  // Security Options
  security: {
    tls: boolean;
    certificatePinning: boolean;
    obfuscation: boolean;           // Garble for Go
    antiDebug: boolean;
    jitter: number;                 // Check-in jitter (0-100%)
  };
  
  // Persistence Options
  persistence?: {
    enabled: boolean;
    method: 'systemd' | 'cron' | 'service' | 'registry' | 'startup';
    autoRestart: boolean;
  };
}
```

---

## Option A: Fat Agent - Detailed Implementation

### Architecture

**Fat Agent = All Functionality Built-In**

```
┌────────────────────────────────────────┐
│     Fat Agent Binary (50-100MB)        │
├────────────────────────────────────────┤
│  Core                                  │
│  ├── Registration & Auth (JWT)         │
│  ├── Heartbeat (30s interval)          │
│  ├── Command Queue Processor           │
│  └── WebSocket Client (TLS)            │
├────────────────────────────────────────┤
│  Built-in Modules (ALL INCLUDED)       │
│  ├── Discovery Module                  │
│  │   ├── ARP Scanner                   │
│  │   ├── ICMP Ping Sweeper             │
│  │   └── DNS Enumeration               │
│  ├── Port Scan Module                  │
│  │   ├── TCP Connect Scanner           │
│  │   ├── SYN Scanner (raw sockets)     │
│  │   └── UDP Scanner                   │
│  ├── Service Detection Module          │
│  │   ├── Banner Grabbing               │
│  │   └── nmap Integration              │
│  ├── Traffic Capture Module            │
│  │   ├── Packet Capture (pcap/scapy)   │
│  │   ├── BPF Filtering                 │
│  │   └── PCAP Export                   │
│  ├── Traffic Craft Module              │
│  │   ├── Packet Builder                │
│  │   └── Layer 2/3/4 Crafting          │
│  ├── Traffic Storm Module              │
│  │   ├── Flood Generator                │
│  │   └── Multi-threaded Sending        │
│  ├── Access Test Module                │
│  │   ├── SSH Client                    │
│  │   ├── RDP Client                    │
│  │   ├── VNC Client                    │
│  │   └── FTP/HTTP Clients              │
│  └── Exploit Execution Module          │
│      ├── Exploit Framework             │
│      └── Payload Delivery              │
├────────────────────────────────────────┤
│  Dependencies (Statically Linked)      │
│  ├── libpcap / npcap                   │
│  ├── OpenSSL / TLS library             │
│  ├── nmap (embedded or bundled)        │
│  └── Protocol libraries (SSH, RDP...)  │
└────────────────────────────────────────┘
```

### Go Implementation (Fat Agent)

**Directory Structure:**
```
agent-fat/
├── cmd/
│   └── agent/
│       └── main.go
├── internal/
│   ├── core/
│   │   ├── agent.go
│   │   ├── config.go
│   │   └── connection.go
│   └── modules/
│       ├── discovery/
│       │   ├── arp_scanner.go
│       │   ├── ping_sweeper.go
│       │   └── dns_enum.go
│       ├── portscan/
│       │   ├── tcp_scanner.go
│       │   ├── syn_scanner.go
│       │   └── udp_scanner.go
│       ├── traffic/
│       │   ├── capture.go
│       │   ├── craft.go
│       │   └── storm.go
│       ├── access/
│       │   ├── ssh_client.go
│       │   ├── rdp_client.go
│       │   └── vnc_client.go
│       └── exploit/
│           └── executor.go
├── pkg/
│   ├── protocols/
│   └── utils/
├── vendor/          # All dependencies vendored
└── build.sh
```

**Build Configuration:**
```bash
#!/bin/bash
# build-fat-agent.sh

AGENT_TYPE="fat"
LANGUAGE="go"
TARGET_OS="linux"
TARGET_ARCH="amd64"
C2_URL="https://c2.example.com:12001"

# Build with all dependencies statically linked
CGO_ENABLED=1 \
GOOS=$TARGET_OS \
GOARCH=$TARGET_ARCH \
go build \
  -ldflags="-s -w -X main.AgentType=$AGENT_TYPE -X main.C2URL=$C2_URL" \
  -tags "netgo,osusergo,static_build" \
  -installsuffix netgo \
  -o agent-fat-${TARGET_OS}-${TARGET_ARCH} \
  ./cmd/agent

# Optional: UPX compression
upx --best --lzma agent-fat-${TARGET_OS}-${TARGET_ARCH}

# Result: ~80-100MB binary (50-60MB after UPX)
```

**Main Entry Point:**
```go
// cmd/agent/main.go
package main

import (
    "agent-fat/internal/core"
    "agent-fat/internal/modules/discovery"
    "agent-fat/internal/modules/portscan"
    "agent-fat/internal/modules/traffic"
    "agent-fat/internal/modules/access"
    "agent-fat/internal/modules/exploit"
)

func main() {
    // Initialize agent
    agent := core.NewAgent(core.Config{
        AgentType: "fat",
        C2URL:     os.Getenv("C2_URL"),
        // ... other config
    })
    
    // Register ALL modules (all built-in)
    agent.RegisterModule("discovery", discovery.NewModule())
    agent.RegisterModule("portscan", portscan.NewModule())
    agent.RegisterModule("traffic_capture", traffic.NewCaptureModule())
    agent.RegisterModule("traffic_craft", traffic.NewCraftModule())
    agent.RegisterModule("traffic_storm", traffic.NewStormModule())
    agent.RegisterModule("access_test", access.NewModule())
    agent.RegisterModule("exploit_exec", exploit.NewModule())
    
    // Start agent
    agent.Run()
}
```

### Python Implementation (Fat Agent)

**Directory Structure:**
```
agent-fat/
├── main.py
├── core/
│   ├── agent.py
│   ├── config.py
│   └── connection.py
├── modules/
│   ├── discovery.py
│   ├── portscan.py
│   ├── traffic.py
│   ├── access.py
│   └── exploit.py
├── requirements.txt      # All dependencies
├── build-spec.txt        # PyInstaller spec
└── build.sh
```

**Requirements (All Included):**
```txt
# requirements.txt - Fat Agent
websockets>=11.0
cryptography>=41.0
scapy>=2.5.0
nmap>=0.0.1              # python-nmap
paramiko>=3.3.1          # SSH
pyRDP>=1.1.0             # RDP
vncdotool>=1.0.0         # VNC
requests>=2.31.0
psutil>=5.9.5
netifaces>=0.11.0
```

**Build Configuration:**
```bash
#!/bin/bash
# build-fat-agent.sh (Python)

pyinstaller \
  --onefile \
  --name agent-fat-linux-amd64 \
  --add-data "modules:modules" \
  --hidden-import scapy \
  --hidden-import nmap \
  --hidden-import paramiko \
  --hidden-import pyRDP \
  --collect-all scapy \
  main.py

# Result: ~50-70MB binary (includes Python runtime + all deps)
```

### Advantages of Fat Agent

1. **Offline Operation**: Can function without C2 connectivity, queue results
2. **Low Bandwidth**: Only sends commands and results, not all scan traffic
3. **Fast Execution**: No module download delays, immediate capability
4. **Stealth**: Fewer network requests to C2, less detectable
5. **Reliability**: No dependency on C2 availability for operations

### Use Cases

- **Long-term deployments** (months)
- **Low-bandwidth environments** (satellite, cellular)
- **Air-gapped networks** (occasional exfiltration)
- **Red team operations** (minimal C2 interaction)
- **High-latency connections** (intercontinental)

---

## Option B: Thin Proxy Agent - Detailed Implementation

### Architecture

**Thin Agent = Traffic Relay Only**

```
┌────────────────────────────────────────┐
│    Thin Agent Binary (5-15MB)          │
├────────────────────────────────────────┤
│  Core                                  │
│  ├── Registration & Auth (JWT)         │
│  ├── Heartbeat (30s interval)          │
│  └── WebSocket Client (TLS)            │
├────────────────────────────────────────┤
│  Proxy/Tunnel Module                   │
│  ├── SOCKS5 Proxy Server               │
│  ├── HTTP Proxy Server                 │
│  ├── TCP Port Forwarding               │
│  ├── UDP Port Forwarding               │
│  └── Traffic Compression (optional)    │
├────────────────────────────────────────┤
│  No Built-in Capabilities              │
│  (C2 does all the work)                │
└────────────────────────────────────────┘

         ↑↓ Relay all traffic ↑↓

┌────────────────────────────────────────┐
│    C2 Server (Does the Work)           │
├────────────────────────────────────────┤
│  Tools (Run locally, traffic via agent)│
│  ├── nmap (via SOCKS proxy)            │
│  ├── scapy (via tunnel)                │
│  ├── SSH client (via port forward)     │
│  └── All other tools                   │
└────────────────────────────────────────┘
```

### Go Implementation (Thin Agent)

**Directory Structure:**
```
agent-thin/
├── cmd/
│   └── agent/
│       └── main.go
├── internal/
│   ├── core/
│   │   ├── agent.go
│   │   └── connection.go
│   └── proxy/
│       ├── socks5.go
│       ├── http_proxy.go
│       ├── tcp_forward.go
│       └── udp_forward.go
└── build.sh
```

**Build Configuration:**
```bash
#!/bin/bash
# build-thin-agent.sh

AGENT_TYPE="thin"
LANGUAGE="go"
TARGET_OS="linux"
TARGET_ARCH="amd64"

# Minimal build, no CGO dependencies
CGO_ENABLED=0 \
GOOS=$TARGET_OS \
GOARCH=$TARGET_ARCH \
go build \
  -ldflags="-s -w -X main.AgentType=$AGENT_TYPE" \
  -o agent-thin-${TARGET_OS}-${TARGET_ARCH} \
  ./cmd/agent

# Result: ~5-10MB binary
```

**Main Entry Point:**
```go
// cmd/agent/main.go
package main

import (
    "agent-thin/internal/core"
    "agent-thin/internal/proxy"
)

func main() {
    agent := core.NewAgent(core.Config{
        AgentType: "thin",
        C2URL:     os.Getenv("C2_URL"),
    })
    
    // Start SOCKS5 proxy on local port
    go proxy.StartSOCKS5Server(":1080", agent.Auth)
    
    // Start HTTP proxy
    go proxy.StartHTTPProxy(":8080", agent.Auth)
    
    // Relay all traffic through agent's network
    agent.Run()
}
```

**SOCKS5 Proxy Implementation:**
```go
// internal/proxy/socks5.go
package proxy

import (
    "io"
    "net"
)

type SOCKS5Server struct {
    listenAddr string
    auth       AuthProvider
}

func (s *SOCKS5Server) Start() error {
    listener, err := net.Listen("tcp", s.listenAddr)
    if err != nil {
        return err
    }
    
    for {
        conn, err := listener.Accept()
        if err != nil {
            continue
        }
        go s.handleConnection(conn)
    }
}

func (s *SOCKS5Server) handleConnection(conn net.Conn) {
    // SOCKS5 handshake
    // Authentication
    // Connect to target via agent's network
    // Relay bidirectional traffic
    targetConn, _ := net.Dial("tcp", targetAddr)
    go io.Copy(targetConn, conn)
    io.Copy(conn, targetConn)
}
```

### Python Implementation (Thin Agent)

**Directory Structure:**
```
agent-thin/
├── main.py
├── core/
│   ├── agent.py
│   └── connection.py
├── proxy/
│   ├── socks5.py
│   ├── http_proxy.py
│   └── tunnel.py
├── requirements.txt
└── build.sh
```

**Requirements (Minimal):**
```txt
# requirements.txt - Thin Agent (minimal)
websockets>=11.0
cryptography>=41.0
pysocks>=1.7.1
```

**Build:**
```bash
pyinstaller --onefile --name agent-thin-linux-amd64 main.py
# Result: ~15-20MB (includes Python runtime)
```

### C2 Integration for Thin Agent

**C2 connects through agent's proxy:**
```python
# backend/app/services/agent_proxy_service.py

class AgentProxyService:
    def __init__(self, agent_id: str):
        self.agent = self.get_agent(agent_id)
        self.socks_proxy = f"socks5://{self.agent.ip}:1080"
    
    def run_nmap(self, target: str, ports: str):
        # Configure nmap to use agent as SOCKS proxy
        cmd = [
            "nmap",
            "--proxies", self.socks_proxy,
            "-p", ports,
            target
        ]
        result = subprocess.run(cmd, capture_output=True)
        return result.stdout
    
    def capture_traffic(self, interface: str, filter: str):
        # Tunnel tcpdump through agent
        ssh_tunnel = self.create_ssh_tunnel(self.agent)
        cmd = f"tcpdump -i {interface} {filter}"
        # Execute remotely via tunnel
        return self.execute_via_tunnel(cmd)
```

### Advantages of Thin Agent

1. **Minimal Size**: 5-15MB, easy to deploy
2. **Simple Updates**: C2-side changes only, no agent redeployment
3. **Consistent Behavior**: Tools run in known C2 environment
4. **Easy Debugging**: All tool output visible on C2
5. **No Module Management**: No module downloading/caching

### Use Cases

- **Short-term engagements** (days/weeks)
- **High-bandwidth environments** (enterprise LAN, datacenter)
- **Rapid deployment** (compromised box, quick pivot)
- **Testing multiple networks** (deploy many agents, scan sequentially)
- **When agent detection less critical**

---

## Option C: Hybrid Agent - Detailed Implementation

(Already well-documented in main architecture document, see agent-architecture-design.md)

**Key Points:**
- Core modules built-in (~10MB)
- On-demand module loading
- Module caching for offline use
- Best balance of all options

---

## Build System Implementation

### Backend Build Service

**File:** `backend/app/services/agent_builder_service.py`

```python
from typing import Dict, Any
import subprocess
import uuid
from pathlib import Path

class AgentBuilderService:
    def __init__(self):
        self.build_dir = Path("/app/volumes/agent-builds")
        self.templates_dir = Path("/app/agent-templates")
    
    async def build_agent(self, config: AgentBuildConfig) -> str:
        """Build custom agent based on configuration"""
        build_id = str(uuid.uuid4())
        build_path = self.build_dir / build_id
        build_path.mkdir(parents=True, exist_ok=True)
        
        # Select template based on agent type
        if config.agentType == "fat":
            template = self.templates_dir / "agent-fat"
        elif config.agentType == "thin":
            template = self.templates_dir / "agent-thin"
        else:  # hybrid
            template = self.templates_dir / "agent-hybrid"
        
        # Copy template
        shutil.copytree(template, build_path / "src")
        
        # Generate config file
        self.generate_config(build_path / "config.yaml", config)
        
        # Build based on language
        if config.language == "go":
            binary_path = await self.build_go_agent(build_path, config)
        else:  # python
            binary_path = await self.build_python_agent(build_path, config)
        
        # Apply obfuscation if requested
        if config.security.obfuscation:
            binary_path = await self.obfuscate(binary_path, config)
        
        # Store build metadata
        await self.save_build_metadata(build_id, config, binary_path)
        
        return build_id
    
    async def build_go_agent(self, build_path: Path, config: AgentBuildConfig) -> Path:
        """Build Go agent"""
        
        # Prepare build flags
        ldflags = [
            "-s", "-w",  # Strip debug info
            f"-X main.AgentType={config.agentType}",
            f"-X main.C2URL={config.c2URL}",
            f"-X main.CheckInInterval={config.checkInInterval}",
        ]
        
        # Build command
        env = {
            "CGO_ENABLED": "0" if config.agentType == "thin" else "1",
            "GOOS": config.targetOS,
            "GOARCH": config.architecture,
        }
        
        output_name = f"agent-{config.agentType}-{config.targetOS}-{config.architecture}"
        
        cmd = [
            "go", "build",
            f"-ldflags={' '.join(ldflags)}",
            "-o", str(build_path / output_name),
            "./cmd/agent"
        ]
        
        result = subprocess.run(
            cmd,
            cwd=build_path / "src",
            env={**os.environ, **env},
            capture_output=True
        )
        
        if result.returncode != 0:
            raise BuildError(f"Build failed: {result.stderr.decode()}")
        
        return build_path / output_name
    
    async def build_python_agent(self, build_path: Path, config: AgentBuildConfig) -> Path:
        """Build Python agent with PyInstaller"""
        
        # Install dependencies based on agent type
        if config.agentType == "fat":
            requirements = build_path / "src" / "requirements-fat.txt"
        elif config.agentType == "thin":
            requirements = build_path / "src" / "requirements-thin.txt"
        else:  # hybrid
            requirements = build_path / "src" / "requirements-hybrid.txt"
        
        subprocess.run(["pip", "install", "-r", str(requirements)])
        
        # PyInstaller command
        output_name = f"agent-{config.agentType}-{config.targetOS}-{config.architecture}"
        
        cmd = [
            "pyinstaller",
            "--onefile",
            f"--name={output_name}",
            "--distpath", str(build_path),
            "main.py"
        ]
        
        # Add hidden imports based on agent type
        if config.agentType == "fat":
            cmd.extend([
                "--hidden-import=scapy",
                "--hidden-import=nmap",
                "--hidden-import=paramiko",
                "--collect-all=scapy",
            ])
        
        result = subprocess.run(
            cmd,
            cwd=build_path / "src",
            capture_output=True
        )
        
        if result.returncode != 0:
            raise BuildError(f"Build failed: {result.stderr.decode()}")
        
        return build_path / output_name
```

### Frontend Agent Builder Component

**File:** `frontend/src/pages/AgentBuilder.tsx`

```tsx
import React, { useState } from 'react';
import { CyberCard, CyberButton, CyberSectionHeader } from '../components/CyberUI';

export const AgentBuilder: React.FC = () => {
  const [config, setConfig] = useState<AgentBuildConfig>({
    agentType: 'hybrid',
    language: 'go',
    targetOS: 'linux',
    architecture: 'amd64',
    // ... defaults
  });
  
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'ready' | 'error'>('idle');
  const [buildId, setBuildId] = useState<string | null>(null);
  
  const handleBuild = async () => {
    setBuildStatus('building');
    try {
      const response = await fetch('/api/v1/agents/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      setBuildId(data.build_id);
      setBuildStatus('ready');
    } catch (error) {
      setBuildStatus('error');
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="cyber-page-title cyber-page-title-purple mb-6">
        Agent Builder
      </h1>
      
      {/* Agent Type Selection */}
      <CyberCard>
        <CyberSectionHeader title="Agent Type" color="purple" />
        
        <div className="space-y-4 mt-4">
          <AgentTypeOption
            type="fat"
            label="Fat Agent (Full Capability)"
            description="All modules built-in. 50-100MB. Best for: long-term, low-bandwidth, offline."
            selected={config.agentType === 'fat'}
            onSelect={() => setConfig({ ...config, agentType: 'fat' })}
          />
          
          <AgentTypeOption
            type="hybrid"
            label="Hybrid Agent (Recommended)"
            description="Core + on-demand modules. 10-50MB. Best for: general use, flexible."
            selected={config.agentType === 'hybrid'}
            onSelect={() => setConfig({ ...config, agentType: 'hybrid' })}
          />
          
          <AgentTypeOption
            type="thin"
            label="Thin Proxy Agent"
            description="Minimal relay. 5-15MB. Best for: short-term, high-bandwidth, rapid deploy."
            selected={config.agentType === 'thin'}
            onSelect={() => setConfig({ ...config, agentType: 'thin' })}
          />
        </div>
      </CyberCard>
      
      {/* Language Selection */}
      <CyberCard className="mt-4">
        <CyberSectionHeader title="Language" color="blue" />
        <div className="flex gap-4 mt-4">
          <LanguageOption
            language="go"
            label="Go"
            size={config.agentType === 'fat' ? '80-100MB' : config.agentType === 'hybrid' ? '10-15MB' : '5-10MB'}
            selected={config.language === 'go'}
            onSelect={() => setConfig({ ...config, language: 'go' })}
          />
          <LanguageOption
            language="python"
            label="Python"
            size={config.agentType === 'fat' ? '50-70MB' : config.agentType === 'hybrid' ? '25-50MB' : '15-20MB'}
            selected={config.language === 'python'}
            onSelect={() => setConfig({ ...config, language: 'python' })}
          />
        </div>
      </CyberCard>
      
      {/* Conditional Configuration based on Agent Type */}
      {config.agentType === 'fat' && <FatAgentConfiguration config={config} setConfig={setConfig} />}
      {config.agentType === 'hybrid' && <HybridAgentConfiguration config={config} setConfig={setConfig} />}
      {config.agentType === 'thin' && <ThinAgentConfiguration config={config} setConfig={setConfig} />}
      
      {/* Build Button */}
      <div className="mt-6">
        <CyberButton
          onClick={handleBuild}
          disabled={buildStatus === 'building'}
          size="lg"
          color="green"
        >
          {buildStatus === 'building' ? 'Building...' : 'Build Agent'}
        </CyberButton>
      </div>
      
      {/* Build Result */}
      {buildStatus === 'ready' && buildId && (
        <CyberCard className="mt-4 border-cyber-green">
          <h3 className="text-cyber-green font-bold">Build Complete!</h3>
          <p className="mt-2">Build ID: {buildId}</p>
          <CyberButton
            onClick={() => window.location.href = `/api/v1/agents/download/${buildId}`}
            color="green"
            className="mt-4"
          >
            Download Agent
          </CyberButton>
        </CyberCard>
      )}
    </div>
  );
};
```

---

## Comparison Matrix

| Feature | Fat Agent | Thin Proxy | Hybrid |
|---------|-----------|------------|--------|
| **Size (Go)** | 80-100MB | 5-10MB | 10-15MB |
| **Size (Python)** | 50-70MB | 15-20MB | 25-50MB |
| **Bandwidth Usage** | Low | High | Medium |
| **C2 Dependency** | Low | High | Medium |
| **Update Process** | Redeploy | C2-side only | Module updates |
| **Offline Capable** | Yes | No | Partial |
| **Execution Speed** | Fast | Slow (latency) | Fast |
| **Deployment Time** | Slow (large) | Fast (small) | Medium |
| **Maintenance** | Hard | Easy | Easy |
| **Best For** | Long-term | Short-term | General use |
| **Stealth** | High | Low | Medium |
| **Complexity** | High | Low | Medium |

---

## Deployment Scenarios

### Scenario 1: Enterprise Penetration Test (1 week)
**Recommendation:** Thin Proxy Agent
- Fast deployment
- High bandwidth available
- C2 always reachable
- Flexible tool usage

### Scenario 2: Red Team Operation (3 months)
**Recommendation:** Fat Agent
- Long-term persistence
- Low C2 interaction
- Offline capability
- Stealth priority

### Scenario 3: Bug Bounty / General Use
**Recommendation:** Hybrid Agent
- Balance of capabilities
- Moderate size
- Flexible deployment
- Easy updates

### Scenario 4: Air-Gapped Network
**Recommendation:** Fat Agent
- Must operate offline
- Batch exfiltration
- All tools needed locally

### Scenario 5: Multi-Network Pivot
**Recommendation:** Thin Proxy
- Deploy many agents
- Scan through each sequentially
- Minimal footprint per agent

---

## Build Workflow Example

```bash
# Operator wants Fat Agent for long-term red team op

1. Open Agent Builder UI
2. Select "Fat Agent"
3. Select Language: Go
4. Select OS: Linux, Arch: amd64
5. Configure modules:
   ✓ All modules enabled
6. Configure security:
   ✓ Obfuscation enabled
   ✓ Anti-debug enabled
   ✓ Jitter: 50%
7. Configure persistence:
   ✓ systemd service
   ✓ Auto-restart enabled
8. Click "Build Agent"
9. Wait 2-3 minutes (fat agent takes longer)
10. Download: agent-fat-linux-amd64 (95MB)
11. Deploy via existing SSH access
12. Agent connects back, all capabilities available
```

---

## Implementation Priority

**Phase 4 (Week 7-8) - Agent Builder:**

1. **Week 7:**
   - [ ] Implement Hybrid agent builder (already designed)
   - [ ] Add agent type selection to UI
   - [ ] Test hybrid builds

2. **Week 8:**
   - [ ] Extend builder to support Fat agent
   - [ ] Extend builder to support Thin proxy
   - [ ] Test all three types
   - [ ] Document deployment guides for each

---

## Conclusion

All three agent types serve different purposes:

- **Fat Agent**: Maximum capability, minimum C2 interaction
- **Thin Proxy**: Minimum footprint, maximum C2 dependence
- **Hybrid**: Balanced approach, recommended for most use cases

The build configuration system allows operators to choose the right agent type for their specific deployment scenario, with clear trade-offs and use case guidance.
