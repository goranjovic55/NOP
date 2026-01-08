#!/bin/bash
# Agent Download and Test Script
# Usage: ./download-agent.sh <download_token>

set -e

DOWNLOAD_TOKEN="$1"
# Backend is on host network, accessible via gateway
NOP_SERVER="http://172.54.0.1:12001"  # Gateway to host network

if [ -z "$DOWNLOAD_TOKEN" ]; then
    echo "Usage: $0 <download_token>"
    echo ""
    echo "Get the download token from the Agents page in NOP UI"
    echo "Format: /api/v1/agents/download/<TOKEN>"
    exit 1
fi

echo "=== NOP Agent Downloader ==="
echo "Server: $NOP_SERVER"
echo "Token: $DOWNLOAD_TOKEN"
echo ""

# Download the agent
echo "[+] Downloading agent..."
DOWNLOAD_URL="${NOP_SERVER}/api/v1/agents/download/${DOWNLOAD_TOKEN}"
echo "    URL: $DOWNLOAD_URL"

# Download with curl
if curl -f -o /opt/agents/agent.py "$DOWNLOAD_URL" 2>/dev/null; then
    echo "[+] Agent downloaded successfully to /opt/agents/agent.py"
    
    # Make it executable
    chmod +x /opt/agents/agent.py
    
    # Show agent info
    echo ""
    echo "[+] Agent info:"
    head -n 20 /opt/agents/agent.py | grep -E "^#|Agent ID|Connection URL" || true
    
    echo ""
    echo "[+] To run the agent:"
    echo "    python3 /opt/agents/agent.py"
    echo ""
    echo "[+] To run in background:"
    echo "    nohup python3 /opt/agents/agent.py > /opt/agents/agent.log 2>&1 &"
    echo ""
else
    echo "[-] Failed to download agent"
    echo "    Check if the token is correct and the NOP backend is running"
    exit 1
fi
