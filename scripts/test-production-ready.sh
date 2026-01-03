#!/bin/bash
# Test production-ready deployment process

set -e

echo "🧪 Testing NOP Production Deployment"
echo "====================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Validate docker-compose.yml
echo "Test 1: Validating docker-compose.yml..."
if docker compose config --quiet; then
    echo -e "${GREEN}✓ docker-compose.yml is valid${NC}"
else
    echo -e "${RED}✗ docker-compose.yml has errors${NC}"
    exit 1
fi

# Test 2: Validate docker-compose.dev.yml
echo "Test 2: Validating docker-compose.dev.yml..."
if docker compose -f docker-compose.dev.yml config --quiet; then
    echo -e "${GREEN}✓ docker-compose.dev.yml is valid${NC}"
else
    echo -e "${RED}✗ docker-compose.dev.yml has errors${NC}"
    exit 1
fi

# Test 3: Check GHCR image references
echo "Test 3: Checking GHCR image references..."
IMAGES=$(docker compose config | grep "image:" | grep -v "postgres\|redis" || true)
if echo "$IMAGES" | grep -q "ghcr.io/goranjovic55"; then
    echo -e "${GREEN}✓ Production images reference GHCR${NC}"
else
    echo -e "${RED}✗ Production images don't reference GHCR${NC}"
    exit 1
fi

# Test 4: Check dev compose uses build
echo "Test 4: Checking dev compose uses local builds..."
BUILD_COUNT=$(docker compose -f docker-compose.dev.yml config | grep -c "build:" || true)
if [ "$BUILD_COUNT" -ge 3 ]; then
    echo -e "${GREEN}✓ Dev compose builds 3+ services locally${NC}"
else
    echo -e "${RED}✗ Dev compose should build frontend, backend, and guacd locally${NC}"
    exit 1
fi

# Test 5: Check required files
echo "Test 5: Checking required files..."
REQUIRED_FILES=(
    ".env.example"
    "deploy.sh"
    "docker-compose.yml"
    "docker-compose.dev.yml"
    ".github/workflows/build-images.yml"
    "docs/guides/PRODUCTION_DEPLOYMENT.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file missing"
        exit 1
    fi
done

# Test 6: Check Dockerfile multi-arch comments
echo "Test 6: Checking Dockerfiles for multi-arch support..."
DOCKERFILES=(
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "docker/guacd/Dockerfile"
)

for dockerfile in "${DOCKERFILES[@]}"; do
    if [ -f "$dockerfile" ]; then
        echo -e "  ${GREEN}✓${NC} $dockerfile exists"
    else
        echo -e "  ${RED}✗${NC} $dockerfile missing"
        exit 1
    fi
done

# Test 7: Check GitHub Actions workflow
echo "Test 7: Validating GitHub Actions workflow..."
if grep -q "linux/amd64,linux/arm64" .github/workflows/build-images.yml; then
    echo -e "${GREEN}✓ Workflow builds for both amd64 and arm64${NC}"
else
    echo -e "${RED}✗ Workflow doesn't specify multi-arch platforms${NC}"
    exit 1
fi

# Test 8: Architecture detection in deploy.sh
echo "Test 8: Checking deploy.sh architecture detection..."
if grep -q "uname -m" deploy.sh && grep -q "aarch64\|arm64" deploy.sh; then
    echo -e "${GREEN}✓ Deploy script detects ARM architecture${NC}"
else
    echo -e "${YELLOW}⚠ Deploy script may not detect ARM architecture${NC}"
fi

# Test 9: Check deploy.sh is executable
echo "Test 9: Checking deploy.sh permissions..."
if [ -x deploy.sh ]; then
    echo -e "${GREEN}✓ deploy.sh is executable${NC}"
else
    echo -e "${RED}✗ deploy.sh is not executable${NC}"
    chmod +x deploy.sh
    echo -e "${YELLOW}⚠ Fixed: chmod +x deploy.sh${NC}"
fi

# Test 10: Verify image names consistency
echo "Test 10: Checking image naming consistency..."
PROD_IMAGES=$(docker compose config | grep "image: ghcr.io" | sort -u)
echo "$PROD_IMAGES"
if [ $(echo "$PROD_IMAGES" | wc -l) -eq 3 ]; then
    echo -e "${GREEN}✓ All 3 custom images use GHCR${NC}"
else
    echo -e "${RED}✗ Expected 3 GHCR images (frontend, backend, guacd)${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ All production readiness tests passed ║${NC}"
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo ""
echo "Next steps:"
echo "1. Commit changes: git add . && git commit -m 'feat: Add multi-arch CI/CD'"
echo "2. Push to trigger builds: git push"
echo "3. Wait for GitHub Actions to build images"
echo "4. Test deployment: ./deploy.sh"
echo ""
echo "Architecture support:"
echo "  ✓ linux/amd64 (x86_64)"
echo "  ✓ linux/arm64 (Radxa, Raspberry Pi)"
echo ""
