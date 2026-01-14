---
title: System Architecture
type: explanation
category: architecture
version: "1.0"
last_updated: 2026-01-14
---

# Network Observatory Platform - System Architecture

> Technical Architecture Document v1.0

---

## 1. Architecture Principles

### 1.1 Core Design Tenets

- **Separation of Concerns**: Each component has a single, well-defined responsibility
- **Defense in Depth**: Multiple layers of security controls
- **Fail-Safe Defaults**: Secure configuration out of the box
- **Least Privilege**: Minimal permissions for each component
- **Observability**: Comprehensive logging and monitoring
- **Composability**: Modular design allows feature toggles

### 1.2 Architectural Patterns

- **Microservices Architecture**: Containerized, independently deployable services
- **Event-Driven**: Asynchronous communication via Redis pub/sub
- **API Gateway**: Central FastAPI backend as single entry point
- **CQRS-lite**: Separate read and write paths for performance
- **Repository Pattern**: Data access abstraction layer

---

## 2. Component Architecture

### 2.1 Frontend Architecture

```
┌───────────────────────────────────────────┐
│           React Application               │
├───────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  │
│  │  Pages  │  │Components│  │  Hooks   │  │
│  └────┬────┘  └────┬────┘  └────┬─────┘  │
│       │            │             │        │
│  ┌────▼────────────▼─────────────▼─────┐  │
│  │        State Management              │  │
│  │   (TanStack Query + Zustand)         │  │
│  └────┬─────────────────────────────────┘  │
│       │                                    │
│  ┌────▼─────────────────────────────────┐  │
│  │      API Client + WebSocket          │  │
│  └──────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

**Key Libraries:**

```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.4.0",
  "d3": "^7.8.0",
  "cytoscape": "^3.26.0",
  "xterm": "^5.3.0",
  "@novnc/novnc": "^1.4.0",
  "recharts": "^2.10.0",
  "tailwindcss": "^3.4.0"
}
```

**State Architecture:**

- **Server State**: TanStack Query (cached API data)
- **UI State**: Zustand (ephemeral UI state)
- **WebSocket State**: Custom hook with reconnection logic
- **Form State**: React Hook Form

### 2.2 Backend Architecture

```
┌──────────────────────────────────────────────┐
│            FastAPI Application               │
├──────────────────────────────────────────────┤
│  ┌────────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Routers  │  │  Deps    │  │  Middleware│
│  └──────┬─────┘  └────┬─────┘  └─────┬────┘ │
│         │             │              │      │
│  ┌──────▼─────────────▼──────────────▼────┐ │
│  │         Service Layer                  │ │
│  │  ┌──────┐ ┌───────┐ ┌───────────────┐ │ │
│  │  │Asset │ │Network│ │  Credentials  │ │ │
│  │  │Svc   │ │Svc    │ │  Svc          │ │ │
│  │  └──┬───┘ └───┬───┘ └──────┬────────┘ │ │
│  └─────┼─────────┼────────────┼──────────┘ │
│        │         │            │            │
│  ┌─────▼─────────▼────────────▼──────────┐ │
│  │      Repository Layer                 │ │
│  │  ┌────────┐  ┌────────┐  ┌─────────┐ │ │
│  │  │ Asset  │  │ Flow   │  │ Cred    │ │ │
│  │  │ Repo   │  │ Repo   │  │ Repo    │ │ │
│  │  └───┬────┘  └───┬────┘  └────┬────┘ │ │
│  └──────┼───────────┼─────────────┼──────┘ │
│         │           │             │        │
│  ┌──────▼───────────▼─────────────▼──────┐ │
│  │         SQLAlchemy ORM                 │ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Project Structure:**

```
backend/
├── app/
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings management
│   ├── dependencies.py         # Dependency injection
│   │
│   ├── api/                    # API layer
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── assets.py
│   │   │   │   ├── discovery.py
│   │   │   │   ├── traffic.py
│   │   │   │   ├── access.py
│   │   │   │   ├── scans.py
│   │   │   │   └── settings.py
│   │   │   └── router.py
│   │   └── websockets/
│   │       ├── topology.py
│   │       └── terminal.py
│   │
│   ├── core/                   # Core utilities
│   │   ├── security.py         # Auth & crypto
│   │   ├── docker.py           # Docker SDK wrapper
│   │   └── events.py           # Event bus
│   │
│   ├── services/               # Business logic
│   │   ├── asset_service.py
│   │   ├── network_service.py
│   │   ├── credential_service.py
│   │   ├── scan_service.py
│   │   └── topology_service.py
│   │
│   ├── repositories/           # Data access
│   │   ├── asset_repository.py
│   │   ├── flow_repository.py
│   │   └── credential_repository.py
│   │
│   ├── models/                 # SQLAlchemy models
│   │   ├── asset.py
│   │   ├── credential.py
│   │   ├── flow.py
│   │   └── user.py
│   │
│   ├── schemas/                # Pydantic schemas
│   │   ├── asset.py
│   │   ├── scan.py
│   │   └── traffic.py
│   │
│   └── workers/                # Background jobs
│       ├── discovery.py
│       ├── topology.py
│       └── scan.py
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Key Dependencies:**

```python
fastapi[all]==0.104.0
sqlalchemy==2.0.23
asyncpg==0.29.0
redis==5.0.1
celery==5.3.4
docker==7.0.0
cryptography==41.0.7
scapy==2.5.0
nmap==0.0.1
pydantic==2.5.0
python-jose[cryptography]==3.3.0
```

### 2.3 Discovery Architecture

```
┌────────────────────────────────────────┐
│      Discovery Orchestrator            │
├────────────────────────────────────────┤
│  ┌──────────────┐  ┌───────────────┐  │
│  │   Passive    │  │    Active     │  │
│  │   Discovery  │  │   Discovery   │  │
│  └──────┬───────┘  └───────┬───────┘  │
│         │                  │          │
│  ┌──────▼──────────────────▼───────┐  │
│  │      Discovery Queue            │  │
│  │         (Redis)                 │  │
│  └──────┬──────────────────────────┘  │
│         │                             │
│  ┌──────▼──────────────────────────┐  │
│  │    Discovery Workers            │  │
│  │  ┌────────┐  ┌────────────────┐ │  │
│  │  │  ARP   │  │  Nmap Runner   │ │  │
│  │  │Scanner │  │                │ │  │
│  │  └───┬────┘  └────┬───────────┘ │  │
│  └──────┼────────────┼─────────────┘  │
│         │            │                │
│  ┌──────▼────────────▼─────────────┐  │
│  │   Asset Reconciliation          │  │
│  │   - Merge duplicates            │  │
│  │   - Update confidence           │  │
│  │   - Trigger topology update     │  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Discovery Pipeline:**

1. **Passive Phase** (Continuous)
   - Monitor ARP table: `/proc/net/arp`
   - Watch DHCP leases: `/var/lib/dhcp/dhcpd.leases`
   - Parse ntopng host list: REST API query
   - Extract from flows: PostgreSQL query

2. **Active Phase** (Scheduled/Manual)
   - Nmap host discovery: `-sn`
   - Port scanning: Profile-based
   - Service detection: `-sV`
   - OS fingerprinting: `-O`

3. **Enrichment Phase**
   - OUI vendor lookup
   - PTR record resolution
   - NetBIOS name query
   - SNMP enumeration (if credentials available)

### 2.4 Traffic Analysis Architecture

```
┌────────────────────────────────────────┐
│            ntopng                      │
│   ┌────────────────────────────────┐   │
│   │  Packet Capture (libpcap)     │   │
│   └──────────┬─────────────────────┘   │
│              │                         │
│   ┌──────────▼─────────────────────┐   │
│   │  nDPI Protocol Detection       │   │
│   └──────────┬─────────────────────┘   │
│              │                         │
│   ┌──────────▼─────────────────────┐   │
│   │  Flow Aggregation              │   │
│   └──────────┬─────────────────────┘   │
│              │                         │
│   ┌──────────▼─────────────────────┐   │
│   │  Internal Database (RRD)       │   │
│   └──────────┬─────────────────────┘   │
│              │                         │
│   ┌──────────▼─────────────────────┐   │
│   │  REST API Server               │   │
│   └──────────┬─────────────────────┘   │
└──────────────┼─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│      NOP Traffic Ingestion Worker      │
│   ┌────────────────────────────────┐   │
│   │  Poll ntopng API (5s interval) │   │
│   └──────────┬─────────────────────┘   │
│              │                         │
│   ┌──────────▼─────────────────────┐   │
│   │  Transform to NOP Schema       │   │
│   └──────────┬─────────────────────┘   │
│              │                         │
│   ┌──────────▼─────────────────────┐   │
│   │  Insert into PostgreSQL        │   │
│   └──────────┬─────────────────────┘   │
│              │                         │
│   ┌──────────▼─────────────────────┐   │
│   │  Publish Events (Redis)        │   │
│   └────────────────────────────────┘   │
└────────────────────────────────────────┘
```

**Data Flow:**

```
Raw Packet → ntopng → Flow Metadata → PostgreSQL
                 ↓
           Alerts/Anomalies → Redis → Backend → WebSocket → Frontend
```

### 2.5 Topology Inference Engine

```python
class TopologyEngine:
    """
    Infers network topology from observed data
    """
    
    def infer_topology(self) -> NetworkGraph:
        """
        Main inference algorithm
        """
        graph = NetworkGraph()
        
        # Step 1: Add all known hosts as nodes
        for asset in self.get_all_assets():
            graph.add_node(asset)
        
        # Step 2: Infer edges from multiple sources
        edges = []
        edges.extend(self._infer_from_arp())
        edges.extend(self._infer_from_flows())
        edges.extend(self._infer_from_traceroute())
        edges.extend(self._infer_from_gateway())
        
        # Step 3: Calculate confidence scores
        for edge in edges:
            confidence = self._calculate_confidence(edge)
            if confidence > CONFIDENCE_THRESHOLD:
                graph.add_edge(edge, confidence)
        
        # Step 4: Detect subnets and clusters
        graph.detect_clusters()
        
        return graph
    
    def _calculate_confidence(self, edge: Edge) -> float:
        """
        Confidence = weighted sum of evidence sources
        """
        score = 0.0
        
        # ARP table evidence (high confidence)
        if edge.has_arp_evidence():
            score += 0.4
        
        # Bidirectional flows (medium confidence)
        if edge.has_bidirectional_flows():
            score += 0.3
        
        # Unidirectional flows (low confidence)
        elif edge.has_unidirectional_flows():
            score += 0.15
        
        # Traceroute evidence (medium confidence)
        if edge.has_traceroute_evidence():
            score += 0.25
        
        # Same subnet (low confidence)
        if edge.same_subnet():
            score += 0.1
        
        return min(score, 1.0)
```

**Confidence Levels:**

- `0.9-1.0`: Very High (direct ARP + bidirectional flows)
- `0.7-0.9`: High (ARP or multiple flow evidence)
- `0.5-0.7`: Medium (single flow source)
- `0.3-0.5`: Low (subnet inference only)
- `0.0-0.3`: Very Low (speculative)

### 2.6 Access Hub Architecture

```
┌────────────────────────────────────────┐
│         Browser (Frontend)             │
│  ┌────────────────────────────────┐    │
│  │  xterm.js / noVNC Component    │    │
│  └──────────────┬─────────────────┘    │
└─────────────────┼─────────────────────┘
                  │ WebSocket
┌─────────────────▼─────────────────────┐
│      Backend WebSocket Handler        │
│  ┌────────────────────────────────┐   │
│  │  Auth + Credential Retrieval   │   │
│  └──────────────┬─────────────────┘   │
│                 │                     │
│  ┌──────────────▼─────────────────┐   │
│  │  Docker Container Lifecycle    │   │
│  │  - Start proxy container       │   │
│  │  - Inject credentials          │   │
│  │  - Establish connection        │   │
│  └──────────────┬─────────────────┘   │
└─────────────────┼─────────────────────┘
                  │
┌─────────────────▼─────────────────────┐
│    Protocol-Specific Proxy Container  │
│                                       │
│  SSH:  WebSocket ↔ SSH Client        │
│  RDP:  WebSocket ↔ Guacamole ↔ RDP   │
│  VNC:  WebSocket ↔ Guacamole ↔ VNC   │
│  FTP:  REST API ↔ FTP Client          │
└───────────────────────────────────────┘
```

**Connection Flow:**

```
1. User clicks "Connect SSH" on asset
   ↓
2. Frontend sends WS connection request
   ↓
3. Backend validates permissions
   ↓
4. Backend decrypts stored credential
   ↓
5. Backend starts ssh-proxy container:
   docker run -d \
     --network host \
     -e TARGET_HOST=192.168.1.10 \
     -e TARGET_USER=admin \
     -e TARGET_PASS=encrypted_pass \
     nop-ssh-proxy
   ↓
6. Proxy establishes SSH connection
   ↓
7. WebSocket bridge: Browser ↔ Backend ↔ Container
   ↓
8. All I/O logged to audit trail
   ↓
9. On disconnect: Container stopped and removed
```

---

## 3. Data Architecture

### 3.1 Database Schema

**Core Tables:**

```sql
-- Assets (discovered devices)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip INET NOT NULL,
    mac MACADDR,
    hostname VARCHAR(255),
    vendor VARCHAR(255),
    os_family VARCHAR(100),
    os_version VARCHAR(255),
    device_type VARCHAR(50), -- workstation, server, network, iot
    confidence NUMERIC(3,2), -- 0.00 to 1.00
    first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(ip)
);

CREATE INDEX idx_assets_ip ON assets(ip);
CREATE INDEX idx_assets_mac ON assets(mac);
CREATE INDEX idx_assets_active ON assets(is_active);

-- Credentials (encrypted storage)
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    protocol VARCHAR(20) NOT NULL, -- ssh, rdp, vnc, ftp
    username VARCHAR(255) NOT NULL,
    password_encrypted BYTEA NOT NULL,
    key_data_encrypted BYTEA, -- For SSH keys
    port INTEGER,
    is_valid BOOLEAN DEFAULT NULL,
    last_validated TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset_id, protocol, username)
);

-- Network flows
CREATE TABLE flows (
    id BIGSERIAL PRIMARY KEY,
    src_ip INET NOT NULL,
    dst_ip INET NOT NULL,
    src_port INTEGER,
    dst_port INTEGER,
    protocol VARCHAR(20) NOT NULL,
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    packets_sent INTEGER DEFAULT 0,
    packets_received INTEGER DEFAULT 0,
    application VARCHAR(100), -- nDPI detection
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_flows_src ON flows(src_ip, first_seen);
CREATE INDEX idx_flows_dst ON flows(dst_ip, first_seen);
CREATE INDEX idx_flows_time ON flows(first_seen);

-- Topology edges (connection graph)
CREATE TABLE topology_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    target_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    confidence NUMERIC(3,2) NOT NULL,
    evidence_sources TEXT[], -- ['arp', 'flow', 'traceroute']
    last_validated TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_asset_id, target_asset_id)
);

-- Scan results
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    scan_type VARCHAR(50) NOT NULL, -- discovery, service, vuln, deep
    status VARCHAR(20) NOT NULL, -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    results JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vulnerabilities
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    cve_id VARCHAR(20),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL, -- critical, high, medium, low, info
    cvss_score NUMERIC(3,1),
    affected_service VARCHAR(255),
    discovered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, false_positive
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- discovery, scan, access, exploit
    severity VARCHAR(20) NOT NULL, -- info, warning, error, critical
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_type ON events(event_type, created_at);
CREATE INDEX idx_events_asset ON events(asset_id, created_at);
```

### 3.2 Redis Data Structures

**Job Queues:**
```
nop:jobs:discovery:pending    → List
nop:jobs:scans:pending        → List
nop:jobs:reports:pending      → List
```

**Caching:**
```
nop:cache:assets:{id}         → Hash (TTL: 60s)
nop:cache:topology            → String (TTL: 30s)
nop:cache:traffic:summary     → Hash (TTL: 10s)
```

**Real-time State:**
```
nop:realtime:connections      → Set (active SSH/RDP sessions)
nop:realtime:scans            → Hash (scan status)
```

**PubSub Channels:**
```
nop:events:discovery          → New asset discovered
nop:events:scan:complete      → Scan finished
nop:events:alert              → Security alert
nop:events:topology:update    → Topology changed
```

---

## 4. Security Architecture

### 4.1 Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Backend   │────▶│  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │ POST /auth/login  │                   │
       │──────────────────▶│                   │
       │                   │ Verify password   │
       │                   │──────────────────▶│
       │                   │◀──────────────────│
       │                   │ Generate JWT      │
       │◀──────────────────│                   │
       │ {access, refresh} │                   │
       │                   │                   │
       │ GET /api/assets   │                   │
       │ (Bearer token)    │                   │
       │──────────────────▶│                   │
       │                   │ Validate JWT      │
       │                   │ Check permissions │
       │◀──────────────────│                   │
       │ {assets}          │                   │
```

**JWT Payload:**
```json
{
  "sub": "user_uuid",
  "role": "operator",
  "exp": 1735084800,
  "iat": 1735081200,
  "jti": "unique_token_id"
}
```

### 4.2 Credential Encryption

```python
class CredentialVault:
    def __init__(self, master_key: bytes):
        self.key = master_key  # Derived from admin password
    
    def encrypt_credential(self, plaintext: str, asset_id: str) -> bytes:
        """
        Encrypt credential with AES-256-GCM
        """
        # Generate unique nonce
        nonce = os.urandom(12)
        
        # Additional authenticated data (asset binding)
        aad = asset_id.encode()
        
        # Encrypt
        cipher = AESGCM(self.key)
        ciphertext = cipher.encrypt(nonce, plaintext.encode(), aad)
        
        # Return nonce + ciphertext
        return nonce + ciphertext
    
    def decrypt_credential(self, encrypted: bytes, asset_id: str) -> str:
        """
        Decrypt credential
        """
        nonce = encrypted[:12]
        ciphertext = encrypted[12:]
        aad = asset_id.encode()
        
        cipher = AESGCM(self.key)
        plaintext = cipher.decrypt(nonce, ciphertext, aad)
        
        return plaintext.decode()
```

### 4.3 Container Security

**Security Hardening:**

```yaml
# scanner container example
scanner:
  image: nop-scanner:latest
  security_opt:
    - no-new-privileges:true
    - seccomp:unconfined  # Required for raw sockets
  cap_drop:
    - ALL
  cap_add:
    - NET_RAW
    - NET_ADMIN
  read_only: true
  tmpfs:
    - /tmp
    - /var/tmp
  user: "scanner:scanner"  # Non-root
  networks:
    - scanning_network  # Isolated
```

---

## 5. Performance Architecture

### 5.1 Caching Strategy

**Multi-Layer Caching:**

```
Request → Application Cache (Redis) → Database Query
   ↓           ↓ miss                    ↓
 Cache Hit  Database Result          PostgreSQL
   ↓           ↓                         ↓
Response ← Update Cache ←───────────────┘
```

**Cache Invalidation:**
- **Time-based**: TTL on all cache entries
- **Event-based**: Invalidate on data changes
- **Manual**: API endpoint for force refresh

### 5.2 Database Optimization

**Query Optimization:**
- Covering indexes for common queries
- Materialized views for complex aggregations
- Partitioning for flow table (by date)
- Connection pooling (asyncpg)

**Example:**
```sql
-- Materialized view for traffic summary
CREATE MATERIALIZED VIEW traffic_summary AS
SELECT 
    src_ip,
    dst_ip,
    application,
    SUM(bytes_sent + bytes_received) as total_bytes,
    COUNT(*) as flow_count,
    DATE(first_seen) as day
FROM flows
WHERE first_seen > NOW() - INTERVAL '30 days'
GROUP BY src_ip, dst_ip, application, DATE(first_seen);

-- Refresh every 5 minutes via cron job
```

### 5.3 Scalability Considerations

**Horizontal Scaling:**
- Multiple backend workers (Celery)
- Read replicas for PostgreSQL
- Redis Cluster for high availability

**Vertical Scaling:**
- Resource limits per container
- CPU pinning for critical services
- Memory limits with OOM handling

---

## 6. Monitoring & Observability

### 6.1 Logging Architecture

```
Application → Structured Logs → stdout/stderr
                ↓
         Docker Log Driver
                ↓
         /var/log/nop/
                ↓
         Log Aggregation (optional)
```

**Log Format (JSON):**
```json
{
  "timestamp": "2025-12-24T12:00:00Z",
  "level": "INFO",
  "service": "backend",
  "component": "asset_service",
  "message": "Asset discovered",
  "asset_id": "uuid",
  "ip": "192.168.1.10",
  "trace_id": "request_uuid"
}
```

### 6.2 Metrics

**Application Metrics:**
- Request rate & latency (FastAPI middleware)
- Active WebSocket connections
- Job queue depth
- Cache hit rate

**System Metrics:**
- Container CPU/memory usage
- Database connection pool stats
- Redis memory usage
- Network interface stats

### 6.3 Health Checks

```python
@app.get("/health")
async def health_check():
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
        "ntopng": await check_ntopng(),
        "docker": await check_docker()
    }
    
    status = "healthy" if all(checks.values()) else "unhealthy"
    
    return {
        "status": status,
        "checks": checks,
        "version": VERSION,
        "uptime": get_uptime()
    }
```

---

## 7. Deployment Architecture

### 7.1 Container Orchestration

```yaml
services:
  # Tier 1: Always-On
  frontend:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
  
  backend:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
  
  # Tier 2: On-Demand
  scanner:
    profiles: [scanning]
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
  
  # Tier 3: Advanced
  mythic:
    profiles: [offensive]
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

### 7.2 Network Topology

```
┌─────────────────────────────────────┐
│         Physical Network            │
│  (Target network being monitored)   │
└─────────────┬───────────────────────┘
              │ eth0 (promiscuous)
┌─────────────▼───────────────────────┐
│      Host (Radxa-E54C)              │
│  ┌───────────────────────────────┐  │
│  │   Docker Host Network         │  │
│  │  (scanner, ntopng containers) │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │   Docker Bridge Network       │  │
│  │  (internal services)          │  │
│  │   - frontend                  │  │
│  │   - backend                   │  │
│  │   - postgres                  │  │
│  │   - redis                     │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │   Docker Isolated Network     │  │
│  │  (offensive tools)            │  │
│  │   - metasploit                │  │
│  │   - mythic                    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-24  
**Status:** Ready for Implementation