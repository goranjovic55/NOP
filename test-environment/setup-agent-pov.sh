#!/bin/bash

# Agent POV Environment Setup Script
# This script configures network routing and firewall rules for agent POV testing

set -e

echo "======================================"
echo "Agent POV Environment Setup"
echo "======================================"
echo ""

# Check if running with sufficient privileges
if [ "$EUID" -eq 0 ]; then
    DOCKER_EXEC=""
else
    DOCKER_EXEC="docker exec agent-pov-host"
fi

echo "Step 1: Verify containers are running"
echo "======================================"
docker ps | grep -E "agent-pov-host|isolated-" || {
    echo "⚠ Agent POV containers not running. Starting..."
    docker-compose -f docker-compose.agent-pov.yml up -d
    sleep 5
}
echo "✓ Containers are running"
echo ""

echo "Step 2: Configure agent-host networking"
echo "========================================"
docker exec agent-pov-host bash -c "
    # Enable IP forwarding
    sysctl -w net.ipv4.ip_forward=1
    
    # Ensure routing is configured
    ip route | grep '10.10.0.0/16' || ip route add 10.10.0.0/16 dev eth1
    
    echo '✓ IP forwarding enabled'
    echo '✓ Routes configured'
"
echo ""

echo "Step 3: Verify network isolation"
echo "================================="
echo "Testing that NOP backend CANNOT reach isolated hosts..."
docker exec backend ping -c 2 10.10.2.10 2>&1 | grep -q "100% packet loss" && {
    echo "✓ Backend cannot reach isolated-ssh (10.10.2.10) - Isolation working!"
} || {
    echo "⚠ Warning: Backend can reach isolated network (isolation may not be working)"
}
echo ""

echo "Testing that agent-host CAN reach isolated hosts..."
docker exec agent-pov-host ping -c 2 10.10.2.10 2>&1 | grep -q "0% packet loss" && {
    echo "✓ Agent host can reach isolated-ssh (10.10.2.10) - Connectivity working!"
} || {
    echo "✗ Agent host cannot reach isolated network"
    exit 1
}
echo ""

echo "Step 4: Display network topology"
echo "================================="
echo ""
echo "Network Layout:"
echo "==============="
echo ""
echo "NOP Internal Network (172.28.0.0/16):"
echo "  - Backend:  172.28.0.2"
echo "  - Frontend: 172.28.0.3"
echo "  - Agent Host: 172.28.0.150 (bridge)"
echo ""
echo "Agent Network (10.10.0.0/16):"
echo "  - Agent Host: 10.10.1.10 (bridge)"
echo "  - Isolated SSH: 10.10.2.10"
echo "  - Isolated Web: 10.10.2.20"
echo "  - Isolated DB:  10.10.2.30"
echo "  - Isolated FTP: 10.10.2.40"
echo "  - Isolated VNC: 10.10.2.50"
echo "  - Isolated File: 10.10.2.60"
echo "  - Isolated Web2: 10.10.3.10"
echo "  - Isolated SSH2: 10.10.3.20"
echo ""

echo "Step 5: Scan agent network"
echo "==========================="
echo "Discovering hosts on agent network..."
docker exec agent-pov-host nmap -sn 10.10.2.0/24 | grep "Nmap scan report" || echo "No hosts found"
echo ""

echo "======================================"
echo "✓ Agent POV environment setup complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Copy agent to agent-host:"
echo "   docker cp /workspaces/NOP/agent.py agent-pov-host:/downloads/agent.py"
echo ""
echo "2. Execute agent on agent-host:"
echo "   docker exec -it agent-pov-host run-agent.sh"
echo ""
echo "3. View network from agent POV:"
echo "   docker exec -it agent-pov-host check-network.sh"
echo ""
echo "4. In NOP frontend, switch to agent POV to see isolated hosts"
echo ""
