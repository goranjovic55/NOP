"""
Main API router for v1 endpoints
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    assets,
    discovery,
    traffic,
    scans,
    credentials,
    settings,
    reports,
    health,
    access,
    events
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(discovery.router, prefix="/discovery", tags=["discovery"])
api_router.include_router(traffic.router, prefix="/traffic", tags=["traffic"])
api_router.include_router(scans.router, prefix="/scans", tags=["scans"])
api_router.include_router(credentials.router, prefix="/credentials", tags=["credentials"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(access.router, prefix="/access", tags=["access-hub"])
api_router.include_router(events.router, prefix="/events", tags=["events"])