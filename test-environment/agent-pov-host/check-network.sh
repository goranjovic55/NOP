#!/bin/bash

# Check network configuration and connectivity from agent POV

echo "======================================"
echo "Agent Network Configuration Check"
echo "======================================"
echo ""

echo "1. Network Interfaces:"
echo "======================"
ip addr show
echo ""

echo "2. Routing Table:"
echo "================="
ip route
echo ""

echo "3. DNS Configuration:"
echo "====================="
cat /etc/resolv.conf
echo ""

echo "4. Network Connectivity Tests:"
echo "=============================="

echo ""
echo "Testing backend (NOP internal network):"
ping -c 3 172.28.0.2 2>/dev/null && echo "✓ Can reach backend network" || echo "✗ Cannot reach backend network"
echo ""

echo "Testing agent network gateway:"
ping -c 3 10.10.1.1 2>/dev/null && echo "✓ Agent network gateway reachable" || echo "✗ Agent network gateway unreachable"
echo ""

echo "5. Scanning Agent Network (10.10.0.0/16):"
echo "=========================================="
echo "Quick ping sweep (this may take a moment)..."
nmap -sn 10.10.2.0/24 | grep "Nmap scan report"
echo ""

echo "6. Port Scanning Sample Hosts:"
echo "==============================="
echo "Scanning 10.10.2.10 (isolated-ssh)..."
nmap -p 22,80,443,3306,21,5900 10.10.2.10 | grep -E "PORT|open"
echo ""

echo "Scanning 10.10.2.20 (isolated-web)..."
nmap -p 22,80,443,3306,21,5900 10.10.2.20 | grep -E "PORT|open"
echo ""

echo "7. Summary:"
echo "==========="
echo "This host (agent-pov-host) should be able to:"
echo "  ✓ Connect to NOP backend (172.28.0.x network)"
echo "  ✓ Scan and access isolated targets (10.10.x.x network)"
echo ""
echo "The NOP frontend (from its network) should NOT be able to:"
echo "  ✗ Directly reach isolated targets (10.10.x.x network)"
echo ""
echo "This creates the scenario for testing Agent POV filtering."
echo ""
