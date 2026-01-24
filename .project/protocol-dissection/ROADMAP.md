# Protocol Dissection Implementation Roadmap

**Quick Reference for Implementation Teams**

---

## Overview

Implement protocol dissection and topology inference in 7 phases over 7 weeks.

---

## Phase 1: Core Infrastructure (Week 1-2)

### Files to Create

```
backend/app/services/DPIService.py
backend/app/services/ProtocolRegistry.py
backend/app/schemas/protocol_analysis.py
backend/alembic/versions/xxx_add_protocol_analysis_tables.py
```

### Key Tasks

1. **DPIService.py** - Deep Packet Inspection engine
   - Layer-by-layer dissection (L2, L3, L4, L7)
   - VLAN (802.1Q) support using `scapy.layers.vlan.Dot1Q`
   - Data models: `DissectedPacket`, `VLANLayer`, `ProtocolClassification`

2. **ProtocolRegistry.py** - Protocol database
   - Load IANA port assignments (CSV auto-fetch)
   - Port lookup service with caching
   - Custom protocol signature registration

3. **Database Migration**
   - `protocol_ports` table (IANA database)
   - `protocol_signatures` table (custom protocols)
   - `device_fingerprints` table (JA3, User-Agent)
   - Extend `flows` table with `l7_protocol`, `vlan_id`, `fingerprints`

### Dependencies

```python
# requirements.txt additions
cachetools>=5.3.0  # In-memory caching
```

---

## Phase 2: L2 Discovery (Week 3)

### Files to Modify

```
backend/app/services/SnifferService.py  # Enhance _process_packet
backend/app/services/DPIService.py      # Add LLDP/CDP dissectors
```

### Files to Create

```
backend/app/services/TopologyInferenceEngine.py
backend/alembic/versions/xxx_add_lldp_vlan_tables.py
```

### Key Tasks

1. **LLDP/CDP Parsing**
   - Import: `from scapy.contrib.lldp import LLDPDU`
   - Import: `from scapy.contrib.cdp import CDPv2_HDR`
   - Extract: chassis_id, system_name, capabilities, ports

2. **TopologyInferenceEngine.py**
   - Process LLDP frames → update neighbor relationships
   - Track VLAN memberships per device
   - Device classification (switch/router/host)

3. **Database Tables**
   - `lldp_neighbors` table
   - `vlan_topology` table
   - Extend `assets` with `device_capabilities`, `lldp_chassis_id`

### Scapy Imports

```python
from scapy.contrib.lldp import LLDPDU, LLDPDUChassisID, LLDPDUSystemName
from scapy.contrib.cdp import CDPv2_HDR, CDPMsgDeviceID
from scapy.layers.vlan import Dot1Q
from scapy.contrib.stp import STP
```

---

## Phase 3: Multicast & Topology (Week 4)

### Files to Modify

```
backend/app/services/TopologyInferenceEngine.py  # Add multicast tracking
backend/app/services/DPIService.py               # Add IGMP dissector
```

### Key Tasks

1. **Multicast Group Tracking**
   - Import: `from scapy.layers.igmp import IGMP`
   - Track IGMP join/leave for group membership
   - Detect mDNS (224.0.0.251:5353), SSDP (239.255.255.250:1900)

2. **Topology Inference**
   - Bus vs. star detection from multicast patterns
   - STP BPDU parsing for root bridge detection
   - Generate enhanced topology graph

3. **Database Tables**
   - `multicast_groups` table
   - `protocol_statistics` table

### Detection Patterns

```python
# mDNS
if UDP in packet and packet[UDP].dport == 5353:
    protocol = "mDNS"

# SSDP  
if UDP in packet and packet[UDP].dport == 1900:
    protocol = "SSDP"

# IGMP
if IGMP in packet:
    group = packet[IGMP].gaddr
```

---

## Phase 4: API Endpoints (Week 4-5)

### Files to Create

```
backend/app/api/v1/endpoints/protocol_analysis.py
```

### Endpoints to Implement

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/protocol-analysis/protocols` | GET | Protocol statistics |
| `/api/v1/protocol-analysis/dissect` | POST | Packet dissection |
| `/api/v1/protocol-analysis/topology/lldp` | GET | LLDP topology |
| `/api/v1/protocol-analysis/topology/multicast` | GET | Multicast groups |
| `/api/v1/protocol-analysis/topology/vlans` | GET | VLAN segmentation |
| `/api/v1/protocol-analysis/fingerprints` | GET | Collected fingerprints |
| `/api/v1/protocol-analysis/iana/update` | POST | Update IANA DB |

### WebSocket Events

```javascript
// Add to existing traffic WebSocket
{ type: "protocol_detected", data: { protocol, confidence, source } }
{ type: "device_discovered", data: { deviceType, ip, lldp } }
{ type: "multicast_group_update", data: { groupAddress, members } }
{ type: "vlan_detected", data: { vlanId, deviceIp } }
```

---

## Phase 5: Frontend Integration (Week 5)

### Files to Create

```
frontend/src/components/ProtocolInspector.tsx
frontend/src/components/ProtocolStats.tsx
frontend/src/services/protocolAnalysisService.ts
frontend/src/types/protocolAnalysis.ts
```

### Files to Modify

```
frontend/src/pages/Traffic.tsx     # Add Protocol Inspector sidebar
frontend/src/pages/Topology.tsx    # Add device type icons, VLAN filter
```

### Key Components

1. **ProtocolInspector.tsx**
   - Layer tree view (Ethernet → IP → TCP → HTTP)
   - Field-by-field breakdown
   - Hex dump viewer

2. **ProtocolStats.tsx**
   - Protocol distribution pie chart
   - Protocol timeline
   - Top protocols table

3. **Topology Enhancements**
   - Device type icons (switch, router, host)
   - VLAN filtering dropdown
   - Multicast group overlay

---

## Phase 6: Fingerprinting (Week 6)

### Files to Modify

```
backend/app/services/DPIService.py  # Add fingerprint extraction
```

### Key Tasks

1. **TLS JA3 Fingerprinting**
   ```python
   # Install: pip install pyja3
   import pyja3
   ja3_hash = pyja3.process_packet(tls_packet)
   ```

2. **HTTP User-Agent Extraction**
   ```python
   if HTTP in packet:
       user_agent = packet[HTTP].User_Agent
   ```

3. **DHCP Fingerprinting**
   ```python
   from scapy.layers.dhcp import DHCP
   if DHCP in packet:
       options = packet[DHCP].options
   ```

### Dependencies

```python
# requirements.txt additions
pyja3>=1.0.0  # TLS fingerprinting
```

---

## Phase 7: Testing & Optimization (Week 7)

### Test Files to Create

```
backend/tests/test_dpi_service.py
backend/tests/test_topology_inference.py
backend/tests/test_protocol_registry.py
frontend/src/components/__tests__/ProtocolInspector.test.tsx
```

### Performance Targets

| Metric | Target |
|--------|--------|
| Deep inspection | 10,000+ pps |
| Fast path | 100,000+ pps |
| Port lookup | < 1ms |
| WebSocket latency | < 100ms |

### Key Tests

```python
def test_dissect_vlan_packet():
    packet = Ether()/Dot1Q(vlan=100)/IP()/TCP()
    dissected = dpi.dissect_packet(packet)
    assert dissected.vlan.vlan_id == 100

def test_lldp_neighbor_discovery():
    lldp = create_lldp_frame()
    device = await engine.process_lldp_frame(lldp, "192.168.1.1")
    neighbors = await engine.get_lldp_neighbors(device.id)
    assert len(neighbors) == 1
```

---

## Quick Reference: Scapy Imports

```python
# Layer 2
from scapy.layers.l2 import Ether, ARP
from scapy.layers.vlan import Dot1Q
from scapy.contrib.lldp import LLDPDU
from scapy.contrib.cdp import CDPv2_HDR
from scapy.contrib.stp import STP

# Layer 3
from scapy.layers.inet import IP, ICMP
from scapy.layers.igmp import IGMP

# Layer 4
from scapy.layers.inet import TCP, UDP

# Layer 7
from scapy.layers.dns import DNS
from scapy.layers.http import HTTP
from scapy.layers.tls.record import TLS
from scapy.layers.dhcp import DHCP

# Industrial
from scapy.contrib.modbus import ModbusPDU01ReadCoilsRequest
from scapy.contrib.opcua import OpcUa
```

---

## Quick Reference: Database Schema

```sql
-- Core tables
CREATE TABLE protocol_ports (port, protocol, service_name);
CREATE TABLE protocol_signatures (protocol_name, pattern, ports);
CREATE TABLE device_fingerprints (fingerprint_type, hash, metadata);
CREATE TABLE lldp_neighbors (local_asset_id, remote_chassis_id, ...);
CREATE TABLE multicast_groups (group_address, protocol, member_ips);
CREATE TABLE vlan_topology (vlan_id, asset_id);
CREATE TABLE protocol_statistics (protocol_name, time_window, packet_count);

-- Extensions
ALTER TABLE flows ADD COLUMN l7_protocol VARCHAR(100);
ALTER TABLE flows ADD COLUMN vlan_id INTEGER;
ALTER TABLE flows ADD COLUMN fingerprints JSONB;
ALTER TABLE assets ADD COLUMN device_capabilities VARCHAR(50)[];
```

---

## Success Criteria

- [ ] VLAN detection working
- [ ] LLDP neighbors discovered
- [ ] Multicast groups tracked
- [ ] Protocol statistics displayed
- [ ] Topology shows device types
- [ ] Fingerprints collected
- [ ] Performance targets met
- [ ] Documentation complete

---

**Document Version:** 1.0  
**Created:** 2026-01-24
