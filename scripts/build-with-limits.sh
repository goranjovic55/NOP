#!/bin/bash
# Build script with resource limits to prevent build process from consuming too many resources

set -e

# Build resource limits
export DOCKER_BUILDKIT=1
MEMORY_LIMIT="4g"
CPU_QUOTA="200000"  # 2 CPUs (100000 = 1 CPU)

echo "Building with resource limits:"
echo "  Memory: ${MEMORY_LIMIT}"
echo "  CPUs: 2.0"
echo ""

# Build backend with limits
echo "Building backend..."
docker build \
  --memory="${MEMORY_LIMIT}" \
  --cpu-quota="${CPU_QUOTA}" \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t nop-backend \
  -f backend/Dockerfile \
  backend/

# Build frontend with limits
echo "Building frontend..."
docker build \
  --memory="${MEMORY_LIMIT}" \
  --cpu-quota="${CPU_QUOTA}" \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t nop-frontend \
  -f frontend/Dockerfile \
  frontend/

echo ""
echo "✓ Build complete with resource limits applied"
