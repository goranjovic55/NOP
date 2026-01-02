"""
Dashboard schemas for metrics and recent activity
"""

from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class DashboardMetrics(BaseModel):
    """Dashboard metrics response"""
    discovered_hosts: int
    online_hosts: int
    scanned_hosts: int
    vulnerable_hosts: int
    active_accesses: int
    total_exploits: int


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
