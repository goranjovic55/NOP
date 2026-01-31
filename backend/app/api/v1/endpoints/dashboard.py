"""
Dashboard endpoints for metrics and recent activity
"""

from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import (
    DashboardMetrics,
    RecentActivityResponse,
    HealthScoreResponse,
    AlertSummaryResponse,
    AgentSummaryResponse,
    VulnerabilitySummaryResponse,
    TopTalkersResponse,
    TopVulnerableHostsResponse,
    SparklineResponse,
    DiscoveryTrendResponse
)
from app.core.security import get_current_user
from app.core.pov_middleware import get_agent_pov
from app.models.user import User

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard metrics (requires authentication, supports agent POV)"""
    agent_pov = get_agent_pov(request)
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_metrics(agent_id=agent_pov)


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent activity (discovered hosts, scans, exploits, supports agent POV)"""
    agent_pov = get_agent_pov(request)
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_recent_activity(agent_id=agent_pov)


# Phase 1: New Dashboard Endpoints

@router.get("/health-score", response_model=HealthScoreResponse)
async def get_health_score(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall system health score (0-100)"""
    agent_pov = get_agent_pov(request)
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_health_score(agent_id=agent_pov)


@router.get("/alert-summary", response_model=AlertSummaryResponse)
async def get_alert_summary(
    hours: int = Query(default=24, ge=1, le=168, description="Hours to look back"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get alert counts by severity for last N hours"""
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_alert_summary(hours=hours)


@router.get("/agent-summary", response_model=AgentSummaryResponse)
async def get_agent_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get agent status summary (online/offline/error counts)"""
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_agent_summary()


@router.get("/vulnerability-summary", response_model=VulnerabilitySummaryResponse)
async def get_vulnerability_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vulnerability counts by severity"""
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_vulnerability_summary()


@router.get("/top-talkers", response_model=TopTalkersResponse)
async def get_top_talkers(
    limit: int = Query(default=5, ge=1, le=20, description="Number of hosts to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get top N hosts by traffic volume"""
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_top_talkers(limit=limit)


@router.get("/top-vulnerable", response_model=TopVulnerableHostsResponse)
async def get_top_vulnerable_hosts(
    limit: int = Query(default=5, ge=1, le=20, description="Number of hosts to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get top N hosts by vulnerability count"""
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_top_vulnerable_hosts(limit=limit)


@router.get("/sparklines", response_model=SparklineResponse)
async def get_sparklines(
    days: int = Query(default=7, ge=1, le=30, description="Days to look back"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get sparkline trend data for stat cards"""
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_sparklines(days=days)


@router.get("/discovery-trend", response_model=DiscoveryTrendResponse)
async def get_discovery_trend(
    days: int = Query(default=30, ge=1, le=90, description="Days to look back"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get discovery rate trend over last N days"""
    dashboard_service = DashboardService(db)
    return await dashboard_service.get_discovery_trend(days=days)
