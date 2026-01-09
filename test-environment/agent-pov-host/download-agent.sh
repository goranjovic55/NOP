#!/bin/bash

# Download the NOP agent from the backend server
# This script simulates downloading an agent to a remote host

BACKEND_URL="${BACKEND_URL:-http://backend:12001}"
DOWNLOAD_DIR="${1:-/downloads}"
AGENT_FILE="agent.py"

echo "======================================"
echo "NOP Agent Download Script"
echo "======================================"
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Download directory: $DOWNLOAD_DIR"
echo ""

# Create download directory if it doesn't exist
mkdir -p "$DOWNLOAD_DIR"

# Download the agent
echo "Downloading agent from $BACKEND_URL/api/v1/agents/download..."

# Try to download the agent (adjust endpoint as needed)
curl -f -o "$DOWNLOAD_DIR/$AGENT_FILE" "$BACKEND_URL/api/v1/agents/download" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✓ Agent downloaded successfully to $DOWNLOAD_DIR/$AGENT_FILE"
    ls -lh "$DOWNLOAD_DIR/$AGENT_FILE"
    echo ""
    echo "To run the agent:"
    echo "  run-agent.sh"
else
    echo "✗ Failed to download agent from backend"
    echo ""
    echo "Alternative: Copy agent manually"
    echo "  docker cp /workspaces/NOP/agent.py agent-pov-host:/downloads/agent.py"
    echo ""
    
    # If download fails, check if agent.py exists in workspace
    if [ -f "/workspace/agent.py" ]; then
        echo "Found local agent.py, copying..."
        cp /workspace/agent.py "$DOWNLOAD_DIR/$AGENT_FILE"
        echo "✓ Agent copied from local workspace"
    fi
fi

echo ""
echo "Network information:"
echo "===================="
ip addr show | grep inet
echo ""
