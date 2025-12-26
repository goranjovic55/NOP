#!/bin/bash
#
# Build NOP portable executable using Nuitka
# This creates a single, optimized executable with all dependencies
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}NOP Portable Build Script (Nuitka)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running from correct directory
if [ ! -f "portable_main.py" ]; then
    echo -e "${RED}Error: Must run from backend/ directory${NC}"
    exit 1
fi

# Parse arguments
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
BUILD_TYPE="full"
USE_CLANG=false
JOBS=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

while [[ $# -gt 0 ]]; do
    case $1 in
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        --minimal)
            BUILD_TYPE="minimal"
            shift
            ;;
        --no-offensive)
            BUILD_TYPE="no-offensive"
            shift
            ;;
        --clang)
            USE_CLANG=true
            shift
            ;;
        --jobs)
            JOBS="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}Build Configuration:${NC}"
echo "  Platform: $PLATFORM"
echo "  Build Type: $BUILD_TYPE"
echo "  Parallel Jobs: $JOBS"
echo "  Using Clang: $USE_CLANG"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 not found${NC}"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "  Python version: $PYTHON_VERSION"

# Install Nuitka if not present
if ! python3 -c "import nuitka" 2>/dev/null; then
    echo -e "${YELLOW}Installing Nuitka...${NC}"
    pip install nuitka ordered-set
else
    echo "  Nuitka: installed"
fi

# Check for frontend build
FRONTEND_BUILD="../frontend/build"
if [ ! -d "$FRONTEND_BUILD" ]; then
    echo -e "${YELLOW}Frontend build not found. Building...${NC}"
    cd ../frontend
    
    if [ ! -d "node_modules" ]; then
        echo "  Installing npm dependencies..."
        npm install
    fi
    
    echo "  Building React frontend..."
    npm run build
    cd ../backend
    
    if [ ! -d "$FRONTEND_BUILD" ]; then
        echo -e "${RED}Error: Frontend build failed${NC}"
        exit 1
    fi
else
    echo "  Frontend build: found"
fi

# Check for C compiler
if [ "$USE_CLANG" = true ]; then
    export CC=clang
    export CXX=clang++
    echo "  C Compiler: clang"
elif command -v gcc &> /dev/null; then
    echo "  C Compiler: gcc"
else
    echo -e "${RED}Error: No C compiler found. Please install gcc or clang${NC}"
    exit 1
fi

# Check for ccache (speeds up compilation)
if command -v ccache &> /dev/null; then
    export CC="ccache $CC"
    export CXX="ccache $CXX"
    echo "  Using ccache for faster builds"
fi

echo ""
echo -e "${GREEN}Starting Nuitka compilation...${NC}"
echo "This may take 5-15 minutes depending on your system."
echo ""

# Build output name based on platform
if [ "$PLATFORM" = "linux" ]; then
    OUTPUT_NAME="nop-portable-linux"
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        OUTPUT_NAME="nop-portable-linux-amd64"
    elif [ "$ARCH" = "aarch64" ]; then
        OUTPUT_NAME="nop-portable-linux-arm64"
    fi
elif [ "$PLATFORM" = "darwin" ]; then
    OUTPUT_NAME="nop-portable-macos"
elif [[ "$PLATFORM" =~ ^win ]]; then
    OUTPUT_NAME="nop-portable-windows.exe"
else
    OUTPUT_NAME="nop-portable"
fi

# Base Nuitka options
NUITKA_OPTS=(
    --standalone
    --onefile
    --follow-imports
    --assume-yes-for-downloads
    --output-filename="$OUTPUT_NAME"
    --output-dir=dist
    --remove-output
)

# Add frontend static files
NUITKA_OPTS+=(
    --include-data-dir="$FRONTEND_BUILD=frontend_build"
)

# Add plugins
NUITKA_OPTS+=(
    --enable-plugin=anti-bloat
)

# Python package inclusions
NUITKA_OPTS+=(
    --include-package=app
    --include-package=fastapi
    --include-package=uvicorn
    --include-package=sqlalchemy
    --include-package=pydantic
)

# Exclude unnecessary packages to reduce size
NUITKA_OPTS+=(
    --nofollow-import-to=pytest
    --nofollow-import-to=black
    --nofollow-import-to=mypy
    --nofollow-import-to=IPython
    --nofollow-import-to=jupyter
)

# Build type specific options
if [ "$BUILD_TYPE" = "minimal" ]; then
    echo "Building minimal version (monitoring only)..."
    NUITKA_OPTS+=(
        --nofollow-import-to=nmap
        --nofollow-import-to=paramiko
        --nofollow-import-to=scapy
    )
elif [ "$BUILD_TYPE" = "no-offensive" ]; then
    echo "Building without offensive tools..."
    NUITKA_OPTS+=(
        --nofollow-import-to=nmap
    )
fi

# Performance optimizations
NUITKA_OPTS+=(
    --jobs="$JOBS"
    --lto=yes
)

# Platform-specific options
if [ "$PLATFORM" = "linux" ]; then
    NUITKA_OPTS+=(
        --linux-onefile-icon=../assets/icon.png
    )
elif [ "$PLATFORM" = "darwin" ]; then
    NUITKA_OPTS+=(
        --macos-create-app-bundle
    )
elif [[ "$PLATFORM" =~ ^win ]]; then
    NUITKA_OPTS+=(
        --windows-icon-from-ico=../assets/icon.ico
        --windows-company-name="NOP"
        --windows-product-name="Network Observatory Platform"
        --windows-file-version="1.0.0.0"
        --windows-product-version="1.0.0"
    )
fi

# Run Nuitka
echo -e "${GREEN}Running Nuitka compiler...${NC}"
python3 -m nuitka "${NUITKA_OPTS[@]}" portable_main.py

# Check if build succeeded
if [ -f "dist/$OUTPUT_NAME" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Build Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    # Get file size
    SIZE=$(du -h "dist/$OUTPUT_NAME" | cut -f1)
    echo "Output file: dist/$OUTPUT_NAME"
    echo "File size: $SIZE"
    echo ""
    
    # Make executable (Unix-like systems)
    if [[ ! "$PLATFORM" =~ ^win ]]; then
        chmod +x "dist/$OUTPUT_NAME"
        echo "Made executable with chmod +x"
    fi
    
    # Show next steps
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Test the executable:"
    echo "     cd dist && ./$OUTPUT_NAME --version"
    echo ""
    echo "  2. Initialize on first run:"
    echo "     ./$OUTPUT_NAME --init"
    echo ""
    echo "  3. Start the server:"
    echo "     ./$OUTPUT_NAME"
    echo ""
    
    exit 0
else
    echo -e "${RED}Build failed!${NC}"
    echo "Check the output above for errors."
    exit 1
fi
