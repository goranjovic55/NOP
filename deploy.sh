#!/bin/bash
# Production deployment script for NOP
# Supports: amd64, arm64 (Radxa, Raspberry Pi, etc.)

set -e

echo "🚀 NOP Production Deployment"
echo "============================="
echo ""

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        echo "✓ Detected architecture: AMD64"
        ;;
    aarch64|arm64)
        echo "✓ Detected architecture: ARM64"
        ;;
    *)
        echo "⚠️  Unknown architecture: $ARCH"
        echo "   Supported: x86_64 (amd64), aarch64/arm64"
        echo "   Attempting to continue..."
        ;;
esac

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "   Install: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    echo "   Install: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker and Docker Compose found"
echo ""

# Check if .env exists, create from example if not
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Edit .env and change default passwords!"
    echo ""
fi

# Create required directories
echo "📁 Creating required directories..."
mkdir -p volumes/evidence volumes/logs
echo "✓ Directories created"
echo ""

# Pull latest images
echo "📥 Pulling latest multi-arch images from GitHub Container Registry..."
echo "   This automatically downloads the correct architecture for your system"
docker compose pull

echo ""
echo "🐳 Starting NOP services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service health
echo ""
echo "🔍 Service Status:"
docker compose ps

echo ""
echo "✅ NOP Deployment Complete!"
echo ""
echo "📍 Access Points:"
echo "   Frontend:  http://localhost:12000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "🔐 Default Credentials:"
echo "   Username: admin"
echo "   Password: (check your .env file - ADMIN_PASSWORD)"
echo ""
echo "⚠️  Security Reminder:"
echo "   1. Change default passwords in .env"
echo "   2. Update SECRET_KEY in .env"
echo "   3. Configure network interface (NETWORK_INTERFACE in .env)"
echo ""
echo "📚 Documentation: docs/"
echo "🐛 Logs: docker compose logs -f"
echo "🛑 Stop: docker compose down"
echo ""
