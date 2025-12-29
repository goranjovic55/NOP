"""
Network Observatory Platform - Main FastAPI Application
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.api.v1.router import api_router
from app.api.websockets.router import websocket_router
from app.services.SnifferService import sniffer_service
from app.models.settings import Settings
from sqlalchemy import select

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Network Observatory Platform...")
    
    # Create database tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
    
    logger.info("Database tables created")

    # Load discovery settings and apply to sniffer service
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Settings).where(Settings.category == "discovery")
            )
            discovery_settings = result.scalar_one_or_none()
            
            if discovery_settings and discovery_settings.config:
                track_source_only = discovery_settings.config.get("track_source_only", True)
                sniffer_service.set_track_source_only(track_source_only)
                
                # Apply granular filtering settings
                filter_unicast = discovery_settings.config.get("filter_unicast", False)
                filter_multicast = discovery_settings.config.get("filter_multicast", True)
                filter_broadcast = discovery_settings.config.get("filter_broadcast", True)
                sniffer_service.set_filter_unicast(filter_unicast)
                sniffer_service.set_filter_multicast(filter_multicast)
                sniffer_service.set_filter_broadcast(filter_broadcast)
                
                logger.info(f"Passive discovery mode: {'source-only' if track_source_only else 'source + destination'}")
                logger.info(f"Filters - unicast:{filter_unicast}, multicast:{filter_multicast}, broadcast:{filter_broadcast}")
            else:
                # Default to safer source-only mode
                sniffer_service.set_track_source_only(True)
                logger.info("Passive discovery mode: source-only (default)")
    except Exception as e:
        logger.warning(f"Failed to load discovery settings, using defaults: {e}")
        sniffer_service.set_track_source_only(True)

    # Start sniffing in background
    try:
        sniffer_service.start_sniffing(settings.NETWORK_INTERFACE, lambda x: None)
        logger.info(f"Traffic sniffer started on {settings.NETWORK_INTERFACE}")
    except Exception as e:
        logger.error(f"Failed to start traffic sniffer: {e}")

    
    yield
    
    # Shutdown
    logger.info("Shutting down Network Observatory Platform...")

    sniffer_service.stop_sniffing()

# Create FastAPI application
app = FastAPI(
    title="Network Observatory Platform",
    description="Comprehensive network monitoring and assessment platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api/v1")
app.include_router(websocket_router, prefix="/ws")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "Network Observatory Platform"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Network Observatory Platform API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )