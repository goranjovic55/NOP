# Building NOP as a Single Portable Executable

This guide explains how to build the Network Observatory Platform (NOP) as a single portable executable file that can be distributed and run without Docker or complex dependencies.

## Overview

The portable executable bundles:
- FastAPI backend application (compiled with Nuitka)
- React frontend (static build)
- SQLite database (embedded)
- All Python dependencies
- Minimal external dependencies

**Why Nuitka?**
- Compiles Python to native C/C++ code for better performance (2-5x faster)
- Smaller executable size compared to PyInstaller
- Better compatibility and fewer antivirus false positives
- More robust dependency handling

## Prerequisites

### For Building
- Python 3.11 or later
- Node.js 18 or later
- pip and npm
- 8GB+ RAM (for building)
- 2GB+ free disk space

### For Running the Executable
- Linux: x86_64 or ARM64 (glibc 2.27+)
- Windows: Windows 10+ (64-bit)
- macOS: 10.15+ (64-bit)
- No other dependencies required!

## Quick Build

```bash
# Build portable executable
./scripts/build_portable.sh

# Output will be in: dist/nop-portable
```

## Manual Build Steps

### Step 1: Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

This creates optimized static files in `frontend/build/`.

### Step 2: Prepare Backend for Portable Mode

The portable build uses:
- **SQLite** instead of PostgreSQL (embedded database)
- **In-memory cache** instead of Redis
- **Embedded static files** for frontend

```bash
cd backend
pip install -r requirements.txt
pip install nuitka ordered-set
```

### Step 3: Build Executable with Nuitka

```bash
cd backend
python -m nuitka --standalone --onefile \
    --include-data-dir=../frontend/build=frontend_build \
    --enable-plugin=anti-bloat \
    --enable-plugin=numpy \
    --follow-imports \
    --output-filename=nop-portable \
    portable_main.py
```

Or use the build script:
```bash
./build_nuitka.sh
```

The build process:
- Compiles Python to C/C++ code
- Bundles all Python dependencies
- Includes frontend static files
- Packages binary dependencies (libpcap, etc.)
- Creates optimized single-file executable

### Step 4: Test the Executable

```bash
cd dist
./nop-portable --help
./nop-portable --init  # First run initialization
./nop-portable         # Start server
```

## Build Configuration

### Build Configuration

The Nuitka build uses these key options:

```bash
--standalone          # Include all dependencies
--onefile            # Create single executable file
--follow-imports     # Follow all import statements
--include-data-dir   # Bundle frontend static files
--enable-plugin      # Enable optimization plugins
--remove-output      # Clean intermediate files after build
```

### Environment Variables

The portable build respects these environment variables:

```bash
# Data directory (default: ~/.nop)
export NOP_DATA_DIR=/path/to/data

# Network interface to monitor (default: auto-detect)
export NOP_INTERFACE=eth0

# Listen port (default: 8080)
export NOP_PORT=8080

# Enable debug logging
export NOP_DEBUG=1
```

## Platform-Specific Builds

### Linux (Recommended)

```bash
# Build on Ubuntu 22.04 for maximum compatibility
./scripts/build_portable.sh --platform linux

# Output: dist/nop-portable-linux-amd64
```

**Note**: Linux build requires development tools:
```bash
# Ubuntu/Debian
sudo apt-get install -y build-essential libpcap-dev python3-dev ccache

# For faster builds (optional)
sudo apt-get install -y clang
```

### Windows

```bash
# Build on Windows 10+
python scripts\build_portable.py --platform windows

# Output: dist\nop-portable-windows.exe
```

**Note**: Windows build includes:
- Npcap driver (for packet capture)
- Visual C++ Redistributable
- Self-contained Python runtime

### macOS

```bash
# Build on macOS 10.15+
./scripts/build_portable.sh --platform macos

# Output: dist/nop-portable-macos
```

**Note**: macOS requires code signing for distribution:
```bash
codesign -s "Developer ID" dist/nop-portable-macos
```

## Cross-Platform Builds

Use Docker for cross-platform builds:

```bash
# Build for all platforms
docker build -f Dockerfile.portable -t nop-builder .
docker run -v $(pwd)/dist:/dist nop-builder

# Outputs:
# - dist/nop-portable-linux-amd64
# - dist/nop-portable-linux-arm64
# - dist/nop-portable-windows.exe
# - dist/nop-portable-macos
```

## Size Optimization

The default build is ~150MB. To reduce size:

### Option 1: Exclude Optional Features

```bash
# Build without offensive tools
./scripts/build_portable.sh --no-offensive

# Build core monitoring only
./scripts/build_portable.sh --minimal
```

Size comparison with Nuitka:
- Full build: ~80-100MB (smaller than PyInstaller!)
- Without offensive tools: ~60MB
- Minimal build: ~40MB

**Note**: Nuitka produces smaller executables than PyInstaller natively, so UPX compression is usually not needed.

## Running the Portable Executable

### First Run

```bash
# Initialize (creates database, config)
./nop-portable --init

# Follow prompts to:
# - Set admin password
# - Choose network interface
# - Configure scan ranges
```

### Normal Operation

```bash
# Start server (foreground)
./nop-portable

# Start as daemon (background)
./nop-portable --daemon

# Stop daemon
./nop-portable --stop
```

Access the web interface at: http://localhost:8080

### Command-Line Options

```bash
./nop-portable [OPTIONS]

Options:
  --init              Initialize configuration
  --daemon            Run as background daemon
  --stop              Stop daemon
  --config PATH       Use custom config file
  --data-dir PATH     Data directory (default: ~/.nop)
  --port PORT         Listen port (default: 8080)
  --interface IFACE   Network interface to monitor
  --no-sniffer        Disable packet sniffing
  --debug             Enable debug logging
  --version           Show version
  --help              Show this help
```

### Data Directory Structure

```
~/.nop/
├── config.yaml          # Configuration file
├── nop.db              # SQLite database
├── evidence/           # Captured evidence
├── logs/               # Application logs
│   ├── nop.log
│   └── access.log
└── certs/              # SSL certificates
    ├── cert.pem
    └── key.pem
```

## Updating

### In-Place Update

```bash
# Download new version
wget https://github.com/your-org/nop/releases/latest/download/nop-portable

# Replace old executable
mv nop-portable ~/.local/bin/nop-portable
chmod +x ~/.local/bin/nop-portable

# Restart (keeps existing data)
nop-portable --stop
nop-portable --daemon
```

### Export/Import Data

```bash
# Export configuration and data
./nop-portable --export backup.tar.gz

# Import on new system
./nop-portable --import backup.tar.gz
```

## Limitations of Portable Mode

Compared to the full Docker deployment, the portable executable has these limitations:

1. **No Guacamole Integration**: Remote access features require separate Guacamole setup
2. **Limited Concurrent Connections**: SQLite vs PostgreSQL performance difference
3. **Single Instance**: Cannot easily scale horizontally
4. **Network Privileges**: Packet sniffing requires root/admin on some systems

### Running with Required Privileges

#### Linux
```bash
# Option 1: Run as root (not recommended)
sudo ./nop-portable

# Option 2: Grant capabilities (recommended)
sudo setcap cap_net_raw,cap_net_admin=eip ./nop-portable
./nop-portable

# Option 3: Add user to netdev group
sudo usermod -a -G netdev $USER
# Logout and login
./nop-portable
```

#### Windows
```powershell
# Run as Administrator
# Right-click executable -> "Run as administrator"
```

#### macOS
```bash
# Grant full disk access in System Preferences
# Security & Privacy -> Full Disk Access -> Add nop-portable
```

## Troubleshooting

### "Permission denied" on Linux

```bash
# Make executable
chmod +x nop-portable

# If still failing, check SELinux
sudo chcon -t bin_t nop-portable
```

### "Cannot open database"

```bash
# Check data directory permissions
ls -la ~/.nop/

# Reset database
rm ~/.nop/nop.db
./nop-portable --init
```

### "Failed to capture packets"

```bash
# Check network interface exists
ip link show

# Verify capabilities
getcap ./nop-portable

# Grant capabilities
sudo setcap cap_net_raw,cap_net_admin=eip ./nop-portable
```

### High Memory Usage

```bash
# Limit cache size in config
echo "cache_max_size: 100MB" >> ~/.nop/config.yaml

# Reduce worker threads
echo "workers: 2" >> ~/.nop/config.yaml
```

### Antivirus Blocking

Nuitka executables have fewer issues with antivirus software compared to PyInstaller, but if you encounter problems:

1. **Add exception** in your antivirus software
2. **Code sign** the executable (Windows/macOS)
3. **Submit false positive report** to your antivirus vendor

## Advanced Configuration

### Custom Build with Additional Modules

Modify the Nuitka build command:

```bash
# Add additional modules
python -m nuitka --standalone --onefile \
    --include-module=your.custom.module \
    --include-data-file=path/to/data=destination \
    portable_main.py
```

Or edit `build_nuitka.sh` script to customize the build.

### Embedding Custom Frontend

Replace the React frontend:

```bash
# Build your custom frontend
cd your-frontend
npm run build

# Copy to backend
cp -r build ../backend/frontend_build/

# Rebuild portable
cd ../backend
pyinstaller portable.spec
```

## Distribution

### Creating Release Package

```bash
# Create distribution package
./scripts/create_release.sh

# Creates:
# - nop-portable-v1.0.0-linux-amd64.tar.gz
# - nop-portable-v1.0.0-windows-amd64.zip
# - nop-portable-v1.0.0-macos-amd64.tar.gz
```

Each package includes:
- Executable binary
- README.md
- LICENSE
- Example config.yaml
- Quick start guide

### Checksum Verification

```bash
# Generate checksums
sha256sum dist/nop-portable-* > checksums.txt

# Verify download
sha256sum -c checksums.txt
```

## Performance Tuning

### SQLite Optimization

Edit `~/.nop/config.yaml`:

```yaml
database:
  pragma:
    journal_mode: WAL
    synchronous: NORMAL
    cache_size: -64000  # 64MB
    temp_store: MEMORY
```

### Resource Limits

```yaml
performance:
  max_connections: 100
  worker_threads: 4
  packet_buffer_size: 10000
  scan_concurrency: 10
```

## Support

For issues with portable builds:

1. Check [GitHub Issues](https://github.com/your-org/nop/issues)
2. Review [Troubleshooting Guide](https://docs.nop.local/troubleshooting)
3. Join [Community Discussions](https://github.com/your-org/nop/discussions)

## Contributing

To improve portable builds:

1. Test on different platforms
2. Report compatibility issues
3. Submit build optimizations
4. Improve documentation

---

**Document Version:** 1.1  
**Last Updated:** 2025-12-25  
**Build Tool:** Nuitka 2.0+
