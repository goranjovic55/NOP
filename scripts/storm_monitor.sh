#!/bin/bash
# Storm Monitor - Detects high PPS and shuts down service port
# Usage: ./storm_monitor.sh <threshold_pps> <container_name> <port> [log_file]

set -e

# Configuration
THRESHOLD_PPS=${1:-1000}
CONTAINER_NAME=${2:-"nop-vulnerable-web-1"}
TARGET_PORT=${3:-80}
LOG_FILE=${4:-"storm_monitor_$(date +%Y%m%d_%H%M%S).log"}
INTERFACE="any"  # Monitor all interfaces
SAMPLE_INTERVAL=1  # seconds
DETECTION_COUNT=0
STORM_DETECTED=false

# Redirect output to log file if specified
if [ "$LOG_FILE" != "-" ]; then
    exec > >(tee -a "$LOG_FILE") 2>&1
fi

echo "=========================================="
echo "STORM MONITOR - Auto-Shutdown on High PPS"
echo "=========================================="
echo "Target Container: $CONTAINER_NAME"
echo "Target Port: $TARGET_PORT"
echo "PPS Threshold: $THRESHOLD_PPS"
echo "Monitoring Interface: $INTERFACE"
echo "Sample Interval: ${SAMPLE_INTERVAL}s"
echo "Log File: $LOG_FILE"
echo "Started: $(date)"
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
MAX_PPS=0
TOTAL_SAMPLES=0
TOTAL_PPS=0
START_TIME=$(date +%s)

# Detection hook function
log_detection() {
    local pps=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚨 STORM DETECTED!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Timestamp: $timestamp"
    echo "PPS: $pps"
    echo "Threshold: $THRESHOLD_PPS"
    echo "Exceeded by: $((pps - THRESHOLD_PPS)) PPS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

while true; do
    # Count packets in the interval
    CURRENT_TIME=$(date +%s)
    
    # Get packet count from tcpdump (run for SAMPLE_INTERVAL seconds)
    PACKET_COUNT=$(docker exec $CONTAINER_NAME timeout ${SAMPLE_INTERVAL}s tcpdump -i $INTERFACE -nn -q 2>/dev/null | wc -l)
    
    # Calculate PPS
    PPS=$((PACKET_COUNT / SAMPLE_INTERVAL))
    
    # Update statistics
    TOTAL_SAMPLES=$((TOTAL_SAMPLES + 1))
    TOTAL_PPS=$((TOTAL_PPS + PPS))
    if [ $PPS -gt $MAX_PPS ]; then
        MAX_PPS=$PPS
    fi
    
    # Display current status
    TIMESTAMP=$(date '+%H:%M:%S')
    ELAPSED=$((CURRENT_TIME - START_TIME))
    AVG_PPS=$((TOTAL_PPS / TOTAL_SAMPLES))
    
    if [ $PPS -lt $THRESHOLD_PPS ]; then
        # Normal operation
        echo "[$TIMESTAMP] 📊 PPS: $PPS | Avg: $AVG_PPS | Peak: $MAX_PPS | Status: ✓ NORMAL | Elapsed: ${ELAPSED}s"
    else
        # Threshold exceeded
        DETECTION_COUNT=$((DETECTION_COUNT + 1))
        
        if [ "$STORM_DETECTED" = false ]; then
            STORM_DETECTED=true
            log_detection $PPS
        fi
        
        echo "[$TIMESTAMP] 🚨 PPS: $PPS | Status: ⚠️  THRESHOLD EXCEEDED! (Detection #$DETECTION_COUNT)"
        
        # Shutdown after first detection (or configure for multiple detections)
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🛑 INITIATING SHUTDOWN SEQUENCE"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Log final statistics
        echo ""
        echo "📊 FINAL STATISTICS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Monitor Duration: ${ELAPSED}s"
        echo "Total Samples: $TOTAL_SAMPLES"
        echo "Average PPS: $AVG_PPS"
        echo "Peak PPS: $MAX_PPS"
        echo "Detections: $DETECTION_COUNT"
        echo "Shutdown Reason: Storm threshold exceeded"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        # Shutdown the service by stopping the container
        echo "⏸️  Stopping container: $CONTAINER_NAME"
        docker stop $CONTAINER_NAME >/dev/null 2>&1
        
        echo "✓ Container stopped at $(date '+%Y-%m-%d %H:%M:%S')"
        echo "📊 Final PPS: $PPS"
        echo ""
        echo "To restart the container, run:"
        echo "  docker start $CONTAINER_NAME"
        echo ""
        exit 0
    fi
    
    # Small delay before next iteration
    sleep 0.5
done
