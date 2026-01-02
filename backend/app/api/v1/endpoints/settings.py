"""
Settings management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.settings import Settings
from app.schemas.settings import (
    SettingsResponse,
    ScanSettingsConfig,
    DiscoverySettingsConfig,
    AccessSettingsConfig,
    SystemSettingsConfig
)
from app.services.SnifferService import sniffer_service
from typing import Dict, Any

router = APIRouter()


# Default settings
DEFAULT_SETTINGS = {
    "scan": ScanSettingsConfig().model_dump(),
    "discovery": DiscoverySettingsConfig().model_dump(),
    "access": AccessSettingsConfig().model_dump(),
    "system": SystemSettingsConfig().model_dump()
}

# Schema mapping for validation
SCHEMA_MAP = {
    "scan": ScanSettingsConfig,
    "discovery": DiscoverySettingsConfig,
    "access": AccessSettingsConfig,
    "system": SystemSettingsConfig
}


async def get_settings_by_category(db: AsyncSession, category: str) -> Dict[str, Any]:
    """Get settings for a specific category"""
    result = await db.execute(
        select(Settings).where(Settings.category == category)
    )
    settings = result.scalar_one_or_none()
    
    if settings:
        return settings.config
    else:
        # Return default settings if not found
        return DEFAULT_SETTINGS.get(category, {})


async def upsert_settings(db: AsyncSession, category: str, config: Dict[str, Any]):
    """Insert or update settings for a category"""
    result = await db.execute(
        select(Settings).where(Settings.category == category)
    )
    settings = result.scalar_one_or_none()
    
    if settings:
        settings.config = config
    else:
        settings = Settings(category=category, config=config)
        db.add(settings)
    
    await db.commit()
    await db.refresh(settings)
    return settings


@router.get("/", response_model=SettingsResponse)
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    """Get all system settings"""
    try:
        scan_settings = await get_settings_by_category(db, "scan")
        discovery_settings = await get_settings_by_category(db, "discovery")
        access_settings = await get_settings_by_category(db, "access")
        system_settings = await get_settings_by_category(db, "system")
        
        return SettingsResponse(
            scan=ScanSettingsConfig(**scan_settings),
            discovery=DiscoverySettingsConfig(**discovery_settings),
            access=AccessSettingsConfig(**access_settings),
            system=SystemSettingsConfig(**system_settings)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving settings: {str(e)}")


@router.put("/{category}")
async def update_settings(
    category: str,
    request: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """Update settings for a specific category"""
    if category not in SCHEMA_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    
    try:
        # Validate the config against the appropriate schema
        schema_class = SCHEMA_MAP[category]
        validated_config = schema_class(**request).model_dump()
        
        await upsert_settings(db, category, validated_config)
        
        # Apply discovery settings to sniffer service
        if category == "discovery":
            track_source_only = validated_config.get("track_source_only", True)
            sniffer_service.set_track_source_only(track_source_only)
            
            # Apply granular filtering settings
            filter_unicast = validated_config.get("filter_unicast", False)
            filter_multicast = validated_config.get("filter_multicast", True)
            filter_broadcast = validated_config.get("filter_broadcast", True)
            sniffer_service.set_filter_unicast(filter_unicast)
            sniffer_service.set_filter_multicast(filter_multicast)
            sniffer_service.set_filter_broadcast(filter_broadcast)
            
            # Restart sniffing if interface changed
            interface_name = validated_config.get("interface_name", "eth0")
            if sniffer_service.is_sniffing and sniffer_service.interface != interface_name:
                sniffer_service.stop_sniffing()
                sniffer_service.start_sniffing(interface_name, lambda x: None)

        
        return {
            "message": f"{category.capitalize()} settings updated successfully",
            "category": category,
            "config": validated_config
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating settings: {str(e)}")


@router.post("/reset")
async def reset_settings(db: AsyncSession = Depends(get_db)):
    """Reset all settings to defaults"""
    try:
        for category, config in DEFAULT_SETTINGS.items():
            await upsert_settings(db, category, config)
        
        return {"message": "All settings reset to defaults"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting settings: {str(e)}")


@router.post("/reset/{category}")
async def reset_category_settings(category: str, db: AsyncSession = Depends(get_db)):
    """Reset settings for a specific category to defaults"""
    if category not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    
    try:
        await upsert_settings(db, category, DEFAULT_SETTINGS[category])
        
        return {
            "message": f"{category.capitalize()} settings reset to defaults",
            "category": category,
            "config": DEFAULT_SETTINGS[category]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting settings: {str(e)}")