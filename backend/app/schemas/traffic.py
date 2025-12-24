"""
Traffic analysis schemas
"""

from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime


class FlowResponse(BaseModel):
    """Network flow response model"""
    id: str
    src_ip: str
    dst_ip: str
    src_port: Optional[int]
    dst_port: Optional[int]
    protocol: str
    bytes_sent: int
    bytes_received: int
    packets_sent: int
    packets_received: int
    first_seen: datetime
    last_seen: datetime
    duration: Optional[float]
    application: Optional[str]
    application_category: Optional[str]
    is_encrypted: str
    threat_score: float
    anomaly_score: float
    
    class Config:
        from_attributes = True


class TrafficStats(BaseModel):
    """Traffic statistics"""
    total_flows: int
    total_bytes: int
    total_packets: int
    top_talkers: List[Dict[str, Any]]
    protocols: Dict[str, int]
    applications: Dict[str, int]
    bandwidth_usage: Dict[str, float]
    alerts: List[Dict[str, Any]]