"""
Scanning endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter()


@router.get("/")
async def get_scans(db: AsyncSession = Depends(get_db)):
    """Get list of scans"""
    return {"scans": [], "total": 0}


@router.post("/")
async def create_scan(db: AsyncSession = Depends(get_db)):
    """Create a new scan"""
    return {"message": "Scan created", "scan_id": "placeholder"}