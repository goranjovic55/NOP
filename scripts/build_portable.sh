#!/bin/bash
#
# Main build script for NOP portable executable
# Handles both frontend and backend builds
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Network Observatory Platform Builder     ║${NC}"
echo -e "${BLUE}║  Portable Executable (Nuitka)             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
SKIP_FRONTEND=false
PLATFORM="auto"
BUILD_TYPE="full"

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --minimal|--no-offensive)
            BUILD_TYPE="$1"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-frontend     Skip frontend build"
            echo "  --platform PLATFORM Specify platform (linux/windows/macos/auto)"
            echo "  --minimal          Build minimal version"
            echo "  --no-offensive     Build without offensive tools"
            echo "  --help             Show this help"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Step 1: Build Frontend
if [ "$SKIP_FRONTEND" = false ]; then
    echo -e "${YELLOW}[1/3] Building Frontend...${NC}"
    echo ""
    
    cd "$PROJECT_ROOT/frontend"
    
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    echo "Building React application..."
    npm run build
    
    if [ ! -d "build" ]; then
        echo -e "${RED}Frontend build failed!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Frontend build complete${NC}"
    echo ""
else
    echo -e "${YELLOW}[1/3] Skipping frontend build${NC}"
    echo ""
fi

# Step 2: Install Backend Dependencies
echo -e "${YELLOW}[2/3] Installing Backend Dependencies...${NC}"
echo ""

cd "$PROJECT_ROOT/backend"

echo "Installing Python dependencies..."
pip install -q -r requirements.txt
pip install -q -r requirements-portable.txt

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Build Portable Executable
echo -e "${YELLOW}[3/3] Building Portable Executable...${NC}"
echo ""

if [ -f "build_nuitka.sh" ]; then
    bash build_nuitka.sh --platform "$PLATFORM" $BUILD_TYPE
else
    echo -e "${RED}Build script not found!${NC}"
    exit 1
fi

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Build Complete!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Find the built executable
EXECUTABLE=$(find "$PROJECT_ROOT/backend/dist" -name "nop-portable*" -type f | head -n 1)

if [ -n "$EXECUTABLE" ]; then
    SIZE=$(du -h "$EXECUTABLE" | cut -f1)
    echo -e "${BLUE}Executable:${NC} $(basename "$EXECUTABLE")"
    echo -e "${BLUE}Location:${NC} $EXECUTABLE"
    echo -e "${BLUE}Size:${NC} $SIZE"
    echo ""
    echo -e "${YELLOW}Quick Start:${NC}"
    echo "  1. Initialize: $EXECUTABLE --init"
    echo "  2. Run server: $EXECUTABLE"
    echo "  3. Open browser: http://localhost:8080"
    echo ""
else
    echo -e "${RED}Warning: Could not find executable${NC}"
fi

# Create release package
echo -e "${YELLOW}Create release package? [y/N]${NC} "
read -r CREATE_PACKAGE

if [[ "$CREATE_PACKAGE" =~ ^[Yy]$ ]]; then
    echo "Creating release package..."
    
    PACKAGE_DIR="$PROJECT_ROOT/backend/dist/package"
    mkdir -p "$PACKAGE_DIR"
    
    # Copy executable
    if [ -n "$EXECUTABLE" ]; then
        cp "$EXECUTABLE" "$PACKAGE_DIR/"
    fi
    
    # Copy documentation
    cp "$PROJECT_ROOT/PORTABLE_BUILD.md" "$PACKAGE_DIR/README.md"
    
    # Create example config
    cat > "$PACKAGE_DIR/config.example.yaml" << 'EOF'
# NOP Configuration Example
# Copy to ~/.nop/config.yaml and customize

server:
  host: 0.0.0.0
  port: 8080
  workers: 4

network:
  interface: null  # auto-detect
  promiscuous: true

features:
  packet_capture: true
  network_scanning: true
  asset_discovery: true
EOF
    
    # Create archive
    cd "$PROJECT_ROOT/backend/dist"
    ARCHIVE_NAME="nop-portable-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m)-v1.0.0.tar.gz"
    tar -czf "$ARCHIVE_NAME" -C package .
    
    echo -e "${GREEN}✓ Release package created: $ARCHIVE_NAME${NC}"
fi

echo ""
echo -e "${GREEN}All done! 🎉${NC}"
