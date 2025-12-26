import socket
import logging
import threading
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
import time

# Configure detailed logging for Guacamole tunnel
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class GuacamoleTunnel:
    def __init__(self, guacd_host: str, guacd_port: int):
        self.guacd_host = guacd_host
        self.guacd_port = guacd_port
        self.socket = None
        self.websocket = None
        self.connected = False
        self.read_lock = threading.Lock()
        self.write_lock = threading.Lock()
        self.bytes_sent = 0
        self.bytes_received = 0

    def _sanitize_args_for_log(self, args: dict) -> dict:
        """Sanitize connection arguments for logging (hide passwords)"""
        sanitized = args.copy()
        if 'password' in sanitized:
            sanitized['password'] = '***' if sanitized['password'] else '(empty)'
        return sanitized

    async def connect(self, websocket: WebSocket, protocol: str, connection_args: dict):
        """
        Connect to guacd and establish the tunnel
        """
        self.websocket = websocket
        connection_start = time.time()
        
        logger.info(f"[GUACAMOLE] Starting connection to guacd at {self.guacd_host}:{self.guacd_port}")
        logger.info(f"[GUACAMOLE] Protocol: {protocol}")
        logger.info(f"[GUACAMOLE] Connection args: {self._sanitize_args_for_log(connection_args)}")
        
        try:
            # Connect to guacd
            logger.debug(f"[GUACAMOLE] Creating socket connection...")
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(10)  # Set initial timeout for connection
            
            try:
                self.socket.connect((self.guacd_host, self.guacd_port))
                logger.info(f"[GUACAMOLE] Successfully connected to guacd at {self.guacd_host}:{self.guacd_port}")
            except socket.error as e:
                logger.error(f"[GUACAMOLE] Failed to connect to guacd: {e}")
                raise
            
            self.socket.setblocking(False)
            
            # 1. Select protocol
            logger.debug(f"[GUACAMOLE] Step 1: Sending 'select' instruction with protocol: {protocol}")
            self._send_instruction("select", [protocol])
            
            # 2. Handshake (args)
            # Receive "args" instruction from guacd
            logger.debug(f"[GUACAMOLE] Step 2: Waiting for 'args' instruction from guacd...")
            instruction = await self._read_instruction_async()
            logger.debug(f"[GUACAMOLE] Received instruction: {instruction}")
            
            if not instruction or instruction[0] != "args":
                logger.error(f"[GUACAMOLE] Expected 'args' instruction, got: {instruction}")
                return False
                
            # Prepare args values based on what guacd requested
            arg_names = instruction[1:]
            arg_values = []
            logger.debug(f"[GUACAMOLE] Guacd requested args: {arg_names}")
            for name in arg_names:
                value = connection_args.get(name, "")
                arg_values.append(value)
                # Don't log passwords
                if name not in ['password']:
                    logger.debug(f"[GUACAMOLE]   {name}: {value}")
                else:
                    logger.debug(f"[GUACAMOLE]   {name}: {'***' if value else '(empty)'}")
                
            # Send "size" instruction (screen size)
            # Default to 1024x768, client should update later
            screen_width = connection_args.get("width", "1024")
            screen_height = connection_args.get("height", "768")
            screen_dpi = connection_args.get("dpi", "96")
            logger.debug(f"[GUACAMOLE] Step 3: Sending 'size' instruction: {screen_width}x{screen_height}@{screen_dpi}")
            self._send_instruction("size", [screen_width, screen_height, screen_dpi])
            
            # Send "audio" instruction
            logger.debug(f"[GUACAMOLE] Step 4: Sending 'audio' instruction")
            self._send_instruction("audio", ["audio/L16", "rate=44100", "channels=2"])
            
            # Send "video" instruction
            logger.debug(f"[GUACAMOLE] Step 5: Sending 'video' instruction")
            self._send_instruction("video", ["video/openh264", "video/vp8", "image/jpeg", "image/png", "image/webp"])
            
            # Send "image" instruction
            logger.debug(f"[GUACAMOLE] Step 6: Sending 'image' instruction")
            self._send_instruction("image", ["image/png", "image/jpeg", "image/webp"])
            
            # Send "connect" instruction with args
            logger.debug(f"[GUACAMOLE] Step 7: Sending 'connect' instruction with {len(arg_values)} arguments")
            self._send_instruction("connect", arg_values)
            
            # 3. Wait for "ready"
            logger.debug(f"[GUACAMOLE] Step 8: Waiting for 'ready' instruction from guacd...")
            instruction = await self._read_instruction_async()
            logger.debug(f"[GUACAMOLE] Received instruction: {instruction}")
            
            if not instruction or instruction[0] != "ready":
                logger.error(f"[GUACAMOLE] Expected 'ready' instruction, got: {instruction}")
                logger.error(f"[GUACAMOLE] Connection to {protocol}://{connection_args.get('hostname')}:{connection_args.get('port')} FAILED")
                return False
                
            # Forward ready to websocket so client knows we are connected
            # Reconstruct the ready instruction
            ready_content = f"{len(instruction[0])}.{instruction[0]}"
            for arg in instruction[1:]:
                ready_content += f",{len(arg)}.{arg}"
            ready_content += ";"
            
            logger.debug(f"[GUACAMOLE] Step 9: Forwarding 'ready' instruction to WebSocket client")
            await self.websocket.send_text(ready_content)
                
            self.connected = True
            connection_time = time.time() - connection_start
            logger.info(f"[GUACAMOLE] ✓ Connection established successfully in {connection_time:.2f}s")
            logger.info(f"[GUACAMOLE] Target: {protocol}://{connection_args.get('hostname')}:{connection_args.get('port')}")
            logger.info(f"[GUACAMOLE] User: {connection_args.get('username')}")
            return True
            
        except Exception as e:
            connection_time = time.time() - connection_start
            logger.error(f"[GUACAMOLE] ✗ Connection failed after {connection_time:.2f}s: {e}")
            logger.error(f"[GUACAMOLE] Target: {protocol}://{connection_args.get('hostname')}:{connection_args.get('port')}")
            logger.error(f"[GUACAMOLE] User: {connection_args.get('username')}")
            logger.exception("Full exception details:")
            if self.socket:
                try:
                    self.socket.close()
                except:
                    pass
            return False

    async def run(self):
        """
        Run the tunnel loop
        """
        if not self.connected:
            logger.error("[GUACAMOLE] Cannot run tunnel - not connected")
            return

        logger.info("[GUACAMOLE] Starting tunnel data relay loop...")
        try:
            loop = asyncio.get_event_loop()
            loop_iterations = 0
            
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
                            data_bytes = data.encode('utf-8')
                            await loop.sock_sendall(self.socket, data_bytes)
                            self.bytes_sent += len(data_bytes)
                            
                            # Log every 100 iterations to avoid spam
                            loop_iterations += 1
                            if loop_iterations % 100 == 0:
                                logger.debug(f"[GUACAMOLE] Relay stats: sent={self.bytes_sent}B, received={self.bytes_received}B")
                        except WebSocketDisconnect:
                            logger.info("[GUACAMOLE] WebSocket disconnected by client")
                            self.connected = False
                            break
                        except Exception as e:
                            logger.error(f"[GUACAMOLE] Error relaying data from WebSocket: {e}")
                            self.connected = False
                            break
                    elif task == sock_task:
                        # Data from guacd -> browser
                        try:
                            data = task.result()
                            if not data:
                                logger.info("[GUACAMOLE] Socket connection closed by guacd")
                                self.connected = False
                                break
                            # Forward to websocket
                            text_data = data.decode('utf-8', errors='ignore')
                            await self.websocket.send_text(text_data)
                            self.bytes_received += len(data)
                        except Exception as e:
                            logger.error(f"[GUACAMOLE] Error relaying data from socket: {e}")
                            self.connected = False
                            break
                
                # Cancel pending tasks
                for task in pending:
                    task.cancel()
                    
            logger.info(f"[GUACAMOLE] Tunnel loop ended. Total: sent={self.bytes_sent}B, received={self.bytes_received}B")
                    
        except Exception as e:
            logger.error(f"[GUACAMOLE] Tunnel error: {e}")
            logger.exception("Full exception details:")
        finally:
            self.close()

    def close(self):
        logger.info("[GUACAMOLE] Closing tunnel connection")
        self.connected = False
        if self.socket:
            try:
                self.socket.close()
                logger.debug("[GUACAMOLE] Socket closed")
            except Exception as e:
                logger.error(f"[GUACAMOLE] Error closing socket: {e}")

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
