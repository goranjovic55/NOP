# NOP Workflow Automation Gap Analysis

> **Date:** January 14, 2026  
> **Version:** 1.0  
> **Research Basis:** Industry tools (Ansible, NAPALM, Nornir, Terraform, Batfish) + Community patterns

## Executive Summary

This analysis evaluates NOP's workflow automation capabilities against industry standards and community best practices. NOP currently has **50+ block types** across 8 categories, providing excellent coverage for basic scanning, connection testing, and command execution. However, significant gaps exist in:

1. **Configuration Management** - No backup/restore/rollback
2. **Network State Control** - No VLAN/interface management
3. **Error Resilience** - No retry/rollback patterns
4. **Integrations** - No ticketing/notification systems

This document proposes **26 new block types** and **15 automation scenarios** to bring NOP to feature parity with industry-leading tools.

---

## Current State Analysis

### Block Inventory (50+ blocks)

| Category | Count | Blocks |
|----------|-------|--------|
| **Assets** | 8 | get_all, get_by_filter, get_single, discover_arp, discover_ping, discover_passive, check_online, get_credentials |
| **Control** | 8 | start, end, delay, condition, loop, parallel, variable_set, variable_get |
| **Connection** | 5 | ssh_test, rdp_test, vnc_test, ftp_test, tcp_test |
| **Command** | 5 | ssh_execute, system_info, ftp_list, ftp_download, ftp_upload |
| **Traffic** | 7 | start_capture, stop_capture, burst_capture, get_stats, ping, advanced_ping, storm |
| **Scanning** | 6 | version_detect, port_scan, network_discovery, host_scan, ping_sweep, service_scan |
| **Agent** | 3 | generate, deploy, terminate |
| **Data** | 4 | code, output_interpreter, assertion, transform |
| **Vulnerability** | 3 | cve_lookup, get_exploits, execute_exploit |
| **Asset (Legacy)** | 3 | list_assets, get_asset, get_stats |

### Strengths ✅

| Capability | Status | Notes |
|------------|--------|-------|
| Visual Workflow Builder | ✅ Excellent | React Flow-based, cyberpunk UI |
| Real-time Execution | ✅ Excellent | WebSocket progress updates |
| Pass/Fail Routing | ✅ Excellent | 3-output blocks for decision logic |
| Parallel Execution | ✅ Good | `control.parallel` block |
| Code/Transform Blocks | ✅ Excellent | JavaScript-based data processing |
| Network Scanning | ✅ Good | Nmap integration |
| Vulnerability Assessment | ✅ Good | CVE lookup, exploit execution |

### Gaps ❌

| Gap Category | Impact | Industry Baseline |
|--------------|--------|-------------------|
| Config Management | Cannot automate backups, restores, or changes | Ansible, NAPALM, Terraform |
| Network State | Cannot manage VLANs, interfaces, routing | Ansible Network modules |
| Error Handling | No automatic retries or rollbacks | Ansible rescue/retry |
| Ticketing | No ITSM integration | ServiceNow, Jira APIs |
| Notifications | No alerting on completion/failure | Slack, Teams, Email |
| Compliance | No policy-based validation | Batfish, Ansible assert |

---

## Industry Use Case Comparison

### Use Case Coverage Matrix

| Use Case | Industry Frequency | NOP Coverage | Gap |
|----------|-------------------|--------------|-----|
| **Network Discovery** | 95% | ✅ Full | - |
| **Port Scanning** | 95% | ✅ Full | - |
| **Vulnerability Scanning** | 90% | ✅ Good | NSE scripts |
| **Credential Testing** | 85% | ✅ Good | - |
| **Configuration Backup** | 95% | ❌ Missing | Critical |
| **Configuration Restore** | 90% | ❌ Missing | Critical |
| **VLAN Management** | 80% | ❌ Missing | High |
| **Interface Control** | 80% | ❌ Missing | High |
| **Compliance Checking** | 75% | ❌ Missing | Medium |
| **Change Rollback** | 85% | ❌ Missing | High |
| **Approval Gates** | 60% | ❌ Missing | Medium |
| **Ticketing Integration** | 70% | ❌ Missing | Medium |
| **Notifications** | 80% | ❌ Missing | High |
| **Firmware Upgrade** | 50% | ❌ Missing | Low |
| **REP/STP Ring Testing** | 40% | ⚠️ Template | Blocks needed |

---

## Automation Scenarios

### Scenario 1: Configuration Backup (P1 - Critical)

**Description:** Automated backup of network device configurations with versioning and validation.

**Workflow:**
```
START → Get All Assets (type=router,switch) → 
  [Loop: Each Device] →
    Connect SSH → Get Running Config → 
    [If Config Changed] → Save to Storage → 
    [Else] → Skip →
  [End Loop] → Generate Report → END
```

**Missing Blocks:**
- `config.backup` - Get running/startup config
- `config.save` - Save config to storage (local/TFTP/SCP)
- `config.compare` - Diff two configurations

**Value:** Enables disaster recovery, compliance audits, and change tracking.

---

### Scenario 2: Pre/Post Change Validation (P1 - Critical)

**Description:** Safe change management with automatic rollback on failure.

**Workflow:**
```
START → Take Pre-Snapshot →
  Create Change Ticket →
  [Wait for Approval] →
  Apply Configuration Change →
  Take Post-Snapshot →
  [If Validation Passes] → Close Ticket (Success) → END
  [Else] → Rollback Config → Close Ticket (Failed) → Alert → END
```

**Missing Blocks:**
- `config.checkpoint` - Create rollback point
- `config.rollback` - Revert to checkpoint
- `validation.compare_snapshots` - Verify pre/post state
- `integration.servicenow_create` - Create change request
- `integration.servicenow_wait` - Wait for approval

**Value:** Reduces change failure rate, enables auditability, meets compliance requirements.

---

### Scenario 3: VLAN Management Automation (P1 - High)

**Description:** Automated VLAN creation, modification, and deployment across multiple switches.

**Workflow:**
```
START → Get Switches (role=distribution) →
  [Parallel: Each Switch] →
    Connect SSH →
    Create VLAN 100 (name=PRODUCTION) →
    Assign Ports (Gi0/1-Gi0/10) →
    Verify VLAN Active →
  [Join] → Generate Compliance Report → END
```

**Missing Blocks:**
- `network.vlan_create` - Create VLAN
- `network.vlan_delete` - Delete VLAN
- `network.vlan_assign_ports` - Assign ports to VLAN
- `network.vlan_get` - Get VLAN information
- `network.trunk_configure` - Configure trunk ports

**Value:** Enables rapid network provisioning, reduces manual configuration errors.

---

### Scenario 4: REP Ring Failover Testing (P1 - High)

**Description:** Automated testing of REP (Resilient Ethernet Protocol) ring convergence.

**Workflow:**
```
START → Get Ring Topology →
  [Loop: Each Link in Ring] →
    Record Pre-Failover State →
    Disable Primary Port →
    Start Timer →
    Monitor REP Status →
    [Wait Until: Ring Converged OR Timeout] →
    Record Convergence Time →
    Verify Traffic Path →
    Enable Port →
    [Wait Until: Ring Restored] →
  [End Loop] → 
  Generate REP Test Report →
  [If Any Convergence > Threshold] → Alert → END
  [Else] → END
```

**Missing Blocks:**
- `network.interface_disable` - Disable port/interface
- `network.interface_enable` - Enable port/interface
- `network.rep_status` - Get REP ring status
- `network.stp_topology` - Get spanning tree topology
- `timer.start` - Start named timer
- `timer.stop` - Stop timer and get elapsed

**Value:** Validates network redundancy, identifies convergence issues before production impact.

---

### Scenario 5: Compliance Audit (P2 - Medium)

**Description:** Automated compliance checking against security policies.

**Workflow:**
```
START → Get All Network Devices →
  [Parallel: Each Device] →
    Get Running Config →
    [Check: SSH Enabled] → Record Result →
    [Check: Telnet Disabled] → Record Result →
    [Check: SNMPv3 Only] → Record Result →
    [Check: Password Complexity] → Record Result →
    [Check: Logging Enabled] → Record Result →
  [Join] → Aggregate Results →
  Generate Compliance Report →
  [If Violations Found] → Create Tickets → Alert → END
  [Else] → END
```

**Missing Blocks:**
- `compliance.check_rule` - Check against regex/policy
- `compliance.aggregate` - Aggregate check results
- `report.generate` - Generate formatted report
- `report.export` - Export to PDF/CSV

**Value:** Continuous compliance monitoring, audit preparation, security posture assessment.

---

### Scenario 6: Incident Response Automation (P2 - Medium)

**Description:** Automated response to security incidents with evidence collection.

**Workflow:**
```
START → Receive Alert (compromised_host) →
  Get Asset Details →
  Create Incident Ticket →
  [Parallel Branch 1: Containment]
    Get Connected Switch →
    Disable Port →
    Log Action →
  [Parallel Branch 2: Evidence Collection]
    Start Packet Capture →
    Get ARP Table →
    Get MAC Table →
    Get Routing Table →
    Stop Capture →
  [Join] →
  Attach Evidence to Ticket →
  Notify Security Team →
  END
```

**Missing Blocks:**
- `network.get_arp_table` - Get ARP entries
- `network.get_mac_table` - Get MAC address table
- `network.get_routes` - Get routing table
- `evidence.collect` - Aggregate evidence
- `evidence.attach` - Attach to ticket

**Value:** Reduces incident response time, ensures evidence preservation, enables automation of runbooks.

---

### Scenario 7: Firmware Upgrade Campaign (P2 - Medium)

**Description:** Automated firmware upgrades across device fleet with validation.

**Workflow:**
```
START → Get Devices (firmware_version < target) →
  [Loop: Each Device (batch_size=5)] →
    Backup Current Config →
    Upload New Firmware →
    Set Boot Variable →
    Reload Device →
    [Wait Until: Device Reachable] →
    Verify Firmware Version →
    [If Version Mismatch] → Rollback → Alert →
    Verify Config Intact →
  [End Loop] → Generate Upgrade Report → END
```

**Missing Blocks:**
- `firmware.upload` - Upload firmware via TFTP/SCP
- `firmware.get_version` - Get current firmware version
- `firmware.set_boot` - Set boot image
- `device.reload` - Reload/reboot device
- `device.wait_online` - Wait until device is reachable

**Value:** Reduces manual effort, ensures consistent upgrades, enables maintenance windows.

---

### Scenario 8: Network Topology Discovery (P2 - Medium)

**Description:** Automated discovery of network topology using CDP/LLDP.

**Workflow:**
```
START → Get Seed Devices →
  [Loop Until: No New Devices] →
    [Parallel: Each Device] →
      Get CDP/LLDP Neighbors →
      Add New Devices to Queue →
      Record Link Information →
    [Join] →
  [End Loop] →
  Build Topology Graph →
  Update CMDB →
  Generate Topology Map →
  END
```

**Missing Blocks:**
- `network.get_cdp_neighbors` - Get CDP neighbor table
- `network.get_lldp_neighbors` - Get LLDP neighbor table
- `topology.build_graph` - Build network graph
- `topology.export_map` - Export topology visualization

**Value:** Automatic documentation, change impact analysis, troubleshooting aid.

---

### Scenario 9: Credential Spray Testing (P3 - Security)

**Description:** Automated testing of credentials across network services.

**Workflow:**
```
START → Get Target Assets →
  Load Credential List →
  [Loop: Each Asset] →
    Detect Open Services →
    [Parallel: Each Service] →
      [SSH] → Test SSH Credentials →
      [RDP] → Test RDP Credentials →
      [SNMP] → Test SNMP Strings →
      [HTTP] → Test Web Credentials →
    [Join] →
    Record Successful Credentials →
  [End Loop] →
  Generate Credential Report (with risk scores) →
  Alert on Default/Weak Credentials →
  END
```

**Missing Blocks:**
- `security.credential_spray` - Test multiple credentials
- `security.snmp_test` - Test SNMP community strings
- `security.http_auth_test` - Test HTTP authentication
- `security.risk_score` - Calculate credential risk

**Value:** Identifies weak credentials, security posture assessment, audit compliance.

---

### Scenario 10: Multi-Site VPN Health Check (P3 - Monitoring)

**Description:** Automated health check of VPN tunnels across sites.

**Workflow:**
```
START → Get VPN Peers →
  [Parallel: Each Site] →
    Check Tunnel Status →
    Measure Latency →
    Test Throughput →
    Verify Routing →
  [Join] →
  Compare Against Baseline →
  [If Degradation] → Alert NOC →
  Update Dashboard →
  END
```

**Missing Blocks:**
- `vpn.get_tunnel_status` - Get IPsec/SSL VPN status
- `vpn.get_peers` - List VPN peers
- `network.measure_latency` - Measure round-trip time
- `network.test_throughput` - Bandwidth test

**Value:** Proactive monitoring, SLA compliance, capacity planning.

---

### Scenario 11: Notification on Workflow Completion (P1 - High)

**Description:** Send alerts when workflows complete or fail.

**Workflow:**
```
[Any Workflow] →
  ... workflow steps ...
  [On Success] → Send Slack Message (✅ Completed) → END
  [On Failure] → Send Slack Message (❌ Failed) → 
                 Create Jira Issue → 
                 Send Email to Team → END
```

**Missing Blocks:**
- `notification.slack` - Send Slack message
- `notification.teams` - Send Teams message
- `notification.email` - Send email via SMTP
- `notification.webhook` - Generic webhook call

**Value:** Situational awareness, faster incident response, workflow visibility.

---

### Scenario 12: Database Backup Automation (P3 - Operations)

**Description:** Automated backup of NOP database and configuration.

**Workflow:**
```
START → Check Database Status →
  Create Database Dump →
  Compress Backup →
  Upload to Remote Storage →
  Verify Backup Integrity →
  Rotate Old Backups →
  Update Backup Log →
  END
```

**Missing Blocks:**
- `database.backup` - Create database dump
- `database.restore` - Restore from backup
- `storage.upload` - Upload to S3/SFTP
- `storage.rotate` - Delete old files

**Value:** Disaster recovery, compliance, data protection.

---

### Scenario 13: Service Availability Monitoring (P2 - Monitoring)

**Description:** Continuous monitoring of critical services.

**Workflow (Scheduled):**
```
START → Load Service List →
  [Parallel: Each Service] →
    [HTTP] → Check HTTP Response →
    [TCP] → Check TCP Port →
    [DNS] → Check DNS Resolution →
    [ICMP] → Ping Host →
  [Join] →
  [If Any Failed] → Alert → Create Incident →
  Update Dashboard Metrics →
  END
```

**Missing Blocks:**
- `monitoring.http_check` - HTTP health check
- `monitoring.dns_check` - DNS resolution test
- `monitoring.tcp_check` - TCP port check
- `dashboard.update_metric` - Update dashboard widget

**Value:** Proactive monitoring, SLA compliance, early problem detection.

---

### Scenario 14: Scheduled Configuration Compliance (P2 - Compliance)

**Description:** Scheduled compliance scans with reporting.

**Workflow (Daily at 2 AM):**
```
START → Get All Network Devices →
  [Parallel: Each Device] →
    Get Running Config →
    Check Against Compliance Rules →
    Record Violations →
  [Join] →
  Generate Compliance Report →
  [If Violations > 0] →
    Send Report to Security Team →
    Create Remediation Tasks →
  Store Report in Archive →
  END
```

**Missing Blocks:**
- `scheduler.cron` - Scheduled trigger
- `compliance.rule_set` - Define compliance rules
- `report.archive` - Store report with retention

**Value:** Continuous compliance, audit readiness, security posture tracking.

---

### Scenario 15: Zero-Touch Provisioning (P3 - Advanced)

**Description:** Automated provisioning of new network devices.

**Workflow:**
```
[Trigger: New Device Detected] →
  Identify Device Type →
  Generate Base Configuration →
  Apply VLAN Configuration →
  Configure Management Access →
  Register in CMDB →
  Add to Monitoring →
  Generate Documentation →
  Notify Network Team →
  END
```

**Missing Blocks:**
- `provisioning.generate_config` - Generate config from template
- `provisioning.apply_template` - Apply configuration template
- `cmdb.register_asset` - Register in CMDB
- `monitoring.add_host` - Add to monitoring system

**Value:** Faster deployments, consistent configuration, reduced errors.

---

## Proposed New Block Types

### Category: Configuration (`config.*`) - 5 blocks

| Block | Description | Parameters | Priority |
|-------|-------------|------------|----------|
| `config.backup` | Backup running/startup config | host, config_type (running/startup), storage_path | P1 |
| `config.restore` | Restore configuration | host, config_source, merge_or_replace | P1 |
| `config.diff` | Compare two configurations | config_a, config_b, output_format | P1 |
| `config.checkpoint` | Create rollback point | host, label, include_state | P1 |
| `config.rollback` | Rollback to checkpoint | host, checkpoint_id, confirm | P1 |

### Category: Network State (`network.*`) - 10 blocks

| Block | Description | Parameters | Priority |
|-------|-------------|------------|----------|
| `network.interface_get` | Get interface status | host, interface_filter | P1 |
| `network.interface_enable` | Enable interface | host, interface | P1 |
| `network.interface_disable` | Disable interface | host, interface | P1 |
| `network.vlan_create` | Create VLAN | host, vlan_id, name | P1 |
| `network.vlan_delete` | Delete VLAN | host, vlan_id | P1 |
| `network.vlan_assign` | Assign ports to VLAN | host, vlan_id, ports, mode (access/trunk) | P1 |
| `network.get_routes` | Get routing table | host, prefix_filter | P2 |
| `network.get_mac_table` | Get MAC address table | host, vlan_filter | P2 |
| `network.get_arp` | Get ARP table | host | P2 |
| `network.get_neighbors` | Get CDP/LLDP neighbors | host, protocol | P2 |

### Category: Control Flow (`control.*`) - 4 blocks

| Block | Description | Parameters | Priority |
|-------|-------------|------------|----------|
| `control.retry` | Retry with backoff | max_attempts, delay_ms, backoff_multiplier | P1 |
| `control.try_catch` | Error handling | on_error (continue/rollback/alert) | P1 |
| `control.approval_gate` | Wait for approval | system, timeout_hours, fallback_action | P2 |
| `control.join` | Aggregate parallel results | wait_for, aggregation (all/any/first) | P2 |

### Category: Notification (`notification.*`) - 4 blocks

| Block | Description | Parameters | Priority |
|-------|-------------|------------|----------|
| `notification.slack` | Send Slack message | webhook_url, channel, message, attachments | P1 |
| `notification.teams` | Send Teams message | webhook_url, message, card_format | P1 |
| `notification.email` | Send email | smtp_config, to, cc, subject, body | P1 |
| `notification.webhook` | Generic webhook | url, method, headers, payload | P1 |

### Category: Integration (`integration.*`) - 3 blocks

| Block | Description | Parameters | Priority |
|-------|-------------|------------|----------|
| `integration.servicenow` | ServiceNow operations | action (create/update/close), ticket_data | P2 |
| `integration.jira` | Jira operations | action, project, issue_type, summary, description | P2 |
| `integration.api_call` | Generic REST API call | url, method, headers, body, auth | P2 |

---

## Priority Implementation Roadmap

### Phase 1: Critical Blocks (Sprint 1-2)

**Total: 14 blocks**

1. Configuration Management (5)
   - `config.backup`
   - `config.restore`
   - `config.diff`
   - `config.checkpoint`
   - `config.rollback`

2. Network Interface Control (3)
   - `network.interface_get`
   - `network.interface_enable`
   - `network.interface_disable`

3. Error Handling (2)
   - `control.retry`
   - `control.try_catch`

4. Notifications (4)
   - `notification.slack`
   - `notification.teams`
   - `notification.email`
   - `notification.webhook`

**Estimate:** 80-120 hours

### Phase 2: High-Value Blocks (Sprint 3-4)

**Total: 8 blocks**

1. VLAN Management (3)
   - `network.vlan_create`
   - `network.vlan_delete`
   - `network.vlan_assign`

2. Network State (3)
   - `network.get_routes`
   - `network.get_mac_table`
   - `network.get_arp`

3. Integration (2)
   - `integration.servicenow`
   - `integration.jira`

**Estimate:** 60-80 hours

### Phase 3: Advanced Features (Sprint 5-6)

**Total: 4 blocks**

1. Network Discovery (1)
   - `network.get_neighbors`

2. Workflow Control (2)
   - `control.approval_gate`
   - `control.join`

3. API Integration (1)
   - `integration.api_call`

**Estimate:** 40-60 hours

---

## Technical Implementation Notes

### Backend Implementation Pattern

Each new block requires:

1. **Block Handler** in `workflow_executor.py`:
```python
async def _execute_config_backup(self, node: CompiledNode, context: ExecutionContext) -> NodeResult:
    host = node.parameters.get('host')
    config_type = node.parameters.get('config_type', 'running')
    
    # Connect via SSH/Netmiko
    # Execute "show running-config" or equivalent
    # Return config content
    
    return NodeResult(
        node_id=node.id,
        status=ExecutionStatus.SUCCESS,
        output={'config': config_content, 'timestamp': datetime.utcnow()}
    )
```

2. **Block Definition** in `frontend/src/types/blocks.ts`:
```typescript
{
  type: 'config.backup',
  label: 'Backup Config',
  category: 'config',
  icon: '💾',
  color: '#10b981',
  description: 'Backup device configuration (running or startup)',
  inputs: [{ id: 'in', type: 'input', label: 'Input' }],
  outputs: [
    { id: 'pass', type: 'output', label: 'Pass' },
    { id: 'fail', type: 'output', label: 'Fail' },
    { id: 'out', type: 'output', label: 'Config' },
  ],
  parameters: [
    { name: 'host', label: 'Host', type: 'string', required: true },
    { name: 'config_type', label: 'Config Type', type: 'select', options: [
      { label: 'Running', value: 'running' },
      { label: 'Startup', value: 'startup' },
    ]},
    { name: 'credential', label: 'Credential', type: 'credential' },
  ],
},
```

3. **API Endpoint** (if needed):
```python
@router.post("/config/backup")
async def backup_config(request: ConfigBackupRequest):
    # Implementation
    pass
```

### Multi-Vendor Support

Consider using Netmiko for multi-vendor command execution:

| Device Type | Show Running Command |
|-------------|---------------------|
| Cisco IOS | `show running-config` |
| Cisco NX-OS | `show running-config` |
| Juniper Junos | `show configuration` |
| Arista EOS | `show running-config` |
| Palo Alto | `show config running` |

### New Category Colors

Add new category colors in `blocks.ts`:

```typescript
export const CATEGORY_COLORS: Record<BlockCategory, string> = {
  // Existing...
  config: '#10b981',       // emerald - Configuration management
  network: '#0ea5e9',      // sky - Network state
  notification: '#f97316', // orange - Notifications
  integration: '#8b5cf6',  // violet - Integrations
};
```

---

## Conclusion

This gap analysis identifies 26 new block types that would bring NOP's workflow automation to industry-standard capability. The proposed blocks address critical gaps in:

1. **Configuration Management** - Essential for any production network automation
2. **Network State Control** - Required for failover testing and VLAN automation
3. **Error Resilience** - Critical for safe change management
4. **Integrations** - Necessary for enterprise workflow orchestration

**Recommended Implementation Order:**
1. Phase 1 (Critical): Config + Error Handling + Notifications
2. Phase 2 (High-Value): VLAN + Network State + Ticketing
3. Phase 3 (Advanced): Discovery + Approval Gates + API

**Total Estimated Effort:** 180-260 hours across 6 sprints

---

## Appendix: Block Type Reference

### Current Block Types (50)

| Category | Types |
|----------|-------|
| assets | get_all, get_by_filter, get_single, discover_arp, discover_ping, discover_passive, check_online, get_credentials |
| control | start, end, delay, condition, loop, parallel, variable_set, variable_get |
| connection | ssh_test, rdp_test, vnc_test, ftp_test, tcp_test |
| command | ssh_execute, system_info, ftp_list, ftp_download, ftp_upload |
| traffic | start_capture, stop_capture, burst_capture, get_stats, ping, advanced_ping, storm |
| scanning | version_detect, port_scan, network_discovery, host_scan, ping_sweep, service_scan |
| agent | generate, deploy, terminate |
| data | code, output_interpreter, assertion, transform |
| vulnerability | cve_lookup, get_exploits, execute_exploit |
| asset | list_assets, get_asset, get_stats |

### Proposed Block Types (26)

| Category | Types |
|----------|-------|
| config | backup, restore, diff, checkpoint, rollback |
| network | interface_get, interface_enable, interface_disable, vlan_create, vlan_delete, vlan_assign, get_routes, get_mac_table, get_arp, get_neighbors |
| control | retry, try_catch, approval_gate, join |
| notification | slack, teams, email, webhook |
| integration | servicenow, jira, api_call |

