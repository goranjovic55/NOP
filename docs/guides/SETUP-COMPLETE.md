---
title: Test Environment Setup
type: guide
category: setup
last_updated: 2026-01-14
---

# Agent Test Environment - Summary

## What's Been Set Up

### 1. Test Host Container
- **Name**: `nop-agent-test`
- **Status**: Running
- **Image**: Ubuntu 22.04 with Python 3.10.12
- **Networks**: 
  - NOP Internal: `172.28.0.100`
  - Test Network: `172.21.0.100`

### 2. Pre-installed Tools
- Python 3.10.12
- Python packages: requests, websockets, aiohttp, psutil
- Network tools: curl, wget, ping, etc.

### 3. Helper Scripts
- `/opt/agents/download-agent.sh` - Downloads agents from NOP backend
- Mounted volume: `./agent-test/agents` → `/opt/agents`

---

## 🚀 How to Test Python Agent

### Quick Steps

1. **Create agent in NOP UI**
   ```
   http://localhost:12000/agents
   Click: "+ Create Agent"
   Name: Test Agent 1
   Type: Python
   Use "Local IP" for connection URL
   ```

2. **Get download token**
   - Look at agent card → "Download Link"
   - Copy token (last part after `/download/`)

3. **Access test host**
   ```bash
   docker exec -it nop-agent-test bash
   ```

4. **Download agent**
   ```bash
   cd /opt/agents
   ./download-agent.sh <YOUR_TOKEN_HERE>
   ```

5. **Run agent**
   ```bash
   python3 /opt/agents/agent.py
   ```

6. **Verify**
   - Check UI: Agent status → CONNECTED (green)

---

## 📁 File Structure

```
test-environment/
├── agent-test/
│   ├── Dockerfile              # Ubuntu + Python setup
│   ├── download-agent.sh       # Helper script
│   ├── agents/                 # Volume mount for agents
│   └── README.md
├── docker-compose.yml          # Added agent-test service
├── AGENT-TESTING-GUIDE.md      # Full testing guide
└── TEST-AGENT.sh               # Quick reference script
```

---

## 🔗 Important URLs

- **NOP UI**: http://localhost:12000
- **Agents Page**: http://localhost:12000/agents
- **Backend API**: http://localhost:8000 (from host)
- **Backend API** (from container): http://172.28.0.1:8000

---

## 📋 Common Commands

```bash
# Access test host
docker exec -it nop-agent-test bash

# Check running agents
ps aux | grep agent.py

# Stop agent
pkill -f agent.py

# View logs (if running in background)
tail -f /opt/agents/agent.log

# Test backend connectivity
curl http://172.28.0.1:8000/docs
```

---

## 🐛 If Agent Download Doesn't Work

The issue you encountered (agent file not downloading in browser) is because the frontend expects a specific response format. The workaround is to use the download token method:

1. Create agent in UI (it will create the agent record even if download fails)
2. Get token from agent card
3. Use `download-agent.sh` script in test container
4. Or download manually: `curl -o agent.py http://172.28.0.1:8000/api/v1/agents/download/<TOKEN>`

---

## 🎯 What's Next

After successful connection:
- Test multi-agent deployment
- Test POV (Point of View) switching
- Test agent data collection (assets, traffic, etc.)
- Test agent persistence and reconnection

---

**All systems ready! Start testing! 🚀**

See [AGENT-TESTING-GUIDE.md](./AGENT-TESTING-GUIDE.md) for detailed instructions.
