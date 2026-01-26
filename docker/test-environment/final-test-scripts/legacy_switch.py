#!/usr/bin/env python3
"""
Legacy Switch Simulator - Unmanaged L2-only device
Only has MAC address, no IP, no management protocols
Just forwards/generates ethernet frames for L2 detection
"""
import argparse
import time
import random
import threading
from scapy.all import Ether, ARP, sendp, conf, get_if_hwaddr, Raw

def parse_args():
    parser = argparse.ArgumentParser(description='Legacy Switch Simulator')
    parser.add_argument('--name', type=str, required=True)
    parser.add_argument('--mac', type=str, default='00:de:ad:be:ef:00')
    parser.add_argument('--interface', type=str, default='eth0')
    return parser.parse_args()

class LegacySwitch:
    """Unmanaged switch - L2 only, no IP stack"""
    
    def __init__(self, args):
        self.args = args
        # Use configured MAC or interface MAC
        try:
            self.src_mac = get_if_hwaddr(args.interface)
        except:
            self.src_mac = args.mac
        self.running = True
        conf.verb = 0
        
    def send_broadcast_frames(self):
        """Send broadcast ethernet frames for L2 visibility"""
        while self.running:
            try:
                # Generic broadcast frame (proprietary/unknown)
                # This simulates an unmanaged switch sending L2 traffic
                broadcast_data = bytes([0x00, 0x01, 0x02, 0x03]) + \
                                 self.args.name.encode() + \
                                 bytes([random.randint(0, 255) for _ in range(20)])
                
                frame = Ether(src=self.src_mac, dst="ff:ff:ff:ff:ff:ff", type=0x9999) / \
                        Raw(load=broadcast_data)
                sendp(frame, iface=self.args.interface, verbose=False)
                
                time.sleep(random.uniform(5, 10))
            except Exception as e:
                time.sleep(5)
    
    def send_arp_frames(self):
        """Send ARP frames (this is L2 traffic, no IP needed to send)"""
        while self.running:
            try:
                # ARP announcement for a fake host behind this switch
                # This shows the switch's MAC in L2 without having an IP
                arp_frame = Ether(src=self.src_mac, dst="ff:ff:ff:ff:ff:ff") / \
                            ARP(op=1,  # who-has
                                hwsrc=self.src_mac,
                                psrc="0.0.0.0",  # No IP
                                hwdst="00:00:00:00:00:00",
                                pdst="255.255.255.255")
                sendp(arp_frame, iface=self.args.interface, verbose=False)
                
                time.sleep(random.uniform(15, 30))
            except Exception as e:
                time.sleep(10)
    
    def send_spanning_tree(self):
        """Send minimal STP frames (many unmanaged switches still do BPDU forwarding)"""
        while self.running:
            try:
                # STP BPDU (very basic - just enough to be detected as L2 device)
                stp_mac = "01:80:c2:00:00:00"
                
                # LLC header
                llc = bytes([0x42, 0x42, 0x03])
                
                # Minimal STP BPDU (Configuration BPDU)
                bpdu = bytes([
                    0x00, 0x00,  # Protocol ID
                    0x00,        # Version
                    0x00,        # Type (Config)
                    0x00,        # Flags
                    0x80, 0x00,  # Root ID priority
                ]) + bytes.fromhex(self.src_mac.replace(':', '')) + bytes([
                    0x00, 0x00, 0x00, 0x00,  # Root path cost
                    0x80, 0x00,  # Bridge ID priority
                ]) + bytes.fromhex(self.src_mac.replace(':', '')) + bytes([
                    0x80, 0x01,  # Port ID
                    0x00, 0x14,  # Message age (20 sec)
                    0x00, 0x14,  # Max age (20 sec)
                    0x00, 0x02,  # Hello time (2 sec)
                    0x00, 0x0f,  # Forward delay (15 sec)
                ])
                
                frame = Ether(src=self.src_mac, dst=stp_mac, type=len(llc + bpdu)) / \
                        Raw(load=llc + bpdu)
                sendp(frame, iface=self.args.interface, verbose=False)
                print(f"[{self.args.name}] STP BPDU sent (L2 only)")
                
                time.sleep(2)  # STP hello interval
            except Exception as e:
                print(f"[{self.args.name}] STP error: {e}")
                time.sleep(5)
    
    def run(self):
        print(f"[{self.args.name}] Starting Legacy Switch Simulator (L2 ONLY)")
        print(f"[{self.args.name}] MAC: {self.src_mac}")
        print(f"[{self.args.name}] No IP address - pure L2 device")
        
        threads = [
            threading.Thread(target=self.send_broadcast_frames, daemon=True),
            threading.Thread(target=self.send_arp_frames, daemon=True),
            threading.Thread(target=self.send_spanning_tree, daemon=True),
        ]
        for t in threads:
            t.start()
        
        try:
            while True:
                time.sleep(10)
                print(f"[{self.args.name}] Legacy switch running (L2 only, no IP)...")
        except KeyboardInterrupt:
            self.running = False

def main():
    args = parse_args()
    switch = LegacySwitch(args)
    switch.run()

if __name__ == "__main__":
    main()
