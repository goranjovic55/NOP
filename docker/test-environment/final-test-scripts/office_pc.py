#!/usr/bin/env python3
"""
Office PC Simulator - Generates L3-L7 traffic typical of a workstation
TCP/UDP: HTTP, SSH, DNS, NTP
"""
import argparse
import time
import random
import threading
import socket
from scapy.all import Ether, IP, TCP, UDP, ICMP, DNS, DNSQR, sendp, send, get_if_hwaddr, conf, Raw, Dot1Q

def parse_args():
    parser = argparse.ArgumentParser(description='Office PC Simulator')
    parser.add_argument('--name', type=str, required=True)
    parser.add_argument('--vlan', type=int, default=10)
    parser.add_argument('--targets', type=str, default='')
    parser.add_argument('--protocols', type=str, default='http,ssh,dns')
    parser.add_argument('--interface', type=str, default='eth0')
    return parser.parse_args()

def get_mac(interface):
    try:
        return get_if_hwaddr(interface)
    except:
        with open(f'/sys/class/net/{interface}/address') as f:
            return f.read().strip()

def get_ip(interface):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "172.31.10.100"

class OfficePC:
    def __init__(self, args):
        self.args = args
        self.src_mac = get_mac(args.interface)
        self.src_ip = get_ip(args.interface)
        self.targets = [t.strip() for t in args.targets.split(',') if t.strip()]
        self.protocols = [p.strip() for p in args.protocols.split(',')]
        self.running = True
        conf.verb = 0
        
    def send_http_request(self, target):
        """Simulate HTTP GET request (L7)"""
        try:
            src_port = random.randint(40000, 60000)
            # TCP SYN
            syn = IP(src=self.src_ip, dst=target) / TCP(sport=src_port, dport=80, flags='S', seq=1000)
            send(syn, verbose=False)
            time.sleep(0.1)
            # HTTP GET (simulated)
            http_payload = b"GET / HTTP/1.1\r\nHost: " + target.encode() + b"\r\nUser-Agent: NOP-Test/1.0\r\n\r\n"
            pkt = IP(src=self.src_ip, dst=target) / TCP(sport=src_port, dport=80, flags='PA', seq=1001) / Raw(load=http_payload)
            send(pkt, verbose=False)
        except Exception as e:
            pass
    
    def send_https_request(self, target):
        """Simulate HTTPS (TLS) request (L5/L7)"""
        try:
            src_port = random.randint(40000, 60000)
            # TCP SYN to 443
            syn = IP(src=self.src_ip, dst=target) / TCP(sport=src_port, dport=443, flags='S', seq=2000)
            send(syn, verbose=False)
            time.sleep(0.1)
            # TLS Client Hello (simplified)
            tls_hello = bytes([0x16, 0x03, 0x01, 0x00, 0x05, 0x01, 0x00, 0x00, 0x01, 0x00])
            pkt = IP(src=self.src_ip, dst=target) / TCP(sport=src_port, dport=443, flags='PA', seq=2001) / Raw(load=tls_hello)
            send(pkt, verbose=False)
        except Exception as e:
            pass
    
    def send_ssh_connection(self, target):
        """Simulate SSH connection attempt (L7)"""
        try:
            src_port = random.randint(40000, 60000)
            syn = IP(src=self.src_ip, dst=target) / TCP(sport=src_port, dport=22, flags='S', seq=3000)
            send(syn, verbose=False)
            time.sleep(0.1)
            # SSH version banner
            ssh_banner = b"SSH-2.0-OpenSSH_8.9 NOP-Test\r\n"
            pkt = IP(src=self.src_ip, dst=target) / TCP(sport=src_port, dport=22, flags='PA', seq=3001) / Raw(load=ssh_banner)
            send(pkt, verbose=False)
        except Exception as e:
            pass
    
    def send_dns_query(self, target):
        """Simulate DNS query (L7)"""
        try:
            dns_query = IP(src=self.src_ip, dst=target) / \
                        UDP(sport=random.randint(1024, 65535), dport=53) / \
                        DNS(rd=1, qd=DNSQR(qname="nop.local"))
            send(dns_query, verbose=False)
        except Exception as e:
            pass
    
    def send_ntp_query(self, target):
        """Simulate NTP query (L7)"""
        try:
            ntp_data = bytes([0x1b] + [0]*47)  # NTP client request
            ntp_pkt = IP(src=self.src_ip, dst=target) / UDP(sport=random.randint(1024, 65535), dport=123) / Raw(load=ntp_data)
            send(ntp_pkt, verbose=False)
        except Exception as e:
            pass
    
    def send_icmp_ping(self, target):
        """Send ICMP ping (L3)"""
        try:
            ping = IP(src=self.src_ip, dst=target) / ICMP()
            send(ping, verbose=False)
        except Exception as e:
            pass
    
    def generate_traffic(self):
        """Main traffic generation loop"""
        while self.running:
            try:
                if not self.targets:
                    time.sleep(1)
                    continue
                    
                target = random.choice(self.targets)
                protocol = random.choice(self.protocols)
                
                # Always send ICMP for L3 visibility
                self.send_icmp_ping(target)
                
                if protocol == 'http':
                    self.send_http_request(target)
                elif protocol == 'https':
                    self.send_https_request(target)
                elif protocol == 'ssh':
                    self.send_ssh_connection(target)
                elif protocol == 'dns':
                    self.send_dns_query(target)
                elif protocol == 'ntp':
                    self.send_ntp_query(target)
                
                time.sleep(random.uniform(0.5, 2.0))
                
            except Exception as e:
                print(f"[Traffic] Error: {e}")
                time.sleep(1)
    
    def send_arp_announcements(self):
        """Send ARP for L2 visibility"""
        from scapy.all import ARP
        while self.running:
            try:
                arp = Ether(src=self.src_mac, dst="ff:ff:ff:ff:ff:ff") / \
                      ARP(hwsrc=self.src_mac, psrc=self.src_ip, hwdst="00:00:00:00:00:00", pdst=self.src_ip, op=1)
                sendp(arp, iface=self.args.interface, verbose=False)
                time.sleep(30)
            except Exception as e:
                time.sleep(5)
    
    def run(self):
        print(f"[{self.args.name}] Starting Office PC Simulator")
        print(f"[{self.args.name}] MAC: {self.src_mac}")
        print(f"[{self.args.name}] IP: {self.src_ip}")
        print(f"[{self.args.name}] VLAN: {self.args.vlan}")
        print(f"[{self.args.name}] Targets: {self.targets}")
        print(f"[{self.args.name}] Protocols: {self.protocols}")
        
        threads = [
            threading.Thread(target=self.generate_traffic, daemon=True),
            threading.Thread(target=self.send_arp_announcements, daemon=True),
        ]
        for t in threads:
            t.start()
        
        try:
            while True:
                time.sleep(10)
                print(f"[{self.args.name}] PC active, generating traffic...")
        except KeyboardInterrupt:
            self.running = False

def main():
    args = parse_args()
    pc = OfficePC(args)
    pc.run()

if __name__ == "__main__":
    main()
