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

class PingRequest(BaseModel):
    """Advanced ping request model"""
    target: str
    protocol: str = 'icmp'  # icmp, tcp, udp, http, dns
    port: Optional[int] = None
    count: int = 4
    timeout: int = 5
    packet_size: int = 56
    use_https: bool = False
    include_route: bool = False  # If true, run traceroute first then probe


class PingResponse(BaseModel):
    """Ping response model"""
    protocol: str
    target: str
    port: Optional[int] = None
    count: Optional[int] = None
    successful: Optional[int] = None
    failed: Optional[int] = None
    packet_loss: Optional[float] = None
    min_ms: Optional[float] = None
    max_ms: Optional[float] = None
    avg_ms: Optional[float] = None
    results: Optional[List[Dict[str, Any]]] = None
    raw_output: Optional[str] = None
    transmitted: Optional[int] = None
    received: Optional[int] = None
    timestamp: str
    error: Optional[str] = None
    note: Optional[str] = None


class StormConfig(BaseModel):
    """Storm configuration request model"""
    interface: str = "eth0"
    packet_type: str  # broadcast, multicast, tcp, udp, raw_ip
    source_ip: Optional[str] = None
    dest_ip: str
    source_port: Optional[int] = None
    dest_port: Optional[int] = None
    pps: int = 100  # packets per second
    payload: Optional[str] = None
    ttl: int = 64
    tcp_flags: Optional[List[str]] = None  # SYN, ACK, FIN, RST, PSH, URG


class StormMetrics(BaseModel):
    """Storm metrics response model"""
    active: bool
    packets_sent: int
    bytes_sent: int
    duration_seconds: int
    current_pps: int
    target_pps: int
    start_time: str