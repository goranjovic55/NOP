---
title: Agent Testing Guide
type: guide
category: testing
last_updated: 2026-01-14
---

# Agent Testing Guide

## Test Host Ready!

Container `nop-agent-test` is running and ready to test Python agents.

**Network Info:**
- NOP Internal: `172.28.0.100`
- Test Network: `172.21.0.100`  
- Backend: `http://172.28.0.1:8000` (via gateway)
- Python: `3.10.12`

---

## 📝 Step-by-Step Testing

### Step 1: Create Agent in UI

1. Open http://localhost:12000/agents
2. Click **"+ Create Agent"**
3. Fill in the form:
   ```
   Name: Test Agent 1
   Description: Testing agent on isolated host
   Type: Python 🐍
   Connection URL: Use "Local IP" button (ws://YOUR_IP:12001/...)
   Modules: Check all (Asset, Traffic, Host, Access)
   ```
4. Click **"Create Agent"**
5. **Expected:** Agent file should download automatically to your computer
6. **Also note:** Copy the "Download Link" token from the agent card

### Step 2: Access Test Host

```bash
docker exec -it nop-agent-test bash
```

You should see:
```
root@agent-test:/opt/agent#
```

### Step 3: Download Agent to Test Host

Inside the container:

```bash
cd /opt/agents
./download-agent.sh <YOUR_DOWNLOAD_TOKEN>
```

**Example:**
```bash
# If download link is: http://localhost:12000/api/v1/agents/download/abc123def456...
# Use token: abc123def456...

./download-agent.sh abc123def456...
```

**Expected output:**
```
=== NOP Agent Downloader ===
Server: http://172.28.0.1:8000
Token: abc123def456...

[+] Downloading agent...
[+] Agent downloaded successfully to /opt/agents/agent.py
[+] Agent info:
[... agent metadata ...]

[+] To run the agent:
    python3 /opt/agents/agent.py
```

### Step 4: Run the Agent

```bash
python3 /opt/agents/agent.py
```

**Expected behavior:**
- Agent starts and attempts to connect
- You should see connection logs
- Agent sends heartbeat every 30 seconds

**Run in background:**
```bash
nohup python3 /opt/agents/agent.py > /opt/agents/agent.log 2>&1 &
```

**Check logs:**
```bash
tail -f /opt/agents/agent.log
```

### Step 5: Verify in UI

Go back to http://localhost:12000/agents

**Expected changes:**
- Agent status: **OFFLINE** → **CONNECTED** 
- Status indicator: **Gray** → **Green pulsing**
- Last Seen: Updates every 30 seconds

### Step 6: Test Agent POV (Point of View)

1. Click on the agent card
2. You should be redirected to Dashboard
3. Purple banner appears: **"Agent POV Active"**
4. All data now shows from agent's perspective

---

## 🔧 Troubleshooting

### Agent won't download
```bash
# Test backend connectivity
curl http://172.28.0.1:8000/docs

# If that fails, check backend is running
docker-compose -f docker-compose.dev.yml ps backend
```

### Agent won't connect
```bash
# Check agent logs
tail -f /opt/agents/agent.log

# Verify WebSocket URL in agent code
grep "ws://" /opt/agents/agent.py

# Test WebSocket connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  http://172.28.0.1:12001/api/v1/agents/YOUR_AGENT_ID/connect
```

### Stop the agent
```bash
# Find process
ps aux | grep agent.py

# Kill it
pkill -f agent.py

# Or if running in background
jobs
kill %1
```

---

## 🧹 Cleanup

```bash
# Exit container
exit

# Stop test host
docker-compose stop agent-test

# Remove test host
docker-compose rm -f agent-test
```

---

## 📊 Quick Commands Reference

| Action | Command |
|--------|---------|
| Access host | `docker exec -it nop-agent-test bash` |
| Download agent | `./download-agent.sh <token>` |
| Run agent | `python3 /opt/agents/agent.py` |
| Run in background | `nohup python3 /opt/agents/agent.py > agent.log 2>&1 &` |
| View logs | `tail -f /opt/agents/agent.log` |
| Stop agent | `pkill -f agent.py` |
| List files | `ls -la /opt/agents/` |

---

## 🎯 Next Steps

After successful agent connection:

1. Test **Asset Discovery**: Agent should report network devices it can see
2. Test **Traffic Monitoring**: Check if agent captures network traffic
3. Test **Host Information**: Verify system info is reported
4. Test **Access Module**: Try executing commands through agent
5. Test **POV Switching**: Switch between multiple agents

**Happy Testing!** 🚀
