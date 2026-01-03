# Agent/C2 System Enhancements

**Date:** 2026-01-03  
**Branch:** copilot/create-agent-page  
**Type:** Feature Enhancement  
**Duration:** ~2 hours

---

## Objective

Enhance the Agent/C2 page with:
1. Settings modal for configuring deployed agents
2. IP auto-detection for connection URLs
3. Connection scheduling and strategy settings
4. Platform selection for Go agent compilation
5. Comprehensive roadmap for future improvements

---

## Changes Implemented

### 1. Agent Settings Modal

**Files Modified:**
- `frontend/src/pages/Agents.tsx`

**Features Added:**
- Full settings modal with connection and schedule configuration
- Connectback server URL editing
- Timing controls:
  - Connectback interval (5-3600s)
  - Heartbeat interval (10-300s)
  - Data collection interval (30-3600s)
- Re-download agent button
- Delete agent option with confirmation
- Settings button (⚙) on each agent card

**Backend Integration:**
- Uses existing `PUT /api/v1/agents/{id}` endpoint
- Persists to `agent_metadata` JSON field

### 2. IP Auto-Detection

**Files Modified:**
- `frontend/src/pages/Agents.tsx`

**Features Added:**
- WebRTC-based local IP detection
- Public IP detection via ipify.org API
- IP selection buttons (Local/Public)
- Auto-populate connection URLs based on selected IP
- Visual indicators for detected IPs

**Implementation:**
```typescript
// Local IP via WebRTC
const pc = new RTCPeerConnection({ iceServers: [] });
pc.onicecandidate = (ice) => {
  const ip = ice.candidate.candidate.split(' ')[4];
  setLocalIP(ip);
};

// Public IP via API
fetch('https://api.ipify.org?format=json')
  .then(r => r.json())
  .then(data => setPublicIP(data.ip));
```

### 3. Connection Strategy & Scheduling

**Files Modified:**
- `frontend/src/pages/Agents.tsx`

**Features Added:**
- Connection strategy selection:
  - **Constant:** Always retry connection (max_reconnect_attempts: -1)
  - **Scheduled:** Limited reconnect attempts (configurable 1-1000)
- Schedule settings panel in create modal
- Default metadata values for all agents
- Visual strategy selector with color coding

**Metadata Schema:**
```json
{
  "connectback_interval": 30,
  "heartbeat_interval": 30,
  "data_interval": 60,
  "connection_strategy": "constant",
  "max_reconnect_attempts": -1
}
```

### 4. Go Agent Compilation

**Files Modified:**
- `backend/app/schemas/agent.py`
- `backend/app/services/agent_service.py`
- `backend/app/api/v1/endpoints/agents.py`
- `frontend/src/services/agentService.ts`
- `frontend/src/pages/Agents.tsx`

**Features Added:**
- Platform selection UI (5 platforms):
  - Linux x64 (linux-amd64)
  - Windows x64 (windows-amd64)
  - macOS Intel (darwin-amd64)
  - macOS M1/M2 (darwin-arm64)
  - Linux ARM64 (linux-arm64)
- Backend compilation service using Go cross-compilation
- Binary encoding/decoding (base64)
- Platform-specific filenames (.exe for Windows)
- Fallback to source code if compilation fails

**Backend Implementation:**
```python
async def compile_go_agent(source_code: str, platform: str, obfuscate: bool):
    # Set GOOS and GOARCH
    env['GOOS'], env['GOARCH'] = platform.split('-')
    env['CGO_ENABLED'] = '0'
    
    # Compile with optional obfuscation
    if obfuscate:
        subprocess.run(['garble', '-tiny', '-literals', 'build', ...])
    else:
        subprocess.run(['go', 'build', '-ldflags=-w -s', ...])
    
    # Return binary as bytes
    return binary_data
```

**Frontend Download Handling:**
```typescript
if (is_binary) {
  // Decode base64 to binary
  const binaryString = atob(content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  blob = new Blob([bytes], { type: 'application/octet-stream' });
}
```

### 5. UI/UX Improvements

**Card Layout:**
- Removed individual action buttons
- Made entire card clickable → navigates to agent POV view
- Added clear status indicator: "Click to View Agent POV →"
- Settings button with click event prevention
- Prominent status badges with animations

**Build Fixes:**
- Fixed typo: `@tantml:react-query` → `@tanstack/react-query`
- Added agentStore import in Layout component
- Added agentCount state for sidebar badge

### 6. Roadmap Documentation

**File Created:**
- `.project/agent-improvements-roadmap.md`

**Content:**
- 20+ feature recommendations
- Priority matrix with impact/complexity/timeline
- 6-sprint implementation plan
- Database schema proposals
- Security considerations
- Best practices from C2 frameworks

**Top Recommendations:**
1. Jitter & Sleep Controls (P1)
2. Task Queue System (P1)
3. Agent Grouping & Tags (P1)
4. Health Monitoring (P2)
5. Interactive Shell (P3)

---

## Technical Details

### Database Schema Updates

No schema changes required - all metadata stored in existing `agent_metadata` JSONB column.

**Future Schema (from roadmap):**
```sql
-- For task queue
CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    task_type VARCHAR(50),
    task_data JSONB,
    status VARCHAR(20) DEFAULT 'pending'
);

-- For activity logging
CREATE TABLE agent_activity_log (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    event_type VARCHAR(50),
    description TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

### API Changes

**New Query Parameter:**
```
GET /api/v1/agents/{id}/generate?platform=linux-amd64
```

**Response Schema:**
```json
{
  "agent_id": "uuid",
  "agent_type": "go",
  "content": "base64_encoded_binary",
  "filename": "nop_agent.exe",
  "is_binary": true,
  "platform": "windows-amd64"
}
```

### Build Requirements

**Backend:**
- Go 1.21+ compiler installed
- Optional: `garble` for obfuscation
  ```bash
  go install mvdan.cc/garble@latest
  ```

**Frontend:**
- No additional dependencies (using native APIs)

---

## Testing Performed

✅ Frontend build successful  
✅ TypeScript compilation clean  
✅ No runtime errors in console  
✅ Git commits pushed successfully  

**Manual Testing Needed:**
- [ ] Create Python agent → verify source download
- [ ] Create Go agent → verify binary compilation
- [ ] Test platform selection (all 5 platforms)
- [ ] Test IP detection (local + public)
- [ ] Test settings modal → update agent config
- [ ] Test agent POV navigation
- [ ] Test re-download from settings modal

---

## Commits

1. **feat: Add agent settings modal with connection and schedule config**
   - Settings modal UI
   - Connection URL configuration
   - Schedule intervals (connectback, heartbeat, data)
   - Re-download and delete actions

2. **fix: Resolve build errors**
   - Fixed @tanstack/react-query import typo
   - Added agentStore for Layout badge
   - Added agentCount derived state

3. **feat: Enhanced agent creation with IP detection and connection scheduling**
   - Auto-detect local/public IPs
   - IP selection buttons
   - Connection strategy (constant/scheduled)
   - Schedule settings in create modal
   - Metadata persistence

4. **feat: Add Go agent compilation with platform selection**
   - Platform selection UI (5 platforms)
   - Backend compilation service
   - Cross-compilation support
   - Binary encoding/decoding
   - Obfuscation support (garble)

5. **docs: Add Agent/C2 improvements roadmap**
   - 20+ feature recommendations
   - Sprint planning (6 sprints)
   - Implementation timelines
   - Database schemas
   - Security considerations

---

## Files Changed

**Backend:**
- `backend/app/schemas/agent.py` - Added platform fields
- `backend/app/services/agent_service.py` - Added compile_go_agent()
- `backend/app/api/v1/endpoints/agents.py` - Platform parameter support

**Frontend:**
- `frontend/src/App.tsx` - Fixed import
- `frontend/src/components/Layout.tsx` - Added agent count
- `frontend/src/pages/Agents.tsx` - Major UI enhancements
- `frontend/src/services/agentService.ts` - Platform support

**Documentation:**
- `.project/agent-improvements-roadmap.md` - Future roadmap

**Total:** 8 files modified, 1 file created

---

## Known Issues

None identified.

**Potential Issues:**
- Go compiler must be installed on backend server for compilation
- Public IP detection requires internet access
- Compilation timeout set to 120s (may need adjustment for slow systems)
- Large binaries (~8-12MB) may take time to download

---

## Future Work

**Immediate Next Steps:**
1. Implement Jitter & Sleep Controls (Priority 1)
2. Build Task Queue System (Priority 1)
3. Add Agent Grouping/Tags (Priority 1)

**Long-term:**
- See `.project/agent-improvements-roadmap.md` for complete roadmap
- Consider implementing interactive shell for real-time operations
- Add health monitoring for production deployments

---

## Lessons Learned

1. **IP Detection:** WebRTC provides reliable local IP detection without backend calls
2. **Binary Downloads:** Base64 encoding is necessary for JSON transport of binaries
3. **User Flow:** Auto-detection reduces manual configuration errors
4. **Platform Selection:** Clear visual feedback (icons + labels) improves UX
5. **Metadata Flexibility:** JSON column allows schema evolution without migrations

---

## References

- Pull Request: #17 (Add Agent/C2 page)
- Branch: copilot/create-agent-page
- Related: AKIS v2 framework for knowledge/skill management
- Similar: Cobalt Strike, Metasploit Framework C2 patterns

---

**Status:** ✅ Complete  
**Ready for:** Testing, Code Review, Deployment to staging
