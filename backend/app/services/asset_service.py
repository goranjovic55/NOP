from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_
from typing import Optional, List, Dict, Any
import uuid
import math

from app.models.asset import Asset, AssetType, AssetStatus
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetList, AssetStats

class AssetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_assets(self, page: int = 1, size: int = 50, search: Optional[str] = None, 
                         asset_type: Optional[str] = None, status: Optional[str] = None) -> AssetList:
        query = select(Asset)
        if search:
            query = query.where(or_(Asset.hostname.ilike(f"%{search}%"), 
                                    Asset.ip_address.cast(str).ilike(f"%{search}%"),
                                    Asset.vendor.ilike(f"%{search}%")))
        if asset_type:
            query = query.where(Asset.asset_type == asset_type)
        if status:
            query = query.where(Asset.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        offset = (page - 1) * size
        query = query.offset(offset).limit(size)
        result = await self.db.execute(query)
        assets = result.scalars().all()

        asset_responses = []
        for a in assets:
            asset_responses.append(AssetResponse(
                id=str(a.id),
                ip_address=str(a.ip_address),
                mac_address=a.mac_address,
                hostname=a.hostname,
                asset_type=a.asset_type,
                status=a.status,
                confidence_score=a.confidence_score,
                vendor=a.vendor,
                model=a.model,
                os_name=a.os_name,
                os_version=a.os_version,
                open_ports=a.open_ports,
                services=a.services,
                first_seen=a.first_seen,
                last_seen=a.last_seen,
                discovery_method=a.discovery_method,
                notes=a.notes,
                tags=a.tags,
                custom_fields=a.custom_fields,
                created_at=a.created_at,
                updated_at=a.updated_at
            ))

        return AssetList(
            assets=asset_responses,
            total=total,
            page=page,
            size=size,
            pages=math.ceil(total / size) if total > 0 else 0
        )

    async def get_asset_by_id(self, asset_id: str) -> Optional[AssetResponse]:
        try:
            asset_uuid = uuid.UUID(asset_id)
            query = select(Asset).where(Asset.id == asset_uuid)
        except ValueError:
            # If not a UUID, try to find by IP
            query = select(Asset).where(Asset.ip_address == asset_id)

        result = await self.db.execute(query)
        a = result.scalar_one_or_none()
        if not a:
            return None
        return AssetResponse.model_validate(a)

    async def create_asset(self, asset_data: AssetCreate) -> AssetResponse:
        asset = Asset(
            ip_address=asset_data.ip_address,
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
            confidence_score=0.5
        )
        self.db.add(asset)
        await self.db.commit()
        await self.db.refresh(asset)
        return AssetResponse.model_validate(asset)

    async def update_asset(self, asset_id: str, asset_data: AssetUpdate) -> Optional[AssetResponse]:
        query = select(Asset).where(Asset.id == uuid.UUID(asset_id))
        result = await self.db.execute(query)
        asset = result.scalar_one_or_none()
        if not asset:
            return None

        for field, value in asset_data.model_dump(exclude_unset=True).items():
            setattr(asset, field, value)

        await self.db.commit()
        await self.db.refresh(asset)
        return AssetResponse.model_validate(asset)

    async def delete_asset(self, asset_id: str) -> bool:
        query = delete(Asset).where(Asset.id == uuid.UUID(asset_id))
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount > 0

    async def delete_all_assets(self) -> int:
        query = delete(Asset)
        result = await self.db.execute(query)
        await self.db.commit()
        return result.rowcount

    async def get_asset_stats(self) -> AssetStats:
        # Total assets
        total_query = select(func.count(Asset.id))
        total_result = await self.db.execute(total_query)
        total_assets = total_result.scalar() or 0

        # Online assets
        online_query = select(func.count(Asset.id)).where(Asset.status == AssetStatus.ONLINE)
        online_result = await self.db.execute(online_query)
        online_assets = online_result.scalar() or 0

        # Offline assets
        offline_query = select(func.count(Asset.id)).where(Asset.status == AssetStatus.OFFLINE)
        offline_result = await self.db.execute(offline_query)
        offline_assets = offline_result.scalar() or 0

        # Active scans and connections
        from app.api.v1.endpoints.discovery import active_scans
        from app.services.access_hub import access_hub
        
        active_scans_count = len([s for s in active_scans.values() if s.get("status") == "running"])
        active_connections_count = access_hub.get_active_connections().get("active_count", 0)

        # By type
        type_query = select(Asset.asset_type, func.count(Asset.id)).group_by(Asset.asset_type)
        type_result = await self.db.execute(type_query)
        by_type = {str(row[0]): row[1] for row in type_result.all()}

        # By vendor
        vendor_query = select(Asset.vendor, func.count(Asset.id)).where(Asset.vendor != None).group_by(Asset.vendor)
        vendor_result = await self.db.execute(vendor_query)
        by_vendor = {str(row[0]): row[1] for row in vendor_result.all()}

        # Recently discovered (last 24h)
        from datetime import datetime, timedelta
        recent_query = select(func.count(Asset.id)).where(Asset.first_seen >= datetime.now() - timedelta(days=1))
        recent_result = await self.db.execute(recent_query)
        recently_discovered = recent_result.scalar() or 0

        return AssetStats(
            total_assets=total_assets,
            online_assets=online_assets,
            offline_assets=offline_assets,
            active_scans=active_scans_count,
            active_connections=active_connections_count,
            by_type=by_type,
            by_vendor=by_vendor,
            recently_discovered=recently_discovered
        )
