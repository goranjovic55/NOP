#!/bin/bash
# Simple SOCKS Proxy E2E Test with Authentication

set -e

API_URL="http://localhost:8000/api/v1"
TEST_NETWORK="172.20.0.0/24"
RESULTS_FILE="/tmp/socks_test_results.txt"

echo "=== NOP SOCKS Proxy E2E Test ===" | tee $RESULTS_FILE
echo "Started: $(date)" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Step 1: Login or Register
echo "Step 1: Authenticating..." | tee -a $RESULTS_FILE

# Try to login with test user
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123" || echo '{"detail":"failed"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo "✓ Logged in as admin" | tee -a $RESULTS_FILE
    TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
else
    # Try to register
    echo "Admin login failed, trying to register..." | tee -a $RESULTS_FILE
    REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
      -H "Content-Type: application/json" \
      -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}')
    
    if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
        echo "✓ Registered new user" | tee -a $RESULTS_FILE
        TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
    else
        echo "✗ Authentication failed" | tee -a $RESULTS_FILE
        echo "$REGISTER_RESPONSE" | tee -a $RESULTS_FILE
        exit 1
    fi
fi

echo "✓ Access Token: ${TOKEN:0:20}..." | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Step 2: Create Agent
echo "Step 2: Creating agent..." | tee -a $RESULTS_FILE
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/agents/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "socks-test-agent",
    "agent_type": "python",
    "description": "SOCKS proxy test agent",
    "connection_url": "ws://localhost:8000/api/v1/agents/ws"
  }')

echo "$CREATE_RESPONSE" | python3 -m json.tool | tee -a $RESULTS_FILE

AGENT_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$AGENT_ID" ] || [ "$AGENT_ID" = "None" ]; then
    echo "✗ Failed to create agent" | tee -a $RESULTS_FILE
    exit 1
fi

echo "✓ Agent ID: $AGENT_ID" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Step 3: Generate Agent Code
echo "Step 3: Generating agent code..." | tee -a $RESULTS_FILE
GENERATE_RESPONSE=$(curl -s -X POST "$API_URL/agents/$AGENT_ID/generate" \
  -H "Authorization: Bearer $TOKEN")

echo "$GENERATE_RESPONSE" | python3 -m json.tool | head -30 | tee -a $RESULTS_FILE

DOWNLOAD_TOKEN=$(echo "$GENERATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['download_token'])" 2>/dev/null)

if [ -z "$DOWNLOAD_TOKEN" ]; then
    echo "✗ Failed to generate agent" | tee -a $RESULTS_FILE
    exit 1
fi

echo "✓ Download Token: $DOWNLOAD_TOKEN" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Step 4: Download Agent
echo "Step 4: Downloading agent..." | tee -a $RESULTS_FILE
curl -s "$API_URL/agents/download/$DOWNLOAD_TOKEN" -o "test_agent_$AGENT_ID.py"
AGENT_SIZE=$(wc -c < "test_agent_$AGENT_ID.py")
echo "✓ Agent downloaded: $AGENT_SIZE bytes" | tee -a $RESULTS_FILE

# Verify SOCKS module
if grep -q "async def socks_proxy_module" "test_agent_$AGENT_ID.py"; then
    echo "✓ SOCKS proxy module found in agent" | tee -a $RESULTS_FILE
else
    echo "✗ SOCKS proxy module NOT found" | tee -a $RESULTS_FILE
    exit 1
fi

if grep -q "handle_socks_connect" "test_agent_$AGENT_ID.py"; then
    echo "✓ SOCKS handler functions found" | tee -a $RESULTS_FILE
fi

echo "" | tee -a $RESULTS_FILE

# Step 5: Deploy to Test Environment
echo "Step 5: Deploying agent to test environment..." | tee -a $RESULTS_FILE

# Check test environment
if ! docker ps | grep -q "test-environment-web-server"; then
    echo "Starting test environment..." | tee -a $RESULTS_FILE
    cd test-environment
    docker-compose up -d
    cd ..
    sleep 10
fi

# Copy and run agent
echo "Copying agent to web-server container..." | tee -a $RESULTS_FILE
docker cp "test_agent_$AGENT_ID.py" test-environment-web-server-1:/tmp/agent.py

echo "Installing Python dependencies..." | tee -a $RESULTS_FILE
docker exec test-environment-web-server-1 bash -c "pip3 install -q websockets psutil scapy cryptography aiohttp 2>&1 | tail -3"

echo "Starting agent..." | tee -a $RESULTS_FILE
# Get the backend container IP for agent to connect to
BACKEND_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' nop-backend-1)
echo "Backend IP: $BACKEND_IP" | tee -a $RESULTS_FILE

# Run agent in background
docker exec -d test-environment-web-server-1 bash -c "cd /tmp && python3 agent.py --server http://$BACKEND_IP:8000 --token $DOWNLOAD_TOKEN > /tmp/agent.log 2>&1"

echo "✓ Agent started" | tee -a $RESULTS_FILE
echo "Waiting 15 seconds for agent to connect..." | tee -a $RESULTS_FILE
sleep 15
echo "" | tee -a $RESULTS_FILE

# Step 6: Verify Connection
echo "Step 6: Verifying agent connection..." | tee -a $RESULTS_FILE
AGENT_STATUS=$(curl -s "$API_URL/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$AGENT_STATUS" | python3 -m json.tool | tee -a $RESULTS_FILE

IS_CONNECTED=$(echo "$AGENT_STATUS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('is_connected', False))")
SOCKS_PORT=$(echo "$AGENT_STATUS" | python3 -c "import sys, json; metadata=json.load(sys.stdin).get('agent_metadata', {}); print(metadata.get('socks_proxy_port', 'NOT_SET'))" 2>/dev/null || echo "NOT_SET")

echo "" | tee -a $RESULTS_FILE
if [ "$IS_CONNECTED" = "True" ]; then
    echo "✓ Agent is CONNECTED" | tee -a $RESULTS_FILE
else
    echo "✗ Agent NOT connected (is_connected=$IS_CONNECTED)" | tee -a $RESULTS_FILE
    echo "Checking agent logs..." | tee -a $RESULTS_FILE
    docker exec test-environment-web-server-1 cat /tmp/agent.log | tail -50 | tee -a $RESULTS_FILE
    echo "Checking backend logs..." | tee -a $RESULTS_FILE
    docker logs nop-backend-1 --tail 30 | tee -a $RESULTS_FILE
    exit 1
fi

if [ "$SOCKS_PORT" != "NOT_SET" ] && [ ! -z "$SOCKS_PORT" ]; then
    echo "✓ SOCKS Proxy Port: $SOCKS_PORT" | tee -a $RESULTS_FILE
else
    echo "✗ SOCKS proxy port NOT set (value: $SOCKS_PORT)" | tee -a $RESULTS_FILE
    echo "Checking backend logs for SOCKS proxy creation..." | tee -a $RESULTS_FILE
    docker logs nop-backend-1 --tail 50 | grep -i socks | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Step 7: Test Direct Scan
echo "Step 7: Testing direct scan (no proxy)..." | tee -a $RESULTS_FILE
DIRECT_SCAN=$(curl -s -X POST "$API_URL/discovery/port-scan/172.20.0.10?ports=80,22" \
  -H "Authorization: Bearer $TOKEN")
echo "Direct scan result:" | tee -a $RESULTS_FILE
echo "$DIRECT_SCAN" | python3 -m json.tool | head -30 | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Step 8: Test POV Scan (through SOCKS)
echo "Step 8: Testing POV scan through SOCKS proxy..." | tee -a $RESULTS_FILE
POV_SCAN=$(curl -s -X POST "$API_URL/discovery/port-scan/172.20.0.10?ports=80,22" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-POV: $AGENT_ID")
  
echo "POV scan result:" | tee -a $RESULTS_FILE
echo "$POV_SCAN" | python3 -m json.tool | head -30 | tee -a $RESULTS_FILE

if echo "$POV_SCAN" | grep -q '"hosts"'; then
    echo "✓ POV scan returned hosts" | tee -a $RESULTS_FILE
else
    echo "⚠ POV scan did not return hosts" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Step 9: Manual ProxyChains Test
if [ "$SOCKS_PORT" != "NOT_SET" ] && [ ! -z "$SOCKS_PORT" ]; then
    echo "Step 9: Testing proxychains4 manually..." | tee -a $RESULTS_FILE
    
    cat > /tmp/test_proxychains.conf << EOF
strict_chain
quiet_mode
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000
[ProxyList]
socks5 127.0.0.1 $SOCKS_PORT
EOF
    
    echo "Testing HTTP through SOCKS proxy..." | tee -a $RESULTS_FILE
    if timeout 15 proxychains4 -f /tmp/test_proxychains.conf curl -s http://172.20.0.10 2>/dev/null | head -10; then
        echo "✓ ProxyChains HTTP test successful" | tee -a $RESULTS_FILE
    else
        echo "⚠ ProxyChains test failed or timed out" | tee -a $RESULTS_FILE
    fi
    echo "" | tee -a $RESULTS_FILE
fi

# Step 10: Summary
echo "=== Test Summary ===" | tee -a $RESULTS_FILE
echo "✓ Authentication successful" | tee -a $RESULTS_FILE
echo "✓ Agent created (ID: $AGENT_ID)" | tee -a $RESULTS_FILE
echo "✓ Agent code generated and downloaded ($AGENT_SIZE bytes)" | tee -a $RESULTS_FILE
echo "✓ SOCKS module verified in agent code" | tee -a $RESULTS_FILE
echo "✓ Agent deployed to test environment" | tee -a $RESULTS_FILE
if [ "$IS_CONNECTED" = "True" ]; then
    echo "✓ Agent connected successfully" | tee -a $RESULTS_FILE
fi
if [ "$SOCKS_PORT" != "NOT_SET" ] && [ ! -z "$SOCKS_PORT" ]; then
    echo "✓ SOCKS proxy created on port $SOCKS_PORT" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE
echo "Completed: $(date)" | tee -a $RESULTS_FILE
echo "Full results in: $RESULTS_FILE" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Cleanup
echo "=== Cleanup ===" | tee -a $RESULTS_FILE
echo "Agent logs: docker exec test-environment-web-server-1 cat /tmp/agent.log" | tee -a $RESULTS_FILE
echo "Stop agent: docker exec test-environment-web-server-1 pkill -f agent.py" | tee -a $RESULTS_FILE
echo "Delete agent: curl -X DELETE -H 'Authorization: Bearer $TOKEN' $API_URL/agents/$AGENT_ID" | tee -a $RESULTS_FILE
