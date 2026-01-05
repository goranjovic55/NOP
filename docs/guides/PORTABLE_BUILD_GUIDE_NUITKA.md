# Nuitka Portable Build Guide
## Step-by-Step Implementation of Option 1

**Target:** Single portable executable without Docker  
**Time:** 7-11 days  
**Size:** 200-400MB  
**Platforms:** Windows, Linux, macOS

---

## Prerequisites

### System Requirements
- Python 3.11+
- Node.js 18+
- 8GB RAM minimum
- 10GB free disk space
- C compiler (gcc/clang/MSVC)

### Install Nuitka
```bash
pip install nuitka ordered-set zstandard
```

### Install Platform Tools

**Windows:**
```powershell
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# Install "Desktop development with C++"
```

**Linux:**
```bash
sudo apt install -y gcc g++ ccache
```

**macOS:**
```bash
xcode-select --install
```

---

## Step 1: Database Migration (PostgreSQL → SQLite)

### 1.1 Update Dependencies

```bash
# File: backend/requirements.txt

# Remove PostgreSQL drivers
# -asyncpg==0.29.0
# -psycopg2-binary==2.9.9

# Add SQLite driver
aiosqlite==0.19.0
```

### 1.2 Update Database Configuration

```python
# File: backend/app/core/database.py

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# OLD:
# DATABASE_URL = os.getenv(
#     "DATABASE_URL",
#     "postgresql+asyncpg://nop:nop_password@localhost:5432/nop"
# )

# NEW:
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./nop.db"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    # SQLite-specific settings
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with async_session() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

### 1.3 Update Models

```python
# File: backend/app/models/asset.py

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import INET, JSONB
from backend.app.core.database import Base
import json

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True)
    
    # OLD: ip_address = Column(INET, unique=True, nullable=False)
    # NEW: SQLite doesn't have INET type
    ip_address = Column(String(45), unique=True, nullable=False)  # Max IPv6 length
    
    mac_address = Column(String(17), nullable=True)
    hostname = Column(String(255), nullable=True)
    
    # OLD: services = Column(JSONB, default=list)
    # NEW: SQLite uses JSON column
    services = Column(Text, default="[]")
    
    # Add property for JSON handling
    @property
    def services_json(self):
        return json.loads(self.services) if self.services else []
    
    @services_json.setter
    def services_json(self, value):
        self.services = json.dumps(value)
```

**Repeat for all models using PostgreSQL-specific types:**
- `INET` → `String(45)`
- `JSONB` → `Text` (with JSON serialization)
- `ARRAY` → `Text` (with JSON array serialization)

### 1.4 Update Queries

```python
# File: backend/app/services/asset_service.py

# OLD PostgreSQL-specific query:
# query = select(Asset).where(cast(Asset.ip_address, Text) == ip)

# NEW SQLite-compatible query:
query = select(Asset).where(Asset.ip_address == ip)

# OLD: PostgreSQL array operations
# Asset.services.contains(['ssh'])

# NEW: SQLite JSON operations
assets = await session.execute(
    select(Asset).where(Asset.services.like('%"ssh"%'))
)
```

---

## Step 2: Redis Replacement (In-Memory Cache)

### 2.1 Create Cache Module

```python
# File: backend/app/core/cache.py

import time
import asyncio
from typing import Any, Optional
from threading import Lock

class MemoryCache:
    """Thread-safe in-memory cache with TTL support"""
    
    def __init__(self):
        self._store = {}
        self._ttl = {}
        self._lock = Lock()
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_expired())
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        with self._lock:
            # Check if expired
            if key in self._ttl and time.time() > self._ttl[key]:
                del self._store[key]
                del self._ttl[key]
                return None
            
            return self._store.get(key)
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache with optional TTL (seconds)"""
        with self._lock:
            self._store[key] = value
            if ttl:
                self._ttl[key] = time.time() + ttl
            elif key in self._ttl:
                del self._ttl[key]
    
    async def delete(self, key: str):
        """Delete key from cache"""
        with self._lock:
            self._store.pop(key, None)
            self._ttl.pop(key, None)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        value = await self.get(key)
        return value is not None
    
    async def _cleanup_expired(self):
        """Background task to remove expired keys"""
        while True:
            await asyncio.sleep(60)  # Run every minute
            
            with self._lock:
                current_time = time.time()
                expired_keys = [
                    key for key, expiry in self._ttl.items()
                    if current_time > expiry
                ]
                
                for key in expired_keys:
                    self._store.pop(key, None)
                    self._ttl.pop(key, None)

# Global cache instance
cache = MemoryCache()
```

### 2.2 Update Redis References

```python
# File: backend/app/services/cve_lookup.py

# OLD:
# from redis import asyncio as aioredis
# redis_client = aioredis.from_url("redis://localhost:6379")

# NEW:
from backend.app.core.cache import cache

# OLD:
# cached = await redis_client.get(cache_key)
# await redis_client.setex(cache_key, 604800, json.dumps(data))

# NEW:
cached = await cache.get(cache_key)
if cached:
    return json.loads(cached)

await cache.set(cache_key, json.dumps(data), ttl=604800)
```

---

## Step 3: Guacamole Handling

### Option A: Bundle Guacd Binaries (Recommended for Full Features)

```python
# File: backend/app/services/embedded_guacamole.py

import subprocess
import platform
import os
from pathlib import Path

class EmbeddedGuacamole:
    """Manages embedded guacd binary"""
    
    def __init__(self):
        self.process = None
        self.binary_path = self._get_binary_path()
        
    def _get_binary_path(self) -> Path:
        """Get platform-specific guacd binary path"""
        system = platform.system()
        machine = platform.machine()
        
        # Binary mapping
        binaries = {
            ('Windows', 'AMD64'): 'guacd-windows-amd64.exe',
            ('Linux', 'x86_64'): 'guacd-linux-amd64',
            ('Linux', 'aarch64'): 'guacd-linux-arm64',
            ('Darwin', 'x86_64'): 'guacd-macos-amd64',
            ('Darwin', 'arm64'): 'guacd-macos-arm64',
        }
        
        binary_name = binaries.get((system, machine))
        if not binary_name:
            raise RuntimeError(
                f"No guacd binary for {system} {machine}"
            )
        
        # Binary should be in resources/guacd/
        binary_path = Path(__file__).parent.parent / "resources" / "guacd" / binary_name
        
        if not binary_path.exists():
            raise FileNotFoundError(f"Guacd binary not found: {binary_path}")
        
        # Make executable on Unix
        if system != 'Windows':
            os.chmod(binary_path, 0o755)
        
        return binary_path
    
    async def start(self, host: str = "127.0.0.1", port: int = 14822):
        """Start guacd server"""
        if self.process:
            return  # Already running
        
        self.process = subprocess.Popen(
            [str(self.binary_path), '-b', host, '-l', str(port), '-f'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for startup
        import asyncio
        await asyncio.sleep(2)
        
        if self.process.poll() is not None:
            raise RuntimeError("Guacd failed to start")
    
    async def stop(self):
        """Stop guacd server"""
        if self.process:
            self.process.terminate()
            self.process.wait(timeout=5)
            self.process = None

# Global instance
guacamole = EmbeddedGuacamole()
```

**Download Guacd Binaries:**
```bash
# Create resources directory
mkdir -p backend/app/resources/guacd

# Download pre-compiled binaries
# Windows: https://github.com/apache/guacamole-server/releases
# Linux: Build from source or use Docker to extract binary
# macOS: Build from source with Homebrew dependencies

# Or build from Docker:
docker pull guacamole/guacd:latest
docker create --name guacd-temp guacamole/guacd:latest
docker cp guacd-temp:/usr/local/sbin/guacd backend/app/resources/guacd/guacd-linux-amd64
docker rm guacd-temp
```

### Option B: Pure Python Alternatives (Simpler, Less Features)

```python
# File: backend/app/services/remote_access_pure.py

import paramiko
import asyncio
from typing import AsyncGenerator

class SSHConnection:
    """Pure Python SSH using paramiko (already in requirements)"""
    
    async def connect(self, host: str, port: int, username: str, password: str):
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        await asyncio.get_event_loop().run_in_executor(
            None,
            client.connect,
            host, port, username, password
        )
        
        return client
    
    async def execute(self, client: paramiko.SSHClient, command: str) -> str:
        stdin, stdout, stderr = client.exec_command(command)
        output = await asyncio.get_event_loop().run_in_executor(
            None,
            stdout.read
        )
        return output.decode()

# For VNC/RDP, use websockify + novnc (JavaScript client)
# Or skip browser-based access and use native clients
```

---

## Step 4: Frontend Embedding

### 4.1 Build React Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4.2 Copy to Backend

```bash
mkdir -p backend/frontend_build
cp -r frontend/build/* backend/frontend_build/
```

### 4.3 Serve from FastAPI

```python
# File: backend/app/main.py

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="NOP", version="1.0.0")

# API routes
from backend.app.api.v1.router import api_router
app.include_router(api_router, prefix="/api/v1")

# Serve frontend (must be last)
frontend_path = Path(__file__).parent / "frontend_build"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")

# Startup event
@app.on_event("startup")
async def startup_event():
    # Initialize database
    from backend.app.core.database import init_db
    await init_db()
    
    # Start guacd (if using Option A)
    from backend.app.services.embedded_guacamole import guacamole
    await guacamole.start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

---

## Step 5: Nuitka Compilation

### 5.1 Create Build Script

```bash
# File: scripts/build_portable.sh
#!/bin/bash

set -e

echo "Building NOP Portable Executable..."

# 1. Build frontend
echo "Step 1/4: Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Copy frontend to backend
echo "Step 2/4: Copying frontend to backend..."
rm -rf backend/frontend_build
mkdir -p backend/frontend_build
cp -r frontend/build/* backend/frontend_build/

# 3. Install dependencies
echo "Step 3/4: Installing Python dependencies..."
cd backend
pip install -r requirements.txt
pip install nuitka ordered-set zstandard

# 4. Compile with Nuitka
echo "Step 4/4: Compiling with Nuitka..."

# Detect platform
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
    ICON="--windows-icon-from-ico=../assets/icon.ico"
    OUTPUT="nop-portable.exe"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
    ICON="--macos-app-icon=../assets/icon.icns"
    OUTPUT="nop-portable"
else
    PLATFORM="linux"
    ICON=""
    OUTPUT="nop-portable"
fi

python -m nuitka \
    --standalone \
    --onefile \
    --include-data-dir=frontend_build=frontend_build \
    --include-data-dir=resources=resources \
    --enable-plugin=anti-bloat \
    --nofollow-import-to=pytest \
    --nofollow-import-to=setuptools \
    --output-dir=../dist \
    --output-filename=$OUTPUT \
    --company-name="NOP" \
    --product-name="Network Observatory Platform" \
    --file-version=1.0.0 \
    --product-version=1.0.0 \
    $ICON \
    --assume-yes-for-downloads \
    app/main.py

cd ..

echo ""
echo "✅ Build complete!"
echo "Executable: dist/$OUTPUT"
echo ""
ls -lh dist/$OUTPUT
```

### 5.2 Make Executable

```bash
chmod +x scripts/build_portable.sh
```

### 5.3 Build

```bash
./scripts/build_portable.sh
```

**Expected Output:**
```
Building NOP Portable Executable...
Step 1/4: Building frontend...
Step 2/4: Copying frontend to backend...
Step 3/4: Installing Python dependencies...
Step 4/4: Compiling with Nuitka...
Nuitka-Options: Used command line options...
[... compilation output ...]
✅ Build complete!
Executable: dist/nop-portable
-rwxr-xr-x 1 user user 287M Jan 5 10:30 dist/nop-portable
```

**Build Time:**
- First build: 10-20 minutes
- Subsequent builds: 5-10 minutes (with ccache)

---

## Step 6: Testing

### 6.1 Test Executable

```bash
# Run the executable
./dist/nop-portable

# Should output:
# INFO:     Started server process [12345]
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://0.0.0.0:8080
```

### 6.2 Access Frontend

Open browser to: `http://localhost:8080`

### 6.3 Test Features

1. **Login**: Use default credentials
2. **Dashboard**: Check if loads
3. **Assets**: Add test asset
4. **Network Scan**: Run discovery
5. **Traffic**: Capture packets
6. **Remote Access**: Test SSH connection

### 6.4 Test Database Persistence

```bash
# Stop the app (Ctrl+C)
# Check that nop.db exists
ls -lh nop.db

# Restart
./dist/nop-portable

# Verify data persists (assets still there)
```

---

## Step 7: Cross-Platform Builds

### 7.1 Build for Windows (on Windows)

```powershell
# Install Visual Studio Build Tools
# Download: https://visualstudio.microsoft.com/downloads/

# Run build script
.\scripts\build_portable.bat

# Or manually:
cd backend
python -m nuitka ^
    --standalone ^
    --onefile ^
    --include-data-dir=frontend_build=frontend_build ^
    --windows-icon-from-ico=..\assets\icon.ico ^
    --output-dir=..\dist ^
    --output-filename=nop-portable.exe ^
    app\main.py
```

### 7.2 Build for macOS (on macOS)

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Run build script
./scripts/build_portable.sh

# Result: dist/nop-portable (macOS binary)
```

### 7.3 Build for Linux (on Linux)

```bash
# Install build tools
sudo apt install -y gcc g++ ccache patchelf

# Run build script
./scripts/build_portable.sh

# Result: dist/nop-portable (Linux binary)
```

---

## Step 8: Distribution

### 8.1 Package for Distribution

```bash
# Create release directory
mkdir -p release/nop-portable-v1.0.0

# Copy executable
cp dist/nop-portable release/nop-portable-v1.0.0/

# Add documentation
cat > release/nop-portable-v1.0.0/README.txt << 'EOF'
Network Observatory Platform - Portable Edition
Version 1.0.0

QUICK START:
1. Double-click 'nop-portable' (or 'nop-portable.exe' on Windows)
2. Open browser to http://localhost:8080
3. Login with default credentials:
   Username: admin
   Password: admin123

FIRST RUN:
- The first run will create 'nop.db' database file
- Change the default password immediately!

REQUIREMENTS:
- No installation needed
- No Docker required
- No dependencies
- Works on Windows 10+, Linux (Ubuntu 20.04+), macOS 10.15+

NETWORK REQUIREMENTS:
- Administrator/root privileges for packet capture
- Firewall may need to allow port 8080

SUPPORT:
- Documentation: https://github.com/goranjovic55/NOP/docs
- Issues: https://github.com/goranjovic55/NOP/issues
EOF

# Create archive
cd release
zip -r nop-portable-v1.0.0-linux.zip nop-portable-v1.0.0/
# OR
tar -czf nop-portable-v1.0.0-linux.tar.gz nop-portable-v1.0.0/
```

### 8.2 GitHub Release

```bash
# Tag release
git tag -a v1.0.0-portable -m "Portable executable release"
git push origin v1.0.0-portable

# Upload to GitHub Releases:
# - nop-portable-v1.0.0-windows.zip (Windows binary)
# - nop-portable-v1.0.0-linux.tar.gz (Linux binary)
# - nop-portable-v1.0.0-macos.zip (macOS binary)
```

---

## Troubleshooting

### Build Errors

**Error: "Module not found"**
```bash
# Install missing module
pip install <module-name>

# Rebuild
./scripts/build_portable.sh
```

**Error: "C compiler not found"**
```bash
# Linux:
sudo apt install gcc g++

# macOS:
xcode-select --install

# Windows:
# Install Visual Studio Build Tools
```

### Runtime Errors

**Error: "Permission denied" (Linux/macOS)**
```bash
chmod +x dist/nop-portable
./dist/nop-portable
```

**Error: "Port 8080 already in use"**
```bash
# Change port
./dist/nop-portable --port 8081

# Or find and kill process
lsof -ti:8080 | xargs kill
```

**Error: "Database locked"**
```bash
# SQLite database is locked
# Stop all instances of nop-portable
pkill nop-portable

# Restart
./dist/nop-portable
```

### Performance Issues

**Slow startup**
- First run is slower (10-20 seconds)
- Subsequent runs are faster (2-5 seconds)
- Consider using `--windows-disable-console` to hide console on Windows

**High memory usage**
- Expected: 500MB-1GB
- To reduce: Limit cache size in `backend/app/core/cache.py`

---

## Optimization Tips

### Reduce Binary Size

```bash
# Use UPX compression (reduces size by 30-50%)
# Download UPX: https://upx.github.io/

upx --best --lzma dist/nop-portable

# Before: 287MB
# After: 150-180MB
```

### Improve Startup Time

```python
# File: backend/app/main.py

# Lazy import heavy modules
@app.get("/api/v1/scans")
async def start_scan():
    # Import only when needed
    from backend.app.services.scanner_service import ScannerService
    scanner = ScannerService()
    ...
```

### Enable Logging

```python
# File: backend/app/main.py

import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('nop.log'),
        logging.StreamHandler()
    ]
)
```

---

## Next Steps

After completing this guide, you have:
✅ Single portable executable
✅ No Docker dependency
✅ No Python runtime needed
✅ SQLite database (portable)
✅ Embedded frontend
✅ Works on Windows/Linux/macOS

**Optional Enhancements:**
1. Add auto-update mechanism
2. Create installer (NSIS for Windows, DEB for Linux, DMG for macOS)
3. Wrap in Tauri for native desktop app (see PORTABLE_BUILD_GUIDE_TAURI.md)
4. Add system tray icon
5. Create service/daemon for auto-start

**See Also:**
- [Portable Executable Solutions](../architecture/PORTABLE_EXECUTABLE_SOLUTIONS.md) - Full analysis
- [Tauri Build Guide](PORTABLE_BUILD_GUIDE_TAURI.md) - Desktop app version
- [Server-Client Guide](PORTABLE_BUILD_GUIDE_SERVER_CLIENT.md) - Enterprise deployment

