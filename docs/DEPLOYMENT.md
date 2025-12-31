# Deployment Guide

## Quick Start (Pre-built Images)

For users who want to run NOP without building from source:

```bash
# Clone repository
git clone https://github.com/goranjovic55/NOP.git
cd NOP

# Pull pre-built images and start
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Access application
# Frontend: http://localhost:12000
# Backend API: http://localhost:12001
```

**Note**: Images are automatically built and published to GitHub Container Registry when code is pushed to main branch.

---

## Development Setup (Build from Source)

For contributors who want to modify code:

```bash
# Clone repository
git clone https://github.com/goranjovic55/NOP.git
cd NOP

# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Container Registry

Pre-built images are available at:
- Frontend: `ghcr.io/goranjovic55/nop-frontend:latest`
- Backend: `ghcr.io/goranjovic55/nop-backend:latest`

**Public access**: No authentication required for pulling images.

---

## Environment Variables

### Frontend
- `REACT_APP_API_URL` - Backend API URL (default: auto-detected)
- `REACT_APP_WS_URL` - WebSocket URL (default: auto-detected)

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - JWT secret key (**change in production**)
- `ADMIN_PASSWORD` - Default admin password (**change in production**)
- `VNC_HOST` - VNC server hostname
- `RDP_HOST` - RDP server hostname

---

## Volumes

Persistent data locations:
- `./volumes/evidence` - Captured evidence files
- `./volumes/logs` - Application logs
- `postgres_data` - PostgreSQL database (Docker volume)

**Backup**:
```bash
# Backup database
docker-compose exec postgres pg_dump -U nop nop > backup.sql

# Backup volumes
tar czf volumes-backup.tar.gz volumes/
```

---

## Production Deployment

### Security Checklist
- [ ] Change `SECRET_KEY` to random value
- [ ] Change `ADMIN_PASSWORD` from default
- [ ] Update `POSTGRES_PASSWORD` from default
- [ ] Enable HTTPS with reverse proxy (nginx/caddy)
- [ ] Restrict network access with firewall rules
- [ ] Enable Docker socket protection or remove if not needed

### Example with Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name nop.example.com;
    
    location / {
        proxy_pass http://localhost:12000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:12001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass http://localhost:12001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Troubleshooting

### Images not pulling
```bash
# Check image exists
docker manifest inspect ghcr.io/goranjovic55/nop-frontend:latest

# Force pull
docker-compose -f docker-compose.prod.yml pull --no-cache
```

### Permission errors
```bash
# Fix volume permissions
sudo chown -R $USER:$USER volumes/
```

### Database connection issues
```bash
# Check postgres is running
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Reset database
docker-compose down -v  # WARNING: deletes all data
docker-compose up -d
```

---

## Updating

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Recreate containers
docker-compose -f docker-compose.prod.yml up -d

# Remove old images
docker image prune -a
```

---

## Manual Image Distribution (Offline)

If GHCR is unavailable:

```bash
# Save images
docker save ghcr.io/goranjovic55/nop-frontend:latest | gzip > nop-frontend.tar.gz
docker save ghcr.io/goranjovic55/nop-backend:latest | gzip > nop-backend.tar.gz

# Transfer files to target machine

# Load images
gunzip -c nop-frontend.tar.gz | docker load
gunzip -c nop-backend.tar.gz | docker load

# Start
docker-compose -f docker-compose.prod.yml up -d
```
