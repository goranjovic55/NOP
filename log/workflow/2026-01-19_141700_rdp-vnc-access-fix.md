---
session:
  id: "2026-01-19_rdp-vnc-access-fix"
  complexity: medium

skills:
  loaded: [debugging, backend-api, frontend-react, docker]

files:
  modified:
    - {path: "backend/app/api/v1/endpoints/access.py", domain: backend}
    - {path: "docker/docker-compose.dev.yml", domain: docker}
    - {path: "test-environment/rdp-server/Dockerfile", domain: docker}
    - {path: "frontend/src/components/ProtocolConnection.tsx", domain: frontend}

root_causes:
  - problem: "RDP connects then disconnects immediately"
    solution: "Security type mismatch - changed guacd security to 'any' and XRDP to 'negotiate'"
  - problem: "Wrong RDP/VNC host IPs in docker-compose.dev.yml"
    solution: "Fixed VNC_HOST=172.21.0.50, RDP_HOST=172.21.0.60"
  - problem: "Keyboard input blocked after disconnect"
    solution: "Replaced Guacamole.Keyboard with native event listeners that check activeElement"
  - problem: "Pointer lock grabbing cursor inside RDP/VNC"
    solution: "Removed requestPointerLock() calls entirely"

gotchas:
  - issue: "Guacamole.Keyboard cannot be properly cleaned up"
    solution: "Use native document.addEventListener with stored refs for removal"
  - issue: "guacd 1.6.0 security negotiation"
    solution: "Use security=any with XRDP security_layer=negotiate"
---

# Session: Fix RDP/VNC Access Page Issues

## Summary
Fixed multiple issues with RDP/VNC connections in the Access page:
1. RDP connections disconnecting immediately after connecting
2. Keyboard input blocked after disconnecting from sessions
3. Pointer lock trapping cursor inside display area

## Tasks
- ✓ Diagnosed RDP security type mismatch (guacd logs showed "wrong security type")
- ✓ Fixed backend security setting: "rdp" → "any"
- ✓ Fixed XRDP Dockerfile: security_layer=negotiate
- ✓ Corrected environment variables: RDP_HOST/VNC_HOST IPs were swapped
- ✓ Replaced Guacamole.Keyboard with native keyboard events
- ✓ Added proper cleanup on disconnect (removeEventListener)
- ✓ Removed pointer lock behavior entirely
- ✓ Rebuilt frontend container with fixes

## Test Credentials
| Protocol | Host | Port | Username | Password |
|----------|------|------|----------|----------|
| RDP | 127.0.0.1 | 3389 | rdpuser | rdp123 |
| VNC | 127.0.0.1 | 5900 | - | vnc123 |

## Key Changes

### Backend (access.py)
- `security`: "rdp" → "any" (allow negotiation)
- `color-depth`: "24" → "32" (RDP Graphics Pipeline requirement)

### Docker (docker-compose.dev.yml)
- `VNC_HOST`: 172.21.0.51 → 172.21.0.50
- `RDP_HOST`: 172.21.0.50 → 172.21.0.60

### Frontend (ProtocolConnection.tsx)
- Added `getKeysym()` helper for key-to-keysym conversion
- Replaced `Guacamole.Keyboard` with native `document.addEventListener`
- Keyboard events only captured when display is focused
- Proper cleanup with `removeEventListener` on disconnect
- Removed all `requestPointerLock()` calls
