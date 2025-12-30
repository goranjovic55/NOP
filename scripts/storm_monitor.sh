#!/bin/bash
# Storm Monitor - Detects high PPS and shuts down service port
# Usage: ./storm_monitor.sh <threshold_pps> <container_name> <port>

set -e

# Configuration
THRESHOLD_PPS=${1:-1000}
CONTAINER_NAME=${2:-"nop-vulnerable-web-1"}
TARGET_PORT=${3:-80}
INTERFACE="any"  # Monitor all interfaces
SAMPLE_INTERVAL=1  # seconds

echo "=========================================="
echo "STORM MONITOR - Auto-Shutdown on High PPS"
echo "=========================================="
echo "Target Container: $CONTAINER_NAME"
echo "Target Port: $TARGET_PORT"
echo "PPS Threshold: $THRESHOLD_PPS"
echo "Monitoring Interface: $INTERFACE"
echo "Sample Interval: ${SAMPLE_INTERVAL}s"
echo "=========================================="
echo ""

# Check if container exists and is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Container '$CONTAINER_NAME' not found or not running"
    exit 1
fi

# Get container IP
CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $CONTAINER_NAME)
echo "📍 Container IP: $CONTAINER_IP"
echo ""

# Install tcpdump in container if not present
echo "🔧 Installing tcpdump in container..."
docker exec $CONTAINER_NAME bash -c "command -v tcpdump >/dev/null 2>&1 || (apt-get update -qq && apt-get install -y tcpdump >/dev/null 2>&1)" 2>/dev/null || true
echo "✓ tcpdump ready"
echo ""

echo "🔍 Starting packet monitoring..."
echo "⚠️  Will shutdown port $TARGET_PORT when PPS exceeds $THRESHOLD_PPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Monitoring loop
PACKET_COUNT=0
PREVIOUS_COUNT=0

while true; do
    # Count packets in the interval
    CURRENT_TIME=$(date +%s)
    
    # Get packet count from tcpdump (run for SAMPLE_INTERVAL seconds)
    PACKET_COUNT=$(docker exec $CONTAINER_NAME timeout ${SAMPLE_INTERVAL}s tcpdump -i $INTERFACE -nn -q 2>/dev/null | wc -l)
    
    # Calculate PPS
    PPS=$((PACKET_COUNT / SAMPLE_INTERVAL))
    
    # Display current status
    TIMESTAMP=$(date '+%H:%M:%S')
    
    if [ $PPS -lt $THRESHOLD_PPS ]; then
        # Normal operation - green
        echo "[$TIMESTAMP] 📊 PPS: $PPS | Status: ✓ NORMAL | Port $TARGET_PORT: OPEN"
    else
        # Threshold exceeded - red alert
        echo "[$TIMESTAMP] 🚨 PPS: $PPS | Status: ⚠️  THRESHOLD EXCEEDED!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🛑 SHUTTING DOWN PORT $TARGET_PORT"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Shutdown the service by stopping the container
        echo "⏸️  Stopping container: $CONTAINER_NAME"
        docker stop $CONTAINER_NAME >/dev/null 2>&1
        
        echo "✓ Container stopped"
        echo "📊 Final PPS before shutdown: $PPS"
        echo ""
        echo "To restart the container, run:"
        echo "  docker start $CONTAINER_NAME"
        echo ""
        exit 0
    fi
    
    # Small delay before next iteration
    sleep 0.5
done
