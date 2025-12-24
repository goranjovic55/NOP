# Network Observatory Platform (NOP)
## Production Blueprint v1.0

**Project Status:** Planning Phase  
**Target Platform:** Radxa-E54C SBC (ARM64)  
**Deployment:** Docker Compose  
**Primary Purpose:** Network Monitoring & Intelligence  

---

## Executive Summary

Network Observatory Platform (NOP) is a comprehensive, self-contained network assessment platform designed for deployment as a network monitoring appliance. It provides complete visibility into LAN environments through passive discovery, real-time traffic analysis, and intelligent topology mapping.

### Core Value Proposition

- **Single-pane visibility** into all network assets and traffic
- **Zero-configuration discovery** of network devices
- **Browser-based remote access** eliminating the need for multiple client tools
- **Operator-controlled escalation** for security testing when needed
- **SBC-optimized** for efficient edge deployment

### Key Differentiators

Unlike existing solutions (NetAlertX, ntopng, Security Onion), NOP uniquely combines:
- Automatic topology inference with confidence scoring
- Integrated credential vault with browser-based access
- Unified monitoring and optional security testing
- Single Docker Compose deployment on ARM64

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │
│  │Topology  │ Traffic  │ Assets   │ Access   │ Tools  │ │
│  └──────────┴──────────┴──────────┴──────────┴────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ REST API / WebSocket
┌────────────────────────▼────────────────────────────────┐
│              Backend Orchestrator (FastAPI)              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Auth │ Config │ Jobs │ Docker Control │ Crypto  │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    Data Layer                            │
│  ┌─────────────────┬──────────────────┬──────────────┐  │
│  │   PostgreSQL    │      Redis       │   Volumes    │  │
│  │  (State/Config) │  (Cache/Queues)  │  (Evidence)  │  │
│  └─────────────────┴──────────────────┴──────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Discovery & Analysis Plane                  │
│  ┌─────────────┬──────────────┬────────────────────┐    │
│  │  Passive    │    ntopng    │    Topology        │    │
│  │  Discovery  │   (Traffic)  │    Inference       │    │
│  └─────────────┴──────────────┴────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│           On-Demand Services (Profile-based)             │
│  ┌──────────┬──────────┬──────────┬─────────┬────────┐  │
│  │   SSH    │   RDP    │   Nmap   │  Nuclei │ Mythic │  │
│  │  Proxy   │   VNC    │ Scanner  │  (CVE)  │  (C2)  │  │
│  └──────────┴──────────┴──────────┴─────────┴────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Frontend (React + TypeScript)

**Technology Stack:**
- React 18 with TypeScript
- D3.js / Cytoscape.js for topology visualization
- TanStack Query for data fetching
- Tailwind CSS for styling
- Recharts for traffic graphs
- xterm.js for terminal emulation

**Key Features:**
- Real-time topology graph with force-directed layout
- Interactive traffic dashboards
- Asset detail panels with inline actions
- Settings management interface
- Evidence viewer and report generator

### 2. Backend (FastAPI + Python)

**Technology Stack:**
- FastAPI for async API
- SQLAlchemy for ORM
- Celery for background jobs
- Docker SDK for container management
- Cryptography for credential encryption
- Scapy for packet manipulation

**Responsibilities:**
- API endpoints for all operations
- Docker container lifecycle management
- Credential encryption/decryption
- Job scheduling and execution
- WebSocket connections for real-time updates

### 3. Database Layer

**PostgreSQL Schema:**
```sql
-- Core tables
assets (network devices)
credentials (encrypted auth data)
flows (network traffic metadata)
scans (scan results and history)
events (system audit log)
vulnerabilities (CVE findings)
topology_edges (connection graph)
users (authentication)
settings (system configuration)
```

**Redis Usage:**
- Session storage
- Job queues
- Real-time metrics cache
- ntopng data bridge

### 4. Discovery Engine

**Passive Discovery (Always Active):**
- ARP table monitoring
- DHCP lease observation
- ntopng host detection
- MAC vendor lookup (OUI database)

**Active Discovery (Configurable):**
- Nmap scan profiles (light/medium/deep)
- Service version detection
- OS fingerprinting
- Script-based enumeration

### 5. Traffic Analysis (ntopng)

**Integration Points:**
- Flow data export to PostgreSQL
- REST API for metrics queries
- Real-time alerts via webhook
- Protocol analysis (nDPI)

**Exposed Metrics:**
- Bandwidth utilization over time
- Top talkers (hosts and applications)
- Protocol distribution
- Flow matrix
- Anomaly detection alerts

### 6. Access Hub

**Browser-Based Protocols:**
- SSH → xterm.js + backend websocket proxy
- RDP/VNC → Apache Guacamole
- FTP/SFTP → Web file manager interface

**Credential Vault:**
- AES-256-GCM encryption at rest
- Per-asset, per-protocol credentials
- Automatic connection testing
- Audit logging of all access

### 7. Operator Toolkit (Optional)

**Vulnerability Assessment:**
- Nuclei for CVE scanning
- Custom Nmap NSE scripts
- Manual Metasploit interface

**C2 Infrastructure (Mythic):**
- Agent generation (Windows/Linux/macOS)
- Listener configuration (HTTP/HTTPS/DNS)
- Session management
- Task execution logging

**MITM Capabilities:**
- BetterCAP integration
- SSL stripping (explicit enable)
- DNS spoofing (rule-based)
- Traffic injection (manual)

---

## Deployment Architecture

### Docker Compose Structure

```yaml
# Three-tier profile system
services:
  # Tier 1: Always-On (default)
  frontend:
  backend:
  postgres:
  redis:
  ntopng:
  discovery-worker:
  
  # Tier 2: On-Demand
  ssh-proxy:
    profiles: [access]
  guacamole:
    profiles: [access]
  scanner:
    profiles: [scanning]
  
  # Tier 3: Advanced (Explicit Enable)
  nuclei:
    profiles: [offensive]
  metasploit:
    profiles: [offensive]
  mythic:
    profiles: [offensive]
  bettercap:
    profiles: [offensive]
```

### Network Requirements

- **Host networking** for scanner and ntopng containers
- **Bridge network** for internal service communication
- **Promiscuous mode** access on primary interface
- **NET_ADMIN + NET_RAW** capabilities

### Storage Requirements

- PostgreSQL: 10GB minimum, 50GB recommended
- Evidence volumes: 20GB minimum
- ntopng data: 5GB minimum
- Total: ~75GB for production use

---

## Security Model

### Authentication & Authorization

**User Roles:**
- **Admin:** Full system access, configuration, user management
- **Operator:** Run scans, access devices, view all data
- **Analyst:** Read-only access to data and reports
- **Viewer:** Dashboard and topology view only

**Session Management:**
- JWT tokens with refresh mechanism
- Configurable timeout
- IP-based rate limiting
- MFA support (TOTP)

### Credential Security

**Encryption:**
- Master key derived from admin password + salt
- Per-credential AES-256-GCM encryption
- Key rotation mechanism
- Secure key storage in environment

**Audit Trail:**
- All credential access logged
- Credential usage tracked per user
- Failed authentication attempts logged
- Credential validation history

### Network Isolation

- Scanner containers isolated from data plane
- Offensive tools run in separate Docker network
- No default outbound access for containers
- Explicit allow-list for external connections

---

## Configuration Management

### User-Configurable Settings

**Discovery Settings:**
```yaml
discovery:
  mode: passive_only | active_passive | aggressive
  scan_interval: 300  # seconds, 0 = manual only
  target_subnets:
    - 192.168.1.0/24
    - 10.0.0.0/16
  excluded_ips: []
```

**Scanning Profiles:**
```yaml
scanning:
  os_detection: none | light | intense
  service_detection: true
  default_scripts: true
  custom_scripts: []
  timing: T3  # nmap timing
```

**Traffic Analysis:**
```yaml
traffic:
  enable_dpi: true
  credential_detection: false
  data_retention_days: 30
  alert_sensitivity: medium
  threat_intel: false
```

**Offensive Toolkit:**
```yaml
offensive:
  enabled: false  # Master switch
  auto_cve_scan: false
  auto_exploit: false
  c2_enabled: false
  mitm_attacks: false
```

---

## Data Flow Examples

### Discovery Flow
```
1. ARP table scan detects new MAC address
2. Discovery worker queries OUI database for vendor
3. Optional: Active scan triggered based on config
4. Asset record created/updated in PostgreSQL
5. Topology inference engine recalculates graph
6. WebSocket pushes update to connected clients
7. Frontend updates topology visualization
```

### Access Flow
```
1. User clicks "Connect SSH" on asset
2. Frontend requests credential from vault
3. Backend decrypts credential
4. Backend starts ssh-proxy container
5. Proxy establishes SSH connection to target
6. WebSocket bridge created
7. xterm.js renders terminal in browser
8. All I/O logged to audit trail
```

### Scan Flow
```
1. User initiates scan from asset context menu
2. Backend validates user permissions
3. Scan job queued in Redis
4. Worker picks up job
5. Nmap container started with profile
6. Results streamed back via WebSocket
7. Results parsed and stored in database
8. Vulnerabilities extracted and indexed
9. Asset record updated
10. User notified of completion
```

---

## Performance Considerations

### SBC Optimization (Radxa-E54C)

**Hardware Profile:**
- CPU: 8-core ARM Cortex-A76/A55
- RAM: 4GB/8GB/16GB variants
- Storage: eMMC + NVMe
- Network: 2.5GbE

**Optimization Strategies:**
- DPI toggleable to reduce CPU load
- Scan rate limiting
- Database query optimization
- Redis caching for frequent queries
- Container resource limits
- Lazy loading of offensive containers

### Scalability Targets

- **Small Network:** 1-50 devices, 1GB RAM usage
- **Medium Network:** 50-250 devices, 2-4GB RAM usage
- **Large Network:** 250-500 devices, 4-8GB RAM usage

---

## Non-Goals (Explicit Exclusions)

### What NOP is NOT:

❌ **Not an autonomous hacking framework**  
❌ **Not a worm or self-propagating tool**  
❌ **Not a credential harvesting platform**  
❌ **Not a production firewall or IDS**  
❌ **Not a penetration testing automation suite**  
❌ **Not a malware analysis platform**  

### Design Boundaries:

- **No automatic exploitation** of discovered vulnerabilities
- **No lateral movement** without explicit operator command
- **No data exfiltration** capabilities
- **No stealth features** that hide the tool's presence
- **No persistent backdoors** installed by default

---

## Success Metrics

### Primary Goals:
- Discover 95%+ of network devices within 1 hour
- Provide real-time traffic visibility with <1s latency
- Enable remote access in <3 clicks
- Generate comprehensive reports in <30 seconds

### User Experience:
- Setup time: <15 minutes from docker-compose up
- Learning curve: Operator-ready in <1 hour
- False positive rate: <5% in topology inference
- System availability: 99%+ uptime

---

## Next Steps

See individual documents:
- [Architecture Details](./ARCHITECTURE.md)
- [Development Roadmap](./ROADMAP.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [API Specification](./API_SPEC.md)
- [UI Mockups](./UI_MOCKUPS.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Configuration Reference](./CONFIGURATION.md)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-24  
**Status:** Ready for Development