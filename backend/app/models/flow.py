"""
Network flow model for traffic analysis
"""

from sqlalchemy import Column, String, DateTime, Integer, BigInteger, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
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
    
    # ========== DPI Metadata Fields (NEW) ==========
    # Deep Packet Inspection results stored as JSONB for flexibility
    # Example: {"http_method": "GET", "http_host": "example.com", "tls_sni": "secure.example.com",
    #           "dns_queries": ["google.com"], "service_version": "Apache/2.4.41"}
    dpi_metadata = Column(JSONB, nullable=True)
    
    # Service label for topology visualization (e.g., "HTTP:80", "SSH:22")
    service_label = Column(String(100), nullable=True, index=True)
    
    # Detected L7 protocol (more specific than transport protocol)
    detected_protocol = Column(String(50), nullable=True, index=True)
    
    # Confidence score for protocol detection (0.0 - 1.0)
    protocol_confidence = Column(Float, default=0.0)
    
    # Detection method: "signature", "heuristic", "port", "unknown"
    detection_method = Column(String(20), nullable=True)
    
    # Is this multicast/broadcast traffic?
    is_multicast = Column(Boolean, default=False)
    is_broadcast = Column(Boolean, default=False)
    
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
    
    # Agent association - which agent captured this flow
    agent_id = Column(UUID(as_uuid=True), ForeignKey('agents.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Flow(src='{self.src_ip}:{self.src_port}', dst='{self.dst_ip}:{self.dst_port}', protocol='{self.protocol}')>"