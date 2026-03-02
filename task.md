# NOP Enhancement Task

## Context
Read CLAUDE.md first (or create one with AKIS gates for FastAPI+React/TypeScript if missing).

## Implementation Tasks

### 1) CHAT TAB
**Backend:**
- Add POST /api/v1/ai/chat to NOP backend
- Proxy to https://10.10.10.101:28790/v1/messages
- Body: {model: claude-sonnet-4-6, messages: [{role: user, content: message}], max_tokens: 1024}
- SSL verify=False, httpx async

**Frontend:**
- Create frontend/src/pages/Chat.tsx
- Full chat page, Falke aesthetic (#ff0040 on #0a0a0a, monospace, no border-radius)
- Message thread + input
- Sends to /api/v1/ai/chat
- Add Chat to navigation in Layout.tsx

### 2) ROUTING SECTION
**Backend:**
- Add GET /api/v1/routes
- SSH into CT100-107 (subprocess, StrictHostKeyChecking=no, timeout=3s)
- Run ip route show
- Return: [{host, routes: [{dest, gateway, iface}]}]
- Cache 30s

**Frontend:**
- Add Routes collapsible section to Traffic.tsx
- Table per CT, Falke style
- Auto-refresh 60s

### 3) STORM ENHANCEMENTS
Look at existing Storm.tsx first.

**Backend endpoints:**
- POST /api/v1/storm/ping {target, count: 10} - runs ping, returns {min, avg, max, loss%}
- POST /api/v1/storm/traceroute {target} - returns hops
- POST /api/v1/storm/portscan {target, ports: [22,80,443,8080,8443]} - TCP connect

**Frontend:**
- Add UI panels to Storm.tsx for each

### 4) Build
```bash
cd /root/dev/NOP && npm run build --prefix frontend 2>&1 | tail -20
```

### 5) Commit
```bash
git add . && git commit -m "feat: chat-tab-routing-storm-enhancements"
```
