# Docker Resource Management Guide

## Runtime Resource Limits

Resource limits are already configured in both `docker-compose.yml` and `docker-compose.test.yml` to ensure safe resource usage.

### Main Application (docker-compose.yml)
| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|--------------|-------------|----------------|
| Frontend | 1.0 | 512M | 0.25 | 128M |
| Backend | 2.0 | 1G | 0.5 | 256M |
| PostgreSQL | 1.0 | 512M | 0.25 | 128M |
| Redis | 0.5 | 256M | 0.1 | 64M |
| Guacd | 1.0 | 512M | 0.25 | 128M |

**Total Maximum**: ~5 CPUs, ~2.75GB RAM

### Test Environment (docker-compose.test.yml)
| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|--------------|-------------|----------------|
| Vulnerable Web | 0.5 | 256M | 0.1 | 64M |
| Vulnerable DB | 0.5 | 256M | 0.1 | 64M |
| Custom Web | 0.25 | 128M | 0.1 | 32M |
| Custom SSH | 0.25 | 128M | 0.1 | 32M |
| Custom FTP | 0.25 | 128M | 0.1 | 32M |
| Custom DB | 0.5 | 256M | 0.1 | 64M |
| Custom File | 0.25 | 128M | 0.1 | 32M |
| Custom VNC | 0.5 | 256M | 0.1 | 64M |
| Custom RDP | 0.5 | 256M | 0.1 | 64M |

**Total Maximum**: ~3.5 CPUs, ~1.5GB RAM

## Build Resource Limits

Docker Compose doesn't directly support build-time resource limits, but you can control build resources using Docker daemon configuration or build arguments.

### Option 1: Global Docker Daemon Configuration

Edit `/etc/docker/daemon.json`:

```json
{
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "10GB"
    }
  },
  "max-concurrent-builds": 2,
  "max-concurrent-downloads": 3,
  "max-concurrent-uploads": 3
}
```

Restart Docker: `sudo systemctl restart docker`

### Option 2: BuildKit Resource Limits

Set environment variables before building:

```bash
# Limit concurrent builds
export DOCKER_BUILDKIT=1
export BUILDKIT_STEP_LOG_MAX_SIZE=10485760  # 10MB
export BUILDKIT_STEP_LOG_MAX_SPEED=1048576  # 1MB/s

# Build with limited parallelism
docker-compose build --parallel 2
```

### Option 3: Build with Resource Constraints

Use Docker build with resource limits:

```bash
# Build individual images with limits
docker build \
  --memory=1g \
  --memory-swap=2g \
  --cpus=2.0 \
  -t nop-frontend ./frontend

docker build \
  --memory=1g \
  --memory-swap=2g \
  --cpus=2.0 \
  -t nop-backend ./backend
```

### Recommended Build Process for New Users

```bash
# 1. Build main application with limited parallelism
docker-compose build --parallel 2

# 2. Start main application
docker-compose up -d

# 3. (Optional) Build test environment separately
docker-compose -f docker-compose.test.yml build --parallel 2

# 4. (Optional) Start test environment
docker-compose -f docker-compose.test.yml up -d
```

## System Requirements

### Minimum Requirements
- **CPU**: 4 cores
- **RAM**: 4GB
- **Disk**: 20GB free space

### Recommended Requirements
- **CPU**: 8+ cores
- **RAM**: 8GB+
- **Disk**: 50GB+ free space

### For Test Environment
- **Additional CPU**: +4 cores
- **Additional RAM**: +2GB
- **Additional Disk**: +10GB

## Monitoring Resource Usage

```bash
# Check container resource usage
docker stats

# Check specific compose project
docker stats $(docker-compose ps -q)

# Check test environment
docker stats $(docker-compose -f docker-compose.test.yml ps -q)
```

## Troubleshooting

### Build Fails with "Out of Memory"
```bash
# Increase Docker daemon memory
# Edit Docker Desktop settings or /etc/docker/daemon.json
{
  "default-ulimits": {
    "memlock": {
      "Hard": -1,
      "Name": "memlock",
      "Soft": -1
    }
  }
}
```

### Build is Too Slow
```bash
# Use build cache and parallel builds
docker-compose build --parallel 4

# Or build only specific services
docker-compose build frontend backend
```

### Containers Using Too Much Memory
Resource limits are already configured. If you need stricter limits:
```bash
# Reduce limits in docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '0.5'  # Reduce from 1.0
      memory: 256M  # Reduce from 512M
```

## Production Deployment Notes

For production environments:
1. Adjust resource limits based on actual load
2. Monitor resource usage over time
3. Consider horizontal scaling (multiple instances)
4. Use Docker Swarm or Kubernetes for orchestration
5. Implement proper logging and monitoring (Prometheus, Grafana)
