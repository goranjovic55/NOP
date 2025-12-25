import socket
import logging
import threading
import asyncio
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

class GuacamoleTunnel:
    def __init__(self, guacd_host: str, guacd_port: int):
        self.guacd_host = guacd_host
        self.guacd_port = guacd_port
        self.socket = None
        self.websocket = None
        self.connected = False
        self.read_lock = threading.Lock()
        self.write_lock = threading.Lock()

    async def connect(self, websocket: WebSocket, protocol: str, connection_args: dict):
        """
        Connect to guacd and establish the tunnel
        """
        self.websocket = websocket
        
        try:
            # Connect to guacd
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.guacd_host, self.guacd_port))
            self.socket.setblocking(False)
            
            # 1. Select protocol
            self._send_instruction("select", [protocol])
            
            # 2. Handshake (args)
            # Receive "args" instruction from guacd
            instruction = await self._read_instruction_async()
            if not instruction or instruction[0] != "args":
                logger.error(f"Expected args, got {instruction}")
                return False
                
            # Prepare args values based on what guacd requested
            arg_names = instruction[1:]
            arg_values = []
            for name in arg_names:
                arg_values.append(connection_args.get(name, ""))
                
            # Send "size" instruction (screen size)
            # Default to 1024x768, client should update later
            self._send_instruction("size", ["1024", "768", "96"])
            
            # Send "audio" instruction
            self._send_instruction("audio", ["audio/L16", "rate=44100", "channels=2"])
            
            # Send "video" instruction
            self._send_instruction("video", ["video/openh264", "video/vp8", "image/jpeg", "image/png", "image/webp"])
            
            # Send "image" instruction
            self._send_instruction("image", ["image/png", "image/jpeg", "image/webp"])
            
            # Send "connect" instruction with args
            self._send_instruction("connect", arg_values)
            
            # 3. Wait for "ready"
            instruction = await self._read_instruction_async()
            if not instruction or instruction[0] != "ready":
                logger.error(f"Expected ready, got {instruction}")
                return False
                
            # Forward ready to websocket so client knows we are connected
            # Reconstruct the ready instruction
            ready_content = f"{len(instruction[0])}.{instruction[0]}"
            for arg in instruction[1:]:
                ready_content += f",{len(arg)}.{arg}"
            ready_content += ";"
            await self.websocket.send_text(ready_content)
                
            self.connected = True
            return True
            
        except Exception as e:
            logger.error(f"Guacamole connection failed: {e}")
            if self.socket:
                self.socket.close()
            return False

    async def run(self):
        """
        Run the tunnel loop
        """
        if not self.connected:
            return

        try:
            loop = asyncio.get_event_loop()
            
            while self.connected:
                # Create tasks
                ws_task = asyncio.create_task(self.websocket.receive_text())
                sock_task = loop.sock_recv(self.socket, 4096)
                
                done, pending = await asyncio.wait(
                    [ws_task, sock_task],
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                for task in done:
                    if task == ws_task:
                        # Data from browser -> guacd
                        try:
                            data = task.result()
                            # The client sends full instructions, just forward them
                            # But we need to ensure they are encoded as bytes for socket
                            await loop.sock_sendall(self.socket, data.encode('utf-8'))
                        except WebSocketDisconnect:
                            self.connected = False
                            break
                    elif task == sock_task:
                        # Data from guacd -> browser
                        data = task.result()
                        if not data:
                            self.connected = False
                            break
                        # Forward to websocket
                        await self.websocket.send_text(data.decode('utf-8', errors='ignore'))
                
                # Cancel pending tasks
                for task in pending:
                    task.cancel()
                    
        except Exception as e:
            logger.error(f"Tunnel error: {e}")
        finally:
            self.close()

    def close(self):
        self.connected = False
        if self.socket:
            try:
                self.socket.close()
            except:
                pass

    def _send_instruction(self, opcode, args):
        """Send a Guacamole instruction"""
        content = f"{len(opcode)}.{opcode}"
        for arg in args:
            arg = str(arg)
            content += f",{len(arg)}.{arg}"
        content += ";"
        self.socket.sendall(content.encode('utf-8'))

    async def _read_instruction_async(self):
        """Read a Guacamole instruction asynchronously"""
        loop = asyncio.get_event_loop()
        instruction = ""
        while True:
            chunk = await loop.sock_recv(self.socket, 1)
            if not chunk:
                return None
            char = chunk.decode('utf-8')
            instruction += char
            if char == ';':
                break
        
        # Parse instruction
        parts = []
        current_pos = 0
        while current_pos < len(instruction) - 1:
            # Find length
            dot_pos = instruction.find('.', current_pos)
            if dot_pos == -1:
                break
            length = int(instruction[current_pos:dot_pos])
            value = instruction[dot_pos+1:dot_pos+1+length]
            parts.append(value)
            current_pos = dot_pos + 1 + length + 1 # +1 for comma or semicolon
            
        return parts
