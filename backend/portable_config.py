"""
Portable Build Configuration
Handles configuration differences between Docker and portable deployments
"""

import os
import sys
from pathlib import Path
from typing import Optional

class PortableConfig:
    """Configuration manager for portable executable mode"""
    
    def __init__(self):
        self.is_portable = getattr(sys, 'frozen', False)
        self.base_dir = self._get_base_dir()
        self.data_dir = self._get_data_dir()
        
    def _get_base_dir(self) -> Path:
        """Get base directory of the application"""
        if self.is_portable:
            # Running as PyInstaller bundle
            return Path(sys._MEIPASS)
        else:
            # Running as normal Python script
            return Path(__file__).parent
    
    def _get_data_dir(self) -> Path:
        """Get data directory for user data"""
        # Check environment variable first
        data_dir = os.getenv('NOP_DATA_DIR')
        if data_dir:
            return Path(data_dir)
        
        # Default to user home directory
        if os.name == 'nt':  # Windows
            data_dir = Path(os.getenv('APPDATA', Path.home())) / 'NOP'
        else:  # Linux/macOS
            data_dir = Path.home() / '.nop'
        
        # Create if doesn't exist
        data_dir.mkdir(parents=True, exist_ok=True)
        return data_dir
    
    def get_database_url(self) -> str:
        """Get database URL (SQLite for portable, PostgreSQL for Docker)"""
        if self.is_portable or os.getenv('NOP_PORTABLE_MODE') == '1':
            db_path = self.data_dir / 'nop.db'
            return f'sqlite:///{db_path}'
        else:
            # Use PostgreSQL from environment
            return os.getenv(
                'DATABASE_URL',
                'postgresql+asyncpg://nop:nop_password@postgres:5432/nop'
            )
    
    def get_redis_url(self) -> Optional[str]:
        """Get Redis URL (None for portable - uses in-memory cache)"""
        if self.is_portable or os.getenv('NOP_PORTABLE_MODE') == '1':
            return None  # Will use in-memory cache
        else:
            return os.getenv('REDIS_URL', 'redis://redis:6379/0')
    
    def get_static_dir(self) -> Path:
        """Get frontend static files directory"""
        static_dir = self.base_dir / 'frontend_build'
        if not static_dir.exists():
            # Fallback for development
            static_dir = self.base_dir.parent / 'frontend' / 'build'
        return static_dir
    
    def get_evidence_dir(self) -> Path:
        """Get evidence storage directory"""
        evidence_dir = self.data_dir / 'evidence'
        evidence_dir.mkdir(parents=True, exist_ok=True)
        return evidence_dir
    
    def get_logs_dir(self) -> Path:
        """Get logs directory"""
        logs_dir = self.data_dir / 'logs'
        logs_dir.mkdir(parents=True, exist_ok=True)
        return logs_dir
    
    def get_certs_dir(self) -> Path:
        """Get SSL certificates directory"""
        certs_dir = self.data_dir / 'certs'
        certs_dir.mkdir(parents=True, exist_ok=True)
        return certs_dir
    
    def get_config_file(self) -> Path:
        """Get configuration file path"""
        return self.data_dir / 'config.yaml'
    
    def get_secret_key(self) -> str:
        """Get or generate secret key"""
        secret_file = self.data_dir / '.secret'
        
        if secret_file.exists():
            return secret_file.read_text().strip()
        else:
            # Generate new secret key
            import secrets
            secret_key = secrets.token_urlsafe(32)
            secret_file.write_text(secret_key)
            secret_file.chmod(0o600)  # Restrict permissions
            return secret_key
    
    def is_first_run(self) -> bool:
        """Check if this is the first run"""
        return not self.get_config_file().exists()
    
    def get_listen_port(self) -> int:
        """Get listen port from environment or default"""
        return int(os.getenv('NOP_PORT', '8080'))
    
    def get_listen_host(self) -> str:
        """Get listen host"""
        return os.getenv('NOP_HOST', '0.0.0.0')
    
    def get_network_interface(self) -> Optional[str]:
        """Get network interface to monitor"""
        return os.getenv('NOP_INTERFACE')
    
    def is_debug_mode(self) -> bool:
        """Check if debug mode is enabled"""
        return os.getenv('NOP_DEBUG', '0') == '1'


# Global instance
portable_config = PortableConfig()
