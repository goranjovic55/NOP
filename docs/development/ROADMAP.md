---
title: Development Roadmap
type: explanation
category: development
version: "1.0"
last_updated: 2026-01-14
---

# Network Observatory Platform - Development Roadmap

> Phased Implementation Plan v1.0

---

## Overview

This roadmap outlines a 6-phase development plan spanning approximately 6-9 months, designed to deliver incremental value while maintaining production quality at each milestone.

**Development Philosophy:**
- ✅ Working software over comprehensive documentation
- ✅ Incremental delivery over big-bang releases  
- ✅ User feedback loops after each phase
- ✅ Production-ready at every phase boundary

---

## Phase 1: Foundation & Core Discovery
**Duration:** 4-6 weeks  
**Goal:** Establish infrastructure and basic passive discovery

### 1.1 Infrastructure Setup (Week 1-2)

**Deliverables:**
- [ ] Docker Compose base configuration
- [ ] PostgreSQL database with initial schema
- [ ] Redis setup for caching and queues
- [ ] FastAPI backend scaffolding
- [ ] React frontend scaffolding
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Development environment documentation

**Technical Tasks:**
```bash
# Repository structure
├── backend/
│   ├── app/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```

**Acceptance Criteria:**
- ✓ `docker-compose up` starts all services
- ✓ Backend health endpoint returns 200
- ✓ Frontend serves React app
- ✓ Database migrations run successfully
- ✓ Tests run via `make test`

### 1.2 Authentication & User Management (Week 2-3)

**Deliverables:**
- [ ] User registration and login
- [ ] JWT authentication
- [ ] Role-based access control (Admin, Operator, Analyst, Viewer)
- [ ] Password hashing and security
- [ ] Session management
- [ ] Basic settings page

**API Endpoints:**
```python
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/password
GET    /api/users
POST   /api/users
PUT    /api/users/{id}
DELETE /api/users/{id}
```

**Acceptance Criteria:**
- ✓ Users can register and login
- ✓ JWT tokens expire and refresh correctly
- ✓ RBAC enforces permissions
- ✓ Passwords stored securely (bcrypt)

### 1.3 Passive Discovery Engine (Week 3-4)

**Deliverables:**
- [ ] ARP table monitoring
- [ ] DHCP lease parsing
- [ ] Asset database model
- [ ] MAC vendor lookup (OUI database)
- [ ] Background discovery worker
- [ ] Basic asset list API

**Discovery Sources:**
```python
class DiscoveryEngine:
    def scan_arp_table(self):
        """Parse /proc/net/arp"""
        
    def scan_dhcp_leases(self):
        """Parse /var/lib/dhcp/dhcpd.leases"""
        
    def enrich_asset(self, asset):
        """Add vendor, hostname, etc."""
```

**Acceptance Criteria:**
- ✓ Discovers devices on network within 5 minutes
- ✓ Stores assets in database
- ✓ MAC addresses resolved to vendors
- ✓ Discovery runs every 60 seconds

### 1.4 Basic UI - Asset List (Week 4-6)

**Deliverables:**
- [ ] Navigation layout
- [ ] Asset list table
- [ ] Asset detail view
- [ ] Real-time updates via WebSocket
- [ ] Search and filter
- [ ] Responsive design

**UI Components:**
```typescript
// Main components
<Dashboard />
  <AssetList />
    <AssetCard />
    <AssetDetail />
  <Sidebar />
  <Header />
```

**Acceptance Criteria:**
- ✓ Assets displayed in sortable table
- ✓ Click asset to view details
- ✓ New assets appear automatically
- ✓ Mobile-friendly layout

---

## Phase 2: Network Topology & Visualization
**Duration:** 3-4 weeks  
**Goal:** Visual network map with topology inference

### 2.1 Topology Inference Engine (Week 1-2)

**Deliverables:**
- [ ] Graph data model (nodes, edges)
- [ ] Confidence scoring algorithm
- [ ] ARP relationship detection
- [ ] Subnet clustering
- [ ] Topology API endpoints

**Algorithm:**
```python
def infer_topology() -> NetworkGraph:
    graph = NetworkGraph()
    
    # Add nodes
    for asset in get_all_assets():
        graph.add_node(asset)
    
    # Infer edges from ARP
    for entry in arp_table:
        edge = create_edge(entry)
        confidence = calculate_confidence(edge)
        graph.add_edge(edge, confidence)
    
    # Cluster by subnet
    graph.detect_clusters()
    
    return graph
```

**Acceptance Criteria:**
- ✓ Generates graph from assets
- ✓ Confidence scores calculated
- ✓ Updates on new discoveries

### 2.2 Interactive Topology Visualization (Week 2-4)

**Deliverables:**
- [ ] D3.js/Cytoscape integration
- [ ] Force-directed graph layout
- [ ] Node coloring by device type
- [ ] Edge thickness by confidence
- [ ] Click node → asset detail
- [ ] Zoom, pan, and drag interactions

**Visualization:**
```typescript
<TopologyGraph
  nodes={assets}
  edges={connections}
  onNodeClick={handleNodeClick}
  layout="force-directed"
/>
```

**Acceptance Criteria:**
- ✓ Renders network graph
- ✓ Smooth animations
- ✓ Interactive node selection
- ✓ Legend and controls

---

## Phase 3: Traffic Analysis & Monitoring
**Duration:** 3-4 weeks  
**Goal:** Deep traffic visibility and network health metrics

### 3.1 ntopng Integration (Week 1-2)

**Deliverables:**
- [ ] ntopng container configuration
- [ ] Data ingestion worker
- [ ] Flow data model in PostgreSQL
- [ ] ntopng API wrapper
- [ ] Basic traffic metrics

**Data Pipeline:**
```python
class NtopngIngestionWorker:
    async def run(self):
        while True:
            flows = await ntopng_api.get_flows()
            await self.transform_and_store(flows)
            await asyncio.sleep(5)
```

**Acceptance Criteria:**
- ✓ ntopng capturing traffic
- ✓ Flows stored in database
- ✓ API returns traffic data

### 3.2 Traffic Dashboards (Week 2-4)

**Deliverables:**
- [ ] Bandwidth over time graph
- [ ] Protocol distribution pie chart
- [ ] Top talkers table
- [ ] Flow matrix heatmap
- [ ] Per-asset traffic view

**Dashboard Components:**
```typescript
<TrafficDashboard>
  <BandwidthGraph timeRange="24h" />
  <ProtocolDistribution />
  <TopTalkers limit={10} />
  <FlowMatrix />
</TrafficDashboard>
```

**Acceptance Criteria:**
- ✓ Real-time traffic graphs
- ✓ Drill-down by asset
- ✓ Exportable data

---

## Phase 4: Remote Access Hub
**Duration:** 4-5 weeks  
**Goal:** Browser-based remote access to network devices

### 4.1 Credential Vault (Week 1-2)

**Deliverables:**
- [ ] Credential encryption (AES-256-GCM)
- [ ] Master key management
- [ ] Credential CRUD API
- [ ] Per-asset, per-protocol storage
- [ ] Credential validation worker

**Security:**
```python
class CredentialVault:
    def encrypt(self, plaintext, asset_id):
        key = derive_key(MASTER_KEY, asset_id)
        return aes_gcm_encrypt(plaintext, key)
```

**Acceptance Criteria:**
- ✓ Credentials encrypted at rest
- ✓ Decryption only on access
- ✓ Audit log of all access

### 4.2 SSH Access (Week 2-3)

**Deliverables:**
- [ ] SSH proxy container
- [ ] WebSocket bridge
- [ ] xterm.js integration
- [ ] Session logging
- [ ] Multi-tab support

**Architecture:**
```
Browser (xterm.js) ↔ WebSocket ↔ Backend ↔ SSH Proxy ↔ Target
```

**Acceptance Criteria:**
- ✓ Click "Connect SSH" opens terminal
- ✓ Full terminal functionality
- ✓ Session audit logged

### 4.3 RDP/VNC Access (Week 3-4)

**Deliverables:**
- [ ] Apache Guacamole integration
- [ ] RDP protocol support
- [ ] VNC protocol support
- [ ] Screen recording option
- [ ] Clipboard sync

**Acceptance Criteria:**
- ✓ Browser-based RDP/VNC
- ✓ Full mouse/keyboard support
- ✓ Good performance on SBC

### 4.4 FTP File Manager (Week 4-5)

**Deliverables:**
- [ ] FTP/SFTP client library
- [ ] File browser UI
- [ ] Upload/download
- [ ] File operations (rename, delete)
- [ ] Progress indicators

**Acceptance Criteria:**
- ✓ Browse FTP servers
- ✓ Transfer files
- ✓ Error handling

---

## Phase 5: Reporting & Intelligence
**Duration:** 3 weeks  
**Goal:** Automated reporting and threat intelligence

### 5.1 Report Generation (Week 1-2)

**Deliverables:**
- [ ] Report templates (Executive, Technical)
- [ ] PDF generation (WeasyPrint)
- [ ] HTML export
- [ ] Report scheduling
- [ ] Evidence packaging

**Templates:**
- Executive Summary
- Network Inventory
- Traffic Analysis Report
- Vulnerability Summary
- Access Log Report

**Acceptance Criteria:**
- ✓ Generate reports on demand
- ✓ Professional formatting
- ✓ Include graphs and data

### 5.2 Threat Intelligence (Week 2-3)

**Deliverables:**
- [ ] External IP reputation checks
- [ ] Threat feed integration (AbuseIPDB, OTX)
- [ ] Alert system for malicious IPs
- [ ] Indicators of Compromise (IoC) matching

**Integration:**
```python
async def check_ip_reputation(ip):
    results = await asyncio.gather(
        abuseipdb.check(ip),
        otx.check(ip)
    )
    return aggregate_results(results)
```

**Acceptance Criteria:**
- ✓ Automatic IP reputation checks
- ✓ Alerts for malicious traffic
- ✓ IoC database

---

## Phase 6: Operator Toolkit (Optional)
**Duration:** 4-6 weeks  
**Goal:** Advanced security testing capabilities

### 6.1 Active Scanning (Week 1-2)

**Deliverables:**
- [ ] Nmap integration
- [ ] Scan profiles (light, medium, deep)
- [ ] Scheduling and queuing
- [ ] Result parsing and storage
- [ ] Scan history

**Scan Types:**
- Port scan
- Service detection
- OS fingerprinting
- Script scanning (NSE)

**Acceptance Criteria:**
- ✓ Manual scan initiation
- ✓ Scheduled scans
- ✓ Results displayed in UI

### 6.2 Vulnerability Assessment (Week 2-3)

**Deliverables:**
- [ ] Nuclei integration
- [ ] CVE scanning
- [ ] Vulnerability database
- [ ] Risk scoring
- [ ] Remediation tracking

**Acceptance Criteria:**
- ✓ CVE scanning on demand
- ✓ Vulnerability reports
- ✓ Status tracking

### 6.3 Exploitation Framework (Week 3-4)

**Deliverables:**
- [ ] Metasploit container
- [ ] Web-based console
- [ ] Manual exploitation interface
- [ ] Payload generation
- [ ] Session management

**UI:**
```
Toolkit → Exploitation → Metasploit Console
  - Exploit selection
  - Option configuration
  - Launch button
  - Session viewer
```

**Acceptance Criteria:**
- ✓ Launch exploits manually
- ✓ Manage sessions
- ✓ Audit logging

### 6.4 C2 Integration (Week 4-6)

**Deliverables:**
- [ ] Mythic C2 integration
- [ ] Agent generation
- [ ] Listener configuration
- [ ] Task execution
- [ ] Agent management UI

**Acceptance Criteria:**
- ✓ Generate agents
- ✓ Receive callbacks
- ✓ Execute tasks
- ✓ Persistence options

---

## Testing Strategy

### Unit Tests
- Backend: pytest (target 80% coverage)
- Frontend: Jest + React Testing Library (target 70%)

### Integration Tests
- API endpoint tests
- Database integration tests
- Docker container tests

### E2E Tests
- Playwright for UI flows
- Critical user journeys
- Run in CI/CD

### Security Tests
- OWASP dependency check
- Container vulnerability scanning (Trivy)
- Penetration testing

---

## Release Strategy

### Version Numbering
- **Major.Minor.Patch** (Semantic Versioning)
- Phase 1-2: 0.1.x (Alpha)
- Phase 3-4: 0.2.x (Beta)
- Phase 5: 0.9.x (RC)
- Phase 6: 1.0.0 (Stable)

### Release Process
1. Feature freeze
2. Testing phase (1 week)
3. Bug fixes
4. Documentation update
5. Release notes
6. Docker image publish
7. GitHub release tag

---

## Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Phase 1 Complete | Week 6 | 🔵 Not Started |
| Phase 2 Complete | Week 10 | 🔵 Not Started |
| Phase 3 Complete | Week 14 | 🔵 Not Started |
| Phase 4 Complete | Week 19 | 🔵 Not Started |
| Phase 5 Complete | Week 22 | 🔵 Not Started |
| Phase 6 Complete | Week 28 | 🔵 Not Started |
| v1.0 Release | Week 30 | 🔵 Not Started |

---

## Resource Requirements

### Development Team
- 1x Backend Developer (Python/FastAPI)
- 1x Frontend Developer (React/TypeScript)
- 0.5x DevOps Engineer
- 0.5x Security Specialist

### Infrastructure
- Development environment (local Docker)
- CI/CD (GitHub Actions)
- Test network lab
- Documentation site (GitHub Pages)

---

## Risk Management

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| SBC performance insufficient | High | Early performance testing, optimization |
| ntopng integration complex | Medium | Prototype in Phase 3 week 1 |
| Docker networking issues | Medium | Test on target hardware early |
| Credential encryption compromise | Critical | Security audit, penetration testing |

### Schedule Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | High | Strict phase boundaries, defer features |
| Dependency delays | Medium | Identify alternatives early |
| Resource availability | Medium | Cross-training, documentation |

---

## Success Criteria

### Phase 1 Success
- ✓ 10+ devices discovered automatically
- ✓ Web UI accessible and responsive
- ✓ Basic user management working

### Phase 2 Success
- ✓ Topology graph renders 50+ nodes
- ✓ Confidence scores accurate
- ✓ User feedback positive

### Phase 3 Success
- ✓ Real-time traffic visualization
- ✓ 7-day traffic history retained
- ✓ Network health metrics useful

### Phase 4 Success
- ✓ SSH/RDP/VNC connections work
- ✓ Credentials stored securely
- ✓ Audit trail complete

### Phase 5 Success
- ✓ Reports generated in <30s
- ✓ Threat intel reduces false positives
- ✓ Professional report quality

### Phase 6 Success
- ✓ Operator toolkit fully functional
- ✓ All features toggleable
- ✓ Security audit passed

---

## Next Steps

1. ✅ Review and approve roadmap
2. ✅ Set up development environment
3. ✅ Create GitHub repository
4. ✅ Initialize project structure
5. ✅ Begin Phase 1 development

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-24  
**Status:** Ready for Execution