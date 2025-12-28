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

### 3. Start Services

#### Start Main Platform

```bash
docker-compose up -d --build
```

This starts the core services:
- Frontend (React UI)
- Backend (FastAPI)
- PostgreSQL database
- Redis cache
- ntopng traffic analyzer

#### Start Test Environment (Optional)

For testing connection capabilities:

```bash
docker-compose -f docker-compose.test.yml up -d --build
```

This creates test targets for SSH, VNC, RDP, FTP, and other protocols.

### 4. Access the Platform

Once services are running:

- **Web Interface**: http://localhost:12000
- **API Documentation**: http://localhost:12001/docs
- **API Base URL**: http://localhost:12001/api/v1

## First Login

1. Navigate to http://localhost:12000
2. Use default credentials:
   - **Username**: `admin`
   - **Password**: `admin123` (or what you set in `.env`)
3. **Important**: Change your password immediately after first login

## Quick Tour

### Dashboard
- View network statistics at a glance
- See active connections and recent activity
- Monitor system health

### Topology View
- Visualize network topology in real-time
- Color-coded connections by protocol
- Interactive graph with traffic flow animation
- Filter by traffic volume

### Assets
- Browse discovered network devices
- View detailed asset information
- Initiate scans or connections
- Manage asset groups

### Traffic Analysis
- Capture and analyze network packets
- Advanced ping tools (ICMP, TCP, UDP, HTTP/HTTPS)
- View protocol distribution
- Monitor bandwidth usage

### Access Hub
- Connect to network assets via browser
- SSH, VNC, RDP support
- Credential vault for quick access
- Session management

## Common Tasks

### Connect to an Asset via SSH

1. Go to **Access Hub**
2. Click **New Connection**
3. Select **SSH** protocol
4. Enter:
   - Host: IP address or hostname
   - Port: 22 (default)
   - Username: your username
   - Password: your password
5. Click **Connect**

### Run Network Discovery

1. Go to **Assets**
2. Click **Start Discovery**
3. Choose scan profile:
   - **Light**: Fast ping sweep
   - **Medium**: Service detection
   - **Deep**: Full port scan with OS detection
4. Click **Execute**

### Advanced Ping Test

1. Go to **Traffic** page
2. Click **Advanced Ping** tab
3. Select protocol (ICMP, TCP, UDP, HTTP)
4. Enter target and configure options
5. Click **Execute Ping**

### View Network Topology

1. Go to **Topology** page
2. Wait for graph to load
3. Use filters to adjust traffic threshold
4. Hover over nodes and links for details
5. Drag nodes to rearrange layout

## Test Credentials

If using the test environment, use these credentials:

| Service | Host | Username | Password |
|---------|------|----------|----------|
| SSH | ssh-server | testuser | testpass123 |
| SSH | ssh-server | admin | admin123 |
| VNC | vnc-server | vncuser | vnc123 |
| RDP | rdp-server | rdpuser | rdp123 |
| FTP | ftp-server | ftpuser | ftp123 |
| SMB | file-server | smbuser | smbpass123 |

## Troubleshooting

### Services Won't Start

Check Docker logs:
```bash
docker-compose logs -f
```

Ensure ports are not already in use:
```bash
netstat -tuln | grep -E '12000|12001|5432|6379'
```

### Can't Access Web Interface

1. Verify frontend is running:
   ```bash
   docker-compose ps frontend
   ```

2. Check frontend logs:
   ```bash
   docker-compose logs frontend
   ```

3. Ensure firewall allows port 12000

### Database Connection Errors

1. Check PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Verify database credentials in `.env`

3. Reset database if needed:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### Network Discovery Not Working

Ensure the backend has necessary permissions:
```bash
# The containers need NET_ADMIN capability
# Check docker-compose.yml for cap_add settings
```

## Performance Optimization

### For Production Use

1. **Increase resource limits** in `docker-compose.yml`:
   ```yaml
   backend:
     deploy:
       resources:
         limits:
           memory: 4G
   ```

2. **Enable Redis persistence**:
   ```yaml
   redis:
     command: redis-server --appendonly yes
   ```

3. **Configure PostgreSQL** for better performance:
   - Edit `volumes/postgres/postgresql.conf`
   - Adjust `shared_buffers`, `work_mem`

### For Low-Resource Devices

1. Reduce PostgreSQL memory:
   ```yaml
   postgres:
     command: postgres -c shared_buffers=128MB
   ```

2. Limit ntopng data retention:
   ```yaml
   ntopng:
     command: --data-retention-days 7
   ```

## Next Steps

- Read the [Configuration Guide](CONFIGURATION.md) for detailed settings
- Review the [Deployment Guide](DEPLOYMENT.md) for production deployment
- Check [API Documentation](../technical/API_rest_v1.md) for programmatic access
- Explore [Implemented Features](../features/IMPLEMENTED_FEATURES.md)

## Getting Help

- Check the documentation in `docs/`
- Review logs: `docker-compose logs [service-name]`
- Open an issue on GitHub

## Security Notes

⚠️ **Important Security Considerations**:

1. **Change default passwords** immediately
2. **Use HTTPS** in production (configure reverse proxy)
3. **Restrict network access** to the platform
4. **Regularly update** Docker images
5. **Enable firewall** rules
6. **Review access logs** regularly

---

**Ready to explore?** Visit http://localhost:12000 and start monitoring your network!
