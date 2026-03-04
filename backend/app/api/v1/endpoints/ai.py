"""
AI Chat endpoints - NOP-native AI agent with tool access
Uses MiniMax API with function calling to execute NOP API operations
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import uuid
import json
import re
import os

router = APIRouter()

MINIMAX_URL = "https://api.minimax.io/v1/text/chatcompletion_v2"
MINIMAX_API_KEY = "sk-cp-chBYNqqOz4Mf6oWdB5myyC_SlkKuecP-rBSrEz_3HCslvk07FxlMB0zeq-WSF9A0LJORTBRwn5ZdOl_aBeM5Mczd9AdcQz-cJvPky30MVS4soqz5UXna4DM"
DEFAULT_MODEL = "MiniMax-M2.5"

# NOP API base URL (internal container access)
NOP_API_BASE = "http://localhost:12001"  # FastAPI runs on port 8000 internally


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    tool_calls: Optional[List[Dict]] = None


# System prompt describing NOP API surface
SYSTEM_PROMPT = """You are an AI assistant for the NOP (Network Operations Platform). You help users manage network operations by calling NOP API endpoints.

Available NOP API endpoints (all are GET unless specified):

## Assets
- GET /api/v1/assets/ - List all assets with pagination
- GET /api/v1/assets/online - Get online assets (IP, hostname, status)
- GET /api/v1/assets/stats - Asset statistics
- GET /api/v1/assets/{asset_id} - Get specific asset details
- POST /api/v1/assets/ - Create new asset

## Discovery/Scanning
- GET /api/v1/discovery/status - Discovery service status
- POST /api/v1/discovery/scan - Start network discovery scan
  Body: {"network": "10.10.10.0/24", "scan_type": "basic|comprehensive|ping_only", "ports": "1-1000"}
- POST /api/v1/discovery/scan/host - Scan individual host
  Body: {"host": "10.10.10.100", "scan_type": "comprehensive", "ports": "1-65535"}
- POST /api/v1/discovery/ping/{host} - Ping a host
- POST /api/v1/discovery/port-scan/{host} - Port scan a host

## Scans
- GET /api/v1/scans/ - List scans
- POST /api/v1/scans/{scan_id}/port-scan - Run port scan
  Body: {"host": "10.10.10.100", "scanType": "quick|standard|full", "technique": "connect"}
- POST /api/v1/scans/{scan_id}/version-detection - Service version detection

## Routes (Network Routing)
- GET /api/v1/routes - Get routing tables from all CTs
- POST /api/v1/routes/add - Add a route
  Body: {"host": "CT102", "dest": "10.0.0.0/8", "gateway": "10.10.10.1", "iface": "eth0"}
- DELETE /api/v1/routes/delete - Delete a route
  Body: {"host": "CT102", "dest": "10.0.0.0/8"}
- POST /api/v1/routes/default-gateway - Change default gateway
  Body: {"host": "CT102", "gateway": "10.10.10.1"}

## Traffic Analysis
- GET /api/v1/traffic/interfaces - Network interfaces
- GET /api/v1/traffic/flows - Traffic flows
- GET /api/v1/traffic/stats - Traffic statistics
- POST /api/v1/traffic/ping - Ping test
- POST /api/v1/traffic/start-capture - Start packet capture
- POST /api/v1/traffic/stop-capture - Stop packet capture

## Access/Remote
- POST /api/v1/access/test/ssh - Test SSH connection
  Body: {"host": "10.10.10.100", "port": 22}
- POST /api/v1/access/execute/ssh - Execute command via SSH
  Body: {"host": "10.10.10.100", "command": "uptime"}
- POST /api/v1/access/system-info - Get system info via SSH
  Body: {"host": "10.10.10.100"}

## Agents
- GET /api/v1/agents/ - List C2 agents
- POST /api/v1/agents/ - Create new agent
- GET /api/v1/agents/{agent_id} - Get agent details
- POST /api/v1/agents/{agent_id}/terminate - Terminate agent
- POST /api/v1/agents/{agent_id}/kill - Kill agent

## Vulnerabilities
- POST /api/v1/vulnerabilities/lookup-cve - Lookup CVE details
  Body: {"cve_id": "CVE-2021-44228"}
- POST /api/v1/vulnerabilities/exploit/execute - Run exploit

## Health
- GET /api/v1/health/ - System health
- GET /api/v1/health/cts - CT health status

## Dashboard
- GET /api/v1/dashboard/metrics - Dashboard metrics
- GET /api/v1/dashboard/top-talkers - Top network talkers
- GET /api/v1/dashboard/recent-activity - Recent activity

When a user asks you to perform an action:
1. Determine which NOP API endpoint(s) to call
2. Use the appropriate tool function
3. Interpret the results and provide a clear response

Be concise and actionable in your responses. If a tool returns an error, explain what went wrong and suggest alternatives."""


# Tool definitions for MiniMax function calling
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "nop_api_request",
            "description": "Make a request to the NOP API",
            "parameters": {
                "type": "object",
                "properties": {
                    "method": {
                        "type": "string",
                        "enum": ["GET", "POST", "PUT", "DELETE"],
                        "description": "HTTP method"
                    },
                    "endpoint": {
                        "type": "string",
                        "description": "API endpoint path (e.g., /api/v1/assets/)"
                    },
                    "body": {
                        "type": "object",
                        "description": "Request body for POST/PUT requests"
                    }
                },
                "required": ["method", "endpoint"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_assets",
            "description": "Get list of assets/hosts from NOP",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_online_assets",
            "description": "Get online assets with IP and hostname",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_routes",
            "description": "Get routing tables from all CTs",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_route",
            "description": "Add a route on a CT",
            "parameters": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "description": "Target CT (e.g., CT102)"},
                    "dest": {"type": "string", "description": "Destination CIDR (e.g., 10.0.0.0/8)"},
                    "gateway": {"type": "string", "description": "Gateway IP"},
                    "iface": {"type": "string", "description": "Interface (optional)"}
                },
                "required": ["host", "dest", "gateway"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_route",
            "description": "Delete a route on a CT",
            "parameters": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "description": "Target CT (e.g., CT102)"},
                    "dest": {"type": "string", "description": "Destination CIDR to delete"}
                },
                "required": ["host", "dest"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "change_default_gateway",
            "description": "Change default gateway on a CT",
            "parameters": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "description": "Target CT (e.g., CT102)"},
                    "gateway": {"type": "string", "description": "New gateway IP"}
                },
                "required": ["host", "gateway"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "start_discovery_scan",
            "description": "Start a network discovery scan",
            "parameters": {
                "type": "object",
                "properties": {
                    "network": {"type": "string", "description": "Network to scan (e.g., 10.10.10.0/24)"},
                    "scan_type": {"type": "string", "enum": ["basic", "comprehensive", "ping_only"], "default": "basic"},
                    "ports": {"type": "string", "default": "1-1000"}
                },
                "required": ["network"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "scan_host",
            "description": "Scan a specific host",
            "parameters": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "description": "Host IP to scan"},
                    "scan_type": {"type": "string", "default": "comprehensive"},
                    "ports": {"type": "string", "default": "1-65535"}
                },
                "required": ["host"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "ping_host",
            "description": "Ping a host",
            "parameters": {
                "type": "object",
                "properties": {
                    "host": {"type": "string", "description": "Host IP to ping"}
                },
                "required": ["host"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_health",
            "description": "Get system health status",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_dashboard_metrics",
            "description": "Get dashboard metrics",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]


async def execute_tool(tool_name: str, tool_args: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a NOP tool and return results"""
    
    async with httpx.AsyncClient(base_url=NOP_API_BASE, timeout=30.0) as client:
        try:
            if tool_name == "nop_api_request":
                method = tool_args.get("method", "GET")
                endpoint = tool_args.get("endpoint", "")
                body = tool_args.get("body")
                
                if method == "GET":
                    r = await client.get(endpoint)
                elif method == "POST":
                    r = await client.post(endpoint, json=body)
                elif method == "PUT":
                    r = await client.put(endpoint, json=body)
                elif method == "DELETE":
                    r = await client.delete(endpoint, params=body)
                else:
                    return {"error": f"Unknown method: {method}"}
                
                return {"status": r.status_code, "data": r.json() if r.content else None}
            
            elif tool_name == "get_assets":
                r = await client.get("/api/v1/assets/")
                return {"assets": r.json() if r.content else []}
            
            elif tool_name == "get_online_assets":
                r = await client.get("/api/v1/assets/online")
                return {"assets": r.json() if r.content else []}
            
            elif tool_name == "get_routes":
                r = await client.get("/api/v1/routes")
                return {"routes": r.json() if r.content else []}
            
            elif tool_name == "add_route":
                body = {
                    "host": tool_args["host"],
                    "dest": tool_args["dest"],
                    "gateway": tool_args["gateway"]
                }
                if tool_args.get("iface"):
                    body["iface"] = tool_args["iface"]
                r = await client.post("/api/v1/routes/add", json=body)
                return {"result": r.json() if r.content else None}
            
            elif tool_name == "delete_route":
                body = {
                    "host": tool_args["host"],
                    "dest": tool_args["dest"]
                }
                r = await client.request("DELETE", "/api/v1/routes/delete", json=body)
                return {"result": r.json() if r.content else None}
            
            elif tool_name == "change_default_gateway":
                body = {
                    "host": tool_args["host"],
                    "gateway": tool_args["gateway"]
                }
                r = await client.post("/api/v1/routes/default-gateway", json=body)
                return {"result": r.json() if r.content else None}
            
            elif tool_name == "start_discovery_scan":
                body = {
                    "network": tool_args["network"],
                    "scan_type": tool_args.get("scan_type", "basic"),
                    "ports": tool_args.get("ports", "1-1000")
                }
                r = await client.post("/api/v1/discovery/scan", json=body)
                return {"result": r.json() if r.content else None}
            
            elif tool_name == "scan_host":
                r = await client.post(f"/api/v1/discovery/port-scan/{tool_args['host']}")
                return {"result": r.json() if r.content else None}
            
            elif tool_name == "ping_host":
                r = await client.post(f"/api/v1/discovery/ping/{tool_args['host']}")
                return {"result": r.json() if r.content else None}
            
            elif tool_name == "get_health":
                r = await client.get("/api/v1/health/")
                return {"health": r.json() if r.content else None}
            
            elif tool_name == "get_dashboard_metrics":
                r = await client.get("/api/v1/dashboard/metrics")
                return {"metrics": r.json() if r.content else None}
            
            else:
                return {"error": f"Unknown tool: {tool_name}"}
                
        except Exception as e:
            return {"error": str(e)}


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI chat with tool calling capabilities.
    The AI can call NOP API endpoints to fulfill user requests.
    Loops until finish_reason is 'stop' to handle multi-step tool chains.
    """
    session_id = request.session_id or str(uuid.uuid4())
    
    # Build messages for MiniMax
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": request.message}
    ]
    
    headers = {
        "Authorization": f"Bearer {MINIMAX_API_KEY}",
        "Content-Type": "application/json"
    }
    
    tool_calls_made = []
    max_iterations = 10
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            for iteration in range(max_iterations):
                # Call MiniMax with tools
                payload = {
                    "model": DEFAULT_MODEL,
                    "messages": messages,
                    "tools": TOOLS,
                    "tool_choice": "auto",
                    "max_tokens": 2048
                }
                
                response = await client.post(MINIMAX_URL, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                choice = data.get("choices", [{}])[0]
                finish_reason = choice.get("finish_reason", "")
                assistant_message = choice.get("message", {})
                
                # Check if we need to execute tools
                if finish_reason == "tool_calls":
                    tool_calls = assistant_message.get("tool_calls", [])
                    
                    if not tool_calls:
                        # No actual tool calls but finish_reason says tool_calls
                        # Return the content we have
                        reply = assistant_message.get("content", "No response")
                        break
                    
                    # Execute all tools
                    tool_results = []
                    for tool_call in tool_calls:
                        tool_name = tool_call.get("function", {}).get("name", "")
                        tool_args_str = tool_call.get("function", {}).get("arguments", "{}")
                        try:
                            tool_args = json.loads(tool_args_str) if isinstance(tool_args_str, str) else tool_args_str
                        except:
                            tool_args = {}
                        
                        # Execute the tool
                        result = await execute_tool(tool_name, tool_args)
                        tool_results.append({
                            "tool_call_id": tool_call.get("id", ""),
                            "role": "tool",
                            "name": tool_name,
                            "content": json.dumps(result)
                        })
                        tool_calls_made.append({
                            "tool": tool_name,
                            "args": tool_args,
                            "result": result
                        })
                    
                    # Append assistant message with tool_calls to conversation
                    messages.append({
                        "role": "assistant",
                        "content": assistant_message.get("content", ""),
                        "tool_calls": tool_calls
                    })
                    
                    # Append tool results to conversation
                    for tr in tool_results:
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tr["tool_call_id"],
                            "content": tr["content"]
                        })
                    
                    # Continue to next iteration
                    continue
                
                elif finish_reason == "stop":
                    # Final text response
                    raw_reply = str(assistant_message.get("content", "No response"))
                    # MiniMax sometimes bleeds <minimax:tool_call> XML into content on "stop"
                    # Treat as implicit tool call and execute it
                    if "<minimax:tool_call>" in raw_reply:
                        invoke_match = re.search(
                            r'<invoke\s+name=["\'](\w+)["\']>(.*?)</invoke>',
                            raw_reply, re.DOTALL
                        )
                        if invoke_match and iteration < max_iterations - 1:
                            tool_name = invoke_match.group(1)
                            params_str = invoke_match.group(2)
                            tool_args = {}
                            for param in re.finditer(
                                r'<parameter\s+name=["\'](\w+)["\']>(.*?)</parameter>',
                                params_str, re.DOTALL
                            ):
                                tool_args[param.group(1)] = param.group(2).strip()
                            result = await execute_tool(tool_name, tool_args)
                            fake_call_id = f"bleed_fix_{iteration}"
                            messages.append({"role": "assistant", "content": raw_reply})
                            messages.append({"role": "tool", "tool_call_id": fake_call_id, "content": json.dumps(result)})
                            tool_calls_made.append({"tool": tool_name, "args": tool_args, "result": result})
                            continue
                        else:
                            reply = re.sub(r"<minimax:tool_call>.*?</minimax:tool_call>", "", raw_reply, flags=re.DOTALL).strip() or "Processed."
                    else:
                        reply = raw_reply
                    break
                
                else:
                    # Unknown finish_reason, return what we have
                    reply = assistant_message.get("content", f"Unexpected finish_reason: {finish_reason}")
                    break
            
            else:
                # Max iterations reached
                reply = "Maximum iterations reached. The conversation may be too complex."
            
            return ChatResponse(
                response=reply,
                session_id=session_id,
                tool_calls=tool_calls_made if tool_calls_made else None
            )
            
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"MiniMax error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
