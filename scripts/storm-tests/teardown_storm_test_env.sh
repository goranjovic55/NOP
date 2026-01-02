#!/bin/bash
# Teardown STORM Test Environment
# Stops and cleans up test containers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  STORM Test Environment Teardown                       ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_ROOT"

# Step 1: Stop any active storms
echo -e "${CYAN}[1/5]${NC} Stopping any active storms..."
curl -s -X POST http://localhost:8000/api/v1/traffic/storm/stop > /dev/null 2>&1 || true
echo -e "${GREEN}✓${NC} Storms stopped"

# Step 2: Kill any running monitors
echo -e "${CYAN}[2/5]${NC} Stopping monitor processes..."
pkill -f storm_monitor.sh 2>/dev/null || true
echo -e "${GREEN}✓${NC} Monitors stopped"

# Step 3: Stop test containers
echo -e "${CYAN}[3/5]${NC} Stopping test environment containers..."
docker-compose -f docker-compose.test.yml down
echo -e "${GREEN}✓${NC} Test containers stopped"

# Step 4: Optionally remove test network
read -p "Remove test network? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}[4/5]${NC} Removing test network..."
    docker network rm nop_test-network 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Network removed"
else
    echo -e "${YELLOW}[4/5]${NC} Keeping test network"
fi

# Step 5: Clean up result files (optional)
read -p "Clean up test result files? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}[5/5]${NC} Cleaning up test results..."
    rm -rf "$SCRIPT_DIR/results/"*.log 2>/dev/null || true
    rm -rf "$SCRIPT_DIR/results/"*.json 2>/dev/null || true
    rm -rf "$SCRIPT_DIR/results/"*.md 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Results cleaned"
else
    echo -e "${YELLOW}[5/5]${NC} Keeping test results"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  Teardown Complete!                                     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                         ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Test environment has been cleaned up                   ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
