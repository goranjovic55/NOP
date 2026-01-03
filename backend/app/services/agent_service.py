"""
Agent service for C2 management
"""

import secrets
import base64
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.models.agent import Agent, AgentType, AgentStatus
from app.schemas.agent import AgentCreate, AgentUpdate


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
        """Create a new agent"""
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
            status=AgentStatus.DISCONNECTED
        )
        
        db.add(agent)
        await db.commit()
        await db.refresh(agent)
        
        return agent
    
    @staticmethod
    async def get_agent(db: AsyncSession, agent_id: UUID) -> Optional[Agent]:
        """Get agent by ID"""
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_agents(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Agent]:
        """Get all agents"""
        result = await db.execute(select(Agent).offset(skip).limit(limit))
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
"""

import asyncio
import websockets
import json
import platform
import socket
import subprocess
import psutil
import scapy.all as scapy
from datetime import datetime
from typing import Dict, List, Any
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import base64
import os
from typing import Dict, List, Any
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import base64
import os

# Agent Configuration
AGENT_ID = "{agent.id}"
AGENT_NAME = "{agent.name}"
AUTH_TOKEN = "{agent.auth_token}"
ENCRYPTION_KEY = "{agent.encryption_key}"
SERVER_URL = "{agent.connection_url}"
CAPABILITIES = {json.dumps(agent.capabilities, indent=4)}

class NOPAgent:
    """NOP Proxy Agent - Relays data from remote network to C2 server with encrypted tunnel"""
    
    def __init__(self):
        self.agent_id = AGENT_ID
        self.agent_name = AGENT_NAME
        self.auth_token = AUTH_TOKEN
        self.encryption_key = ENCRYPTION_KEY.encode()
        self.server_url = SERVER_URL
        self.capabilities = CAPABILITIES
        self.ws = None
        self.running = True
        self.cipher = self._init_cipher()
    
    def _init_cipher(self):
        """Initialize AES-GCM cipher for encrypted communication"""
        # Derive encryption key using PBKDF2
        kdf = PBKDF2(
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
            async with websockets.connect(
                self.server_url,
                extra_headers={{"Authorization": f"Bearer {{self.auth_token}}"}}
            ) as websocket:
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
                
                if msg_type == "command":
                    await self.handle_command(data)
                elif msg_type == "ping":
                    await self.send_pong()
            except Exception as e:
                print(f"[{{datetime.now()}}] Message handling error: {{e}}")
                
    async def handle_command(self, data):
        """Execute command from C2 based on module capabilities"""
        command = data.get("command")
        print(f"[{{datetime.now()}}] Received command: {{command}}")
        
        # Commands are handled by respective modules
        # This is just a placeholder for custom C2 commands
        
    # ============================================================================
    # ASSET MODULE - Network asset discovery and monitoring
    # ============================================================================
    async def asset_module(self):
        """Asset Discovery Module - Discovers devices on network"""
        print(f"[{{datetime.now()}}] Asset module started")
        while self.running:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                assets = await self.discover_assets()
                await self.relay_to_c2({{
                    "type": "asset_data",
                    "agent_id": self.agent_id,
                    "assets": assets,
                    "timestamp": datetime.utcnow().isoformat()
                }})
            except Exception as e:
                print(f"[{{datetime.now()}}] Asset module error: {{e}}")
                
    async def discover_assets(self) -> List[Dict]:
        """Discover network assets via ARP scan"""
        try:
            # Get local network
            local_ip = socket.gethostbyname(socket.gethostname())
            network = '.'.join(local_ip.split('.')[:3]) + '.0/24'
            
            # ARP scan
            arp_request = scapy.ARP(pdst=network)
            broadcast = scapy.Ether(dst="ff:ff:ff:ff:ff:ff")
            arp_request_broadcast = broadcast/arp_request
            answered_list = scapy.srp(arp_request_broadcast, timeout=1, verbose=False)[0]
            
            assets = []
            for element in answered_list:
                asset = {{
                    "ip": element[1].psrc,
                    "mac": element[1].hwsrc,
                    "status": "online",
                    "discovered_at": datetime.utcnow().isoformat()
                }}
                assets.append(asset)
                
            print(f"[{{datetime.now()}}] Discovered {{len(assets)}} assets")
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
                await asyncio.sleep(60)  # Send stats every minute
                traffic_stats = await self.capture_traffic_stats()
                await self.relay_to_c2({{
                    "type": "traffic_data",
                    "agent_id": self.agent_id,
                    "traffic": traffic_stats,
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
                "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat()
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
        """Generate Go agent for cross-platform compilation"""
        capabilities_json = json.dumps(agent.capabilities)
        return f'''package main

/*
NOP Agent - {agent.name}
Generated: {datetime.utcnow().isoformat()}
Type: Go (cross-platform)

Build commands:
  Linux:   GOOS=linux GOARCH=amd64 go build -o nop-agent-linux
  Windows: GOOS=windows GOARCH=amd64 go build -o nop-agent.exe
  macOS:   GOOS=darwin GOARCH=amd64 go build -o nop-agent-macos
  ARM:     GOOS=linux GOARCH=arm64 go build -o nop-agent-arm
*/

import (
\t"encoding/json"
\t"fmt"
\t"log"
\t"net/url"
\t"os"
\t"os/signal"
\t"runtime"
\t"syscall"
\t"time"

\t"github.com/gorilla/websocket"
)

const (
\tAgentID    = "{agent.id}"
\tAgentName  = "{agent.name}"
\tAuthToken  = "{agent.auth_token}"
\tServerURL  = "{agent.connection_url}"
)

var Capabilities = map[string]bool{capabilities_json}

type NOPAgent struct {{
\tconn         *websocket.Conn
\tagentID      string
\tagentName    string
\tauthToken    string
\tserverURL    string
\tcapabilities map[string]bool
\trunning      bool
}}

type Message struct {{
\tType      string                 `json:"type"`
\tAgentID   string                 `json:"agent_id,omitempty"`
\tAgentName string                 `json:"agent_name,omitempty"`
\tData      map[string]interface{{}} `json:"data,omitempty"`
\tTimestamp string                 `json:"timestamp"`
}}

func NewNOPAgent() *NOPAgent {{
\treturn &NOPAgent{{
\t\tagentID:      AgentID,
\t\tagentName:    AgentName,
\t\tauthToken:    AuthToken,
\t\tserverURL:    ServerURL,
\t\tcapabilities: Capabilities,
\t\trunning:      true,
\t}}
}}

func (a *NOPAgent) Connect() error {{
\tlog.Printf("[%s] Connecting to C2 server: %s", time.Now().Format(time.RFC3339), a.serverURL)
\t
\tu, err := url.Parse(a.serverURL)
\tif err != nil {{
\t\treturn fmt.Errorf("invalid server URL: %v", err)
\t}}

\theader := make(map[string][]string)
\theader["Authorization"] = []string{{fmt.Sprintf("Bearer %s", a.authToken)}}

\tconn, _, err := websocket.DefaultDialer.Dial(u.String(), header)
\tif err != nil {{
\t\treturn fmt.Errorf("connection failed: %v", err)
\t}}

\ta.conn = conn
\tlog.Printf("[%s] Connected to C2 server!", time.Now().Format(time.RFC3339))

\treturn nil
}}

func (a *NOPAgent) Register() error {{
\treg := Message{{
\t\tType:      "register",
\t\tAgentID:   a.agentID,
\t\tAgentName: a.agentName,
\t\tTimestamp: time.Now().UTC().Format(time.RFC3339),
\t\tData: map[string]interface{{}}{{
\t\t\t"capabilities": a.capabilities,
\t\t\t"system_info": map[string]string{{
\t\t\t\t"os":      runtime.GOOS,
\t\t\t\t"arch":    runtime.GOARCH,
\t\t\t\t"version": runtime.Version(),
\t\t\t}},
\t\t}},
\t}}

\terr := a.conn.WriteJSON(reg)
\tif err != nil {{
\t\treturn fmt.Errorf("registration failed: %v", err)
\t}}

\tlog.Printf("[%s] Registered with C2 server", time.Now().Format(time.RFC3339))
\treturn nil
}}

func (a *NOPAgent) Heartbeat() {{
\tticker := time.NewTicker(30 * time.Second)
\tdefer ticker.Stop()

\tfor a.running {{
\t\tselect {{
\t\tcase <-ticker.C:
\t\t\thb := Message{{
\t\t\t\tType:      "heartbeat",
\t\t\t\tAgentID:   a.agentID,
\t\t\t\tTimestamp: time.Now().UTC().Format(time.RFC3339),
\t\t\t}}
\t\t\tif err := a.conn.WriteJSON(hb); err != nil {{
\t\t\t\tlog.Printf("[%s] Heartbeat error: %v", time.Now().Format(time.RFC3339), err)
\t\t\t\treturn
\t\t\t}}
\t\t}}
\t}}
}}

func (a *NOPAgent) MessageHandler() {{
\tfor a.running {{
\t\tvar msg Message
\t\terr := a.conn.ReadJSON(&msg)
\t\tif err != nil {{
\t\t\tlog.Printf("[%s] Read error: %v", time.Now().Format(time.RFC3339), err)
\t\t\treturn
\t\t}}

\t\tswitch msg.Type {{
\t\tcase "command":
\t\t\ta.handleCommand(msg)
\t\tcase "ping":
\t\t\ta.sendPong()
\t\t}}
\t}}
}}

func (a *NOPAgent) handleCommand(msg Message) {{
\tlog.Printf("[%s] Received command: %v", time.Now().Format(time.RFC3339), msg.Data)
\t// Implement command handling based on modules
}}

func (a *NOPAgent) sendPong() {{
\tpong := Message{{
\t\tType:      "pong",
\t\tAgentID:   a.agentID,
\t\tTimestamp: time.Now().UTC().Format(time.RFC3339),
\t}}
\ta.conn.WriteJSON(pong)
}}

// Module: Asset Discovery
func (a *NOPAgent) AssetModule() {{
\tif !a.capabilities["asset"] {{
\t\treturn
\t}}
\tlog.Printf("[%s] Asset module started", time.Now().Format(time.RFC3339))
\t// Implement asset discovery
}}

// Module: Traffic Monitoring
func (a *NOPAgent) TrafficModule() {{
\tif !a.capabilities["traffic"] {{
\t\treturn
\t}}
\tlog.Printf("[%s] Traffic module started", time.Now().Format(time.RFC3339))
\t// Implement traffic monitoring
}}

// Module: Host Monitoring
func (a *NOPAgent) HostModule() {{
\tif !a.capabilities["host"] {{
\t\treturn
\t}}
\tlog.Printf("[%s] Host module started", time.Now().Format(time.RFC3339))
\t// Implement host monitoring
}}

// Module: Remote Access
func (a *NOPAgent) AccessModule() {{
\tif !a.capabilities["access"] {{
\t\treturn
\t}}
\tlog.Printf("[%s] Access module started", time.Now().Format(time.RFC3339))
\t// Implement remote access (command execution)
}}

func (a *NOPAgent) Run() {{
\tlog.Printf("[%s] NOP Agent '%s' starting...", time.Now().Format(time.RFC3339), a.agentName)
\t
\tenabled := []string{{}}
\tfor module, enabled := range a.capabilities {{
\t\tif enabled {{
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
\tgithub.com/gorilla/websocket v1.5.1
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
                # Download dependencies
                subprocess.run(
                    ['go', 'mod', 'download'],
                    cwd=tmpdir,
                    env=env,
                    check=True,
                    capture_output=True,
                    text=True
                )
                
                # Build command
                if obfuscate:
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
                if 'garble' in str(e) and obfuscate:
                    raise RuntimeError("Garble not installed. Install with: go install mvdan.cc/garble@latest")
                elif 'go' in str(e):
                    raise RuntimeError("Go compiler not found. Install Go 1.21+")
                raise
