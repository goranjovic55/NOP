#!/usr/bin/env python3
"""
Access Switch Simulator - Generates REP ring, LLDP, and VLAN traffic
Simulates an access layer switch in a ring topology
"""
import argparse
import time
import struct
import threading
from scapy.all import Ether, LLC, SNAP, sendp, get_if_hwaddr, conf, Raw, Dot1Q, IP, ICMP

# Protocol constants
REP_MULTICAST = "01:00:0c:cc:cc:cd"
MRP_MULTICAST = "01:15:4e:00:00:01"
LLDP_MULTICAST = "01:80:c2:00:00:0e"
LLDP_ETHERTYPE = 0x88cc
MRP_ETHERTYPE = 0x88e3

def parse_args():
    parser = argparse.ArgumentParser(description='Access Switch Simulator')
    parser.add_argument('--name', type=str, required=True, help='Switch name')
    parser.add_argument('--ring-protocol', type=str, default='rep', choices=['rep', 'mrp'])
    parser.add_argument('--ring-id', type=int, default=1, help='Ring ID')
    parser.add_argument('--node-id', type=int, default=1, help='Node ID in ring')
    parser.add_argument('--vlan', type=int, default=1, help='VLAN')
    parser.add_argument('--lldp-ip', type=str, default=None, help='Management IP')
    parser.add_argument('--interface', type=str, default='eth0', help='Interface')
    return parser.parse_args()

def get_mac(interface):
    try:
        return get_if_hwaddr(interface)
    except:
        with open(f'/sys/class/net/{interface}/address') as f:
            return f.read().strip()

def build_lldp_tlv(tlv_type, value):
    length = len(value)
    header = (tlv_type << 9) | length
    return struct.pack('>H', header) + value

def build_lldp_frame(src_mac, system_name, mgmt_ip, port_id):
    tlvs = b''
    chassis = bytes([4]) + bytes.fromhex(src_mac.replace(':', ''))
    tlvs += build_lldp_tlv(1, chassis)
    port = bytes([5]) + port_id.encode()
    tlvs += build_lldp_tlv(2, port)
    tlvs += build_lldp_tlv(3, struct.pack('>H', 120))
    tlvs += build_lldp_tlv(5, system_name.encode())
    tlvs += build_lldp_tlv(6, b'NOP Access Switch')
    tlvs += build_lldp_tlv(7, struct.pack('>HH', 4, 4))  # Bridge capability
    if mgmt_ip:
        ip_bytes = bytes(map(int, mgmt_ip.split('.')))
        mgmt = struct.pack('BB', 5, 1) + ip_bytes + struct.pack('BI', 2, 1) + bytes([0])
        tlvs += build_lldp_tlv(8, mgmt)
    tlvs += struct.pack('>H', 0)
    return tlvs

class AccessSwitch:
    def __init__(self, args):
        self.args = args
        self.src_mac = get_mac(args.interface)
        self.running = True
        conf.verb = 0
        
    def send_rep_ring(self):
        """Send Cisco REP ring protocol frames"""
        while self.running:
            try:
                # REP uses LLC/SNAP encapsulation
                rep_data = struct.pack('>BBHH',
                    0x01,  # Version
                    0x00,  # State: Normal
                    self.args.node_id,
                    self.args.ring_id
                )
                rep_data += b'REP-HELLO'
                
                frame = Ether(src=self.src_mac, dst=REP_MULTICAST) / \
                        LLC(dsap=0xAA, ssap=0xAA, ctrl=0x03) / \
                        SNAP(OUI=0x00000C, code=0x2003) / \
                        Raw(load=rep_data)
                sendp(frame, iface=self.args.interface, verbose=False)
                time.sleep(1)
            except Exception as e:
                print(f"[REP] Error: {e}")
                time.sleep(1)
    
    def send_mrp_ring(self):
        """Send IEC 62439-2 MRP ring protocol frames"""
        seq = 0
        while self.running:
            try:
                mrp_data = struct.pack('>BBBBHIH',
                    0x00,  # Version
                    0x01,  # Type: MRP_Test
                    16,    # Length
                    0x00,  # State: Normal
                    self.args.ring_id,
                    self.args.node_id,
                    seq & 0xFFFF
                )
                
                frame = Ether(src=self.src_mac, dst=MRP_MULTICAST, type=MRP_ETHERTYPE) / \
                        Raw(load=mrp_data)
                sendp(frame, iface=self.args.interface, verbose=False)
                seq += 1
                time.sleep(1)
            except Exception as e:
                print(f"[MRP] Error: {e}")
                time.sleep(1)
    
    def send_lldp(self):
        """Send LLDP frames"""
        while self.running:
            try:
                lldp_data = build_lldp_frame(
                    self.src_mac, self.args.name,
                    self.args.lldp_ip, "FastEthernet0/1"
                )
                frame = Ether(src=self.src_mac, dst=LLDP_MULTICAST, type=LLDP_ETHERTYPE) / Raw(load=lldp_data)
                sendp(frame, iface=self.args.interface, verbose=False)
                time.sleep(30)
            except Exception as e:
                print(f"[LLDP] Error: {e}")
                time.sleep(5)
    
    def send_vlan_traffic(self):
        """Send VLAN-tagged traffic"""
        while self.running:
            try:
                frame = Ether(src=self.src_mac, dst="ff:ff:ff:ff:ff:ff") / \
                        Dot1Q(vlan=self.args.vlan) / \
                        IP(src=self.args.lldp_ip or "0.0.0.0", dst="255.255.255.255") / \
                        ICMP()
                sendp(frame, iface=self.args.interface, verbose=False)
                time.sleep(3)
            except Exception as e:
                print(f"[VLAN] Error: {e}")
                time.sleep(1)
    
    def run(self):
        print(f"[{self.args.name}] Starting Access Switch Simulator")
        print(f"[{self.args.name}] MAC: {self.src_mac}")
        print(f"[{self.args.name}] Ring: {self.args.ring_protocol.upper()} ID={self.args.ring_id} Node={self.args.node_id}")
        print(f"[{self.args.name}] VLAN: {self.args.vlan}")
        
        ring_func = self.send_rep_ring if self.args.ring_protocol == 'rep' else self.send_mrp_ring
        
        threads = [
            threading.Thread(target=ring_func, daemon=True),
            threading.Thread(target=self.send_lldp, daemon=True),
            threading.Thread(target=self.send_vlan_traffic, daemon=True),
        ]
        for t in threads:
            t.start()
        
        try:
            while True:
                time.sleep(10)
                print(f"[{self.args.name}] Switch running...")
        except KeyboardInterrupt:
            self.running = False

def main():
    args = parse_args()
    switch = AccessSwitch(args)
    switch.run()

if __name__ == "__main__":
    main()
