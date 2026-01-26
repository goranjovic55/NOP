#!/usr/bin/env python3
"""
LLDP Sender - Generates LLDP frames for neighbor discovery
Usage: python3 lldp_sender.py --system-name "switch-01" --mgmt-ip 192.168.1.1
"""
import argparse
import time
import struct
from scapy.all import Ether, sendp, get_if_hwaddr, conf, Raw

# LLDP multicast destination
LLDP_MULTICAST_MAC = "01:80:c2:00:00:0e"
LLDP_ETHERTYPE = 0x88cc

def parse_args():
    parser = argparse.ArgumentParser(description='LLDP Sender')
    parser.add_argument('--system-name', type=str, required=True, help='System name')
    parser.add_argument('--system-desc', type=str, default='Network Device', help='System description')
    parser.add_argument('--mgmt-ip', type=str, default=None, help='Management IP address')
    parser.add_argument('--port-id', type=str, default='eth0', help='Port ID')
    parser.add_argument('--capabilities', type=str, default='bridge', help='Capabilities (comma-separated)')
    parser.add_argument('--interval', type=float, default=30.0, help='LLDP interval in seconds')
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

def mac_to_bytes(mac):
    """Convert MAC string to bytes"""
    return bytes.fromhex(mac.replace(':', ''))

def ip_to_bytes(ip):
    """Convert IP string to bytes"""
    return bytes(map(int, ip.split('.')))

def build_tlv(tlv_type, value):
    """Build LLDP TLV (Type-Length-Value)"""
    length = len(value)
    # TLV header: type (7 bits) + length (9 bits) = 2 bytes
    header = (tlv_type << 9) | length
    return struct.pack('>H', header) + value

def build_lldp_frame(src_mac, system_name, system_desc, port_id, mgmt_ip, capabilities):
    """Build complete LLDP frame"""
    
    tlvs = b''
    
    # 1. Chassis ID TLV (Type 1) - MAC address subtype
    chassis_id = bytes([4]) + mac_to_bytes(src_mac)  # Subtype 4 = MAC address
    tlvs += build_tlv(1, chassis_id)
    
    # 2. Port ID TLV (Type 2) - Interface name subtype
    port_id_tlv = bytes([5]) + port_id.encode('utf-8')  # Subtype 5 = Interface name
    tlvs += build_tlv(2, port_id_tlv)
    
    # 3. TTL TLV (Type 3)
    ttl = struct.pack('>H', 120)  # 120 seconds TTL
    tlvs += build_tlv(3, ttl)
    
    # 4. Port Description TLV (Type 4) - Optional
    port_desc = f"Port {port_id}".encode('utf-8')
    tlvs += build_tlv(4, port_desc)
    
    # 5. System Name TLV (Type 5)
    tlvs += build_tlv(5, system_name.encode('utf-8'))
    
    # 6. System Description TLV (Type 6)
    tlvs += build_tlv(6, system_desc.encode('utf-8'))
    
    # 7. System Capabilities TLV (Type 7)
    cap_bits = 0
    enabled_caps = 0
    cap_map = {
        'other': 0x0001,
        'repeater': 0x0002,
        'bridge': 0x0004,
        'wlan': 0x0008,
        'router': 0x0010,
        'telephone': 0x0020,
        'docsis': 0x0040,
        'station': 0x0080
    }
    for cap in capabilities:
        if cap.lower() in cap_map:
            cap_bits |= cap_map[cap.lower()]
            enabled_caps |= cap_map[cap.lower()]  # Assume all caps are enabled
    
    caps_tlv = struct.pack('>HH', cap_bits, enabled_caps)
    tlvs += build_tlv(7, caps_tlv)
    
    # 8. Management Address TLV (Type 8) - Optional
    if mgmt_ip:
        # Management address format:
        # 1 byte: addr string length (including subtype)
        # 1 byte: addr subtype (1 = IPv4)
        # 4 bytes: IPv4 address
        # 1 byte: interface numbering subtype (2 = ifIndex)
        # 4 bytes: interface number
        # 1 byte: OID string length (0 = none)
        addr_bytes = ip_to_bytes(mgmt_ip)
        mgmt_tlv = struct.pack('BB', 5, 1) + addr_bytes  # Length=5, subtype=IPv4
        mgmt_tlv += struct.pack('BI', 2, 1)  # ifIndex subtype, interface 1
        mgmt_tlv += bytes([0])  # No OID
        tlvs += build_tlv(8, mgmt_tlv)
    
    # 9. End of LLDPDU TLV (Type 0, Length 0)
    tlvs += struct.pack('>H', 0)
    
    return tlvs

def main():
    args = parse_args()
    
    src_mac = get_mac(args.interface)
    capabilities = [c.strip() for c in args.capabilities.split(',')]
    
    print(f"[LLDP] System Name: {args.system_name}")
    print(f"[LLDP] System Desc: {args.system_desc}")
    print(f"[LLDP] Port ID: {args.port_id}")
    print(f"[LLDP] Mgmt IP: {args.mgmt_ip}")
    print(f"[LLDP] Capabilities: {capabilities}")
    print(f"[LLDP] Source MAC: {src_mac}")
    print(f"[LLDP] Sending LLDP frames every {args.interval}s...")
    
    conf.verb = 0
    
    frame_count = 0
    while True:
        try:
            # Build LLDP payload
            lldp_data = build_lldp_frame(
                src_mac=src_mac,
                system_name=args.system_name,
                system_desc=args.system_desc,
                port_id=args.port_id,
                mgmt_ip=args.mgmt_ip,
                capabilities=capabilities
            )
            
            # Create Ethernet frame with LLDP
            frame = Ether(src=src_mac, dst=LLDP_MULTICAST_MAC, type=LLDP_ETHERTYPE) / Raw(load=lldp_data)
            
            sendp(frame, iface=args.interface, verbose=False)
            frame_count += 1
            
            if frame_count % 2 == 0:
                print(f"[LLDP] Sent {frame_count} frames")
            
            time.sleep(args.interval)
            
        except KeyboardInterrupt:
            print(f"\n[LLDP] Stopped. Total frames sent: {frame_count}")
            break
        except Exception as e:
            print(f"[LLDP] Error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
