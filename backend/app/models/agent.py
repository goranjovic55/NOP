"""
Agent model for C2 management
"""

from sqlalchemy import Column, String, DateTime, Boolean, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class AgentType(str, enum.Enum):
    """Agent types - Python for flexibility, Go for cross-platform compilation"""
    PYTHON = "python"
    GO = "go"


class AgentStatus(str, enum.Enum):
    """Agent status"""
    ONLINE = "online"
    OFFLINE = "offline"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class StartupMode(str, enum.Enum):
    """Agent startup mode"""
    AUTO = "auto"  # Install and start on boot
    SINGLE = "single"  # Run once and exit


class PersistenceLevel(str, enum.Enum):
    """Agent persistence level"""
    LOW = "low"  # No persistence, runs once
    MEDIUM = "medium"  # Restarts on failure, removable
    HIGH = "high"  # Multiple persistence mechanisms, hidden


class Agent(Base):
    """Agent model for C2"""
    __tablename__ = "agents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Agent metadata
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    agent_type = Column(Enum(AgentType), default=AgentType.PYTHON, nullable=False)
    status = Column(Enum(AgentStatus), default=AgentStatus.DISCONNECTED, nullable=False)
    
    # Connection configuration
    connection_url = Column(String(255), nullable=False)  # Where agent connects to
    auth_token = Column(String(255), nullable=False, unique=True)  # Pre-shared token
    encryption_key = Column(String(255), nullable=False)  # Encryption key for secure tunnel
    download_token = Column(String(255), nullable=False, unique=True)  # One-time use download token
    
    # Capabilities - JSON field with module flags
    # Modules: asset, traffic, host, access - agent acts as proxy relaying data to C2
    # Example: {"asset": true, "traffic": true, "host": true, "access": false}
    capabilities = Column(JSON, nullable=False, default=dict)
    
    # Build configuration
    obfuscate = Column(Boolean, default=True, nullable=False)  # Use Garble obfuscation for Go
    startup_mode = Column(Enum(StartupMode), default=StartupMode.AUTO, nullable=False)
    persistence_level = Column(Enum(PersistenceLevel), default=PersistenceLevel.MEDIUM, nullable=False)
    
    # Agent metadata - flexible JSON storage
    # Example: {"subnet": "192.168.1.0/24", "location": "Remote Office", "tags": ["production"]}
    agent_metadata = Column(JSON, nullable=True, default=dict)
    
    # Statistics
    last_seen = Column(DateTime(timezone=True), nullable=True)
    connected_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Agent {self.name} ({self.agent_type.value}) - {self.status.value}>"
