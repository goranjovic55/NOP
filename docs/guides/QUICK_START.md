---
title: Quick Start Guide
type: tutorial
difficulty: beginner
time_minutes: 10
prerequisites:
  - Docker 20.10+
  - Docker Compose 2.0+
  - 8GB RAM minimum
last_updated: 2026-01-14
---

# Quick Start Guide - NOP

Get up and running with the Network Observatory Platform in minutes.

## Prerequisites

- **Docker** version 20.10 or higher
- **Docker Compose** version 2.0 or higher
- **Git** for cloning the repository
- At least **8GB RAM** available
- At least **75GB disk space** for production use

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/NOP.git
cd NOP
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to set your configuration:

```bash
# Essential settings
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET_KEY=your_secret_key_here
ADMIN_PASSWORD=admin123

# Optional: Customize ports
FRONTEND_PORT=12000
BACKEND_PORT=12001
```

### 2. Start Services

Start the core platform services:

```bash
docker compose up -d
```

This starts:
- Frontend (React UI)
- Backend (FastAPI)
- PostgreSQL database
- Redis cache
- ntopng traffic analyzer

Optional - Start test environment for protocol testing:

```bash
docker compose -f docker-compose.test.yml up -d
```

### 3. Access Platform

Once services are running:

- **Web Interface**: http://localhost:12000
- **API Documentation**: http://localhost:12001/docs

**Default Credentials**: `admin` / `admin123` (⚠️ change immediately!)

---

## Steps

### Step 1: First Login

1. Navigate to http://localhost:12000
2. Login with `admin` / `admin123`
3. **Change password immediately** after first login

### Step 2: Enable Network Discovery

1. Go to **Settings** → **Discovery**
2. Enable **Passive Discovery**
3. Select network interface
4. Assets appear in **Assets** page as traffic is detected

### Step 3: View Network Topology

1. Go to **Topology** page
2. View discovered hosts and connections
3. Hover over nodes/links for details
4. Use filters to adjust traffic threshold

### Step 4: Connect to Remote Host

1. Go to **Access Hub**
2. Click **New Connection**
3. Select protocol (SSH/RDP/VNC)
4. Enter host, credentials
5. Click **Connect**

---

## Configuration

Common configuration tasks:

```bash
# Edit environment variables
nano .env

# Set custom ports
FRONTEND_PORT=12000
BACKEND_PORT=12001

# Set secure passwords
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET_KEY=your_secret_key_here
ADMIN_PASSWORD=admin123

# Restart services to apply
docker compose restart
```

---

## Common Tasks

### Run Active Scan

```bash
# From Assets page
Assets → Start Discovery → Select Profile → Execute
```

Profiles:
- **Light**: Fast ping sweep
- **Medium**: Service detection  
- **Deep**: Full port scan with OS detection

### Advanced Ping Test

```bash
# From Traffic page
Traffic → Advanced Ping → Select Protocol → Configure → Execute
```

Protocols: ICMP, TCP, UDP, HTTP/HTTPS

---

## Test Environment

If using test environment (`docker-compose.test.yml`), use these credentials:

| Service | Host | Username | Password |
|---------|------|----------|----------|
| SSH | ssh-server | testuser | testpass123 |
| VNC | vnc-server | vncuser | vnc123 |
| RDP | rdp-server | rdpuser | rdp123 |

---

## Troubleshooting

### Services Won't Start

**Problem**: Containers fail to start

**Solution**:
```bash
# Check logs
docker compose logs -f

# Verify ports not in use
netstat -tuln | grep -E '12000|12001|5432'

# Restart services
docker compose down && docker compose up -d
```

### Can't Access Web Interface

**Problem**: Frontend not loading at localhost:12000

**Solution**:
1. Check frontend status: `docker compose ps frontend`
2. View logs: `docker compose logs frontend`
3. Verify firewall allows port 12000

### Database Connection Errors

**Problem**: Backend can't connect to database

**Solution**:
1. Check PostgreSQL: `docker compose ps postgres`
2. Verify credentials in `.env`
3. Reset if needed: `docker compose down -v && docker compose up -d`

### Network Discovery Not Working

**Problem**: No assets being discovered

**Solution**:
```bash
# Ensure NET_ADMIN capability in docker-compose.yml
# Verify passive discovery enabled in Settings
# Check network interface selection
```

---

## Best Practices

- ✅ Change default passwords immediately
- ✅ Use HTTPS in production (configure reverse proxy)
- ✅ Restrict network access to the platform
- ✅ Regularly update Docker images
- ✅ Enable firewall rules
- ✅ Review access logs regularly

---

## Related Resources

- [Configuration Guide](CONFIGURATION.md) - Detailed settings
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [API Documentation](../technical/API_rest_v1.md) - REST API reference
- [Implemented Features](../features/IMPLEMENTED_FEATURES.md) - Complete feature list

---

**Document Version**: 2.0  
**Last Updated**: 2026-01-05  
**Status**: Production Ready
