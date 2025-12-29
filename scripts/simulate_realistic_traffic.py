#!/usr/bin/env python3
"""
Simulate realistic network traffic between test hosts
Creates a mix of:
- HTTP requests (web server)
- SSH connections
- Database queries
- File shares (SMB)
- ARP requests
- DNS queries
- Multicast (mDNS)
- Broadcast (DHCP-like)
"""

import time
import random
import threading
from scapy.all import (
    send, sendp, IP, TCP, UDP, ICMP, ARP, Ether,
    DNS, DNSQR, Raw
)

# Test host IPs on test-network (172.21.0.0/24)
HOSTS = {
    "web": "172.21.0.42",
    "ssh": "172.21.0.69",
    "db": "172.21.0.123",
    "file": "172.21.0.200",
    "rdp": "172.21.0.50",
    "vnc": "172.21.0.51",
    "ftp": "172.21.0.52",
}

# Simulated client IPs (these will appear as traffic sources)
CLIENTS = [
    "172.21.0.10",
    "172.21.0.11",
    "172.21.0.12",
    "172.21.0.15",
    "172.21.0.20",
]

# Gateway
GATEWAY = "172.21.0.1"

def simulate_http_traffic():
    """Simulate HTTP requests to web server"""
    client = random.choice(CLIENTS)
    server = HOSTS["web"]
    
    # SYN
    syn = IP(src=client, dst=server)/TCP(sport=random.randint(49152,65535), dport=80, flags="S")
    send(syn, verbose=False)
    
    # Simulated HTTP GET
    http_req = IP(src=client, dst=server)/TCP(sport=random.randint(49152,65535), dport=80, flags="PA")/Raw(b"GET / HTTP/1.1\r\nHost: webserver\r\n\r\n")
    send(http_req, verbose=False)
    
    print(f"[HTTP] {client} -> {server}:80")

def simulate_ssh_traffic():
    """Simulate SSH connection"""
    client = random.choice(CLIENTS)
    server = HOSTS["ssh"]
    
    # TCP SYN to SSH port
    syn = IP(src=client, dst=server)/TCP(sport=random.randint(49152,65535), dport=22, flags="S")
    send(syn, verbose=False)
    
    print(f"[SSH] {client} -> {server}:22")

def simulate_database_traffic():
    """Simulate MySQL connections"""
    client = random.choice([HOSTS["web"], HOSTS["ssh"]])  # Web/SSH server connecting to DB
    server = HOSTS["db"]
    
    # TCP to MySQL
    syn = IP(src=client, dst=server)/TCP(sport=random.randint(49152,65535), dport=3306, flags="S")
    send(syn, verbose=False)
    
    print(f"[MySQL] {client} -> {server}:3306")

def simulate_file_share_traffic():
    """Simulate SMB file share access"""
    client = random.choice(CLIENTS)
    server = HOSTS["file"]
    
    # SMB over TCP 445
    syn = IP(src=client, dst=server)/TCP(sport=random.randint(49152,65535), dport=445, flags="S")
    send(syn, verbose=False)
    
    print(f"[SMB] {client} -> {server}:445")

def simulate_rdp_traffic():
    """Simulate RDP connection"""
    client = random.choice(CLIENTS)
    server = HOSTS["rdp"]
    
    syn = IP(src=client, dst=server)/TCP(sport=random.randint(49152,65535), dport=3389, flags="S")
    send(syn, verbose=False)
    
    print(f"[RDP] {client} -> {server}:3389")

def simulate_vnc_traffic():
    """Simulate VNC connection"""
    client = random.choice(CLIENTS)
    server = HOSTS["vnc"]
    
    syn = IP(src=client, dst=server)/TCP(sport=random.randint(49152,65535), dport=5900, flags="S")
    send(syn, verbose=False)
    
    print(f"[VNC] {client} -> {server}:5900")

def simulate_ftp_traffic():
    """Simulate FTP connection"""
    client = random.choice(CLIENTS)
    server = HOSTS["ftp"]
    
    syn = IP(src=client, dst=server)/TCP(sport=random.randint(49152,65535), dport=21, flags="S")
    send(syn, verbose=False)
    
    print(f"[FTP] {client} -> {server}:21")

def simulate_dns_query():
    """Simulate DNS query"""
    client = random.choice(CLIENTS + list(HOSTS.values()))
    dns_server = GATEWAY
    
    domains = ["webserver.local", "ssh.local", "database.local", "fileserver.local"]
    domain = random.choice(domains)
    
    dns_pkt = IP(src=client, dst=dns_server)/UDP(sport=random.randint(49152,65535), dport=53)/DNS(rd=1, qd=DNSQR(qname=domain))
    send(dns_pkt, verbose=False)
    
    print(f"[DNS] {client} -> {dns_server} query: {domain}")

def simulate_arp_request():
    """Simulate ARP request (broadcast)"""
    src_ip = random.choice(CLIENTS + list(HOSTS.values()))
    target_ip = random.choice(list(HOSTS.values()) + [GATEWAY])
    
    arp_pkt = Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(op=1, psrc=src_ip, pdst=target_ip)
    sendp(arp_pkt, verbose=False)
    
    print(f"[ARP] Who has {target_ip}? Tell {src_ip}")

def simulate_multicast_mdns():
    """Simulate mDNS multicast traffic"""
    src = random.choice(list(HOSTS.values()))
    
    # mDNS query to 224.0.0.251
    mdns_pkt = IP(src=src, dst="224.0.0.251")/UDP(sport=5353, dport=5353)/DNS(rd=0, qd=DNSQR(qname="_http._tcp.local"))
    send(mdns_pkt, verbose=False)
    
    print(f"[mDNS] {src} -> 224.0.0.251 (multicast)")

def simulate_ssdp_discovery():
    """Simulate SSDP/UPnP discovery (multicast)"""
    src = random.choice(CLIENTS)
    
    ssdp_msg = b"M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 1\r\nST: ssdp:all\r\n\r\n"
    ssdp_pkt = IP(src=src, dst="239.255.255.250")/UDP(sport=random.randint(49152,65535), dport=1900)/Raw(ssdp_msg)
    send(ssdp_pkt, verbose=False)
    
    print(f"[SSDP] {src} -> 239.255.255.250 (UPnP discovery)")

def simulate_dhcp_discover():
    """Simulate DHCP discover (broadcast)"""
    src = random.choice(CLIENTS)
    
    dhcp_pkt = IP(src="0.0.0.0", dst="255.255.255.255")/UDP(sport=68, dport=67)/Raw(b"\x01\x01\x06\x00")
    send(dhcp_pkt, verbose=False)
    
    print(f"[DHCP] Broadcast discover from {src}")

def simulate_ping():
    """Simulate ICMP ping between hosts"""
    src = random.choice(CLIENTS + list(HOSTS.values()))
    dst = random.choice(list(HOSTS.values()) + [GATEWAY])
    
    if src != dst:
        ping = IP(src=src, dst=dst)/ICMP()
        send(ping, verbose=False)
        print(f"[PING] {src} -> {dst}")

def run_simulation(duration=60, intensity="medium"):
    """Run traffic simulation for specified duration"""
    
    # Traffic functions with weights (how often they occur)
    traffic_types = [
        (simulate_http_traffic, 25),      # HTTP is common
        (simulate_ssh_traffic, 10),       # SSH less common
        (simulate_database_traffic, 15),  # DB queries
        (simulate_file_share_traffic, 10),
        (simulate_rdp_traffic, 5),
        (simulate_vnc_traffic, 5),
        (simulate_ftp_traffic, 5),
        (simulate_dns_query, 20),         # DNS is very common
        (simulate_arp_request, 15),       # ARP happens frequently
        (simulate_multicast_mdns, 8),     # mDNS periodic
        (simulate_ssdp_discovery, 5),     # UPnP occasional
        (simulate_dhcp_discover, 2),      # DHCP rare
        (simulate_ping, 10),              # Pings
    ]
    
    # Flatten weighted list
    weighted_functions = []
    for func, weight in traffic_types:
        weighted_functions.extend([func] * weight)
    
    # Interval based on intensity
    intervals = {"low": 2.0, "medium": 0.5, "high": 0.1}
    interval = intervals.get(intensity, 0.5)
    
    print(f"\n{'='*60}")
    print(f"REALISTIC TRAFFIC SIMULATION")
    print(f"Duration: {duration}s | Intensity: {intensity}")
    print(f"Interval: {interval}s between packets")
    print(f"{'='*60}\n")
    
    start_time = time.time()
    packet_count = 0
    
    try:
        while time.time() - start_time < duration:
            # Pick random traffic type
            traffic_func = random.choice(weighted_functions)
            try:
                traffic_func()
                packet_count += 1
            except Exception as e:
                print(f"[ERROR] {e}")
            
            time.sleep(interval + random.uniform(-0.1, 0.3))
    except KeyboardInterrupt:
        print("\n[!] Simulation interrupted")
    
    print(f"\n{'='*60}")
    print(f"SIMULATION COMPLETE")
    print(f"Packets sent: {packet_count}")
    print(f"Duration: {time.time() - start_time:.1f}s")
    print(f"{'='*60}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Simulate realistic network traffic")
    parser.add_argument("--duration", "-d", type=int, default=60, help="Duration in seconds (default: 60)")
    parser.add_argument("--intensity", "-i", choices=["low", "medium", "high"], default="medium", help="Traffic intensity")
    
    args = parser.parse_args()
    
    run_simulation(duration=args.duration, intensity=args.intensity)
