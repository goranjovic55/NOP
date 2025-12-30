#!/bin/bash
# Create external test-network for NOP project
# This network is shared between docker-compose.yml and docker-compose.test.yml

NETWORK_NAME="test-network"
SUBNET="172.21.0.0/16"

# Check if network already exists
if docker network inspect $NETWORK_NAME >/dev/null 2>&1; then
    echo "✓ Network '$NETWORK_NAME' already exists"
else
    echo "Creating network '$NETWORK_NAME' with subnet $SUBNET..."
    docker network create \
        --driver bridge \
        --subnet=$SUBNET \
        $NETWORK_NAME
    echo "✓ Network '$NETWORK_NAME' created successfully"
fi
