---
name: backend-api
description: FastAPI patterns with layered architecture, typing, and dependency injection. Use when creating backend API endpoints.
---

# Backend API Patterns

## When to Use
- Creating new API endpoints
- Implementing REST APIs  
- Structuring service layers
- Adding request validation
- Setting up dependency injection

## Pattern
Layered architecture (Endpoint → Service → Model) with full typing

## Checklist
- [ ] Endpoint → Service → Model separation
- [ ] Define response_model for validation
- [ ] Use dependency injection for db and auth
- [ ] Request validation (Pydantic schemas)
- [ ] Error handling (custom exceptions)
- [ ] Type hint return values
- [ ] Async where I/O-bound
- [ ] Include docstrings

## Examples

### Basic CRUD Endpoint
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import ScanCreate, ScanResponse
from app.models import Scan
from sqlalchemy import select

router = APIRouter(prefix="/scans", tags=["scans"])

@router.get("", response_model=list[ScanResponse])
async def list_scans(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, le=1000, description="Maximum records to return"),
    db: AsyncSession = Depends(get_db)
) -> list[ScanResponse]:
    """List all scans with pagination."""
    result = await db.execute(
        select(Scan).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: int,
    db: AsyncSession = Depends(get_db)
) -> ScanResponse:
    """Get a specific scan by ID."""
    result = await db.execute(
        select(Scan).where(Scan.id == scan_id)
    )
    scan = result.scalar_one_or_none()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return scan

@router.post("", response_model=ScanResponse, status_code=201)
async def create_scan(
    scan_data: ScanCreate,
    db: AsyncSession = Depends(get_db)
) -> ScanResponse:
    """Create a new network scan."""
    scan = Scan(**scan_data.dict())
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan
```

### Layered Architecture with Service
```python
# Endpoint Layer
from app.services.scan_service import ScanService

@router.post("", response_model=ScanResponse)
async def create_scan(
    scan_data: ScanCreate,
    service: ScanService = Depends()
) -> ScanResponse:
    """Create a new network scan."""
    return await service.create_scan(scan_data)

# Service Layer
from sqlalchemy.ext.asyncio import AsyncSession

class ScanService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db
    
    async def create_scan(self, scan_data: ScanCreate) -> Scan:
        """Business logic for creating a scan."""
        # Validate target
        if not self._is_valid_target(scan_data.target):
            raise ValidationError("Invalid target")
        
        # Create model
        scan = Scan(**scan_data.dict())
        self.db.add(scan)
        await self.db.commit()
        await self.db.refresh(scan)
        
        # Trigger background task
        await self._start_scan_task(scan.id)
        
        return scan
    
    def _is_valid_target(self, target: str) -> bool:
        """Validate target IP or network."""
        import ipaddress
        try:
            ipaddress.ip_network(target, strict=False)
            return True
        except ValueError:
            return False

# Model Layer
from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base

class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(Integer, primary_key=True)
    target = Column(String, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime, server_default=func.now())
```

### Custom Validators
```python
from pydantic import BaseModel, validator, Field

class ScanCreate(BaseModel):
    target: str = Field(..., description="Target IP or network")
    ports: str = Field("1-1000", description="Port range")
    scan_type: str = Field("tcp", description="Scan type")
    
    @validator('target')
    def validate_target(cls, v):
        """Validate target is valid IP or CIDR."""
        import ipaddress
        try:
            ipaddress.ip_network(v, strict=False)
        except ValueError:
            raise ValueError('Invalid IP address or network')
        return v
    
    @validator('ports')
    def validate_ports(cls, v):
        """Validate port range format."""
        import re
        if not re.match(r'^\d+-\d+$', v):
            raise ValueError('Invalid port range format (use: 1-1000)')
        start, end = map(int, v.split('-'))
        if start > end or start < 1 or end > 65535:
            raise ValueError('Invalid port range')
        return v
```

### Background Tasks
```python
from fastapi import BackgroundTasks

async def run_scan_task(scan_id: int, db: AsyncSession):
    """Background task to run the scan."""
    result = await db.execute(
        select(Scan).where(Scan.id == scan_id)
    )
    scan = result.scalar_one()
    scan.status = "running"
    await db.commit()
    
    try:
        results = await perform_scan(scan.target, scan.ports)
        scan.status = "completed"
        scan.results = results
    except Exception as e:
        scan.status = "failed"
        scan.error = str(e)
    
    await db.commit()

@router.post("/{scan_id}/start", response_model=ScanResponse)
async def start_scan(
    scan_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> ScanResponse:
    """Start a scan in the background."""
    result = await db.execute(
        select(Scan).where(Scan.id == scan_id)
    )
    scan = result.scalar_one_or_none()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    background_tasks.add_task(run_scan_task, scan_id, db)
    
    scan.status = "queued"
    await db.commit()
    await db.refresh(scan)
    return scan
```

### WebSocket Streaming
```python
from fastapi import WebSocket, WebSocketDisconnect

@router.websocket("/ws/traffic")
async def traffic_stream(websocket: WebSocket):
    """Stream network traffic in real-time."""
    await websocket.accept()
    
    try:
        while True:
            # Get traffic data
            packet = await get_next_packet()
            
            # Send to client
            await websocket.send_json({
                "timestamp": packet.timestamp,
                "src": packet.src_ip,
                "dst": packet.dst_ip,
                "protocol": packet.protocol
            })
            
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    finally:
        await cleanup_connection()
```

### File Upload
```python
from fastapi import File, UploadFile
import aiofiles

@router.post("/{scan_id}/evidence", response_model=dict)
async def upload_evidence(
    scan_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Upload evidence file for a scan."""
    # Validate file type
    allowed_types = ['image/png', 'image/jpeg', 'application/pdf']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {allowed_types}"
        )
    
    # Validate file size (10MB max)
    max_size = 10 * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail="File too large. Max 10MB"
        )
    
    # Save file
    file_path = f"volumes/evidence/{scan_id}_{file.filename}"
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(contents)
    
    return {
        "filename": file.filename,
        "path": file_path,
        "size": len(contents)
    }
```

## Common Patterns

### Dependency Injection
```python
# Database
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Service
class ScanService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

# In endpoint
@router.get("/")
async def handler(service: ScanService = Depends()):
    return await service.get_all()
```

### Error Responses
```python
from app.exceptions import NotFoundError, ValidationError

@router.get("/{id}")
async def get_item(id: int, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Item).where(Item.id == id)
        )
        item = result.scalar_one_or_none()
        
        if not item:
            raise NotFoundError(f"Item {id} not found")
        
        return item
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error fetching item {id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )
```
