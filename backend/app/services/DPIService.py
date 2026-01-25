"""
Deep Packet Inspection Service for protocol analysis and topology inference.
Provides layer-by-layer dissection, LLDP/CDP parsing, VLAN detection,
and multicast group tracking.
"""

import logging
import time
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
from collections import defaultdict

from scapy.all import Ether, IP, TCP, UDP, ARP, ICMP, Raw, Dot1Q, DNS, DNSQR, DNSRR

# Import LLDP/CDP contrib modules
try:
    from scapy.contrib.lldp import LLDPDU, LLDPDUChassisID, LLDPDUPortID, LLDPDUSystemName, LLDPDUSystemDescription, LLDPDUNIL
    LLDP_AVAILABLE = True
except ImportError:
    LLDP_AVAILABLE = False

try:
    from scapy.contrib.cdp import CDPv2_HDR, CDPMsgDeviceID, CDPMsgPlatform, CDPMsgAddr
    CDP_AVAILABLE = True
except ImportError:
    CDP_AVAILABLE = False

try:
    from scapy.contrib.stp import STP
    STP_AVAILABLE = True
except ImportError:
    STP_AVAILABLE = False

try:
    from scapy.layers.igmp import IGMP
    IGMP_AVAILABLE = True
except ImportError:
    IGMP_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class VLANInfo:
    """VLAN tag information"""
    vlan_id: int
    priority: int
    dei: bool = False  # Drop Eligible Indicator


@dataclass
class LLDPNeighbor:
    """LLDP neighbor information from a single frame"""
    chassis_id: str
    port_id: str
    ttl: int = 120
    system_name: Optional[str] = None
    system_description: Optional[str] = None
    capabilities: List[str] = field(default_factory=list)
    management_addresses: List[str] = field(default_factory=list)
    source_mac: Optional[str] = None
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)


@dataclass
class CDPNeighbor:
    """CDP neighbor information"""
    device_id: str
    platform: Optional[str] = None
    addresses: List[str] = field(default_factory=list)
    capabilities: List[str] = field(default_factory=list)
    source_mac: Optional[str] = None
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)


@dataclass
class MulticastGroup:
    """Multicast group membership"""
    group_address: str
    protocol: str  # IGMP, mDNS, SSDP
    members: List[str] = field(default_factory=list)
    packet_count: int = 0
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)


@dataclass
class STPInfo:
    """Spanning Tree Protocol information"""
    root_bridge_id: str
    root_path_cost: int
    bridge_id: str
    port_id: int
    message_age: int
    max_age: int
    hello_time: int
    forward_delay: int
    is_topology_change: bool = False


@dataclass
class DissectedPacket:
    """Complete packet dissection result"""
    timestamp: float
    packet_length: int
    
    # Layer 2
    ethernet: Optional[Dict[str, Any]] = None
    vlan: Optional[VLANInfo] = None
    lldp: Optional[LLDPNeighbor] = None
    cdp: Optional[CDPNeighbor] = None
    stp: Optional[STPInfo] = None
    
    # Layer 3
    arp: Optional[Dict[str, Any]] = None
    ip: Optional[Dict[str, Any]] = None
    
    # Layer 4
    tcp: Optional[Dict[str, Any]] = None
    udp: Optional[Dict[str, Any]] = None
    icmp: Optional[Dict[str, Any]] = None
    
    # Layer 7
    dns: Optional[Dict[str, Any]] = None
    http: Optional[Dict[str, Any]] = None
    
    # Classification
    protocol_stack: List[str] = field(default_factory=list)
    l7_protocol: Optional[str] = None
    l7_confidence: float = 0.0
    detection_method: str = "port"  # port, signature, heuristic
    
    # Multicast
    multicast_group: Optional[str] = None
    igmp_type: Optional[str] = None


class DPIService:
    """
    Deep Packet Inspection Service
    
    Provides:
    - Layer-by-layer packet dissection (L2-L7)
    - VLAN (802.1Q) detection and tracking
    - LLDP/CDP neighbor discovery
    - STP topology analysis
    - Multicast group tracking (IGMP, mDNS, SSDP)
    - Protocol classification
    """
    
    # IANA Well-known ports for L7 classification
    PORT_MAP = {
        20: ("FTP-Data", "File Transfer", 0.9),
        21: ("FTP", "File Transfer", 0.9),
        22: ("SSH", "Remote Access", 0.95),
        23: ("Telnet", "Remote Access", 0.9),
        25: ("SMTP", "Email", 0.9),
        53: ("DNS", "Name Resolution", 0.95),
        67: ("DHCP", "Network Config", 0.9),
        68: ("DHCP", "Network Config", 0.9),
        80: ("HTTP", "Web", 0.85),
        110: ("POP3", "Email", 0.9),
        123: ("NTP", "Time Sync", 0.9),
        137: ("NetBIOS-NS", "Windows", 0.85),
        138: ("NetBIOS-DGM", "Windows", 0.85),
        139: ("NetBIOS-SSN", "Windows", 0.85),
        143: ("IMAP", "Email", 0.9),
        161: ("SNMP", "Network Management", 0.9),
        443: ("HTTPS", "Web", 0.9),
        445: ("SMB", "File Sharing", 0.9),
        502: ("Modbus", "Industrial", 0.95),
        993: ("IMAPS", "Email", 0.9),
        995: ("POP3S", "Email", 0.9),
        1433: ("MSSQL", "Database", 0.9),
        1521: ("Oracle", "Database", 0.9),
        3306: ("MySQL", "Database", 0.9),
        3389: ("RDP", "Remote Access", 0.95),
        5432: ("PostgreSQL", "Database", 0.9),
        5900: ("VNC", "Remote Access", 0.9),
        6379: ("Redis", "Database", 0.9),
        8080: ("HTTP-Alt", "Web", 0.7),
        27017: ("MongoDB", "Database", 0.9),
        47808: ("BACnet", "Building Automation", 0.95),
    }
    
    # Multicast address mappings
    MULTICAST_PROTOCOLS = {
        "224.0.0.251": "mDNS",
        "224.0.0.252": "LLMNR", 
        "239.255.255.250": "SSDP",
        "224.0.0.1": "All-Hosts",
        "224.0.0.2": "All-Routers",
        "224.0.0.5": "OSPF-All",
        "224.0.0.6": "OSPF-DR",
        "224.0.0.9": "RIPv2",
        "224.0.0.22": "IGMP",
    }
    
    def __init__(self):
        """Initialize DPI Service"""
        import threading
        
        # Thread lock for concurrent access
        self._lock = threading.RLock()
        
        # Tracking data structures
        self.lldp_neighbors: Dict[str, LLDPNeighbor] = {}  # chassis_id -> neighbor
        self.cdp_neighbors: Dict[str, CDPNeighbor] = {}    # device_id -> neighbor
        self.vlan_memberships: Dict[int, set] = defaultdict(set)  # vlan_id -> {mac_addresses}
        self.multicast_groups: Dict[str, MulticastGroup] = {}  # group_address -> group
        self.stp_topology: Dict[str, STPInfo] = {}  # bridge_id -> stp_info
        
        # Device classification
        self.device_types: Dict[str, str] = {}  # mac/ip -> device_type (switch/router/host)
        
        # Size limits to prevent unbounded growth
        self.MAX_LLDP_NEIGHBORS = 1000
        self.MAX_CDP_NEIGHBORS = 1000
        self.MAX_VLANS = 4094  # Max valid VLANs per 802.1Q
        self.MAX_MULTICAST_GROUPS = 1000
        self.MAX_MEMBERS_PER_GROUP = 500
        
        logger.info(f"DPIService initialized. LLDP={LLDP_AVAILABLE}, CDP={CDP_AVAILABLE}, STP={STP_AVAILABLE}, IGMP={IGMP_AVAILABLE}")
    
    def dissect_packet(self, packet) -> DissectedPacket:
        """
        Full layer-by-layer packet dissection
        
        Args:
            packet: Scapy packet object
            
        Returns:
            DissectedPacket with all extracted information
        """
        result = DissectedPacket(
            timestamp=time.time(),
            packet_length=len(packet) if packet else 0
        )
        
        if not packet:
            return result
        
        # Layer 2: Ethernet
        if Ether in packet:
            result.ethernet = self._dissect_ethernet(packet)
            result.protocol_stack.append("Ethernet")
            
            # Check for VLAN
            if Dot1Q in packet:
                result.vlan = self._dissect_vlan(packet)
                if result.vlan:
                    result.protocol_stack.append("VLAN")
                    # Track VLAN membership
                    self._track_vlan_membership(result.vlan.vlan_id, packet[Ether].src)
        
        # Layer 2 Discovery Protocols
        if LLDP_AVAILABLE and self._is_lldp_frame(packet):
            result.lldp = self._dissect_lldp(packet)
            result.protocol_stack.append("LLDP")
            if result.lldp:
                self._update_lldp_neighbor(result.lldp)
                self._classify_device_as_switch(result.lldp.source_mac)
        
        if CDP_AVAILABLE and self._is_cdp_frame(packet):
            result.cdp = self._dissect_cdp(packet)
            result.protocol_stack.append("CDP")
            if result.cdp:
                self._update_cdp_neighbor(result.cdp)
                self._classify_device_as_switch(result.cdp.source_mac)
        
        if STP_AVAILABLE and STP in packet:
            result.stp = self._dissect_stp(packet)
            result.protocol_stack.append("STP")
            if result.stp:
                self._update_stp_topology(result.stp)
        
        # Layer 3: ARP
        if ARP in packet:
            result.arp = self._dissect_arp(packet)
            result.protocol_stack.append("ARP")
        
        # Layer 3: IP
        if IP in packet:
            result.ip = self._dissect_ip(packet)
            result.protocol_stack.append("IP")
            
            # Check for multicast
            if self._is_multicast_ip(packet[IP].dst):
                result.multicast_group = packet[IP].dst
                self._track_multicast_group(packet[IP].dst, packet[IP].src, "IP")
        
        # Layer 4: TCP
        if TCP in packet:
            result.tcp = self._dissect_tcp(packet)
            result.protocol_stack.append("TCP")
            
            # L7 classification
            l7 = self._classify_l7_protocol(packet[TCP].sport, packet[TCP].dport, packet)
            result.l7_protocol = l7[0]
            result.l7_confidence = l7[1]
            result.detection_method = l7[2]
        
        # Layer 4: UDP
        if UDP in packet:
            result.udp = self._dissect_udp(packet)
            result.protocol_stack.append("UDP")
            
            # L7 classification
            l7 = self._classify_l7_protocol(packet[UDP].sport, packet[UDP].dport, packet)
            result.l7_protocol = l7[0]
            result.l7_confidence = l7[1]
            result.detection_method = l7[2]
            
            # Special multicast protocols
            if packet[UDP].dport == 5353:  # mDNS
                result.multicast_group = "224.0.0.251"
                self._track_multicast_group("224.0.0.251", packet[IP].src if IP in packet else "unknown", "mDNS")
            elif packet[UDP].dport == 1900:  # SSDP
                result.multicast_group = "239.255.255.250"
                self._track_multicast_group("239.255.255.250", packet[IP].src if IP in packet else "unknown", "SSDP")
        
        # Layer 4: ICMP
        if ICMP in packet:
            result.icmp = self._dissect_icmp(packet)
            result.protocol_stack.append("ICMP")
        
        # IGMP
        if IGMP_AVAILABLE and IGMP in packet:
            result.igmp_type = self._dissect_igmp(packet)
            result.protocol_stack.append("IGMP")
        
        # Layer 7: DNS
        if DNS in packet:
            result.dns = self._dissect_dns(packet)
            if result.dns:
                result.protocol_stack.append("DNS")
                result.l7_protocol = "DNS"
                result.l7_confidence = 0.99
                result.detection_method = "signature"
        
        return result
    
    def _dissect_ethernet(self, packet) -> Dict[str, Any]:
        """Extract Ethernet layer information"""
        eth = packet[Ether]
        ether_types = {
            0x0800: "IPv4",
            0x0806: "ARP",
            0x86DD: "IPv6",
            0x8100: "VLAN",
            0x88CC: "LLDP",
            0x2000: "CDP",
        }
        return {
            "src_mac": eth.src,
            "dst_mac": eth.dst,
            "type": eth.type,
            "type_name": ether_types.get(eth.type, f"0x{eth.type:04x}")
        }
    
    def _dissect_vlan(self, packet) -> Optional[VLANInfo]:
        """Extract VLAN (802.1Q) information"""
        vlan = packet[Dot1Q]
        vlan_id = vlan.vlan
        
        # Validate VLAN ID (802.1Q valid range: 1-4094, 0 and 4095 are reserved)
        if not isinstance(vlan_id, int) or vlan_id < 1 or vlan_id > 4094:
            logger.debug(f"Invalid VLAN ID: {vlan_id}, skipping")
            return None
        
        return VLANInfo(
            vlan_id=vlan_id,
            priority=vlan.prio,
            dei=bool(vlan.id) if hasattr(vlan, 'id') else False
        )
    
    def _is_lldp_frame(self, packet) -> bool:
        """Check if packet is an LLDP frame"""
        if Ether in packet:
            dst = packet[Ether].dst
            if dst:
                # LLDP multicast MAC: 01:80:c2:00:00:0e
                if dst.lower() == "01:80:c2:00:00:0e":
                    return True
            # Or EtherType 0x88CC
            if packet[Ether].type == 0x88CC:
                return True
        return False
    
    def _dissect_lldp(self, packet) -> Optional[LLDPNeighbor]:
        """Extract LLDP neighbor information"""
        if not LLDP_AVAILABLE:
            return None
            
        try:
            if LLDPDU not in packet:
                return None
                
            lldp = packet[LLDPDU]
            neighbor = LLDPNeighbor(
                chassis_id="",
                port_id="",
                source_mac=packet[Ether].src if Ether in packet else None
            )
            
            # Parse LLDP TLVs
            current = lldp
            while current:
                if hasattr(current, 'type'):
                    # Chassis ID (type 1)
                    if current.type == 1 and hasattr(current, 'id'):
                        neighbor.chassis_id = self._decode_lldp_id(current.id)
                    # Port ID (type 2)
                    elif current.type == 2 and hasattr(current, 'id'):
                        neighbor.port_id = self._decode_lldp_id(current.id)
                    # TTL (type 3)
                    elif current.type == 3 and hasattr(current, 'ttl'):
                        neighbor.ttl = current.ttl
                    # System Name (type 5)
                    elif current.type == 5 and hasattr(current, 'system_name'):
                        neighbor.system_name = current.system_name.decode() if isinstance(current.system_name, bytes) else str(current.system_name)
                    # System Description (type 6)
                    elif current.type == 6 and hasattr(current, 'description'):
                        neighbor.system_description = current.description.decode() if isinstance(current.description, bytes) else str(current.description)
                    # System Capabilities (type 7)
                    elif current.type == 7:
                        neighbor.capabilities = self._parse_lldp_capabilities(current)
                
                # Move to next TLV
                current = current.payload if hasattr(current, 'payload') and current.payload else None
                if isinstance(current, LLDPDUNIL):
                    break
            
            return neighbor if neighbor.chassis_id else None
            
        except Exception as e:
            logger.debug(f"LLDP parsing error: {e}")
            return None
    
    def _decode_lldp_id(self, id_value) -> str:
        """Decode LLDP ID field to string"""
        if isinstance(id_value, bytes):
            # Try MAC address format first
            if len(id_value) == 6:
                return ':'.join(f'{b:02x}' for b in id_value)
            # Otherwise decode as string
            try:
                return id_value.decode('utf-8', errors='replace')
            except:
                return id_value.hex()
        return str(id_value)
    
    def _parse_lldp_capabilities(self, tlv) -> List[str]:
        """Parse LLDP capabilities TLV"""
        caps = []
        cap_map = {
            0x0001: "Other",
            0x0002: "Repeater",
            0x0004: "Bridge",
            0x0008: "WLAN-AP",
            0x0010: "Router",
            0x0020: "Telephone",
            0x0040: "DOCSIS",
            0x0080: "Station",
        }
        if hasattr(tlv, 'capabilities'):
            cap_bits = tlv.capabilities
            for bit, name in cap_map.items():
                if cap_bits & bit:
                    caps.append(name)
        return caps
    
    def _is_cdp_frame(self, packet) -> bool:
        """Check if packet is a CDP frame"""
        if Ether in packet:
            dst = packet[Ether].dst
            if dst:
                # CDP multicast MAC: 01:00:0c:cc:cc:cc
                if dst.lower() == "01:00:0c:cc:cc:cc":
                    return True
        return False
    
    def _dissect_cdp(self, packet) -> Optional[CDPNeighbor]:
        """Extract CDP neighbor information"""
        if not CDP_AVAILABLE:
            return None
            
        try:
            if CDPv2_HDR not in packet:
                return None
                
            cdp = packet[CDPv2_HDR]
            neighbor = CDPNeighbor(
                device_id="",
                source_mac=packet[Ether].src if Ether in packet else None
            )
            
            # Parse CDP TLVs
            if CDPMsgDeviceID in packet:
                neighbor.device_id = packet[CDPMsgDeviceID].val.decode() if hasattr(packet[CDPMsgDeviceID], 'val') else ""
            
            if CDPMsgPlatform in packet:
                neighbor.platform = packet[CDPMsgPlatform].val.decode() if hasattr(packet[CDPMsgPlatform], 'val') else ""
            
            if CDPMsgAddr in packet:
                addr = packet[CDPMsgAddr]
                if hasattr(addr, 'addr'):
                    neighbor.addresses.append(str(addr.addr))
            
            return neighbor if neighbor.device_id else None
            
        except Exception as e:
            logger.debug(f"CDP parsing error: {e}")
            return None
    
    def _dissect_stp(self, packet) -> Optional[STPInfo]:
        """Extract Spanning Tree Protocol information"""
        if not STP_AVAILABLE or STP not in packet:
            return None
            
        try:
            stp = packet[STP]
            return STPInfo(
                root_bridge_id=f"{stp.rootid:016x}" if hasattr(stp, 'rootid') else "",
                root_path_cost=stp.pathcost if hasattr(stp, 'pathcost') else 0,
                bridge_id=f"{stp.bridgeid:016x}" if hasattr(stp, 'bridgeid') else "",
                port_id=stp.portid if hasattr(stp, 'portid') else 0,
                message_age=stp.age if hasattr(stp, 'age') else 0,
                max_age=stp.maxage if hasattr(stp, 'maxage') else 20,
                hello_time=stp.hellotime if hasattr(stp, 'hellotime') else 2,
                forward_delay=stp.fwddelay if hasattr(stp, 'fwddelay') else 15,
                is_topology_change=bool(stp.flags & 0x01) if hasattr(stp, 'flags') else False
            )
        except Exception as e:
            logger.debug(f"STP parsing error: {e}")
            return None
    
    def _dissect_arp(self, packet) -> Dict[str, Any]:
        """Extract ARP information"""
        arp = packet[ARP]
        ops = {1: "Request", 2: "Reply"}
        return {
            "operation": ops.get(arp.op, str(arp.op)),
            "sender_mac": arp.hwsrc,
            "sender_ip": arp.psrc,
            "target_mac": arp.hwdst,
            "target_ip": arp.pdst
        }
    
    def _dissect_ip(self, packet) -> Dict[str, Any]:
        """Extract IP layer information"""
        ip = packet[IP]
        return {
            "version": ip.version,
            "ttl": ip.ttl,
            "protocol": ip.proto,
            "src": ip.src,
            "dst": ip.dst,
            "length": ip.len,
            "flags": str(ip.flags)
        }
    
    def _dissect_tcp(self, packet) -> Dict[str, Any]:
        """Extract TCP information"""
        tcp = packet[TCP]
        flags = []
        if tcp.flags.S: flags.append("SYN")
        if tcp.flags.A: flags.append("ACK")
        if tcp.flags.F: flags.append("FIN")
        if tcp.flags.R: flags.append("RST")
        if tcp.flags.P: flags.append("PSH")
        
        return {
            "src_port": tcp.sport,
            "dst_port": tcp.dport,
            "seq": tcp.seq,
            "ack": tcp.ack,
            "flags": flags,
            "window": tcp.window
        }
    
    def _dissect_udp(self, packet) -> Dict[str, Any]:
        """Extract UDP information"""
        udp = packet[UDP]
        return {
            "src_port": udp.sport,
            "dst_port": udp.dport,
            "length": udp.len
        }
    
    def _dissect_icmp(self, packet) -> Dict[str, Any]:
        """Extract ICMP information"""
        icmp = packet[ICMP]
        types = {0: "Echo Reply", 8: "Echo Request", 3: "Dest Unreachable", 11: "Time Exceeded"}
        return {
            "type": icmp.type,
            "type_name": types.get(icmp.type, f"Type {icmp.type}"),
            "code": icmp.code
        }
    
    def _dissect_igmp(self, packet) -> Optional[str]:
        """Extract IGMP information"""
        if not IGMP_AVAILABLE or IGMP not in packet:
            return None
            
        try:
            igmp = packet[IGMP]
            types = {
                0x11: "Membership Query",
                0x12: "v1 Membership Report",
                0x16: "v2 Membership Report",
                0x17: "Leave Group",
                0x22: "v3 Membership Report"
            }
            igmp_type = types.get(igmp.type, f"Type {igmp.type}")
            
            # Track group membership
            if hasattr(igmp, 'gaddr') and igmp.gaddr and igmp.gaddr != "0.0.0.0":
                src_ip = packet[IP].src if IP in packet else "unknown"
                self._track_multicast_group(igmp.gaddr, src_ip, "IGMP")
            
            return igmp_type
        except Exception as e:
            logger.debug(f"IGMP parsing error: {e}")
            return None
    
    def _dissect_dns(self, packet) -> Optional[Dict[str, Any]]:
        """Extract DNS information"""
        try:
            dns = packet[DNS]
            result = {
                "id": dns.id,
                "is_response": bool(dns.qr),
                "opcode": dns.opcode,
                "rcode": dns.rcode,
                "questions": [],
                "answers": []
            }
            
            # Questions - handle None qdcount
            qdcount = dns.qdcount or 0
            if qdcount > 0 and DNSQR in packet:
                qr = packet[DNSQR]
                result["questions"].append({
                    "name": qr.qname.decode() if isinstance(qr.qname, bytes) else str(qr.qname),
                    "type": qr.qtype
                })
            
            # Answers - handle None ancount
            ancount = dns.ancount or 0
            if ancount > 0 and DNSRR in packet:
                rr = packet[DNSRR]
                result["answers"].append({
                    "name": rr.rrname.decode() if isinstance(rr.rrname, bytes) else str(rr.rrname),
                    "type": rr.type,
                    "rdata": str(rr.rdata) if hasattr(rr, 'rdata') else ""
                })
            
            return result
        except Exception as e:
            logger.debug(f"DNS parsing error: {e}")
            return None
    
    def _is_multicast_ip(self, ip: str) -> bool:
        """Check if IP address is multicast (224.0.0.0/4)"""
        try:
            first_octet = int(ip.split('.')[0])
            return 224 <= first_octet <= 239
        except:
            return False
    
    def _classify_l7_protocol(self, sport: int, dport: int, packet) -> Tuple[str, float, str]:
        """
        Classify Layer 7 protocol
        
        Returns: (protocol_name, confidence, detection_method)
        """
        # Port-based detection
        for port in [sport, dport]:
            if port in self.PORT_MAP:
                proto, category, confidence = self.PORT_MAP[port]
                return (proto, confidence, "port")
        
        # Signature-based detection (check payload)
        if Raw in packet:
            payload = bytes(packet[Raw])
            
            # HTTP signature
            if payload.startswith(b'GET ') or payload.startswith(b'POST ') or payload.startswith(b'HTTP/'):
                return ("HTTP", 0.95, "signature")
            
            # SSH signature
            if payload.startswith(b'SSH-'):
                return ("SSH", 0.99, "signature")
            
            # TLS/SSL signature (Client Hello)
            if len(payload) > 5 and payload[0] == 0x16 and payload[1:3] in [b'\x03\x01', b'\x03\x03']:
                return ("TLS", 0.9, "signature")
            
            # Modbus signature
            if len(payload) >= 8 and dport == 502:
                return ("Modbus", 0.95, "signature")
        
        return ("Unknown", 0.0, "none")
    
    def _track_vlan_membership(self, vlan_id: int, mac: str):
        """Track VLAN membership by MAC address (thread-safe)"""
        with self._lock:
            # Enforce size limit
            if len(self.vlan_memberships) >= self.MAX_VLANS and vlan_id not in self.vlan_memberships:
                return
            self.vlan_memberships[vlan_id].add(mac.lower())
    
    def _track_multicast_group(self, group_address: str, member_ip: str, protocol: str):
        """Track multicast group membership (thread-safe)"""
        with self._lock:
            if group_address not in self.multicast_groups:
                # Enforce size limit
                if len(self.multicast_groups) >= self.MAX_MULTICAST_GROUPS:
                    return
                self.multicast_groups[group_address] = MulticastGroup(
                    group_address=group_address,
                    protocol=self.MULTICAST_PROTOCOLS.get(group_address, protocol)
                )
            
            group = self.multicast_groups[group_address]
            if member_ip not in group.members:
                # Enforce member limit per group
                if len(group.members) >= self.MAX_MEMBERS_PER_GROUP:
                    return
                group.members.append(member_ip)
            group.packet_count += 1
            group.last_seen = time.time()
    
    def _update_lldp_neighbor(self, neighbor: LLDPNeighbor):
        """Update or add LLDP neighbor (thread-safe)"""
        with self._lock:
            key = neighbor.chassis_id
            if key in self.lldp_neighbors:
                existing = self.lldp_neighbors[key]
                existing.last_seen = time.time()
                existing.system_name = neighbor.system_name or existing.system_name
                existing.capabilities = neighbor.capabilities or existing.capabilities
            else:
                # Enforce size limit
                if len(self.lldp_neighbors) >= self.MAX_LLDP_NEIGHBORS:
                    return
                self.lldp_neighbors[key] = neighbor
                logger.info(f"New LLDP neighbor discovered: {neighbor.system_name or neighbor.chassis_id}")
    
    def _update_cdp_neighbor(self, neighbor: CDPNeighbor):
        """Update or add CDP neighbor (thread-safe)"""
        with self._lock:
            key = neighbor.device_id
            if key in self.cdp_neighbors:
                existing = self.cdp_neighbors[key]
                existing.last_seen = time.time()
                existing.platform = neighbor.platform or existing.platform
            else:
                # Enforce size limit
                if len(self.cdp_neighbors) >= self.MAX_CDP_NEIGHBORS:
                    return
                self.cdp_neighbors[key] = neighbor
                logger.info(f"New CDP neighbor discovered: {neighbor.device_id}")
    
    def _update_stp_topology(self, stp: STPInfo):
        """Update STP topology information (thread-safe)"""
        with self._lock:
            self.stp_topology[stp.bridge_id] = stp
    
    def _classify_device_as_switch(self, mac: Optional[str]):
        """Mark a device as a switch based on LLDP/CDP detection (thread-safe)"""
        if mac:
            with self._lock:
                self.device_types[mac.lower()] = "switch"
    
    # Public API methods
    
    def get_lldp_neighbors(self) -> List[Dict[str, Any]]:
        """Get all discovered LLDP neighbors (thread-safe)"""
        with self._lock:
            return [asdict(n) for n in self.lldp_neighbors.values()]
    
    def get_cdp_neighbors(self) -> List[Dict[str, Any]]:
        """Get all discovered CDP neighbors (thread-safe)"""
        with self._lock:
            return [asdict(n) for n in self.cdp_neighbors.values()]
    
    def get_vlan_topology(self) -> Dict[int, List[str]]:
        """Get VLAN membership map (thread-safe)"""
        with self._lock:
            return {vlan_id: list(macs) for vlan_id, macs in self.vlan_memberships.items()}
    
    def get_multicast_groups(self) -> List[Dict[str, Any]]:
        """Get tracked multicast groups (thread-safe)"""
        with self._lock:
            return [asdict(g) for g in self.multicast_groups.values()]
    
    def get_device_type(self, identifier: str) -> str:
        """Get classified device type by MAC or IP (thread-safe)"""
        with self._lock:
            return self.device_types.get(identifier.lower(), "host")
    
    def get_stp_root_bridge(self) -> Optional[str]:
        """Get the STP root bridge ID (thread-safe)"""
        with self._lock:
            if not self.stp_topology:
                return None
            # Root bridge has lowest bridge ID
            return min(self.stp_topology.keys())
    
    def get_topology_summary(self) -> Dict[str, Any]:
        """Get a summary of the discovered topology (thread-safe)"""
        with self._lock:
            # Get STP root bridge without re-acquiring lock (already held)
            stp_root = None
            if self.stp_topology:
                stp_root = min(self.stp_topology.keys())
            
            return {
                "lldp_neighbors": len(self.lldp_neighbors),
                "cdp_neighbors": len(self.cdp_neighbors),
                "vlans": list(self.vlan_memberships.keys()),
                "multicast_groups": len(self.multicast_groups),
                "stp_bridges": len(self.stp_topology),
                "stp_root_bridge": stp_root,
                "classified_devices": dict(self.device_types)
            }
    
    def clear_topology_data(self):
        """Clear all topology tracking data (thread-safe)"""
        with self._lock:
            self.lldp_neighbors.clear()
            self.cdp_neighbors.clear()
            self.vlan_memberships.clear()
            self.multicast_groups.clear()
            self.stp_topology.clear()
            self.device_types.clear()
            logger.info("Topology data cleared")


# Singleton instance
dpi_service = DPIService()
