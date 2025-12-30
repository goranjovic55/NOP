# Workflow Log: Passive Discovery Filtering & Interface Selector

**Session**: 2025-12-29_194214  
**Task**: Add source-only tracking, granular filtering, and interface auto-detection  
**Agent**: _DevTeam (Orchestrator)

---

## Summary

Implemented comprehensive passive discovery filtering system to eliminate phantom host problem. Added source-only tracking mode (default), granular packet filtering (unicast/multicast/broadcast), and auto-detected interface selector in Settings UI.

**Problem Solved**: User reported phantom hosts on live networks (255 assets discovered, only 10 real). Destination IPs from ARP scans, stale connections, and network probes were incorrectly identified as assets.

**Solution**: Track only SOURCE IPs by default (hosts must send traffic to be discovered), with configurable filters for unicast/multicast/broadcast packets.

---

## Decision Diagram

```
[SESSION START: Passive Discovery Filtering]
    |
    └─[DECISION: How to prevent phantom hosts?] 
        ├─ Option A: Complex destination IP filtering → Rejected (too fragile)
        ├─ Option B: Whitelist real IPs → Rejected (manual maintenance)
        └─ ✓ Option C: Source-only tracking → CHOSEN (natural prevention)
            |
            └─[DECISION: Need additional flexibility?]
                └─ ✓ Yes → Add granular filters (unicast/multicast/broadcast)
                    |
                    ├─[SUBAGENT: Developer] Implement SnifferService filtering
                    |   ├─[ATTEMPT #1] Add source validation → ✓ Success
                    |   ├─[ATTEMPT #2] Add filter toggles → ✓ Success
                    |   └─[ATTEMPT #3] Fix logger import → ✓ Success
                    |
                    ├─[DECISION: Interface on wrong network?]
                    |   └─ ✓ Yes (eth0 → eth1) → Fixed in config.py
                    |
                    ├─[SUBAGENT: Developer] Add interface selector UI
                    |   ├─[ATTEMPT #1] Add state & fetch logic → ✓ Success
                    |   ├─[ATTEMPT #2] Build fails (interfaces not in scope) → ✗ Failed
                    |   ├─[ATTEMPT #3] Pass as prop to component → ✓ Success
                    |   └─[ATTEMPT #4] Style with cyberpunk theme → ✓ Success
                    |
                    ├─[DECISION: How to test filtering?]
                    |   └─ ✓ Create test environment + traffic simulator
                    |       |
                    |       ├─[SUBAGENT: Researcher] Create 7 test hosts
                    |       |   ├─[ATTEMPT #1] Network subnet mismatch → ✗ Failed
                    |       |   ├─[ATTEMPT #2] Recreate network manually → ✓ Success
                    |       |   └─[ATTEMPT #3] All hosts running → ✓ Success
                    |       |
                    |       └─[SUBAGENT: Researcher] Create traffic simulator
                    |           └─[ATTEMPT #1] Scapy-based 13 traffic types → ✓ Success
                    |
                    ├─[SUBAGENT: Reviewer] Validate 3 filter scenarios
                    |   ├─[TEST #1] Source-only ON → ✓ Pass (4 hosts, no phantom)
                    |   ├─[TEST #2] Filters ON → ✓ Pass (5 hosts, unicast dest appeared)
                    |   └─[TEST #3] Filters OFF → ✓ Pass (6 hosts, broadcast/multicast appeared)
                    |
                    └─[USER CONFIRMATION] "filtering seems to work now" → ✓ VERIFIED
                        |
                        └─[COMPLETE] Commit & Push → c529c00
```

## Decision & Execution Flow

### Phase 1: Context (CONTEXT)
- Loaded project knowledge and skills
- Identified problem: Phantom hosts from destination IP tracking
- Found existing passive discovery in SnifferService.py
- User explained: "connecting to live subnet showed 255 assets, only 10 real"

### Phase 2: Planning (PLAN)
**Design Decision**: Source-only tracking prevents phantom hosts naturally
- **Why**: Broadcast/multicast can never be SOURCE IPs (protocol violation)
- **Alternative Considered**: Complex destination IP filtering
- **Chosen**: Source-only mode + granular filters for flexibility

### Phase 3: Implementation (COORDINATE)

#### Backend Changes (Developer)
1. **SnifferService.py** - Added filtering logic
   - `_is_valid_source_ip()` method filters 0.0.0.0, broadcast, multicast, link-local
   - Configurable `track_source_only`, `filter_unicast`, `filter_multicast`, `filter_broadcast`
   - Updated packet processing to validate source IPs before discovery
   - Fixed missing logger import bug

2. **config.py** - Network interface fix
   - Changed NETWORK_INTERFACE from "eth0" to "eth1"
   - Backend has two interfaces; eth1 is where traffic occurs (172.19.0.5)

#### Frontend Changes (Developer)
1. **Settings.tsx** - Interface selector
   - Added `interfaces` state with auto-detection
   - Replaced text input with dropdown selector
   - Shows: `interface_name - IP (status)`
   - Polls `/api/v1/traffic/interfaces` every 5 seconds
   - Cyberpunk-themed styling (bg-cyber-darker, text-cyber-blue, border-cyber-gray)
   - Passed as prop to DiscoverySettingsPanel component

2. **Settings.tsx** - Label simplification
   - Changed "Track Source IPs Only" → "Source Only" (user request for 2-word label)

### Phase 4: Integration (INTEGRATE)
- Frontend builds succeeded
- Backend config updated
- Docker containers rebuilt

### Phase 5: Verification (VERIFY)

#### Test Environment Setup
Created 7 test hosts on 172.21.0.0/24:
```
web-server:      172.21.0.42  (HTTP 80)
rdp-server:      172.21.0.50  (RDP 3389)
vnc-server:      172.21.0.51  (VNC 5900)
ftp-server:      172.21.0.52  (FTP 21)
ssh-server:      172.21.0.69  (SSH 22)
database-server: 172.21.0.123 (MySQL 3306)
file-server:     172.21.0.200 (SMB 445)
```

#### Traffic Simulation
Created `scripts/simulate_realistic_traffic.py`:
- 13 traffic types: HTTP, SSH, MySQL, SMB, RDP, VNC, FTP, DNS, ARP, mDNS, SSDP, DHCP, PING
- Weighted random selection for realism
- Configurable duration and intensity

#### Test Results

**Test 1: Source Only ON**
- Settings: `track_source_only: true`, filters ON
- Result: 4 hosts discovered (only real senders)
- ✅ **PASS** - No broadcast/multicast addresses captured

**Test 2: Source+Dest, Filters ON**
- Settings: `track_source_only: false`, `filter_multicast: true`, `filter_broadcast: true`
- Result: 5 hosts (unicast dest 172.19.0.200 appeared)
- ✅ **PASS** - Multicast/broadcast still filtered

**Test 3: Source+Dest, Filters OFF**
- Settings: `track_source_only: false`, all filters OFF
- Result: 6 hosts (broadcast .255 and multicast 224.0.0.251 appeared)
- ✅ **PASS** - All IPs captured as expected

**Production Simulation**
- 192 packets over 120 seconds
- 19 assets discovered (7 real hosts + 5 simulated clients + infrastructure)
- No broadcast/multicast addresses (filters working)

---

## Agent Interactions

| Agent | Task | Outcome |
|-------|------|---------|
| Developer | Implement source-only filtering in SnifferService | ✅ Complete |
| Developer | Add interface selector to Settings UI | ✅ Complete |
| Developer | Fix logger import bug | ✅ Complete |
| Developer | Fix interface configuration (eth0→eth1) | ✅ Complete |
| Reviewer | Validate filter tests (3 scenarios) | ✅ All passed |
| Researcher | Create test environment (7 hosts) | ✅ Running |
| Researcher | Create traffic simulator script | ✅ Complete |

---

## Files Modified

### Backend
- `backend/app/services/SnifferService.py`
  - Added `_is_valid_source_ip()` validation method
  - Added packet filtering logic for source-only mode
  - Fixed missing logger import
  - Lines changed: ~30

- `backend/app/core/config.py`
  - Changed NETWORK_INTERFACE: "eth0" → "eth1"
  - Lines changed: 1

### Frontend
- `frontend/src/pages/Settings.tsx`
  - Added `interfaces` state with auto-detection
  - Added `fetchInterfaces()` method (polls every 5s)
  - Replaced text input with cyberpunk-styled dropdown
  - Passed interfaces prop to DiscoverySettingsPanel
  - Changed label: "Track Source IPs Only" → "Source Only"
  - Lines changed: ~40

### Infrastructure
- Created `scripts/simulate_realistic_traffic.py` (230+ lines)
- Test hosts: `test-environment/{web,ssh,db,file,rdp,vnc,ftp}-server/`
- Docker: `docker-compose.test.yml` (7 services on 172.21.0.0/24)

---

## Quality Gates

| Gate | Status | Notes |
|------|--------|-------|
| Linters | ✅ Pass | No TypeScript errors |
| Build | ✅ Pass | Frontend/backend built successfully |
| Tests | ✅ Pass | All 3 filter scenarios validated |
| User Testing | ✅ Pass | User confirmed filtering works |

---

## Learnings

### 1. Network Discovery Best Practices
**Pattern**: Track SOURCE IPs only for passive discovery
- **Why**: Destination IPs may not exist (broadcasts, unreachable hosts, probes)
- **Implementation**: Validate source IPs, ignore invalid (0.0.0.0, broadcast, multicast)
- **Benefit**: Eliminates phantom hosts naturally without complex filtering

### 2. Granular Filtering Architecture
**Pattern**: Independent filter toggles (unicast/multicast/broadcast)
- **Why**: Users need flexibility for different network environments
- **Implementation**: Boolean flags with explicit checks in packet processing
- **Benefit**: Can adapt to specific network behaviors (e.g., filter mDNS but allow unicast)

### 3. Interface Auto-Detection UX
**Pattern**: Reuse existing backend endpoint in Settings
- **Why**: `/api/v1/traffic/interfaces` already provides interface detection
- **Implementation**: Poll every 5 seconds, show status in dropdown
- **Benefit**: Consistent UX across Traffic and Settings pages

### 4. Test Environment Design
**Pattern**: Separate docker-compose file for test hosts
- **Why**: Keeps test infrastructure isolated from main stack
- **Implementation**: `docker-compose.test.yml` with external network
- **Benefit**: Can spin up/down test hosts independently

### 5. Traffic Simulation for Network Testing
**Pattern**: Scapy-based realistic traffic generator
- **Why**: Need predictable traffic to validate filtering behavior
- **Implementation**: Weighted random selection of 13 traffic types
- **Benefit**: Reproducible tests, can simulate various network scenarios

---

## Knowledge Updated

### project_knowledge.json
- Updated `Backend.Services.SnifferService.PassiveDiscovery` with filtering details
- Added `NOP.Backend.API.SettingsEndpoint` discovery settings
- Added `Frontend.Settings.InterfaceSelector` feature
- Added `TestEnvironment.TrafficSimulator` tool
- Added `TestEnvironment.Hosts` infrastructure

### Potential Skill Additions
None suggested - existing skills covered:
- #6 Knowledge (session updates)
- #11 UI Patterns (cyberpunk theming)
- #12 Infrastructure (Docker test environment)

---

## Completion Metrics

- **Duration**: ~2 hours
- **Files Changed**: 4
- **Lines Added/Modified**: ~300
- **Tests Passed**: 3/3
- **User Confirmation**: ✅ "filtering seems to work now"
- **Knowledge Entries**: 5 updated/added

---

## Next Steps (Future Work)

1. **Passive Discovery Enhancements**
   - MAC vendor lookup for better asset classification
   - Hostname extraction from DNS/DHCP traffic
   - OS fingerprinting from TTL values

2. **Test Environment Expansion**
   - Add more realistic services (LDAP, NTP, SNMP)
   - Simulate network topology changes
   - Add packet loss/latency simulation

3. **UI Improvements**
   - Real-time interface status indicator
   - Network traffic graph in Settings
   - Filter effectiveness metrics (packets filtered vs captured)

---

**Session Complete**: 2025-12-29 19:42:14 UTC
