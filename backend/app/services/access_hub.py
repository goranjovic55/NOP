from sqlalchemy.ext.asyncio import AsyncSession
"""
Access Hub service for remote system connections
"""

import asyncio
import paramiko
import socket
import logging
import ftplib
from io import BytesIO
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
            # Trim whitespace from credentials to prevent common copy-paste errors
            username = username.strip() if username else username
            password = password.strip() if password else password

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
            # Trim whitespace from credentials to prevent common copy-paste errors
            username = username.strip() if username else username
            password = password.strip() if password else password

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
        # Trim whitespace from credentials to prevent common copy-paste errors
        username = username.strip() if username else username
        password = password.strip() if password else password

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

    def add_connection(self, connection_id: str, info: Dict[str, Any]):
        """Register a new active connection"""
        self.active_connections[connection_id] = {
            "id": connection_id,
            "start_time": datetime.now().isoformat(),
            **info
        }

    def remove_connection(self, connection_id: str):
        """Remove an active connection"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

    async def get_credentials_for_asset(self, db: AsyncSession, asset_id: str, protocol: str) -> List[Dict[str, Any]]:
        """Retrieve credentials for a specific asset and protocol"""
        from app.models.credential import Credential
        from app.models.asset import Asset
        from sqlalchemy import select, cast, text
        from sqlalchemy.dialects.postgresql import INET
        from app.core.security import decrypt_data
        import uuid

        # Try to find asset by ID or IP address
        asset_uuid = None
        try:
            asset_uuid = uuid.UUID(asset_id)
        except ValueError:
            # If not a UUID, try to find asset by IP or Hostname
            import ipaddress
            is_ip = False
            try:
                ipaddress.ip_address(asset_id)
                is_ip = True
            except ValueError:
                pass
            
            if is_ip:
                query = select(Asset).where(Asset.ip_address == cast(text(f"'{asset_id}'"), INET))
            else:
                query = select(Asset).where(Asset.hostname == asset_id)
                
            result = await db.execute(query)
            asset = result.scalars().first()
            if asset:
                asset_uuid = asset.id
            else:
                logger.error(f"Asset not found by ID or IP: {asset_id}")
                return []

        query = select(Credential).where(
            Credential.asset_id == asset_uuid,
            Credential.protocol == protocol.lower()
        )
        result = await db.execute(query)
        credentials = result.scalars().all()

        decrypted_creds = []
        for cred in credentials:
            try:
                decrypted_creds.append({
                    "id": str(cred.id),
                    "username": cred.username,
                    "password": decrypt_data(cred.encrypted_password) if cred.encrypted_password else None,
                    "private_key": decrypt_data(cred.encrypted_private_key) if cred.encrypted_private_key else None,
                })
            except Exception as e:
                logger.error(f"Failed to decrypt credential {cred.id}: {e}")
                decrypted_creds.append({
                    "id": str(cred.id),
                    "username": cred.username,
                    "password": None,
                    "private_key": None,
                    "error": "Decryption failed"
                })
        return decrypted_creds

    async def save_credential(self, db: AsyncSession, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save credentials for an asset"""
        from app.models.credential import Credential
        from app.models.asset import Asset
        from app.core.security import encrypt_data
        from sqlalchemy import select, cast, text
        from sqlalchemy.dialects.postgresql import INET
        import uuid

        asset_id = data.get("asset_id")
        protocol = data.get("protocol")
        username = data.get("username")
        password = data.get("password")
        private_key = data.get("private_key")

        # Try to find asset by ID or IP address
        asset_uuid = None
        try:
            asset_uuid = uuid.UUID(asset_id)
        except ValueError:
            # If not a UUID, try to find asset by IP
            query = select(Asset).where(Asset.ip_address == cast(text(f"'{asset_id}'"), INET))
            result = await db.execute(query)
            asset = result.scalars().first()
            if asset:
                asset_uuid = asset.id
            else:
                # If asset doesn't exist, we might want to create it or just fail
                # For now, let's fail if asset is not found
                return {"success": False, "error": f"Asset not found: {asset_id}"}

        # Check if credential already exists
        query = select(Credential).where(
            Credential.asset_id == asset_uuid,
            Credential.protocol == protocol.lower(),
            Credential.username == username
        )
        result = await db.execute(query)
        existing_cred = result.scalars().first()

        if existing_cred:
            # Update existing credential
            if password:
                existing_cred.encrypted_password = encrypt_data(password)
            if private_key:
                existing_cred.encrypted_private_key = encrypt_data(private_key)
            existing_cred.updated_at = datetime.utcnow()
        else:
            # Create new credential
            new_cred = Credential(
                asset_id=asset_uuid,
                name=f"{protocol.upper()} - {username}",
                credential_type="custom",
                protocol=protocol.lower(),
                username=username,
                encrypted_password=encrypt_data(password) if password else None,
                encrypted_private_key=encrypt_data(private_key) if private_key else None,
                encryption_key_id="default"
            )
            db.add(new_cred)

        await db.commit()
        return {"success": True, "message": "Credential saved successfully"}

    async def list_ftp_files(self, host: str, port: int, username: str, password: str = None, path: str = "/") -> Dict[str, Any]:
        """List files on an FTP server"""
        try:
            # Run blocking FTP operations in a thread
            def _list():
                ftp = ftplib.FTP()
                ftp.connect(host, port, timeout=10)
                ftp.login(username, password)
                
                files = []
                try:
                    ftp.cwd(path)
                except Exception:
                    # If cwd fails, maybe it's a file or permission issue, but we'll try to list anyway or return error
                    pass
                
                items = []
                ftp.dir(items.append)
                
                parsed_items = []
                for item in items:
                    # Simple parsing
                    parts = item.split()
                    if len(parts) >= 9:
                        is_dir = item.startswith('d')
                        name = " ".join(parts[8:])
                        size = parts[4]
                        date = " ".join(parts[5:8])
                        parsed_items.append({
                            "name": name,
                            "type": "directory" if is_dir else "file",
                            "size": size,
                            "date": date,
                            "raw": item
                        })
                
                ftp.quit()
                return parsed_items

            loop = asyncio.get_event_loop()
            files = await loop.run_in_executor(None, _list)
            
            return {
                "success": True,
                "files": files,
                "path": path
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def download_ftp_file(self, host: str, port: int, username: str, password: str, path: str) -> Dict[str, Any]:
        """Download a file from FTP server"""
        try:
            def _download():
                ftp = ftplib.FTP()
                ftp.connect(host, port, timeout=10)
                ftp.login(username, password)
                
                bio = BytesIO()
                ftp.retrbinary(f"RETR {path}", bio.write)
                
                ftp.quit()
                bio.seek(0)
                return bio.read()

            loop = asyncio.get_event_loop()
            content = await loop.run_in_executor(None, _download)
            
            try:
                return {
                    "success": True,
                    "content": content.decode('utf-8'),
                    "is_binary": False
                }
            except UnicodeDecodeError:
                import base64
                return {
                    "success": True,
                    "content": base64.b64encode(content).decode('utf-8'),
                    "is_binary": True
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def upload_ftp_file(self, host: str, port: int, username: str, password: str, path: str, content: str, is_binary: bool = False) -> Dict[str, Any]:
        """Upload a file to FTP server"""
        try:
            def _upload():
                ftp = ftplib.FTP()
                ftp.connect(host, port, timeout=10)
                ftp.login(username, password)
                
                if is_binary:
                    import base64
                    data = base64.b64decode(content)
                    bio = BytesIO(data)
                    ftp.storbinary(f"STOR {path}", bio)
                else:
                    bio = BytesIO(content.encode('utf-8'))
                    ftp.storbinary(f"STOR {path}", bio)
                    
                ftp.quit()

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _upload)
            
            return {
                "success": True,
                "message": "File uploaded successfully"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

# Global access hub instance
access_hub = AccessHub()
