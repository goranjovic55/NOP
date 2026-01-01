"""
CVE Cache model for storing NVD API responses
"""

from sqlalchemy import Column, String, DateTime, Float, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import uuid

from app.core.database import Base


class CVECache(Base):
    """Cache for NVD API responses"""
    __tablename__ = "cve_cache"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # CVE identification
    cve_id = Column(String(20), nullable=False, unique=True, index=True)  # CVE-2023-1234
    
    # Vulnerability information
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    
    # CVSS scoring
    cvss_score = Column(Float, nullable=True)  # 0.0 - 10.0
    cvss_vector = Column(String(100), nullable=True)  # CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
    severity = Column(String(20), nullable=True)  # LOW, MEDIUM, HIGH, CRITICAL
    
    # Affected products (CPE identifiers)
    cpe_list = Column(JSON, nullable=True)  # List of CPE URIs
    affected_products = Column(JSON, nullable=True)  # Structured product data
    
    # References and metadata
    references = Column(JSON, nullable=True)  # List of reference URLs
    
    # Cache management
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def is_expired(self) -> bool:
        """Check if cache entry is expired"""
        return datetime.now(self.expires_at.tzinfo) > self.expires_at
    
    def __repr__(self):
        return f"<CVECache(cve_id='{self.cve_id}', severity='{self.severity}')>"
