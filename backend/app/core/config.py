"""
Configuration settings for the Network Observatory Platform
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Basic settings
    SECRET_KEY: str = "your-secret-key-change-this"
    ADMIN_PASSWORD: str = "changeme"
    LOG_LEVEL: str = "INFO"
    
    # Database settings
    DATABASE_URL: str = "postgresql+asyncpg://nop:nop_password@postgres:5432/nop"
    
    # Redis settings
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Network settings
    NETWORK_INTERFACE: str = "eth0"
    MONITOR_SUBNETS: str = "192.168.0.0/16,10.0.0.0/8,172.16.0.0/12"
    
    # Discovery settings
    DISCOVERY_MODE: str = "passive_only"  # passive_only, active_passive, aggressive
    SCAN_INTERVAL: int = 300  # seconds
    ENABLE_ACTIVE_DISCOVERY: bool = False
    
    # Traffic analysis settings
    ENABLE_DPI: bool = True
    DATA_RETENTION_DAYS: int = 30
    ALERT_SENSITIVITY: str = "medium"
    
    # Security settings
    ENABLE_OFFENSIVE_TOOLS: bool = False
    AUTO_CVE_SCAN: bool = False
    CREDENTIAL_ENCRYPTION: bool = True
    
    # JWT settings
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # External services
    NTOPNG_PORT: int = 3001
    FRONTEND_PORT: int = 12000
    BACKEND_PORT: int = 8000
    
    # SSL/TLS
    SSL_ENABLED: bool = False
    SSL_CERT_PATH: Optional[str] = None
    SSL_KEY_PATH: Optional[str] = None
    
    # Paths
    EVIDENCE_PATH: str = "/app/evidence"
    LOGS_PATH: str = "/app/logs"
    
    @property
    def monitor_subnets_list(self) -> List[str]:
        """Get monitor subnets as a list"""
        return [subnet.strip() for subnet in self.MONITOR_SUBNETS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


# Global settings instance
settings = Settings()