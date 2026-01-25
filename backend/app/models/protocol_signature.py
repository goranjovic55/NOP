"""
Protocol signature model for user-defined protocol detection patterns
"""

from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class ProtocolSignature(Base):
    """User-defined protocol detection signatures for DPI"""
    __tablename__ = "protocol_signatures"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Signature identification
    name = Column(String(100), nullable=False)  # User-friendly name
    protocol = Column(String(50), nullable=False, index=True)  # Protocol identifier (e.g., "CUSTOM_SCADA")
    
    # Pattern matching configuration
    pattern_type = Column(String(20), nullable=False)  # "regex", "bytes", "offset"
    pattern = Column(Text, nullable=False)  # The actual pattern (hex for bytes, regex for regex)
    offset = Column(Integer, nullable=True)  # Byte offset for pattern matching (optional)
    
    # Metadata
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)  # e.g., "industrial", "database", "custom"
    port_hint = Column(Integer, nullable=True)  # Common port for this protocol (optional)
    
    # Detection settings
    confidence = Column(Float, default=0.8)  # Detection confidence score (0.0 - 1.0)
    enabled = Column(Boolean, default=True)
    priority = Column(Integer, default=100)  # Lower = higher priority
    
    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<ProtocolSignature(name='{self.name}', protocol='{self.protocol}', type='{self.pattern_type}')>"
