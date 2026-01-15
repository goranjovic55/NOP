---
title: Automation Scripts
type: reference
category: development
auto_generated: true
last_updated: 2026-01-14
---

# Automation Scripts

## Overview

This document catalogs automation scripts used in the project.

## Scripts


### agent
**File**: `scripts/agent.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `check_and_install_deps` | Check and install required dependencies |
| `encrypt_message` | Encrypt message for C2 transmission |
| `decrypt_message` | Decrypt message from C2 |
| `send_encrypted` | Send encrypted message to C2 |
| `connect` | Connect to NOP C2 server with encrypted tunnel |
| `noop` | No-op for disabled modules |
| `register` | Register agent with C2 server |
| `heartbeat` | Send periodic heartbeat to C2 |
| `message_handler` | Handle incoming commands from C2 |
| `handle_command` | Execute command from C2 based on module capabiliti |


### lint_protocol
**File**: `scripts/lint_protocol.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `lint` | Run all linting checks. Returns True if no issues. |
| `print_report` | Print linting report |
| `get_grade` | Return letter grade based on issues and warnings |
| `lint_multiple_files` | Lint multiple workflow log files |


### test_source_only_tracking
**File**: `scripts/test_source_only_tracking.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `get_settings` | Get current discovery settings. |
| `set_track_source_only` | Update track_source_only setting. |
| `clear_discovered_hosts` | Clear all currently discovered hosts. |
| `get_discovered_hosts` | Get currently discovered hosts. |
| `get_my_ip` | Get the IP address of this host on eth0 (Docker ne |
| `send_test_packets` | Send packets with various destination types. |
| `main` | Implementation |


### test_agent_auto
**File**: `scripts/test_agent_auto.py` | **Updated**: 2026-01-09


### test_pov_filtering
**File**: `scripts/test_pov_filtering.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `get_token` | Authenticate and get token |
| `test_endpoint` | Test an endpoint with and without POV |
| `main` | Implementation |


### test_url_bug
**File**: `scripts/test_url_bug.py` | **Updated**: 2026-01-09


### test_complete
**File**: `scripts/test_complete.py` | **Updated**: 2026-01-09


### generate_knowledge
**File**: `scripts/generate_knowledge.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `add_entity` | Add entity and categorize into domain. |
| `add_relation` | Implementation |
| `add_codegraph` | Implementation |
| `scan_python_backend` | Scans FastAPI backend for Services, Models, and Ro |
| `add_relation` | Implementation |
| `scan_react_frontend` | Scans React frontend for Components and Hooks |
| `scan_docker_infrastructure` | Scans docker-compose for Services |
| `generate_domain_summaries` | Generate domain summaries with tech stacks and ent |
| `main` | Implementation |


### test_url_bug_20260105_002748
**File**: `scripts/test_url_bug_20260105_002748.py` | **Updated**: 2026-01-09


### test_complete_20260105_002748
**File**: `scripts/test_complete_20260105_002748.py` | **Updated**: 2026-01-09


### validate_knowledge
**File**: `scripts/validate_knowledge.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `validate` | Run all validations. Returns True if no errors. |
| `print_report` | Print validation report |


### simulate_realistic_traffic
**File**: `scripts/simulate_realistic_traffic.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `simulate_http_traffic` | Simulate HTTP requests to web server |
| `simulate_ssh_traffic` | Simulate SSH connection |
| `simulate_database_traffic` | Simulate MySQL connections |
| `simulate_file_share_traffic` | Simulate SMB file share access |
| `simulate_rdp_traffic` | Simulate RDP connection |
| `simulate_vnc_traffic` | Simulate VNC connection |
| `simulate_ftp_traffic` | Simulate FTP connection |
| `simulate_dns_query` | Simulate DNS query |
| `simulate_arp_request` | Simulate ARP request (broadcast) |
| `simulate_multicast_mdns` | Simulate mDNS multicast traffic |


### test_agent_quick_20260105_002748
**File**: `scripts/test_agent_quick_20260105_002748.py` | **Updated**: 2026-01-09


### create_fresh_agent
**File**: `scripts/create_fresh_agent.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `get_token` | Implementation |
| `create_agent` | Create new agent |
| `download_agent` | Download agent file |
| `main` | Implementation |


### generate_traffic
**File**: `scripts/generate_traffic.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `run_command` | Implementation |
| `generate_traffic` | Implementation |


### test_agent_auto_20260105_002748
**File**: `scripts/test_agent_auto_20260105_002748.py` | **Updated**: 2026-01-09


### agent_new
**File**: `scripts/agent_new.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `check_and_install_deps` | Check and install required dependencies |
| `encrypt_message` | Encrypt message for C2 transmission |
| `decrypt_message` | Decrypt message from C2 |
| `send_encrypted` | Send encrypted message to C2 |
| `connect` | Connect to NOP C2 server with encrypted tunnel |
| `noop` | No-op for disabled modules |
| `register` | Register agent with C2 server |
| `heartbeat` | Send periodic heartbeat to C2 |
| `message_handler` | Handle incoming commands from C2 |
| `handle_command` | Execute command from C2 based on module capabiliti |


### test_broadcast_filter
**File**: `scripts/test_broadcast_filter.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `get_network_info` | Get current network interface and subnet |
| `send_unicast_traffic` | Send legitimate unicast traffic |
| `send_broadcast_traffic` | Send broadcast traffic |
| `send_multicast_traffic` | Send multicast traffic |
| `send_link_local_traffic` | Send link-local traffic |
| `main` | Implementation |


### test_socks_e2e
**File**: `scripts/test_socks_e2e.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `test_websocket_connection` | Test 1: WebSocket connection and SOCKS proxy creat |
| `test_socks_proxy_port` | Test 2: Verify SOCKS proxy is listening |
| `test_agent_metadata` | Test 3: Verify agent metadata has SOCKS port |
| `test_pov_mode_scan` | Test 4: POV mode scan through API |
| `main` | Run all E2E tests |


### generate_test_traffic
**File**: `scripts/generate_test_traffic.py` | **Updated**: 2026-01-09

| Function | Description |
|----------|-------------|
| `generate_unicast_traffic` | Generate unicast UDP packets to specific IP |
| `generate_multicast_traffic` | Generate multicast packets (mDNS default group) |
| `generate_broadcast_traffic` | Generate broadcast packets |
| `generate_arp_traffic` | Generate ARP broadcast packets |
| `generate_link_local_traffic` | Generate link-local traffic (169.254.x.x) |
| `generate_all_types` | Generate all traffic types for comprehensive testi |
| `main` | Implementation |


## AKIS Scripts

Scripts for AKIS framework session management. Located in `.github/scripts/`.

**⚠️ END Phase Order:** Create workflow log BEFORE running scripts (scripts parse YAML front matter).

### knowledge
**File**: `.github/scripts/knowledge.py` | **Updated**: 2026-01-11

| Mode | Description |
|------|-------------|
| `--update` | Updates project_knowledge.json with session entities |
| (default) | Reports session entities without modifying files |

### skills
**File**: `.github/scripts/skills.py` | **Updated**: 2026-01-11

| Mode | Description |
|------|-------------|
| `--suggest` | Suggests skills based on workflow log + git diff (3x weight for latest log) |
| `--update` | Creates stub files for new skill candidates |
| (default) | Reports skill usage and candidates |

### docs
**File**: `.github/scripts/docs.py` | **Updated**: 2026-01-11

| Mode | Description |
|------|-------------|
| `--suggest` | Suggests doc updates from workflow log gotchas/root_causes + git diff |
| `--update` | Applies documentation updates |
| `--index` | Regenerates docs/INDEX.md |
| (default) | Reports documentation updates needed |

### agents
**File**: `.github/scripts/agents.py` | **Updated**: 2026-01-11

| Mode | Description |
|------|-------------|
| `--suggest` | Suggests agent optimizations from workflow log + session patterns |
| `--update` | Updates existing agent files |
| `--generate` | Creates agent files with 100k simulation |
| (default) | Reports agent status |

### instructions
**File**: `.github/scripts/instructions.py` | **Updated**: 2026-01-11

| Mode | Description |
|------|-------------|
| `--suggest` | Suggests instruction additions from workflow log gate violations + gotchas |
| `--update` | Creates instruction files for gaps |
| (default) | Reports instruction coverage gaps |

### Workflow Log Parsing

All scripts parse YAML front matter from `log/workflow/*.md`:

| Script | Parses |
|--------|--------|
| skills.py | `skills.loaded`, `skills.suggested`, `gotchas` |
| agents.py | `agents.delegated`, `session.complexity`, `root_causes` |
| docs.py | `files.modified`, `gotchas`, `root_causes` |
| instructions.py | `gates.violations`, `gotchas` |

**Priority:** Latest log gets **3x weight**, second log **2x weight**.

