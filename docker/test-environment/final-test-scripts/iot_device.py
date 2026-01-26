#!/usr/bin/env python3
"""
IoT Gateway Simulator - IoT device traffic
MQTT, CoAP, SNMP agent traffic
"""
import argparse
import time
import random
import threading
import socket
import struct
from scapy.all import IP, TCP, UDP, send, conf, Raw

def parse_args():
    parser = argparse.ArgumentParser(description='IoT Gateway Simulator')
    parser.add_argument('--name', type=str, required=True)
    parser.add_argument('--vlan', type=int, default=20)
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
        return "172.31.20.102"

class IoTGateway:
    def __init__(self, args):
        self.args = args
        self.src_ip = get_ip()
        self.running = True
        conf.verb = 0
        
    def send_mqtt_subscribe_and_publish(self):
        """Send MQTT traffic (port 1883)"""
        while self.running:
            try:
                # MQTT SUBSCRIBE packet
                topic = b"sensors/#"
                # Fixed header: SUBSCRIBE (0x82), remaining length
                remaining = 2 + 2 + len(topic) + 1  # packet id + topic len + topic + qos
                mqtt_sub = bytes([0x82, remaining, 0x00, 0x01]) + struct.pack('>H', len(topic)) + topic + bytes([0x01])
                
                pkt = IP(src=self.src_ip, dst=self.args.mqtt_broker) / \
                      TCP(sport=random.randint(40000, 60000), dport=1883, flags='PA') / \
                      Raw(load=mqtt_sub)
                send(pkt, verbose=False)
                
                # Also send PUBLISH for aggregated data
                topic = b"iot/gateway/status"
                value = b'{"devices":5,"uptime":' + str(random.randint(1000, 10000)).encode() + b'}'
                remaining = 2 + len(topic) + len(value)
                mqtt_pub = bytes([0x30, remaining]) + struct.pack('>H', len(topic)) + topic + value
                
                pkt = IP(src=self.src_ip, dst=self.args.mqtt_broker) / \
                      TCP(sport=random.randint(40000, 60000), dport=1883, flags='PA') / \
                      Raw(load=mqtt_pub)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] MQTT traffic sent")
                
                time.sleep(random.uniform(3, 7))
            except Exception as e:
                time.sleep(2)
    
    def send_coap_request(self):
        """Send CoAP requests (port 5683)"""
        while self.running:
            try:
                # CoAP GET request (simplified)
                # Version 1, Type CON, Token Length 2, Code GET (0.01)
                coap_get = bytes([
                    0x42,  # Ver=1, T=CON, TKL=2
                    0x01,  # Code: GET
                    0x00, 0x01,  # Message ID
                    0xab, 0xcd,  # Token
                    0xb5,  # Option: Uri-Path (11), len 5
                ]) + b"temp\x00"
                
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      UDP(sport=random.randint(40000, 60000), dport=5683) / \
                      Raw(load=coap_get)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] CoAP request sent")
                
                time.sleep(random.uniform(5, 10))
            except Exception as e:
                time.sleep(3)
    
    def send_snmp_get(self):
        """Send SNMP GET requests (port 161)"""
        while self.running:
            try:
                # SNMPv2 GET request (simplified - ASN.1 encoded)
                # This is a minimal SNMP GET for sysDescr.0
                snmp_get = bytes([
                    0x30, 0x29,  # SEQUENCE
                    0x02, 0x01, 0x01,  # INTEGER: version (v2c=1)
                    0x04, 0x06, 0x70, 0x75, 0x62, 0x6c, 0x69, 0x63,  # OCTET STRING: "public"
                    0xa0, 0x1c,  # GET-REQUEST
                    0x02, 0x04, 0x00, 0x00, 0x00, 0x01,  # request-id
                    0x02, 0x01, 0x00,  # error-status
                    0x02, 0x01, 0x00,  # error-index
                    0x30, 0x0e,  # variable-bindings
                    0x30, 0x0c,  # SEQUENCE
                    0x06, 0x08, 0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x01, 0x00,  # OID: sysDescr.0
                    0x05, 0x00,  # NULL value
                ])
                
                pkt = IP(src=self.src_ip, dst="255.255.255.255") / \
                      UDP(sport=random.randint(40000, 60000), dport=161) / \
                      Raw(load=snmp_get)
                send(pkt, verbose=False)
                print(f"[{self.args.name}] SNMP GET sent")
                
                time.sleep(random.uniform(10, 20))
            except Exception as e:
                time.sleep(5)
    
    def run(self):
        print(f"[{self.args.name}] Starting IoT Gateway Simulator")
        print(f"[{self.args.name}] IP: {self.src_ip}")
        print(f"[{self.args.name}] MQTT broker: {self.args.mqtt_broker}")
        
        threads = [
            threading.Thread(target=self.send_mqtt_subscribe_and_publish, daemon=True),
            threading.Thread(target=self.send_coap_request, daemon=True),
            threading.Thread(target=self.send_snmp_get, daemon=True),
        ]
        for t in threads:
            t.start()
        
        try:
            while True:
                time.sleep(10)
                print(f"[{self.args.name}] IoT Gateway running...")
        except KeyboardInterrupt:
            self.running = False

def main():
    args = parse_args()
    gateway = IoTGateway(args)
    gateway.run()

if __name__ == "__main__":
    main()
