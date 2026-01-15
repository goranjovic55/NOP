#!/usr/bin/env python3
"""
Vulnerable Service Simulator for NOP Testing
Simulates services with detectable versions for vulnerability scanning
"""

import socket
import threading
import sys

# HTTP Server on port 8080 - Apache 2.4.49 (CVE-2021-41773)
def http_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('0.0.0.0', 8080))
    server.listen(5)
    print("[HTTP] Listening on port 8080 (Apache/2.4.49 simulation)")
    
    while True:
        client, addr = server.accept()
        try:
            request = client.recv(1024).decode('utf-8', errors='ignore')
            
            # Return version info in Server header
            response = """HTTP/1.1 200 OK
Server: Apache/2.4.49 (Unix)
Content-Type: text/html
Connection: close

<!DOCTYPE html>
<html>
<head><title>Test Server</title></head>
<body>
<h1>NOP Vulnerability Test Server</h1>
<p>Apache/2.4.49 - For testing CVE-2021-41773 detection</p>
</body>
</html>
"""
            client.send(response.encode())
        except Exception as e:
            print(f"[HTTP] Error: {e}")
        finally:
            client.close()

# MySQL Server on port 3306 - MySQL 5.7.31 
def mysql_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('0.0.0.0', 3306))
    server.listen(5)
    print("[MySQL] Listening on port 3306 (MySQL 5.7.31 simulation)")
    
    while True:
        client, addr = server.accept()
        try:
            # MySQL greeting packet with version
            # This is a simplified greeting that nmap can detect
            greeting = bytes([
                0x4a, 0x00, 0x00,  # packet length
                0x00,              # packet number
                0x0a,              # protocol version
            ]) + b'5.7.31-log\x00'  # version string
            
            # Add some padding to look more realistic
            greeting += b'\x00' * 50
            
            client.send(greeting)
        except Exception as e:
            print(f"[MySQL] Error: {e}")
        finally:
            client.close()

# OpenSSH banner for version detection
def print_banner():
    print("=" * 50)
    print("NOP Vulnerability Test Server")
    print("=" * 50)
    print("Simulated services:")
    print("  - SSH on port 22 (OpenSSH)")
    print("  - HTTP on port 8080 (Apache/2.4.49)")
    print("  - MySQL on port 3306 (MySQL 5.7.31)")
    print("=" * 50)

if __name__ == '__main__':
    print_banner()
    
    # Start HTTP server thread
    http_thread = threading.Thread(target=http_server, daemon=True)
    http_thread.start()
    
    # Start MySQL server thread
    mysql_thread = threading.Thread(target=mysql_server, daemon=True)
    mysql_thread.start()
    
    # Keep main thread alive
    try:
        while True:
            pass
    except KeyboardInterrupt:
        print("\nShutting down...")
        sys.exit(0)
