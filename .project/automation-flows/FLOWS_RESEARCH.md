# NOP Automation Flows Research

## Executive Summary

NOP has **5 core domains** that can be combined into powerful automation flows. This document maps current capabilities to practical automation patterns based on external research.

---

## NOP Capability Inventory

### Domain 1: Traffic
**Service:** `SnifferService.py` (~1200 lines)

| Capability | Method | Flow Block Exists |
|------------|--------|-------------------|
| Passive packet capture | `start_sniffing()` | ✅ traffic.start_capture |
| Stop capture | `stop_sniffing()` | ✅ traffic.stop_capture |
| Burst capture (timed) | `start_burst_capture()` / `stop_burst_capture()` | ✅ traffic.burst_capture |
| Get traffic stats | `get_stats()` | ✅ traffic.get_stats |
| Passive host discovery | via `_packet_callback()` | ❌ Need block |
| Packet crafting | `craft_and_send_packet()` | ❌ Need block |
| Storm generation | `start_storm()` / `stop_storm()` | ✅ traffic.storm |
| Ping (real subprocess) | via endpoint | ✅ traffic.ping |
| Advanced ping | multi-host | ✅ traffic.advanced_ping |
| PCAP export | `export_pcap()` | ❌ Need block |

### Domain 2: Access
**Service:** `access_hub.py` (~350 lines)

| Capability | Method | Flow Block Exists |
|------------|--------|-------------------|
| Test SSH connection | `test_ssh_connection()` | ✅ connection.ssh |
| Execute SSH command | `execute_ssh_command()` | ✅ command.ssh_execute |
| Test TCP connection | `test_tcp_connection()` | ✅ connection.tcp_test |
| Get system info | `get_system_info_ssh()` | ✅ command.system_info |
| FTP list files | `list_ftp_files()` | ✅ command.ftp_list |
| FTP download | `download_ftp_file()` | ✅ command.ftp_download |
| FTP upload | `upload_ftp_file()` | ✅ command.ftp_upload |
| Get credentials | `get_credentials_for_asset()` | ❌ Need block |
| RDP test | via Guacamole | ✅ connection.rdp |
| VNC test | via Guacamole | ✅ connection.vnc |

### Domain 3: Host
**Service:** Exposed via Agent service

| Capability | Source | Flow Block Exists |
|------------|--------|-------------------|
| System info collection | `collect_host_info()` | ✅ command.system_info |
| Process listing | via SSH | ❌ Need block |
| File operations | via SSH/FTP | ✅ FTP blocks |
| Service status | via SSH | ❌ Need block |
| Log retrieval | via SSH | ❌ Need block |

### Domain 4: Scans
**Service:** `scanner.py` (~500 lines) + `discovery_service.py` (~200 lines)

| Capability | Method | Flow Block Exists |
|------------|--------|-------------------|
| Ping sweep | `ping_sweep()` | ❌ Need block |
| Port scan | `port_scan()` | ✅ scanning.port_scan |
| Service detection | `service_detection()` | ✅ scanning.version_detection |
| OS detection | `os_detection()` | ❌ Need block |
| Vulnerability scan | `vulnerability_scan()` | ❌ Need block |
| Comprehensive scan | `comprehensive_scan()` | ❌ Need block |
| Network discovery | `discover_network()` | ❌ Need block |
| Banner grab | `banner_grab()` | ❌ Need block |

### Domain 5: Agents
**Service:** `agent_service.py` (~2200 lines)

| Capability | Method | Flow Block Exists |
|------------|--------|-------------------|
| Generate agent | `generate_python_agent()` | ✅ agent.generate |
| Deploy agent | via SSH | ✅ agent.deploy |
| Terminate agent | via WebSocket | ✅ agent.terminate |
| List agents | CRUD ops | ❌ Need block |
| Agent terminal | PTY relay | ❌ (UI only) |
| Agent file browser | Filesystem relay | ❌ (UI only) |
| POV scanning | Proxy mode | ❌ Need block |

---

## External Automation Patterns Research

### Pattern Category 1: Network Infrastructure Testing

**1.1 REP Ring Failover Test**
```
Purpose: Verify Resilient Ethernet Protocol recovers from link failures
Industry: Enterprise switching, data centers
Tools: Cisco IOS, SSH

Steps:
1. Connect to each switch in ring
2. Shutdown primary link on one switch
3. Wait for REP convergence (typical: 50-100ms)
4. Verify all switches can still ping each other
5. Check REP topology status
6. Re-enable link
7. Verify ring returns to normal state
8. Generate pass/fail report per link tested
```

**1.2 STP Root Bridge Election Test**
```
Purpose: Verify Spanning Tree elects correct root after bridge failures
Industry: Enterprise switching

Steps:
1. Identify current STP root bridge
2. Disable root bridge interface
3. Wait for STP convergence (30-50s default)
4. Verify new root is correct backup
5. Re-enable original root
6. Verify root returns to primary
```

**1.3 HSRP/VRRP Failover Test**
```
Purpose: Verify first-hop redundancy protocol failover
Industry: Enterprise routing

Steps:
1. Identify active HSRP/VRRP router
2. Disable active router interface
3. Ping virtual IP continuously
4. Measure failover time (packet loss)
5. Verify standby becomes active
6. Re-enable primary
```

**1.4 Link Aggregation (LACP) Test**
```
Purpose: Verify port-channel survives member failures
Industry: Enterprise networking

Steps:
1. Check current port-channel status
2. Disable one member port
3. Verify traffic continues
4. Check load balancing
5. Re-enable port
6. Verify member rejoins
```

### Pattern Category 2: Security Scanning Pipelines

**2.1 Asset Discovery → Vulnerability Pipeline**
```
Purpose: Continuous security assessment
Industry: Security operations, compliance

Stages:
1. PASSIVE DISCOVERY
   - Capture network traffic
   - Identify talking hosts
   - Extract MAC/IP mappings

2. ACTIVE DISCOVERY
   - Ping sweep discovered subnet
   - Confirm live hosts
   
3. PORT ENUMERATION
   - Scan common ports (1-1000)
   - Identify services
   
4. SERVICE FINGERPRINTING
   - Version detection on open ports
   - OS fingerprinting
   
5. VULNERABILITY SCAN
   - Run CVE checks against versions
   - Check for known exploits
   
6. REPORT
   - Generate risk matrix
   - Prioritize by severity
```

**2.2 Agent Deployment Pipeline**
```
Purpose: Mass deployment of monitoring agents
Industry: Security operations, red team

Stages:
1. TARGET SELECTION
   - Get assets from database
   - Filter by criteria (OS, open ports)
   
2. ACCESS VALIDATION
   - Test SSH connectivity
   - Verify credentials work
   
3. DEPLOYMENT
   - Transfer agent binary
   - Execute agent with arguments
   - Wait for callback
   
4. VERIFICATION
   - Check agent appears in C2
   - Test basic functionality
   
5. REPORT
   - Count successful deployments
   - List failures with reasons
```

**2.3 Lateral Movement Mapping**
```
Purpose: Map possible attack paths through network
Industry: Red team, penetration testing

Stages:
1. Start from compromised host
2. Scan local subnet (from agent POV)
3. Identify adjacent hosts
4. Check for reachable services
5. Attempt credential reuse
6. Map relationships
7. Visualize attack graph
```

### Pattern Category 3: Network Monitoring

**3.1 Traffic Baseline & Anomaly Detection**
```
Purpose: Establish normal traffic patterns, detect deviations
Industry: Network operations, security

Stages:
1. BASELINE COLLECTION
   - Capture traffic for set period
   - Calculate normal stats (bytes/sec, top talkers, protocols)
   
2. CONTINUOUS MONITORING
   - Periodic burst captures
   - Compare to baseline
   
3. ALERTING
   - Flag anomalies (new hosts, port changes, traffic spikes)
```

**3.2 Connectivity Health Check**
```
Purpose: Periodic verification of network paths
Industry: Network operations

Stages:
1. Define critical paths (host A → B → C)
2. Ping each hop
3. Record latency
4. Flag failures
5. Generate uptime report
```

### Pattern Category 4: Compliance Auditing

**4.1 SSH Key & Password Audit**
```
Purpose: Verify credential security across hosts
Industry: Compliance, security

Stages:
1. Get list of hosts
2. For each host:
   - Test default credentials
   - Check for weak passwords
   - Verify SSH key strength
3. Generate compliance report
```

**4.2 Port Policy Compliance**
```
Purpose: Verify only approved ports are open
Industry: Compliance

Stages:
1. Define allowed ports per host type
2. Scan all assets
3. Compare to policy
4. Flag violations
5. Generate audit report
```

---

## Mapped Flows for NOP

### Flow 1: Multi-Host Ping Monitor
**Domains:** Traffic
**Difficulty:** Easy
**Blocks Needed:** Current + Loop fix

```
┌─────────────────────────────────────────────────────┐
│ FLOW: Multi-Host Ping Monitor                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  START                                              │
│    ↓                                                │
│  Set Variable                                       │
│    hosts = ["192.168.1.1", "192.168.1.2", ...]      │
│    ↓                                                │
│  LOOP (hosts)                                       │
│    ├─ [Each] → Ping (host={{item}})                 │
│    │         → Collect                              │
│    └─ [Done] → Report                               │
│              → END                                  │
│                                                     │
│  Report Output:                                     │
│  ┌──────────────┬───────────┬──────────┐           │
│  │ Host         │ Reachable │ Latency  │           │
│  ├──────────────┼───────────┼──────────┤           │
│  │ 192.168.1.1  │ ✓         │ 12ms     │           │
│  │ 192.168.1.2  │ ✗         │ -        │           │
│  └──────────────┴───────────┴──────────┘           │
└─────────────────────────────────────────────────────┘
```

**Required Changes:**
- 🔴 P0: Fix Loop to actually iterate
- 🔴 P0: Add Collect block
- 🟡 P1: Add Report block

---

### Flow 2: Network Discovery Pipeline
**Domains:** Traffic + Scans
**Difficulty:** Medium
**Blocks Needed:** 2 new blocks

```
┌─────────────────────────────────────────────────────┐
│ FLOW: Network Discovery Pipeline                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  START                                              │
│    ↓                                                │
│  Ping Sweep (NEW)                                   │
│    network = "192.168.1.0/24"                       │
│    output = discovered_hosts                        │
│    ↓                                                │
│  LOOP (discovered_hosts)                            │
│    ├─ [Each] → Port Scan (host={{item.ip}})         │
│    │         → Version Detection                    │
│    │         → Collect                              │
│    └─ [Done] → Report                               │
│              → END                                  │
│                                                     │
│  Report Output:                                     │
│  ┌──────────────┬───────────┬──────────────────────┐│
│  │ Host         │ Ports     │ Services             ││
│  ├──────────────┼───────────┼──────────────────────┤│
│  │ 192.168.1.1  │ 22,80     │ SSH 7.9, Apache 2.4  ││
│  │ 192.168.1.5  │ 22,443    │ SSH 8.0, nginx 1.19  ││
│  └──────────────┴───────────┴──────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Required Changes:**
- 🔴 P0: Fix Loop iteration
- 🔴 P0: Add Collect block
- 🟡 P1: Add Ping Sweep block (wraps `scanner.ping_sweep()`)
- 🟡 P1: Add Report block

---

### Flow 3: Agent Mass Deployment
**Domains:** Access + Agents
**Difficulty:** Medium
**Blocks Needed:** 1 new block

```
┌─────────────────────────────────────────────────────┐
│ FLOW: Agent Mass Deployment                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  START                                              │
│    ↓                                                │
│  Get Assets (NEW)                                   │
│    filter = online                                  │
│    output = targets                                 │
│    ↓                                                │
│  LOOP (targets)                                     │
│    ├─ [Each] → SSH Test (host={{item.ip}})          │
│    │         → Condition ({{$prev.success}})        │
│    │              ├─ [true] → Agent Deploy          │
│    │              │         → Collect (deployed)    │
│    │              └─ [false] → Collect (failed)     │
│    └─ [Done] → Report                               │
│              → END                                  │
│                                                     │
│  Report Output:                                     │
│  ┌──────────────┬──────────┬────────────┬─────────┐│
│  │ Host         │ SSH OK   │ Agent ID   │ Status  ││
│  ├──────────────┼──────────┼────────────┼─────────┤│
│  │ 192.168.1.10 │ ✓        │ a1b2c3d4   │ LIVE    ││
│  │ 192.168.1.15 │ ✓        │ e5f6g7h8   │ LIVE    ││
│  │ 192.168.1.20 │ ✗        │ -          │ FAILED  ││
│  ├──────────────┴──────────┴────────────┴─────────┤│
│  │ Summary: 2/3 deployed (67%)                    ││
│  └────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Required Changes:**
- 🔴 P0: Fix Loop iteration
- 🔴 P0: Add Collect block
- 🟡 P1: Add Get Assets block (queries DB)
- 🟡 P1: Add Report block

---

### Flow 4: Security Scan Pipeline
**Domains:** Scans + Traffic
**Difficulty:** Medium-High
**Blocks Needed:** 3 new blocks

```
┌─────────────────────────────────────────────────────┐
│ FLOW: Security Scan Pipeline                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  START                                              │
│    ↓                                                │
│  Passive Discovery (via traffic capture)            │
│    duration = 60s                                   │
│    ↓                                                │
│  Ping Sweep (verify hosts)                          │
│    network = detected_network                       │
│    ↓                                                │
│  LOOP (live_hosts)                                  │
│    ├─ [Each] → Port Scan                            │
│    │         → Version Detection                    │
│    │         → Vuln Scan (NEW)                      │
│    │         → Collect                              │
│    └─ [Done] → Report (risk matrix)                 │
│              → END                                  │
│                                                     │
│  Risk Matrix:                                       │
│  ┌──────────────┬──────┬───────────────┬──────────┐│
│  │ Host         │ CVEs │ Critical      │ Risk     ││
│  ├──────────────┼──────┼───────────────┼──────────┤│
│  │ 192.168.1.1  │ 3    │ CVE-2023-1234 │ HIGH     ││
│  │ 192.168.1.5  │ 0    │ -             │ LOW      ││
│  └──────────────┴──────┴───────────────┴──────────┘│
└─────────────────────────────────────────────────────┘
```

**Required Changes:**
- 🔴 P0: Fix Loop iteration
- 🔴 P0: Add Collect block
- 🟡 P1: Add Ping Sweep block
- 🟡 P1: Add Vuln Scan block (wraps `scanner.vulnerability_scan()`)
- 🟡 P1: Add Report block

---

### Flow 5: REP Ring Redundancy Test
**Domains:** Access + Traffic
**Difficulty:** High
**Blocks Needed:** 3-4 new blocks

```
┌─────────────────────────────────────────────────────┐
│ FLOW: REP Ring Redundancy Test                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  START                                              │
│    ↓                                                │
│  Set Variables                                      │
│    switches = [{ip, port, cred}, ...]               │
│    ↓                                                │
│  LOOP (switches)                                    │
│    ├─ [Each] → SSH Execute                          │
│    │           cmd="conf t; int {{item.port}}; shut"│
│    │         → Delay (10s)                          │
│    │         → SSH Execute                          │
│    │           cmd="show rep topology"              │
│    │         → Assert (NEW)                         │
│    │           expr="output contains 'REP enabled'" │
│    │         → Advanced Ping (other switches)       │
│    │         → Assert                               │
│    │           expr="all reachable"                 │
│    │         → SSH Execute                          │
│    │           cmd="no shut"                        │
│    │         → Collect                              │
│    └─ [Done] → Report (test results)                │
│              → END                                  │
│                                                     │
│  Test Results:                                      │
│  ┌──────────┬────────────┬──────────────┬─────────┐│
│  │ Switch   │ Port       │ Recovery     │ Result  ││
│  ├──────────┼────────────┼──────────────┼─────────┤│
│  │ SW1      │ Gi0/1      │ 85ms         │ PASS    ││
│  │ SW1      │ Gi0/2      │ 92ms         │ PASS    ││
│  │ SW2      │ Gi0/1      │ TIMEOUT      │ FAIL    ││
│  └──────────┴────────────┴──────────────┴─────────┘│
└─────────────────────────────────────────────────────┘
```

**Required Changes:**
- 🔴 P0: Fix Loop iteration
- 🔴 P0: Add Collect block
- 🟡 P1: Add Assert block (structured test tracking)
- 🟡 P1: Add Report block
- 🔵 P2: Consider nested loops (switch → ports)

---

### Flow 6: Agent POV Reconnaissance
**Domains:** Agents + Scans
**Difficulty:** High
**Blocks Needed:** 2 new blocks

```
┌─────────────────────────────────────────────────────┐
│ FLOW: Agent POV Reconnaissance                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  START                                              │
│    ↓                                                │
│  Select Agent (NEW)                                 │
│    filter = online                                  │
│    ↓                                                │
│  Set POV Mode                                       │
│    agent_id = {{selected_agent}}                    │
│    ↓                                                │
│  Ping Sweep (via agent SOCKS)                       │
│    network = "10.10.0.0/24"                         │
│    proxy_port = {{agent_socks_port}}                │
│    ↓                                                │
│  LOOP (discovered)                                  │
│    ├─ [Each] → Port Scan (via agent)                │
│    │         → Version Detection (via agent)        │
│    │         → Collect                              │
│    └─ [Done] → Tag Assets with agent_id             │
│              → Report                               │
│              → END                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Required Changes:**
- 🔴 P0: Fix Loop iteration
- 🔴 P0: Add Collect block
- 🟡 P1: Add Select Agent block
- 🟡 P1: Extend scan blocks to accept `proxy_port` parameter
- 🟡 P1: Add Report block

---

### Flow 7: Connectivity Health Dashboard
**Domains:** Traffic
**Difficulty:** Medium
**Blocks Needed:** 1 new block

```
┌─────────────────────────────────────────────────────┐
│ FLOW: Connectivity Health Dashboard                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  START                                              │
│    ↓                                                │
│  Get Critical Hosts (NEW or Get Assets filtered)    │
│    tag = "critical"                                 │
│    ↓                                                │
│  LOOP (hosts)                                       │
│    ├─ [Each] → Ping                                 │
│    │         → TCP Test (port 22)                   │
│    │         → TCP Test (port 443)                  │
│    │         → Collect                              │
│    └─ [Done] → Report                               │
│              → END                                  │
│                                                     │
│  Health Dashboard:                                  │
│  ┌──────────────┬────────┬────────┬─────────┬──────┐│
│  │ Host         │ ICMP   │ SSH    │ HTTPS   │ Score││
│  ├──────────────┼────────┼────────┼─────────┼──────┤│
│  │ gateway      │ ✓ 2ms  │ ✓ OK   │ ✓ OK    │ 100% ││
│  │ web-server   │ ✓ 5ms  │ ✗ FAIL │ ✓ OK    │ 67%  ││
│  │ db-server    │ ✗ FAIL │ ✗ FAIL │ ✗ FAIL  │ 0%   ││
│  └──────────────┴────────┴────────┴─────────┴──────┘│
└─────────────────────────────────────────────────────┘
```

---

### Flow 8: Traffic Baseline Collection
**Domains:** Traffic
**Difficulty:** Easy-Medium
**Blocks Needed:** 2 new blocks

```
┌─────────────────────────────────────────────────────┐
│ FLOW: Traffic Baseline Collection                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  START                                              │
│    ↓                                                │
│  Start Capture                                      │
│    interface = eth0                                 │
│    ↓                                                │
│  Delay (300s - 5 minutes)                           │
│    ↓                                                │
│  Stop Capture                                       │
│    ↓                                                │
│  Get Stats                                          │
│    ↓                                                │
│  Get Discovered Hosts (NEW)                         │
│    ↓                                                │
│  Export PCAP (NEW)                                  │
│    filename = "baseline_{{timestamp}}.pcap"         │
│    ↓                                                │
│  Report (summary)                                   │
│    ↓                                                │
│  END                                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Required Block Additions Summary

### P0 - Critical (Unlocks All Iteration Flows)

| Block | Purpose | Backend Method |
|-------|---------|----------------|
| **Loop Fix** | Actually iterate | Modify executor |
| `control.collect` | Accumulate results | New in executor |

### P1 - High Value

| Block | Purpose | Backend Method |
|-------|---------|----------------|
| `control.report` | Generate report table | New endpoint |
| `discovery.get_assets` | Query assets from DB | `GET /api/v1/assets` |
| `discovery.ping_sweep` | Discover network hosts | `scanner.ping_sweep()` |
| `scanning.vuln_scan` | Run vuln scripts | `scanner.vulnerability_scan()` |
| `control.assert` | Track test pass/fail | New in executor |

### P2 - Medium Value

| Block | Purpose | Backend Method |
|-------|---------|----------------|
| `traffic.export_pcap` | Save capture to file | `sniffer.export_pcap()` |
| `traffic.get_discovered` | Get passively found hosts | `sniffer.get_discovered_hosts()` |
| `agent.select` | Pick agent for POV | Query agents |
| `scanning.os_detect` | Fingerprint OS | `scanner.os_detection()` |

### P3 - Nice to Have

| Block | Purpose | Backend Method |
|-------|---------|----------------|
| `traffic.craft_packet` | Custom packet send | `sniffer.craft_and_send_packet()` |
| `network.interface_state` | Enable/disable port | Via SSH + command |
| `control.parallel_each` | Run iterations in parallel | Modify executor |

---

## Flow Engine Changes Required

### 1. Loop Execution (Critical)

```python
# Current (broken):
async def execute_loop_node(self, node, context):
    # Just returns iterations count, doesn't actually loop
    return {"iterations": count}

# Needed:
async def execute_loop_node(self, node, context):
    array = evaluate_expression(node.params.array, context)
    results = []
    
    for index, item in enumerate(array):
        # Set iteration context
        context.variables["item"] = item
        context.variables["index"] = index
        
        # Find and execute "iteration" branch nodes
        iteration_branch = get_iteration_branch(node)
        for branch_node in iteration_branch:
            result = await execute_node(branch_node, context)
            if node.params.collect:
                results.append(result)
    
    # After all iterations, follow "complete" branch
    context.variables["loop_results"] = results
    return {"completed": True, "count": len(array), "results": results}
```

### 2. Collect Block (Simple)

```python
async def execute_collect_node(self, node, context):
    variable = node.params.variable
    value = evaluate_expression(node.params.value, context)
    
    # Initialize if needed
    if variable not in context.variables:
        context.variables[variable] = []
    
    # Append
    context.variables[variable].append(value)
    
    return {"collected": True, "count": len(context.variables[variable])}
```

### 3. Report Block

```python
async def execute_report_node(self, node, context):
    title = node.params.title
    data = context.variables.get(node.params.data_variable, [])
    columns = node.params.columns
    
    # Generate markdown table
    report = generate_markdown_table(title, data, columns)
    
    # Output to console
    context.output_console(report)
    
    # Optionally save to DB
    if node.params.save:
        save_report_to_db(context.workflow_id, report)
    
    return {"report_generated": True, "row_count": len(data)}
```

### 4. Assert Block

```python
async def execute_assert_node(self, node, context):
    name = node.params.name
    expression = node.params.expression
    
    passed = evaluate_boolean_expression(expression, context)
    
    # Record test result
    if "test_results" not in context.variables:
        context.variables["test_results"] = []
    
    context.variables["test_results"].append({
        "name": name,
        "passed": passed,
        "expression": expression,
        "actual_value": context.variables.get("$prev")
    })
    
    # Handle failure
    if not passed and node.params.on_fail == "stop":
        raise AssertionError(f"Assertion failed: {name}")
    
    return {"passed": passed, "assertion": name}
```

---

## Implementation Priority Matrix

| Priority | Item | Effort | Flows Enabled |
|----------|------|--------|---------------|
| 🔴 P0 | Fix Loop execution | 2-3 days | ALL |
| 🔴 P0 | Add Collect block | 0.5 days | ALL |
| 🟡 P1 | Add Report block | 1 day | ALL |
| 🟡 P1 | Add Get Assets block | 0.5 days | 3, 6, 7 |
| 🟡 P1 | Add Ping Sweep block | 0.5 days | 2, 4, 6 |
| 🟡 P1 | Add Assert block | 1 day | 5 |
| 🔵 P2 | Add Vuln Scan block | 0.5 days | 4 |
| 🔵 P2 | Add Export PCAP block | 0.5 days | 8 |
| 🔵 P3 | Extend scans for POV | 1 day | 6 |

**Minimal Viable Enhancement: P0 only = 3-4 days**
- Unlocks flows 1, 2, 3, 7, 8

**Full Platform Enhancement: P0 + P1 = 6-8 days**
- Unlocks all 8 documented flows

---

## Recommendations

### Start With
1. **Fix Loop execution** - This is the single biggest blocker
2. **Add Collect + Report** - Enables useful output

### Quick Demo Flow
After P0, create a simple demo:
```
Start → Set hosts → Loop → Ping → Collect → Report → End
```
This proves the iteration model works.

### User Questions to Resolve
1. **Nested loops?** (e.g., switches → ports) - Adds complexity
2. **Report storage?** - DB or just console?
3. **POV mode priority?** - Useful but adds proxy plumbing
4. **Network device commands?** - Custom CLI abstraction needed?
