#!/bin/bash

# Run the NOP agent with proper configuration

BACKEND_URL="${BACKEND_URL:-http://backend:12001}"
AGENT_FILE="${1:-/downloads/agent.py}"
AGENT_ID="${2:-auto}"

echo "======================================"
echo "NOP Agent Execution Script"
echo "======================================"
echo ""

# Check if agent file exists
if [ ! -f "$AGENT_FILE" ]; then
    echo "✗ Agent file not found: $AGENT_FILE"
    echo ""
    echo "Please download the agent first:"
    echo "  download-agent.sh"
    exit 1
fi

echo "Agent file: $AGENT_FILE"
echo "Backend URL: $BACKEND_URL"
echo "Agent ID: $AGENT_ID"
echo ""

# Display network information
echo "Network interfaces:"
echo "==================="
ip addr show | grep -E "inet |eth|docker"
echo ""

# Display routing table
echo "Routing table:"
echo "=============="
ip route
echo ""

# Check connectivity to backend
echo "Testing backend connectivity:"
echo "============================="
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" | grep -q "200"; then
    echo "✓ Backend is reachable"
else
    echo "⚠ Backend may not be reachable (this is OK if testing network isolation)"
fi
echo ""

# Display targets visible from this host
echo "Scanning agent network for targets:"
echo "===================================="
nmap -sn 10.10.0.0/16 --exclude 10.10.1.10 | grep -E "Nmap scan report|Host is up"
echo ""

# Run the agent
echo "Starting agent..."
echo "=================="
python3 "$AGENT_FILE" --backend-url "$BACKEND_URL" --agent-id "$AGENT_ID"
