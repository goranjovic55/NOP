#!/bin/bash

# Test Host Validation Script
# Validates all test hosts are running and accessible

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Host Validation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to test port connectivity
test_port() {
    local ip=$1
    local port=$2
    local service=$3
    
    if nc -z -w 2 $ip $port 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $service ($ip:$port)"
        return 0
    else
        echo -e "${RED}✗${NC} $service ($ip:$port) - NOT REACHABLE"
        return 1
    fi
}

# Function to test HTTP endpoint
test_http() {
    local url=$1
    local service=$2
    
    if curl -s -o /dev/null -w "%{http_code}" --max-time 2 $url | grep -q "^[23]"; then
        echo -e "${GREEN}✓${NC} $service - HTTP OK"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $service - HTTP response unexpected"
        return 1
    fi
}

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi

echo -e "${BLUE}Checking test environment services...${NC}"
echo ""

# Check if test environment is running
cd test-environment
if ! docker compose ps | grep -q "Up"; then
    echo -e "${YELLOW}Test environment not running. Starting...${NC}"
    docker compose up -d
    sleep 10
else
    echo -e "${GREEN}✓ Test environment is running${NC}"
fi
cd ..

echo ""
echo -e "${BLUE}Testing individual host connectivity...${NC}"
echo ""

total_tests=0
passed_tests=0

# Test each service
echo -e "${YELLOW}Network Services:${NC}"

if test_port 172.21.0.10 22 "SSH Server"; then
    ((passed_tests++))
fi
((total_tests++))

if test_port 172.21.0.20 80 "Web Server"; then
    ((passed_tests++))
fi
((total_tests++))

if test_port 172.21.0.30 21 "FTP Server"; then
    ((passed_tests++))
fi
((total_tests++))

if test_port 172.21.0.40 3306 "MySQL Server"; then
    ((passed_tests++))
fi
((total_tests++))

if test_port 172.21.0.50 5900 "VNC Server"; then
    ((passed_tests++))
fi
((total_tests++))

if test_port 172.21.0.60 3389 "RDP Server"; then
    ((passed_tests++))
fi
((total_tests++))

if test_port 172.21.0.70 445 "SMB Server"; then
    ((passed_tests++))
fi
((total_tests++))

echo ""
echo -e "${YELLOW}Web Endpoints:${NC}"

if test_http "http://172.21.0.20:80" "Web Server HTTP"; then
    ((passed_tests++))
fi
((total_tests++))

echo ""
echo -e "${BLUE}Test Credentials Summary:${NC}"
echo ""
echo -e "${YELLOW}SSH Server (172.21.0.10:22):${NC}"
echo "  Username: testuser"
echo "  Password: testpass123"
echo "  OR"
echo "  Username: admin"
echo "  Password: admin123"
echo ""

echo -e "${YELLOW}VNC Server (172.21.0.50:5900):${NC}"
echo "  Password: password"
echo ""

echo -e "${YELLOW}RDP Server (172.21.0.60:3389):${NC}"
echo "  Username: rdpuser"
echo "  Password: rdp123"
echo ""

echo -e "${YELLOW}FTP Server (172.21.0.30:21):${NC}"
echo "  Username: ftpuser"
echo "  Password: ftp123"
echo ""

echo -e "${YELLOW}MySQL Server (172.21.0.40:3306):${NC}"
echo "  Username: dbuser"
echo "  Password: dbpass123"
echo "  Database: testdb"
echo ""

echo -e "${YELLOW}SMB Server (172.21.0.70:445):${NC}"
echo "  Username: smbuser"
echo "  Password: smbpass123"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Validation Results${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}$passed_tests${NC}/$total_tests"

if [ $passed_tests -eq $total_tests ]; then
    echo ""
    echo -e "${GREEN}✓ All test hosts are healthy and accessible${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Start NOP services: docker compose up -d"
    echo "  2. Run test suite: ./run-comprehensive-tests.sh"
    echo "  3. Or run specific tests: cd e2e && npx playwright test"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some test hosts are not accessible${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Check Docker: docker ps"
    echo "  2. Check networks: docker network ls"
    echo "  3. Restart test environment: cd test-environment && docker compose restart"
    echo "  4. View logs: cd test-environment && docker compose logs"
    exit 1
fi
