#!/bin/bash

# Comprehensive Test Suite Orchestrator
# This script starts all test hosts, runs the complete test suite, and generates reports

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  NOP Comprehensive Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Start main NOP services
echo -e "${YELLOW}[1/5] Starting NOP main services...${NC}"
docker compose down 2>/dev/null || true
docker compose up -d
sleep 10

# Wait for backend to be healthy
echo -e "${YELLOW}Waiting for backend to be healthy...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:12001/api/v1/health | grep -q "ok"; then
        echo -e "${GREEN}✓ Backend is healthy${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    exit 1
fi

# Step 2: Start test environment
echo -e "${YELLOW}[2/5] Starting test hosts environment...${NC}"
cd test-environment
docker compose down 2>/dev/null || true
docker compose up -d
cd ..
sleep 5

# Verify test hosts are running
echo -e "${YELLOW}Verifying test hosts...${NC}"
test_hosts=(
    "172.21.0.10:22:SSH"
    "172.21.0.20:80:Web"
    "172.21.0.30:21:FTP"
    "172.21.0.40:3306:MySQL"
    "172.21.0.50:5900:VNC"
    "172.21.0.60:3389:RDP"
    "172.21.0.70:445:SMB"
)

for host_info in "${test_hosts[@]}"; do
    IFS=':' read -r ip port name <<< "$host_info"
    if nc -z -w 2 $ip $port 2>/dev/null; then
        echo -e "${GREEN}✓ $name ($ip:$port)${NC}"
    else
        echo -e "${YELLOW}⚠ $name ($ip:$port) - not responding${NC}"
    fi
done

# Step 3: Install Playwright dependencies if needed
echo -e "${YELLOW}[3/5] Checking Playwright setup...${NC}"
if [ ! -d "node_modules/@playwright" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Ensure browsers are installed
npx playwright install chromium 2>/dev/null || true

# Step 4: Run comprehensive test suite
echo -e "${YELLOW}[4/5] Running comprehensive test suite...${NC}"
cd e2e
npx playwright test tests/comprehensive-live-hosts.spec.ts --reporter=html --reporter=list
test_exit_code=$?
cd ..

# Step 5: Generate report
echo -e "${YELLOW}[5/5] Generating test report...${NC}"
if [ $test_exit_code -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ ALL TESTS PASSED${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ SOME TESTS FAILED${NC}"
    echo -e "${RED}========================================${NC}"
fi

echo ""
echo -e "${BLUE}Test Report:${NC} e2e/playwright-report/index.html"
echo -e "${BLUE}Test Artifacts:${NC} e2e/test-results/"
echo ""
echo -e "${YELLOW}To view the HTML report:${NC}"
echo -e "  cd e2e && npx playwright show-report"
echo ""
echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  docker compose down && cd test-environment && docker compose down"
echo ""

exit $test_exit_code
