#!/usr/bin/env python3
"""
VLAN Traffic Generator - Generates 802.1Q tagged frames
Usage: python3 vlan_traffic.py --vlan-id 10 --dest-ip 192.168.1.1
"""
import argparse
import time
from scapy.all import Ether, Dot1Q, IP, UDP, ICMP, sendp, get_if_hwaddr, conf, ARP

def parse_args():
    parser = argparse.ArgumentParser(description='VLAN Traffic Generator')
    parser.add_argument('--vlan-id', type=int, required=True, help='VLAN ID (1-4094)')
    parser.add_argument('--priority', type=int, default=0, help='802.1p priority (0-7)')
    parser.add_argument('--dest-ip', type=str, default=None, help='Destination IP')
    parser.add_argument('--dest-mac', type=str, default=None, help='Destination MAC')
    parser.add_argument('--interval', type=float, default=2.0, help='Interval in seconds')
    parser.add_argument('--interface', type=str, default='eth0', help='Network interface')
    return parser.parse_args()

def get_mac(interface):
    """Get MAC address of interface"""
    try:
        return get_if_hwaddr(interface)
    except:
        try:
            with open(f'/sys/class/net/{interface}/address') as f:
                return f.read().strip()
        except:
            return "00:00:00:00:00:99"

def get_ip(interface):
    """Get IP address of interface"""
    import socket
    import fcntl
    import struct
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        return socket.inet_ntoa(fcntl.ioctl(
            s.fileno(),
            0x8915,  # SIOCGIFADDR
            struct.pack('256s', interface[:15].encode('utf-8'))
        )[20:24])
    except:
        return "172.30.0.100"

def main():
    args = parse_args()
    
    src_mac = get_mac(args.interface)
    src_ip = get_ip(args.interface)
    
    # Determine destination
    if args.dest_mac:
        dst_mac = args.dest_mac
    else:
        dst_mac = "ff:ff:ff:ff:ff:ff"  # Broadcast if no dest specified
    
    dst_ip = args.dest_ip if args.dest_ip else "255.255.255.255"
    
    print(f"[VLAN] VLAN ID: {args.vlan_id}")
    print(f"[VLAN] Priority: {args.priority}")
    print(f"[VLAN] Source MAC: {src_mac}")
    print(f"[VLAN] Source IP: {src_ip}")
    print(f"[VLAN] Dest MAC: {dst_mac}")
    print(f"[VLAN] Dest IP: {dst_ip}")
    print(f"[VLAN] Sending tagged frames every {args.interval}s...")
    
    conf.verb = 0
    
    frame_count = 0
    while True:
        try:
            # Create 802.1Q tagged frame with different traffic types
            
            # Type 1: VLAN-tagged ICMP
            icmp_frame = Ether(src=src_mac, dst=dst_mac) / \
                         Dot1Q(vlan=args.vlan_id, prio=args.priority) / \
                         IP(src=src_ip, dst=dst_ip) / \
                         ICMP()
            sendp(icmp_frame, iface=args.interface, verbose=False)
            
            # Type 2: VLAN-tagged UDP
            udp_frame = Ether(src=src_mac, dst=dst_mac) / \
                        Dot1Q(vlan=args.vlan_id, prio=args.priority) / \
                        IP(src=src_ip, dst=dst_ip) / \
                        UDP(sport=12345, dport=8000) / \
                        f"VLAN{args.vlan_id} Traffic".encode()
            sendp(udp_frame, iface=args.interface, verbose=False)
            
            # Type 3: VLAN-tagged ARP (broadcast)
            arp_frame = Ether(src=src_mac, dst="ff:ff:ff:ff:ff:ff") / \
                        Dot1Q(vlan=args.vlan_id, prio=args.priority) / \
                        ARP(op="who-has", psrc=src_ip, pdst=dst_ip, hwsrc=src_mac)
            sendp(arp_frame, iface=args.interface, verbose=False)
            
            frame_count += 3
            
            if frame_count % 15 == 0:
                print(f"[VLAN{args.vlan_id}] Sent {frame_count} tagged frames")
            
            time.sleep(args.interval)
            
        except KeyboardInterrupt:
            print(f"\n[VLAN] Stopped. Total frames sent: {frame_count}")
            break
        except Exception as e:
            print(f"[VLAN] Error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
