from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_, cast
from sqlalchemy.dialects.postgresql import INET
from typing import Optional, List, Dict, Any
from uuid import UUID
import uuid
import math

from app.models.asset import Asset, AssetType, AssetStatus
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetList, AssetStats

class AssetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_assets(self, page: int = 1, size: int = 50, search: Optional[str] = None, 
                         asset_type: Optional[str] = None, status: Optional[str] = None,
                         agent_id: Optional[UUID] = None, exclude_agent_assets: bool = False) -> AssetList:
        query = select(Asset)
        
        # Filter by agent POV if specified, otherwise optionally exclude agent assets
        if agent_id:
            # POV mode - show only assets discovered by this agent
            query = query.where(Asset.agent_id == agent_id)
        elif exclude_agent_assets:
            # C2 mode with filter - show only assets discovered by C2 (no agent_id)
            query = query.where(Asset.agent_id.is_(None))
        
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

        # Get vulnerability counts for all assets
        from app.models.vulnerability import Vulnerability
        vuln_counts = {}
        try:
            vuln_query = select(
                Vulnerability.asset_id,
                func.count(Vulnerability.id).label('count')
            ).where(
                Vulnerability.asset_id.in_([a.id for a in assets])
            ).group_by(Vulnerability.asset_id)
            vuln_result = await self.db.execute(vuln_query)
            vuln_counts = {str(row[0]): row[1] for row in vuln_result.all()}
        except Exception:
            pass  # Table might not exist

        # Get access/exploit status for all assets
        from app.models.event import Event, EventType
        accessed_assets = set()
        exploited_assets = set()
        try:
            # Check for remote access events
            access_query = select(func.distinct(Event.asset_id)).where(
                Event.event_type == EventType.REMOTE_ACCESS_START,
                Event.asset_id.in_([a.id for a in assets])
            )
            access_result = await self.db.execute(access_query)
            accessed_assets = {str(row[0]) for row in access_result.all() if row[0]}

            # Check for exploit success events
            exploit_query = select(func.distinct(Event.asset_id)).where(
                Event.event_type == EventType.EXPLOIT_SUCCESS,
                Event.asset_id.in_([a.id for a in assets])
            )
            exploit_result = await self.db.execute(exploit_query)
            exploited_assets = {str(row[0]) for row in exploit_result.all() if row[0]}
        except Exception:
            pass  # Table might not exist

        asset_responses = []
        for a in assets:
            asset_id = str(a.id)
            asset_dict = {
                "id": asset_id,
                "ip_address": str(a.ip_address),
                "mac_address": a.mac_address,
                "hostname": a.hostname,
                "asset_type": a.asset_type,
                "status": a.status,
                "confidence_score": a.confidence_score,
                "vendor": a.vendor,
                "model": a.model,
                "os_name": a.os_name,
                "os_version": a.os_version,
                "open_ports": a.open_ports,
                "services": a.services,
                "first_seen": a.first_seen,
                "last_seen": a.last_seen,
                "discovery_method": a.discovery_method,
                "notes": a.notes,
                "tags": a.tags,
                "custom_fields": a.custom_fields,
                "created_at": a.created_at,
                "updated_at": a.updated_at,
                "vulnerable_count": vuln_counts.get(asset_id, 0),
                "has_been_accessed": asset_id in accessed_assets,
                "has_been_exploited": asset_id in exploited_assets
            }
            asset_responses.append(AssetResponse(**asset_dict))

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
            query = select(Asset).where(Asset.ip_address == cast(asset_id, INET))

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

    async def delete_all_assets(self, agent_id: Optional[UUID] = None) -> Dict[str, int]:
        """Delete all assets and related data.
        
        Clears: assets, scans, scan_results, topology_edges, flows
        to provide a clean start for asset discovery.
        
        Args:
            agent_id: If provided, only delete data for this agent (POV mode)
            
        Returns:
            Dictionary with counts of deleted records per table
        """
        counts = {
            "assets": 0,
            "scans": 0,
            "scan_results": 0,
            "topology_edges": 0,
            "flows": 0,
            "events": 0,
            "vulnerabilities": 0,
            "credentials": 0
        }
        
        # Import models here to avoid circular imports
        from app.models.scan import Scan, ScanResult
        from app.models.topology import TopologyEdge
        from app.models.flow import Flow
        
        try:
            # Delete scan results first (has FK to scans and assets)
            if agent_id:
                # Get scan IDs for this agent
                scan_ids_query = select(Scan.id).where(Scan.agent_id == agent_id)
                scan_ids_result = await self.db.execute(scan_ids_query)
                scan_ids = [row[0] for row in scan_ids_result.all()]
                
                if scan_ids:
                    result = await self.db.execute(delete(ScanResult).where(ScanResult.scan_id.in_(scan_ids)))
                    counts["scan_results"] = result.rowcount
            else:
                result = await self.db.execute(delete(ScanResult))
                counts["scan_results"] = result.rowcount
        except Exception as e:
            print(f"[CLEAR] Could not delete scan_results: {e}")
            
        try:
            # Delete scans
            if agent_id:
                result = await self.db.execute(delete(Scan).where(Scan.agent_id == agent_id))
            else:
                result = await self.db.execute(delete(Scan))
            counts["scans"] = result.rowcount
        except Exception as e:
            print(f"[CLEAR] Could not delete scans: {e}")
            
        try:
            # Delete topology edges (has FK to assets)
            if agent_id:
                # Get asset IDs for this agent first
                asset_ids_query = select(Asset.id).where(Asset.agent_id == agent_id)
                asset_ids_result = await self.db.execute(asset_ids_query)
                asset_ids = [row[0] for row in asset_ids_result.all()]
                
                if asset_ids:
                    result = await self.db.execute(
                        delete(TopologyEdge).where(
                            or_(
                                TopologyEdge.source_asset_id.in_(asset_ids),
                                TopologyEdge.dest_asset_id.in_(asset_ids)
                            )
                        )
                    )
                    counts["topology_edges"] = result.rowcount
            else:
                result = await self.db.execute(delete(TopologyEdge))
                counts["topology_edges"] = result.rowcount
        except Exception as e:
            print(f"[CLEAR] Could not delete topology_edges: {e}")
            
        try:
            # Delete flows (traffic data)
            if agent_id:
                result = await self.db.execute(delete(Flow).where(Flow.agent_id == agent_id))
            else:
                result = await self.db.execute(delete(Flow))
            counts["flows"] = result.rowcount
        except Exception as e:
            print(f"[CLEAR] Could not delete flows: {e}")
            
        try:
            # Delete events related to assets
            from app.models.event import Event
            if agent_id:
                # Get asset IDs for this agent
                asset_ids_query = select(Asset.id).where(Asset.agent_id == agent_id)
                asset_ids_result = await self.db.execute(asset_ids_query)
                asset_ids = [row[0] for row in asset_ids_result.all()]
                
                if asset_ids:
                    result = await self.db.execute(
                        delete(Event).where(Event.asset_id.in_(asset_ids))
                    )
                    counts["events"] = result.rowcount
            else:
                result = await self.db.execute(delete(Event).where(Event.asset_id.isnot(None)))
                counts["events"] = result.rowcount
        except Exception as e:
            print(f"[CLEAR] Could not delete events: {e}")
            
        try:
            # Delete vulnerabilities related to assets
            from app.models.vulnerability import Vulnerability
            if agent_id:
                # Get asset IDs for this agent
                asset_ids_query = select(Asset.id).where(Asset.agent_id == agent_id)
                asset_ids_result = await self.db.execute(asset_ids_query)
                asset_ids = [row[0] for row in asset_ids_result.all()]
                
                if asset_ids:
                    result = await self.db.execute(
                        delete(Vulnerability).where(Vulnerability.asset_id.in_(asset_ids))
                    )
                    counts["vulnerabilities"] = result.rowcount
            else:
                result = await self.db.execute(delete(Vulnerability))
                counts["vulnerabilities"] = result.rowcount
        except Exception as e:
            print(f"[CLEAR] Could not delete vulnerabilities: {e}")
        
        # Delete credentials (has FK to assets) - must be deleted before assets
        try:
            from app.models.credential import Credential
            if agent_id:
                # Get asset IDs for this agent
                asset_ids_query = select(Asset.id).where(Asset.agent_id == agent_id)
                asset_ids_result = await self.db.execute(asset_ids_query)
                asset_ids = [row[0] for row in asset_ids_result.all()]
                
                if asset_ids:
                    result = await self.db.execute(
                        delete(Credential).where(Credential.asset_id.in_(asset_ids))
                    )
                    counts["credentials"] = result.rowcount
            else:
                result = await self.db.execute(delete(Credential))
                counts["credentials"] = result.rowcount
        except Exception as e:
            print(f"[CLEAR] Could not delete credentials: {e}")
        
        # Finally, delete assets - wrap in try/except for better error handling on ARM
        try:
            if agent_id:
                result = await self.db.execute(delete(Asset).where(Asset.agent_id == agent_id))
            else:
                result = await self.db.execute(delete(Asset))
            counts["assets"] = result.rowcount
        except Exception as e:
            print(f"[CLEAR] Could not delete assets: {e}")
            # Re-raise since assets are the main target
            raise
        
        try:
            await self.db.commit()
        except Exception as e:
            print(f"[CLEAR] Commit failed, attempting rollback: {e}")
            await self.db.rollback()
            raise
        
        print(f"[CLEAR] Deleted records: {counts}")
        return counts

    async def get_asset_stats(self, agent_id: Optional[UUID] = None, exclude_agent_assets: bool = False) -> AssetStats:
        # Total assets
        total_query = select(func.count(Asset.id))
        if agent_id:
            # POV mode - count only agent's assets
            total_query = total_query.where(Asset.agent_id == agent_id)
        elif exclude_agent_assets:
            # C2 mode with filter - count only C2's assets
            total_query = total_query.where(Asset.agent_id.is_(None))
        total_result = await self.db.execute(total_query)
        total_assets = total_result.scalar() or 0

        # Online assets
        online_query = select(func.count(Asset.id)).where(Asset.status == AssetStatus.ONLINE)
        if agent_id:
            online_query = online_query.where(Asset.agent_id == agent_id)
        elif exclude_agent_assets:
            online_query = online_query.where(Asset.agent_id.is_(None))
        online_result = await self.db.execute(online_query)
        online_assets = online_result.scalar() or 0

        # Offline assets
        offline_query = select(func.count(Asset.id)).where(Asset.status == AssetStatus.OFFLINE)
        if agent_id:
            offline_query = offline_query.where(Asset.agent_id == agent_id)
        elif exclude_agent_assets:
            offline_query = offline_query.where(Asset.agent_id.is_(None))
        offline_result = await self.db.execute(offline_query)
        offline_assets = offline_result.scalar() or 0

        # Active scans and connections
        # Import here to avoid circular imports
        try:
            from app.api.v1.endpoints.discovery import active_scans
            active_scans_count = len([s for s in active_scans.values() if s.get("status") == "running"])
        except ImportError:
            active_scans_count = 0
            
        try:
            from app.services.access_hub import access_hub
            active_connections_count = access_hub.get_active_connections().get("active_count", 0)
        except ImportError:
            active_connections_count = 0

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

        # Scanned assets (assets with open_ports set, indicating a port scan was performed)
        scanned_query = select(func.count(Asset.id)).where(Asset.open_ports != None)
        scanned_result = await self.db.execute(scanned_query)
        scanned_assets = scanned_result.scalar() or 0

        # Accessed assets - count distinct assets with remote access events
        accessed_assets = 0  # Initialize with default
        try:
            from app.models.event import Event, EventType
            accessed_query = select(func.count(func.distinct(Event.asset_id))).where(
                Event.event_type == EventType.REMOTE_ACCESS_START,
                Event.asset_id.isnot(None)
            )
            accessed_result = await self.db.execute(accessed_query)
            accessed_assets = accessed_result.scalar() or 0
        except Exception as e:
            # If events table doesn't exist yet
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to get accessed_assets: {e}")
            accessed_assets = 0

        # Vulnerable assets - count distinct assets that have vulnerabilities
        vulnerable_assets = 0  # Initialize with default
        try:
            from app.models.vulnerability import Vulnerability
            vulnerable_query = select(func.count(func.distinct(Vulnerability.asset_id))).where(
                Vulnerability.asset_id.isnot(None)
            )
            vulnerable_result = await self.db.execute(vulnerable_query)
            vulnerable_assets = vulnerable_result.scalar() or 0
        except Exception:
            # If vulnerabilities table doesn't exist yet
            vulnerable_assets = 0
        
        # Exploited assets - count distinct assets with exploit success events
        exploited_assets = 0  # Initialize with default
        try:
            from app.models.event import Event, EventType
            exploited_query = select(func.count(func.distinct(Event.asset_id))).where(
                Event.event_type == EventType.EXPLOIT_SUCCESS,
                Event.asset_id.isnot(None)
            )
            exploited_result = await self.db.execute(exploited_query)
            exploited_assets = exploited_result.scalar() or 0
        except Exception:
            # If events table doesn't exist yet
            exploited_assets = 0

        return AssetStats(
            total_assets=total_assets,
            online_assets=online_assets,
            offline_assets=offline_assets,
            scanned_assets=scanned_assets,
            accessed_assets=accessed_assets,
            vulnerable_assets=vulnerable_assets,
            exploited_assets=exploited_assets,
            active_scans=active_scans_count,
            active_connections=active_connections_count,
            by_type=by_type,
            by_vendor=by_vendor,
            recently_discovered=recently_discovered
        )

