#!/usr/bin/env python3
"""
Generate test network traffic to verify passive discovery filtering
Creates unicast, multicast, and broadcast packets
"""

import socket
import struct
import time
import argparse
from scapy.all import send, IP, UDP, ICMP, Ether, ARP, sendp

def generate_unicast_traffic(target_ip: str, count: int = 10):
    """Generate unicast UDP packets to specific IP"""
    print(f"[*] Generating {count} unicast packets to {target_ip}")
    
    for i in range(count):
        # UDP unicast
        pkt = IP(dst=target_ip)/UDP(dport=9999)/f"Unicast test packet {i}"
        send(pkt, verbose=False)
        time.sleep(0.5)
    
    print(f"[✓] Sent {count} unicast packets to {target_ip}")

def generate_multicast_traffic(group: str = "224.0.0.251", count: int = 10):
    """Generate multicast packets (mDNS default group)"""
    print(f"[*] Generating {count} multicast packets to {group}")
    
    for i in range(count):
        # Multicast UDP (mDNS)
        pkt = IP(dst=group)/UDP(sport=5353, dport=5353)/f"Multicast test packet {i}"
        send(pkt, verbose=False)
        time.sleep(0.5)
    
    print(f"[✓] Sent {count} multicast packets to {group}")

def generate_broadcast_traffic(broadcast_ip: str = "255.255.255.255", count: int = 10):
    """Generate broadcast packets"""
    print(f"[*] Generating {count} broadcast packets to {broadcast_ip}")
    
    for i in range(count):
        # UDP broadcast
        pkt = IP(dst=broadcast_ip)/UDP(dport=67)/f"Broadcast test packet {i}"
        send(pkt, verbose=False)
        time.sleep(0.5)
    
    print(f"[✓] Sent {count} broadcast packets to {broadcast_ip}")

def generate_arp_traffic(target_ip: str, count: int = 5):
    """Generate ARP broadcast packets"""
    print(f"[*] Generating {count} ARP requests for {target_ip}")
    
    for i in range(count):
        # ARP broadcast
        pkt = Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst=target_ip)
        sendp(pkt, verbose=False)
        time.sleep(0.5)
    
    print(f"[✓] Sent {count} ARP broadcast packets")

def generate_link_local_traffic(count: int = 10):
    """Generate link-local traffic (169.254.x.x)"""
    print(f"[*] Generating {count} link-local packets")
    
    for i in range(count):
        # Link-local unicast
        pkt = IP(dst="169.254.1.1")/ICMP()/f"Link-local test packet {i}"
        send(pkt, verbose=False)
        time.sleep(0.5)
    
    print(f"[✓] Sent {count} link-local packets")

def generate_all_types(target_ip: str, network: str = "172.21.0.255"):
    """Generate all traffic types for comprehensive testing"""
    print("\n" + "="*60)
    print("COMPREHENSIVE TRAFFIC TEST")
    print("="*60 + "\n")
    
    # 1. Unicast traffic
    print("\n[1/5] UNICAST TRAFFIC")
    print("-" * 40)
    generate_unicast_traffic(target_ip, count=5)
    
    # 2. Multicast traffic
    print("\n[2/5] MULTICAST TRAFFIC")
    print("-" * 40)
    generate_multicast_traffic("224.0.0.251", count=5)  # mDNS
    generate_multicast_traffic("239.255.255.250", count=3)  # SSDP
    
    # 3. Broadcast traffic
    print("\n[3/5] BROADCAST TRAFFIC")
    print("-" * 40)
    generate_broadcast_traffic(network, count=5)
    generate_broadcast_traffic("255.255.255.255", count=3)
    
    # 4. ARP broadcast
    print("\n[4/5] ARP BROADCAST")
    print("-" * 40)
    generate_arp_traffic(target_ip, count=5)
    
    # 5. Link-local traffic
    print("\n[5/5] LINK-LOCAL TRAFFIC")
    print("-" * 40)
    generate_link_local_traffic(count=5)
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)
    print("\n[✓] All traffic types generated")
    print("\n[INFO] Check passive discovery to verify filtering:")
    print("  - Unicast destinations should appear (if filter_unicast=False)")
    print("  - Multicast should be filtered (if filter_multicast=True)")
    print("  - Broadcast should be filtered (if filter_broadcast=True)")

def main():
    parser = argparse.ArgumentParser(
        description="Generate test network traffic for passive discovery testing"
    )
    parser.add_argument(
        "--target", "-t",
        default="172.21.0.10",
        help="Target IP for unicast traffic (default: 172.21.0.10)"
    )
    parser.add_argument(
        "--network", "-n",
        default="172.21.0.255",
        help="Network broadcast address (default: 172.21.0.255)"
    )
    parser.add_argument(
        "--type",
        choices=["unicast", "multicast", "broadcast", "arp", "link-local", "all"],
        default="all",
        help="Type of traffic to generate (default: all)"
    )
    parser.add_argument(
        "--count", "-c",
        type=int,
        default=10,
        help="Number of packets per type (default: 10)"
    )
    
    args = parser.parse_args()
    
    try:
        if args.type == "all":
            generate_all_types(args.target, args.network)
        elif args.type == "unicast":
            generate_unicast_traffic(args.target, args.count)
        elif args.type == "multicast":
            generate_multicast_traffic(count=args.count)
        elif args.type == "broadcast":
            generate_broadcast_traffic(args.network, args.count)
        elif args.type == "arp":
            generate_arp_traffic(args.target, args.count)
        elif args.type == "link-local":
            generate_link_local_traffic(args.count)
    
    except KeyboardInterrupt:
        print("\n[!] Interrupted by user")
    except Exception as e:
        print(f"\n[✗] Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
