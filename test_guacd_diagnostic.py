#!/usr/bin/env python3
"""
Guacamole Connection Diagnostic Tool
Tests the Guacamole tunnel functionality with simulated connections
"""

import socket
import sys
import time


def guacamole_instruction(opcode, *args):
    """Create a Guacamole protocol instruction"""
    content = f"{len(opcode)}.{opcode}"
    for arg in args:
        arg_str = str(arg)
        content += f",{len(arg_str)}.{arg_str}"
    content += ";"
    return content.encode('utf-8')


def parse_guacamole_instruction(data):
    """Parse a Guacamole protocol instruction"""
    instruction_str = data.decode('utf-8', errors='ignore')
    parts = []
    pos = 0
    
    while pos < len(instruction_str) and instruction_str[pos] != ';':
        # Find the dot
        dot_pos = instruction_str.find('.', pos)
        if dot_pos == -1:
            break
            
        # Get the length
        try:
            length = int(instruction_str[pos:dot_pos])
        except ValueError:
            break
            
        # Get the value
        value_start = dot_pos + 1
        value_end = value_start + length
        value = instruction_str[value_start:value_end]
        parts.append(value)
        
        # Move to next part (skip comma or semicolon)
        pos = value_end + 1
        
    return parts


def test_guacd_protocol(host, port, protocol_type):
    """Test guacd with a specific protocol"""
    print(f"\n{'='*60}")
    print(f"Testing {protocol_type.upper()} Protocol Support")
    print(f"{'='*60}")
    
    try:
        # Connect to guacd
        print(f"1. Connecting to guacd at {host}:{port}...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((host, port))
        print("   ✓ Connected to guacd")
        
        # Send select instruction
        print(f"2. Sending 'select' instruction for {protocol_type}...")
        select_inst = guacamole_instruction("select", protocol_type)
        print(f"   Sent: {select_inst}")
        sock.sendall(select_inst)
        
        # Receive response (should be 'args')
        print("3. Waiting for 'args' response...")
        data = sock.recv(4096)
        print(f"   Received {len(data)} bytes")
        
        parts = parse_guacamole_instruction(data)
        print(f"   Parsed: {parts}")
        
        if parts and parts[0] == 'args':
            print(f"   ✓ Protocol {protocol_type.upper()} is supported!")
            print(f"   ✓ Required arguments: {', '.join(parts[1:])}")
            
            # Test connection with fake host (will fail but shows handshake works)
            print("\n4. Testing connection handshake...")
            
            # Prepare fake connection arguments
            arg_values = []
            for arg_name in parts[1:]:
                if arg_name == 'hostname':
                    arg_values.append('test.example.com')
                elif arg_name == 'port':
                    arg_values.append('3389' if protocol_type == 'rdp' else '5900')
                elif arg_name == 'username':
                    arg_values.append('testuser')
                elif arg_name == 'password':
                    arg_values.append('testpass')
                else:
                    arg_values.append('')  # Empty for other args
            
            # Send size, audio, video, image instructions
            print("   Sending handshake instructions...")
            sock.sendall(guacamole_instruction("size", "1024", "768", "96"))
            sock.sendall(guacamole_instruction("audio", "audio/L16"))
            sock.sendall(guacamole_instruction("video", "video/vp8"))
            sock.sendall(guacamole_instruction("image", "image/png"))
            
            # Send connect with args
            print(f"   Sending 'connect' instruction...")
            connect_inst = guacamole_instruction("connect", *arg_values)
            sock.sendall(connect_inst)
            
            # Wait for response (might be error or ready)
            time.sleep(1)
            data = sock.recv(4096)
            if data:
                parts = parse_guacamole_instruction(data)
                print(f"   Response: {parts[0] if parts else 'unknown'}")
                if parts and parts[0] == 'error':
                    print(f"   ✓ Handshake working (connection failed as expected with fake host)")
                elif parts and parts[0] == 'ready':
                    print(f"   ✓ Connection ready! (unexpected with fake host)")
            else:
                print("   No immediate response (normal)")
                
            return True
        else:
            print(f"   ✗ Unexpected response: {parts}")
            return False
            
    except socket.timeout:
        print("   ✗ Connection timed out")
        return False
    except ConnectionRefusedError:
        print("   ✗ Connection refused - is guacd running?")
        return False
    except Exception as e:
        print(f"   ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        try:
            sock.close()
        except:
            pass


def main():
    """Run diagnostic tests"""
    print("="*60)
    print("Guacamole Connection Diagnostic Tool")
    print("="*60)
    
    # Get guacd container IP
    print("\nFinding guacd container...")
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "inspect", "-f", 
             "{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}", 
             "nop-guacd-1"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            print("✗ Could not find guacd container")
            print("  Make sure guacd is running: docker ps | grep guacd")
            return 1
            
        # Get first IP address
        guacd_ip = result.stdout.strip().split('\n')[0]
        print(f"✓ Found guacd at: {guacd_ip}")
        
    except Exception as e:
        print(f"✗ Error finding guacd: {e}")
        print("Using localhost as fallback...")
        guacd_ip = "localhost"
    
    guacd_port = 4822
    
    # Test protocols
    protocols_ok = []
    
    if test_guacd_protocol(guacd_ip, guacd_port, "rdp"):
        protocols_ok.append("RDP")
    
    if test_guacd_protocol(guacd_ip, guacd_port, "vnc"):
        protocols_ok.append("VNC")
    
    # Summary
    print(f"\n{'='*60}")
    print("DIAGNOSTIC SUMMARY")
    print(f"{'='*60}")
    
    if protocols_ok:
        print(f"✓ Supported protocols: {', '.join(protocols_ok)}")
        print(f"\n✓ guacd is properly configured and responding")
        print(f"✓ Ready to accept {' and '.join(protocols_ok)} connections")
        print(f"\nNext steps:")
        print(f"  1. Start the backend application")
        print(f"  2. Start test environment with RDP/VNC servers")
        print(f"  3. Test connections through the Access Hub UI")
        return 0
    else:
        print("✗ No protocols working correctly")
        print("\nTroubleshooting:")
        print("  1. Check guacd logs: docker logs nop-guacd-1")
        print("  2. Verify guacd is running: docker ps | grep guacd")
        print("  3. Restart guacd: docker restart nop-guacd-1")
        return 1


if __name__ == "__main__":
    sys.exit(main())
