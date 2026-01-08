#!/bin/bash
# POV Mode Verification Script
# Tests all features from agent perspective

set -e

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNjE2MmMwYS03NTc5LTQ0NDctYjA1Ni05MTljOWJkZTQ3MjIiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZXhwIjoxNzY3NjQ3MTk0LCJ0eXBlIjoiYWNjZXNzIn0.ML0LynxglvlSVg8ZFYjiCwxWZ6mfsqgPk58lSpcWDOI"
AGENT_ID="74513ce3-3c48-4b82-a17b-ff7de9cf9416"
BASE_URL="http://localhost:8000/api/v1"

echo "========================================"
echo "POV MODE VERIFICATION - AGENT PERSPECTIVE"
echo "========================================"
echo ""
echo "Agent ID: $AGENT_ID"
echo "Agent IPs: 172.28.0.150 (internal), 10.10.1.10 (isolated network)"
echo ""

# Test 1: Verify agent can reach isolated network
echo "TEST 1: Network Reachability from Agent"
echo "----------------------------------------"
docker exec agent-pov-host ping -c 2 10.10.2.10 | tail -3
echo ""

# Test 2: Verify C2 CANNOT reach isolated network
echo "TEST 2: Network Isolation from C2"
echo "----------------------------------------"
echo "Trying to ping 10.10.2.10 from C2 backend (should FAIL):"
docker exec docker-backend-1 timeout 3 ping -c 2 10.10.2.10 2>&1 || echo "✅ GOOD: C2 cannot reach isolated network"
echo ""

# Test 3: Advanced ping with traceroute from agent
echo "TEST 3: Advanced Ping + Traceroute from Agent POV"
echo "----------------------------------------"
curl -s -X POST "$BASE_URL/traffic/ping/advanced" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-POV: $AGENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "10.10.2.10",
    "count": 4,
    "protocol": "icmp",
    "traceroute": true
  }' | python -m json.tool | head -30
echo ""

# Test 4: Packet crafting from agent
echo "TEST 4: Packet Crafting from Agent POV"
echo "----------------------------------------"
curl -s -X POST "$BASE_URL/traffic/craft" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-POV: $AGENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "dest_ip": "10.10.2.20",
    "packet_type": "tcp_syn",
    "source_port": 12345,
    "dest_port": 80,
    "flags": "SYN"
  }' | python -m json.tool | head -30
echo ""

# Test 5: Host system info from agent
echo "TEST 5: Host System Info from Agent POV"
echo "----------------------------------------"
curl -s "$BASE_URL/host/system/info" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-POV: $AGENT_ID" | python -m json.tool | grep -A 5 "hostname\|network_interfaces"
echo ""

# Test 6: Test SSH access to isolated host
echo "TEST 6: SSH Access to Isolated Host (10.10.2.10)"
echo "----------------------------------------"
curl -s -X POST "$BASE_URL/access/test/ssh" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-POV: $AGENT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "10.10.2.10",
    "port": 22,
    "username": "test",
    "password": "test"
  }' | python -m json.tool
echo ""

# Test 7: Assets visible from agent POV
echo "TEST 7: Assets Visible from Agent POV"
echo "----------------------------------------"
echo "Assets with agent POV header (should show 10.10.x.x hosts):"
curl -s "$BASE_URL/assets?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-POV: $AGENT_ID" | python -m json.tool | grep -E "ip_address|10.10" | head -10
echo ""

echo "Assets WITHOUT agent POV (should NOT show 10.10.x.x hosts):"
curl -s "$BASE_URL/assets?limit=5" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool | grep -E "ip_address" | head -10
echo ""

# Test 8: Traffic interfaces from agent
echo "TEST 8: Network Interfaces from Agent POV"
echo "----------------------------------------"
curl -s "$BASE_URL/traffic/interfaces" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-POV: $AGENT_ID" | python -m json.tool | grep -E "name|address" | head -10
echo ""

echo "========================================"
echo "POV VERIFICATION COMPLETE"
echo "========================================"
echo ""
echo "CREDENTIALS FOR MANUAL TESTING:"
echo "- SSH (10.10.2.10): test/test"
echo "- Database (10.10.2.30): root/root123, dbuser/dbpass123"
echo "- VNC (10.10.2.50): password"
echo "- FTP (10.10.2.40): vsftpd 2.3.4 backdoor (CVE-2011-2523)"
echo ""
