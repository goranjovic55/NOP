#!/bin/bash
# Simple STORM Test Setup
# Sets up one test host and starts monitoring for storm detection

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
TEST_HOST="nop-custom-web"
TEST_PORT=80
THRESHOLD_PPS=2000

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STORM Test - Simple Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PROJECT_ROOT"

# Step 1: Start test host if not running
echo "[1/3] Checking test host..."
if ! docker ps --format '{{.Names}}' | grep -q "^${TEST_HOST}$"; then
    echo "  Creating $TEST_HOST..."
    docker rm $TEST_HOST 2>/dev/null || true
    docker run -d --name $TEST_HOST --network nop_test-network nginx:alpine >/dev/null
    sleep 2
    echo "  ✓ $TEST_HOST created"
else
    echo "  ✓ $TEST_HOST already running"
fi

# Get host IP
HOST_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $TEST_HOST | head -1)
echo "  ✓ Test Host: $TEST_HOST ($HOST_IP:$TEST_PORT)"

# Step 2: Verify backend is running
echo ""
echo "[2/3] Checking backend..."
if ! docker ps --format '{{.Names}}' | grep -q "nop-backend"; then
    echo "  Starting backend..."
    docker-compose up -d backend
    sleep 5
fi
echo "  ✓ Backend running"

# Step 3: Start monitor in background
echo ""
echo "[3/3] Starting storm monitor..."
echo "  Threshold: $THRESHOLD_PPS PPS"
echo "  Monitor will shut down $TEST_HOST when threshold exceeded"
echo ""

# Start monitor in background
MONITOR_LOG="$SCRIPT_DIR/storm_monitor_$(date +%Y%m%d_%H%M%S).log"
"$SCRIPT_DIR/storm_monitor.sh" $THRESHOLD_PPS $TEST_HOST $TEST_PORT "$MONITOR_LOG" &
MONITOR_PID=$!

sleep 2

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test Target:"
echo "  IP: $HOST_IP"
echo "  Port: $TEST_PORT"
echo "  Threshold: $THRESHOLD_PPS PPS"
echo ""
echo "Monitor:"
echo "  PID: $MONITOR_PID"
echo "  Log: $MONITOR_LOG"
echo ""
echo "Next Steps:"
echo "  1. Open NOP GUI in browser"
echo "  2. Go to Traffic → Storm"
echo "  3. Configure storm:"
echo "     - Destination IP: $HOST_IP"
echo "     - Destination Port: $TEST_PORT"
echo "     - PPS: 5000 (or any value > $THRESHOLD_PPS)"
echo "     - Duration: 20s"
echo "  4. Click 'Start Storm'"
echo "  5. Watch monitor detect and shut down host"
echo ""
echo "To view monitor output:"
echo "  tail -f $MONITOR_LOG"
echo ""
echo "To stop monitor:"
echo "  kill $MONITOR_PID"
echo ""
echo "To restart test host after shutdown:"
echo "  docker start $TEST_HOST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
