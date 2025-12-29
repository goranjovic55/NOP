"""
Dashboard service for metrics and activity aggregation
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List
from datetime import datetime, timedelta

from app.models.asset import Asset, AssetStatus
from app.models.scan import Scan, ScanStatus
from app.models.event import Event, EventType
from app.models.vulnerability import Vulnerability
from app.schemas.dashboard import (
    DashboardMetrics,
    RecentHost,
    RecentScan,
    RecentExploit,
    RecentActivityResponse
)


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_metrics(self) -> DashboardMetrics:
        """Get dashboard metrics"""
        
        # Discovered hosts (total assets)
        discovered_query = select(func.count(Asset.id))
        discovered_result = await self.db.execute(discovered_query)
        discovered_hosts = discovered_result.scalar() or 0

        # Online hosts
        online_query = select(func.count(Asset.id)).where(Asset.status == AssetStatus.ONLINE)
        online_result = await self.db.execute(online_query)
        online_hosts = online_result.scalar() or 0

        # Scanned hosts (count distinct completed scans)
        # Note: We count scans instead of distinct targets since targets is a JSON array
        scanned_query = select(func.count(Scan.id)).where(
            Scan.status == ScanStatus.COMPLETED
        )
        scanned_result = await self.db.execute(scanned_query)
        scanned_hosts = scanned_result.scalar() or 0

        # Vulnerable hosts (count distinct assets with vulnerabilities)
        try:
            vulnerable_query = select(func.count(func.distinct(Vulnerability.asset_id))).where(
                Vulnerability.asset_id.isnot(None)
            )
            vulnerable_result = await self.db.execute(vulnerable_query)
            vulnerable_hosts = vulnerable_result.scalar() or 0
        except Exception:
            # If vulnerabilities table doesn't exist yet
            vulnerable_hosts = 0

        # Active accesses (count recent remote access start events within last 24 hours)
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        active_access_query = select(func.count(Event.id)).where(
            Event.event_type == EventType.REMOTE_ACCESS_START,
            Event.timestamp >= twenty_four_hours_ago
        )
        active_access_result = await self.db.execute(active_access_query)
        active_accesses = active_access_result.scalar() or 0

        # Exploits count (total exploit attempts and successes)
        exploits_query = select(func.count(Event.id)).where(
            Event.event_type.in_([EventType.EXPLOIT_ATTEMPT, EventType.EXPLOIT_SUCCESS])
        )
        exploits_result = await self.db.execute(exploits_query)
        exploits_count = exploits_result.scalar() or 0

        return DashboardMetrics(
            discovered_hosts=discovered_hosts,
            online_hosts=online_hosts,
            scanned_hosts=scanned_hosts,
            vulnerable_hosts=vulnerable_hosts,
            active_accesses=active_accesses,
            total_exploits=exploits_count
        )

    async def get_recent_activity(self) -> RecentActivityResponse:
        """Get recent activity (hosts, scans, exploits)"""
        
        # Last 5 discovered hosts
        discovered_query = select(Asset).order_by(desc(Asset.first_seen)).limit(5)
        discovered_result = await self.db.execute(discovered_query)
        discovered_assets = discovered_result.scalars().all()
        
        recent_discovered = [
            RecentHost(
                ip_address=str(asset.ip_address),
                hostname=asset.hostname,
                os_name=asset.os_name,
                first_seen=asset.first_seen,
                discovery_method=asset.discovery_method
            )
            for asset in discovered_assets
        ]

        # Last 5 completed scans
        scans_query = select(Scan).where(
            Scan.status == ScanStatus.COMPLETED
        ).order_by(desc(Scan.completed_at)).limit(5)
        scans_result = await self.db.execute(scans_query)
        scans = scans_result.scalars().all()

        recent_scanned = []
        for scan in scans:
            # Extract first target IP from targets array
            ip_address = scan.targets[0] if scan.targets and len(scan.targets) > 0 else "N/A"
            
            # Try to find asset by IP for hostname
            hostname = None
            if ip_address != "N/A":
                asset_query = select(Asset).where(Asset.ip_address == ip_address)
                asset_result = await self.db.execute(asset_query)
                asset = asset_result.scalar_one_or_none()
                if asset:
                    hostname = asset.hostname

            recent_scanned.append(
                RecentScan(
                    ip_address=ip_address,
                    hostname=hostname,
                    scan_name=scan.name,
                    completed_at=scan.completed_at,
                    ports_discovered=scan.ports_discovered or 0
                )
            )

        # Last 5 exploit events
        exploits_query = select(Event).where(
            Event.event_type.in_([EventType.EXPLOIT_ATTEMPT, EventType.EXPLOIT_SUCCESS])
        ).order_by(desc(Event.timestamp)).limit(5)
        exploits_result = await self.db.execute(exploits_query)
        exploit_events = exploits_result.scalars().all()

        recent_exploited = []
        for event in exploit_events:
            # Get IP from event metadata or asset
            ip_address = "N/A"
            hostname = None
            cve_id = None
            
            if event.event_metadata:
                ip_address = event.event_metadata.get("ip_address", "N/A")
                cve_id = event.event_metadata.get("cve_id")
            
            # Try to get asset info if asset_id exists
            if event.asset_id:
                asset_query = select(Asset).where(Asset.id == event.asset_id)
                asset_result = await self.db.execute(asset_query)
                asset = asset_result.scalar_one_or_none()
                if asset:
                    ip_address = str(asset.ip_address)
                    hostname = asset.hostname

            recent_exploited.append(
                RecentExploit(
                    ip_address=ip_address,
                    hostname=hostname,
                    event_type=event.event_type,
                    cve_id=cve_id,
                    timestamp=event.timestamp,
                    severity=event.severity
                )
            )

        return RecentActivityResponse(
            recent_discovered=recent_discovered,
            recent_scanned=recent_scanned,
            recent_exploited=recent_exploited
        )
