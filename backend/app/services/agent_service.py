"""
Agent service for C2 management
"""

import secrets
import base64
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.models.agent import Agent, AgentType, AgentStatus
from app.schemas.agent import AgentCreate, AgentUpdate


class AgentService:
    """Service for managing agents"""
    
    @staticmethod
    def generate_auth_token() -> str:
        """Generate a secure authentication token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    async def create_agent(db: AsyncSession, agent_data: AgentCreate) -> Agent:
        """Create a new agent"""
        auth_token = AgentService.generate_auth_token()
        
        agent = Agent(
            name=agent_data.name,
            description=agent_data.description,
            agent_type=agent_data.agent_type,
            connection_url=agent_data.connection_url,
            auth_token=auth_token,
            capabilities=agent_data.capabilities,
            metadata=agent_data.metadata or {},
            status=AgentStatus.DISCONNECTED
        )
        
        db.add(agent)
        await db.commit()
        await db.refresh(agent)
        
        return agent
    
    @staticmethod
    async def get_agent(db: AsyncSession, agent_id: UUID) -> Optional[Agent]:
        """Get agent by ID"""
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_agents(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Agent]:
        """Get all agents"""
        result = await db.execute(select(Agent).offset(skip).limit(limit))
        return list(result.scalars().all())
    
    @staticmethod
    async def update_agent(db: AsyncSession, agent_id: UUID, agent_data: AgentUpdate) -> Optional[Agent]:
        """Update agent"""
        agent = await AgentService.get_agent(db, agent_id)
        if not agent:
            return None
        
        update_data = agent_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agent, field, value)
        
        await db.commit()
        await db.refresh(agent)
        
        return agent
    
    @staticmethod
    async def delete_agent(db: AsyncSession, agent_id: UUID) -> bool:
        """Delete agent"""
        agent = await AgentService.get_agent(db, agent_id)
        if not agent:
            return False
        
        await db.delete(agent)
        await db.commit()
        
        return True
    
    @staticmethod
    async def update_agent_status(
        db: AsyncSession, 
        agent_id: UUID, 
        status: AgentStatus,
        update_last_seen: bool = True
    ) -> Optional[Agent]:
        """Update agent status and last seen time"""
        agent = await AgentService.get_agent(db, agent_id)
        if not agent:
            return None
        
        agent.status = status
        if update_last_seen:
            agent.last_seen = datetime.utcnow()
        
        if status == AgentStatus.ONLINE and not agent.connected_at:
            agent.connected_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(agent)
        
        return agent
    
    @staticmethod
    def generate_python_agent(agent: Agent) -> str:
        """Generate Python agent script"""
        template = f'''#!/usr/bin/env python3
"""
NOP Agent - {agent.name}
Generated: {datetime.utcnow().isoformat()}
Type: Python
"""

import asyncio
import websockets
import json
import platform
import socket
import subprocess
from datetime import datetime

# Agent Configuration
AGENT_ID = "{agent.id}"
AGENT_NAME = "{agent.name}"
AUTH_TOKEN = "{agent.auth_token}"
SERVER_URL = "{agent.connection_url}"
CAPABILITIES = {json.dumps(agent.capabilities, indent=4)}

class NOPAgent:
    def __init__(self):
        self.agent_id = AGENT_ID
        self.agent_name = AGENT_NAME
        self.auth_token = AUTH_TOKEN
        self.server_url = SERVER_URL
        self.capabilities = CAPABILITIES
        self.ws = None
        
    async def connect(self):
        """Connect to NOP server"""
        try:
            print(f"[{{datetime.now()}}] Connecting to {{self.server_url}}...")
            async with websockets.connect(
                self.server_url,
                extra_headers={{"Authorization": f"Bearer {{self.auth_token}}"}}
            ) as websocket:
                self.ws = websocket
                print(f"[{{datetime.now()}}] Connected successfully!")
                
                # Send registration
                await self.register()
                
                # Start heartbeat and message handler
                await asyncio.gather(
                    self.heartbeat(),
                    self.message_handler()
                )
        except Exception as e:
            print(f"[{{datetime.now()}}] Connection error: {{e}}")
            await asyncio.sleep(5)
            
    async def register(self):
        """Register with server"""
        registration = {{
            "type": "register",
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "capabilities": self.capabilities,
            "system_info": {{
                "hostname": socket.gethostname(),
                "platform": platform.system(),
                "version": platform.version()
            }}
        }}
        await self.ws.send(json.dumps(registration))
        print(f"[{{datetime.now()}}] Registered with server")
        
    async def heartbeat(self):
        """Send periodic heartbeat"""
        while True:
            try:
                await asyncio.sleep(30)
                heartbeat = {{
                    "type": "heartbeat",
                    "agent_id": self.agent_id,
                    "timestamp": datetime.utcnow().isoformat()
                }}
                await self.ws.send(json.dumps(heartbeat))
            except Exception as e:
                print(f"[{{datetime.now()}}] Heartbeat error: {{e}}")
                break
                
    async def message_handler(self):
        """Handle incoming messages"""
        async for message in self.ws:
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                
                if msg_type == "command":
                    await self.handle_command(data)
                elif msg_type == "ping":
                    await self.send_pong()
            except Exception as e:
                print(f"[{{datetime.now()}}] Message handling error: {{e}}")
                
    async def handle_command(self, data):
        """Execute command based on capabilities"""
        command = data.get("command")
        
        if command == "discover_assets" and self.capabilities.get("assets"):
            await self.discover_assets()
        elif command == "capture_traffic" and self.capabilities.get("traffic"):
            await self.capture_traffic()
        elif command == "run_scan" and self.capabilities.get("scans"):
            await self.run_scan(data.get("target"))
        else:
            print(f"[{{datetime.now()}}] Command not supported: {{command}}")
            
    async def discover_assets(self):
        """Discover network assets"""
        # Placeholder - implement actual discovery
        result = {{
            "type": "assets_discovered",
            "agent_id": self.agent_id,
            "assets": [],
            "timestamp": datetime.utcnow().isoformat()
        }}
        await self.ws.send(json.dumps(result))
        
    async def capture_traffic(self):
        """Capture network traffic"""
        # Placeholder - implement actual capture
        pass
        
    async def run_scan(self, target):
        """Run security scan"""
        # Placeholder - implement actual scan
        pass
        
    async def send_pong(self):
        """Respond to ping"""
        pong = {{
            "type": "pong",
            "agent_id": self.agent_id,
            "timestamp": datetime.utcnow().isoformat()
        }}
        await self.ws.send(json.dumps(pong))
        
    async def run(self):
        """Main run loop"""
        while True:
            try:
                await self.connect()
            except KeyboardInterrupt:
                print(f"[{{datetime.now()}}] Agent stopped by user")
                break
            except Exception as e:
                print(f"[{{datetime.now()}}] Error: {{e}}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    agent = NOPAgent()
    asyncio.run(agent.run())
'''
        return template
    
    @staticmethod
    def generate_c_agent(agent: Agent) -> str:
        """Generate C agent stub"""
        return f'''/*
 * NOP Agent - {agent.name}
 * Generated: {datetime.utcnow().isoformat()}
 * Type: C Binary
 * 
 * Compile: gcc -o agent agent.c -lwebsockets -ljson-c
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define AGENT_ID "{agent.id}"
#define AGENT_NAME "{agent.name}"
#define AUTH_TOKEN "{agent.auth_token}"
#define SERVER_URL "{agent.connection_url}"

int main() {{
    printf("NOP Agent - %s\\n", AGENT_NAME);
    printf("Agent ID: %s\\n", AGENT_ID);
    printf("Server: %s\\n", SERVER_URL);
    printf("\\nC agent stub - implement WebSocket client\\n");
    return 0;
}}
'''
    
    @staticmethod
    def generate_asm_agent(agent: Agent) -> str:
        """Generate ASM agent stub"""
        return f'''; NOP Agent - {agent.name}
; Generated: {datetime.utcnow().isoformat()}
; Type: ASM Binary
; 
; Assemble: nasm -f elf64 agent.asm && ld -o agent agent.o

section .data
    agent_name db "{agent.name}", 0
    agent_id db "{agent.id}", 0
    auth_token db "{agent.auth_token}", 0
    server_url db "{agent.connection_url}", 0
    msg db "NOP ASM Agent stub - implement connection logic", 10, 0

section .text
    global _start

_start:
    ; Write message
    mov rax, 1          ; sys_write
    mov rdi, 1          ; stdout
    mov rsi, msg
    mov rdx, 50
    syscall
    
    ; Exit
    mov rax, 60         ; sys_exit
    xor rdi, rdi
    syscall
'''
