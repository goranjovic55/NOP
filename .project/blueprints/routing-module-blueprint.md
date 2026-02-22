# Routing Module Blueprint

## Overview
Implementation of dynamic route manipulation for NOP based on proposal.

## API Endpoints

### 1. Route Management

#### GET /api/v1/routing/table
Returns current routing table.

**Response:**
```json
{
  "routes": [
    {
      "id": "route-uuid",
      "destination": "8.8.4.4/32",
      "gateway": "192.168.18.253",
      "interface": "br0",
      "metric": 100,
      "type": "temporary",
      "expires_at": "2026-02-22T11:30:00Z"
    }
  ]
}
```

#### POST /api/v1/routing/add
Add a new route.

**Request:**
```json
{
  "destination": "8.8.4.4/32",
  "gateway": "192.168.18.253",
  "interface": "br0",
  "metric": 100,
  "temporary": true,
  "ttl_seconds": 300
}
```

**Response:**
```json
{
  "route_id": "uuid",
  "status": "added",
  "command": "ip route add 8.8.4.4/32 via 192.168.18.253",
  "expires_at": "2026-02-22T11:30:00Z"
}
```

#### DELETE /api/v1/routing/remove/{id}
Remove a specific route.

#### POST /api/v1/routing/test
Test a route without applying.

### 2. Pydantic Models

```python
from pydantic import BaseModel, IPvAnyAddress
from typing import Optional
from datetime import datetime

class RouteAddRequest(BaseModel):
    destination: str  # CIDR notation
    gateway: IPvAnyAddress
    interface: Optional[str] = None
    metric: int = 100
    temporary: bool = True
    ttl_seconds: int = 300

class RouteResponse(BaseModel):
    route_id: str
    status: str
    destination: str
    gateway: str
    expires_at: Optional[datetime]
    
class RouteTableEntry(BaseModel):
    id: str
    destination: str
    gateway: str
    interface: Optional[str]
    metric: int
    type: str  # temporary or permanent
    expires_at: Optional[datetime]
```

### 3. Implementation Steps

1. Create models in `app/models/routing.py`
2. Create service in `app/services/route_service.py`
3. Create endpoints in `app/api/v1/endpoints/routing.py`
4. Add router in `app/api/v1/router.py`
5. Create frontend components in `frontend/src/components/RoutingPanel.tsx`

### 4. Service Implementation

```python
# app/services/route_service.py

import subprocess
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional

class RouteService:
    def __init__(self):
        self.active_routes = {}  # route_id -> route_info
    
    async def add_route(self, request: RouteAddRequest) -> RouteResponse:
        route_id = str(uuid.uuid4())
        
        # Build command
        cmd = ["ip", "route", "add", request.destination, "via", str(request.gateway)]
        if request.interface:
            cmd.extend(["dev", request.interface])
        if request.metric:
            cmd.extend(["metric", str(request.metric)])
        
        # Execute
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            expires = None
            if request.temporary:
                expires = datetime.utcnow() + timedelta(seconds=request.ttl_seconds)
                asyncio.create_task(
                    self._cleanup_route(route_id, request.destination, request.ttl_seconds)
                )
            
            route_info = {
                "id": route_id,
                "destination": request.destination,
                "gateway": str(request.gateway),
                "interface": request.interface,
                "metric": request.metric,
                "temporary": request.temporary,
                "expires_at": expires
            }
            self.active_routes[route_id] = route_info
            
            return RouteResponse(
                route_id=route_id,
                status="added",
                destination=request.destination,
                gateway=str(request.gateway),
                expires_at=expires
            )
        else:
            raise Exception(f"Failed to add route: {result.stderr}")
    
    async def _cleanup_route(self, route_id: str, destination: str, delay: int):
        await asyncio.sleep(delay)
        subprocess.run(["ip", "route", "del", destination], capture_output=True)
        if route_id in self.active_routes:
            del self.active_routes[route_id]
    
    def get_routes(self) -> List[RouteTableEntry]:
        # Parse ip route show output
        result = subprocess.run(["ip", "route", "show"], capture_output=True, text=True)
        routes = []
        # Parse logic here...
        return routes
```

### 5. Frontend Components

```typescript
// frontend/src/components/RoutingPanel.tsx

interface RouteFormProps {
  onAdd: (route: RouteRequest) => void;
}

interface RouteListProps {
  routes: RouteEntry[];
  onDelete: (id: string) => void;
}

// Components:
// - RouteForm: Input fields for destination, gateway, interface, TTL
// - RouteList: Table of active routes with countdown timers
// - RouteTest: Button to test route without adding
```

## Security Considerations

- Validate destination (block 0.0.0.0/0 override)
- Only allow temporary routes by default
- Log all route changes
- Rate limiting on route modifications
- Require confirmation for non-temporary routes
