#!/usr/bin/env python3
"""
Test script for passive discovery broadcast filtering
Generates various types of network traffic to test filter behavior
"""

import socket
import struct
import time
import argparse
from scapy.all import IP, UDP, ICMP, TCP, send, conf

def get_network_info():
    """Get current network interface and subnet"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Connect to external address to determine local IP
        s.connect(('8.8.8.8', 80))
        local_ip = s.getsockname()[0]
        s.close()
        
        # Calculate broadcast address (assumes /24)
        ip_parts = local_ip.split('.')
        broadcast_ip = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.255"
        
        return local_ip, broadcast_ip
    except Exception as e:
        print(f"Error getting network info: {e}")
        return None, None

def send_unicast_traffic(local_ip, count=5):
    """Send legitimate unicast traffic"""
    print(f"\n[UNICAST] Sending {count} packets to legitimate unicast addresses...")
    
    # Generate some unicast IPs in the same subnet
    ip_parts = local_ip.split('.')
    base = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}"
    
    targets = [
        f"{base}.10",
        f"{base}.20",
        f"{base}.30",
        "8.8.8.8",  # External unicast
        "1.1.1.1"   # External unicast
    ]
    
    for target in targets[:count]:
        try:
            # Send ICMP echo request
            packet = IP(dst=target)/ICMP()
            send(packet, verbose=False)
            print(f"  ✓ Sent unicast packet to {target}")
            time.sleep(0.2)
        except Exception as e:
            print(f"  ✗ Error sending to {target}: {e}")

def send_broadcast_traffic(broadcast_ip, count=5):
    """Send broadcast traffic"""
    print(f"\n[BROADCAST] Sending {count} packets to broadcast addresses...")
    
    broadcasts = [
        broadcast_ip,           # Subnet broadcast
        "255.255.255.255",      # Limited broadcast
    ]
    
    for i in range(count):
        target = broadcasts[i % len(broadcasts)]
        try:
            # Send UDP to broadcast address
            packet = IP(dst=target)/UDP(dport=12345, sport=54321)/f"Broadcast test {i}"
            send(packet, verbose=False)
            print(f"  ✓ Sent broadcast packet to {target}")
            time.sleep(0.2)
        except Exception as e:
            print(f"  ✗ Error sending broadcast to {target}: {e}")

def send_multicast_traffic(count=5):
    """Send multicast traffic"""
    print(f"\n[MULTICAST] Sending {count} packets to multicast addresses...")
    
    multicasts = [
        "224.0.0.1",    # All hosts on subnet
        "224.0.0.2",    # All routers on subnet
        "224.0.0.251",  # mDNS
        "239.255.255.250",  # SSDP
    ]
    
    for i in range(count):
        target = multicasts[i % len(multicasts)]
        try:
            # Send UDP to multicast address
            packet = IP(dst=target)/UDP(dport=5353, sport=54321)/f"Multicast test {i}"
            send(packet, verbose=False)
            print(f"  ✓ Sent multicast packet to {target}")
            time.sleep(0.2)
        except Exception as e:
            print(f"  ✗ Error sending multicast to {target}: {e}")

def send_link_local_traffic(count=3):
    """Send link-local traffic"""
    print(f"\n[LINK-LOCAL] Sending {count} packets to link-local addresses...")
    
    link_locals = [
        "169.254.1.1",
        "169.254.10.10",
        "169.254.255.254",
    ]
    
    for i in range(count):
        target = link_locals[i % len(link_locals)]
        try:
            # Send ICMP to link-local address
            packet = IP(dst=target)/ICMP()
            send(packet, verbose=False)
            print(f"  ✓ Sent link-local packet to {target}")
            time.sleep(0.2)
        except Exception as e:
            print(f"  ✗ Error sending to link-local {target}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Test passive discovery broadcast filtering")
    parser.add_argument('--unicast', type=int, default=5, help='Number of unicast packets (default: 5)')
    parser.add_argument('--broadcast', type=int, default=5, help='Number of broadcast packets (default: 5)')
    parser.add_argument('--multicast', type=int, default=5, help='Number of multicast packets (default: 5)')
    parser.add_argument('--link-local', type=int, default=3, help='Number of link-local packets (default: 3)')
    parser.add_argument('--all', action='store_true', help='Send all types of traffic')
    parser.add_argument('--interface', type=str, help='Network interface to use')
    
    args = parser.parse_args()
    
    # Set interface if specified
    if args.interface:
        conf.iface = args.interface
        print(f"Using interface: {args.interface}")
    
    # Get network information
    local_ip, broadcast_ip = get_network_info()
    if not local_ip:
        print("Could not determine network information. Using defaults.")
        local_ip = "172.21.0.2"
        broadcast_ip = "172.21.0.255"
    
    print(f"Local IP: {local_ip}")
    print(f"Broadcast IP: {broadcast_ip}")
    print("\n" + "="*60)
    print("PASSIVE DISCOVERY BROADCAST FILTER TEST")
    print("="*60)
    print("\nInstructions:")
    print("1. Check current passive discovery hosts: GET /api/discovery/passive-discovery")
    print("2. Run this script with filter OFF in settings")
    print("3. Observe: broadcast/multicast IPs appear in discovered hosts")
    print("4. Clear discovered hosts (restart backend or clear cache)")
    print("5. Enable filter in settings (Filter Broadcast from Passive Discovery)")
    print("6. Run this script again")
    print("7. Observe: only legitimate unicast IPs appear in discovered hosts")
    print("\n" + "="*60)
    
    if args.all or args.unicast > 0:
        send_unicast_traffic(local_ip, args.unicast)
    
    if args.all or args.broadcast > 0:
        send_broadcast_traffic(broadcast_ip, args.broadcast)
    
    if args.all or args.multicast > 0:
        send_multicast_traffic(args.multicast)
    
    if args.all or args.link_local > 0:
        send_link_local_traffic(args.link_local)
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)
    print("\nExpected Results:")
    print("  Filter OFF: Should discover ~15-20 IPs (including broadcast/multicast)")
    print("  Filter ON:  Should discover ~5-7 IPs (only legitimate unicast)")
    print("\nCheck discovered hosts: GET /api/discovery/passive-discovery")
    print("Or check in UI: Assets page with passive discovery enabled")

if __name__ == "__main__":
    main()
