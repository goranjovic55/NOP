#!/usr/bin/env python3
"""
Direct guacd connection test script
Tests the connection from backend to guacd without involving the frontend
"""

import socket
import sys
import time

def encode_instruction(opcode, *args):
    """Encode a Guacamole protocol instruction"""
    parts = [f"{len(opcode)}.{opcode}"]
    for arg in args:
        arg_str = str(arg)
        parts.append(f"{len(arg_str)}.{arg_str}")
    return ','.join(parts) + ';'

def decode_instruction(data):
    """Decode a Guacamole protocol instruction"""
    if not data or not data.strip():
        return None
    
    try:
        data = data.strip()
        if not data.endswith(';'):
            return None
            
        parts = []
        pos = 0
        while pos < len(data) and data[pos] != ';':
            # Find the dot
            dot_pos = data.find('.', pos)
            if dot_pos == -1:
                break
                
            # Get the length
            try:
                length = int(data[pos:dot_pos])
            except ValueError:
                break
                
            # Extract the value
            value_start = dot_pos + 1
            value_end = value_start + length
            value = data[value_start:value_end]
            parts.append(value)
            
            # Move past the comma
            pos = value_end + 1
            
        return parts
    except Exception as e:
        print(f"Error decoding instruction: {e}")
        return None

def test_guacd_connection(host, port, protocol, target_host, target_port, username="", password=""):
    """
    Test direct connection to guacd
    
    Args:
        host: guacd hostname (e.g., 'localhost' or 'guacd')
        port: guacd port (default 4822)
        protocol: 'vnc' or 'rdp'
        target_host: IP of the VNC/RDP server to connect to
        target_port: Port of the VNC/RDP server
        username: Username for authentication (optional for VNC)
        password: Password for authentication
    """
    
    print("="*80)
    print("GUACAMOLE DIRECT CONNECTION TEST")
    print("="*80)
    print(f"guacd:        {host}:{port}")
    print(f"Protocol:     {protocol}")
    print(f"Target:       {target_host}:{target_port}")
    print(f"Username:     {username or '(none)'}")
    print(f"Password:     {'***' if password else '(none)'}")
    print("="*80)
    print()
    
    try:
        # Step 1: Connect to guacd
        print("[1/6] Connecting to guacd...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((host, port))
        print(f"✓ Connected to guacd at {host}:{port}")
        print()
        
        # Step 2: Send 'select' instruction
        print("[2/6] Sending 'select' instruction...")
        select_msg = encode_instruction("select", protocol)
        print(f"  Sending: {select_msg}")
        sock.sendall(select_msg.encode('utf-8'))
        print("✓ Select instruction sent")
        print()
        
        # Step 3: Receive 'args' instruction
        print("[3/6] Waiting for 'args' instruction...")
        data = sock.recv(4096).decode('utf-8')
        print(f"  Received: {data[:200]}")
        
        instruction = decode_instruction(data)
        if not instruction or instruction[0] != "args":
            print(f"✗ Expected 'args', got: {instruction}")
            return False
            
        arg_names = instruction[1:]
        print(f"✓ Received args request: {arg_names}")
        print()
        
        # Step 4: Prepare and send connection args
        print("[4/6] Preparing connection arguments...")
        connection_args = {
            "hostname": target_host,
            "port": str(target_port),
            "username": username,
            "password": password,
            "width": "1024",
            "height": "768",
            "dpi": "96",
        }
        
        # Add protocol-specific args
        if protocol == "rdp":
            connection_args["security"] = "any"
            connection_args["ignore-cert"] = "true"
        
        # Build arg values in the order requested by guacd
        arg_values = []
        for name in arg_names:
            value = connection_args.get(name, "")
            arg_values.append(value)
            if name != "password":
                print(f"  {name}: {value}")
            else:
                print(f"  {name}: {'***' if value else '(empty)'}")
        
        # Send size instruction
        size_msg = encode_instruction("size", "1024", "768", "96")
        print(f"  Sending size: {size_msg}")
        sock.sendall(size_msg.encode('utf-8'))
        
        # Send audio instruction
        audio_msg = encode_instruction("audio", "audio/L16")
        sock.sendall(audio_msg.encode('utf-8'))
        
        # Send video instruction
        video_msg = encode_instruction("video")
        sock.sendall(video_msg.encode('utf-8'))
        
        # Send image instruction
        image_msg = encode_instruction("image", "image/jpeg", "image/png", "image/webp")
        sock.sendall(image_msg.encode('utf-8'))
        
        # Send connect instruction with args
        connect_msg = encode_instruction("connect", *arg_values)
        print(f"  Sending connect with {len(arg_values)} args")
        sock.sendall(connect_msg.encode('utf-8'))
        print("✓ Connection arguments sent")
        print()
        
        # Step 5: Wait for response
        print("[5/6] Waiting for connection response...")
        sock.settimeout(15)
        
        response_data = b""
        start_time = time.time()
        while time.time() - start_time < 10:
            try:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                response_data += chunk
                
                # Check for 'ready' instruction (connection successful)
                if b"ready" in response_data:
                    print(f"✓ Received 'ready' instruction - CONNECTION SUCCESSFUL!")
                    print(f"  Response preview: {response_data[:200]}")
                    print()
                    print("[6/6] Connection established successfully!")
                    print()
                    print("="*80)
                    print("TEST RESULT: SUCCESS ✓")
                    print("="*80)
                    print("The backend → guacd → target connection is working correctly.")
                    print("If the frontend still fails, the issue is in the WebSocket/frontend code.")
                    return True
                    
                # Check for error instruction
                if b"error" in response_data:
                    print(f"✗ Received error instruction")
                    print(f"  Response: {response_data[:500]}")
                    return False
                    
            except socket.timeout:
                break
        
        print(f"  Response received: {len(response_data)} bytes")
        if response_data:
            print(f"  Preview: {response_data[:200]}")
        
        print()
        print("="*80)
        print("TEST RESULT: PARTIAL")
        print("="*80)
        print("Connected to guacd and sent protocol handshake.")
        print("Did not receive clear 'ready' signal, but no error either.")
        print("This may be normal - check guacd logs for more details.")
        
    except socket.timeout:
        print()
        print("="*80)
        print("TEST RESULT: TIMEOUT ✗")
        print("="*80)
        print("Connection timed out. guacd may not be running or is unreachable.")
        print("Check: docker ps | grep guacd")
        return False
        
    except ConnectionRefusedError:
        print()
        print("="*80)
        print("TEST RESULT: CONNECTION REFUSED ✗")
        print("="*80)
        print("Cannot connect to guacd. It's not listening on the specified port.")
        print("Check: docker logs guacd-1")
        return False
        
    except Exception as e:
        print()
        print("="*80)
        print(f"TEST RESULT: ERROR ✗")
        print("="*80)
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        try:
            sock.close()
        except:
            pass
    
    return False

if __name__ == "__main__":
    print()
    print("GUACAMOLE DIRECT CONNECTION TEST TOOL")
    print("This tests the backend → guacd → target server connection")
    print()
    
    # Default values for testing
    guacd_host = "localhost"  # Use "guacd" if running inside Docker network
    guacd_port = 4822
    
    if len(sys.argv) > 1:
        print("Usage examples:")
        print()
        print("  # Test VNC connection from within Docker network:")
        print("  docker exec backend-1 python3 /app/test_guacd_direct.py vnc 172.18.0.5 5900 vnc123")
        print()
        print("  # Test RDP connection:")
        print("  docker exec backend-1 python3 /app/test_guacd_direct.py rdp 192.168.1.100 3389 admin password123")
        print()
        print("  # Or run directly if guacd is on localhost:")
        print("  python3 test_guacd_direct.py vnc 172.18.0.5 5900 vnc123")
        print()
        sys.exit(1)
    
    # Interactive mode
    print("Enter connection details:")
    protocol = input("Protocol (vnc/rdp) [vnc]: ").strip().lower() or "vnc"
    target_host = input("Target host IP: ").strip()
    target_port = input(f"Target port [{5900 if protocol=='vnc' else 3389}]: ").strip()
    target_port = int(target_port) if target_port else (5900 if protocol == 'vnc' else 3389)
    
    username = input("Username (optional for VNC): ").strip()
    password = input("Password: ").strip()
    
    use_docker = input("Is guacd in Docker? (y/n) [y]: ").strip().lower() != 'n'
    if use_docker:
        guacd_host = "guacd"
    
    print()
    test_guacd_connection(guacd_host, guacd_port, protocol, target_host, target_port, username, password)
