# Feature Proposals - NOP

This document contains proposed features for the Network Operations Platform that are under consideration for future implementation.

**Status:** Proposal - Awaiting Approval  
**Date:** December 26, 2025

---

## Table of Contents

- [Credential Vault](#credential-vault)
- [Recent Access Widget](#recent-access-widget)

---

## Credential Vault

### Overview
Secure password manager integrated into the Access Hub, providing encrypted storage and quick access to frequently used credentials.

### Visual Design

#### Vault Locked State
```
┌─────────────────────────────────────────┬─────────────────────────┐
│ Access Hub    [New Connection] [🔑 Vault]│                         │
├─────────────────────────────────────────┤  ┌───────────────────┐  │
│                                         │  │   VAULT LOCKED    │  │
│  [Active Connection Tabs]               │  │                   │  │
├─────────────────────────────────────────┤  │   🔒              │  │
│                                         │  │                   │  │
│  Connection Display Area                │  │ Enter Password:   │  │
│                                         │  │ [_______________] │  │
│                                         │  │                   │  │
│                                         │  │  [Unlock Vault]   │  │
└─────────────────────────────────────────┴─────────────────────────┘
```

#### Vault Unlocked State
```
┌─────────────────────────────────────────┬─────────────────────────┐
│ Access Hub    [New Connection] [🔑 Vault ✓]│ CREDENTIALS VAULT    │
├─────────────────────────────────────────┤ ┌─────────────────────┐ │
│                                         │ │ 🔍 Search...        │ │
│  [Active Connection Tabs]               │ └─────────────────────┘ │
├─────────────────────────────────────────┤                         │
│                                         │ ╔═══════════════════╗ │
│  Connection Display Area                │ ║ 192.168.1.10      ║ │
│                                         │ ║ SSH • admin       ║ │
│                                         │ ║ [Connect Now →]   ║ │
│                                         │ ╚═══════════════════╝ │
│                                         │                       │
│                                         │ ╔═══════════════════╗ │
│                                         │ ║ test-vnc          ║ │
│                                         │ ║ VNC • user123     ║ │
│                                         │ ║ [Connect Now →]   ║ │
│                                         │ ╚═══════════════════╝ │
│                                         │                       │
│                                         │     [Lock Vault]      │
└─────────────────────────────────────────┴─────────────────────────┘
```

### Component Specifications

#### 1. Vault Button
- **Location:** Top-right of Access Hub, next to "New Connection"
- **States:**
  - 🔑 Vault (Locked) - Grey border
  - 🔑 Vault ✓ (Unlocked) - Green border with glow
- **Behavior:** Toggle right sidebar

#### 2. Right Sidebar (Vault Panel)
- **Width:** 300px (fixed)
- **Background:** `bg-cyber-darker`
- **Border:** `border-l border-cyber-blue` (when unlocked)
- **Animation:** Slide in/out from right

#### 3. Password Protection
- **Method:** Re-verify using existing session password
- **Timeout:** Auto-lock after 5 minutes of inactivity
- **Visual:** Minimalist lock screen overlay

#### 4. Credential Card
```
╔═════════════════════════════════╗
║ 192.168.1.10                    ║  ← Host/Hostname (text-cyber-blue)
║ SSH • admin                     ║  ← Protocol • Username (text-gray)
║ [Connect Now →]                 ║  ← Action button
╚═════════════════════════════════╝
```

**Features:**
- **Hover Effect:** Border color changes to protocol color
- **Click Behavior:** Automatically opens new tab with pre-filled credentials
- **Protocol Colors:** SSH=green, VNC=purple, RDP=blue, etc.

#### 5. Search Functionality
- **Filter by:** IP, hostname, username, protocol
- **Real-time filtering**
- **Placeholder:** "🔍 Search credentials..."

### Security Implementation

#### Password Verification Flow
```
User clicks "Vault" → Check if unlocked in session
                      ↓
                    No → Show password prompt
                      ↓
                    Enter password → Verify against user's login credentials
                      ↓
                    Valid? → Unlock vault for 5 minutes
                      ↓
                    Invalid → Show error, allow retry (max 3 attempts)
```

#### Session Management
- **Vault Unlock State:** Stored in frontend state (Zustand)
- **Auto-lock:** 5 minutes of inactivity
- **Lock triggers:**
  - Manual lock button
  - Tab/window focus lost > 5 minutes
  - User navigates away from Access Hub
  - Session timeout

#### Credential Storage
- **Backend:** Encrypted credentials stored in PostgreSQL
- **Encryption:** AES-256 encryption using user's password hash as key
- **Access Log:** Every credential retrieval logged with timestamp

### API Endpoints
```
GET  /api/v1/credentials/vault           - List stored credentials (requires unlock)
POST /api/v1/credentials/vault/unlock    - Verify password & create vault session
POST /api/v1/credentials/vault/lock      - Lock vault session
POST /api/v1/credentials/connect         - Quick connect with credential ID
```

### Response Format
```json
{
  "unlocked": true,
  "expires_at": "2025-12-26T10:35:00Z",
  "credentials": [
    {
      "id": 1,
      "host": "192.168.1.10",
      "hostname": "ssh-server",
      "protocol": "ssh",
      "username": "admin",
      "port": 22,
      "last_used": "2025-12-26T10:28:00Z",
      "use_count": 47
    }
  ]
}
```

### Database Schema Addition
```sql
-- Track vault unlocks
CREATE TABLE vault_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    unlocked_at TIMESTAMP DEFAULT NOW(),
    locked_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);
```

---

## Recent Access Widget

### Overview
Dashboard widget displaying frequently used assets for quick access, showing the top 3 most accessed connections with usage statistics.

### Visual Design

```
Dashboard Page:
┌────────────────────────────────────────────────────────────────────┐
│  [Total Assets: 45] [Online: 32] [Active Scans: 2] [Connections: 5]│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ╔══════════════════════════════════════════════════════════════╗ │
│  ║  ⇄ RECENT ACCESS • Quick Connect to Frequently Used Assets  ║ │
│  ╠══════════════════════════════════════════════════════════════╣ │
│  ║                                                              ║ │
│  ║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      ║ │
│  ║  │ 192.168.1.10 │  │ test-vnc     │  │ 172.19.0.5   │      ║ │
│  ║  │ SSH Server   │  │ VNC Desktop  │  │ RDP Windows  │      ║ │
│  ║  │ • admin      │  │ • user123    │  │ • admin      │      ║ │
│  ║  │              │  │              │  │              │      ║ │
│  ║  │ Last: 2m ago │  │ Last: 15m ago│  │ Last: 1h ago │      ║ │
│  ║  │ Uses: 47     │  │ Uses: 32     │  │ Uses: 18     │      ║ │
│  ║  │              │  │              │  │              │      ║ │
│  ║  │[Quick Connect]│ │[Quick Connect]│ │[Quick Connect]│      ║ │
│  ║  └──────────────┘  └──────────────┘  └──────────────┘      ║ │
│  ║                                                              ║ │
│  ║                                                [View All →]  ║ │
│  ╚══════════════════════════════════════════════════════════════╝ │
│                                                                    │
│  [Traffic Chart]                    [Asset Distribution]          │
└────────────────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 1. Widget Container
- **Position:** Top of dashboard, below stats cards, before charts
- **Width:** Full width
- **Height:** Auto (min 200px)
- **Border:** `border-cyber-purple` with glow effect
- **Title:** "⇄ RECENT ACCESS" with cyber-red glow

#### 2. Asset Access Card
```
┌──────────────────────┐
│ 192.168.1.10         │ ← IP/Hostname (text-lg, text-cyber-blue)
│ SSH Server           │ ← Asset Description (text-sm, text-gray)
│ • admin              │ ← Username (text-xs, text-cyber-green)
│                      │
│ Last: 2m ago         │ ← Last accessed (text-xs, text-purple)
│ Uses: 47             │ ← Access count (text-xs, text-gray)
│                      │
│ [Quick Connect]      │ ← Action button
└──────────────────────┘
```

**Card Style:**
- Background: `bg-cyber-darker`
- Border: `border-cyber-gray`
- Hover: `border-cyber-blue` with shadow
- Protocol indicator: Color-coded dot (SSH=green, VNC=purple, RDP=blue)

#### 3. Display Rules
- **Show Top 3** most accessed assets (or most recent if < 10 total accesses)
- **Horizontal scroll** on mobile
- **Responsive:** Stack vertically on small screens
- **Empty State:** "No recent connections yet. Start by accessing assets from the Access Hub."

#### 4. Quick Connect Behavior
- **Click:** Redirects to Access Hub with auto-opened connection
- **No password prompt:** Uses stored credentials from vault
- **Loading state:** Button shows "Connecting..." with spinner

#### 5. "View All" Link
- Opens full history modal/page
- Shows last 20 connections with timestamps
- Filterable by date range, protocol, asset

### API Endpoints
```
GET /api/v1/access/recent     - Get top 3 recent/frequent accesses
GET /api/v1/access/history    - Get full access history (paginated)
```

### Response Format
```json
{
  "recent_accesses": [
    {
      "id": 1,
      "asset_ip": "192.168.1.10",
      "asset_hostname": "ssh-server",
      "protocol": "ssh",
      "username": "admin",
      "last_accessed": "2025-12-26T10:28:00Z",
      "access_count": 47,
      "description": "SSH Server"
    }
  ]
}
```

### Database Schema Addition
```sql
-- Add to existing assets table
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_access_logs_user_time ON access_logs(user_id, timestamp DESC);
```

---

## Visual Design Elements

### Color Scheme
| Element | Color | Usage |
|---------|-------|-------|
| Vault Locked | `text-cyber-gray` | Button when locked |
| Vault Unlocked | `text-cyber-green` + glow | Button when unlocked |
| Credential Card Border | `border-cyber-blue` (hover) | Interactive state |
| Recent Access Widget | `border-cyber-purple` | Widget container |
| Protocol Indicators | Protocol-specific | SSH=green, VNC=purple, RDP=blue |

### Typography
- **Vault Title:** `text-xs uppercase tracking-wider`
- **Host/IP:** `text-lg font-bold text-cyber-blue`
- **Username:** `text-sm text-cyber-green font-terminal`
- **Timestamps:** `text-xs text-cyber-gray-light font-terminal`

### Animations
- **Sidebar slide:** 300ms ease-in-out
- **Card hover:** Border glow transition 200ms
- **Lock/Unlock:** Fade + scale effect 250ms
- **Pulse:** Auto-lock warning at 4:30 remaining

---

## Implementation Phases

### Phase 1: Backend Foundation
- [ ] Create vault session management
- [ ] Add credential retrieval endpoints
- [ ] Implement password re-verification
- [ ] Add access logging/tracking
- [ ] Create recent access aggregation

### Phase 2: Frontend - Vault
- [ ] Create VaultSidebar component
- [ ] Implement password unlock modal
- [ ] Build credential list view
- [ ] Add search/filter functionality
- [ ] Implement quick connect action

### Phase 3: Frontend - Recent Access
- [ ] Create RecentAccessWidget component
- [ ] Build access card component
- [ ] Implement quick connect from dashboard
- [ ] Add responsive layout
- [ ] Create "View All" modal/page

### Phase 4: Polish & Security
- [ ] Add auto-lock timer with warning
- [ ] Implement access audit logging
- [ ] Add loading states and error handling
- [ ] Test security flows
- [ ] Add animations and transitions

---

## Success Criteria

### User Experience
- [ ] User can unlock vault with existing password
- [ ] User can search and filter credentials quickly
- [ ] One-click connect from vault to any stored credential
- [ ] Dashboard shows 3 most relevant recent accesses
- [ ] Quick connect from dashboard works seamlessly

### Security
- [ ] Vault auto-locks after 5 minutes
- [ ] Password verification required on unlock
- [ ] All credential access logged
- [ ] Credentials encrypted at rest
- [ ] Session-based vault unlock (not persistent)

### Performance
- [ ] Vault sidebar opens < 300ms
- [ ] Search filters < 100ms
- [ ] Recent access widget loads < 500ms
- [ ] Quick connect establishes connection < 2s

---

## Open Questions

1. **Vault timeout duration:** 5 minutes good, or should it be configurable?
2. **Recent access algorithm:** Most frequent vs. most recent? (Proposal: Most frequent with recency weight)
3. **Max credentials shown:** Should there be a limit in vault list?
4. **Mobile experience:** Should vault be a modal on mobile instead of sidebar?
5. **Password retry limit:** Lock after 3 failed attempts for how long?
6. **Export credentials:** Should users be able to export their vault (encrypted)?

---

## Next Steps

**Review and provide feedback on:**
1. Overall design and layout
2. Security implementation (password re-verification, timeout)
3. Recent access algorithm (frequent vs. recent)
4. Color scheme and visual hierarchy
5. Any missing features or edge cases

**Once approved:**
1. Start with backend API implementation
2. Create frontend components
3. Integrate with existing stores (authStore, accessStore)
4. Add comprehensive error handling
5. Test all security flows
