#!/bin/bash
# Setup script for NOP test environment

set -e

echo "========================================"
echo "NOP Test Environment Setup"
echo "========================================"
echo ""

# Change to the NOP directory
cd /home/runner/work/NOP/NOP

echo "1. Creating Docker network..."
if docker network inspect nop_test-network >/dev/null 2>&1; then
    echo "   ✓ Network nop_test-network already exists"
else
    docker network create --subnet=172.21.0.0/24 nop_test-network
    echo "   ✓ Network nop_test-network created"
fi

echo ""
echo "2. Building and starting test environment containers..."
docker compose -f docker-compose.test.yml up -d --build

echo ""
echo "3. Waiting for test containers to be ready (30 seconds)..."
sleep 30

echo ""
echo "4. Building and starting main application containers..."
docker compose up -d --build

echo ""
echo "5. Waiting for application containers to be ready (30 seconds)..."
sleep 30

echo ""
echo "6. Checking container status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|nop-|guacd" || true

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Test Environment Hosts:"
echo "  - RDP Server: 172.21.0.50:3389 (rdpuser:rdp123)"
echo "  - VNC Server: 172.21.0.51:5900 (password: vnc123)"
echo "  - SSH Server: 172.21.0.69:22 (testuser:testpassword)"
echo "  - Web Server: 172.21.0.42:80"
echo "  - FTP Server: 172.21.0.52:21"
echo ""
echo "Application URLs:"
echo "  - Frontend: http://localhost:12000"
echo "  - Backend API: http://localhost:12001"
echo ""
echo "Next steps:"
echo "  1. Run: python3 test_rdp_vnc_connections.py"
echo "  2. Open browser: http://localhost:12000"
echo "  3. Login with: admin / admin123"
echo "  4. Navigate to Access Hub"
echo "  5. Test RDP and VNC connections"
echo ""
