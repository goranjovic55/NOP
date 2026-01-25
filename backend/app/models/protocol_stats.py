"""
Protocol statistics model for aggregated protocol metrics
Used for protocol breakdown analytics and historical trends
"""

from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class ProtocolStats(Base):
    """Aggregated protocol statistics per time bucket"""
    __tablename__ = "protocol_stats"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Protocol identification
    protocol = Column(String(50), nullable=False, index=True)  # L7 protocol (HTTP, DNS, SSH, etc.)
    
    # Time bucketing (1-minute buckets for efficient aggregation)
    time_bucket = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Traffic metrics
    packet_count = Column(BigInteger, default=0)
    byte_count = Column(BigInteger, default=0)
    flow_count = Column(Integer, default=0)
    
    # Cardinality metrics
    unique_sources = Column(Integer, default=0)
    unique_destinations = Column(Integer, default=0)
    unique_ports = Column(Integer, default=0)
    
    # Agent association (for multi-agent deployments)
    agent_id = Column(UUID(as_uuid=True), ForeignKey('agents.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ProtocolStats(protocol='{self.protocol}', time='{self.time_bucket}', packets={self.packet_count})>"
