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
from app.schemas.user import User

router = APIRouter()


class WriteFileRequest(BaseModel):
    path: str
    content: str


@router.get("/system/info")
async def get_system_info(
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user),
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


@router.get("/filesystem/browse")
async def browse_filesystem(
    path: str = "/",
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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


@router.websocket("/terminal")
async def terminal_websocket(websocket: WebSocket, token: str = None):
    """
    WebSocket endpoint for terminal access
    
    Note: This is a basic implementation. For production use, consider:
    1. Proper authentication via token query parameter or connection handshake
    2. Using pty for real terminal emulation
    3. Rate limiting and timeout controls
    4. Audit logging of terminal sessions
    """
    # Basic token validation (should be enhanced with proper JWT verification)
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    await websocket.accept()
    
    try:
        # Note: This is a simplified implementation
        # In production, you'd want to use pty for a real terminal
        import subprocess
        
        process = subprocess.Popen(
            ['/bin/bash'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=0
        )
        
        async def read_output():
            while True:
                try:
                    if process.stdout:
                        output = process.stdout.readline()
                        if output:
                            await websocket.send_json({
                                "type": "output",
                                "data": output
                            })
                    await asyncio.sleep(0.1)
                except Exception:
                    break
        
        # Start output reader
        output_task = asyncio.create_task(read_output())
        
        # Handle input
        while True:
            data = await websocket.receive_json()
            
            if data.get('type') == 'input' and process.stdin:
                command = data.get('data', '')
                process.stdin.write(command + '\n')
                process.stdin.flush()
            elif data.get('type') == 'resize':
                # Handle terminal resize (would need pty for this)
                pass
            elif data.get('type') == 'close':
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "data": str(e)
        })
    finally:
        if 'process' in locals():
            process.terminate()
        if 'output_task' in locals():
            output_task.cancel()
