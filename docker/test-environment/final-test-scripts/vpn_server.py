#!/usr/bin/env python3
"""
VPN Server Simulator - VPN tunnel traffic for L7 overlay detection
OpenVPN, WireGuard, IPSec traffic patterns
"""
import argparse
import time
import random
import threading
import socket
import struct
from scapy.all import IP, TCP, UDP, send, conf, Raw

def parse_args():
    parser = argparse.ArgumentParser(description='VPN Server Simulator')
    parser.add_argument('--name', type=str, required=True)
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
        return "172.31.0.50"

class VPNServer:
    def __init__(self, args):
        self.args = args
        self.src_ip = get_ip()
        self.running = True
        conf.verb = 0
        
    def send_openvpn(self):
        """Send OpenVPN traffic (UDP 1194)"""
        while self.running:
            try:
                # OpenVPN packet header
                # P_CONTROL_V1 (0x01) or P_DATA_V1 (0x00) + session + packet-id
                opcode = random.choice([0x28, 0x20, 0x38])  # Control or data messages
                session_id = struct.pack('>Q', random.randint(1, 2**32))
                packet_id = struct.pack('>I', random.randint(1, 10000))
                
                # OpenVPN reset or control message
                openvpn_data = bytes([opcode]) + session_id + packet_id + bytes([random.randint(0, 255) for _ in range(50)])
                
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      UDP(sport=1194, dport=random.randint(40000, 60000)) / \
                      Raw(load=openvpn_data)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] OpenVPN packet sent")
                
                time.sleep(random.uniform(1, 3))
            except Exception as e:
                time.sleep(2)
    
    def send_wireguard(self):
        """Send WireGuard traffic (UDP 51820)"""
        while self.running:
            try:
                # WireGuard message types
                # 1 = Handshake Initiation, 2 = Response, 4 = Transport Data
                msg_type = random.choice([1, 2, 4])
                
                if msg_type == 1:  # Handshake Initiation (148 bytes)
                    wg_data = struct.pack('<I', msg_type) + bytes([random.randint(0, 255) for _ in range(144)])
                elif msg_type == 2:  # Handshake Response (92 bytes)
                    wg_data = struct.pack('<I', msg_type) + bytes([random.randint(0, 255) for _ in range(88)])
                else:  # Transport Data (variable)
                    wg_data = struct.pack('<I', msg_type) + struct.pack('<I', random.randint(1, 1000)) + \
                              struct.pack('<Q', random.randint(1, 10000)) + bytes([random.randint(0, 255) for _ in range(64)])
                
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      UDP(sport=51820, dport=random.randint(40000, 60000)) / \
                      Raw(load=wg_data)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] WireGuard packet sent")
                
                time.sleep(random.uniform(2, 5))
            except Exception as e:
                time.sleep(2)
    
    def send_ipsec_ike(self):
        """Send IPSec IKE traffic (UDP 500/4500)"""
        while self.running:
            try:
                # IKE (Internet Key Exchange) v2 header
                initiator_spi = struct.pack('>Q', random.randint(1, 2**32))
                responder_spi = struct.pack('>Q', random.randint(1, 2**32))
                next_payload = 0x21  # SA payload
                version = 0x20  # IKEv2
                exchange_type = random.choice([34, 35, 36, 37])  # IKE_SA_INIT, IKE_AUTH, etc.
                flags = 0x08  # Initiator
                message_id = struct.pack('>I', random.randint(0, 1000))
                length = struct.pack('>I', 64)
                
                ike_header = initiator_spi + responder_spi + bytes([next_payload, version, exchange_type, flags]) + message_id + length
                ike_data = ike_header + bytes([random.randint(0, 255) for _ in range(36)])
                
                # IKE uses UDP 500 (native) or UDP 4500 (NAT-T)
                port = random.choice([500, 4500])
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      UDP(sport=port, dport=random.randint(40000, 60000)) / \
                      Raw(load=ike_data)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] IPSec IKE packet sent (port {port})")
                
                time.sleep(random.uniform(5, 15))
            except Exception as e:
                time.sleep(5)
    
    def send_esp(self):
        """Send ESP (Encapsulated Security Payload) traffic (protocol 50)"""
        while self.running:
            try:
                # ESP header
                spi = struct.pack('>I', random.randint(256, 2**20))
                seq = struct.pack('>I', random.randint(1, 10000))
                # Encrypted payload (simulated)
                encrypted = bytes([random.randint(0, 255) for _ in range(64)])
                
                esp_data = spi + seq + encrypted
                
                # ESP is IP protocol 50, but we'll send it as UDP 4500 NAT-T for docker bridge
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      UDP(sport=4500, dport=4500) / \
                      Raw(load=bytes([0]*4) + esp_data)  # Non-ESP marker for NAT-T
                send(pkt, verbose=False)
                
                time.sleep(random.uniform(1, 3))
            except Exception as e:
                time.sleep(2)
    
    def run(self):
        print(f"[{self.args.name}] Starting VPN Server Simulator")
        print(f"[{self.args.name}] IP: {self.src_ip}")
        print(f"[{self.args.name}] VPN protocols: OpenVPN(1194), WireGuard(51820), IPSec(500/4500)")
        
        threads = [
            threading.Thread(target=self.send_openvpn, daemon=True),
            threading.Thread(target=self.send_wireguard, daemon=True),
            threading.Thread(target=self.send_ipsec_ike, daemon=True),
            threading.Thread(target=self.send_esp, daemon=True),
        ]
        for t in threads:
            t.start()
        
        try:
            while True:
                time.sleep(10)
                print(f"[{self.args.name}] VPN Server running...")
        except KeyboardInterrupt:
            self.running = False

def main():
    args = parse_args()
    vpn = VPNServer(args)
    vpn.run()

if __name__ == "__main__":
    main()
