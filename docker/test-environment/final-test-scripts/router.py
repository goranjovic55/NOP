#!/usr/bin/env python3
"""
Router Simulator - Inter-VLAN routing, CDP, LLDP
"""
import argparse
import time
import random
import threading
import struct
from scapy.all import Ether, IP, ICMP, send, sendp, conf, get_if_hwaddr, Raw

def parse_args():
    parser = argparse.ArgumentParser(description='Router Simulator')
    parser.add_argument('--name', type=str, required=True)
    parser.add_argument('--interface', type=str, default='eth0')
    return parser.parse_args()

def get_mac(iface):
    try:
        return get_if_hwaddr(iface)
    except:
        return "00:aa:bb:10:00:01"

class Router:
    def __init__(self, args):
        self.args = args
        self.src_mac = get_mac(args.interface)
        self.running = True
        conf.verb = 0
        
        # Router IPs on each VLAN
        self.vlan_ips = {
            0: "172.31.0.1",    # Core
            10: "172.31.10.1",  # Office
            20: "172.31.20.1",  # Industrial
        }
        
    def send_cdp(self):
        """Send Cisco Discovery Protocol frames"""
        cdp_mac = "01:00:0c:cc:cc:cc"
        while self.running:
            try:
                # CDP frame (LLC/SNAP + CDP)
                llc_snap = bytes([0xaa, 0xaa, 0x03, 0x00, 0x00, 0x0c, 0x20, 0x00])
                
                # CDP version 2, TTL 180
                cdp_header = bytes([0x02, 180, 0x00, 0x00])  # Checksum placeholder
                
                # Device ID TLV
                device_id = self.args.name.encode()
                device_tlv = struct.pack('>HH', 0x0001, 4 + len(device_id)) + device_id
                
                # Platform TLV
                platform = b"Cisco Router"
                platform_tlv = struct.pack('>HH', 0x0006, 4 + len(platform)) + platform
                
                # Capabilities TLV (Router capability = 0x01)
                caps_tlv = struct.pack('>HHI', 0x0004, 8, 0x01)
                
                # Port ID TLV
                port = b"GigabitEthernet0/0"
                port_tlv = struct.pack('>HH', 0x0003, 4 + len(port)) + port
                
                # Management Address TLV
                mgmt_ip = bytes([int(x) for x in self.vlan_ips[0].split('.')])
                addr_tlv = struct.pack('>HH', 0x0016, 17) + bytes([
                    0x00, 0x00, 0x00, 0x01,  # Number of addresses
                    0x01,  # Protocol type (NLPID)
                    0x01,  # Protocol length
                    0xcc,  # IP
                    0x04,  # Address length
                ]) + mgmt_ip
                
                cdp_data = cdp_header + device_tlv + platform_tlv + caps_tlv + port_tlv + addr_tlv
                
                frame = Ether(src=self.src_mac, dst=cdp_mac, type=len(llc_snap + cdp_data)) / \
                        Raw(load=llc_snap + cdp_data)
                sendp(frame, iface=self.args.interface, verbose=False)
                print(f"[{self.args.name}] CDP sent")
                
                time.sleep(60)
            except Exception as e:
                print(f"[{self.args.name}] CDP error: {e}")
                time.sleep(30)
    
    def send_lldp(self):
        """Send LLDP frames"""
        lldp_mac = "01:80:c2:00:00:0e"
        while self.running:
            try:
                # Chassis ID TLV
                chassis_tlv = bytes([0x02, 7, 0x04]) + bytes.fromhex(self.src_mac.replace(':', ''))
                
                # Port ID TLV
                port_id = b"eth0"
                port_tlv = bytes([0x04, 1 + len(port_id), 0x05]) + port_id
                
                # TTL TLV
                ttl_tlv = bytes([0x06, 2, 0x00, 120])
                
                # System Name TLV
                sys_name = self.args.name.encode()
                name_tlv = bytes([0x0a, len(sys_name)]) + sys_name
                
                # System Capabilities TLV (Router)
                caps_tlv = bytes([0x0e, 4, 0x00, 0x14, 0x00, 0x14])
                
                # Management Address TLV
                mgmt_ip = bytes([int(x) for x in self.vlan_ips[0].split('.')])
                mgmt_tlv = bytes([0x10, 12, 5, 1, 4]) + mgmt_ip + bytes([1, 0, 0, 0, 0])
                
                # End TLV
                end_tlv = bytes([0x00, 0x00])
                
                lldp_data = chassis_tlv + port_tlv + ttl_tlv + name_tlv + caps_tlv + mgmt_tlv + end_tlv
                
                frame = Ether(src=self.src_mac, dst=lldp_mac, type=0x88cc) / Raw(load=lldp_data)
                sendp(frame, iface=self.args.interface, verbose=False)
                print(f"[{self.args.name}] LLDP sent")
                
                time.sleep(30)
            except Exception as e:
                print(f"[{self.args.name}] LLDP error: {e}")
                time.sleep(15)
    
    def simulate_routing(self):
        """Simulate inter-VLAN routing by sending ICMP redirects and forwarded packets"""
        while self.running:
            try:
                # Send ICMP echo reply as if routing between VLANs
                for vlan, ip in self.vlan_ips.items():
                    pkt = IP(src=ip, dst="255.255.255.255") / ICMP(type=0, code=0)
                    send(pkt, verbose=False)
                
                time.sleep(10)
            except Exception as e:
                time.sleep(5)
    
    def run(self):
        print(f"[{self.args.name}] Starting Router Simulator")
        print(f"[{self.args.name}] MAC: {self.src_mac}")
        print(f"[{self.args.name}] VLAN IPs: {self.vlan_ips}")
        
        threads = [
            threading.Thread(target=self.send_cdp, daemon=True),
            threading.Thread(target=self.send_lldp, daemon=True),
            threading.Thread(target=self.simulate_routing, daemon=True),
        ]
        for t in threads:
            t.start()
        
        try:
            while True:
                time.sleep(10)
                print(f"[{self.args.name}] Router running...")
        except KeyboardInterrupt:
            self.running = False

def main():
    args = parse_args()
    router = Router(args)
    router.run()

if __name__ == "__main__":
    main()
