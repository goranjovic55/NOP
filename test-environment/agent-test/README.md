# Agent Test Host

This container is for testing NOP agents in a controlled environment.

## Features
- Python 3.10+ with common libraries
- Network tools (curl, wget, ping, etc.)
- Connected to both test-network (172.21.0.100) and nop-internal (172.28.0.100)

## IP Addresses
- Test Network: `172.21.0.100`
- NOP Internal: `172.28.0.100`

## Quick Start

1. **Build and start the test host:**
   ```bash
   cd /workspaces/NOP/test-environment
   docker-compose up -d agent-test
   ```

2. **Access the test host:**
   ```bash
   docker exec -it nop-agent-test bash
   ```

3. **Download an agent:**
   - Create an agent in the NOP UI (Agents page)
   - Copy the download token from the agent card
   - In the container:
     ```bash
     cd /opt/agents
     ./download-agent.sh <download_token>
     ```

4. **Run the agent:**
   ```bash
   python3 /opt/agents/agent.py
   ```

   Or in background:
   ```bash
   nohup python3 /opt/agents/agent.py > /opt/agents/agent.log 2>&1 &
   ```

5. **Check logs:**
   ```bash
   tail -f /opt/agents/agent.log
   ```

6. **Stop the agent:**
   ```bash
   pkill -f agent.py
   ```

## Manual Download (Alternative)

If the script doesn't work, download manually:

```bash
# Get token from UI, then:
curl -o /opt/agents/agent.py http://172.28.0.4:8000/api/v1/agents/download/<TOKEN>
chmod +x /opt/agents/agent.py
python3 /opt/agents/agent.py
```

## Verify Agent Connection

Once running, check the NOP UI Agents page. The agent status should change from "offline" to "online" with a green indicator.
