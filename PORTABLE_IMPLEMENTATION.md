# NOP Portable Executable Implementation

## Overview

This document describes the implementation for building the Network Observatory Platform (NOP) as a single portable executable file using Nuitka.

## Solution Architecture

### Approach: Nuitka-Based Compilation

**Why Nuitka over PyInstaller?**
- ✅ Compiles Python to native C/C++ code (2-5x performance improvement)
- ✅ Smaller executable size (typically 30-40% smaller)
- ✅ Better compatibility across different Linux distributions
- ✅ Fewer antivirus false positives
- ✅ More robust dependency resolution
- ✅ Native code optimization (LTO support)

### Key Features

1. **Single Executable**: All components bundled into one file
2. **Self-Contained**: No external dependencies required
3. **Cross-Platform**: Builds for Linux, Windows, and macOS
4. **Embedded Database**: SQLite instead of PostgreSQL for portability
5. **Embedded Frontend**: React build included in executable
6. **Configuration**: YAML-based config in user's home directory
7. **Data Persistence**: User data stored in `~/.nop/` directory

## Components

### 1. Build System

#### Main Build Script
- **Location**: `scripts/build_portable.sh`
- **Purpose**: Orchestrates frontend and backend builds
- **Features**:
  - Builds React frontend
  - Installs Python dependencies
  - Invokes Nuitka compiler
  - Creates release packages

#### Nuitka Build Script
- **Location**: `backend/build_nuitka.sh` (Linux/macOS)
- **Location**: `backend/build_nuitka.bat` (Windows)
- **Purpose**: Configures and runs Nuitka compilation
- **Options**:
  - Platform selection (auto-detect or manual)
  - Build type (full, minimal, no-offensive)
  - Compiler selection (gcc/clang)
  - Parallel compilation

#### Docker Build
- **Location**: `Dockerfile.portable`
- **Purpose**: Consistent cross-platform builds
- **Usage**: `docker build -f Dockerfile.portable --target export --output dist .`

### 2. Runtime Configuration

#### Portable Configuration Manager
- **Location**: `backend/portable_config.py`
- **Purpose**: Handles configuration differences between Docker and portable modes
- **Features**:
  - Auto-detects portable vs development mode
  - Manages data directories (platform-specific)
  - Provides database URL (SQLite for portable)
  - Handles cache (in-memory for portable)
  - Manages static files location

#### Main Entry Point
- **Location**: `backend/portable_main.py`
- **Purpose**: Main executable entry point
- **Features**:
  - Command-line argument parsing
  - First-run initialization wizard
  - Configuration management
  - Server startup
  - Daemon mode support

### 3. Documentation

#### Build Documentation
- **Location**: `PORTABLE_BUILD.md`
- **Contents**:
  - Build prerequisites
  - Step-by-step build instructions
  - Platform-specific guides
  - Size optimization techniques
  - Troubleshooting

#### User Documentation
- **Location**: `PORTABLE_README.md`
- **Contents**:
  - Quick start guide
  - Command-line reference
  - Configuration instructions
  - Permissions setup
  - Troubleshooting

### 4. CI/CD Integration

#### GitHub Actions Workflow
- **Location**: `.github/workflows/build-portable.yml`
- **Purpose**: Automated builds for all platforms
- **Triggers**:
  - Git tags (releases)
  - Manual workflow dispatch
- **Outputs**:
  - Linux AMD64 executable
  - Windows x64 executable
  - macOS executable
  - GitHub releases with artifacts

## Build Process

### Frontend Build

```bash
cd frontend
npm install
npm run build
# Output: frontend/build/
```

### Backend Build with Nuitka

```bash
cd backend
python -m nuitka \
  --standalone \
  --onefile \
  --follow-imports \
  --include-data-dir=../frontend/build=frontend_build \
  --enable-plugin=anti-bloat \
  --jobs=N \
  --lto=yes \
  portable_main.py
```

### Output

- **Linux**: `dist/nop-portable-linux-amd64` (~80-100MB)
- **Windows**: `dist/nop-portable-windows.exe` (~90-110MB)
- **macOS**: `dist/nop-portable-macos` (~85-105MB)

## Runtime Behavior

### First Run

1. User runs `./nop-portable --init`
2. System creates `~/.nop/` directory
3. Wizard prompts for:
   - Admin password
   - Network interface selection
   - Basic configuration
4. Generates `config.yaml` and secret key
5. Initializes SQLite database

### Normal Operation

1. User runs `./nop-portable`
2. System loads configuration from `~/.nop/config.yaml`
3. Starts FastAPI server with embedded frontend
4. Serves web interface on configured port (default: 8080)
5. Monitors specified network interface

### Data Storage

```
~/.nop/
├── config.yaml          # User configuration
├── nop.db              # SQLite database
├── .secret             # Secret key
├── .admin              # Admin password hash
├── evidence/           # Captured network data
├── logs/               # Application logs
│   ├── nop.log
│   └── access.log
└── certs/              # SSL certificates (optional)
```

## Key Differences from Docker Deployment

| Feature | Docker | Portable |
|---------|--------|----------|
| **Database** | PostgreSQL | SQLite |
| **Cache** | Redis | In-memory |
| **Frontend** | Nginx | Embedded in FastAPI |
| **Process Management** | Docker Compose | Single process |
| **Remote Access** | Guacamole integrated | Not available |
| **Scaling** | Multi-container | Single instance |
| **Updates** | `docker-compose pull` | Download new executable |
| **Configuration** | `.env` file | `~/.nop/config.yaml` |

## Advantages

1. **Easy Distribution**: Single file to download and run
2. **No Docker Required**: Works on systems without container support
3. **Portable**: Runs from USB drive or any directory
4. **Quick Setup**: Minutes instead of hours
5. **Lower Resources**: No Docker overhead
6. **Simpler Deployment**: No network configuration needed

## Limitations

1. **No Horizontal Scaling**: Single instance only
2. **SQLite Performance**: Lower concurrent connection limit
3. **No Guacamole**: Remote access features unavailable
4. **Manual Updates**: No automatic update mechanism
5. **Platform-Specific Builds**: Separate executable per OS

## Security Considerations

1. **Secret Key**: Auto-generated on first run, stored in `~/.nop/.secret`
2. **Password Storage**: Bcrypt hashed in `~/.nop/.admin`
3. **File Permissions**: Config files set to 0600 (user-only)
4. **Network Privileges**: Requires elevated permissions for packet capture
5. **HTTPS**: Optional, user must configure SSL certificates

## Future Enhancements

### Planned
- [ ] Auto-update mechanism
- [ ] GUI wrapper for easier configuration
- [ ] Installer packages (`.deb`, `.rpm`, `.msi`)
- [ ] Code signing for all platforms
- [ ] Embedded Guacamole support (if feasible)

### Under Consideration
- [ ] Multi-instance support with shared data
- [ ] Plugin system for extensions
- [ ] Mobile companion app
- [ ] Cloud sync for configuration

## Maintenance

### Building New Releases

1. Update version in `portable_main.py`
2. Test build locally: `./scripts/build_portable.sh`
3. Tag release: `git tag v1.0.1`
4. Push tag: `git push origin v1.0.1`
5. GitHub Actions builds all platforms
6. Manually test each platform binary
7. Publish release notes

### Testing Checklist

- [ ] First-run initialization works
- [ ] Web interface loads correctly
- [ ] Database operations succeed
- [ ] Network monitoring functions
- [ ] Configuration changes persist
- [ ] Daemon mode works
- [ ] Logs are written correctly
- [ ] Executable runs on clean system

## Support Matrix

### Tested Platforms

| OS | Version | Architecture | Status |
|----|---------|--------------|--------|
| Ubuntu | 22.04 LTS | x86_64 | ✅ Tested |
| Ubuntu | 20.04 LTS | x86_64 | ✅ Tested |
| Debian | 11 | x86_64 | ⚠️ Should work |
| CentOS | 8 | x86_64 | ⚠️ Should work |
| Windows | 10 | x64 | 🔄 Planned |
| Windows | 11 | x64 | 🔄 Planned |
| macOS | 12+ | x86_64 | 🔄 Planned |
| macOS | 12+ | ARM64 | 🔄 Planned |

### Known Issues

- **ARM Linux**: Builds work but slower network processing
- **Windows Defender**: May require manual exception
- **macOS Gatekeeper**: Requires user approval on first run
- **SELinux**: May need policy adjustment for packet capture

## References

- [Nuitka Documentation](https://nuitka.net/doc/)
- [PyYAML Documentation](https://pyyaml.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy SQLite](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html)

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-25  
**Author**: NOP Development Team
