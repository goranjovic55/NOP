"""
Configuration settings for the Network Observatory Platform
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional
import os
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings with validation"""
    
    # Basic settings
    SECRET_KEY: str = "your-secret-key-change-this"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "changeme"
    LOG_LEVEL: str = "INFO"
    
    # Encryption
    MASTER_ENCRYPTION_KEY: Optional[str] = None
    
    # Database settings
    DATABASE_URL: str = "postgresql+asyncpg://nop:nop_password@postgres:5432/nop"
    
    # Redis settings
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Network settings
    NETWORK_INTERFACE: str = "eth0"
    MONITOR_SUBNETS: str = "192.168.0.0/16,10.0.0.0/8,172.16.0.0/12"
    EXCLUDED_IPS: str = ""
    
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
    
    # Rate limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 100
    
    # CORS settings
    CORS_ORIGINS: str = "http://localhost:12000,http://localhost:3000"
    
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
    
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate secret key meets security requirements"""
        default_values = [
            "your-secret-key-change-this",
            "your-secret-key-change-this-to-random-string-at-least-32-chars"
        ]
        if v in default_values:
            logger.warning(
                "SECRET_KEY is set to default value! "
                "Generate a secure key with: openssl rand -hex 32"
            )
        elif len(v) < 32:
            logger.warning("SECRET_KEY should be at least 32 characters for security")
        return v
    
    @field_validator('MASTER_ENCRYPTION_KEY')
    @classmethod
    def validate_master_key(cls, v: Optional[str]) -> Optional[str]:
        """Validate master encryption key format"""
        if v is not None and v != "" and len(v) != 64:
            raise ValueError(
                "MASTER_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). "
                "Generate with: openssl rand -hex 32"
            )
        return v if v and len(v) == 64 else None
    
    @field_validator('DISCOVERY_MODE')
    @classmethod
    def validate_discovery_mode(cls, v: str) -> str:
        """Validate discovery mode"""
        valid_modes = ['passive_only', 'active_passive', 'aggressive']
        if v not in valid_modes:
            raise ValueError(f"DISCOVERY_MODE must be one of: {valid_modes}")
        return v
    
    @field_validator('ALERT_SENSITIVITY')
    @classmethod
    def validate_alert_sensitivity(cls, v: str) -> str:
        """Validate alert sensitivity level"""
        valid_levels = ['low', 'medium', 'high']
        if v not in valid_levels:
            raise ValueError(f"ALERT_SENSITIVITY must be one of: {valid_levels}")
        return v
    
    @property
    def monitor_subnets_list(self) -> List[str]:
        """Get monitor subnets as a list"""
        return [subnet.strip() for subnet in self.MONITOR_SUBNETS.split(",") if subnet.strip()]
    
    @property
    def excluded_ips_list(self) -> List[str]:
        """Get excluded IPs as a list"""
        return [ip.strip() for ip in self.EXCLUDED_IPS.split(",") if ip.strip()]
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return os.environ.get("ENVIRONMENT", "development").lower() == "production"
    
    def validate_for_production(self) -> List[str]:
        """Validate settings for production deployment"""
        warnings = []
        
        if self.SECRET_KEY == "your-secret-key-change-this":
            warnings.append("SECRET_KEY must be changed for production")
        
        if self.ADMIN_PASSWORD == "changeme":
            warnings.append("ADMIN_PASSWORD must be changed for production")
        
        if self.MASTER_ENCRYPTION_KEY is None:
            warnings.append("MASTER_ENCRYPTION_KEY should be set for production")
        
        if "*" in self.CORS_ORIGINS:
            warnings.append("CORS should not allow all origins in production")
        
        return warnings
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


# Global settings instance
settings = Settings()

# Log any production warnings
if settings.is_production:
    warnings = settings.validate_for_production()
    for warning in warnings:
        logger.warning(f"Production warning: {warning}")