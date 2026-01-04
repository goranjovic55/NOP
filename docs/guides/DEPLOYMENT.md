# Network Observatory Platform - Deployment Guide
## Installation & Configuration Manual v2.0

**Last Updated**: 2026-01-04

---

## Quick Start

### Pre-built Images (Recommended)

```bash
# Clone repository
git clone https://github.com/goranjovic55/NOP.git
cd NOP

# Pull and start (uses GitHub Container Registry)
docker compose pull
docker compose up -d

# Access application
# Frontend: http://localhost:12000
# Backend API: http://localhost:12001
```

**Default Credentials**: `admin` / `changeme` (**change immediately**)

### Development Setup (Build from Source)

```bash
# Clone repository
git clone https://github.com/goranjovic55/NOP.git
cd NOP

# Build and start using dev compose file
docker compose -f docker-compose.dev.yml up -d --build

# View logs
docker compose -f docker-compose.dev.yml logs -f
```

---

## Prerequisites

### Hardware Requirements

**Minimum (Small Network: <50 devices)**
- CPU: 4 cores ARM64/x86_64
- RAM: 4 GB
- Storage: 50 GB
- Network: 1 Gbps Ethernet

**Recommended (Medium Network: 50-250 devices)**
- CPU: 8 cores ARM64/x86_64
- RAM: 8 GB
- Storage: 100 GB NVMe
- Network: 2.5 Gbps Ethernet

**Optimal (Large Network: 250-500+ devices)**
- CPU: 16 cores x86_64
- RAM: 16 GB
- Storage: 250 GB NVMe
- Network: 10 Gbps Ethernet

### Software Requirements

- **OS**: Ubuntu 22.04 LTS (ARM64 or x86_64) or similar
- **Docker**: 24.0.0+
- **Docker Compose**: 2.20.0+
- **Git**: 2.34.0+

### Network Requirements

- Network access to segment being monitored
- Promiscuous mode capability on network interface
- Ports: 12000 (frontend), 12001 (backend), 5432 (postgres), 6379 (redis)
- Internet access for initial setup and container pulls

---

## Docker Management

### Quick Rebuild (Development)

For testing code changes quickly:

```bash
# Stop containers
docker compose down

# Rebuild specific service
docker compose build --no-cache backend
docker compose build --no-cache frontend

# Start containers
docker compose up -d

# Check logs
docker compose logs -f backend frontend
```

### Full System Rebuild

Complete rebuild of all images and containers:

```bash
# Stop and remove everything
docker compose down -v

# Prune Docker system (removes unused images)
docker system prune -af --volumes

# Rebuild all services
docker compose build --no-cache

# Start all services
docker compose up -d

# Verify status
docker compose ps
```

### Individual Service Rebuild

**Backend Only**:
```bash
docker compose stop backend
docker compose build --no-cache backend
docker compose up -d backend
```

**Frontend Only**:
```bash
docker compose stop frontend
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Hot-Reload (No Rebuild)

**Frontend** (faster for UI changes):
```bash
# Build locally
cd frontend && npm run build

# Copy to container
docker cp build/. nop-frontend-1:/usr/share/nginx/html/

# Reload nginx
docker exec nop-frontend-1 nginx -s reload
```

**Backend** (for single file changes):
```bash
# Copy file
docker cp backend/app/services/agent_service.py nop-backend-1:/app/app/services/agent_service.py

# Restart service
docker compose restart backend
```

---

## Container Registry

### Pre-built Images

Available at GitHub Container Registry (no auth required):
- Frontend: `ghcr.io/goranjovic55/nop-frontend:latest`
- Backend: `ghcr.io/goranjovic55/nop-backend:latest`
- Guacd: `ghcr.io/goranjovic55/nop-guacd:latest`

### Multi-Architecture Support

Images built for:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64, Radxa-E54C, Raspberry Pi)

Pull automatically selects correct architecture:
```bash
docker compose pull  # Auto-detects platform
```

---

## Installation

### Step 1: Install Docker

```bash
# Update package index
sudo apt update

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Step 2: Configure System

```bash
# Enable IP forwarding (required for MITM)
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf

# Enable promiscuous mode on primary interface
sudo ip link set eth0 promisc on

# Make permanent (add to /etc/rc.local)
echo "ip link set eth0 promisc on" | sudo tee -a /etc/rc.local
sudo chmod +x /etc/rc.local
```

#### Step 3: Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/nop.git
cd nop

# Create required directories
mkdir -p volumes/{postgres,redis,ntopng,evidence,logs}

# Set proper permissions
sudo chown -R $USER:$USER volumes/

# Copy environment template
cp .env.example .env
```

#### Step 4: Configure Environment

Edit `.env` file (see Section 3 for details):

```bash
nano .env
```

Required changes:
- Set `SECRET_KEY` to a random string
- Set `POSTGRES_PASSWORD` to a secure password
- Set `ADMIN_PASSWORD` to initial admin password
- Set `PRIMARY_INTERFACE` to your network interface name

#### Step 5: Initialize Database

```bash
# Start database only
docker-compose up -d postgres

# Wait for database to be ready
sleep 10

# Run migrations
docker-compose exec backend python -m alembic upgrade head

# Create initial admin user
docker-compose exec backend python -m scripts.create_admin
```

#### Step 6: Start All Services

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Wait for services to be healthy
docker-compose ps
```

#### Step 7: Verify Installation

```bash
# Check health endpoint
curl http://localhost:5000/health

# Expected response:
# {
#   "status": "healthy",
#   "checks": {
#     "database": true,
#     "redis": true,
#     "ntopng": true,
#     "docker": true
#   }
# }
```

### 2.3 Radxa-E54C Specific Setup

```bash
# Enable hardware acceleration for network processing
sudo apt install -y linux-modules-extra-$(uname -r)

# Optimize for ARM architecture
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Use appropriate Docker Compose file
cp docker-compose.arm64.yml docker-compose.yml

# Limit resource usage for SBC
export COMPOSE_PROJECT_NAME=nop
export COMPOSE_FILE=docker-compose.yml:docker-compose.arm64-limits.yml
```

---

## 3. Configuration

### 3.1 Environment Variables (.env)

**Required Variables:**

```bash
# Application
SECRET_KEY=your-secret-key-min-32-chars
ENVIRONMENT=production  # development, staging, production
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR

# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=nop
POSTGRES_USER=nop_user
POSTGRES_PASSWORD=your-secure-password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional

# Network
PRIMARY_INTERFACE=eth0
MONITOR_SUBNETS=192.168.1.0/24,10.0.0.0/16

# Security
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme  # MUST CHANGE ON FIRST LOGIN
ADMIN_EMAIL=admin@example.com
JWT_EXPIRY=3600  # seconds
REFRESH_TOKEN_EXPIRY=604800  # 7 days

# Encryption
MASTER_KEY=your-master-encryption-key-32-bytes

# Features
ENABLE_OFFENSIVE_TOOLKIT=false
ENABLE_C2=false
ENABLE_MITM=false
```

### 3.2 Docker Compose Profiles

**Default (Always-On Services):**
```bash
docker-compose up -d
```

**With Remote Access:**
```bash
docker-compose --profile access up -d
```

**With Scanning:**
```bash
docker-compose --profile scanning up -d
```

**With Offensive Toolkit (Advanced):**
```bash
docker-compose --profile offensive up -d
```

**All Services:**
```bash
docker-compose --profile access --profile scanning --profile offensive up -d
```

---

## 4. Network Setup

### 4.1 Inline Deployment (MITM)

```
Internet ←→ [NOP Device] ←→ LAN Switch ←→ Clients
```

**Configuration:**

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Configure iptables for NAT
sudo iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE
sudo iptables -A FORWARD -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT

# Save iptables rules
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### 4.2 Mirror Port (Passive)

```
LAN Switch (Mirror Port) → [NOP Device]
```

**Switch Configuration:**
- Configure switch to mirror all traffic to NOP device port
- NOP device interface in promiscuous mode only
- No forwarding required

### 4.3 Tap Device (Passive)

```
LAN ←→ [Network TAP] ←→ [NOP Device]
```

**Best for production environments**
- Zero latency impact
- Completely passive
- Hardware TAP recommended (e.g., Gigamon, NetOptics)

---

## 5. SSL/TLS Configuration

### 5.1 Generate Self-Signed Certificate

```bash
# Generate certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout volumes/certs/nop.key \
  -out volumes/certs/nop.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=nop.local"

# Set permissions
chmod 600 volumes/certs/nop.key
chmod 644 volumes/certs/nop.crt
```

### 5.2 Use Let's Encrypt (Recommended for Production)

```bash
# Install certbot
sudo apt install -y certbot

# Generate certificate
sudo certbot certonly --standalone \
  -d nop.yourdomain.com \
  --agree-tos \
  --email admin@yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/nop.yourdomain.com/fullchain.pem volumes/certs/nop.crt
sudo cp /etc/letsencrypt/live/nop.yourdomain.com/privkey.pem volumes/certs/nop.key

# Set renewal cron
echo "0 0 1 * * certbot renew --quiet && docker-compose restart frontend" | sudo crontab -
```

---

## 6. Backup & Recovery

### 6.1 Automated Backup

```bash
# Create backup script
cat > /opt/nop/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/nop/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker-compose exec -T postgres pg_dump -U nop_user nop > "$BACKUP_DIR/db_$DATE.sql"

# Backup volumes
tar -czf "$BACKUP_DIR/volumes_$DATE.tar.gz" volumes/

# Backup configuration
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" .env docker-compose.yml

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/nop/backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/nop/backup.sh" | crontab -
```

### 6.2 Manual Backup

```bash
# Stop services
docker-compose stop

# Backup everything
tar -czf nop-backup-$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose.yml \
  volumes/

# Restart services
docker-compose start
```

### 6.3 Restore from Backup

```bash
# Stop services
docker-compose down

# Extract backup
tar -xzf nop-backup-20251224.tar.gz

# Restore database
docker-compose up -d postgres
sleep 10
cat backups/db_20251224_020000.sql | docker-compose exec -T postgres psql -U nop_user nop

# Start all services
docker-compose up -d
```

---

## 7. Monitoring & Maintenance

### 7.1 Health Checks

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs -f backend

# Check health endpoint
curl http://localhost:5000/health

# Check resource usage
docker stats
```

### 7.2 Log Management

```bash
# View live logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Export logs
docker-compose logs --no-color > nop-logs-$(date +%Y%m%d).log

# Rotate logs (add to crontab)
echo "0 0 * * * docker-compose logs --no-color --tail=0 > /dev/null" | crontab -
```

### 7.3 Database Maintenance

```bash
# Vacuum database
docker-compose exec postgres vacuumdb -U nop_user -d nop -v -f

# Analyze database
docker-compose exec postgres psql -U nop_user -d nop -c "ANALYZE;"

# Check database size
docker-compose exec postgres psql -U nop_user -d nop -c "SELECT pg_size_pretty(pg_database_size('nop'));"
```

---

## 8. Upgrades

### 8.1 Minor Updates

```bash
# Pull latest changes
git pull origin main

# Pull new images
docker-compose pull

# Restart services
docker-compose up -d

# Run migrations
docker-compose exec backend python -m alembic upgrade head
```

### 8.2 Major Version Upgrades

```bash
# 1. Backup current installation
./scripts/backup.sh

# 2. Stop services
docker-compose down

# 3. Pull new version
git fetch --tags
git checkout v2.0.0

# 4. Review CHANGELOG
cat CHANGELOG.md

# 5. Update configuration (if needed)
# Compare .env.example with your .env

# 6. Pull new images
docker-compose pull

# 7. Run migrations
docker-compose up -d postgres
sleep 10
docker-compose exec backend python -m alembic upgrade head

# 8. Start all services
docker-compose up -d

# 9. Verify
curl http://localhost:5000/health
```

---

## 9. Troubleshooting

### 9.1 Services Won't Start

```bash
# Check Docker daemon
sudo systemctl status docker

# Check disk space
df -h

# Check memory
free -h

# View detailed logs
docker-compose logs backend

# Restart Docker
sudo systemctl restart docker
docker-compose up -d
```

### 9.2 Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U nop_user -d nop -c "SELECT 1;"

# Reset database (WARNING: DATA LOSS)
docker-compose down -v
docker-compose up -d postgres
sleep 10
docker-compose exec backend python -m alembic upgrade head
```

### 9.3 Network Discovery Not Working

```bash
# Verify promiscuous mode
ip link show eth0 | grep PROMISC

# Check capabilities
docker-compose exec backend capsh --print

# Test network access
docker-compose exec backend ping -c 4 192.168.1.1

# Verify ARP table access
docker-compose exec backend cat /proc/net/arp
```

### 9.4 Performance Issues

```bash
# Check resource usage
docker stats

# Check database performance
docker-compose exec postgres psql -U nop_user -d nop -c "SELECT * FROM pg_stat_activity;"

# Optimize database
docker-compose exec postgres vacuumdb -U nop_user -d nop -v -f

# Increase resources (docker-compose.override.yml)
cat > docker-compose.override.yml <<EOF
services:
  backend:
    mem_limit: 4g
    cpus: 2
  postgres:
    mem_limit: 2g
    cpus: 1
EOF

docker-compose up -d
```

---

## 10. Security Hardening

### 10.1 Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 8080/tcp  # Web interface
sudo ufw enable
```

### 10.2 Secure Docker

```bash
# Enable Docker content trust
export DOCKER_CONTENT_TRUST=1

# Scan images for vulnerabilities
docker scan nop-backend:latest
```

### 10.3 Regular Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d

# Audit dependencies
docker-compose exec backend pip-audit
```

---

## 11. Production Deployment

### 11.1 Automated Deployment (Recommended)

Use the automated deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

This script:
- Validates environment
- Configures networking
- Pulls pre-built multi-arch images from GitHub Container Registry
- Starts all services
- Verifies health

### 11.2 Multi-Architecture Support

Images available for:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64, Raspberry Pi, Radxa Rock)

Docker automatically selects correct architecture:
```bash
docker compose pull  # Auto-detects platform
```

**Manual Platform Selection**:
```bash
docker pull --platform linux/arm64 ghcr.io/goranjovic55/nop-backend:latest
```

### 11.3 GitHub Container Registry

All images published to: `ghcr.io/goranjovic55/nop-*`

- Backend: `ghcr.io/goranjovic55/nop-backend:latest`
- Frontend: `ghcr.io/goranjovic55/nop-frontend:latest`
- Guacd: `ghcr.io/goranjovic55/nop-guacd:latest`

No authentication required for pulling.

### 11.4 Production Checklist

Before going live:

- [ ] Change `SECRET_KEY` to random string: `openssl rand -hex 32`
- [ ] Change `ADMIN_PASSWORD` from default
- [ ] Set `POSTGRES_PASSWORD` to secure value
- [ ] Configure firewall (allow only necessary ports)
- [ ] Enable SSL/TLS for public access
- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Configure monitoring and alerting
- [ ] Set up automated backups
- [ ] Review network interface settings
- [ ] Test disaster recovery procedure

### 11.5 ARM-Specific Notes

**Radxa Rock / Raspberry Pi Recommendations**:
- Minimum 4GB RAM for full stack
- Use fast storage (SSD preferred over SD card)
- Enable swap if RAM <8GB: `sudo dphys-swapfile setup`
- Some network tools (`hping3`) may have limited ARM support

**Performance**:
- PostgreSQL runs via QEMU emulation on ARM (minimal impact for <500 devices)
- Local builds take longer; use pre-built images

### 11.6 Updating Production

```bash
# Pull latest images
docker compose pull

# Restart services with zero downtime
docker compose up -d

# Verify health
docker compose ps
curl http://localhost:12001/health
```

---

## 12. Uninstallation

```bash
# Stop all services
docker compose down

# Remove all data (WARNING: IRREVERSIBLE)
docker compose down -v
sudo rm -rf volumes/

# Remove application
cd ..
sudo rm -rf nop/

# Remove Docker (optional)
sudo apt remove --purge docker-ce docker-ce-cli containerd.io
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
```

---

## 13. Support & Resources

- **Documentation**: [docs/INDEX.md](../INDEX.md)
- **Issues**: https://github.com/goranjovic55/NOP/issues
- **Security**: Report security issues via GitHub Security Advisories
- **Archived Docs**: [archive/](../archive/) - Historical deployment guides

---

**Document Version:** 2.1  
**Last Updated:** 2026-01-04  
**Status:** Production Ready