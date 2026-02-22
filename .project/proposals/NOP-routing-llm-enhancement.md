# NOP Enhancement Proposal: Routing Control & LLM Agent Integration

**Date:** 2026-02-22  
**Status:** Draft → Ready for Implementation  
**Priority:** High  
**Author:** Falke (via OpenClaw)  

---

## Executive Summary

Extend NOP (Network Observatory Platform) with two major capabilities:

1. **Routing Table Control Module** - Dynamic route manipulation for network discovery and testing
2. **LLM Agent Integration** - Built-in chat interface with API connectivity for autonomous network operations

**Result:** NOP becomes an intelligent network operations center with AI-assisted discovery, testing, and automation.

---

## 1. Routing Control Module

### Problem Statement
Current NOP can observe traffic but cannot manipulate routing. We need to:
- Force traffic through specific gateways for path testing
- Inject temporary routes for discovery without affecting default connectivity
- Test multi-WAN failover scenarios
- Validate network segmentation (e.g., DMZ → ProcessBus routing)

### Proposed API Endpoints

```yaml
# Route Management
GET    /api/v1/routing/table              # Get full routing table
POST   /api/v1/routing/add                # Add temporary route
DELETE /api/v1/routing/remove/{id}        # Remove specific route
POST   /api/v1/routing/test               # Test route without applying

# Route Testing
POST   /api/v1/routing/traceroute         # Advanced traceroute with options
POST   /api/v1/routing/path-analyze       # Analyze path characteristics
POST   /api/v1/routing/gateway-test       # Test gateway connectivity
```

### Request/Response Examples

**Add Temporary Route:**
```json
POST /api/v1/routing/add
{
  "destination": "8.8.4.4/32",
  "gateway": "192.168.18.253",
  "interface": "br0",
  "metric": 100,
  "temporary": true,
  "ttl_seconds": 300
}

Response:
{
  "route_id": "route-uuid",
  "status": "added",
  "destination": "8.8.4.4/32",
  "gateway": "192.168.18.253",
  "expires_at": "2026-02-22T11:30:00Z"
}
```

**Test Route (No Changes):**
```json
POST /api/v1/routing/test
{
  "destination": "8.8.4.4",
  "via_gateway": "192.168.18.253",
  "test_type": "ping",  // ping, traceroute, tcp-connect
  "count": 3
}

Response:
{
  "test_id": "test-uuid",
  "success": false,
  "results": {
    "packets_sent": 3,
    "packets_received": 0,
    "hops": [
      {"hop": 1, "ip": "192.168.18.253", "status": "success", "rtt_ms": 0.7},
      {"hop": 2, "ip": null, "status": "timeout"}
    ],
    "conclusion": "Gateway reachable but not forwarding"
  }
}
```

**Advanced Traceroute:**
```json
POST /api/v1/routing/traceroute
{
  "target": "8.8.8.8",
  "protocol": "icmp",  // icmp, tcp, udp
  "port": 80,          // for tcp/udp
  "source_ip": "192.168.18.245",
  "max_hops": 30,
  "timeout_per_hop": 2,
  "parallel_probes": true
}
```

### Implementation Details

**Backend Changes:**
```python
# app/api/v1/endpoints/routing.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, IPvAnyAddress
import subprocess
import ipaddress

router = APIRouter()

class RouteAddRequest(BaseModel):
    destination: str  # CIDR notation
    gateway: IPvAnyAddress
    interface: str = None
    metric: int = 100
    temporary: bool = True
    ttl_seconds: int = 300

@router.post("/add")
async def add_route(request: RouteAddRequest):
    """Add a temporary route with auto-cleanup"""
    try:
        # Validate CIDR
        net = ipaddress.ip_network(request.destination, strict=False)
        
        # Build ip route command
        cmd = ["ip", "route", "add", str(net), "via", str(request.gateway)]
        if request.interface:
            cmd.extend(["dev", request.interface])
        if request.metric:
            cmd.extend(["metric", str(request.metric)])
        
        # Execute
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            route_id = str(uuid.uuid4())
            
            # Schedule cleanup if temporary
            if request.temporary:
                asyncio.create_task(
                    cleanup_route(route_id, request.destination, request.ttl_seconds)
                )
            
            return {
                "route_id": route_id,
                "status": "added",
                "command": " ".join(cmd),
                "expires_at": datetime.utcnow() + timedelta(seconds=request.ttl_seconds) if request.temporary else None
            }
        else:
            raise HTTPException(400, f"Failed to add route: {result.stderr}")
            
    except Exception as e:
        raise HTTPException(500, str(e))

async def cleanup_route(route_id: str, destination: str, delay: int):
    """Auto-remove temporary routes"""
    await asyncio.sleep(delay)
    subprocess.run(["ip", "route", "del", destination], capture_output=True)
```

**Frontend (Dashboard):**
- Route table visualization
- Add route form with validation
- Active routes list with expiration countdown
- Test results display with path visualization

---

## 2. LLM Agent Integration

### Problem Statement
NOP has powerful APIs but requires manual API calls. We want:
- Natural language interface to NOP capabilities
- AI-assisted network discovery and analysis
- Automated workflow execution via chat
- Integration with external LLM APIs (MiniMax, OpenAI, etc.)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NOP DASHBOARD                                │
│                                                                  │
│  ┌─────────────┐  ┌──────────────────────────────────────┐     │
│  │  CHAT UI    │  │       LLM AGENT CONTROLLER           │     │
│  │             │  │                                      │     │
│  │ User Input  │→ │ - Intent Recognition                 │     │
│  │ System Logs │  │ - Function Calling                   │     │
│  │ API Results │  │ - Context Management                 │     │
│  └─────────────┘  │ - Response Formatting                │     │
│                   └──────────────┬───────────────────────┘     │
└──────────────────────────────────┼─────────────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   LLM PROVIDER   │  │   NOP INTERNAL   │  │   EXECUTION      │
│                  │  │                  │  │                  │
│ - MiniMax API    │  │ - Asset DB       │  │ - API Calls      │
│ - OpenAI API     │  │ - Traffic Data   │  │ - Route Changes  │
│ - Local Ollama   │  │ - Discovery      │  │ - Scans          │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Proposed API Endpoints

```yaml
# LLM Configuration
GET    /api/v1/llm/config                 # Get LLM configuration
PUT    /api/v1/llm/config                 # Update LLM settings
POST   /api/v1/llm/test                   # Test LLM connection

# Chat Interface
POST   /api/v1/llm/chat                   # Send message to LLM
GET    /api/v1/llm/chat/{session_id}      # Get chat history
DELETE /api/v1/llm/chat/{session_id}      # Clear chat session

# Function Results (for LLM context)
GET    /api/v1/llm/context                # Get available functions/context
POST   /api/v1/llm/execute-function       # Execute function from LLM
```

### LLM Configuration Schema

```json
{
  "provider": "minimax",
  "api_endpoint": "https://api.minimax.io/anthropic",
  "api_key": "${MINIMAX_API_KEY}",
  "model": "MiniMax-M2.5",
  "max_tokens": 4096,
  "temperature": 0.7,
  "system_prompt": "You are a network operations assistant...",
  "available_functions": [
    "list_assets",
    "start_discovery",
    "add_route",
    "start_scan",
    "get_traffic_stats",
    "execute_workflow"
  ],
  "context_window": {
    "max_messages": 20,
    "include_network_state": true,
    "include_recent_events": true
  }
}
```

### Function Calling Schema

```json
{
  "name": "list_assets",
  "description": "List discovered network assets with optional filtering",
  "parameters": {
    "type": "object",
    "properties": {
      "search": {
        "type": "string",
        "description": "IP or hostname search query"
      },
      "status": {
        "type": "string",
        "enum": ["online", "offline", "all"]
      },
      "limit": {
        "type": "integer",
        "default": 50
      }
    }
  }
}
```

### Chat Flow Example

**User:** "Find all devices in the 192.168.18.x range that are sending multicast traffic"

**LLM Processing:**
1. Intent: `analyze_traffic_patterns`
2. Function calls:
   - `get_multicast_groups()`
   - `list_assets(search="192.168.18.")`
3. Analysis: Cross-reference sources

**LLM Response:**
"Found 10 DMZ devices sending to ProcessBus multicast:
- 192.168.18.1: 787 packets to 239.0.171.0/19
- 192.168.18.2: 3405 packets...

These devices should not have L2 access to ProcessBus. Recommend checking bridge configuration."

**User:** "Add a route to test 18.253 gateway"

**LLM:**
"I'll add a temporary route to 8.8.4.4 via 192.168.18.253 for testing..."
→ Calls `add_route()` with temporary=true, ttl=300

### Implementation Details

**Backend - LLM Controller:**
```python
# app/api/v1/endpoints/llm.py

from anthropic import Anthropic
import json

class LLMAgentController:
    def __init__(self, config: LLMConfig):
        self.client = Anthropic(
            api_key=config.api_key,
            base_url=config.api_endpoint
        )
        self.model = config.model
        self.functions = self._load_functions()
    
    async def chat(self, message: str, context: ChatContext) -> ChatResponse:
        # Build system message with available functions
        system_msg = self._build_system_prompt(context)
        
        # Call LLM
        response = self.client.messages.create(
            model=self.model,
            system=system_msg,
            messages=context.history + [{"role": "user", "content": message}],
            tools=self.functions,
            max_tokens=4096
        )
        
        # Handle function calls
        if response.stop_reason == "tool_use":
            results = await self._execute_functions(response.tool_calls)
            # Send results back to LLM for final response
            return await self._follow_up(response, results)
        
        return ChatResponse(
            message=response.content[0].text,
            actions_taken=[],
            context_used=context.summary()
        )
    
    def _load_functions(self) -> list:
        """Load available NOP functions for LLM"""
        return [
            {
                "name": "list_assets",
                "description": "List network assets",
                "input_schema": {...}
            },
            {
                "name": "add_route", 
                "description": "Add temporary routing rule",
                "input_schema": {...}
            },
            # ... other functions
        ]
```

**Frontend - Chat UI:**
- Chat interface in NOP dashboard
- Message history with context
- Function call visualization (show which APIs were called)
- Real-time streaming responses
- Code block formatting for commands

---

## Integration Points

### 1. Routing + LLM Example

**User:** "Route traffic through 18.253 to see if it reaches the ship network"

**LLM Action Sequence:**
```python
# 1. Test current path
result1 = await test_route(destination="8.8.4.4", via_gateway="192.168.18.253")

# 2. Add temporary route  
route = await add_route(
    destination="8.8.4.4/32",
    gateway="192.168.18.253",
    temporary=True,
    ttl=300
)

# 3. Test new path
result2 = await traceroute(target="8.8.4.4", max_hops=5)

# 4. Cleanup
await remove_route(route.id)

# 5. Report
return f"Test complete. 18.253 is {'working' if result2.success else 'not forwarding'}."
```

### 2. Discovery + LLM Example

**User:** "Find the bridge device between DMZ and ProcessBus"

**LLM Action Sequence:**
```python
# 1. Get multicast groups
mcast = await get_multicast_groups()

# 2. Get L2 entities
entities = await get_l2_entities()

# 3. Cross-reference
bridge = find_mac_in_multiple_subnets(entities)

return f"Bridge device: {bridge.mac} with IPs {bridge.ips}"
```

---

## Security Considerations

### Route Control
- ✅ Only allow temporary routes (auto-cleanup)
- ✅ Validate destination (no 0.0.0.0/0 override)
- ✅ Log all route changes with user attribution
- ✅ Require confirmation for non-temporary routes
- ✅ Rate limiting on route changes

### LLM Integration
- ✅ API key storage in secure vault (not env vars)
- ✅ Function whitelist (LLM can only call safe APIs)
- ✅ Confirmation for destructive operations
- ✅ Context isolation per user session
- ✅ No raw command execution (only structured APIs)

---

## Implementation Phases

### Phase 1: Routing Module (Week 1)
- [ ] Backend API endpoints for route management
- [ ] Route table UI in dashboard
- [ ] Temporary route auto-cleanup
- [ ] Traceroute enhancements

### Phase 2: LLM Foundation (Week 2)
- [ ] LLM configuration API
- [ ] Basic chat interface
- [ ] Function schema definition
- [ ] MiniMax API integration

### Phase 3: LLM Functions (Week 3)
- [ ] Asset query functions
- [ ] Traffic analysis functions
- [ ] Route control functions
- [ ] Scan/discovery functions

### Phase 4: Advanced Features (Week 4)
- [ ] Workflow automation via chat
- [ ] Multi-turn context
- [ ] Function chaining
- [ ] Custom function registration

---

## Files to Modify

```
backend/
├── app/
│   ├── api/v1/router.py          # Add routing/llm routers
│   ├── api/v1/endpoints/
│   │   ├── routing.py            # NEW: Route management
│   │   └── llm.py                # NEW: LLM integration
│   ├── core/
│   │   ├── config.py             # Add LLM config
│   │   └── llm_controller.py     # NEW: LLM logic
│   └── services/
│       ├── route_service.py      # NEW: Route operations
│       └── llm_service.py        # NEW: LLM operations
├── requirements.txt              # Add anthropic, etc.
└── docker-compose.yml            # Add env vars

frontend/
├── src/
│   ├── components/
│   │   ├── RoutingPanel.tsx      # NEW: Route management UI
│   │   └── ChatInterface.tsx     # NEW: LLM chat UI
│   └── api/
│       ├── routing.ts            # NEW: Routing API client
│       └── llm.ts                # NEW: LLM API client
```

---

## Success Metrics

- [ ] Can add temporary route via API in <5 seconds
- [ ] Route auto-cleans after TTL expires
- [ ] Can test route without affecting default connectivity
- [ ] LLM can successfully list assets via chat
- [ ] LLM can add temporary route via chat
- [ ] Chat maintains context across 5+ messages
- [ ] Function calls execute in <2 seconds

---

## Related Proposals

- Self-Healing Architecture (watchdog, config rollback)
- Knowledge Enrichment Pipeline (Firecrawl + Obsidian)
- Telegram-Obsidian Ingestion (message capture)

**Note:** LLM integration could also ingest chat messages for the Knowledge Enrichment Pipeline.

---

## Next Steps

1. **Review this proposal** - Any changes or additions?
2. **Git commit** - Save to dev/NOP repository
3. **Create implementation branch** - `feature/routing-and-llm`
4. **Start Phase 1** - Routing module backend

Ready to commit this to the NOP repo?

[F] // ◈
