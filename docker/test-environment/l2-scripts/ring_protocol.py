#!/usr/bin/env python3
"""
Ring Protocol Simulator - Generates REP, MRP, DLR, PRP, HSR protocol frames
Usage: python3 ring_protocol.py --protocol rep --node-id 1
"""
import argparse
import time
import struct
from scapy.all import Ether, sendp, get_if_hwaddr, conf, Raw

# Ring protocol multicast addresses
RING_PROTOCOLS = {
    'rep': {
        'mac': '01:00:0c:cc:cc:cd',  # Cisco REP
        'name': 'Resilient Ethernet Protocol',
        'ethertype': 0x0000  # Uses LLC/SNAP
    },
    'mrp': {
        'mac': '01:15:4e:00:00:01',  # IEC 62439-2 MRP
        'name': 'Media Redundancy Protocol',
        'ethertype': 0x88e3
    },
    'dlr': {
        'mac': '01:21:6c:00:00:01',  # EtherNet/IP DLR
        'name': 'Device Level Ring',
        'ethertype': 0x80e1
    },
    'prp': {
        'mac': '01:15:4e:00:01:00',  # IEC 62439-3 PRP
        'name': 'Parallel Redundancy Protocol',
        'ethertype': 0x88fb
    },
    'hsr': {
        'mac': '01:15:4e:00:01:01',  # IEC 62439-3 HSR
        'name': 'High-availability Seamless Redundancy',
        'ethertype': 0x892f
    }
}

def parse_args():
    parser = argparse.ArgumentParser(description='Ring Protocol Simulator')
    parser.add_argument('--protocol', type=str, choices=['rep', 'mrp', 'dlr', 'prp', 'hsr'], 
                        required=True, help='Ring protocol type')
    parser.add_argument('--node-id', type=int, default=1, help='Node ID in ring')
    parser.add_argument('--ring-id', type=int, default=1, help='Ring ID')
    parser.add_argument('--state', type=str, default='normal', 
                        choices=['normal', 'fault', 'recovery'], help='Ring state')
    parser.add_argument('--interval', type=float, default=1.0, help='Frame interval')
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

def build_rep_frame(node_id, ring_id, state):
    """Build Cisco REP frame (simplified)"""
    # REP uses TLV format after LLC/SNAP
    # This is a simplified representation
    state_codes = {'normal': 0x00, 'fault': 0x01, 'recovery': 0x02}
    
    data = struct.pack('>BBH', 
        0x01,  # Version
        state_codes.get(state, 0x00),  # State
        node_id  # Node ID
    )
    data += struct.pack('>H', ring_id)  # Ring ID
    data += b'REP-HELLO'  # Padding/marker
    
    return data

def build_mrp_frame(node_id, ring_id, state):
    """Build MRP frame (IEC 62439-2)"""
    state_codes = {'normal': 0x00, 'fault': 0x04, 'recovery': 0x03}
    
    # MRP PDU format (simplified)
    data = struct.pack('>BBBBH',
        0x00,  # Version
        0x01,  # Type: MRP_Test
        16,    # Length
        state_codes.get(state, 0x00),  # State
        ring_id  # Domain ID (ring ID)
    )
    data += struct.pack('>I', node_id)  # Priority
    data += struct.pack('>I', int(time.time() * 1000) & 0xFFFFFFFF)  # Timestamp
    
    return data

def build_dlr_frame(node_id, ring_id, state):
    """Build DLR frame (EtherNet/IP)"""
    state_codes = {'normal': 0x01, 'fault': 0x02, 'recovery': 0x03}
    
    # DLR Header
    data = struct.pack('>BBHBBH',
        0x01,  # EtherNet/IP encapsulation
        state_codes.get(state, 0x01),  # Ring state
        ring_id,  # Ring ID
        0x01,  # Frame type: Beacon
        node_id,  # Sequence number / node ID
        5000  # Beacon interval (5000 us)
    )
    
    return data

def build_prp_trailer(node_id, seq=0):
    """Build PRP Redundancy Control Trailer (RCT)"""
    # PRP RCT: 6 bytes appended to frame
    # Sequence number (2 bytes) + LAN ID + Size (2 bytes) + PRP suffix (2 bytes)
    lan_id = 0xA  # LAN A
    size = 64  # Frame size
    
    data = struct.pack('>HHH',
        seq & 0xFFFF,  # Sequence number
        (lan_id << 12) | (size & 0x0FFF),  # LSDU size with LAN ID
        0x88FB  # PRP suffix
    )
    
    return data

def build_hsr_tag(node_id, seq=0):
    """Build HSR Tag (6 bytes)"""
    # HSR Tag inserted after source MAC
    # Path + Size (2 bytes) + Sequence (2 bytes) + HSR suffix (2 bytes)
    path = 0x0  # Path indicator
    size = 64
    
    data = struct.pack('>HHH',
        (path << 12) | (size & 0x0FFF),
        seq & 0xFFFF,
        0x892F  # HSR ethertype
    )
    
    return data

def main():
    args = parse_args()
    
    protocol_info = RING_PROTOCOLS[args.protocol]
    src_mac = get_mac(args.interface)
    
    print(f"[{args.protocol.upper()}] Protocol: {protocol_info['name']}")
    print(f"[{args.protocol.upper()}] Multicast: {protocol_info['mac']}")
    print(f"[{args.protocol.upper()}] Node ID: {args.node_id}")
    print(f"[{args.protocol.upper()}] Ring ID: {args.ring_id}")
    print(f"[{args.protocol.upper()}] State: {args.state}")
    print(f"[{args.protocol.upper()}] Source MAC: {src_mac}")
    print(f"[{args.protocol.upper()}] Sending frames every {args.interval}s...")
    
    conf.verb = 0
    
    frame_count = 0
    seq = 0
    
    while True:
        try:
            # Build protocol-specific payload
            if args.protocol == 'rep':
                payload = build_rep_frame(args.node_id, args.ring_id, args.state)
                # REP uses LLC/SNAP
                from scapy.all import LLC, SNAP
                frame = Ether(src=src_mac, dst=protocol_info['mac']) / \
                        LLC(dsap=0xAA, ssap=0xAA, ctrl=0x03) / \
                        SNAP(OUI=0x00000C, code=0x2003) / \
                        Raw(load=payload)
            elif args.protocol == 'mrp':
                payload = build_mrp_frame(args.node_id, args.ring_id, args.state)
                frame = Ether(src=src_mac, dst=protocol_info['mac'], 
                             type=protocol_info['ethertype']) / Raw(load=payload)
            elif args.protocol == 'dlr':
                payload = build_dlr_frame(args.node_id, args.ring_id, args.state)
                frame = Ether(src=src_mac, dst=protocol_info['mac'],
                             type=protocol_info['ethertype']) / Raw(load=payload)
            elif args.protocol == 'prp':
                # PRP: Regular frame + RCT trailer
                from scapy.all import IP, ICMP
                payload = IP(src='172.30.0.100', dst='172.30.0.101') / ICMP()
                trailer = build_prp_trailer(args.node_id, seq)
                frame = Ether(src=src_mac, dst=protocol_info['mac'],
                             type=protocol_info['ethertype']) / payload / Raw(load=trailer)
            elif args.protocol == 'hsr':
                # HSR: Ethertype + HSR Tag + payload
                hsr_tag = build_hsr_tag(args.node_id, seq)
                payload = b'HSR Test Frame'
                frame = Ether(src=src_mac, dst=protocol_info['mac'],
                             type=protocol_info['ethertype']) / Raw(load=hsr_tag + payload)
            
            sendp(frame, iface=args.interface, verbose=False)
            frame_count += 1
            seq += 1
            
            if frame_count % 10 == 0:
                print(f"[{args.protocol.upper()}] Sent {frame_count} frames")
            
            time.sleep(args.interval)
            
        except KeyboardInterrupt:
            print(f"\n[{args.protocol.upper()}] Stopped. Total frames sent: {frame_count}")
            break
        except Exception as e:
            print(f"[{args.protocol.upper()}] Error: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(1)

if __name__ == "__main__":
    main()
