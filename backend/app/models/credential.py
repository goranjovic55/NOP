"""
Credential model for storing encrypted authentication data
"""

from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.core.database import Base


class CredentialType(str, enum.Enum):
    """Credential types"""
    SSH = "ssh"
    RDP = "rdp"
    VNC = "vnc"
    FTP = "ftp"
    SFTP = "sftp"
    HTTP = "http"
    HTTPS = "https"
    SNMP = "snmp"
    TELNET = "telnet"
    DATABASE = "database"
    CUSTOM = "custom"


class Credential(Base):
    """Encrypted credential storage"""
    __tablename__ = "credentials"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Asset association
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    asset = relationship("Asset", backref="credentials")
    
    # Credential information
    name = Column(String(100), nullable=False)  # Human-readable name
    credential_type = Column(String(20), nullable=False)
    protocol = Column(String(20), nullable=True)  # ssh, rdp, etc.
    port = Column(String(10), nullable=True)
    
    # Encrypted credential data
    username = Column(String(255), nullable=True)
    encrypted_password = Column(Text, nullable=True)  # AES-256-GCM encrypted
    encrypted_private_key = Column(Text, nullable=True)  # For SSH keys
    encrypted_additional_data = Column(Text, nullable=True)  # JSON encrypted data
    
    # Encryption metadata
    encryption_key_id = Column(String(50), nullable=False)  # Key identifier
    encryption_algorithm = Column(String(50), default="AES-256-GCM")
    
    # Validation
    is_valid = Column(Boolean, default=False, nullable=False)
    last_validated = Column(DateTime(timezone=True), nullable=True)
    validation_error = Column(Text, nullable=True)
    
    # Usage tracking
    last_used = Column(DateTime(timezone=True), nullable=True)
    use_count = Column(String(10), default="0", nullable=False)
    
    # Metadata
    description = Column(Text, nullable=True)
    tags = Column(String(500), nullable=True)  # Comma-separated tags
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Credential(name='{self.name}', type='{self.credential_type}', asset_id='{self.asset_id}')>"