# NOP Portable - Quick Start Guide

Welcome to the Network Observatory Platform Portable Edition! This single executable contains everything you need to run NOP on your system.

## What's Included

✅ Full network monitoring and discovery  
✅ Asset management and tracking  
✅ Traffic analysis and visualization  
✅ Web-based user interface  
✅ SQLite database (embedded)  
✅ All dependencies bundled  

## System Requirements

### Minimum
- **OS**: Linux (glibc 2.27+), Windows 10+, or macOS 10.15+
- **CPU**: 2 cores
- **RAM**: 2 GB
- **Disk**: 500 MB free space
- **Network**: Ethernet adapter with promiscuous mode support

### Recommended
- **CPU**: 4+ cores
- **RAM**: 4+ GB
- **Network**: Dedicated network interface for monitoring

## Quick Start

### 1. First-Time Setup

```bash
# Make executable (Linux/macOS)
chmod +x nop-portable

# Run initialization
./nop-portable --init
```

You will be prompted to:
- Set an administrator password
- Select network interface to monitor
- Configure basic settings

### 2. Start NOP

```bash
# Start the server
./nop-portable

# Or run in background
./nop-portable --daemon
```

### 3. Access Web Interface

Open your browser and navigate to:
```
http://localhost:8080
```

Login with username `admin` and the password you set during initialization.

## Command-Line Options

```
./nop-portable [OPTIONS]

Options:
  --init              Initialize configuration (first run)
  --version           Show version information
  --help              Show help message
  
  --port PORT         Listen port (default: 8080)
  --host HOST         Listen host (default: 0.0.0.0)
  --interface IFACE   Network interface to monitor
  --data-dir PATH     Data directory (default: ~/.nop)
  
  --daemon            Run as background daemon
  --stop              Stop running daemon
  --debug             Enable debug logging
  --no-sniffer        Disable packet sniffing
```

## Examples

```bash
# Run on custom port
./nop-portable --port 9000

# Use specific network interface
./nop-portable --interface eth1

# Run with debug logging
./nop-portable --debug

# Use custom data directory
./nop-portable --data-dir /opt/nop-data
```

## Configuration

### Data Directory

By default, NOP stores data in:
- **Linux/macOS**: `~/.nop/`
- **Windows**: `%APPDATA%\NOP\`

Directory structure:
```
~/.nop/
├── config.yaml      # Configuration
├── nop.db          # Database
├── evidence/       # Captured data
├── logs/           # Application logs
└── certs/          # SSL certificates
```

### Configuration File

Edit `~/.nop/config.yaml` to customize:

```yaml
server:
  host: 0.0.0.0
  port: 8080
  workers: 4

network:
  interface: eth0
  promiscuous: true

features:
  packet_capture: true
  network_scanning: true
  asset_discovery: true

performance:
  max_connections: 100
  packet_buffer_size: 10000
```

## Permissions

### Linux

Packet capture requires special permissions:

**Option 1: Grant capabilities (recommended)**
```bash
sudo setcap cap_net_raw,cap_net_admin=eip ./nop-portable
./nop-portable
```

**Option 2: Run as root (not recommended)**
```bash
sudo ./nop-portable
```

**Option 3: Add user to netdev group**
```bash
sudo usermod -a -G netdev $USER
# Logout and login
./nop-portable
```

### Windows

Right-click the executable and select "Run as Administrator"

### macOS

Grant Full Disk Access in System Preferences:
1. System Preferences → Security & Privacy
2. Privacy → Full Disk Access
3. Add nop-portable

## Updating

### Download New Version

```bash
# Backup your data first
cp -r ~/.nop ~/.nop.backup

# Download and replace executable
wget https://github.com/your-org/nop/releases/latest/download/nop-portable
chmod +x nop-portable

# Restart
./nop-portable --stop
./nop-portable --daemon
```

Your existing data and configuration will be preserved.

## Troubleshooting

### "Permission denied"

```bash
# Make executable
chmod +x nop-portable
```

### "Cannot capture packets"

```bash
# Grant capabilities (Linux)
sudo setcap cap_net_raw,cap_net_admin=eip ./nop-portable

# Or run as administrator (Windows)
```

### "Port already in use"

```bash
# Use different port
./nop-portable --port 9000
```

### "Database locked"

```bash
# Check for another instance
ps aux | grep nop-portable

# Kill existing process
./nop-portable --stop
```

### High memory usage

Edit `~/.nop/config.yaml`:
```yaml
performance:
  packet_buffer_size: 5000  # Reduce buffer
  max_connections: 50       # Reduce connections
```

### Reset to defaults

```bash
# Backup data
mv ~/.nop ~/.nop.backup

# Reinitialize
./nop-portable --init
```

## Limitations vs. Full Docker Deployment

The portable version has these limitations:

| Feature | Portable | Docker |
|---------|----------|--------|
| Network Monitoring | ✅ | ✅ |
| Asset Discovery | ✅ | ✅ |
| Traffic Analysis | ✅ | ✅ |
| Web Interface | ✅ | ✅ |
| Remote Access (Guacamole) | ❌ | ✅ |
| Horizontal Scaling | ❌ | ✅ |
| Database | SQLite | PostgreSQL |
| Cache | In-Memory | Redis |

For production deployments with heavy load or remote access needs, consider the full Docker deployment.

## Uninstall

```bash
# Stop the server
./nop-portable --stop

# Remove data directory
rm -rf ~/.nop

# Remove executable
rm nop-portable
```

## Support

- **Documentation**: See `PORTABLE_BUILD.md` for advanced topics
- **Issues**: https://github.com/your-org/nop/issues
- **Discussions**: https://github.com/your-org/nop/discussions

## Security Notes

- Change the default admin password immediately after first login
- Use HTTPS in production (configure SSL certificates in `~/.nop/certs/`)
- Keep the executable updated
- Review logs regularly in `~/.nop/logs/`
- Restrict access to the web interface (firewall rules)

## License

See LICENSE file in the repository.

---

**Version**: 1.0.0  
**Build**: Nuitka Portable  
**Last Updated**: 2025-12-25
