#!/usr/bin/env python3
"""
Office Server Simulator - Responds to/generates server traffic
HTTP, SSH, SMB, DNS services
"""
import argparse
import time
import random
import threading
import socket
from scapy.all import IP, TCP, UDP, ICMP, DNS, DNSRR, send, sniff, conf, Raw

def parse_args():
    parser = argparse.ArgumentParser(description='Office Server Simulator')
    parser.add_argument('--name', type=str, required=True)
    parser.add_argument('--vlan', type=int, default=10)
    parser.add_argument('--services', type=str, default='http,ssh,smb,dns')
    parser.add_argument('--interface', type=str, default='eth0')
    return parser.parse_args()

def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "172.31.10.101"

class OfficeServer:
    def __init__(self, args):
        self.args = args
        self.src_ip = get_ip()
        self.services = [s.strip() for s in args.services.split(',')]
        self.running = True
        conf.verb = 0
        
    def send_responses(self):
        """Generate server response traffic"""
        while self.running:
            try:
                # HTTP response simulation
                if 'http' in self.services:
                    http_response = b"HTTP/1.1 200 OK\r\nServer: NOP-Server/1.0\r\nContent-Type: text/html\r\n\r\n<html><body>NOP</body></html>"
                    # Broadcast for visibility
                    pkt = IP(dst="255.255.255.255") / TCP(sport=80, dport=random.randint(40000, 60000), flags='PA') / Raw(load=http_response)
                    send(pkt, verbose=False)
                
                # SMB traffic simulation (port 445)
                if 'smb' in self.services:
                    smb_data = bytes([0x00, 0x00, 0x00, 0x2f, 0xfe, 0x53, 0x4d, 0x42])  # SMB2 header start
                    pkt = IP(dst="255.255.255.255") / TCP(sport=445, dport=random.randint(40000, 60000), flags='PA') / Raw(load=smb_data)
                    send(pkt, verbose=False)
                
                time.sleep(random.uniform(2, 5))
                
            except Exception as e:
                time.sleep(1)
    
    def send_broadcasts(self):
        """Send broadcast traffic for visibility"""
        while self.running:
            try:
                # NetBIOS name service (L7)
                netbios = IP(src=self.src_ip, dst="255.255.255.255") / \
                          UDP(sport=137, dport=137) / \
                          Raw(load=b"\x80\x00\x00\x01\x00\x00\x00\x00\x00\x00")
                send(netbios, verbose=False)
                
                # LLMNR (Link-Local Multicast Name Resolution)
                llmnr = IP(src=self.src_ip, dst="224.0.0.252") / \
                        UDP(sport=5355, dport=5355) / \
                        Raw(load=b"\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00")
                send(llmnr, verbose=False)
                
                time.sleep(10)
            except Exception as e:
                time.sleep(5)
    
    def run(self):
        print(f"[{self.args.name}] Starting Office Server Simulator")
        print(f"[{self.args.name}] IP: {self.src_ip}")
        print(f"[{self.args.name}] Services: {self.services}")
        
        threads = [
            threading.Thread(target=self.send_responses, daemon=True),
            threading.Thread(target=self.send_broadcasts, daemon=True),
        ]
        for t in threads:
            t.start()
        
        try:
            while True:
                time.sleep(10)
                print(f"[{self.args.name}] Server running...")
        except KeyboardInterrupt:
            self.running = False

def main():
    args = parse_args()
    server = OfficeServer(args)
    server.run()

if __name__ == "__main__":
    main()
