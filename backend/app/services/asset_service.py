"""
Asset service for asset management operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_
from typing import Optional, List, Dict, Any
import uuid
import math

from app.models.asset import Asset, AssetType, AssetStatus
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetList, AssetStats


class AssetService:
    """Asset service class"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_asset_by_id(self, asset_id: str) -> Optional[AssetResponse]:
        """Get asset by ID"""
        try:
            asset_uuid = uuid.UUID(asset_id)
            result = await self.db.execute(
                select(Asset).where(Asset.id == asset_uuid)
            )
            asset = result.scalar_one_or_none()
            if asset:
                return AssetResponse.from_orm(asset)
            return None
        except (ValueError, TypeError):
            return None
    
    async def get_assets(
        self,
        page: int = 1,
        size: int = 50,
        search: Optional[str] = None,
        asset_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> AssetList:
        """Get paginated list of assets with filtering"""
        
        # Build query
        query = select(Asset)
        
        # Apply filters
        if search:
            query = query.where(
                or_(
                    Asset.hostname.ilike(f"%{search}%"),
                    Asset.ip_address.cast(str).ilike(f"%{search}%"),
                    Asset.vendor.ilike(f"%{search}%")
                )
            )
        
        if asset_type:
            query = query.where(Asset.asset_type == asset_type)
        
        if status:
            query = query.where(Asset.status == status)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * size
        query = query.offset(offset).limit(size)
        
        # Execute query
        result = await self.db.execute(query)
        assets = result.scalars().all()
        
        # Convert to response models
        asset_responses = [AssetResponse.from_orm(asset) for asset in assets]
        
        return AssetList(
            assets=asset_responses,
            total=total,
            page=page,
            size=size,
            pages=math.ceil(total / size) if total > 0 else 0
        )
    
    async def create_asset(self, asset_data: AssetCreate) -> AssetResponse:
        """Create a new asset"""
        asset = Asset(
            ip_address=str(asset_data.ip_address),
            mac_address=asset_data.mac_address,
            hostname=asset_data.hostname,
            asset_type=asset_data.asset_type,
            vendor=asset_data.vendor,
            model=asset_data.model,
            os_name=asset_data.os_name,
            os_version=asset_data.os_version,
            notes=asset_data.notes,
            tags=asset_data.tags,
            custom_fields=asset_data.custom_fields,
            status=AssetStatus.UNKNOWN,
            confidence_score=0.5,
            discovery_method="manual"
        )
        
        self.db.add(asset)
        await self.db.commit()
        await self.db.refresh(asset)
        
        return AssetResponse.from_orm(asset)
    
    async def update_asset(self, asset_id: str, asset_data: AssetUpdate) -> Optional[AssetResponse]:
        """Update an existing asset"""
        try:
            asset_uuid = uuid.UUID(asset_id)
            
            # Get existing asset
            result = await self.db.execute(
                select(Asset).where(Asset.id == asset_uuid)
            )
            asset = result.scalar_one_or_none()
            
            if not asset:
                return None
            
            # Update fields
            update_data = asset_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(asset, field, value)
            
            await self.db.commit()
            await self.db.refresh(asset)
            
            return AssetResponse.from_orm(asset)
            
        except (ValueError, TypeError):
            return None
    
    async def delete_asset(self, asset_id: str) -> bool:
        """Delete an asset"""
        try:
            asset_uuid = uuid.UUID(asset_id)
            result = await self.db.execute(
                delete(Asset).where(Asset.id == asset_uuid)
            )
            await self.db.commit()
            return result.rowcount > 0
        except (ValueError, TypeError):
            return False
    
    async def get_asset_stats(self) -> AssetStats:
        """Get asset statistics"""
        # Total assets
        total_result = await self.db.execute(select(func.count(Asset.id)))
        total_assets = total_result.scalar()
        
        # Online/offline assets
        online_result = await self.db.execute(
            select(func.count(Asset.id)).where(Asset.status == AssetStatus.ONLINE)
        )
        online_assets = online_result.scalar()
        
        offline_result = await self.db.execute(
            select(func.count(Asset.id)).where(Asset.status == AssetStatus.OFFLINE)
        )
        offline_assets = offline_result.scalar()
        
        # Assets by type
        type_result = await self.db.execute(
            select(Asset.asset_type, func.count(Asset.id))
            .group_by(Asset.asset_type)
        )
        by_type = {asset_type: count for asset_type, count in type_result.all()}
        
        # Assets by vendor
        vendor_result = await self.db.execute(
            select(Asset.vendor, func.count(Asset.id))
            .where(Asset.vendor.isnot(None))
            .group_by(Asset.vendor)
            .limit(10)
        )
        by_vendor = {vendor: count for vendor, count in vendor_result.all()}
        
        # Recently discovered (placeholder)
        recently_discovered = 0
        
        return AssetStats(
            total_assets=total_assets,
            online_assets=online_assets,
            offline_assets=offline_assets,
            by_type=by_type,
            by_vendor=by_vendor,
            recently_discovered=recently_discovered
        )