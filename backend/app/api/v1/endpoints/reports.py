"""
Reports endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter()


@router.get("/")
async def get_reports(db: AsyncSession = Depends(get_db)):
    """Get list of reports"""
    return {"reports": [], "total": 0}


@router.post("/generate")
async def generate_report(db: AsyncSession = Depends(get_db)):
    """Generate a new report"""
    return {"message": "Report generation started", "report_id": "placeholder"}