# Multi-Architecture Docker Deployment

## Overview

NOP supports **multi-architecture Docker images** for both **amd64** (x86_64) and **arm64** (aarch64) platforms. Docker automatically detects your system architecture and pulls the correct image.

## How It Works

### 1. Automated Builds (GitHub Actions)

The [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) workflow:
- Triggers on push to `main` when backend/frontend changes
- Uses **QEMU** to emulate arm64 on amd64 GitHub runners
- Uses **Docker Buildx** to build for multiple platforms simultaneously
- Creates a **multi-platform manifest** linking both architectures
- Pushes to GitHub Container Registry (GHCR)

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64  # Multi-arch build
    push: true
```

### 2. Automatic Platform Detection

When you run `docker pull ghcr.io/goranjovic55/nop-backend:latest`, Docker:
1. Downloads the **manifest** (contains references to both architectures)
2. Detects your system architecture (via `uname -m`)
3. Automatically pulls the **matching image** for your platform
4. You don't need to specify the architecture manually

## Usage

### Production (Recommended)

Pull pre-built multi-arch images from GHCR:

```bash
git clone https://github.com/goranjovic55/NOP.git
cd NOP
docker compose up -d
```

**Network Configuration:**
- **Backend**: Runs in **host network mode** for direct access to physical network interfaces
- **Frontend/Postgres/Redis**: Run in bridge network mode
- Backend connects to postgres/redis via `localhost:5432` and `localhost:6379`
- Frontend accessible at `http://localhost:12000`
- Backend API at `http://localhost:12001`

**Why host network mode?**
The backend needs to:
- Sniff traffic on real network interfaces (eth0, wlan0, enp1s0, etc.)
- Perform passive network discovery
- Capture packets for analysis
- See the actual host's network topology

Without host mode, the backend only sees container interfaces (eth0 in bridge network), not your actual network interfaces.

The [`docker-compose.yml`](docker-compose.yml) is configured to pull images:

```yaml
services:
  frontend:
    image: ghcr.io/goranjovic55/nop-frontend:latest
    pull_policy: always  # Always check for updates

  backend:
    image: ghcr.io/goranjovic55/nop-backend:latest
    pull_policy: always
```

### Development (Local Builds)

Build from source for your native architecture:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

The [`docker-compose.dev.yml`](docker-compose.dev.yml) builds locally:

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
```

## Supported Platforms

| Platform | Architecture | Status | Notes |
|----------|--------------|--------|-------|
| x86_64 Desktop/Server | `linux/amd64` | ✅ Tested | Primary development platform |
| ARM64 SBCs (Radxa, RPi) | `linux/arm64` | ✅ Tested | Optimized for edge deployment |
| Apple Silicon (M1/M2/M3) | `linux/arm64` | ✅ Compatible | Via Docker Desktop |

## Verifying Architecture

Check what architecture your pulled images are:

```bash
# Check backend image
docker inspect ghcr.io/goranjovic55/nop-backend:latest | grep Architecture

# Check frontend image
docker inspect ghcr.io/goranjovic55/nop-frontend:latest | grep Architecture
```

Expected output on **arm64** system:
```
"Architecture": "arm64"
```

Expected output on **amd64** system:
```
"Architecture": "amd64"
```

## Troubleshooting

### "exec format error"

This means you're trying to run an image built for a different architecture.

**Cause:** Pre-built amd64 image on arm64 system (or vice versa)

**Solution:**
1. Pull latest multi-arch images: `docker compose pull`
2. Restart: `docker compose up -d`

If still failing:
1. Remove old images: `docker rmi ghcr.io/goranjovic55/nop-backend ghcr.io/goranjovic55/nop-frontend`
2. Pull fresh: `docker compose pull`
3. Start: `docker compose up -d`

### Build Fails on GitHub Actions

If the multi-arch build fails in CI:

1. Check QEMU setup in workflow
2. Verify Dockerfile doesn't use architecture-specific binaries
3. Check build logs for platform-specific errors

### Local Build vs Pull Confusion

- **`docker-compose.yml`** - Pulls from GHCR (production)
- **`docker-compose.dev.yml`** - Builds locally (development)

Make sure you're using the right file for your use case.

## Image Registry

Images are published to GitHub Container Registry (GHCR):

- Frontend: `ghcr.io/goranjovic55/nop-frontend:latest`
- Backend: `ghcr.io/goranjovic55/nop-backend:latest`

View in browser:
- https://github.com/goranjovic55/NOP/pkgs/container/nop-frontend
- https://github.com/goranjovic55/NOP/pkgs/container/nop-backend

## Manual Multi-Arch Build

To build multi-arch images locally (requires Docker Buildx):

```bash
# Create buildx builder
docker buildx create --name multiarch --use

# Build and push frontend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/goranjovic55/nop-frontend:latest \
  --push \
  ./frontend

# Build and push backend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/goranjovic55/nop-backend:latest \
  --push \
  ./backend
```

**Note:** Requires authentication to GHCR: `docker login ghcr.io -u goranjovic55`

## Best Practices

1. **Use pre-built images for production** - Faster, consistent across platforms
2. **Use local builds for development** - Faster iteration, no registry dependency
3. **Pin image tags for production** - Use SHA tags for reproducible deployments
4. **Update regularly** - `docker compose pull && docker compose up -d`

## References

- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [Multi-platform Images](https://docs.docker.com/build/building/multi-platform/)
- [QEMU for Cross-Platform Builds](https://github.com/docker/setup-qemu-action)
