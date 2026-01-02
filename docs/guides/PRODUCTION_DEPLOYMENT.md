# Production Deployment Guide

## Overview

NOP uses GitHub Actions to build multi-architecture Docker images for both **amd64** (x86_64) and **arm64** (ARM systems like Radxa, Raspberry Pi) platforms. Users simply pull pre-built images from GitHub Container Registry (GHCR) for instant deployment.

## Architecture Support

- ✅ **linux/amd64** - Standard x86_64 systems
- ✅ **linux/arm64** - ARM64 systems (Radxa Rock, Raspberry Pi 4/5, etc.)

## Deployment Methods

### Method 1: Automated Script (Recommended)

```bash
git clone https://github.com/goranjovic55/NOP.git
cd NOP
./deploy.sh
```

The script automatically:
- Detects system architecture
- Creates required directories
- Initializes configuration
- Pulls correct multi-arch images
- Starts all services

### Method 2: Manual Deployment

```bash
# Clone repository
git clone https://github.com/goranjovic55/NOP.git
cd NOP

# Configure environment
cp .env.example .env
nano .env  # Edit passwords and settings

# Create directories
mkdir -p volumes/evidence volumes/logs

# Deploy
docker compose pull
docker compose up -d
```

### Method 3: Local Build (Development)

For development or customization:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

This builds all images locally from source.

## Image Registry

All production images are hosted on GitHub Container Registry:

- `ghcr.io/goranjovic55/nop-frontend:latest`
- `ghcr.io/goranjovic55/nop-backend:latest`
- `ghcr.io/goranjovic55/nop-guacd:latest`

Docker automatically pulls the correct architecture variant for your system.

## Build Process

### Automated CI/CD

GitHub Actions automatically builds and pushes multi-arch images on:
- Push to `main` branch
- New releases
- Manual workflow dispatch

Workflow: `.github/workflows/build-images.yml`

### Manual Multi-Arch Build

To build and push images manually:

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build and push backend
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/goranjovic55/nop-backend:latest \
  --push ./backend

# Build and push frontend
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/goranjovic55/nop-frontend:latest \
  --push ./frontend

# Build and push guacd
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/goranjovic55/nop-guacd:latest \
  --push ./docker/guacd
```

## Configuration

### Essential Settings (.env)

```bash
# Security (CHANGE THESE!)
SECRET_KEY=your-secret-key-change-this-to-random-string
ADMIN_PASSWORD=changeme

# Network Interface
NETWORK_INTERFACE=eth0  # Change to your network interface

# Database
POSTGRES_PASSWORD=nop_password  # Change for production
```

### Network Interface Detection

Find your network interface:

```bash
ip link show
# or
ifconfig
```

Common interfaces:
- `eth0` - Ethernet
- `wlan0` - WiFi
- `enp1s0` - Modern naming scheme

## Post-Deployment

### Verify Services

```bash
docker compose ps
```

All services should show "Up" status.

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
```

### Access Application

- Frontend: http://localhost:12000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

Default login:
- Username: `admin`
- Password: See `ADMIN_PASSWORD` in `.env`

## Troubleshooting

### Images Not Pulling

Check if images exist:
```bash
docker manifest inspect ghcr.io/goranjovic55/nop-backend:latest
```

Force pull specific architecture:
```bash
docker pull --platform linux/arm64 ghcr.io/goranjovic55/nop-backend:latest
```

### Permission Issues

Ensure Docker can run without sudo:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### ARM64 Performance

On ARM systems, ensure:
- Sufficient RAM (4GB+ recommended)
- Docker BuildKit enabled: `export DOCKER_BUILDKIT=1`

## Updating

Pull latest images and restart:

```bash
docker compose pull
docker compose up -d
```

## Cleanup

```bash
# Stop services
docker compose down

# Remove data (WARNING: Deletes all data)
docker compose down -v
```

## ARM-Specific Notes

### Radxa Rock / Raspberry Pi

1. **Memory**: Ensure 4GB+ RAM for full stack
2. **Storage**: Use fast SD card or SSD for better performance
3. **Networking**: Some tools like `hping3` may have limited ARM support
4. **Build Time**: Local builds take longer on ARM; use pre-built images

### Known Limitations on ARM

- PostgreSQL runs on amd64 via QEMU emulation (minimal performance impact for small deployments)
- Some network tools (`hping3`, advanced nmap features) may have reduced functionality

## Security Hardening

For production deployments:

1. **Change all default passwords** in `.env`
2. **Generate strong SECRET_KEY**: `openssl rand -hex 32`
3. **Use firewall** to restrict access
4. **Enable SSL/TLS** (see `.env` SSL settings)
5. **Regular updates**: `docker compose pull && docker compose up -d`

## Support

- Documentation: `docs/`
- Issues: https://github.com/goranjovic55/NOP/issues
- Logs: `docker compose logs -f`
