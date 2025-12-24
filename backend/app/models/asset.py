"""
Asset model for network devices and hosts
"""

from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, JSON, Float
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class AssetType(str, enum.Enum):
    """Asset types"""
    HOST = "host"
    ROUTER = "router"
    SWITCH = "switch"
    FIREWALL = "firewall"
    SERVER = "server"
    WORKSTATION = "workstation"
    MOBILE = "mobile"
    IOT = "iot"
    PRINTER = "printer"
    UNKNOWN = "unknown"


class AssetStatus(str, enum.Enum):
    """Asset status"""
    ONLINE = "online"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


class Asset(Base):
    """Network asset model"""
    __tablename__ = "assets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Network identifiers
    ip_address = Column(INET, nullable=False, index=True)
    mac_address = Column(String(17), nullable=True, index=True)  # AA:BB:CC:DD:EE:FF
    hostname = Column(String(255), nullable=True, index=True)
    
    # Asset classification
    asset_type = Column(String(20), default=AssetType.UNKNOWN, nullable=False)
    status = Column(String(20), default=AssetStatus.UNKNOWN, nullable=False)
    confidence_score = Column(Float, default=0.0, nullable=False)  # 0.0 - 1.0
    
    # Device information
    vendor = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    os_name = Column(String(100), nullable=True)
    os_version = Column(String(50), nullable=True)
    
    # Network information
    open_ports = Column(JSON, nullable=True)  # List of open ports
    services = Column(JSON, nullable=True)    # Service information
    
    # Discovery information
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    discovery_method = Column(String(50), nullable=True)  # arp, ping, scan, etc.
    
    # Additional metadata
    notes = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)  # List of tags
    custom_fields = Column(JSON, nullable=True)  # Custom key-value pairs
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Asset(ip='{self.ip_address}', hostname='{self.hostname}', type='{self.asset_type}')>"