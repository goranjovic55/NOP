"""
Event model for audit logging and system events
"""

from sqlalchemy import Column, String, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class EventType(str, enum.Enum):
    """Event types"""
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    ASSET_DISCOVERED = "asset_discovered"
    SCAN_STARTED = "scan_started"
    SCAN_COMPLETED = "scan_completed"
    CREDENTIAL_ACCESSED = "credential_accessed"
    CONFIGURATION_CHANGED = "configuration_changed"
    ALERT_TRIGGERED = "alert_triggered"
    ERROR_OCCURRED = "error_occurred"
    SYSTEM_STARTUP = "system_startup"
    SYSTEM_SHUTDOWN = "system_shutdown"
    EXPLOIT_ATTEMPT = "exploit_attempt"
    EXPLOIT_SUCCESS = "exploit_success"
    REMOTE_ACCESS_START = "remote_access_start"
    REMOTE_ACCESS_END = "remote_access_end"


class EventSeverity(str, enum.Enum):
    """Event severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class Event(Base):
    """System event and audit log"""
    __tablename__ = "events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Event classification
    event_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), default=EventSeverity.INFO, nullable=False)
    
    # Event details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Context information
    user_id = Column(String(100), nullable=True, index=True)
    username = Column(String(50), nullable=True)
    source_ip = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(500), nullable=True)
    
    # Related entities
    asset_id = Column(UUID(as_uuid=True), nullable=True)
    scan_id = Column(UUID(as_uuid=True), nullable=True)
    credential_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Additional data
    event_metadata = Column(JSON, nullable=True)  # Additional event data
    
    # Timestamps
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Event(type='{self.event_type}', severity='{self.severity}', title='{self.title}')>"