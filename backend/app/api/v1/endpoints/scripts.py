"""
Script automation endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import asyncio

from app.core.database import get_db

router = APIRouter()


class ScriptStepRequest(BaseModel):
    """Script step definition"""
    type: str
    name: str
    params: Dict[str, Any]


class ScriptExecutionRequest(BaseModel):
    """Request to execute a script"""
    script_id: str
    steps: List[ScriptStepRequest]


class ScriptStepResult(BaseModel):
    """Result of a script step execution"""
    step_id: int
    status: str
    output: Optional[str] = None
    error: Optional[str] = None


class ScriptExecutionResponse(BaseModel):
    """Response from script execution"""
    script_id: str
    status: str
    completed_steps: int
    total_steps: int
    results: List[ScriptStepResult]


async def execute_step(step_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a single script step
    
    Args:
        step_type: Type of step to execute
        params: Parameters for the step
        
    Returns:
        Execution result with output/error
    """
    # Simulate execution delay
    await asyncio.sleep(0.5)
    
    # Execute different step types
    try:
        if step_type == "login_ssh":
            target = params.get("target", "unknown")
            return {
                "success": True,
                "output": f"SSH connection established to {target}"
            }
            
        elif step_type == "login_rdp":
            target = params.get("target", "unknown")
            return {
                "success": True,
                "output": f"RDP connection established to {target}"
            }
            
        elif step_type == "login_vnc":
            target = params.get("target", "unknown")
            return {
                "success": True,
                "output": f"VNC connection established to {target}"
            }
            
        elif step_type == "port_scan":
            target = params.get("target", "unknown")
            ports = params.get("ports", "unknown")
            return {
                "success": True,
                "output": f"Port scan completed on {target} (ports: {ports}). Found 5 open ports: 22, 80, 443, 3306, 8080"
            }
            
        elif step_type == "vuln_scan":
            target = params.get("target", "unknown")
            return {
                "success": True,
                "output": f"Vulnerability scan completed on {target}. Found 2 vulnerabilities: CVE-2023-1234 (HIGH), CVE-2023-5678 (MEDIUM)"
            }
            
        elif step_type == "exploit":
            target = params.get("target", "unknown")
            exploit_type = params.get("exploit_type", "auto")
            return {
                "success": True,
                "output": f"Exploit executed against {target} using {exploit_type}. Shell session opened."
            }
            
        elif step_type == "command":
            command = params.get("command", "")
            return {
                "success": True,
                "output": f"Command executed: {command}\nOutput: Command completed successfully"
            }
            
        elif step_type == "ping_test":
            targets = params.get("targets", [])
            count = params.get("count", 5)
            target_str = ", ".join(targets) if isinstance(targets, list) else str(targets)
            return {
                "success": True,
                "output": f"Ping test completed for {target_str} ({count} packets). All targets reachable. Avg latency: 2.5ms"
            }
            
        elif step_type == "port_disable":
            port = params.get("port", "unknown")
            return {
                "success": True,
                "output": f"Port {port} has been disabled"
            }
            
        elif step_type == "port_enable":
            port = params.get("port", "unknown")
            return {
                "success": True,
                "output": f"Port {port} has been enabled"
            }
            
        elif step_type == "delay":
            seconds = params.get("seconds", 5)
            await asyncio.sleep(seconds)
            return {
                "success": True,
                "output": f"Waited {seconds} seconds"
            }
            
        elif step_type == "agent_download":
            url = params.get("url", "unknown")
            return {
                "success": True,
                "output": f"NOP agent downloaded from {url}"
            }
            
        elif step_type == "agent_execute":
            args = params.get("args", "")
            return {
                "success": True,
                "output": f"NOP agent started with args: {args}. Agent is now running and connected."
            }
            
        else:
            return {
                "success": False,
                "output": None,
                "error": f"Unknown step type: {step_type}"
            }
            
    except Exception as e:
        return {
            "success": False,
            "output": None,
            "error": str(e)
        }


@router.post("/execute", response_model=ScriptExecutionResponse)
async def execute_script(
    request: ScriptExecutionRequest,
    db: AsyncSession = Depends(get_db)
) -> ScriptExecutionResponse:
    """
    Execute a script with multiple steps
    
    Args:
        request: Script execution request with steps
        
    Returns:
        Execution results for all steps
    """
    results = []
    completed_steps = 0
    
    for idx, step in enumerate(request.steps):
        result = await execute_step(step.type, step.params)
        
        step_result = ScriptStepResult(
            step_id=idx,
            status="completed" if result["success"] else "failed",
            output=result.get("output"),
            error=result.get("error")
        )
        
        results.append(step_result)
        
        if result["success"]:
            completed_steps += 1
        else:
            # Stop execution on first failure
            break
    
    return ScriptExecutionResponse(
        script_id=request.script_id,
        status="completed" if completed_steps == len(request.steps) else "failed",
        completed_steps=completed_steps,
        total_steps=len(request.steps),
        results=results
    )


@router.post("/step/execute")
async def execute_single_step(
    step_type: str,
    params: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Execute a single script step
    
    Args:
        step_type: Type of step to execute
        params: Parameters for the step
        
    Returns:
        Execution result
    """
    result = await execute_step(step_type, params)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Step execution failed"))
    
    return result


@router.get("/templates")
async def get_script_templates(db: AsyncSession = Depends(get_db)):
    """
    Get available script templates
    
    Returns:
        List of script templates
    """
    templates = [
        {
            "id": "rep-ring-test",
            "name": "REP Ring Test",
            "description": "Test network redundancy by disabling ports and monitoring rep-ring status",
            "category": "network",
            "steps": [
                {"type": "login_ssh", "name": "Login to Switch", "params": {}},
                {"type": "port_disable", "name": "Disable Port", "params": {}},
                {"type": "ping_test", "name": "Test Network Connectivity", "params": {}},
                {"type": "command", "name": "Check REP Ring Status", "params": {"command": "show rep topology"}},
                {"type": "delay", "name": "Wait for convergence", "params": {"seconds": 10}},
                {"type": "port_enable", "name": "Re-enable Port", "params": {}},
                {"type": "command", "name": "Verify REP Ring Recovery", "params": {"command": "show rep topology"}}
            ]
        },
        {
            "id": "vulnerability-exploit-chain",
            "name": "Vulnerability Scan & Exploit",
            "description": "Scan for vulnerabilities, exploit them, and deploy NOP agent",
            "category": "security",
            "steps": [
                {"type": "port_scan", "name": "Scan Ports", "params": {}},
                {"type": "vuln_scan", "name": "Scan for Vulnerabilities", "params": {}},
                {"type": "exploit", "name": "Exploit Vulnerability", "params": {}},
                {"type": "agent_download", "name": "Download NOP Agent", "params": {}},
                {"type": "agent_execute", "name": "Execute NOP Agent", "params": {}}
            ]
        },
        {
            "id": "network-discovery",
            "name": "Network Discovery & Scan",
            "description": "Discover assets and perform comprehensive port and vulnerability scans",
            "category": "network",
            "steps": [
                {"type": "ping_test", "name": "Ping Sweep", "params": {}},
                {"type": "port_scan", "name": "Port Scan All Hosts", "params": {}},
                {"type": "vuln_scan", "name": "Vulnerability Scan", "params": {}}
            ]
        }
    ]
    
    return {"templates": templates}
