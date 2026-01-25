"""
Unknown protocol model for tracking unclassified traffic patterns
Used for learning new protocols and suggesting signatures
"""

from sqlalchemy import Column, String, Text, Integer, Float, BigInteger, Boolean, DateTime, ForeignKey, LargeBinary
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class UnknownProtocol(Base):
    """Stores samples of unclassified traffic for protocol learning"""
    __tablename__ = "unknown_protocols"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Connection identifiers (5-tuple)
    src_ip = Column(INET, nullable=False, index=True)
    dst_ip = Column(INET, nullable=False, index=True)
    src_port = Column(Integer, nullable=True)
    dst_port = Column(Integer, nullable=True, index=True)  # Often indicates service
    transport_protocol = Column(String(10), nullable=False)  # TCP, UDP
    
    # Sample data for analysis
    payload_sample = Column(LargeBinary, nullable=False)  # First 200 bytes of payload
    payload_hex = Column(Text, nullable=False)  # Hex representation for display
    payload_length = Column(Integer, nullable=False)
    
    # Heuristic analysis results
    entropy = Column(Float, nullable=True)  # Shannon entropy (>7.0 = likely encrypted)
    has_structure = Column(Boolean, default=False)  # Detected repeating patterns
    is_printable = Column(Boolean, default=False)  # Mostly ASCII printable chars
    
    # Traffic statistics
    packet_count = Column(Integer, default=1)
    total_bytes = Column(BigInteger, default=0)
    
    # Pattern suggestions from heuristics
    suggested_pattern = Column(Text, nullable=True)  # Auto-generated pattern suggestion
    pattern_confidence = Column(Float, nullable=True)
    
    # Classification workflow
    status = Column(String(20), default="new", index=True)  # new, reviewing, classified, ignored
    classified_as = Column(String(50), nullable=True)  # Final protocol classification (if classified)
    
    # Timestamps
    first_seen = Column(DateTime(timezone=True), nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Agent association
    agent_id = Column(UUID(as_uuid=True), ForeignKey('agents.id', ondelete='SET NULL'), nullable=True, index=True)
    
    def __repr__(self):
        return f"<UnknownProtocol(src='{self.src_ip}:{self.src_port}', dst='{self.dst_ip}:{self.dst_port}', status='{self.status}')>"
