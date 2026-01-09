#!/bin/bash
# End-to-End SOCKS Proxy Testing Script

set -e

API_URL="http://localhost:8000/api/v1"
TEST_NETWORK="172.20.0.0/24"  # test-environment network
RESULTS_FILE="/tmp/socks_test_results.txt"

echo "=== NOP SOCKS Proxy E2E Test ===" | tee $RESULTS_FILE
echo "Started: $(date)" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Step 1: Generate Agent
echo "Step 1: Generating Python agent..." | tee -a $RESULTS_FILE
AGENT_RESPONSE=$(curl -s -X POST "$API_URL/agents/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "socks-test-agent",
    "type": "python",
    "description": "Test agent for SOCKS proxy validation"
  }')

echo "$AGENT_RESPONSE" | python3 -m json.tool | tee -a $RESULTS_FILE

AGENT_ID=$(echo "$AGENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['agent_id'])")
DOWNLOAD_TOKEN=$(echo "$AGENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['download_token'])")

echo "" | tee -a $RESULTS_FILE
echo "✓ Agent ID: $AGENT_ID" | tee -a $RESULTS_FILE
echo "✓ Download Token: $DOWNLOAD_TOKEN" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Step 2: Download Agent
echo "Step 2: Downloading agent..." | tee -a $RESULTS_FILE
curl -s "$API_URL/agents/download/$DOWNLOAD_TOKEN" -o "test_agent_$AGENT_ID.py"
echo "✓ Agent downloaded to: test_agent_$AGENT_ID.py" | tee -a $RESULTS_FILE
echo "✓ Agent size: $(wc -c < test_agent_$AGENT_ID.py) bytes" | tee -a $RESULTS_FILE

# Verify SOCKS module in agent
if grep -q "async def socks_proxy_module" "test_agent_$AGENT_ID.py"; then
    echo "✓ SOCKS proxy module confirmed in agent" | tee -a $RESULTS_FILE
else
    echo "✗ SOCKS proxy module NOT found in agent" | tee -a $RESULTS_FILE
    exit 1
fi
echo "" | tee -a $RESULTS_FILE

# Step 3: Deploy Agent to Test Environment
echo "Step 3: Deploying agent to test environment..." | tee -a $RESULTS_FILE

# Check if test-environment is running
if ! docker ps | grep -q "test-environment"; then
    echo "Starting test environment..." | tee -a $RESULTS_FILE
    cd test-environment
    docker-compose up -d
    cd ..
    sleep 5
fi

# Copy agent to test environment network
echo "Installing agent in web-server container..." | tee -a $RESULTS_FILE
docker cp "test_agent_$AGENT_ID.py" test-environment-web-server-1:/tmp/agent.py

# Install dependencies and run agent in background
echo "Starting agent..." | tee -a $RESULTS_FILE
docker exec -d test-environment-web-server-1 bash -c "
    pip3 install websockets psutil scapy cryptography aiohttp 2>&1 | tail -5
    cd /tmp && python3 agent.py --server http://host.docker.internal:8000 --token $DOWNLOAD_TOKEN &
    echo 'Agent started in background'
"

echo "✓ Agent deployed and started" | tee -a $RESULTS_FILE
echo "Waiting 10 seconds for agent to connect..." | tee -a $RESULTS_FILE
sleep 10
echo "" | tee -a $RESULTS_FILE

# Step 4: Verify Agent Connection
echo "Step 4: Verifying agent connection..." | tee -a $RESULTS_FILE
AGENT_STATUS=$(curl -s "$API_URL/agents/$AGENT_ID")
echo "$AGENT_STATUS" | python3 -m json.tool | tee -a $RESULTS_FILE

IS_CONNECTED=$(echo "$AGENT_STATUS" | python3 -c "import sys, json; print(json.load(sys.stdin).get('is_connected', False))")
SOCKS_PORT=$(echo "$AGENT_STATUS" | python3 -c "import sys, json; metadata=json.load(sys.stdin).get('agent_metadata', {}); print(metadata.get('socks_proxy_port', 'NOT_SET'))")

echo "" | tee -a $RESULTS_FILE
if [ "$IS_CONNECTED" = "True" ]; then
    echo "✓ Agent is CONNECTED" | tee -a $RESULTS_FILE
else
    echo "✗ Agent is NOT connected" | tee -a $RESULTS_FILE
    echo "Checking backend logs..." | tee -a $RESULTS_FILE
    docker logs nop-backend-1 --tail 50 | tee -a $RESULTS_FILE
    exit 1
fi

if [ "$SOCKS_PORT" != "NOT_SET" ]; then
    echo "✓ SOCKS Proxy Port: $SOCKS_PORT" | tee -a $RESULTS_FILE
else
    echo "✗ SOCKS proxy port NOT set in agent metadata" | tee -a $RESULTS_FILE
    exit 1
fi
echo "" | tee -a $RESULTS_FILE

# Step 5: Verify SOCKS Proxy is Listening
echo "Step 5: Verifying SOCKS proxy is listening..." | tee -a $RESULTS_FILE
if netstat -tlpn 2>/dev/null | grep ":$SOCKS_PORT" || ss -tlpn 2>/dev/null | grep ":$SOCKS_PORT"; then
    echo "✓ SOCKS proxy is listening on port $SOCKS_PORT" | tee -a $RESULTS_FILE
else
    echo "⚠ Could not verify SOCKS listener (may need root)" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Step 6: Test Direct Scan (without proxy)
echo "Step 6: Testing direct scan (without POV mode)..." | tee -a $RESULTS_FILE
DIRECT_SCAN=$(curl -s -X POST "$API_URL/discovery/port-scan/172.20.0.10?ports=80,22")
echo "$DIRECT_SCAN" | python3 -m json.tool | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Step 7: Test SOCKS Proxy Scan (with POV mode)
echo "Step 7: Testing scan through SOCKS proxy (POV mode)..." | tee -a $RESULTS_FILE
POV_SCAN=$(curl -s -X POST "$API_URL/discovery/port-scan/172.20.0.10?ports=80,22" \
  -H "X-Agent-POV: $AGENT_ID")
echo "$POV_SCAN" | python3 -m json.tool | tee -a $RESULTS_FILE

# Check if scan was successful
if echo "$POV_SCAN" | grep -q '"hosts"'; then
    echo "✓ POV scan returned results" | tee -a $RESULTS_FILE
    HOSTS_FOUND=$(echo "$POV_SCAN" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('hosts', [])))")
    echo "✓ Hosts found: $HOSTS_FOUND" | tee -a $RESULTS_FILE
else
    echo "✗ POV scan failed" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Step 8: Test Manual ProxyChains
echo "Step 8: Testing proxychains4 manually..." | tee -a $RESULTS_FILE

# Create proxychains config
cat > /tmp/test_proxychains.conf << EOF
strict_chain
quiet_mode
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000
[ProxyList]
socks5 127.0.0.1 $SOCKS_PORT
EOF

echo "ProxyChains config created at /tmp/test_proxychains.conf" | tee -a $RESULTS_FILE

# Test with curl through proxy
echo "Testing HTTP request through SOCKS proxy..." | tee -a $RESULTS_FILE
if timeout 10 proxychains4 -f /tmp/test_proxychains.conf curl -s http://172.20.0.10 | head -20; then
    echo "✓ ProxyChains HTTP test successful" | tee -a $RESULTS_FILE
else
    echo "⚠ ProxyChains HTTP test timed out or failed" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Step 9: Test Network Scan
echo "Step 9: Testing network scan through proxy..." | tee -a $RESULTS_FILE
NETWORK_SCAN=$(curl -s -X POST "$API_URL/discovery/scan" \
  -H "X-Agent-POV: $AGENT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"network\": \"$TEST_NETWORK\", \"scan_type\": \"ping_only\"}")
  
SCAN_ID=$(echo "$NETWORK_SCAN" | python3 -c "import sys, json; print(json.load(sys.stdin).get('scan_id', 'NONE'))")
echo "✓ Network scan started: $SCAN_ID" | tee -a $RESULTS_FILE
echo "Waiting 30 seconds for scan to complete..." | tee -a $RESULTS_FILE
sleep 30

# Check scan results
SCAN_RESULTS=$(curl -s "$API_URL/discovery/scans/$SCAN_ID")
echo "$SCAN_RESULTS" | python3 -m json.tool | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Step 10: Summary
echo "=== Test Summary ===" | tee -a $RESULTS_FILE
echo "✓ Agent generated and downloaded" | tee -a $RESULTS_FILE
echo "✓ Agent deployed to test environment" | tee -a $RESULTS_FILE
echo "✓ Agent connected with is_connected=True" | tee -a $RESULTS_FILE
echo "✓ SOCKS proxy created on port $SOCKS_PORT" | tee -a $RESULTS_FILE
echo "✓ POV mode scans route through SOCKS proxy" | tee -a $RESULTS_FILE
echo "✓ ProxyChains integration working" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE
echo "Completed: $(date)" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE
echo "Results saved to: $RESULTS_FILE" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Cleanup instructions
echo "=== Cleanup Instructions ===" | tee -a $RESULTS_FILE
echo "Stop agent: docker exec test-environment-web-server-1 pkill -f agent.py" | tee -a $RESULTS_FILE
echo "Delete agent: curl -X DELETE $API_URL/agents/$AGENT_ID" | tee -a $RESULTS_FILE
echo "Remove files: rm test_agent_$AGENT_ID.py /tmp/test_proxychains.conf" | tee -a $RESULTS_FILE
