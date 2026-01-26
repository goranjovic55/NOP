#!/usr/bin/env python3
"""
SCADA Server Simulator - Industrial control server traffic
OPC-UA server, Modbus responses, MQTT broker, HTTPS
"""
import argparse
import time
import random
import threading
import socket
import struct
from scapy.all import IP, TCP, UDP, send, conf, Raw

def parse_args():
    parser = argparse.ArgumentParser(description='SCADA Server Simulator')
    parser.add_argument('--name', type=str, required=True)
    parser.add_argument('--vlan', type=int, default=20)
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
        return "172.31.20.103"

class SCADAServer:
    def __init__(self, args):
        self.args = args
        self.src_ip = get_ip()
        self.running = True
        conf.verb = 0
        
    def send_modbus_response(self):
        """Send Modbus/TCP response traffic (port 502)"""
        while self.running:
            try:
                # Modbus response with register values
                mbap = struct.pack('>HHHBB', 
                    random.randint(1, 1000),  # Transaction ID
                    0,                         # Protocol ID
                    23,                        # Length
                    1,                         # Unit ID
                    3                          # Function code: Read Holding Registers
                )
                # Response: 10 registers (20 bytes)
                data = bytes([20]) + bytes([random.randint(0, 255) for _ in range(20)])
                modbus_pkt = mbap + data
                
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      TCP(sport=502, dport=random.randint(40000, 60000), flags='PA') / \
                      Raw(load=modbus_pkt)
                send(pkt, verbose=False)
                
                time.sleep(random.uniform(1, 3))
            except Exception as e:
                time.sleep(2)
    
    def send_opcua_response(self):
        """Send OPC-UA server response (port 4840)"""
        while self.running:
            try:
                # OPC-UA ACK message (simplified)
                opcua_ack = bytes([
                    0x41, 0x43, 0x4b, 0x46,  # ACKF
                    0x1c, 0x00, 0x00, 0x00,  # Message size
                    0x00, 0x00, 0x00, 0x00,  # Protocol version
                    0x00, 0x00, 0x02, 0x00,  # Receive buffer size
                    0x00, 0x00, 0x02, 0x00,  # Send buffer size
                    0x00, 0x00, 0x04, 0x00,  # Max message size
                    0x01, 0x00, 0x00, 0x00,  # Max chunk count
                ])
                
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      TCP(sport=4840, dport=random.randint(40000, 60000), flags='PA') / \
                      Raw(load=opcua_ack)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] OPC-UA response sent")
                
                time.sleep(random.uniform(3, 8))
            except Exception as e:
                time.sleep(3)
    
    def send_mqtt_broker_traffic(self):
        """Send MQTT broker traffic (port 1883)"""
        while self.running:
            try:
                # MQTT CONNACK
                mqtt_connack = bytes([0x20, 0x02, 0x00, 0x00])
                
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      TCP(sport=1883, dport=random.randint(40000, 60000), flags='PA') / \
                      Raw(load=mqtt_connack)
                send(pkt, verbose=False)
                
                # MQTT PUBACK/SUBACK
                mqtt_ack = bytes([0x40, 0x02, 0x00, random.randint(1, 255)])
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      TCP(sport=1883, dport=random.randint(40000, 60000), flags='PA') / \
                      Raw(load=mqtt_ack)
                send(pkt, verbose=False)
                
                time.sleep(random.uniform(2, 5))
            except Exception as e:
                time.sleep(2)
    
    def send_https_traffic(self):
        """Send HTTPS server traffic (port 443)"""
        while self.running:
            try:
                # TLS Server Hello (simplified - starts with record header)
                tls_server_hello = bytes([
                    0x16,        # Content type: Handshake
                    0x03, 0x03,  # TLS 1.2 version
                    0x00, 0x50,  # Length
                    0x02,        # Handshake type: Server Hello
                    0x00, 0x00, 0x4c,  # Length
                    0x03, 0x03,  # TLS 1.2
                ]) + bytes([random.randint(0, 255) for _ in range(72)])  # Random + session + extensions
                
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      TCP(sport=443, dport=random.randint(40000, 60000), flags='PA') / \
                      Raw(load=tls_server_hello)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] HTTPS traffic sent")
                
                time.sleep(random.uniform(5, 15))
            except Exception as e:
                time.sleep(5)
    
    def run(self):
        print(f"[{self.args.name}] Starting SCADA Server Simulator")
        print(f"[{self.args.name}] IP: {self.src_ip}")
        print(f"[{self.args.name}] Services: Modbus:502, OPC-UA:4840, MQTT:1883, HTTPS:443")
        
        threads = [
            threading.Thread(target=self.send_modbus_response, daemon=True),
            threading.Thread(target=self.send_opcua_response, daemon=True),
            threading.Thread(target=self.send_mqtt_broker_traffic, daemon=True),
            threading.Thread(target=self.send_https_traffic, daemon=True),
        ]
        for t in threads:
            t.start()
        
        try:
            while True:
                time.sleep(10)
                print(f"[{self.args.name}] SCADA Server running...")
        except KeyboardInterrupt:
            self.running = False

def main():
    args = parse_args()
    scada = SCADAServer(args)
    scada.run()

if __name__ == "__main__":
    main()
