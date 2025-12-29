"""
Dashboard endpoints for metrics and recent activity
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardMetrics, RecentActivityResponse
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard metrics (requires authentication)"""
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_metrics()


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent activity (discovered hosts, scans, exploits)"""
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_recent_activity()
