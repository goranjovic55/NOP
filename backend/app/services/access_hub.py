from sqlalchemy.ext.asyncio import AsyncSession
"""
Access Hub service for remote system connections
"""

import asyncio
import paramiko
import socket
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class AccessHub:
    """Access hub for managing remote connections"""
    
    def __init__(self):
        self.active_connections = {}
        self.connection_history = []
        
    async def test_ssh_connection(self, host: str, port: int, username: str, password: str = None, key_file: str = None) -> Dict[str, Any]:
        """Test SSH connection to a remote host"""
        try:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect with password or key
            if password:
                client.connect(host, port=port, username=username, password=password, timeout=10)
            elif key_file:
                client.connect(host, port=port, username=username, key_filename=key_file, timeout=10)
            else:
                return {"success": False, "error": "No authentication method provided"}
            
            # Test connection by running a simple command
            stdin, stdout, stderr = client.exec_command('echo "Connection test successful"')
            output = stdout.read().decode().strip()
            error = stderr.read().decode().strip()
            
            client.close()
            
            if output == "Connection test successful":
                return {
                    "success": True,
                    "host": host,
                    "port": port,
                    "username": username,
                    "message": "SSH connection successful"
                }
            else:
                return {
                    "success": False,
                    "error": f"Command execution failed: {error}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def execute_ssh_command(self, host: str, port: int, username: str, command: str, password: str = None, key_file: str = None) -> Dict[str, Any]:
        """Execute a command on a remote host via SSH"""
        try:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect
            if password:
                client.connect(host, port=port, username=username, password=password, timeout=10)
            elif key_file:
                client.connect(host, port=port, username=username, key_filename=key_file, timeout=10)
            else:
                return {"success": False, "error": "No authentication method provided"}
            
            # Execute command
            stdin, stdout, stderr = client.exec_command(command, timeout=30)
            output = stdout.read().decode()
            error = stderr.read().decode()
            exit_code = stdout.channel.recv_exit_status()
            
            client.close()
            
            # Log the connection
            self.connection_history.append({
                "timestamp": datetime.now().isoformat(),
                "host": host,
                "port": port,
                "username": username,
                "command": command,
                "success": exit_code == 0
            })
            
            return {
                "success": True,
                "host": host,
                "command": command,
                "output": output,
                "error": error,
                "exit_code": exit_code
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def test_tcp_connection(self, host: str, port: int, timeout: int = 5) -> Dict[str, Any]:
        """Test TCP connection to a host and port"""
        try:
            future = asyncio.open_connection(host, port)
            reader, writer = await asyncio.wait_for(future, timeout=timeout)
            writer.close()
            await writer.wait_closed()
            
            return {
                "success": True,
                "host": host,
                "port": port,
                "message": "TCP connection successful"
            }
        except Exception as e:
            return {
                "success": False,
                "host": host,
                "port": port,
                "error": str(e)
            }
    
    async def scan_common_services(self, host: str) -> Dict[str, Any]:
        """Scan for common services on a host"""
        common_ports = {
            22: "SSH",
            23: "Telnet", 
            25: "SMTP",
            53: "DNS",
            80: "HTTP",
            110: "POP3",
            143: "IMAP",
            443: "HTTPS",
            993: "IMAPS",
            995: "POP3S",
            3306: "MySQL",
            3389: "RDP",
            5432: "PostgreSQL",
            5900: "VNC",
            6379: "Redis"
        }
        
        results = {
            "host": host,
            "scan_time": datetime.now().isoformat(),
            "services": []
        }
        
        for port, service in common_ports.items():
            conn_result = await self.test_tcp_connection(host, port, timeout=2)
            if conn_result["success"]:
                results["services"].append({
                    "port": port,
                    "service": service,
                    "status": "open"
                })
        
        return results
    
    async def get_system_info_ssh(self, host: str, port: int, username: str, password: str = None, key_file: str = None) -> Dict[str, Any]:
        """Get system information via SSH"""
        commands = {
            "hostname": "hostname",
            "os_info": "uname -a",
            "uptime": "uptime",
            "disk_usage": "df -h",
            "memory": "free -h",
            "network": "ip addr show",
            "processes": "ps aux | head -10"
        }
        
        results = {
            "host": host,
            "scan_time": datetime.now().isoformat(),
            "system_info": {}
        }
        
        for info_type, command in commands.items():
            cmd_result = await self.execute_ssh_command(host, port, username, command, password, key_file)
            if cmd_result["success"]:
                results["system_info"][info_type] = {
                    "output": cmd_result["output"].strip(),
                    "success": True
                }
            else:
                results["system_info"][info_type] = {
                    "error": cmd_result["error"],
                    "success": False
                }
        
        return results
    
    def get_connection_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get connection history"""
        return self.connection_history[-limit:]
    
    def get_active_connections(self) -> Dict[str, Any]:
        """Get active connections"""
        return {
            "active_count": len(self.active_connections),
            "connections": list(self.active_connections.values())
        }

    async def get_credentials_for_asset(self, db: AsyncSession, asset_id: str, protocol: str) -> List[Dict[str, Any]]:
        """Retrieve credentials for a specific asset and protocol"""
        from app.models.credential import Credential
        from sqlalchemy import select
        from app.core.security import decrypt_data

        query = select(Credential).where(
            Credential.asset_id == asset_id,
            Credential.protocol == protocol
        )
        result = await db.execute(query)
        credentials = result.scalars().all()

        decrypted_creds = []
        for cred in credentials:
            decrypted_creds.append({
                "id": str(cred.id),
                "username": cred.username,
                "password": decrypt_data(cred.encrypted_password) if cred.encrypted_password else None,
                "private_key": decrypt_data(cred.encrypted_private_key) if cred.encrypted_private_key else None,
            })
        return decrypted_creds

# Global access hub instance
access_hub = AccessHub()