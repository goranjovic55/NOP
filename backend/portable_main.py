#!/usr/bin/env python3
"""
Portable executable main entry point
This is the main script for the Nuitka-built portable executable

NOTE: Portable mode limitations:
- Uses SQLite instead of PostgreSQL
- In-memory cache instead of Redis  
- Guacamole remote access features unavailable (requires separate guacd daemon)
- Docker management features disabled
- Background tasks use asyncio instead of Celery
"""

import sys
import os
import argparse
import logging
from pathlib import Path

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from portable_config import portable_config


def setup_logging():
    """Setup logging configuration"""
    log_level = logging.DEBUG if portable_config.is_debug_mode() else logging.INFO
    log_file = portable_config.get_logs_dir() / 'nop.log'
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)


def init_config():
    """Initialize configuration on first run"""
    print("=" * 60)
    print("Network Observatory Platform - First Run Setup")
    print("=" * 60)
    print()
    
    config_file = portable_config.get_config_file()
    
    # Create default config
    try:
        import yaml
    except ImportError:
        print("Warning: PyYAML not installed. Creating basic config.")
        # Fallback to JSON if YAML not available
        import json
        yaml = None
    
    config = {
        'server': {
            'host': '0.0.0.0',
            'port': 8080,
            'workers': 4,
        },
        'database': {
            'type': 'sqlite',
            'path': str(portable_config.data_dir / 'nop.db'),
            'pragma': {
                'journal_mode': 'WAL',
                'synchronous': 'NORMAL',
                'cache_size': -64000,
                'temp_store': 'MEMORY',
            }
        },
        'network': {
            'interface': None,  # Auto-detect
            'promiscuous': True,
        },
        'features': {
            'packet_capture': True,
            'network_scanning': True,
            'asset_discovery': True,
        },
        'performance': {
            'max_connections': 100,
            'packet_buffer_size': 10000,
            'scan_concurrency': 10,
        },
        'logging': {
            'level': 'INFO',
            'max_size': '100MB',
            'backup_count': 5,
        }
    }
    
    # Get admin password
    print("Set administrator password:")
    import getpass
    while True:
        password = getpass.getpass("Password: ")
        password_confirm = getpass.getpass("Confirm password: ")
        if password == password_confirm:
            if len(password) < 8:
                print("Password must be at least 8 characters long!")
                continue
            break
        else:
            print("Passwords don't match!")
    
    # Save admin password hash
    from passlib.hash import bcrypt
    password_hash = bcrypt.hash(password)
    
    admin_file = portable_config.data_dir / '.admin'
    admin_file.write_text(password_hash)
    admin_file.chmod(0o600)
    
    # Detect network interfaces
    print("\nDetecting network interfaces...")
    try:
        import psutil
        interfaces = []
        for iface, addrs in psutil.net_if_addrs().items():
            for addr in addrs:
                if addr.family == 2:  # IPv4
                    interfaces.append((iface, addr.address))
        
        if interfaces:
            print("\nAvailable network interfaces:")
            for idx, (iface, ip) in enumerate(interfaces, 1):
                print(f"  {idx}. {iface} ({ip})")
            
            choice = input(f"\nSelect interface to monitor (1-{len(interfaces)}) or Enter for auto: ")
            if choice.strip() and choice.isdigit():
                idx = int(choice) - 1
                if 0 <= idx < len(interfaces):
                    config['network']['interface'] = interfaces[idx][0]
    except Exception as e:
        print(f"Warning: Could not detect network interfaces: {e}")
    
    # Save configuration
    with open(config_file, 'w') as f:
        if yaml:
            yaml.dump(config, f, default_flow_style=False)
        else:
            import json
            json.dump(config, f, indent=2)
    
    print(f"\nConfiguration saved to: {config_file}")
    print(f"Data directory: {portable_config.data_dir}")
    print("\nSetup complete! You can now start NOP with: nop-portable")
    print()


def run_server():
    """Run the FastAPI server"""
    logger = setup_logging()
    logger.info("Starting Network Observatory Platform (Portable Mode)")
    
    # Check if first run
    if portable_config.is_first_run():
        print("Configuration not found. Please run with --init first.")
        print("Example: nop-portable --init")
        return 1
    
    # Set environment for portable mode
    os.environ['NOP_PORTABLE_MODE'] = '1'
    
    # Import and configure app
    from app.main import app
    from app.core.config import settings
    
    # Override settings for portable mode
    settings.DATABASE_URL = portable_config.get_database_url()
    settings.REDIS_URL = portable_config.get_redis_url()
    
    logger.info(f"Database: {settings.DATABASE_URL}")
    logger.info(f"Data directory: {portable_config.data_dir}")
    logger.info(f"Static files: {portable_config.get_static_dir()}")
    
    # Serve static files from frontend build
    from fastapi.staticfiles import StaticFiles
    static_dir = portable_config.get_static_dir()
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")
        logger.info(f"Frontend served from: {static_dir}")
    else:
        logger.warning(f"Frontend build not found at: {static_dir}")
    
    # Run server
    import uvicorn
    
    host = portable_config.get_listen_host()
    port = portable_config.get_listen_port()
    
    logger.info(f"Starting server on {host}:{port}")
    logger.info(f"Web interface will be available at: http://localhost:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info" if not portable_config.is_debug_mode() else "debug",
    )
    
    return 0


def show_version():
    """Show version information"""
    print("Network Observatory Platform (NOP)")
    print("Version: 1.0.0 (Portable)")
    print("Build: PyInstaller")
    print(f"Data directory: {portable_config.data_dir}")
    print(f"Config file: {portable_config.get_config_file()}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Network Observatory Platform - Portable Edition',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  nop-portable --init              Initialize configuration
  nop-portable                     Start server
  nop-portable --port 8888         Start on custom port
  nop-portable --debug             Start with debug logging
  
For more information, visit: https://github.com/your-org/nop
        """
    )
    
    parser.add_argument('--init', action='store_true',
                        help='Initialize configuration (first run)')
    parser.add_argument('--version', action='store_true',
                        help='Show version information')
    parser.add_argument('--port', type=int, metavar='PORT',
                        help='Listen port (default: 8080)')
    parser.add_argument('--host', type=str, metavar='HOST',
                        help='Listen host (default: 0.0.0.0)')
    parser.add_argument('--data-dir', type=str, metavar='PATH',
                        help='Data directory (default: ~/.nop)')
    parser.add_argument('--debug', action='store_true',
                        help='Enable debug logging')
    parser.add_argument('--interface', type=str, metavar='IFACE',
                        help='Network interface to monitor')
    
    args = parser.parse_args()
    
    # Handle version
    if args.version:
        show_version()
        return 0
    
    # Set environment from args
    if args.port:
        os.environ['NOP_PORT'] = str(args.port)
    if args.host:
        os.environ['NOP_HOST'] = args.host
    if args.data_dir:
        os.environ['NOP_DATA_DIR'] = args.data_dir
    if args.debug:
        os.environ['NOP_DEBUG'] = '1'
    if args.interface:
        os.environ['NOP_INTERFACE'] = args.interface
    
    # Handle init
    if args.init:
        init_config()
        return 0
    
    # Run server
    try:
        return run_server()
    except KeyboardInterrupt:
        print("\nShutting down...")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
