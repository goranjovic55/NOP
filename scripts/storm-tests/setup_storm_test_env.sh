#!/bin/bash
# Setup STORM Test Environment
# Starts all required containers for testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  STORM Test Environment Setup                          ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_ROOT"

# Step 1: Start main services
echo -e "${CYAN}[1/4]${NC} Starting main NOP services..."
docker-compose up -d backend
sleep 3

# Verify backend is running
if ! docker ps | grep -q nop-backend; then
    echo -e "${YELLOW}⚠️  Backend container not running${NC}"
    echo "Starting backend..."
    docker-compose up -d backend
    sleep 5
fi

echo -e "${GREEN}✓${NC} Backend service ready"

# Step 2: Start test environment
echo -e "${CYAN}[2/4]${NC} Starting test environment containers..."
docker-compose -f docker-compose.test.yml up -d

echo -e "${GREEN}✓${NC} Test containers started"

# Step 3: Wait for containers to be ready
echo -e "${CYAN}[3/4]${NC} Waiting for services to be ready..."
sleep 5

# Check container status
echo ""
echo "Container Status:"
docker ps --filter "name=nop-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Step 4: Verify network connectivity
echo -e "${CYAN}[4/4]${NC} Verifying network setup..."

# Check if test network exists
if docker network inspect nop_test-network >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Test network (nop_test-network) exists"
else
    echo -e "${YELLOW}⚠️  Test network not found - creating...${NC}"
    docker network create --subnet=172.21.0.0/24 nop_test-network
fi

# Optionally connect backend to test network
if ! docker inspect nop-backend-1 | grep -q "nop_test-network"; then
    echo -e "${CYAN}Connecting backend to test network...${NC}"
    docker network connect nop_test-network nop-backend-1 2>/dev/null || true
fi

echo -e "${GREEN}✓${NC} Network configuration complete"

# Step 5: Verify API accessibility
echo ""
echo -e "${CYAN}Checking API health...${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend API accessible at http://localhost:8000"
else
    echo -e "${YELLOW}⚠️  Backend API not responding - may need more time to start${NC}"
fi

# Step 6: Display test targets
echo ""
echo -e "${CYAN}Test Targets Available:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for container in $(docker ps --filter "name=nop-custom-" --format "{{.Names}}"); do
    ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$container" | head -1)
    ports=$(docker inspect -f '{{range $p, $conf := .Config.ExposedPorts}}{{$p}} {{end}}' "$container")
    echo "  • $container"
    echo "    IP: $ip"
    echo "    Ports: $ports"
done

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  Setup Complete!                                        ${GREEN}║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Ready to run STORM tests                               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                         ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Next Steps:                                            ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • Run all tests: ./run_all_tests.sh --all           ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • Run single test: ./scenarios/scenario_01_*.sh     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • Monitor host: ../storm_monitor.sh 1000 <name> 80  ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
