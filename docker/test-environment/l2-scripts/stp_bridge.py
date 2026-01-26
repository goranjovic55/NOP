#!/usr/bin/env python3
"""
STP Bridge Simulator - Generates STP/RSTP BPDUs
Usage: python3 stp_bridge.py --bridge-id 4096 --mac 00:00:00:00:00:01 [--root]
"""
import argparse
import time
import socket
from scapy.all import Ether, LLC, STP, sendp, get_if_hwaddr, conf

# STP multicast destination
STP_MULTICAST_MAC = "01:80:c2:00:00:00"

def parse_args():
    parser = argparse.ArgumentParser(description='STP Bridge Simulator')
    parser.add_argument('--bridge-id', type=int, default=32768, help='Bridge priority (default: 32768)')
    parser.add_argument('--mac', type=str, default=None, help='Bridge MAC address')
    parser.add_argument('--root', action='store_true', help='Act as root bridge')
    parser.add_argument('--interval', type=float, default=2.0, help='Hello interval in seconds')
    parser.add_argument('--interface', type=str, default='eth0', help='Network interface')
    return parser.parse_args()

def get_mac(interface):
    """Get MAC address of interface"""
    try:
        return get_if_hwaddr(interface)
    except:
        # Fallback: read from /sys
        try:
            with open(f'/sys/class/net/{interface}/address') as f:
                return f.read().strip()
        except:
            return "00:00:00:00:00:99"

def create_stp_bpdu(bridge_id, bridge_mac, root_id, root_mac, path_cost=0, port_id=0x8001, is_root=False):
    """Create an STP Configuration BPDU"""
    
    # If we're root, our root is ourselves
    if is_root:
        root_id = bridge_id
        root_mac = bridge_mac
        path_cost = 0
    
    # BPDU flags: Topology Change (bit 0), Topology Change Ack (bit 7)
    bpdu_flags = 0x00
    
    # Create the STP layer
    # Note: Scapy STP fields are in seconds (not 1/256 units)
    stp = STP(
        proto=0,           # Protocol ID (always 0 for STP)
        version=0,         # 0 = STP, 2 = RSTP, 3 = MSTP
        bpdutype=0,        # 0 = Configuration BPDU
        bpduflags=bpdu_flags,
        rootid=root_id,
        rootmac=root_mac,
        pathcost=path_cost,
        bridgeid=bridge_id,
        bridgemac=bridge_mac,
        portid=port_id,
        age=0,
        maxage=20,    # 20 seconds
        hellotime=2,  # 2 seconds
        fwddelay=15   # 15 seconds
    )
    
    return stp

def main():
    args = parse_args()
    
    # Get source MAC
    src_mac = args.mac if args.mac else get_mac(args.interface)
    
    # Determine root bridge settings
    if args.root:
        root_id = args.bridge_id
        root_mac = src_mac
        path_cost = 0
        print(f"[STP] Starting as ROOT BRIDGE")
    else:
        # Non-root bridges point to the lowest ID bridge (4096)
        root_id = 4096
        root_mac = "00:00:00:00:00:01"  # Root bridge MAC
        path_cost = 19  # 100Mbps link cost
        print(f"[STP] Starting as NON-ROOT BRIDGE")
    
    print(f"[STP] Bridge ID: {args.bridge_id}")
    print(f"[STP] Bridge MAC: {src_mac}")
    print(f"[STP] Root ID: {root_id}")
    print(f"[STP] Root MAC: {root_mac}")
    print(f"[STP] Path Cost: {path_cost}")
    print(f"[STP] Interface: {args.interface}")
    print(f"[STP] Sending BPDUs every {args.interval}s...")
    
    conf.verb = 0  # Suppress scapy output
    
    bpdu_count = 0
    while True:
        try:
            # Create BPDU
            stp = create_stp_bpdu(
                bridge_id=args.bridge_id,
                bridge_mac=src_mac,
                root_id=root_id,
                root_mac=root_mac,
                path_cost=path_cost,
                is_root=args.root
            )
            
            # Build the full frame: Ether -> LLC -> STP
            frame = Ether(src=src_mac, dst=STP_MULTICAST_MAC, type=0x0000) / \
                    LLC(dsap=0x42, ssap=0x42, ctrl=0x03) / \
                    stp
            
            # For raw Ethernet, we need to use type field differently
            # Actually STP uses LLC, not raw Ethernet type
            frame = Ether(src=src_mac, dst=STP_MULTICAST_MAC) / \
                    LLC(dsap=0x42, ssap=0x42, ctrl=0x03) / \
                    stp
            
            sendp(frame, iface=args.interface, verbose=False)
            bpdu_count += 1
            
            if bpdu_count % 10 == 0:
                print(f"[STP] Sent {bpdu_count} BPDUs")
            
            time.sleep(args.interval)
            
        except KeyboardInterrupt:
            print(f"\n[STP] Stopped. Total BPDUs sent: {bpdu_count}")
            break
        except Exception as e:
            print(f"[STP] Error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
