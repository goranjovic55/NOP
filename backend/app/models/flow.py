"""
Network flow model for traffic analysis
"""

from sqlalchemy import Column, String, DateTime, Integer, BigInteger, Float
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Flow(Base):
    """Network traffic flow"""
    __tablename__ = "flows"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Flow identifiers
    src_ip = Column(INET, nullable=False, index=True)
    dst_ip = Column(INET, nullable=False, index=True)
    src_port = Column(Integer, nullable=True)
    dst_port = Column(Integer, nullable=True)
    protocol = Column(String(10), nullable=False, index=True)  # TCP, UDP, ICMP
    
    # Flow statistics
    bytes_sent = Column(BigInteger, default=0, nullable=False)
    bytes_received = Column(BigInteger, default=0, nullable=False)
    packets_sent = Column(BigInteger, default=0, nullable=False)
    packets_received = Column(BigInteger, default=0, nullable=False)
    
    # Timing information
    first_seen = Column(DateTime(timezone=True), nullable=False, index=True)
    last_seen = Column(DateTime(timezone=True), nullable=False, index=True)
    duration = Column(Float, nullable=True)  # Duration in seconds
    
    # Application information (from DPI)
    application = Column(String(100), nullable=True, index=True)
    application_category = Column(String(50), nullable=True)
    
    # Quality metrics
    latency_ms = Column(Float, nullable=True)
    jitter_ms = Column(Float, nullable=True)
    packet_loss_percent = Column(Float, nullable=True)
    
    # Flags and metadata
    is_encrypted = Column(String(10), default="unknown", nullable=False)  # yes, no, unknown
    threat_score = Column(Float, default=0.0, nullable=False)  # 0.0 - 1.0
    anomaly_score = Column(Float, default=0.0, nullable=False)  # 0.0 - 1.0
    
    # Source information
    source = Column(String(50), default="ntopng", nullable=False)  # ntopng, pcap, etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Flow(src='{self.src_ip}:{self.src_port}', dst='{self.dst_ip}:{self.dst_port}', protocol='{self.protocol}')>"