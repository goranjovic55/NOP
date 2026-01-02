#!/bin/bash
# Connect main NOP services to test-network for debugging vulnerable hosts
# Run this AFTER starting both docker-compose.yml and docker-compose.test.yml

set -e

NETWORK_NAME="test-network"
BACKEND_CONTAINER="nop-backend-1"
GUACD_CONTAINER="nop-guacd-1"

# Check if test-network exists
if ! docker network inspect $NETWORK_NAME >/dev/null 2>&1; then
    echo "❌ Network '$NETWORK_NAME' not found. Start test compose first:"
    echo "   docker-compose -f docker-compose.test.yml up -d"
    exit 1
fi

# Connect backend to test-network
if docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
    if docker network inspect $NETWORK_NAME | grep -q $BACKEND_CONTAINER; then
        echo "✓ $BACKEND_CONTAINER already connected to $NETWORK_NAME"
    else
        echo "Connecting $BACKEND_CONTAINER to $NETWORK_NAME..."
        docker network connect $NETWORK_NAME $BACKEND_CONTAINER
        echo "✓ $BACKEND_CONTAINER connected"
    fi
else
    echo "⚠ $BACKEND_CONTAINER not running, skipping"
fi

# Connect guacd to test-network
if docker ps --format '{{.Names}}' | grep -q "^${GUACD_CONTAINER}$"; then
    if docker network inspect $NETWORK_NAME | grep -q $GUACD_CONTAINER; then
        echo "✓ $GUACD_CONTAINER already connected to $NETWORK_NAME"
    else
        echo "Connecting $GUACD_CONTAINER to $NETWORK_NAME..."
        docker network connect $NETWORK_NAME $GUACD_CONTAINER
        echo "✓ $GUACD_CONTAINER connected"
    fi
else
    echo "⚠ $GUACD_CONTAINER not running, skipping"
fi

echo ""
echo "✅ Main services connected to test-network"
echo "   Backend can now access test hosts at 172.21.0.x addresses"
