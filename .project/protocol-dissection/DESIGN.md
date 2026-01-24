# Protocol Dissection and Analysis System Design

**Version:** 1.0  
**Date:** 2026-01-24  
**Status:** Proposed

---

## Executive Summary

This design extends NOP's existing SnifferService with enhanced protocol dissection, topology inference, and deep packet inspection capabilities. The architecture follows a **layered hybrid approach** combining Scapy extensions (Phase 1) with future nDPI integration (Phase 2), maintaining backwards compatibility while adding powerful new capabilities.

### Core Problem Statement

NOP needs enhanced protocol dissection and analysis for:
1. **Traffic capture**: Deep packet inspection to understand packet fields and protocols
2. **Topology visualization**: Infer network structure from traffic patterns (multicast as bus, LLDP for switches)
3. **Proprietary protocol detection**: Fingerprint unknown protocols for network understanding
4. **Layer 2 analysis**: VLAN, LLDP/CDP, STP for topology discovery

### Core Components (6)

1. **DPI Service** - Deep Packet Inspection engine
2. **Protocol Registry** - Protocol database and IANA port mapping  
3. **Topology Inference Engine** - LLDP/STP/multicast analysis
4. **Enhanced Database Schema** - Protocol/device/fingerprint storage
5. **Extended APIs** - New endpoints for protocol analysis
6. **Enhanced Frontend** - Protocol inspector and topology views

---

## 1. Architecture Overview

### 1.1 System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         NOP Platform                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌─────────────────────────────┐      │
│  │   Frontend   │◄────────┤     WebSocket Events         │      │
│  │  (React)     │         └─────────────────────────────┘      │
│  │              │                      ▲                         │
│  │ - Traffic.tsx│                      │                         │
│  │ - Topology   │         ┌────────────┴──────────────┐         │
│  │ - Inspector  │◄────────┤   FastAPI REST APIs       │         │
│  └──────────────┘         └───────────────────────────┘         │
│         ▲                              ▲                         │
│         │                              │                         │
│         └──────────────┬───────────────┘                         │
│                        │                                         │
│              ┌─────────▼──────────┐                              │
│              │   Backend Core     │                              │
│              ├────────────────────┤                              │
│              │                    │                              │
│    ┌─────────┼────────────────────┼──────────┐                  │
│    │         │  Service Layer     │          │                  │
│    │  ┌──────▼─────┐  ┌──────────▼──────┐   │                  │
│    │  │ DPIService │  │SnifferService   │   │                  │
│    │  │(NEW)       │◄─┤(ENHANCED)       │   │                  │
│    │  │            │  │                 │   │                  │
│    │  │- Dissect   │  │- Capture       │   │                  │
│    │  │- Classify  │  │- Filter        │   │                  │
│    │  │- Fingerpr. │  │- Stats         │   │                  │
│    │  └─────┬──────┘  └────────┬────────┘   │                  │
│    │        │                  │            │                  │
│    │  ┌─────▼──────────────────▼──────┐     │                  │
│    │  │  TopologyInferenceEngine      │     │                  │
│    │  │         (NEW)                 │     │                  │
│    │  │                               │     │                  │
│    │  │ - LLDP/CDP Parser            │     │                  │
│    │  │ - Multicast Tracker          │     │                  │
│    │  │ - VLAN Analyzer              │     │                  │
│    │  │ - Device Classifier          │     │                  │
│    │  └───────────┬───────────────────┘     │                  │
│    │              │                         │                  │
│    │  ┌───────────▼───────────────────┐     │                  │
│    │  │  Protocol Registry Service    │     │                  │
│    │  │         (NEW)                 │     │                  │
│    │  │                               │     │                  │
│    │  │ - IANA Port DB               │     │                  │
│    │  │ - Protocol Signatures        │     │                  │
│    │  │ - Fingerprint DB             │     │                  │
│    │  └───────────┬───────────────────┘     │                  │
│    └──────────────┼─────────────────────────┘                  │
│                   │                                             │
│         ┌─────────▼──────────┐                                  │
│         │  PostgreSQL DB     │                                  │
│         │                    │                                  │
│         │ - flows (extended) │                                  │
│         │ - protocols (new)  │                                  │
│         │ - device_fingerpr. │                                  │
│         │ - lldp_neighbors   │                                  │
│         │ - multicast_groups │                                  │
│         └────────────────────┘                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

              Network Traffic (eth0, agents)
                         ▲
                         │
                    ┌────┴─────┐
                    │  Scapy   │
                    │  BPF     │
                    └──────────┘
```

### 1.2 Data Flow

```
Network Packet Flow:
═══════════════════

1. CAPTURE (SnifferService)
   └─> BPF Filter → Scapy sniff()
   
2. FAST PATH (SnifferService._process_packet)
   └─> Basic protocol detection (TCP/UDP/ICMP/ARP)
   └─> Flow aggregation
   └─> Stats update
   
3. DEEP INSPECTION PATH (DPIService.dissect) [NEW]
   └─> Triggered by: WebSocket request, API call, or threshold
   └─> Layer-by-layer dissection:
       - L2: VLAN (802.1Q), LLDP, CDP, STP
       - L3: IP options, fragmentation, ICMP types
       - L4: TCP options, UDP
       - L7: HTTP, DNS, TLS (JA3), custom protocols
   
4. TOPOLOGY INFERENCE (TopologyInferenceEngine) [NEW]
   └─> LLDP frames → Device discovery
   └─> STP BPDUs → Root bridge detection
   └─> IGMP/PIM → Multicast topology
   └─> VLAN tags → Network segmentation
   
5. STORAGE
   └─> flows table (enhanced)
   └─> protocol_statistics table (new)
   └─> device_fingerprints table (new)
   └─> lldp_neighbors table (new)
   └─> multicast_groups table (new)
   
6. REAL-TIME UPDATE
   └─> WebSocket → Frontend
   └─> Event types: packet, flow, topology_update, device_discovered
```

---

## 2. Component Design

### 2.1 DPI Service (Deep Packet Inspection)

**Purpose:** Protocol dissection engine for detailed packet analysis

**Location:** `backend/app/services/DPIService.py`

**Interface:**
```python
class DPIService:
    """Deep Packet Inspection Service for protocol analysis"""
    
    def __init__(self, protocol_registry: ProtocolRegistry):
        self.registry = protocol_registry
        self.dissectors = self._initialize_dissectors()
        
    # Core dissection
    def dissect_packet(self, packet: Packet) -> DissectedPacket:
        """Full layer-by-layer dissection"""
        
    def dissect_l2(self, packet: Packet) -> L2Info:
        """Layer 2 dissection: Ethernet, VLAN, LLDP, CDP, STP"""
        
    def dissect_l3(self, packet: Packet) -> L3Info:
        """Layer 3 dissection: IP, ICMP, ARP"""
        
    def dissect_l4(self, packet: Packet) -> L4Info:
        """Layer 4 dissection: TCP, UDP"""
        
    def dissect_l7(self, packet: Packet, l4_info: L4Info) -> L7Info:
        """Layer 7 dissection: HTTP, DNS, TLS, custom"""
        
    # Protocol classification
    def classify_protocol(self, packet: Packet) -> ProtocolClassification:
        """Classify protocol using ports, signatures, heuristics"""
        
    # Fingerprinting
    def extract_fingerprint(self, packet: Packet, proto: str) -> Fingerprint:
        """Extract fingerprints (TLS JA3, HTTP UA, DHCP, p0f)"""
```

**Data Models:**
```python
@dataclass
class DissectedPacket:
    """Complete packet dissection"""
    timestamp: datetime
    packet_id: str
    raw_bytes: bytes
    
    # Layers
    ethernet: Optional[EthernetLayer]
    vlan: Optional[VLANLayer]
    arp: Optional[ARPLayer]
    ip: Optional[IPLayer]
    tcp: Optional[TCPLayer]
    udp: Optional[UDPLayer]
    icmp: Optional[ICMPLayer]
    
    # L7 protocols
    http: Optional[HTTPLayer]
    dns: Optional[DNSLayer]
    tls: Optional[TLSLayer]
    lldp: Optional[LLDPLayer]
    cdp: Optional[CDPLayer]
    stp: Optional[STPLayer]
    
    # Classification
    protocol_stack: List[str]  # ["Ethernet", "IP", "TCP", "HTTP"]
    application: Optional[str]  # "Web", "SSH", "Custom-Port-8080"
    
    # Fingerprints
    fingerprints: Dict[str, str]  # {"ja3": "...", "user_agent": "..."}

@dataclass  
class VLANLayer:
    """802.1Q VLAN tag"""
    vlan_id: int
    priority: int
    dei: bool  # Drop Eligible Indicator
    
@dataclass
class LLDPLayer:
    """LLDP (Link Layer Discovery Protocol)"""
    chassis_id: str
    port_id: str
    ttl: int
    system_name: Optional[str]
    system_description: Optional[str]
    capabilities: List[str]  # ["Bridge", "Router"]
    management_addresses: List[str]
    
@dataclass
class ProtocolClassification:
    """Protocol classification result"""
    l7_protocol: str  # "HTTP", "SSH", "Unknown"
    confidence: float  # 0.0 - 1.0
    method: str  # "port", "signature", "heuristic", "ndpi"
    category: str  # "Web", "FileTransfer", "VoIP", "Industrial"
```

---

### 2.2 Protocol Registry Service

**Purpose:** Central protocol knowledge base and IANA port database

**Location:** `backend/app/services/ProtocolRegistry.py`

**Interface:**
```python
class ProtocolRegistry:
    """Protocol knowledge base and port database"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.port_db = self._load_iana_ports()
        self.signatures = self._load_signatures()
        
    # IANA Port Database
    async def get_service_by_port(self, port: int, proto: str = "tcp") -> Service:
        """Get service name from IANA port database"""
        
    async def update_iana_database(self) -> bool:
        """Update IANA port assignments from official source"""
        
    # Protocol Signatures
    def get_signature(self, protocol: str) -> ProtocolSignature:
        """Get protocol signature pattern"""
        
    async def register_custom_protocol(self, sig: ProtocolSignature) -> bool:
        """Register custom/proprietary protocol signature"""
```

**Data Models:**
```python
@dataclass
class Service:
    """IANA Service definition"""
    port: int
    protocol: str  # "tcp", "udp", "sctp"
    service_name: str
    description: str
    
@dataclass
class ProtocolSignature:
    """Protocol detection signature"""
    protocol_name: str
    category: str
    patterns: List[bytes]  # Byte patterns for matching
    ports: List[int]  # Associated ports
    offset: Optional[int]  # Byte offset for pattern
```

---

### 2.3 Topology Inference Engine

**Purpose:** Infer network topology from L2/L3 protocols and traffic patterns

**Location:** `backend/app/services/TopologyInferenceEngine.py`

**Interface:**
```python
class TopologyInferenceEngine:
    """Network topology inference from protocol analysis"""
    
    def __init__(self, db: AsyncSession, dpi_service: DPIService):
        self.db = db
        self.dpi = dpi_service
        self.lldp_neighbors = {}
        self.multicast_groups = {}
        self.vlan_topology = {}
        
    # LLDP/CDP Discovery
    async def process_lldp_frame(self, lldp: LLDPLayer, src_ip: str) -> Device:
        """Process LLDP frame and update topology"""
        
    async def get_lldp_neighbors(self, device_id: str) -> List[LLDPNeighbor]:
        """Get LLDP neighbors for a device"""
        
    # Multicast Topology
    async def process_igmp_packet(self, packet: Packet) -> None:
        """Process IGMP join/leave for multicast groups"""
        
    async def infer_multicast_topology(self) -> MulticastTopology:
        """Infer bus vs. star topology from multicast traffic"""
        
    # VLAN Analysis
    async def process_vlan_tag(self, vlan: VLANLayer, packet: Packet) -> None:
        """Track VLAN membership and segmentation"""
        
    # Device Classification
    async def classify_device_type(self, device_id: str) -> DeviceType:
        """Classify device as switch/router/host based on behavior"""
```

**Data Models:**
```python
@dataclass
class LLDPNeighbor:
    """LLDP neighbor relationship"""
    local_device_id: str
    local_port: str
    remote_chassis_id: str
    remote_port: str
    remote_system_name: str
    remote_capabilities: List[str]
    first_seen: datetime
    last_seen: datetime

@dataclass
class MulticastGroup:
    """Multicast group membership"""
    group_address: str
    members: List[str]  # IP addresses
    protocol: str  # "IGMP", "PIM", "mDNS"
    first_seen: datetime
    last_seen: datetime

@dataclass
class TopologyNode:
    """Enhanced topology node"""
    id: str
    ip: str
    mac: str
    hostname: Optional[str]
    device_type: str  # "switch", "router", "host", "server"
    vendor: Optional[str]
    model: Optional[str]
    capabilities: List[str]
    vlans: List[int]
    lldp_info: Optional[LLDPLayer]
```

---

## 3. Database Schema Extensions

### 3.1 New Tables

```sql
-- IANA Port Database (auto-updated)
CREATE TABLE protocol_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    port INTEGER NOT NULL,
    protocol VARCHAR(10) NOT NULL,  -- tcp, udp, sctp
    service_name VARCHAR(100) NOT NULL,
    description TEXT,
    last_updated TIMESTAMP WITH TIME ZONE,
    UNIQUE(port, protocol)
);
CREATE INDEX idx_port_protocol ON protocol_ports(port, protocol);

-- Custom Protocol Signatures
CREATE TABLE protocol_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    pattern BYTEA,
    ports INTEGER[],
    offset INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device Fingerprints
CREATE TABLE device_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint_type VARCHAR(50) NOT NULL,  -- ja3, http_ua, dhcp, p0f
    hash VARCHAR(255) NOT NULL,
    raw_data JSONB,
    metadata JSONB,  -- OS, browser, app info
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    occurrence_count INTEGER DEFAULT 1,
    UNIQUE(fingerprint_type, hash)
);

-- LLDP Neighbor Relationships
CREATE TABLE lldp_neighbors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    local_port VARCHAR(50),
    remote_chassis_id VARCHAR(255) NOT NULL,
    remote_port VARCHAR(50),
    remote_system_name VARCHAR(255),
    remote_system_description TEXT,
    remote_capabilities VARCHAR(50)[],
    remote_management_address VARCHAR(45),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(local_asset_id, remote_chassis_id, remote_port)
);

-- Multicast Group Membership
CREATE TABLE multicast_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_address INET NOT NULL,
    protocol VARCHAR(20) NOT NULL,  -- IGMP, PIM, mDNS, SSDP
    member_ips INET[],
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    packet_count BIGINT DEFAULT 0,
    UNIQUE(group_address, protocol)
);

-- VLAN Topology
CREATE TABLE vlan_topology (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vlan_id INTEGER NOT NULL,
    vlan_name VARCHAR(100),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vlan_id, asset_id)
);

-- Protocol Statistics (aggregated by time window)
CREATE TABLE protocol_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    time_window TIMESTAMP WITH TIME ZONE NOT NULL,
    packet_count BIGINT DEFAULT 0,
    byte_count BIGINT DEFAULT 0,
    flow_count INTEGER DEFAULT 0,
    unique_sources INTEGER DEFAULT 0,
    unique_destinations INTEGER DEFAULT 0,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.2 Table Extensions

**Note:** The existing `flows` table has an `application` column for high-level application
category (e.g., "Web", "SSH"). The new `l7_protocol` column provides protocol-specific
detail (e.g., "HTTP/1.1", "SSH-2.0-OpenSSH"). Both fields serve different purposes:
- `application`: Broad category for filtering and grouping
- `l7_protocol`: Specific protocol version for deep analysis

```sql
-- Extend flows table with protocol analysis
-- l7_protocol is more specific than existing 'application' column
-- Example: application="Web" but l7_protocol="HTTP/2" or "QUIC"
ALTER TABLE flows ADD COLUMN l7_protocol VARCHAR(100);
ALTER TABLE flows ADD COLUMN l7_confidence FLOAT DEFAULT 0.0;
ALTER TABLE flows ADD COLUMN detection_method VARCHAR(50);  -- "port", "signature", "ndpi"
ALTER TABLE flows ADD COLUMN vlan_id INTEGER;
ALTER TABLE flows ADD COLUMN fingerprints JSONB;

CREATE INDEX idx_flows_l7_protocol ON flows(l7_protocol);
CREATE INDEX idx_flows_vlan ON flows(vlan_id);

-- Extend assets table with topology info
ALTER TABLE assets ADD COLUMN device_capabilities VARCHAR(50)[];
ALTER TABLE assets ADD COLUMN lldp_chassis_id VARCHAR(255);
ALTER TABLE assets ADD COLUMN stp_root_bridge BOOLEAN DEFAULT FALSE;
ALTER TABLE assets ADD COLUMN vlan_memberships INTEGER[];
```

---

## 4. API Extensions

### 4.1 New Endpoints

**Location:** `backend/app/api/v1/endpoints/protocol_analysis.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/protocol-analysis/protocols` | GET | Get protocol usage statistics |
| `/api/v1/protocol-analysis/protocols/{name}` | GET | Get details about specific protocol |
| `/api/v1/protocol-analysis/dissect` | POST | Get full dissection of captured packet |
| `/api/v1/protocol-analysis/ws/dissect` | WebSocket | Stream dissected packets real-time |
| `/api/v1/protocol-analysis/fingerprints` | GET | Get collected fingerprints |
| `/api/v1/protocol-analysis/topology/lldp` | GET | Get LLDP-discovered topology |
| `/api/v1/protocol-analysis/topology/multicast` | GET | Get multicast group topology |
| `/api/v1/protocol-analysis/topology/vlans` | GET | Get VLAN segmentation |
| `/api/v1/protocol-analysis/iana/update` | POST | Update IANA port database |

### 4.2 WebSocket Events

```json
// Protocol detection event
{
  "type": "protocol_detected",
  "data": {
    "protocol": "Modbus/TCP",
    "confidence": 0.95,
    "source": "192.168.1.10:502",
    "destination": "192.168.1.20:502"
  }
}

// Device discovery event
{
  "type": "device_discovered",
  "data": {
    "deviceType": "switch",
    "ip": "192.168.1.1",
    "lldp": {
      "systemName": "core-switch-01",
      "capabilities": ["Bridge", "Router"]
    }
  }
}

// Multicast group update
{
  "type": "multicast_group_update",
  "data": {
    "groupAddress": "224.0.0.251",
    "protocol": "mDNS",
    "members": ["192.168.1.10", "192.168.1.15"]
  }
}

// VLAN detection
{
  "type": "vlan_detected",
  "data": {
    "vlanId": 100,
    "deviceIp": "192.168.1.50",
    "priority": 0
  }
}
```

---

## 5. Frontend Components

### 5.1 Protocol Inspector

**Location:** `frontend/src/components/ProtocolInspector.tsx`

Displays hierarchical packet dissection with:
- Layer tree navigation (Ethernet → IP → TCP → HTTP)
- Field-by-field breakdown with descriptions
- Hex dump view with highlighting
- Fingerprint display (JA3, User-Agent)

### 5.2 Protocol Statistics Dashboard

**Location:** `frontend/src/components/ProtocolStats.tsx`

Shows:
- Protocol distribution pie chart
- Protocol timeline (packets over time by protocol)
- Top protocols table (packets, bytes, flows)
- Unknown protocol alerts

### 5.3 Enhanced Topology View

**Enhancements to:** `frontend/src/pages/Topology.tsx`

- Device type icons (switch, router, host)
- VLAN filtering and coloring
- Multicast group overlay
- LLDP neighbor info in tooltips

---

## 6. Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

**Sprint 1.1: DPI Service Foundation**
- [x] Create `DPIService.py` with basic structure
- [x] Implement layer dissectors (L2, L3, L4)
- [x] Add VLAN (802.1Q) support
- [x] Create data models
- [x] Unit tests

**Sprint 1.2: Protocol Registry**
- [x] Create `ProtocolRegistry.py` (integrated into DPIService.PORT_MAP)
- [x] Import IANA port assignments (50+ common ports)
- [ ] Create database schema
- [x] Port lookup service
- [ ] IANA auto-update endpoint

**Sprint 1.3: Database Schema**
- [ ] Create migration scripts
- [ ] Extend `flows` table
- [ ] Create new tables
- [ ] Run migrations and test

### Phase 2: L2 Discovery (Week 3)

**Sprint 2.1: LLDP/CDP Support**
- [x] Implement LLDP parsing
- [x] Implement CDP parsing
- [x] Create neighbor tracking (in-memory)
- [x] Integration with topology

**Sprint 2.2: VLAN Analysis**
- [x] Track VLAN tags
- [x] VLAN topology tracking (in-memory)
- [x] Segmentation detection
- [ ] UI filtering

**Sprint 2.3: Device Classification**
- [x] Device type inference
- [ ] Asset table extensions
- [x] Behavior-based classification

### Phase 3: Multicast & Topology (Week 4)

**Sprint 3.1: Multicast Tracking**
- [x] IGMP parsing
- [x] Group membership tracking
- [x] mDNS/SSDP detection

**Sprint 3.2: Topology Inference**
- [x] Bus vs. star detection (via multicast analysis)
- [x] STP BPDU parsing
- [x] Enhanced topology graph

### Phase 4: API Endpoints (Week 4-5)

**Sprint 4.1: Protocol Analysis Router**
- [x] Create `protocol_analysis.py` endpoint file
- [x] Implement protocol statistics endpoints
- [x] Implement topology endpoints (LLDP, multicast, VLAN)

**Sprint 4.2: WebSocket Events**
- [ ] Add protocol_detected event type
- [ ] Add device_discovered event type
- [ ] Add multicast_group_update event type

**Sprint 4.3: IANA Database Integration**
- [ ] IANA update endpoint
- [x] Port lookup API

### Phase 5: Frontend Integration (Week 5)

**Sprint 5.1: Protocol Inspector**
- [ ] Layer tree component
- [ ] Hex dump viewer
- [ ] Traffic page integration

**Sprint 5.2: Protocol Statistics**
- [ ] Dashboard component
- [ ] Charts and tables
- [ ] Protocol filter

**Sprint 5.3: Enhanced Topology**
- [ ] Device type icons
- [ ] VLAN filtering
- [ ] Multicast overlay

### Phase 6: Fingerprinting (Week 6)

**Sprint 6.1: TLS JA3**
- [ ] ClientHello parsing
- [ ] JA3 hash calculation
- [ ] Fingerprint storage

**Sprint 6.2: HTTP User-Agent**
- [ ] HTTP header parsing
- [ ] Browser classification

**Sprint 6.3: DHCP Fingerprinting**
- [ ] DHCP option parsing
- [ ] Device fingerprints

### Phase 7: Testing & Optimization (Week 7)

**Sprint 7.1: Integration Testing**
- [ ] E2E protocol detection tests
- [ ] LLDP topology tests
- [ ] Multicast tracking tests

**Sprint 7.2: Performance Optimization**
- [ ] Profile packet processing
- [ ] Optimize dissection triggers
- [ ] Add caching
- [ ] Benchmark: 10,000 pps target

**Sprint 7.3: Documentation**
- [ ] API documentation
- [ ] User guide
- [ ] Architecture docs

---

## 7. Performance Considerations

### 7.1 Three-Tier Processing

```
Tier 1: BPF Filter (Kernel Space)
├─ Filter by protocol, ports, addresses
├─ Throughput: 1M+ pps
└─ Cost: Near zero CPU

Tier 2: Fast Path (SnifferService)
├─ Basic protocol detection (TCP/UDP/ICMP/ARP)
├─ Flow aggregation
├─ Stats update
├─ Throughput: 100K+ pps
└─ Cost: Low CPU

Tier 3: Deep Inspection (DPIService)
├─ Triggered selectively
├─ Full layer-by-layer dissection
├─ Protocol classification
├─ Fingerprinting
├─ Throughput: 10K+ pps
└─ Cost: Medium CPU
```

### 7.2 Selective Dissection Triggers

- LLDP/CDP/STP frames (always)
- VLAN-tagged packets (always)
- Multicast protocols (IGMP, mDNS, SSDP)
- Unknown ports (not in IANA DB)
- TLS handshakes (for JA3)
- WebSocket requests with `enableDissection: true`
- API calls to `/dissect` endpoint

### 7.3 Caching Strategy

```python
class ProtocolRegistry:
    def __init__(self):
        self._port_cache = TTLCache(maxsize=10000, ttl=3600)  # 1 hour
        self._signature_cache = LRUCache(maxsize=1000)
        self._fingerprint_cache = TTLCache(maxsize=5000, ttl=86400)  # 24 hours
```

---

## 8. Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Packet Capture** | Scapy | 2.5+ | Core dissection engine |
| **DPI (Phase 2)** | nDPI | 4.4+ | L7 protocol detection (via ctypes/cffi) |
| **Database** | PostgreSQL | 14+ | Data storage |
| **Caching** | cachetools | 5.3+ | In-memory caching |
| **API** | FastAPI | 0.104+ | REST endpoints |
| **WebSocket** | FastAPI WebSocket | - | Real-time events |
| **Frontend** | React + TypeScript | 18+ | UI components |
| **Visualization** | react-force-graph-2d | - | Topology graph |
| **TLS Fingerprinting** | pyja3 | 1.0+ | JA3 hash calculation |

**Note on nDPI Integration:** nDPI is a C library. For Phase 2, integration options include:
1. Use official Python bindings from ntop/nDPI repository (pyndpi)
2. Create custom bindings via ctypes or cffi
3. Use pyshark as an alternative for comprehensive dissection

---

## 9. Research Findings Summary

### Recommended Approach: Hybrid (Scapy + nDPI)

**Rationale:**
1. **Scapy Extensions** provide immediate value with minimal risk (already integrated)
2. **nDPI** fills the L7 DPI gap with 300+ protocols and encrypted traffic analysis
3. Combined approach balances depth (nDPI) with flexibility (Scapy)
4. Both are Python-compatible and container-friendly

### Key Capabilities

| Capability | Solution | Phase |
|------------|----------|-------|
| VLAN detection | Scapy Dot1Q | 1 |
| LLDP/CDP parsing | Scapy contrib | 1 |
| IGMP multicast | Scapy layers | 1 |
| TLS fingerprinting | pyja3 library | 6 |
| 300+ L7 protocols | nDPI | Future (v2.0) |
| Industrial protocols | nDPI + Scapy | Future (v2.0) |
| HTTP/2, QUIC | nDPI | Future (v2.0) |

### References

1. Scapy Documentation: https://scapy.readthedocs.io/
2. nDPI Library: https://github.com/ntop/nDPI
3. IANA Port Numbers: https://www.iana.org/assignments/service-names-port-numbers/
4. JA3 Fingerprinting: https://github.com/salesforce/ja3
5. IEEE 802.1Q (VLAN): https://standards.ieee.org/ieee/802.1Q/
6. LLDP (802.1AB): https://standards.ieee.org/ieee/802.1AB/

---

## 10. Next Steps

1. **Review this design** - Get stakeholder approval
2. **Create migration** - Database schema changes
3. **Implement DPIService** - Core dissection engine
4. **Implement ProtocolRegistry** - IANA database integration
5. **Implement TopologyInferenceEngine** - LLDP/multicast tracking
6. **Create API endpoints** - Protocol analysis routes
7. **Build frontend components** - Protocol inspector, stats dashboard
8. **Write tests** - Unit, integration, performance
9. **Document** - API reference, user guide

---

**Document Version:** 1.0  
**Created:** 2026-01-24  
**Author:** AKIS Framework  
**Status:** Proposed - Awaiting Approval
