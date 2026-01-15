---
session:
  id: "2026-01-15_passive_scan_feature"
  date: "2026-01-15"
  complexity: medium
  domain: fullstack

skills:
  loaded: [frontend-react, backend-api]
  suggested: []

files:
  modified:
    - {path: "backend/app/services/SnifferService.py", type: py, domain: backend}
    - {path: "backend/app/api/v1/endpoints/scans.py", type: py, domain: backend}
    - {path: "frontend/src/store/scanStore.ts", type: ts, domain: frontend}
    - {path: "frontend/src/pages/Scans.tsx", type: tsx, domain: frontend}
  types: {py: 2, ts: 1, tsx: 1}

gotchas: []

root_causes: []

gates:
  passed: [G0, G1, G2, G3, G4, G5, G6]
  violations: []
---

# Session Log: Passive Scan Feature

## Summary
Implemented passive port scanning feature that detects open service ports from TCP SYN/ACK patterns in network traffic. Added toggleable "PASSIVE ON/OFF" button to Scans page (same style as Assets page).

## Tasks Completed
- ✓ Added passive_scan_enabled flag and detected_services tracking to SnifferService.py
- ✓ Added _detect_service_by_port() helper method for port-to-service mapping
- ✓ Added API endpoints (GET/POST/DELETE) for passive scan in scans.py
- ✓ Added PassiveService interface and state to scanStore.ts
- ✓ Added PASSIVE ON/OFF toggle button to Scans.tsx with service count badge

## Implementation Details

### Backend (SnifferService.py)
- `passive_scan_enabled`: Boolean flag to enable/disable detection
- `detected_services`: Dict storing {host_ip: {port: {service, timestamps, count}}}
- Detects SYN+ACK responses (tcp.flags.S and tcp.flags.A) to identify open ports
- Maps common ports to service names (22=ssh, 80=http, 443=https, etc.)

### API Endpoints (scans.py)
- `GET /api/v1/scans/passive-scan` - Returns enabled status and detected services
- `POST /api/v1/scans/passive-scan` - Toggle passive scan on/off
- `DELETE /api/v1/scans/passive-scan/services` - Clear detected services

### Frontend (Scans.tsx)
- Toggle button with green glow when enabled
- Shows detected service count in badge
- Polls for updates every 10 seconds when enabled
