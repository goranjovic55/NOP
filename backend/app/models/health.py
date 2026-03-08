"""
Health check Pydantic models for CT status monitoring
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Literal, Optional


class CTHealth(BaseModel):
    status: Literal["online", "offline", "error"]
    ip: str
    cpu_percent: Optional[float] = None
    cpu_cores: Optional[int] = None
    mem_percent: Optional[float] = None
    mem_used: Optional[int] = None
    mem_total: Optional[int] = None
    net_in_sec: Optional[float] = None
    net_out_sec: Optional[float] = None
    disk_read_sec: Optional[float] = None
    disk_write_sec: Optional[float] = None
    uptime: Optional[int] = None
    glances_version: Optional[Literal[3, 4]] = None
    error: Optional[str] = None


class HealthSummary(BaseModel):
    total: int
    online: int
    offline: int
    error_count: int


class CTSHealthResponse(BaseModel):
    timestamp: datetime
    cts: dict[str, CTHealth]
    summary: HealthSummary
