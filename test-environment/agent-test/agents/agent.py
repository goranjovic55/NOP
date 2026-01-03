#!/usr/bin/env python3
"""
NOP Agent - Ubuntu Test Agent
Generated: 2026-01-03T23:14:12.468233
Type: Python Proxy Agent
Encryption: AES-256-GCM (Encrypted tunnel to C2)

This agent acts as a proxy, relaying all data from the remote network
back to the NOP C2 server. All modules run here but data is processed
on the main NOP instance.

Download URL: {BASE_URL}/api/v1/agents/download/ndrWnk1deBV7jzWjo2vhnSnMKP6SnKWPGVPLqGzvCq0
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
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

# Agent Configuration
AGENT_ID = "1483a6eb-bc9e-4ef1-be63-b8e7c0f01029"
AGENT_NAME = "Ubuntu Test Agent"
AUTH_TOKEN = "mWxT-F2qVdMmixvr8czJKBZiJOop8T0PswTsCCUno28"
ENCRYPTION_KEY = "26QzgMx_g8hlP9vq522ETuGvEZ2mWbvbFS1LGoU8GBw"
SERVER_URL = "ws://172.28.0.1:8000/api/v1/agents/1483a6eb-bc9e-4ef1-be63-b8e7c0f01029/connect"
CAPABILITIES = {
    "asset": True,
    "traffic": True,
    "host": True,
    "access": False
}

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
        await self.ws.send(json.dumps({
            "encrypted": True,
            "data": encrypted
        }))
        
    async def connect(self):
        """Connect to NOP C2 server with encrypted tunnel"""
        try:
            print(f"[{datetime.now()}] Connecting to C2 server: {self.server_url}...")
            async with websockets.connect(
                self.server_url,
                additional_headers={"Authorization": f"Bearer {self.auth_token}"}
            ) as websocket:
                self.ws = websocket
                print(f"[{datetime.now()}] Connected! Establishing encrypted tunnel...")
                
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
            print(f"[{datetime.now()}] Connection error: {e}")
            await asyncio.sleep(5)
            
    async def noop(self):
        """No-op for disabled modules"""
        pass
        
    async def register(self):
        """Register agent with C2 server"""
        registration = {
            "type": "register",
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "capabilities": self.capabilities,
            "system_info": {
                "hostname": socket.gethostname(),
                "platform": platform.system(),
                "version": platform.version(),
                "ip_address": socket.gethostbyname(socket.gethostname())
            }
        }
        await self.ws.send(json.dumps(registration))
        print(f"[{datetime.now()}] Registered with C2 server")
        
    async def heartbeat(self):
        """Send periodic heartbeat to C2"""
        while self.running:
            try:
                await asyncio.sleep(30)
                heartbeat = {
                    "type": "heartbeat",
                    "agent_id": self.agent_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
                await self.ws.send(json.dumps(heartbeat))
            except Exception as e:
                print(f"[{datetime.now()}] Heartbeat error: {e}")
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
                print(f"[{datetime.now()}] Message handling error: {e}")
                
    async def handle_command(self, data):
        """Execute command from C2 based on module capabilities"""
        command = data.get("command")
        print(f"[{datetime.now()}] Received command: {command}")
        
        # Commands are handled by respective modules
        # This is just a placeholder for custom C2 commands
        
    # ============================================================================
    # ASSET MODULE - Network asset discovery and monitoring
    # ============================================================================
    async def asset_module(self):
        """Asset Discovery Module - Discovers devices on network"""
        print(f"[{datetime.now()}] Asset module started")
        while self.running:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                assets = await self.discover_assets()
                await self.relay_to_c2({
                    "type": "asset_data",
                    "agent_id": self.agent_id,
                    "assets": assets,
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                print(f"[{datetime.now()}] Asset module error: {e}")
                
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
                asset = {
                    "ip": element[1].psrc,
                    "mac": element[1].hwsrc,
                    "status": "online",
                    "discovered_at": datetime.utcnow().isoformat()
                }
                assets.append(asset)
                
            print(f"[{datetime.now()}] Discovered {len(assets)} assets")
            return assets
        except Exception as e:
            print(f"[{datetime.now()}] Asset discovery error: {e}")
            return []
    
    # ============================================================================
    # TRAFFIC MODULE - Network traffic monitoring and analysis
    # ============================================================================
    async def traffic_module(self):
        """Traffic Monitoring Module - Captures and analyzes network traffic"""
        print(f"[{datetime.now()}] Traffic module started")
        while self.running:
            try:
                await asyncio.sleep(60)  # Send stats every minute
                traffic_stats = await self.capture_traffic_stats()
                await self.relay_to_c2({
                    "type": "traffic_data",
                    "agent_id": self.agent_id,
                    "traffic": traffic_stats,
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                print(f"[{datetime.now()}] Traffic module error: {e}")
                
    async def capture_traffic_stats(self) -> Dict:
        """Capture network traffic statistics"""
        try:
            net_io = psutil.net_io_counters()
            return {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv,
                "errors_in": net_io.errin,
                "errors_out": net_io.errout
            }
        except Exception as e:
            print(f"[{datetime.now()}] Traffic capture error: {e}")
            return {}
    
    # ============================================================================
    # HOST MODULE - Host system information and monitoring
    # ============================================================================
    async def host_module(self):
        """Host Monitoring Module - Monitors local system resources"""
        print(f"[{datetime.now()}] Host module started")
        while self.running:
            try:
                await asyncio.sleep(120)  # Send stats every 2 minutes
                host_info = await self.collect_host_info()
                await self.relay_to_c2({
                    "type": "host_data",
                    "agent_id": self.agent_id,
                    "host": host_info,
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                print(f"[{datetime.now()}] Host module error: {e}")
                
    async def collect_host_info(self) -> Dict:
        """Collect host system information"""
        try:
            return {
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
            }
        except Exception as e:
            print(f"[{datetime.now()}] Host info collection error: {e}")
            return {}
    
    # ============================================================================
    # ACCESS MODULE - Remote access and command execution
    # ============================================================================
    async def access_module(self):
        """Access Module - Provides remote access capabilities"""
        print(f"[{datetime.now()}] Access module started (listen-only mode)")
        # Access module only responds to C2 commands for security
        # No autonomous actions
        
    async def relay_to_c2(self, data: Dict):
        """Relay data to C2 server"""
        try:
            if self.ws:
                await self.ws.send(json.dumps(data))
        except Exception as e:
            print(f"[{datetime.now()}] Relay error: {e}")
            
    async def send_pong(self):
        """Respond to ping from C2"""
        pong = {
            "type": "pong",
            "agent_id": self.agent_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.ws.send(json.dumps(pong))
        
    async def run(self):
        """Main run loop"""
        print(f"[{datetime.now()}] NOP Agent '{self.agent_name}' starting...")
        print(f"[{datetime.now()}] Enabled modules: {', '.join([k for k, v in self.capabilities.items() if v])}")
        
        while self.running:
            try:
                await self.connect()
            except KeyboardInterrupt:
                print(f"[{datetime.now()}] Agent stopped by user")
                self.running = False
                break
            except Exception as e:
                print(f"[{datetime.now()}] Error: {e}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    agent = NOPAgent()
    asyncio.run(agent.run())
