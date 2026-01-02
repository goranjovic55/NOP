---
name: protocol-dissection
description: Multi-layer network protocol dissection patterns using Scapy. Use when parsing network packets.
---

# Protocol Dissection Pattern

## When to Use
- Parsing network packets
- Extracting protocol information
- Building packet analysis tools
- Creating protocol-specific filters

## Pattern
Layer-by-layer packet dissection

## Checklist
- [ ] Parse from Layer 2 upward
- [ ] Check layer existence before parsing
- [ ] Return structured dictionary
- [ ] Include application layer detection

## Example

### Multi-Layer Dissection
```python
from scapy.all import Ether, IP, IPv6, ARP, TCP, UDP, ICMP, DNS, HTTP

def dissect_packet(packet) -> dict:
    """Dissect packet into structured layers."""
    layers = {
        "timestamp": packet.time,
        "length": len(packet)
    }
    
    # Layer 2 (Ethernet)
    if packet.haslayer(Ether):
        layers['ethernet'] = {
            "src": packet[Ether].src,
            "dst": packet[Ether].dst,
            "type": packet[Ether].type
        }
    
    # Layer 3 (Network)
    if packet.haslayer(IP):
        layers['ip'] = {
            "version": 4,
            "src": packet[IP].src,
            "dst": packet[IP].dst,
            "protocol": packet[IP].proto,
            "ttl": packet[IP].ttl
        }
    elif packet.haslayer(IPv6):
        layers['ip'] = {
            "version": 6,
            "src": packet[IPv6].src,
            "dst": packet[IPv6].dst,
            "next_header": packet[IPv6].nh
        }
    elif packet.haslayer(ARP):
        layers['arp'] = {
            "operation": packet[ARP].op,
            "src_ip": packet[ARP].psrc,
            "src_mac": packet[ARP].hwsrc,
            "dst_ip": packet[ARP].pdst,
            "dst_mac": packet[ARP].hwdst
        }
    
    # Layer 4 (Transport)
    if packet.haslayer(TCP):
        layers['tcp'] = {
            "src_port": packet[TCP].sport,
            "dst_port": packet[TCP].dport,
            "flags": packet[TCP].flags,
            "seq": packet[TCP].seq,
            "ack": packet[TCP].ack
        }
        layers['app_protocol'] = detect_app_protocol(packet)
    elif packet.haslayer(UDP):
        layers['udp'] = {
            "src_port": packet[UDP].sport,
            "dst_port": packet[UDP].dport,
            "length": packet[UDP].len
        }
        layers['app_protocol'] = detect_app_protocol(packet)
    elif packet.haslayer(ICMP):
        layers['icmp'] = {
            "type": packet[ICMP].type,
            "code": packet[ICMP].code
        }
    
    return layers
```

### Application Layer Detection
```python
def detect_app_protocol(packet) -> str:
    """Detect application layer protocol."""
    # Well-known ports
    port_map = {
        80: "HTTP",
        443: "HTTPS",
        22: "SSH",
        21: "FTP",
        25: "SMTP",
        53: "DNS",
        3389: "RDP",
        3306: "MySQL",
        5432: "PostgreSQL"
    }
    
    # Check by port
    if packet.haslayer(TCP):
        dport = packet[TCP].dport
        sport = packet[TCP].sport
        
        # Check destination port first
        if dport in port_map:
            return port_map[dport]
        if sport in port_map:
            return port_map[sport]
    
    # Check by content
    if packet.haslayer(DNS):
        return "DNS"
    
    # Try HTTP detection
    try:
        payload = bytes(packet[TCP].payload)
        if payload.startswith(b'HTTP/') or payload.startswith(b'GET ') or payload.startswith(b'POST '):
            return "HTTP"
    except:
        pass
    
    return "Unknown"
```

### Protocol-Specific Parsers
```python
def parse_dns(packet) -> dict:
    """Parse DNS packet details."""
    if not packet.haslayer(DNS):
        return {}
    
    dns = packet[DNS]
    return {
        "query_id": dns.id,
        "is_response": dns.qr == 1,
        "questions": [
            {
                "name": q.qname.decode(),
                "type": q.qtype,
                "class": q.qclass
            }
            for q in dns.qd
        ] if dns.qd else [],
        "answers": [
            {
                "name": a.rrname.decode(),
                "type": a.type,
                "data": a.rdata
            }
            for a in dns.an
        ] if dns.an else []
    }

def parse_http(packet) -> dict:
    """Parse HTTP packet details."""
    if not packet.haslayer(TCP):
        return {}
    
    try:
        payload = bytes(packet[TCP].payload).decode('utf-8', errors='ignore')
        lines = payload.split('\r\n')
        
        if lines and ('HTTP/' in lines[0] or 'GET ' in lines[0] or 'POST ' in lines[0]):
            headers = {}
            for line in lines[1:]:
                if ':' in line:
                    key, value = line.split(':', 1)
                    headers[key.strip()] = value.strip()
            
            return {
                "first_line": lines[0],
                "headers": headers
            }
    except:
        pass
    
    return {}
```

### Filtering Packets
```python
def filter_packets(packets, filter_func):
    """Filter packets by custom function."""
    return [p for p in packets if filter_func(p)]

# Example filters
def is_broadcast(packet) -> bool:
    """Check if packet is broadcast."""
    if packet.haslayer(Ether):
        return packet[Ether].dst == "ff:ff:ff:ff:ff:ff"
    return False

def is_http_traffic(packet) -> bool:
    """Check if packet is HTTP."""
    return (packet.haslayer(TCP) and 
            (packet[TCP].dport == 80 or packet[TCP].sport == 80))

# Usage
http_packets = filter_packets(packets, is_http_traffic)
```
