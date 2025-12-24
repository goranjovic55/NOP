"""
Settings management endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter()


@router.get("/")
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get system settings"""
    return {
        "discovery_mode": "passive_only",
        "scan_interval": 300,
        "enable_dpi": True,
        "data_retention_days": 30
    }


@router.put("/")
async def update_settings(db: AsyncSession = Depends(get_db)):
    """Update system settings"""
    return {"message": "Settings updated"}