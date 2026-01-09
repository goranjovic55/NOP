# Agent/C2 Framework - Future Improvements Roadmap

**Generated:** 2026-01-03  
**Context:** Post-initial implementation of Agent/C2 system with POV switching, encryption, and platform compilation

---

## 🎯 Priority 1: Core Operational Enhancements

### 1.1 Jitter & Sleep Controls
**Impact:** High | **Complexity:** Low | **Timeline:** 1-2 days

**Description:**
Add randomization and scheduling to agent communication patterns to evade detection.

**Implementation:**
- Jitter percentage setting (e.g., 20% = interval varies ±6s for 30s base)
- Daily schedule: Active hours (e.g., 9am-5pm only)
- Manual sleep/wake commands from UI
- Weekend/holiday modes

**Database Changes:**
```sql
ALTER TABLE agents ADD COLUMN jitter_percent INTEGER DEFAULT 20;
ALTER TABLE agents ADD COLUMN active_hours JSONB DEFAULT '{"start": "00:00", "end": "23:59"}';
ALTER TABLE agents ADD COLUMN is_sleeping BOOLEAN DEFAULT false;
```

**UI Changes:**
- Schedule settings in create/edit modals
- Sleep/Wake buttons on agent cards
- Visual indicator when agent is sleeping

**Agent Code:**
```python
import random
actual_interval = base_interval * (1 + random.uniform(-jitter, jitter))
if not is_within_active_hours():
    sleep_until_active_time()
```

**Why:** SOC teams detect perfectly regular beacons. Jitter makes traffic blend with normal activity.

---

### 1.2 Task Queue System
**Impact:** High | **Complexity:** Medium | **Timeline:** 3-5 days

**Description:**
Queue tasks for offline agents. Tasks execute when agent reconnects.

**Database Schema:**
```sql
CREATE TABLE agent_tasks (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL,  -- 'screenshot', 'command', 'download', etc.
    task_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending/running/completed/failed
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB,
    error TEXT
);
```

**Features:**
- Queue tasks from UI while agent offline
- Priority levels (high/normal/low)
- Task dependencies (run task B after task A completes)
- Timeout/expiration for stale tasks
- Retry logic for failed tasks

**UI Components:**
- Task queue tab in agent POV view
- "Add Task" button with task type dropdown
- Task status timeline
- Results viewer

**Why:** Core C2 functionality. Operators can't wait for agents to come online.

---

### 1.3 Agent Grouping & Tags
**Impact:** High | **Complexity:** Low | **Timeline:** 2-3 days

**Description:**
Organize agents with tags and groups for bulk operations.

**Database Changes:**
```sql
ALTER TABLE agents ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE agents ADD COLUMN group_name VARCHAR(100);
```

**Features:**
- Multi-select tags: environment (prod/dev), department, criticality
- Group-based filtering
- Bulk operations: "Update all agents in 'Finance' group"
- Tag-based access control (future: user permissions)

**UI:**
- Tag selector (multi-select chips)
- Group dropdown in create modal
- Filter by tags/groups in agents list
- Bulk action toolbar when multiple selected

**Why:** Essential for managing 50+ agents. "Update all production agents" vs clicking 50 times.

---

## 🚀 Priority 2: Monitoring & Visibility

### 2.1 Agent Health Monitoring
**Impact:** Medium | **Complexity:** Medium | **Timeline:** 3-4 days

**Description:**
Real-time health metrics from each agent.

**Metrics to Collect:**
- Network latency (C2 ping time)
- CPU usage %
- RAM usage (used/total)
- Disk space available
- Active network connections
- Last error message
- Connection quality (packet loss)

**Agent Reporting:**
```json
{
  "type": "health_report",
  "data": {
    "latency_ms": 45,
    "cpu_percent": 23.5,
    "memory_percent": 67.2,
    "disk_free_gb": 124.5,
    "connections_active": 8,
    "last_error": null
  }
}
```

**UI:**
- Mini health dashboard on each agent card
- Color-coded indicators: 🟢 Good / 🟡 Warning / 🔴 Critical
- Health trends graph
- Alert thresholds (notify if CPU > 80%)

**Why:** Know if agent is about to crash/be discovered before you lose access.

---

### 2.2 Agent Notes & Activity Timeline
**Impact:** Medium | **Complexity:** Low | **Timeline:** 2 days

**Description:**
Document operations and track agent history.

**Database:**
```sql
ALTER TABLE agents ADD COLUMN notes TEXT;

CREATE TABLE agent_activity_log (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    event_type VARCHAR(50),
    description TEXT,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- Free-text notes field (markdown supported)
- Auto-logged events: created, connected, disconnected, task_completed
- Manual log entries
- Timeline view with filtering

**UI:**
- Notes section in settings modal
- Activity timeline tab in POV view
- "Add log entry" button

**Why:** Operations documentation. "What did we do with this agent last week?"

---

### 2.3 Search & Advanced Filtering
**Impact:** Medium | **Complexity:** Low | **Timeline:** 1-2 days

**Description:**
Find agents quickly in large deployments.

**Search Fields:**
- Agent name
- Description
- IP address (from metadata)
- Hostname (from host data)
- Tags
- Notes

**Filters:**
- Status: online/offline/error/disconnected
- Last seen: <1h, <6h, <24h, <7d, >7d
- Agent type: Python/Go
- Platform: Windows/Linux/macOS
- Group
- Has pending tasks

**UI:**
- Search bar at top of agents page
- Filter dropdown with checkboxes
- "Clear filters" button
- Results count

---

## 💡 Priority 3: Advanced Features

### 3.1 Self-Destruct / Kill Switch
**Impact:** High | **Complexity:** Medium | **Timeline:** 2-3 days

**Features:**
- Auto-destruct after N failed reconnect attempts
- Manual kill switch command from UI
- Cleanup actions: delete logs, remove registry keys, uninstall service
- Secure wipe of agent binary
- Tamper detection (agent checks file hash)

**Trigger Conditions:**
- Max failed connections exceeded
- Manual operator command
- Specific file/registry key detected (canary)
- Date/time threshold passed

**Why:** OpSec. Don't leave agents behind for forensics team.

---

### 3.2 Communication Profiles
**Impact:** Medium | **Complexity:** Medium | **Timeline:** 2-3 days

**Preset Profiles:**

1. **Stealth Mode**
   - Interval: 300s (5min)
   - Jitter: 50%
   - Data collection: Minimal
   - Active hours: Business hours only

2. **Aggressive Mode**
   - Interval: 15s
   - Jitter: 10%
   - All modules enabled
   - 24/7 operation

3. **Maintenance Mode**
   - Heartbeat only
   - No data collection
   - Check-in: 1h intervals

4. **Exfiltration Mode**
   - High bandwidth
   - Rapid data transfer
   - Compression enabled
   - Short intervals (10s)

**UI:**
- Profile selector in create/settings
- "Switch to Stealth" quick button
- Custom profile creation
- Profile templates

---

### 3.3 Interactive Shell / Terminal
**Impact:** High | **Complexity:** Medium | **Timeline:** 4-5 days

**Description:**
Web-based terminal for real-time command execution.

**Features:**
- WebSocket-based shell
- Command history
- Tab completion
- File upload/download
- Multi-tab support (multiple shells per agent)

**Security:**
- Audit log of all commands
- Command whitelisting/blacklisting
- Session timeout
- TLS encryption

**Why:** Fast troubleshooting. No waiting for task queue.

---

### 3.4 Geo-location Visualization
**Impact:** Low | **Complexity:** Medium | **Timeline:** 3-4 days

**Features:**
- Auto-detect country/city from IP (GeoIP database)
- Interactive map view (Leaflet.js)
- Click marker → agent details popup
- Color-coded by status
- Cluster markers for nearby agents

**Data Sources:**
- MaxMind GeoLite2 database
- Agent-reported timezone
- IP geolocation APIs

---

## 🎨 Priority 4: User Experience

### 4.1 Agent Cloning & Templates
**Impact:** Medium | **Complexity:** Low | **Timeline:** 1 day

**Features:**
- "Clone Agent" button → duplicate config, new keys
- "Save as Template" → store config for reuse
- Template library
- Import/export templates (JSON)

---

### 4.2 Batch Operations
**Impact:** Medium | **Complexity:** Low | **Timeline:** 1-2 days

**Features:**
- Multi-select checkboxes
- Bulk actions toolbar:
  - Update settings
  - Delete
  - Change group
  - Add/remove tags
  - Queue task for all
- "Select all" / "Select filtered"

---

### 4.3 Stats Dashboard
**Impact:** Low | **Complexity:** Low | **Timeline:** 1 day

**Metrics:**
- Total agents count
- Online/offline ratio
- Data collected today (GB)
- Average uptime %
- Most active agent
- Top 5 target networks

**UI:**
- Dashboard widget on main agents page
- Trend graphs (7-day history)
- Export to CSV/PDF

---

## 🔐 Priority 5: Security & Stealth

### 5.1 Anti-Analysis Features
**Impact:** High | **Complexity:** Medium | **Timeline:** 3-4 days

**Features:**
- VM/Sandbox detection (refuse to run if detected)
- Debugger detection (terminate if attached)
- Domain reputation check (don't connect to flagged domains)
- Sleep before first connection (0-24h random delay)
- Time-bomb activation (only run after specific date)
- Canary token integration (alert if file opened)

**Detection Methods:**
- Check for VM artifacts (VMware tools, VBox drivers)
- Timing attacks (rdtsc)
- Registry/file checks
- Process name checks (procmon, wireshark)

---

### 5.2 Proxy/Tunneling Modes
**Impact:** High | **Complexity:** High | **Timeline:** 5-7 days

**Features:**
- SOCKS5 proxy through agent
- Port forwarding (expose internal service)
- Reverse tunnel (agent connects out, you connect in)
- VPN mode (full network routing)

**Use Cases:**
- Browse internal web apps
- RDP to domain controller through agent
- Access database on internal network

---

### 5.3 Peer-to-Peer Mesh Networking
**Impact:** High | **Complexity:** High | **Timeline:** 7-10 days

**Description:**
Agents relay through each other to reach C2.

**Architecture:**
```
C2 Server ← Agent A ← Agent B ← Agent C (no direct internet)
```

**Features:**
- Auto-discover peer agents on same network
- Dynamic routing (find best path to C2)
- Fallback paths if primary route fails
- Encrypted relay (end-to-end encryption)

**Why:** Useful when target network blocks outbound connections but allows internal communication.

---

### 5.4 Dead Drop C2
**Impact:** Medium | **Complexity:** High | **Timeline:** 5-7 days

**Description:**
Use cloud storage as communication channel instead of direct connection.

**Supported Services:**
- Dropbox
- OneDrive
- Google Drive
- AWS S3
- GitHub Gists

**Flow:**
1. Agent writes tasks.json to shared folder
2. C2 reads tasks.json, processes
3. C2 writes responses.json
4. Agent reads responses.json, executes

**Why:** Evades network monitoring. Traffic looks like normal cloud storage sync.

---

## 🧪 Priority 6: Advanced Modules

### 6.1 Credential Vault
**Impact:** High | **Complexity:** Medium | **Timeline:** 3-4 days

**Features:**
- Agents upload found credentials (browsers, registry, files)
- Deduplicated across all agents
- Searchable by username/domain/service
- Password cracking integration
- Export to formats (Hashcat, John)

**Database:**
```sql
CREATE TABLE credentials (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    credential_type VARCHAR(50),  -- password, hash, key, token
    username VARCHAR(255),
    password_hash TEXT,
    password_plaintext TEXT,
    domain VARCHAR(255),
    service VARCHAR(100),
    source TEXT,  -- chrome_cookies, registry, file_path
    discovered_at TIMESTAMP
);
```

---

### 6.2 Auto-Discovery Module
**Impact:** High | **Complexity:** Medium | **Timeline:** 4-5 days

**Features:**
- Agent scans local network (ARP, ping sweep)
- Port scanning (common services)
- Service fingerprinting
- Reports to C2 as potential targets
- Suggest lateral movement paths

**Integration:**
- Auto-create assets in NOP
- Vulnerability correlation
- Exploitation suggestions

---

### 6.3 Screenshot & Keylogger Modules
**Impact:** Medium | **Complexity:** Medium | **Timeline:** 3-4 days

**Features:**
- Periodic screenshots
- On-demand screenshot via task queue
- Keylogger with window title tracking
- Clipboard monitoring
- Screenshot on specific triggers (banking sites, etc.)

---

## 📊 Implementation Priority Matrix

| Feature | Impact | Complexity | Priority | Timeline |
|---------|--------|------------|----------|----------|
| Jitter & Sleep | High | Low | P1 | 1-2d |
| Task Queue | High | Medium | P1 | 3-5d |
| Tags & Groups | High | Low | P1 | 2-3d |
| Health Monitoring | Medium | Medium | P2 | 3-4d |
| Activity Timeline | Medium | Low | P2 | 2d |
| Search/Filter | Medium | Low | P2 | 1-2d |
| Self-Destruct | High | Medium | P3 | 2-3d |
| Communication Profiles | Medium | Medium | P3 | 2-3d |
| Interactive Shell | High | Medium | P3 | 4-5d |
| Agent Cloning | Medium | Low | P4 | 1d |
| Batch Operations | Medium | Low | P4 | 1-2d |
| Stats Dashboard | Low | Low | P4 | 1d |
| Anti-Analysis | High | Medium | P5 | 3-4d |
| Proxy Tunneling | High | High | P5 | 5-7d |
| P2P Mesh | High | High | P5 | 7-10d |
| Dead Drop C2 | Medium | High | P5 | 5-7d |
| Credential Vault | High | Medium | P6 | 3-4d |
| Auto-Discovery | High | Medium | P6 | 4-5d |

---

## 🎯 Recommended Sprints

### Sprint 1: Core Operations (1 week)
- Jitter & Sleep Controls
- Agent Grouping & Tags
- Search & Filtering

### Sprint 2: Task Management (1 week)
- Task Queue System
- Agent Notes & Timeline
- Agent Cloning

### Sprint 3: Monitoring (1 week)
- Health Monitoring
- Stats Dashboard
- Batch Operations

### Sprint 4: Advanced Comms (2 weeks)
- Communication Profiles
- Interactive Shell
- Self-Destruct

### Sprint 5: Security (2 weeks)
- Anti-Analysis Features
- Proxy/Tunneling
- Dead Drop C2

### Sprint 6: Intelligence (1 week)
- Credential Vault
- Auto-Discovery
- Screenshot Module

---

## 📝 Notes

**Dependencies:**
- Several features require backend task queue infrastructure
- Interactive shell needs WebSocket infrastructure enhancement
- P2P mesh requires agent-to-agent communication protocol

**Security Considerations:**
- All new features must maintain encryption
- Audit logging for sensitive operations
- Rate limiting on API endpoints
- Input validation on all task data

**Testing:**
- Each feature needs unit tests
- Integration tests with mock agents
- Security testing for new attack surface
- Performance testing with 100+ agents

**Documentation:**
- User guide updates
- API documentation
- Deployment guides
- Security best practices

---

**Last Updated:** 2026-01-03  
**Status:** Roadmap - Not Yet Implemented  
**Owner:** NOP Development Team
