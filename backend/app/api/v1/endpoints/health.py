"""
Health check endpoints with CT status monitoring
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import asyncio
import httpx

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import get_current_user
from app.models.user import User
import redis.asyncio as redis

router = APIRouter()

# CT Configuration
CT_IPS = [f"10.10.10.{i}" for i in range(100, 108)]  # CT100-CT107
CT_API_VERSIONS = {
    **{f"10.10.10.{i}": "4" for i in range(100, 104)},  # CT100-103: API v4
    **{f"10.10.10.{i}": "3" for i in range(104, 108)},  # CT104-107: API v3
}
GLANCES_PORT = 61208
CT_TIMEOUT = 3.0  # seconds
CACHE_TTL_SECONDS = 15

# In-memory cache
_cache_data: Optional[dict] = None
_cache_timestamp: Optional[float] = None


# Pydantic models
class CTStatus(BaseModel):
    ct_id: str
    status: str  # "online" or "offline"
    cpu_percent: Optional[float] = None
    mem_percent: Optional[float] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    last_updated_utc: str
    total_cts: int
    online_cts: int
    cts: List[CTStatus]


async def fetch_ct_metrics(ip: str, client: httpx.AsyncClient) -> CTStatus:
    """Fetch metrics from a single CT via Glances API"""
    ct_id = f"CT{ip.split('.')[-1]}"
    api_version = CT_API_VERSIONS.get(ip, "3")

    try:
        # Fetch CPU and memory in parallel
        cpu_url = f"http://{ip}:{GLANCES_PORT}/api/{api_version}/cpu"
        mem_url = f"http://{ip}:{GLANCES_PORT}/api/{api_version}/mem"

        cpu_task = client.get(cpu_url, timeout=CT_TIMEOUT)
        mem_task = client.get(mem_url, timeout=CT_TIMEOUT)

        cpu_resp, mem_resp = await asyncio.gather(
            cpu_task, mem_task, return_exceptions=True
        )

        # Handle CPU response
        if isinstance(cpu_resp, Exception):
            return CTStatus(
                ct_id=ct_id,
                status="offline",
                error=f"CPU fetch failed: {str(cpu_resp)}"
            )

        if cpu_resp.status_code != 200:
            return CTStatus(
                ct_id=ct_id,
                status="offline",
                error=f"CPU endpoint returned {cpu_resp.status_code}"
            )

        cpu_data = cpu_resp.json()

        # Handle memory response
        if isinstance(mem_resp, Exception):
            return CTStatus(
                ct_id=ct_id,
                status="offline",
                error=f"Memory fetch failed: {str(mem_resp)}"
            )

        if mem_resp.status_code != 200:
            return CTStatus(
                ct_id=ct_id,
                status="offline",
                error=f"Memory endpoint returned {mem_resp.status_code}"
            )

        mem_data = mem_resp.json()

        # Extract metrics (handle both v3 and v4 response formats)
        cpu_percent = cpu_data.get("total") or cpu_data.get("user", 0)
        mem_percent = mem_data.get("percent", 0)

        return CTStatus(
            ct_id=ct_id,
            status="online",
            cpu_percent=round(cpu_percent, 2) if cpu_percent else 0.0,
            mem_percent=round(mem_percent, 2) if mem_percent else 0.0
        )

    except httpx.TimeoutException:
        return CTStatus(
            ct_id=ct_id,
            status="offline",
            error="Request timeout (3s)"
        )
    except Exception as e:
        return CTStatus(
            ct_id=ct_id,
            status="offline",
            error=str(e)
        )


async def get_ct_health_data() -> HealthResponse:
    """Fetch health data from all CTs in parallel with caching"""
    global _cache_data, _cache_timestamp

    # Check cache
    now = datetime.now(timezone.utc).timestamp()
    if _cache_data and _cache_timestamp and (now - _cache_timestamp) < CACHE_TTL_SECONDS:
        return HealthResponse(**_cache_data)

    # Fetch fresh data from all CTs in parallel
    async with httpx.AsyncClient() as client:
        tasks = [fetch_ct_metrics(ip, client) for ip in CT_IPS]
        ct_results = await asyncio.gather(*tasks)

    # Count online CTs
    online_count = sum(1 for ct in ct_results if ct.status == "online")

    # Build response
    response = HealthResponse(
        last_updated_utc=datetime.now(timezone.utc).isoformat(),
        total_cts=len(CT_IPS),
        online_cts=online_count,
        cts=list(ct_results)
    )

    # Update cache
    _cache_data = response.model_dump()
    _cache_timestamp = now

    return response


@router.get("/")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "service": "Network Observatory Platform",
        "version": "1.0.0"
    }


@router.get("/detailed")
async def detailed_health_check(
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
):
    """Detailed health check including dependencies"""
    health_status = {
        "status": "healthy",
        "service": "Network Observatory Platform",
        "version": "1.0.0",
        "dependencies": {}
    }

    # Check database
    try:
        await db.execute("SELECT 1")
        health_status["dependencies"]["database"] = "healthy"
    except Exception as e:
        health_status["dependencies"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check Redis
    try:
        await redis_client.ping()
        health_status["dependencies"]["redis"] = "healthy"
    except Exception as e:
        health_status["dependencies"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    return health_status


@router.get("/cts", response_model=HealthResponse)
async def get_ct_health(
    current_user: User = Depends(get_current_user)
):
    """
    Get health status of all CTs (CT100-CT107) from Glances API.

    - Fetches CPU% and memory% from each CT's Glances API
    - CT100-103 use API v4, CT104-107 use API v3
    - 3 second timeout per CT (marked offline if unreachable)
    - Results cached for 15 seconds
    """
    return await get_ct_health_data()
