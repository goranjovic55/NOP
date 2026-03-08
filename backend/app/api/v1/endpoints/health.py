"""
Health check endpoints with CT status monitoring
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone
import asyncio
import httpx

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import get_current_user
from app.models.user import User
from app.models.health import CTHealth, CTSHealthResponse, HealthSummary
from app.services.glances import get_all_cts_health, get_single_ct_health
import redis.asyncio as redis

router = APIRouter()


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


@router.get("/cts", response_model=CTSHealthResponse)
async def get_cts_health(
    current_user: User = Depends(get_current_user)
):
    """
    Get health status of all CTs (CT100-CT107) from Glances API.

    - Fetches CPU, memory, network, disk, and uptime from each CT's Glances API
    - CT100-103 use Glances v4, CT104-107 use Glances v3
    - 3 second timeout per CT (marked offline if unreachable)
    - Results cached for 30 seconds
    - Network rates exclude loopback interfaces
    - Disk rates summed across all devices
    """
    return await get_all_cts_health()


@router.get("/cts/{ct_id}", response_model=CTHealth)
async def get_single_ct(
    ct_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get health status of a single CT by ID (e.g., CT100, CT101, etc.)
    
    - Fetches fresh metrics from the specified CT
    - No caching for single CT queries
    """
    # Parse CT ID (e.g., "CT100" -> 100)
    if not ct_id.startswith("CT") or not ct_id[2:].isdigit():
        raise HTTPException(status_code=400, detail="Invalid CT ID format. Use CT100-CT107")
    
    ct_num = int(ct_id[2:])
    if ct_num < 100 or ct_num > 107:
        raise HTTPException(status_code=404, detail="CT not found. Valid range: CT100-CT107")
    
    health = await get_single_ct_health(ct_num)
    if health is None:
        raise HTTPException(status_code=404, detail="CT not found")
    
    return health
