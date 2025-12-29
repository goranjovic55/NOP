"""
Host management endpoints for system monitoring and access
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Body
from typing import Dict, Any, List, Optional
from pathlib import Path
from pydantic import BaseModel
import psutil
import platform
import asyncio
import json
import os
import shutil
from datetime import datetime
from app.core.security import get_current_user

router = APIRouter()


class WriteFileRequest(BaseModel):
    path: str
    content: str


@router.get("/system/info")
async def get_system_info(
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get basic system information"""
    try:
        return {
            "hostname": platform.node(),
            "platform": platform.system(),
            "platform_release": platform.release(),
            "platform_version": platform.version(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")


@router.get("/system/metrics")
async def get_system_metrics(
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get real-time system metrics"""
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
        cpu_freq = psutil.cpu_freq()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk metrics
        disk_usage = []
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disk_usage.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": usage.percent
                })
            except (PermissionError, OSError):
                continue
        
        # Network metrics
        net_io = psutil.net_io_counters()
        
        # Process count
        process_count = len(psutil.pids())
        
        # Calculate total CPU from per-core data
        cpu_total = sum(cpu_percent) / len(cpu_percent) if cpu_percent else 0
        
        return {
            "cpu": {
                "percent_total": cpu_total,
                "percent_per_core": cpu_percent,
                "core_count": psutil.cpu_count(logical=False),
                "thread_count": psutil.cpu_count(logical=True),
                "frequency": {
                    "current": cpu_freq.current if cpu_freq else 0,
                    "min": cpu_freq.min if cpu_freq else 0,
                    "max": cpu_freq.max if cpu_freq else 0
                } if cpu_freq else None
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "free": memory.free,
                "percent": memory.percent,
                "swap_total": swap.total,
                "swap_used": swap.used,
                "swap_free": swap.free,
                "swap_percent": swap.percent
            },
            "disk": disk_usage,
            "network": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv,
                "errin": net_io.errin,
                "errout": net_io.errout,
                "dropin": net_io.dropin,
                "dropout": net_io.dropout
            },
            "processes": process_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system metrics: {str(e)}")


@router.get("/system/processes")
async def get_processes(
    current_user: Dict = Depends(get_current_user),
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Get list of running processes"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'status']):
            try:
                pinfo = proc.info
                processes.append({
                    "pid": pinfo['pid'],
                    "name": pinfo['name'],
                    "username": pinfo['username'],
                    "cpu_percent": pinfo['cpu_percent'],
                    "memory_percent": pinfo['memory_percent'],
                    "status": pinfo['status']
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # Sort by CPU usage and limit
        processes.sort(key=lambda x: x['cpu_percent'] or 0, reverse=True)
        return processes[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get processes: {str(e)}")


@router.get("/system/connections")
async def get_network_connections(
    current_user: Dict = Depends(get_current_user),
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Get list of network connections (netstat-like)"""
    try:
        connections = []
        for conn in psutil.net_connections(kind='inet'):
            try:
                local_addr = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "-"
                remote_addr = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "-"
                
                # Get process name if available
                proc_name = "-"
                if conn.pid:
                    try:
                        proc = psutil.Process(conn.pid)
                        proc_name = proc.name()
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                connections.append({
                    "local_address": local_addr,
                    "remote_address": remote_addr,
                    "status": conn.status,
                    "pid": conn.pid,
                    "process": proc_name,
                    "family": "IPv4" if conn.family.name == "AF_INET" else "IPv6",
                    "type": "TCP" if conn.type.name == "SOCK_STREAM" else "UDP"
                })
            except (AttributeError, OSError):
                continue
        
        # Sort by status (ESTABLISHED first, then LISTEN)
        status_order = {"ESTABLISHED": 0, "LISTEN": 1, "TIME_WAIT": 2}
        connections.sort(key=lambda x: status_order.get(x['status'], 99))
        return connections[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get connections: {str(e)}")


@router.get("/system/disk-io")
async def get_disk_io(
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get disk I/O statistics"""
    try:
        disk_io = psutil.disk_io_counters(perdisk=True)
        result = {}
        for disk, counters in disk_io.items():
            result[disk] = {
                "read_count": counters.read_count,
                "write_count": counters.write_count,
                "read_bytes": counters.read_bytes,
                "write_bytes": counters.write_bytes,
                "read_time": counters.read_time,
                "write_time": counters.write_time
            }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get disk I/O: {str(e)}")


@router.get("/filesystem/browse")
async def browse_filesystem(
    path: str = "/",
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Browse filesystem directory"""
    try:
        target_path = Path(path).resolve()
        
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="Path does not exist")
        
        if not target_path.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        items = []
        for item in target_path.iterdir():
            try:
                stat = item.stat()
                items.append({
                    "name": item.name,
                    "path": str(item),
                    "type": "directory" if item.is_dir() else "file",
                    "size": stat.st_size if item.is_file() else 0,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "permissions": oct(stat.st_mode)[-3:],
                })
            except (PermissionError, OSError) as e:
                items.append({
                    "name": item.name,
                    "path": str(item),
                    "type": "unknown",
                    "error": str(e)
                })
        
        # Sort: directories first, then by name
        items.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))
        
        return {
            "current_path": str(target_path),
            "parent_path": str(target_path.parent) if target_path.parent != target_path else None,
            "items": items
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to browse filesystem: {str(e)}")


@router.get("/filesystem/read")
async def read_file(
    path: str,
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Read file contents"""
    try:
        target_path = Path(path).resolve()
        
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="File does not exist")
        
        if not target_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        # Limit file size to 1MB for safety
        if target_path.stat().st_size > 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 1MB)")
        
        try:
            content = target_path.read_text()
            is_binary = False
        except UnicodeDecodeError:
            content = target_path.read_bytes().hex()
            is_binary = True
        
        return {
            "path": str(target_path),
            "content": content,
            "is_binary": is_binary,
            "size": target_path.stat().st_size
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


@router.post("/filesystem/write")
async def write_file(
    request: WriteFileRequest,
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, str]:
    """Write content to file"""
    try:
        target_path = Path(request.path).resolve()
        
        # Create parent directories if they don't exist
        target_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write content
        target_path.write_text(request.content)
        
        return {
            "status": "success",
            "path": str(target_path),
            "message": "File written successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")


@router.delete("/filesystem/delete")
async def delete_path(
    path: str,
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, str]:
    """Delete file or directory"""
    try:
        target_path = Path(path).resolve()
        
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="Path does not exist")
        
        if target_path.is_dir():
            shutil.rmtree(target_path)
        else:
            target_path.unlink()
        
        return {
            "status": "success",
            "message": f"Deleted {path}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")


@router.post("/filesystem/upload")
async def upload_file(
    path: str = Body(..., description="Destination path on server"),
    content: str = Body(..., description="Base64 encoded file content"),
    filename: str = Body(..., description="Original filename"),
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Upload a file from the operator's computer to the server"""
    import base64
    try:
        target_dir = Path(path).resolve()
        
        # Ensure target directory exists
        target_dir.mkdir(parents=True, exist_ok=True)
        
        target_file = target_dir / filename
        
        # Decode base64 content and write
        file_data = base64.b64decode(content)
        target_file.write_bytes(file_data)
        
        return {
            "status": "success",
            "path": str(target_file),
            "size": len(file_data),
            "message": f"File uploaded successfully to {target_file}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/filesystem/download")
async def download_file(
    path: str,
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Download a file from the server to the operator's computer"""
    import base64
    try:
        target_path = Path(path).resolve()
        
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="File does not exist")
        
        if not target_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        # Limit file size to 50MB for download
        file_size = target_path.stat().st_size
        if file_size > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 50MB)")
        
        # Read file and encode as base64
        file_data = target_path.read_bytes()
        content_base64 = base64.b64encode(file_data).decode('utf-8')
        
        return {
            "path": str(target_path),
            "filename": target_path.name,
            "content": content_base64,
            "size": file_size,
            "is_binary": True
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")


@router.websocket("/terminal")
async def terminal_websocket(websocket: WebSocket, token: Optional[str] = None):
    """
    WebSocket endpoint for terminal access using PTY
    
    This provides a fully interactive terminal experience with:
    - Proper PTY (pseudo-terminal) emulation
    - Window resize support
    - Signal handling
    """
    import pty
    import struct
    import fcntl
    import termios
    import select
    
    # Basic token validation
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    # TODO: Add proper JWT token verification here
    # For now, just check that token is provided
    
    await websocket.accept()
    
    # Create PTY
    master_fd, slave_fd = pty.openpty()
    
    # Fork a child process
    pid = os.fork()
    
    if pid == 0:
        # Child process
        os.close(master_fd)
        os.setsid()
        
        # Set up the slave as the controlling terminal
        os.dup2(slave_fd, 0)  # stdin
        os.dup2(slave_fd, 1)  # stdout
        os.dup2(slave_fd, 2)  # stderr
        
        if slave_fd > 2:
            os.close(slave_fd)
        
        # Execute bash
        os.execvp('/bin/bash', ['/bin/bash', '-l'])
    
    # Parent process
    os.close(slave_fd)
    
    # Set non-blocking mode
    import fcntl
    flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
    fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
    
    async def read_pty():
        """Read from PTY and send to WebSocket"""
        loop = asyncio.get_event_loop()
        while True:
            try:
                await asyncio.sleep(0.01)  # Small delay to prevent CPU spinning
                try:
                    data = os.read(master_fd, 4096)
                    if data:
                        await websocket.send_text(data.decode('utf-8', errors='replace'))
                except OSError:
                    pass
            except asyncio.CancelledError:
                break
            except Exception as e:
                break
    
    read_task = asyncio.create_task(read_pty())
    
    try:
        while True:
            try:
                data = await websocket.receive()
                
                if data['type'] == 'websocket.receive':
                    if 'text' in data:
                        text = data['text']
                        
                        # Check if it's a resize command (JSON)
                        if text.startswith('{'):
                            try:
                                cmd = json.loads(text)
                                if cmd.get('type') == 'resize':
                                    cols = cmd.get('cols', 80)
                                    rows = cmd.get('rows', 24)
                                    # Set terminal size
                                    winsize = struct.pack('HHHH', rows, cols, 0, 0)
                                    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                                continue
                            except json.JSONDecodeError:
                                pass
                        
                        # Regular terminal input
                        os.write(master_fd, text.encode('utf-8'))
                        
                    elif 'bytes' in data:
                        os.write(master_fd, data['bytes'])
                        
                elif data['type'] == 'websocket.disconnect':
                    break
                    
            except WebSocketDisconnect:
                break
                
    except Exception as e:
        try:
            await websocket.send_text(f"\r\n\x1b[31mError: {str(e)}\x1b[0m\r\n")
        except:
            pass
    finally:
        read_task.cancel()
        try:
            await read_task
        except asyncio.CancelledError:
            pass
        
        # Clean up
        os.close(master_fd)
        try:
            os.kill(pid, 9)
            os.waitpid(pid, 0)
        except:
            pass

