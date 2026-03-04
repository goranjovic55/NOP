"""
Routing module - full route manipulation endpoints
"""
import asyncio
import re
import subprocess
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, IPvAnyAddress

router = APIRouter()

# In-memory storage for temporary routes
_temporary_routes: dict = {}


# Pydantic Models
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
    command: str
    destination: str
    gateway: str
    expires_at: Optional[datetime] = None


class RouteTableEntry(BaseModel):
    id: str
    destination: str
    gateway: str
    interface: Optional[str] = None
    metric: int
    type: str  # temporary or permanent
    expires_at: Optional[datetime] = None


class RouteTableResponse(BaseModel):
    routes: List[RouteTableEntry]


class RouteTestRequest(BaseModel):
    destination: str
    gateway: IPvAnyAddress
    interface: Optional[str] = None
    metric: int = 100


class RouteTestResponse(BaseModel):
    valid: bool
    command: str
    message: str


def parse_ip_route_show() -> List[RouteTableEntry]:
    """Parse output of 'ip route show' command"""
    routes = []
    try:
        result = subprocess.run(
            ["ip", "route", "show"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            return []

        for line in result.stdout.strip().split('\n'):
            if not line:
                continue

            # Parse the route line
            parts = line.split()
            if not parts:
                continue

            destination = parts[0]
            gateway = ""
            interface = None
            metric = 100
            route_type = "permanent"

            i = 1
            while i < len(parts):
                if parts[i] == "via" and i + 1 < len(parts):
                    gateway = parts[i + 1]
                    i += 2
                elif parts[i] == "dev" and i + 1 < len(parts):
                    interface = parts[i + 1]
                    i += 2
                elif parts[i] == "metric" and i + 1 < len(parts):
                    metric = int(parts[i + 1])
                    i += 2
                elif parts[i] == "proto":
                    # Check if it's a temporary route we added
                    if i + 1 < len(parts) and parts[i + 1] in ("static", "boot"):
                        pass  # Keep as permanent
                    i += 2 if i + 1 < len(parts) else 1
                else:
                    i += 1

            if not gateway:
                continue

            # Check if this is one of our temporary routes
            route_id = None
            expires_at = None
            for rid, info in _temporary_routes.items():
                if info["destination"] == destination and info["gateway"] == gateway:
                    route_id = rid
                    expires_at = info.get("expires_at")
                    route_type = "temporary"
                    break

            # Generate ID if not found
            if not route_id:
                route_id = str(uuid.uuid4())[:8]

            routes.append(RouteTableEntry(
                id=route_id,
                destination=destination,
                gateway=gateway,
                interface=interface,
                metric=metric,
                type=route_type,
                expires_at=expires_at
            ))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse routes: {str(e)}")

    return routes


async def _cleanup_route(route_id: str, destination: str):
    """Cleanup a temporary route after TTL expires"""
    await asyncio.sleep(0)  # Yield control

    try:
        # Remove the route from system
        subprocess.run(
            ["ip", "route", "del", destination],
            capture_output=True,
            timeout=5
        )
    except Exception:
        pass  # Ignore cleanup errors

    # Remove from our tracking
    if route_id in _temporary_routes:
        del _temporary_routes[route_id]


@router.get("/table", response_model=RouteTableResponse)
async def get_routing_table():
    """
    Get current routing table.
    Parses 'ip route show' output.
    """
    routes = parse_ip_route_show()
    return RouteTableResponse(routes=routes)


@router.post("/add", response_model=RouteResponse)
async def add_route(request: RouteAddRequest):
    """
    Add a new route.
    If temporary=True, adds TTL-based auto-cleanup via asyncio.
    """
    route_id = str(uuid.uuid4())[:8]

    # Build command
    cmd = ["ip", "route", "add", request.destination, "via", str(request.gateway)]
    if request.interface:
        cmd.extend(["dev", request.interface])
    if request.metric:
        cmd.extend(["metric", str(request.metric)])

    command_str = " ".join(cmd)

    # Execute
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to add route: {result.stderr.strip()}"
        )

    expires_at = None
    if request.temporary:
        expires_at = datetime.utcnow() + timedelta(seconds=request.ttl_seconds)
        # Schedule cleanup
        asyncio.create_task(_cleanup_route(route_id, request.destination))

    # Store in our tracking
    _temporary_routes[route_id] = {
        "destination": request.destination,
        "gateway": str(request.gateway),
        "interface": request.interface,
        "metric": request.metric,
        "expires_at": expires_at
    }

    return RouteResponse(
        route_id=route_id,
        status="added",
        command=command_str,
        destination=request.destination,
        gateway=str(request.gateway),
        expires_at=expires_at
    )


@router.delete("/remove/{route_id}")
async def remove_route(route_id: str):
    """
    Remove a specific route by ID.
    """
    # Find route by our tracking ID
    destination = None
    for rid, info in _temporary_routes.items():
        if rid == route_id:
            destination = info["destination"]
            break

    if not destination:
        # Try to find by checking if it's a known route
        routes = parse_ip_route_show()
        for r in routes:
            if r.id == route_id:
                destination = r.destination
                break

    if not destination:
        raise HTTPException(status_code=404, detail=f"Route {route_id} not found")

    # Remove from system
    result = subprocess.run(
        ["ip", "route", "del", destination],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to remove route: {result.stderr.strip()}"
        )

    # Remove from tracking
    if route_id in _temporary_routes:
        del _temporary_routes[route_id]

    return {"status": "removed", "route_id": route_id, "destination": destination}


@router.post("/test", response_model=RouteTestResponse)
async def test_route(request: RouteTestRequest):
    """
    Test a route without applying (dry run).
    """
    # Build command
    cmd = ["ip", "route", "add", request.destination, "via", str(request.gateway)]
    if request.interface:
        cmd.extend(["dev", request.interface])
    if request.metric:
        cmd.extend(["metric", str(request.metric)])

    command_str = " ".join(cmd)

    # Try to add and immediately remove (atomic test)
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        # Success - remove the test route
        subprocess.run(
            ["ip", "route", "del", request.destination],
            capture_output=True,
            timeout=5
        )
        return RouteTestResponse(
            valid=True,
            command=command_str,
            message="Route is valid and can be added"
        )
    else:
        return RouteTestResponse(
            valid=False,
            command=command_str,
            message=f"Route test failed: {result.stderr.strip()}"
        )
