#!/usr/bin/env python3
"""
PLC Device Simulator - Industrial device traffic
Modbus/TCP, OPC-UA client, MQTT publisher
"""
import argparse
import time
import random
import threading
import socket
import struct
from scapy.all import IP, TCP, UDP, send, conf, Raw

def parse_args():
    parser = argparse.ArgumentParser(description='PLC Device Simulator')
    parser.add_argument('--name', type=str, required=True)
    parser.add_argument('--vlan', type=int, default=20)
    parser.add_argument('--modbus-server', type=str, default='172.31.20.103')
    parser.add_argument('--mqtt-broker', type=str, default='172.31.20.103')
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
        return "172.31.20.101"

class PLCDevice:
    def __init__(self, args):
        self.args = args
        self.src_ip = get_ip()
        self.modbus_transaction = 0
        self.running = True
        conf.verb = 0
        
    def send_modbus_request(self):
        """Send Modbus/TCP request (port 502)"""
        while self.running:
            try:
                self.modbus_transaction += 1
                # Modbus/TCP MBAP header + Read Holding Registers
                mbap = struct.pack('>HHHBB', 
                    self.modbus_transaction,  # Transaction ID
                    0,                         # Protocol ID (Modbus)
                    6,                         # Length
                    1,                         # Unit ID
                    3                          # Function code: Read Holding Registers
                )
                # Read registers 0-9
                data = struct.pack('>HH', 0, 10)
                modbus_pkt = mbap + data
                
                pkt = IP(src=self.src_ip, dst=self.args.modbus_server) / \
                      TCP(sport=random.randint(40000, 60000), dport=502, flags='PA') / \
                      Raw(load=modbus_pkt)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] Modbus request #{self.modbus_transaction}")
                
                time.sleep(random.uniform(1, 3))
            except Exception as e:
                time.sleep(2)
    
    def send_mqtt_publish(self):
        """Send MQTT PUBLISH packets (port 1883)"""
        while self.running:
            try:
                # MQTT PUBLISH packet (simplified)
                topic = b"plc/sensor/temperature"
                value = struct.pack('>f', random.uniform(20.0, 80.0))
                # Fixed header: PUBLISH (3), remaining length
                remaining = 2 + len(topic) + len(value)
                mqtt_pkt = bytes([0x30, remaining]) + struct.pack('>H', len(topic)) + topic + value
                
                pkt = IP(src=self.src_ip, dst=self.args.mqtt_broker) / \
                      TCP(sport=random.randint(40000, 60000), dport=1883, flags='PA') / \
                      Raw(load=mqtt_pkt)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] MQTT publish")
                
                time.sleep(random.uniform(2, 5))
            except Exception as e:
                time.sleep(2)
    
    def send_opcua_request(self):
        """Send OPC-UA request (port 4840)"""
        while self.running:
            try:
                # OPC-UA Hello message (simplified)
                opcua_hello = bytes([
                    0x48, 0x45, 0x4c, 0x46,  # HELF (Hello message)
                    0x20, 0x00, 0x00, 0x00,  # Message size
                    0x00, 0x00, 0x00, 0x00,  # Protocol version
                    0x00, 0x00, 0x01, 0x00,  # Receive buffer size
                    0x00, 0x00, 0x01, 0x00,  # Send buffer size
                    0x00, 0x40, 0x00, 0x00,  # Max message size
                    0x00, 0x00, 0x00, 0x00,  # Max chunk count
                ])
                
                pkt = IP(src=self.src_ip, dst=self.args.modbus_server) / \
                      TCP(sport=random.randint(40000, 60000), dport=4840, flags='PA') / \
                      Raw(load=opcua_hello)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] OPC-UA request")
                
                time.sleep(random.uniform(3, 8))
            except Exception as e:
                time.sleep(3)
    
    def run(self):
        print(f"[{self.args.name}] Starting PLC Device Simulator")
        print(f"[{self.args.name}] IP: {self.src_ip}")
        print(f"[{self.args.name}] Modbus server: {self.args.modbus_server}")
        print(f"[{self.args.name}] MQTT broker: {self.args.mqtt_broker}")
        
        threads = [
            threading.Thread(target=self.send_modbus_request, daemon=True),
            threading.Thread(target=self.send_mqtt_publish, daemon=True),
            threading.Thread(target=self.send_opcua_request, daemon=True),
        ]
        for t in threads:
            t.start()
        
        try:
            while True:
                time.sleep(10)
                print(f"[{self.args.name}] PLC running...")
        except KeyboardInterrupt:
            self.running = False

def main():
    args = parse_args()
    plc = PLCDevice(args)
    plc.run()

if __name__ == "__main__":
    main()
