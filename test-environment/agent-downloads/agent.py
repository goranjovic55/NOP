#!/usr/bin/env python3
"""
NOP Agent - po_test_ifaces
Generated: 2026-01-05T18:46:45.542634
Type: Python Proxy Agent
Encryption: AES-256-GCM (Encrypted tunnel to C2)

This agent acts as a proxy, relaying all data from the remote network
back to the NOP C2 server. All modules run here but data is processed
on the main NOP instance.

Download URL: {BASE_URL}/api/v1/agents/download/Y2eXpiTGR5O_LPYsnFAb1fwCxyYBFNrZve3fY2gy4tM

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
    deps = {
        'websockets': 'websockets',
        'psutil': 'psutil', 
        'scapy': 'scapy',
        'cryptography': 'cryptography',
        'netifaces': 'netifaces'
    }
    
    missing = []
    for module, package in deps.items():
        if importlib.util.find_spec(module) is None:
            missing.append(package)
    
    if missing:
        print(f"Missing dependencies: {', '.join(missing)}")
        print("Installing dependencies...")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user'] + missing)
            print("Dependencies installed successfully. Please run the agent again.")
            sys.exit(0)
        except subprocess.CalledProcessError as e:
            print(f"Failed to install dependencies: {e}")
            print(f"Please install manually: pip3 install {' '.join(missing)}")
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
AGENT_ID = "7b17de60-3e63-4951-831d-684cdfc9bd20"
AGENT_NAME = "po_test_ifaces"
AUTH_TOKEN = "CuJssIH9IcsKYUssk-FQVK4G1F9ZgyNkiquJBQHwTtM"
ENCRYPTION_KEY = "mF0v-jGpK7VMwfNfG5P5xzusT3R8Mhd8cRJ1EZek_Ww"
SERVER_URL = "ws://172.28.0.1:8000/api/v1/agents/7b17de60-3e63-4951-831d-684cdfc9bd20/connect"
CAPABILITIES = {'asset': True, 'traffic': True, 'host': True, 'access': True}
CONFIG = {'scan_subnet': '10.10.2.0/24', 'scan_timeout': 3, 'passive_discovery': True, 'sniff_interface': 'eth1'}

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
            # Connect without extra_headers for compatibility with older websockets versions
            async with websockets.connect(self.server_url) as websocket:
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
                
                if msg_type == "terminate":
                    print(f"[{datetime.now()}] Terminate command received from C2")
                    print(f"[{datetime.now()}] Message: {data.get('message', 'Shutting down...')}")
                    self.running = False
                    break
                elif msg_type == "command":
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
        """Asset Discovery Module - Discovers network hosts via ARP and passive sniffing"""
        print(f"[{datetime.now()}] Asset module started")
        
        # Start passive discovery if enabled
        passive_enabled = self.config.get('passive_discovery', False)
        if passive_enabled:
            asyncio.create_task(self.passive_discovery())
            print(f"[{datetime.now()}] Passive discovery enabled")
        
        while self.running:
            try:
                await asyncio.sleep(300)  # Run active scan every 5 minutes
                assets = await self.discover_assets()
                
                # Include passively discovered hosts
                if passive_enabled and self.passive_hosts:
                    print(f"[{datetime.now()}] Including {len(self.passive_hosts)} passively discovered hosts")
                    assets.extend(self.passive_hosts)
                    self.passive_hosts = []  # Clear after sending
                
                await self.relay_to_c2({
                    "type": "asset_data",
                    "agent_id": self.agent_id,
                    "assets": assets,
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                print(f"[{datetime.now()}] Asset module error: {e}")
    
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
                print(f"[{datetime.now()}] No suitable interface for passive discovery")
                return
            
            print(f"[{datetime.now()}] Starting passive discovery on {sniff_iface}")
            
            def packet_handler(packet):
                """Process captured packets"""
                try:
                    if packet.haslayer(scapy.IP):
                        src_ip = packet[scapy.IP].src
                        
                        # Extract MAC if available
                        src_mac = None
                        if packet.haslayer(scapy.Ether):
                            src_mac = packet[scapy.Ether].src
                        
                        # Simple dedup by IP
                        existing_ips = [h.get('ip') for h in self.passive_hosts]
                        if src_ip not in existing_ips:
                            host_info = {
                                "ip": src_ip,
                                "mac": src_mac,
                                "status": "online",
                                "discovered_at": datetime.utcnow().isoformat(),
                                "method": "passive"
                            }
                            self.passive_hosts.append(host_info)
                except Exception as e:
                    pass  # Silently ignore packet processing errors
            
            # Sniff packets in separate thread (blocking call)
            def start_sniffer():
                try:
                    scapy.sniff(iface=sniff_iface, prn=packet_handler, store=0)
                except Exception as e:
                    print(f"[{datetime.now()}] Sniffer thread error: {e}")
            
            sniffer_thread = threading.Thread(target=start_sniffer, daemon=True)
            sniffer_thread.start()
            print(f"[{datetime.now()}] Passive discovery thread started")
            
        except Exception as e:
            print(f"[{datetime.now()}] Passive discovery error: {e}")
                
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
                    iface_obj = IPv4Interface(f"{best_ip}/{best_netmask}")
                    network = str(iface_obj.network)
                except:
                    network = '.'.join(best_ip.split('.')[:3]) + '.0/24'
            else:
                # Use configured subnet
                network = scan_subnet
                best_interface = 'custom'
            
            print(f"[{datetime.now()}] Scanning network: {network} (interface: {best_interface or 'default'})")
            
            # Get timeout from config (default 2 seconds for larger networks)
            scan_timeout = self.config.get('scan_timeout', 2)
            
            # ARP scan
            arp_request = scapy.ARP(pdst=network)
            broadcast = scapy.Ether(dst="ff:ff:ff:ff:ff:ff")
            arp_request_broadcast = broadcast/arp_request
            answered_list = scapy.srp(arp_request_broadcast, timeout=scan_timeout, verbose=False)[0]
            
            assets = []
            for element in answered_list:
                asset = {
                    "ip": element[1].psrc,
                    "mac": element[1].hwsrc,
                    "status": "online",
                    "discovered_at": datetime.utcnow().isoformat()
                }
                assets.append(asset)
                
            print(f"[{datetime.now()}] Discovered {len(assets)} assets via ARP")
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
            # Collect network interfaces
            interfaces = []
            try:
                import netifaces
                for iface in netifaces.interfaces():
                    addrs = netifaces.ifaddresses(iface)
                    if netifaces.AF_INET in addrs:
                        for addr in addrs[netifaces.AF_INET]:
                            interfaces.append({
                                "name": iface,
                                "ip": addr.get('addr', ''),
                                "status": "up"
                            })
            except Exception as e:
                print(f"[{datetime.now()}] Interface collection error: {e}")
            
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
                "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
                "interfaces": interfaces
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
