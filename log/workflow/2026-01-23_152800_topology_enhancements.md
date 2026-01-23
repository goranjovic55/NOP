---
session:
  id: "2026-01-23_topology_enhancements"
  complexity: complex

skills:
  loaded:
    - frontend-react
    - backend-api

files:
  modified:
    - {path: "frontend/src/pages/Topology.tsx", domain: frontend}
    - {path: "frontend/src/pages/Assets.tsx", domain: frontend}
    - {path: "backend/app/services/SnifferService.py", domain: backend}
    - {path: "backend/app/api/v1/endpoints/scans.py", domain: backend}

agents:
  delegated: []

root_causes: []

gotchas:
  - issue: "Passive scan data not persisted on container restart"
    solution: "Backend SnifferService stores state in memory only - survives page reload but not container restart"
---

# Session: Topology Enhancements

## Summary
Implemented multiple topology and passive scan enhancements including auto-centering on largest connection cluster, enhanced passive discovery (OS detection, hostname extraction, service banner parsing), new Assets table OS column, and hover details sidebar in Topology.

## Tasks
- ✓ Center topology on largest cluster after simulation stops
- ✓ Verify passive scan toggle state persists (already working - backend state survives page reload)
- ✓ Enhance passive scan data collection (OS fingerprinting, DNS hostnames, service banners)
- ✓ Add API endpoints for enhanced host info
- ✓ Add OS column to Assets table with color coding
- ✓ Add hover details sidebar in Topology showing asset/connection info

## Implementation Details

### 1. Topology Auto-Centering (Topology.tsx)
- Modified `onEngineStop` callback to find node with most connections
- Uses `fgRef.current.centerAt()` with 500ms animation
- Counts connections per node from links to find the hub

### 2. Enhanced Passive Discovery (SnifferService.py)
Added three new detection methods:
- `_detect_os_from_ttl()` - OS fingerprinting from TTL values (Linux: 64, Windows: 128, Network: 255)
- `_extract_dns_hostname()` - Extract hostnames from DNS A record responses
- `_extract_service_banner()` - Parse HTTP Server headers, SSH banners, FTP/SMTP greetings

New data structures:
- `host_os_info` - {ip: {os, ttl, confidence, last_seen}}
- `host_hostnames` - {ip: {hostname, source, last_seen}}
- `service_versions` - {ip: {port: {banner, version, last_seen}}}

### 3. New API Endpoints (scans.py)
- `GET /api/v1/scans/passive-scan/enhanced-hosts` - All enhanced host data
- `GET /api/v1/scans/passive-scan/host/{ip}` - Single host enhanced info

### 4. Assets Table Enhancement (Assets.tsx)
- Added `enhancedHostInfo` state fetched from enhanced-hosts API
- Added "OS" column after "Hostname" column
- Displays OS with color coding (Linux=green, Windows=blue, Network=purple)
- Shows TTL and confidence on hover tooltip

### 5. Topology Hover Sidebar (Topology.tsx)
- Added hover details panel on right side of graph
- Shows for both nodes and links
- Node info: IP, hostname (from DNS), status, OS, service versions
- Link info: Source/target IPs, protocol, traffic (in/out), packet count

## Files Changed
- frontend/src/pages/Topology.tsx (auto-center + hover sidebar + enhanced host state)
- frontend/src/pages/Assets.tsx (OS column + enhanced host fetch)
- backend/app/services/SnifferService.py (OS/hostname/banner detection methods)
- backend/app/api/v1/endpoints/scans.py (new API endpoints)
