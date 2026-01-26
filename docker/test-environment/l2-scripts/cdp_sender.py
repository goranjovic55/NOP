#!/usr/bin/env python3
"""
CDP Sender - Generates Cisco Discovery Protocol frames
Usage: python3 cdp_sender.py --device-id "router-01" --platform "Cisco IOS" --ip 192.168.1.1
"""
import argparse
import time
import struct
from scapy.all import Ether, LLC, SNAP, sendp, get_if_hwaddr, conf, Raw

# CDP multicast destination
CDP_MULTICAST_MAC = "01:00:0c:cc:cc:cc"

def parse_args():
    parser = argparse.ArgumentParser(description='CDP Sender')
    parser.add_argument('--device-id', type=str, required=True, help='Device ID (hostname)')
    parser.add_argument('--platform', type=str, default='Linux', help='Platform string')
    parser.add_argument('--port-id', type=str, default='eth0', help='Port ID')
    parser.add_argument('--ip', type=str, default=None, help='Management IP address')
    parser.add_argument('--capabilities', type=str, default='router', help='Capabilities')
    parser.add_argument('--software-version', type=str, default='1.0', help='Software version')
    parser.add_argument('--interval', type=float, default=60.0, help='CDP interval in seconds')
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

def ip_to_bytes(ip):
    """Convert IP string to bytes"""
    return bytes(map(int, ip.split('.')))

def build_cdp_tlv(tlv_type, value):
    """Build CDP TLV (Type-Length-Value)"""
    # CDP TLV: 2 bytes type + 2 bytes length (includes type+length) + value
    length = 4 + len(value)
    return struct.pack('>HH', tlv_type, length) + value

def calculate_checksum(data):
    """Calculate CDP checksum (16-bit one's complement)"""
    if len(data) % 2 == 1:
        data += b'\x00'
    
    checksum = 0
    for i in range(0, len(data), 2):
        word = (data[i] << 8) + data[i+1]
        checksum += word
        checksum = (checksum & 0xffff) + (checksum >> 16)
    
    return (~checksum) & 0xffff

def build_cdp_frame(device_id, platform, port_id, ip, capabilities, software_version):
    """Build complete CDP frame"""
    
    # CDP Header: Version (1 byte) + TTL (1 byte) + Checksum (2 bytes)
    version = 2  # CDPv2
    ttl = 180    # 180 seconds
    
    tlvs = b''
    
    # Device ID TLV (Type 0x0001)
    tlvs += build_cdp_tlv(0x0001, device_id.encode('utf-8'))
    
    # Addresses TLV (Type 0x0002)
    if ip:
        # Address format: num_addresses (4 bytes) + address entries
        # Each address: protocol_type (1) + protocol_length (1) + protocol (1-8) + address_length (2) + address
        addr_data = struct.pack('>I', 1)  # 1 address
        # IPv4 address entry
        addr_data += struct.pack('BB', 1, 1)  # Protocol type=NLPID, length=1
        addr_data += bytes([0xCC])  # IP protocol
        addr_data += struct.pack('>H', 4)  # Address length
        addr_data += ip_to_bytes(ip)
        tlvs += build_cdp_tlv(0x0002, addr_data)
    
    # Port ID TLV (Type 0x0003)
    tlvs += build_cdp_tlv(0x0003, port_id.encode('utf-8'))
    
    # Capabilities TLV (Type 0x0004)
    cap_bits = 0
    cap_map = {
        'router': 0x01,
        'tb-bridge': 0x02,
        'sr-bridge': 0x04,
        'switch': 0x08,
        'host': 0x10,
        'igmp': 0x20,
        'repeater': 0x40
    }
    for cap in capabilities.lower().split(','):
        cap = cap.strip()
        if cap in cap_map:
            cap_bits |= cap_map[cap]
    tlvs += build_cdp_tlv(0x0004, struct.pack('>I', cap_bits))
    
    # Software Version TLV (Type 0x0005)
    version_str = f"Software Version {software_version}"
    tlvs += build_cdp_tlv(0x0005, version_str.encode('utf-8'))
    
    # Platform TLV (Type 0x0006)
    tlvs += build_cdp_tlv(0x0006, platform.encode('utf-8'))
    
    # Build header with checksum
    # First build with zero checksum
    cdp_data = struct.pack('BBH', version, ttl, 0) + tlvs
    # Calculate checksum
    checksum = calculate_checksum(cdp_data)
    # Rebuild with correct checksum
    cdp_data = struct.pack('>BBH', version, ttl, checksum) + tlvs
    
    return cdp_data

def main():
    args = parse_args()
    
    src_mac = get_mac(args.interface)
    
    print(f"[CDP] Device ID: {args.device_id}")
    print(f"[CDP] Platform: {args.platform}")
    print(f"[CDP] Port ID: {args.port_id}")
    print(f"[CDP] IP: {args.ip}")
    print(f"[CDP] Capabilities: {args.capabilities}")
    print(f"[CDP] Source MAC: {src_mac}")
    print(f"[CDP] Sending CDP frames every {args.interval}s...")
    
    conf.verb = 0
    
    frame_count = 0
    while True:
        try:
            # Build CDP payload
            cdp_data = build_cdp_frame(
                device_id=args.device_id,
                platform=args.platform,
                port_id=args.port_id,
                ip=args.ip,
                capabilities=args.capabilities,
                software_version=args.software_version
            )
            
            # CDP uses LLC/SNAP encapsulation
            # SNAP OUI = 0x00000C (Cisco), Protocol = 0x2000 (CDP)
            frame = Ether(src=src_mac, dst=CDP_MULTICAST_MAC) / \
                    LLC(dsap=0xAA, ssap=0xAA, ctrl=0x03) / \
                    SNAP(OUI=0x00000C, code=0x2000) / \
                    Raw(load=cdp_data)
            
            sendp(frame, iface=args.interface, verbose=False)
            frame_count += 1
            
            print(f"[CDP] Sent {frame_count} frames")
            
            time.sleep(args.interval)
            
        except KeyboardInterrupt:
            print(f"\n[CDP] Stopped. Total frames sent: {frame_count}")
            break
        except Exception as e:
            print(f"[CDP] Error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
