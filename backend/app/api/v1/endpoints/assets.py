"""
Asset management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetList, AssetStats
from app.services.asset_service import AssetService
from app.models.asset import Asset

router = APIRouter()


@router.get("/", response_model=AssetList)
async def get_assets(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get list of assets with pagination and filtering"""
    asset_service = AssetService(db)
    return await asset_service.get_assets(
        page=page,
        size=size,
        search=search,
        asset_type=asset_type,
        status=status
    )


@router.get("/stats", response_model=AssetStats)
async def get_asset_stats(db: AsyncSession = Depends(get_db)):
    """Get asset statistics"""
    asset_service = AssetService(db)
    return await asset_service.get_asset_stats()


@router.get("/online", response_model=List[dict])
async def get_online_assets(db: AsyncSession = Depends(get_db)):
    """Get list of all assets (online and offline) for dropdown"""
    asset_service = AssetService(db)
    # Get all assets
    result = await asset_service.get_assets(
        page=1,
        size=1000  # Get more assets for dropdown
    )
    # Return simplified list with IP, hostname, and status
    return [
        {
            "ip_address": asset.ip_address,
            "hostname": asset.hostname or asset.ip_address,
            "status": asset.status
        }
        for asset in result.assets
    ]


@router.get("/classification")
async def get_asset_classification(db: AsyncSession = Depends(get_db)):
    """Get asset classification breakdown by OS type"""
    try:
        # Get all assets
        query = select(Asset)
        result = await db.execute(query)
        assets = result.scalars().all()
        
        # Classification logic
        classifications = {
            "Linux Server": 0,
            "Windows Server": 0,
            "Windows Workstation": 0,
            "Android": 0,
            "Router": 0,
            "Switch": 0,
            "IoT": 0,
            "Unknown": 0
        }
        
        total = len(assets)
        
        for asset in assets:
            os_name = asset.os_name.lower() if asset.os_name else ""
            asset_type = asset.asset_type.lower() if asset.asset_type else ""
            
            # Classification rules
            if "android" in os_name:
                classifications["Android"] += 1
            elif "linux" in os_name:
                # Check if server (common server ports or type)
                if asset.asset_type == "server" or (asset.open_ports and any(p in asset.open_ports for p in [22, 80, 443, 3306, 5432])):
                    classifications["Linux Server"] += 1
                else:
                    classifications["Unknown"] += 1
            elif "windows" in os_name:
                # Differentiate server vs workstation
                if "server" in os_name.lower() or asset.asset_type == "server":
                    classifications["Windows Server"] += 1
                else:
                    classifications["Windows Workstation"] += 1
            elif asset_type in ["router", "switch"]:
                if asset_type == "router":
                    classifications["Router"] += 1
                else:
                    classifications["Switch"] += 1
            elif asset_type == "iot":
                classifications["IoT"] += 1
            else:
                classifications["Unknown"] += 1
        
        # Calculate percentages
        categories = []
        for category, count in classifications.items():
            percentage = (count / total * 100) if total > 0 else 0
            categories.append({
                "category": category,
                "count": count,
                "percentage": round(percentage, 1)
            })
        
        return {
            "total": total,
            "categories": categories
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting asset classification: {str(e)}")


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get specific asset by ID"""
    asset_service = AssetService(db)
    asset = await asset_service.get_asset_by_id(asset_id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    return asset


@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_data: AssetCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new asset"""
    asset_service = AssetService(db)
    return await asset_service.create_asset(asset_data)


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: str,
    asset_data: AssetUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing asset"""
    asset_service = AssetService(db)
    asset = await asset_service.update_asset(asset_id, asset_data)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    return asset


@router.delete("/clear-all")
async def delete_all_assets(
    db: AsyncSession = Depends(get_db)
):
    """Delete all assets"""
    asset_service = AssetService(db)
    count = await asset_service.delete_all_assets()
    return {"message": f"Deleted {count} assets successfully"}


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete an asset"""
    asset_service = AssetService(db)
    try:
        success = await asset_service.delete_asset(asset_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid asset ID format"
        )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    return {"message": "Asset deleted successfully"}