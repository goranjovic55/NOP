#!/usr/bin/env python3
"""
Core Switch Simulator - Generates STP, LLDP, and VLAN traffic
Simulates a managed core switch with full L2 protocol stack
"""
import argparse
import time
import struct
import threading
from scapy.all import Ether, LLC, STP, sendp, get_if_hwaddr, conf, Raw, Dot1Q, IP, ICMP

# Protocol constants
STP_MULTICAST = "01:80:c2:00:00:00"
LLDP_MULTICAST = "01:80:c2:00:00:0e"
LLDP_ETHERTYPE = 0x88cc

def parse_args():
    parser = argparse.ArgumentParser(description='Core Switch Simulator')
    parser.add_argument('--name', type=str, required=True, help='Switch name')
    parser.add_argument('--stp-priority', type=int, default=32768, help='STP priority')
    parser.add_argument('--vlan', type=int, default=1, help='Native VLAN')
    parser.add_argument('--lldp-ip', type=str, default=None, help='Management IP')
    parser.add_argument('--is-root', action='store_true', help='Is STP root bridge')
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

def build_lldp_frame(src_mac, system_name, mgmt_ip, port_id, capabilities):
    tlvs = b''
    # Chassis ID (MAC)
    chassis = bytes([4]) + bytes.fromhex(src_mac.replace(':', ''))
    tlvs += build_lldp_tlv(1, chassis)
    # Port ID
    port = bytes([5]) + port_id.encode()
    tlvs += build_lldp_tlv(2, port)
    # TTL
    tlvs += build_lldp_tlv(3, struct.pack('>H', 120))
    # System Name
    tlvs += build_lldp_tlv(5, system_name.encode())
    # System Description
    tlvs += build_lldp_tlv(6, b'NOP Core Switch')
    # Capabilities
    cap_bits = {'bridge': 4, 'router': 16}
    cap_val = sum(cap_bits.get(c, 0) for c in capabilities)
    tlvs += build_lldp_tlv(7, struct.pack('>HH', cap_val, cap_val))
    # Management Address
    if mgmt_ip:
        ip_bytes = bytes(map(int, mgmt_ip.split('.')))
        mgmt = struct.pack('BB', 5, 1) + ip_bytes + struct.pack('BI', 2, 1) + bytes([0])
        tlvs += build_lldp_tlv(8, mgmt)
    # End
    tlvs += struct.pack('>H', 0)
    return tlvs

class CoreSwitch:
    def __init__(self, args):
        self.args = args
        self.src_mac = get_mac(args.interface)
        self.running = True
        conf.verb = 0
        
    def send_stp(self):
        """Send STP BPDUs"""
        root_id = self.args.stp_priority if self.args.is_root else 4096
        root_mac = self.src_mac if self.args.is_root else "00:aa:bb:01:00:01"
        
        while self.running:
            try:
                stp = STP(
                    proto=0, version=0, bpdutype=0, bpduflags=0,
                    rootid=root_id, rootmac=root_mac,
                    pathcost=0 if self.args.is_root else 4,
                    bridgeid=self.args.stp_priority,
                    bridgemac=self.src_mac,
                    portid=0x8001, age=0, maxage=20, hellotime=2, fwddelay=15
                )
                frame = Ether(src=self.src_mac, dst=STP_MULTICAST) / LLC(dsap=0x42, ssap=0x42, ctrl=0x03) / stp
                sendp(frame, iface=self.args.interface, verbose=False)
                time.sleep(2)
            except Exception as e:
                print(f"[STP] Error: {e}")
                time.sleep(1)
    
    def send_lldp(self):
        """Send LLDP frames"""
        while self.running:
            try:
                lldp_data = build_lldp_frame(
                    self.src_mac, self.args.name,
                    self.args.lldp_ip, "GigabitEthernet0/1",
                    ['bridge', 'router']
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
                # VLAN-tagged broadcast
                frame = Ether(src=self.src_mac, dst="ff:ff:ff:ff:ff:ff") / \
                        Dot1Q(vlan=self.args.vlan) / \
                        IP(src=self.args.lldp_ip or "0.0.0.0", dst="255.255.255.255") / \
                        ICMP()
                sendp(frame, iface=self.args.interface, verbose=False)
                time.sleep(5)
            except Exception as e:
                print(f"[VLAN] Error: {e}")
                time.sleep(1)
    
    def run(self):
        print(f"[{self.args.name}] Starting Core Switch Simulator")
        print(f"[{self.args.name}] MAC: {self.src_mac}")
        print(f"[{self.args.name}] STP Priority: {self.args.stp_priority} (Root: {self.args.is_root})")
        print(f"[{self.args.name}] VLAN: {self.args.vlan}")
        
        threads = [
            threading.Thread(target=self.send_stp, daemon=True),
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
    switch = CoreSwitch(args)
    switch.run()

if __name__ == "__main__":
    main()
