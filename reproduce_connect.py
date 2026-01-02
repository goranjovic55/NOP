import socket
import sys

target_ip = "172.21.0.10"
target_port = 22

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)
    print(f"Connecting to {target_ip}:{target_port}...")
    s.connect((target_ip, target_port))
    print("Connected!")
    data = s.recv(1024)
    print(f"Received: {data}")
    s.close()
except Exception as e:
    print(f"Error: {e}")
