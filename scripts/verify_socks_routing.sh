#!/bin/bash
# SOCKS Routing Verification Script
# Run this AFTER backend SOCKS components are deployed

set -e

echo "=== SOCKS Routing Verification ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check agent connection and SOCKS port
echo "1. Checking Agent SOCKS Port Assignment..."
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=admin&password=admin123" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

AGENT_INFO=$(curl -s "http://localhost:8000/api/v1/agents/" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
agents = data.get('agents', [])
for agent in agents:
    if agent.get('status') == 'online' and 'test-host' in agent.get('name', ''):
        metadata = agent.get('agent_metadata', {})
        socks_port = metadata.get('socks_proxy_port')
        print(f\"{agent['id']}|{socks_port}\")
        break
")

if [ -z "$AGENT_INFO" ]; then
    echo -e "${RED}✗ No online agent found${NC}"
    exit 1
fi

AGENT_ID=$(echo "$AGENT_INFO" | cut -d'|' -f1)
SOCKS_PORT=$(echo "$AGENT_INFO" | cut -d'|' -f2)

if [ "$SOCKS_PORT" = "None" ] || [ -z "$SOCKS_PORT" ]; then
    echo -e "${RED}✗ Agent has no SOCKS port assigned${NC}"
    echo "  This means backend SOCKS proxy server is not running"
    exit 1
else
    echo -e "${GREEN}✓ Agent SOCKS Port: 127.0.0.1:$SOCKS_PORT${NC}"
fi

# 2. Check SOCKS proxy is listening
echo ""
echo "2. Verifying SOCKS Proxy is Listening..."
if netstat -tln | grep -q ":$SOCKS_PORT "; then
    echo -e "${GREEN}✓ SOCKS proxy listening on port $SOCKS_PORT${NC}"
else
    echo -e "${RED}✗ SOCKS proxy NOT listening${NC}"
    exit 1
fi

# 3. Get agent IP
echo ""
echo "3. Getting Agent IP Address..."
AGENT_IP=$(docker exec vulnerable-web hostname -i | awk '{print $1}')
echo -e "${GREEN}Agent IP: $AGENT_IP${NC}"

# 4. Test SOCKS connection
echo ""
echo "4. Testing SOCKS Proxy Connection..."
if command -v nc &> /dev/null; then
    timeout 2 nc -z 127.0.0.1 $SOCKS_PORT && \
        echo -e "${GREEN}✓ SOCKS proxy accepts connections${NC}" || \
        echo -e "${RED}✗ SOCKS proxy not responding${NC}"
else
    echo -e "${YELLOW}⚠ netcat not available, skipping connection test${NC}"
fi

# 5. Monitor agent network activity
echo ""
echo "5. Agent Network Monitoring Setup..."
echo "Run this in another terminal to watch agent connections:"
echo -e "${YELLOW}  docker exec vulnerable-web sh -c 'while true; do netstat -tn 2>/dev/null | grep ESTABLISHED; sleep 2; done'${NC}"

# 6. Target monitoring
echo ""
echo "6. Target Monitoring Setup..."
echo "To verify source IP on target, run on target:"
echo -e "${YELLOW}  tcpdump -i any -n 'tcp[tcpflags] & tcp-syn != 0' | grep $AGENT_IP${NC}"

# 7. ProxyChains verification
echo ""
echo "7. ProxyChains Verification..."
echo "When running scans with POV mode, check backend logs for:"
echo -e "${YELLOW}  docker logs nop-backend-1 | grep -i proxychains${NC}"
echo ""
echo "Expected output:"
echo "  [proxychains] Strict chain ... 127.0.0.1:$SOCKS_PORT ... OK"

# 8. Test scan with POV mode
echo ""
echo "8. Test POV Mode Scan..."
echo "Run a port scan through agent:"
echo ""
echo -e "${YELLOW}curl -X POST http://localhost:8000/api/v1/discovery/port-scan \\
  -H \"Authorization: Bearer \$TOKEN\" \\
  -H \"Content-Type: application/json\" \\
  -H \"X-Agent-POV: $AGENT_ID\" \\
  -d '{\"target\":\"172.21.0.1\",\"ports\":\"22,80,443\"}'${NC}"

echo ""
echo "=== Verification Summary ==="
echo -e "Agent ID:    ${GREEN}$AGENT_ID${NC}"
echo -e "Agent IP:    ${GREEN}$AGENT_IP${NC}"
echo -e "SOCKS Port:  ${GREEN}$SOCKS_PORT${NC}"
echo ""
echo -e "${YELLOW}To verify routing:${NC}"
echo "1. Monitor agent connections (watch for outbound to scan target)"
echo "2. Check target sees agent IP ($AGENT_IP) as source"
echo "3. Verify ProxyChains logs show SOCKS routing"
echo "4. Compare with non-POV scan (should show C2 IP instead)"
