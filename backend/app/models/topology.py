"""
Topology model for network topology mapping
"""

from sqlalchemy import Column, String, DateTime, Float, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base


class EdgeType(str, enum.Enum):
    """Network edge types"""
    DIRECT = "direct"          # Direct connection
    ROUTED = "routed"         # Through router
    SWITCHED = "switched"     # Through switch
    WIRELESS = "wireless"     # Wireless connection
    VPN = "vpn"              # VPN tunnel
    INFERRED = "inferred"     # Inferred from traffic
    UNKNOWN = "unknown"       # Unknown connection type


class TopologyEdge(Base):
    """Network topology edge (connection between assets)"""
    __tablename__ = "topology_edges"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Source and destination assets
    source_asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    dest_asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    
    source_asset = relationship("Asset", foreign_keys=[source_asset_id], backref="outgoing_edges")
    dest_asset = relationship("Asset", foreign_keys=[dest_asset_id], backref="incoming_edges")
    
    # Edge properties
    edge_type = Column(String(20), default=EdgeType.UNKNOWN, nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)  # 0.0 - 1.0
    
    # Connection details
    interface_source = Column(String(50), nullable=True)  # Source interface
    interface_dest = Column(String(50), nullable=True)    # Destination interface
    
    # Traffic statistics
    bytes_transferred = Column(String(20), default="0", nullable=False)
    packets_transferred = Column(String(20), default="0", nullable=False)
    last_traffic = Column(DateTime(timezone=True), nullable=True)
    
    # Discovery information
    discovery_method = Column(String(50), nullable=True)  # arp, traceroute, traffic, etc.
    evidence = Column(JSON, nullable=True)  # Supporting evidence
    
    # Quality metrics
    latency_ms = Column(Float, nullable=True)
    bandwidth_mbps = Column(Float, nullable=True)
    packet_loss_percent = Column(Float, nullable=True)
    
    # Timestamps
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<TopologyEdge(source='{self.source_asset_id}', dest='{self.dest_asset_id}', type='{self.edge_type}')>"