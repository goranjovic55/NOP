"""
Scan models for network scanning and vulnerability assessment
"""

from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base


class ScanType(str, enum.Enum):
    """Scan types"""
    DISCOVERY = "discovery"
    PORT_SCAN = "port_scan"
    SERVICE_SCAN = "service_scan"
    VULNERABILITY = "vulnerability"
    CUSTOM = "custom"


class ScanStatus(str, enum.Enum):
    """Scan status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Scan(Base):
    """Scan job model"""
    __tablename__ = "scans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Scan configuration
    name = Column(String(100), nullable=False)
    scan_type = Column(String(20), nullable=False)
    status = Column(String(20), default=ScanStatus.PENDING, nullable=False)
    
    # Target information
    targets = Column(JSON, nullable=False)  # List of IP addresses/ranges
    ports = Column(String(500), nullable=True)  # Port specification
    
    # Scan parameters
    scan_profile = Column(String(50), nullable=True)  # light, medium, deep
    timing = Column(String(10), default="T3", nullable=False)  # Nmap timing
    options = Column(JSON, nullable=True)  # Additional scan options
    
    # Execution information
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Results summary
    hosts_discovered = Column(Integer, default=0, nullable=False)
    ports_discovered = Column(Integer, default=0, nullable=False)
    services_discovered = Column(Integer, default=0, nullable=False)
    vulnerabilities_found = Column(Integer, default=0, nullable=False)
    
    # Output and logs
    raw_output = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # User tracking
    created_by = Column(String(50), nullable=True)
    
    # Agent association - which agent performed this scan
    agent_id = Column(UUID(as_uuid=True), ForeignKey('agents.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Scan(name='{self.name}', type='{self.scan_type}', status='{self.status}')>"


class ScanResult(Base):
    """Individual scan result"""
    __tablename__ = "scan_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Scan association
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), nullable=False)
    scan = relationship("Scan", backref="results")
    
    # Asset association (optional)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True)
    asset = relationship("Asset", backref="scan_results")
    
    # Result data
    host = Column(String(100), nullable=False, index=True)
    port = Column(Integer, nullable=True)
    protocol = Column(String(10), nullable=True)
    service = Column(String(100), nullable=True)
    version = Column(String(200), nullable=True)
    state = Column(String(20), nullable=True)  # open, closed, filtered
    
    # Additional information
    banner = Column(Text, nullable=True)
    fingerprint = Column(Text, nullable=True)
    confidence = Column(Integer, nullable=True)  # 0-10
    
    # Vulnerability information
    cve_ids = Column(JSON, nullable=True)  # List of CVE IDs
    severity = Column(String(20), nullable=True)  # low, medium, high, critical
    
    # Raw data
    raw_data = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ScanResult(host='{self.host}', port='{self.port}', service='{self.service}')>"