---
name: infrastructure
description: Docker, container orchestration, and network service lifecycle patterns. Use when creating Dockerfiles, docker-compose, or network services.
---

# Infrastructure

## When to Use
- Creating Dockerfiles
- Configuring docker-compose
- Setting up CI/CD
- Managing container resources
- Creating network scanning/sniffing services
- Implementing service lifecycle management

## Pattern
Container orchestration with multi-stage builds + async service lifecycle

## Checklist
- [ ] Multi-stage Dockerfile (build → runtime)
- [ ] Health checks defined
- [ ] Secrets via env vars (not baked in)
- [ ] Resource limits set (memory, CPU)
- [ ] Use async/await for I/O operations (network services)
- [ ] Implement start/stop lifecycle methods
- [ ] Use locks for thread-safe state management
- [ ] Clean up resources on shutdown

## Examples

### Multi-Stage Dockerfile
```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application
COPY ./app ./app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose with Resources
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    ports:
      - "8000:8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Environment Variables
```bash
# .env (never commit!)
DATABASE_URL=postgresql://user:pass@localhost/db
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key

# .env.example (commit this)
DATABASE_URL=postgresql://user:pass@localhost/db
SECRET_KEY=change-me-in-production
API_KEY=your-api-key-here
```

## Network Service Patterns

### Base Service Pattern
```python
import asyncio
from abc import ABC, abstractmethod

class NetworkService(ABC):
    def __init__(self):
        self.active = False
        self.lock = asyncio.Lock()
        self.task = None
    
    async def start(self):
        """Start service with proper resource management."""
        async with self.lock:
            if not self.active:
                await self._initialize()
                self.active = True
                self.task = asyncio.create_task(self._run())
    
    async def stop(self):
        """Clean shutdown."""
        async with self.lock:
            if self.active:
                self.active = False
                if self.task:
                    self.task.cancel()
                    try:
                        await self.task
                    except asyncio.CancelledError:
                        pass
                await self._cleanup()
    
    @abstractmethod
    async def _initialize(self):
        """Initialize resources."""
        pass
    
    @abstractmethod
    async def _run(self):
        """Main service loop."""
        pass
    
    @abstractmethod
    async def _cleanup(self):
        """Cleanup resources."""
        pass
```

### Packet Capture Service
```python
from scapy.all import AsyncSniffer

class PacketCaptureService(NetworkService):
    def __init__(self, interface: str = "eth0"):
        super().__init__()
        self.interface = interface
        self.sniffer = None
        self.packet_queue = asyncio.Queue()
    
    async def _initialize(self):
        """Initialize packet sniffer."""
        self.sniffer = AsyncSniffer(
            iface=self.interface,
            prn=self._packet_callback,
            store=False
        )
        self.sniffer.start()
    
    async def _run(self):
        """Process captured packets."""
        while self.active:
            try:
                packet = await asyncio.wait_for(
                    self.packet_queue.get(),
                    timeout=1.0
                )
                await self._process_packet(packet)
            except asyncio.TimeoutError:
                continue
    
    async def _cleanup(self):
        """Stop sniffer and cleanup."""
        if self.sniffer:
            self.sniffer.stop()
        # Clear queue
        while not self.packet_queue.empty():
            self.packet_queue.get_nowait()
    
    def _packet_callback(self, packet):
        """Callback for each captured packet."""
        asyncio.create_task(self.packet_queue.put(packet))
```

### Network Scanner Service
```python
import nmap

class ScanService(NetworkService):
    def __init__(self):
        super().__init__()
        self.scanner = None
    
    async def _initialize(self):
        """Initialize nmap scanner."""
        self.scanner = nmap.PortScanner()
    
    async def scan_network(self, target: str, ports: str = "1-1000"):
        """Perform network scan."""
        if not self.active:
            raise RuntimeError("Service not started")
        
        # Run scan in thread pool (nmap is blocking)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.scanner.scan(target, ports)
        )
        return result
    
    async def _run(self):
        """Service runs on-demand scans."""
        pass
    
    async def _cleanup(self):
        """Cleanup scanner resources."""
        self.scanner = None
```
