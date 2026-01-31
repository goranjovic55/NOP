"""
Dashboard schemas for metrics and recent activity
"""

from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime


class DashboardMetrics(BaseModel):
    """Dashboard metrics response"""
    discovered_hosts: int
    online_hosts: int
    scanned_hosts: int
    vulnerable_hosts: int
    active_accesses: int
    total_exploits: int


# Phase 1: New Dashboard Widgets

class HealthScoreResponse(BaseModel):
    """Overall system health score (0-100)"""
    score: int
    components: Dict[str, int]  # {hosts: 95, vulns: 72, agents: 100}
    trend: str  # up, down, stable


class AlertSummaryResponse(BaseModel):
    """Alert counts by severity"""
    critical: int
    high: int
    medium: int
    low: int
    info: int
    total: int


class AgentSummaryResponse(BaseModel):
    """Agent status summary"""
    online: int
    offline: int
    error: int
    total: int


class VulnerabilitySummaryResponse(BaseModel):
    """Vulnerability counts by severity"""
    critical: int
    high: int
    medium: int
    low: int
    info: int
    total: int


class TopTalker(BaseModel):
    """Host with highest traffic"""
    ip_address: str
    hostname: Optional[str] = None
    bytes_sent: int
    bytes_received: int
    total_bytes: int
    connection_count: int


class TopTalkersResponse(BaseModel):
    """Top N hosts by traffic"""
    talkers: List[TopTalker]


class TopVulnerableHost(BaseModel):
    """Host with most vulnerabilities"""
    ip_address: str
    hostname: Optional[str] = None
    critical_count: int
    high_count: int
    total_count: int


class TopVulnerableHostsResponse(BaseModel):
    """Top N vulnerable hosts"""
    hosts: List[TopVulnerableHost]


class SparklineData(BaseModel):
    """Mini trend data for stat cards"""
    metric: str
    values: List[int]  # Last 7 data points
    trend: str  # up, down, stable
    change_percent: float


class SparklineResponse(BaseModel):
    """Sparkline data for all metrics"""
    discovered: SparklineData
    online: SparklineData
    scanned: SparklineData
    vulnerable: SparklineData


class DiscoveryTrendPoint(BaseModel):
    """Single point in discovery trend"""
    date: str
    count: int


class DiscoveryTrendResponse(BaseModel):
    """Discovery rate over time"""
    trend: List[DiscoveryTrendPoint]
    total_period: int


class RecentHost(BaseModel):
    """Recently discovered host"""
    ip_address: str
    hostname: Optional[str] = None
    os_name: Optional[str] = None
    first_seen: datetime
    discovery_method: Optional[str] = None


class RecentScan(BaseModel):
    """Recently completed scan"""
    ip_address: str
    hostname: Optional[str] = None
    scan_name: str
    completed_at: datetime
    ports_discovered: int


class RecentExploit(BaseModel):
    """Recent exploit event"""
    ip_address: str
    hostname: Optional[str] = None
    event_type: str
    cve_id: Optional[str] = None
    timestamp: datetime
    severity: str


class RecentActivityResponse(BaseModel):
    """Recent activity aggregated response"""
    recent_discovered: List[RecentHost]
    recent_scanned: List[RecentScan]
    recent_exploited: List[RecentExploit]
