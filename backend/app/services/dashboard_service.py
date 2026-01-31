"""
Dashboard service for metrics and activity aggregation
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, cast, case
from sqlalchemy.dialects.postgresql import INET
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID

from app.models.asset import Asset, AssetStatus
from app.models.scan import Scan, ScanStatus
from app.models.event import Event, EventType, EventSeverity
from app.models.vulnerability import Vulnerability
from app.models.agent import Agent, AgentStatus
from app.schemas.dashboard import (
    DashboardMetrics,
    RecentHost,
    RecentScan,
    RecentExploit,
    RecentActivityResponse,
    HealthScoreResponse,
    AlertSummaryResponse,
    AgentSummaryResponse,
    VulnerabilitySummaryResponse,
    TopTalker,
    TopTalkersResponse,
    TopVulnerableHost,
    TopVulnerableHostsResponse,
    SparklineData,
    SparklineResponse,
    DiscoveryTrendPoint,
    DiscoveryTrendResponse
)


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_metrics(self, agent_id: Optional[UUID] = None) -> DashboardMetrics:
        """Get dashboard metrics (optionally filtered by agent)"""
        
        # Discovered hosts (total assets)
        discovered_query = select(func.count(Asset.id))
        if agent_id:
            discovered_query = discovered_query.where(Asset.agent_id == agent_id)
        discovered_result = await self.db.execute(discovered_query)
        discovered_hosts = discovered_result.scalar() or 0

        # Online hosts
        online_query = select(func.count(Asset.id)).where(Asset.status == AssetStatus.ONLINE)
        if agent_id:
            online_query = online_query.where(Asset.agent_id == agent_id)
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

    async def get_recent_activity(self, agent_id: Optional[UUID] = None) -> RecentActivityResponse:
        """Get recent activity (hosts, scans, exploits) - optionally filtered by agent"""
        
        # Last 5 discovered hosts
        discovered_query = select(Asset).order_by(desc(Asset.first_seen)).limit(5)
        if agent_id:
            discovered_query = discovered_query.where(Asset.agent_id == agent_id)
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
                asset_query = select(Asset).where(Asset.ip_address == cast(ip_address, INET))
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

    # Phase 1: New Dashboard Methods

    async def get_health_score(self, agent_id: Optional[UUID] = None) -> HealthScoreResponse:
        """Calculate overall system health score (0-100)"""
        
        # Component 1: Host health (% online)
        total_query = select(func.count(Asset.id))
        online_query = select(func.count(Asset.id)).where(Asset.status == AssetStatus.ONLINE)
        if agent_id:
            total_query = total_query.where(Asset.agent_id == agent_id)
            online_query = online_query.where(Asset.agent_id == agent_id)
        
        total_result = await self.db.execute(total_query)
        online_result = await self.db.execute(online_query)
        total_hosts = total_result.scalar() or 0
        online_hosts = online_result.scalar() or 0
        host_score = int((online_hosts / max(total_hosts, 1)) * 100)
        
        # Component 2: Vulnerability score (inverse of critical vulns)
        try:
            crit_query = select(func.count(Vulnerability.id)).where(
                Vulnerability.severity.in_(['critical', 'high'])
            )
            crit_result = await self.db.execute(crit_query)
            crit_vulns = crit_result.scalar() or 0
            # Deduct 5 points per critical vuln, max 50 point penalty
            vuln_penalty = min(crit_vulns * 5, 50)
            vuln_score = 100 - vuln_penalty
        except Exception:
            vuln_score = 100
        
        # Component 3: Agent health (% online)
        agent_total_query = select(func.count(Agent.id)).where(Agent.is_template == False)
        agent_online_query = select(func.count(Agent.id)).where(
            Agent.is_template == False,
            Agent.status == AgentStatus.ONLINE
        )
        agent_total_result = await self.db.execute(agent_total_query)
        agent_online_result = await self.db.execute(agent_online_query)
        total_agents = agent_total_result.scalar() or 0
        online_agents = agent_online_result.scalar() or 0
        agent_score = int((online_agents / max(total_agents, 1)) * 100) if total_agents > 0 else 100
        
        # Overall score (weighted average)
        overall_score = int((host_score * 0.4) + (vuln_score * 0.4) + (agent_score * 0.2))
        
        # Determine trend (compare to 24h ago - simplified)
        trend = "stable"
        
        return HealthScoreResponse(
            score=overall_score,
            components={"hosts": host_score, "vulns": vuln_score, "agents": agent_score},
            trend=trend
        )

    async def get_alert_summary(self, hours: int = 24) -> AlertSummaryResponse:
        """Get alert counts by severity for last N hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        # Count events by severity
        severity_counts = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'info': 0
        }
        
        for sev in severity_counts.keys():
            query = select(func.count(Event.id)).where(
                Event.timestamp >= cutoff,
                Event.severity == sev
            )
            result = await self.db.execute(query)
            severity_counts[sev] = result.scalar() or 0
        
        # Map 'error' and 'warning' to appropriate levels
        error_query = select(func.count(Event.id)).where(
            Event.timestamp >= cutoff,
            Event.severity == 'error'
        )
        error_result = await self.db.execute(error_query)
        severity_counts['high'] += error_result.scalar() or 0
        
        warning_query = select(func.count(Event.id)).where(
            Event.timestamp >= cutoff,
            Event.severity == 'warning'
        )
        warning_result = await self.db.execute(warning_query)
        severity_counts['medium'] += warning_result.scalar() or 0
        
        total = sum(severity_counts.values())
        
        return AlertSummaryResponse(
            critical=severity_counts['critical'],
            high=severity_counts['high'],
            medium=severity_counts['medium'],
            low=severity_counts['low'],
            info=severity_counts['info'],
            total=total
        )

    async def get_agent_summary(self) -> AgentSummaryResponse:
        """Get agent status summary (deployed agents only)"""
        
        # Only count deployed agents (not templates)
        base_query = select(func.count(Agent.id)).where(Agent.is_template == False)
        
        online_query = base_query.where(Agent.status == AgentStatus.ONLINE)
        offline_query = base_query.where(Agent.status.in_([AgentStatus.OFFLINE, AgentStatus.DISCONNECTED]))
        error_query = base_query.where(Agent.status == AgentStatus.ERROR)
        
        online_result = await self.db.execute(online_query)
        offline_result = await self.db.execute(offline_query)
        error_result = await self.db.execute(error_query)
        total_result = await self.db.execute(base_query)
        
        return AgentSummaryResponse(
            online=online_result.scalar() or 0,
            offline=offline_result.scalar() or 0,
            error=error_result.scalar() or 0,
            total=total_result.scalar() or 0
        )

    async def get_vulnerability_summary(self) -> VulnerabilitySummaryResponse:
        """Get vulnerability counts by severity"""
        severity_counts = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'info': 0
        }
        
        try:
            for sev in severity_counts.keys():
                query = select(func.count(Vulnerability.id)).where(
                    Vulnerability.severity == sev
                )
                result = await self.db.execute(query)
                severity_counts[sev] = result.scalar() or 0
        except Exception:
            pass  # Table may not exist
        
        total = sum(severity_counts.values())
        
        return VulnerabilitySummaryResponse(
            critical=severity_counts['critical'],
            high=severity_counts['high'],
            medium=severity_counts['medium'],
            low=severity_counts['low'],
            info=severity_counts['info'],
            total=total
        )

    async def get_top_talkers(self, limit: int = 5) -> TopTalkersResponse:
        """Get top N hosts by traffic volume"""
        # This would ideally query traffic data - for now use assets with connection counts
        try:
            # Query assets ordered by some traffic metric
            # Using a simplified approach - in production would query flow data
            query = select(Asset).order_by(desc(Asset.first_seen)).limit(limit)
            result = await self.db.execute(query)
            assets = result.scalars().all()
            
            talkers = []
            for asset in assets:
                talkers.append(TopTalker(
                    ip_address=str(asset.ip_address),
                    hostname=asset.hostname,
                    bytes_sent=0,  # Would come from flow data
                    bytes_received=0,
                    total_bytes=0,
                    connection_count=0
                ))
            
            return TopTalkersResponse(talkers=talkers)
        except Exception:
            return TopTalkersResponse(talkers=[])

    async def get_top_vulnerable_hosts(self, limit: int = 5) -> TopVulnerableHostsResponse:
        """Get top N hosts by vulnerability count"""
        try:
            # Group vulnerabilities by asset and count
            query = select(
                Vulnerability.asset_id,
                func.count(Vulnerability.id).label('total'),
                func.sum(case((Vulnerability.severity == 'critical', 1), else_=0)).label('critical'),
                func.sum(case((Vulnerability.severity == 'high', 1), else_=0)).label('high')
            ).where(
                Vulnerability.asset_id.isnot(None)
            ).group_by(
                Vulnerability.asset_id
            ).order_by(
                desc('total')
            ).limit(limit)
            
            result = await self.db.execute(query)
            rows = result.all()
            
            hosts = []
            for row in rows:
                # Get asset info
                asset_query = select(Asset).where(Asset.id == row.asset_id)
                asset_result = await self.db.execute(asset_query)
                asset = asset_result.scalar_one_or_none()
                
                if asset:
                    hosts.append(TopVulnerableHost(
                        ip_address=str(asset.ip_address),
                        hostname=asset.hostname,
                        critical_count=int(row.critical or 0),
                        high_count=int(row.high or 0),
                        total_count=int(row.total or 0)
                    ))
            
            return TopVulnerableHostsResponse(hosts=hosts)
        except Exception:
            return TopVulnerableHostsResponse(hosts=[])

    async def get_sparklines(self, days: int = 7) -> SparklineResponse:
        """Get sparkline trend data for stat cards"""
        today = datetime.utcnow().date()
        
        def calc_trend(values: List[int]) -> tuple:
            if len(values) < 2:
                return "stable", 0.0
            first_half = sum(values[:len(values)//2]) or 1
            second_half = sum(values[len(values)//2:]) or 1
            change = ((second_half - first_half) / first_half) * 100
            if change > 5:
                return "up", round(change, 1)
            elif change < -5:
                return "down", round(change, 1)
            return "stable", round(change, 1)
        
        # Discovered hosts per day
        discovered_values = []
        for i in range(days - 1, -1, -1):
            day_start = datetime.combine(today - timedelta(days=i), datetime.min.time())
            day_end = datetime.combine(today - timedelta(days=i - 1), datetime.min.time()) if i > 0 else datetime.utcnow()
            query = select(func.count(Asset.id)).where(
                Asset.first_seen >= day_start,
                Asset.first_seen < day_end
            )
            result = await self.db.execute(query)
            discovered_values.append(result.scalar() or 0)
        
        disc_trend, disc_change = calc_trend(discovered_values)
        
        # Online hosts (current count, repeated for stability indicator)
        online_query = select(func.count(Asset.id)).where(Asset.status == AssetStatus.ONLINE)
        online_result = await self.db.execute(online_query)
        online_count = online_result.scalar() or 0
        online_values = [online_count] * days  # Simplified
        
        # Scanned hosts per day
        scanned_values = []
        for i in range(days - 1, -1, -1):
            day_start = datetime.combine(today - timedelta(days=i), datetime.min.time())
            day_end = datetime.combine(today - timedelta(days=i - 1), datetime.min.time()) if i > 0 else datetime.utcnow()
            query = select(func.count(Scan.id)).where(
                Scan.status == ScanStatus.COMPLETED,
                Scan.completed_at >= day_start,
                Scan.completed_at < day_end
            )
            result = await self.db.execute(query)
            scanned_values.append(result.scalar() or 0)
        
        scan_trend, scan_change = calc_trend(scanned_values)
        
        # Vulnerabilities per day (new discoveries)
        vuln_values = [0] * days
        try:
            for i in range(days - 1, -1, -1):
                day_start = datetime.combine(today - timedelta(days=i), datetime.min.time())
                day_end = datetime.combine(today - timedelta(days=i - 1), datetime.min.time()) if i > 0 else datetime.utcnow()
                query = select(func.count(Vulnerability.id)).where(
                    Vulnerability.discovered_at >= day_start,
                    Vulnerability.discovered_at < day_end
                )
                result = await self.db.execute(query)
                vuln_values[days - 1 - i] = result.scalar() or 0
        except Exception:
            pass
        
        vuln_trend, vuln_change = calc_trend(vuln_values)
        
        return SparklineResponse(
            discovered=SparklineData(
                metric="discovered",
                values=discovered_values,
                trend=disc_trend,
                change_percent=disc_change
            ),
            online=SparklineData(
                metric="online",
                values=online_values,
                trend="stable",
                change_percent=0.0
            ),
            scanned=SparklineData(
                metric="scanned",
                values=scanned_values,
                trend=scan_trend,
                change_percent=scan_change
            ),
            vulnerable=SparklineData(
                metric="vulnerable",
                values=vuln_values,
                trend=vuln_trend,
                change_percent=vuln_change
            )
        )

    async def get_discovery_trend(self, days: int = 30) -> DiscoveryTrendResponse:
        """Get discovery rate trend over last N days"""
        today = datetime.utcnow().date()
        trend_points = []
        total = 0
        
        for i in range(days - 1, -1, -1):
            day = today - timedelta(days=i)
            day_start = datetime.combine(day, datetime.min.time())
            day_end = datetime.combine(day + timedelta(days=1), datetime.min.time())
            
            query = select(func.count(Asset.id)).where(
                Asset.first_seen >= day_start,
                Asset.first_seen < day_end
            )
            result = await self.db.execute(query)
            count = result.scalar() or 0
            total += count
            
            trend_points.append(DiscoveryTrendPoint(
                date=day.isoformat(),
                count=count
            ))
        
        return DiscoveryTrendResponse(trend=trend_points, total_period=total)
