import asyncio
import json
import logging
import threading
import multiprocessing
from typing import Dict, List, Optional, Callable, Any
from scapy.all import sniff, IP, TCP, UDP, ARP, Ether, wrpcap, send, sendp, sendpfast, sr1, ICMP, Raw
import psutil
import time
import os
import socket
import struct

logger = logging.getLogger(__name__)

class SnifferService:
    # Constants for packet crafting
    PACKET_SEND_TIMEOUT = 3  # seconds
    RESPONSE_HEX_MAX_LENGTH = 200  # characters
    STORM_THREAD_STOP_TIMEOUT = 2.0  # seconds
    
    # Informational notes for packet crafting
    NOTE_TCP_SYN_NO_RESPONSE = "Note: SYN packets may not receive responses if the target port is filtered by a firewall, the host is down, or the service is not listening. This is normal behavior for many hosts, especially public IPs like DNS servers (e.g., 8.8.8.8) which only respond to DNS queries on port 53."
    NOTE_UDP_NO_RESPONSE = "Note: UDP is connectionless. No response may indicate the port is open but the service doesn't respond to empty packets, or the port is filtered by a firewall."
    
    def __init__(self):
        self.is_sniffing = False
        self.capture_thread: Optional[threading.Thread] = None
        self.stats_thread: Optional[threading.Thread] = None
        self.callback: Optional[Callable] = None
        self.interface: Optional[str] = None
        self.filter: Optional[str] = None
        self.captured_packets = []
        self.max_stored_packets = 1000
        self.stats = {
            "total_flows": 0,
            "total_bytes": 0,
            "top_talkers": {},
            "protocols": {},
            "connections": {},  # Format: "src-dst": {"bytes": int, "protocols": set()}
        }
        self.traffic_history = []
        self.interface_history = {} # Store history for each interface
        self.last_bytes_check = 0
        self.last_if_stats = {}
        self.discovered_hosts = {}  # Format: {ip_address: {"first_seen": timestamp, "last_seen": timestamp, "mac_address": mac}}
        self.track_source_only = True  # Default to safer mode (source IPs only)
        self.filter_unicast = False  # Don't filter unicast by default (allows passive listener detection)
        self.filter_multicast = True  # Filter multicast by default
        self.filter_broadcast = True  # Filter broadcast by default
        
        # Storm-related attributes
        self.is_storming = False
        self.storm_thread: Optional[threading.Thread] = None
        self.storm_config: Dict[str, Any] = {}
        self.storm_metrics = {
            "packets_sent": 0,
            "bytes_sent": 0,
            "start_time": None,
            "duration_seconds": 0,
            "current_pps": 0,
            "target_pps": 0
        }
        
        self.start_background_sniffing()

    def start_background_sniffing(self):
        # Start stats collector
        self.stats_thread = threading.Thread(target=self._run_stats_collector, daemon=True)
        self.stats_thread.start()

        # Start sniffing on default interface (usually eth0 in container)
        self.start_sniffing("eth0", None)

    def _run_stats_collector(self):
        while True:
            time.sleep(1) # Update every second for smoother graphs
            
            # Global stats (from sniffing)
            current_bytes = self.stats["total_bytes"]
            delta = current_bytes - self.last_bytes_check
            self.last_bytes_check = current_bytes

            timestamp = time.strftime("%H:%M:%S")
            self.traffic_history.append({
                "time": timestamp,
                "value": delta
            })

            # Keep last 20 points
            if len(self.traffic_history) > 20:
                self.traffic_history.pop(0)
            
            # Per-interface stats (from psutil)
            io_counters = psutil.net_io_counters(pernic=True)
            for iface, counters in io_counters.items():
                if iface not in self.interface_history:
                    self.interface_history[iface] = []
                
                prev_bytes = self.last_if_stats.get(iface, 0)
                curr_bytes = counters.bytes_recv + counters.bytes_sent
                
                # First run or counter reset
                if prev_bytes == 0 or curr_bytes < prev_bytes:
                    if_delta = 0
                else:
                    if_delta = curr_bytes - prev_bytes
                
                self.last_if_stats[iface] = curr_bytes
                
                self.interface_history[iface].append(if_delta)
                if len(self.interface_history[iface]) > 30: # Keep last 30 points
                    self.interface_history[iface].pop(0)

    def get_interfaces(self) -> List[Dict[str, Any]]:
        interfaces = []
        for iface, addrs in psutil.net_if_addrs().items():
            ip = "N/A"
            for addr in addrs:
                if addr.family == 2:  # AF_INET
                    ip = addr.address
            
            # Get history for this interface
            history = self.interface_history.get(iface, [0] * 30)
            
            interfaces.append({
                "name": iface, 
                "ip": ip,
                "activity": history
            })
        return interfaces
    
    def get_discovered_hosts(self) -> List[Dict[str, Any]]:
        """Return list of discovered hosts from passive discovery"""
        hosts = []
        for ip, info in self.discovered_hosts.items():
            hosts.append({
                "ip_address": ip,
                "mac_address": info.get("mac_address", "Unknown"),
                "first_seen": info.get("first_seen"),
                "last_seen": info.get("last_seen")
            })
        return hosts
    
    def set_track_source_only(self, enabled: bool):
        """Update the track_source_only setting for passive discovery"""
        self.track_source_only = enabled
    
    def set_filter_unicast(self, enabled: bool):
        """Enable or disable unicast filtering"""
        self.filter_unicast = enabled
        logger.info(f"Passive discovery filter_unicast set to: {enabled}")
    
    def set_filter_multicast(self, enabled: bool):
        """Enable or disable multicast filtering"""
        self.filter_multicast = enabled
        logger.info(f"Passive discovery filter_multicast set to: {enabled}")
    
    def set_filter_broadcast(self, enabled: bool):
        """Enable or disable broadcast filtering"""
        self.filter_broadcast = enabled
        logger.info(f"Passive discovery filter_broadcast set to: {enabled}")
    
    def _is_broadcast_mac(self, mac: str) -> bool:
        """Check if MAC address is broadcast"""
        return mac.upper() == "FF:FF:FF:FF:FF:FF"
    
    def _is_broadcast_ip(self, ip: str) -> bool:
        """Check if IP is broadcast (ends with .255) or 255.255.255.255"""
        return ip.endswith(".255") or ip == "255.255.255.255"
    
    def _is_multicast_ip(self, ip: str) -> bool:
        """Check if IP is multicast (224.0.0.0 - 239.255.255.255)"""
        try:
            first_octet = int(ip.split('.')[0])
            return 224 <= first_octet <= 239
        except:
            return False
    
    def _is_link_local_ip(self, ip: str) -> bool:
        """Check if IP is link-local (169.254.x.x)"""
        return ip.startswith("169.254.")
    
    def _is_valid_source_ip(self, ip: str) -> bool:
        """Check if IP is a valid source address (not broadcast, not 0.0.0.0, not link-local)"""
        if not ip:
            return False
        # 0.0.0.0 is not a valid source
        if ip == "0.0.0.0":
            return False
        # Broadcast addresses can't be sources
        if self._is_broadcast_ip(ip):
            return False
        # Link-local should be filtered
        if self._is_link_local_ip(ip):
            return False
        # Multicast can't be a source
        if self._is_multicast_ip(ip):
            return False
        return True
    
    def _should_track_ip(self, ip: str) -> bool:
        """Check if IP should be tracked based on filtering rules"""
        # Always filter link-local addresses
        if self._is_link_local_ip(ip):
            return False
        
        # Check broadcast filtering (if enabled)
        if self.filter_broadcast and self._is_broadcast_ip(ip):
            return False
        
        # Check multicast filtering (if enabled)
        if self.filter_multicast and self._is_multicast_ip(ip):
            return False
        
        # Check unicast filtering (if enabled)
        # Unicast = not broadcast, not multicast, not link-local
        if self.filter_unicast:
            is_unicast = not self._is_broadcast_ip(ip) and not self._is_multicast_ip(ip)
            if is_unicast:
                return False
        
        return True

    def _dissect_packet(self, packet) -> Dict[str, Any]:
        """Full protocol dissection for packet inspector"""
        layers = {}
        
        # Ethernet Layer
        if Ether in packet:
            eth = packet[Ether]
            ether_types = {0x0800: "IPv4", 0x0806: "ARP", 0x86DD: "IPv6", 0x8100: "VLAN"}
            layers["ethernet"] = {
                "src_mac": eth.src,
                "dst_mac": eth.dst,
                "type": ether_types.get(eth.type, f"0x{eth.type:04x}")
            }
        
        # ARP Layer
        if ARP in packet:
            arp = packet[ARP]
            arp_ops = {1: "Request (who-has)", 2: "Reply (is-at)"}
            layers["arp"] = {
                "hardware_type": arp.hwtype,
                "protocol_type": f"0x{arp.ptype:04x}",
                "hardware_size": arp.hwlen,
                "protocol_size": arp.plen,
                "operation": arp_ops.get(arp.op, str(arp.op)),
                "sender_mac": arp.hwsrc,
                "sender_ip": arp.psrc,
                "target_mac": arp.hwdst,
                "target_ip": arp.pdst
            }
        
        # IP Layer
        if IP in packet:
            ip = packet[IP]
            proto_names = {1: "ICMP", 6: "TCP", 17: "UDP", 47: "GRE", 50: "ESP", 51: "AH"}
            flags = []
            if ip.flags.DF: flags.append("DF")
            if ip.flags.MF: flags.append("MF")
            layers["ip"] = {
                "version": ip.version,
                "header_length": ip.ihl * 4,
                "dscp": ip.tos >> 2,
                "ecn": ip.tos & 0x03,
                "total_length": ip.len,
                "identification": ip.id,
                "flags": ", ".join(flags) if flags else "None",
                "fragment_offset": ip.frag,
                "ttl": ip.ttl,
                "protocol": ip.proto,
                "protocol_name": proto_names.get(ip.proto, f"Unknown ({ip.proto})"),
                "checksum": f"0x{ip.chksum:04x}" if ip.chksum else "N/A",
                "src": ip.src,
                "dst": ip.dst
            }
            # IP Options
            if ip.options:
                layers["ip"]["options"] = [str(opt) for opt in ip.options]
        
        # TCP Layer
        if TCP in packet:
            tcp = packet[TCP]
            flags_list = []
            if tcp.flags.F: flags_list.append("FIN")
            if tcp.flags.S: flags_list.append("SYN")
            if tcp.flags.R: flags_list.append("RST")
            if tcp.flags.P: flags_list.append("PSH")
            if tcp.flags.A: flags_list.append("ACK")
            if tcp.flags.U: flags_list.append("URG")
            if tcp.flags.E: flags_list.append("ECE")
            if tcp.flags.C: flags_list.append("CWR")
            
            layers["tcp"] = {
                "src_port": tcp.sport,
                "dst_port": tcp.dport,
                "seq": tcp.seq,
                "ack": tcp.ack,
                "data_offset": tcp.dataofs * 4,
                "reserved": tcp.reserved,
                "flags": " ".join(flags_list) if flags_list else "None",
                "flags_raw": str(tcp.flags),
                "window": tcp.window,
                "checksum": f"0x{tcp.chksum:04x}",
                "urgent_pointer": tcp.urgptr
            }
            # TCP Options
            if tcp.options:
                tcp_opts = []
                for opt in tcp.options:
                    if isinstance(opt, tuple):
                        tcp_opts.append(f"{opt[0]}: {opt[1]}")
                    else:
                        tcp_opts.append(str(opt))
                layers["tcp"]["options"] = tcp_opts
            
            # Application layer detection based on port
            layers["application"] = self._detect_application(tcp.sport, tcp.dport, packet)
        
        # UDP Layer
        if UDP in packet:
            udp = packet[UDP]
            layers["udp"] = {
                "src_port": udp.sport,
                "dst_port": udp.dport,
                "length": udp.len,
                "checksum": f"0x{udp.chksum:04x}" if udp.chksum else "N/A"
            }
            # Application layer detection
            layers["application"] = self._detect_application(udp.sport, udp.dport, packet)
        
        # ICMP Layer
        if ICMP in packet:
            icmp = packet[ICMP]
            icmp_types = {
                0: "Echo Reply", 3: "Destination Unreachable", 4: "Source Quench",
                5: "Redirect", 8: "Echo Request", 9: "Router Advertisement",
                10: "Router Solicitation", 11: "Time Exceeded", 12: "Parameter Problem",
                13: "Timestamp Request", 14: "Timestamp Reply", 17: "Address Mask Request",
                18: "Address Mask Reply"
            }
            layers["icmp"] = {
                "type": icmp.type,
                "type_name": icmp_types.get(icmp.type, f"Unknown ({icmp.type})"),
                "code": icmp.code,
                "checksum": f"0x{icmp.chksum:04x}"
            }
            # Echo Request/Reply specific
            if icmp.type in [0, 8]:
                layers["icmp"]["identifier"] = icmp.id
                layers["icmp"]["sequence"] = icmp.seq
        
        # DNS Layer
        try:
            from scapy.layers.dns import DNS, DNSQR, DNSRR
            if DNS in packet:
                dns = packet[DNS]
                layers["dns"] = {
                    "id": dns.id,
                    "qr": "Response" if dns.qr else "Query",
                    "opcode": dns.opcode,
                    "aa": dns.aa,
                    "tc": dns.tc,
                    "rd": dns.rd,
                    "ra": dns.ra,
                    "rcode": dns.rcode,
                    "qdcount": dns.qdcount,
                    "ancount": dns.ancount,
                    "nscount": dns.nscount,
                    "arcount": dns.arcount
                }
                # Queries
                if dns.qdcount > 0 and DNSQR in packet:
                    queries = []
                    for i in range(dns.qdcount):
                        try:
                            qr = packet[DNSQR][i] if hasattr(packet[DNSQR], '__getitem__') else packet[DNSQR]
                            queries.append({
                                "name": qr.qname.decode() if isinstance(qr.qname, bytes) else str(qr.qname),
                                "type": qr.qtype,
                                "class": qr.qclass
                            })
                        except:
                            break
                    layers["dns"]["queries"] = queries
        except ImportError:
            pass
        
        # HTTP detection (basic)
        try:
            from scapy.layers.http import HTTP, HTTPRequest, HTTPResponse
            if HTTP in packet:
                if HTTPRequest in packet:
                    http = packet[HTTPRequest]
                    layers["http"] = {
                        "type": "Request",
                        "method": http.Method.decode() if http.Method else "",
                        "path": http.Path.decode() if http.Path else "",
                        "host": http.Host.decode() if http.Host else "",
                        "user_agent": http.User_Agent.decode() if hasattr(http, 'User_Agent') and http.User_Agent else ""
                    }
                elif HTTPResponse in packet:
                    http = packet[HTTPResponse]
                    layers["http"] = {
                        "type": "Response",
                        "status_code": http.Status_Code.decode() if http.Status_Code else "",
                        "reason": http.Reason_Phrase.decode() if http.Reason_Phrase else ""
                    }
        except ImportError:
            pass
        
        # TLS/SSL detection
        try:
            from scapy.layers.tls.all import TLS
            if TLS in packet:
                tls = packet[TLS]
                layers["tls"] = {
                    "type": "TLS",
                    "version": str(tls.version) if hasattr(tls, 'version') else "Unknown"
                }
        except ImportError:
            pass
        
        # Payload
        payload_data = bytes(packet.payload.payload.payload) if hasattr(packet, 'payload') and hasattr(packet.payload, 'payload') and hasattr(packet.payload.payload, 'payload') else None
        if not payload_data and hasattr(packet, 'load'):
            payload_data = packet.load
        if payload_data and len(payload_data) > 0:
            # Try to decode as ASCII
            try:
                ascii_preview = payload_data[:200].decode('utf-8', errors='replace')
            except:
                ascii_preview = payload_data[:200].hex()
            layers["payload"] = {
                "length": len(payload_data),
                "hex": payload_data[:100].hex(),
                "preview": ascii_preview
            }
        
        return layers
    
    def _detect_application(self, sport: int, dport: int, packet) -> Dict[str, Any]:
        """Detect application layer protocol based on ports and content"""
        app = {"protocol": "Unknown", "details": {}}
        
        # Common port mappings
        port_map = {
            20: ("FTP-Data", "File Transfer Protocol (Data)"),
            21: ("FTP", "File Transfer Protocol"),
            22: ("SSH", "Secure Shell"),
            23: ("Telnet", "Telnet"),
            25: ("SMTP", "Simple Mail Transfer Protocol"),
            53: ("DNS", "Domain Name System"),
            67: ("DHCP", "Dynamic Host Configuration Protocol"),
            68: ("DHCP", "Dynamic Host Configuration Protocol"),
            69: ("TFTP", "Trivial File Transfer Protocol"),
            80: ("HTTP", "Hypertext Transfer Protocol"),
            110: ("POP3", "Post Office Protocol v3"),
            123: ("NTP", "Network Time Protocol"),
            137: ("NetBIOS-NS", "NetBIOS Name Service"),
            138: ("NetBIOS-DGM", "NetBIOS Datagram Service"),
            139: ("NetBIOS-SSN", "NetBIOS Session Service"),
            143: ("IMAP", "Internet Message Access Protocol"),
            161: ("SNMP", "Simple Network Management Protocol"),
            162: ("SNMP-Trap", "SNMP Trap"),
            389: ("LDAP", "Lightweight Directory Access Protocol"),
            443: ("HTTPS", "HTTP Secure"),
            445: ("SMB", "Server Message Block"),
            465: ("SMTPS", "SMTP Secure"),
            514: ("Syslog", "System Logging Protocol"),
            587: ("SMTP", "SMTP Submission"),
            636: ("LDAPS", "LDAP Secure"),
            993: ("IMAPS", "IMAP Secure"),
            995: ("POP3S", "POP3 Secure"),
            1433: ("MSSQL", "Microsoft SQL Server"),
            1521: ("Oracle", "Oracle Database"),
            3306: ("MySQL", "MySQL Database"),
            3389: ("RDP", "Remote Desktop Protocol"),
            5432: ("PostgreSQL", "PostgreSQL Database"),
            5900: ("VNC", "Virtual Network Computing"),
            6379: ("Redis", "Redis Database"),
            8080: ("HTTP-Alt", "HTTP Alternate"),
            8443: ("HTTPS-Alt", "HTTPS Alternate"),
            27017: ("MongoDB", "MongoDB Database")
        }
        
        for port in [sport, dport]:
            if port in port_map:
                app["protocol"] = port_map[port][0]
                app["details"]["description"] = port_map[port][1]
                app["details"]["port"] = port
                break
        
        return app

    def _packet_callback(self, packet):
        # Store for PCAP export
        self.captured_packets.append(packet)
        if len(self.captured_packets) > self.max_stored_packets:
            self.captured_packets.pop(0)

        packet_data = {
            "id": str(time.time_ns()),
            "timestamp": time.time(),
            "length": len(packet),
            "protocol": "OTHER",
            "source": "N/A",
            "destination": "N/A",
            "summary": packet.summary(),
            "info": "",
            "raw": packet.build().hex(),
            "layers": self._dissect_packet(packet)  # Full dissection
        }

        if Ether in packet:
            packet_data["source"] = packet[Ether].src
            packet_data["destination"] = packet[Ether].dst

        if IP in packet:
            packet_data["source"] = packet[IP].src
            packet_data["destination"] = packet[IP].dst

            # Update stats
            self.stats["total_bytes"] += len(packet)
            self.stats["total_flows"] += 1

            src = packet[IP].src
            dst = packet[IP].dst
            self.stats["top_talkers"][src] = self.stats["top_talkers"].get(src, 0) + len(packet)
            
            # Track discovered hosts from IP packets
            # Strategy depends on track_source_only setting
            current_time = time.time()
            src_mac = packet[Ether].src if Ether in packet else "Unknown"
            dst_mac = packet[Ether].dst if Ether in packet else "Unknown"
            
            if self.track_source_only:
                # SAFE MODE: Only track source IPs
                # Source IP = host exists and is sending traffic (100% reliable)
                # But still filter out invalid source IPs (broadcast, link-local, 0.0.0.0)
                if self._is_valid_source_ip(src) and src not in self.discovered_hosts:
                    self.discovered_hosts[src] = {
                        "first_seen": current_time,
                        "last_seen": current_time,
                        "mac_address": src_mac
                    }
                elif src in self.discovered_hosts:
                    self.discovered_hosts[src]["last_seen"] = current_time
            else:
                # FULL MODE: Track both source AND destination with filtering
                # This may catch passive listeners (UDP servers that don't respond)
                # but requires filtering to avoid false positives
                
                # Track source IP (with basic validation)
                if self._is_valid_source_ip(src) and src not in self.discovered_hosts:
                    self.discovered_hosts[src] = {
                        "first_seen": current_time,
                        "last_seen": current_time,
                        "mac_address": src_mac
                    }
                elif src in self.discovered_hosts:
                    self.discovered_hosts[src]["last_seen"] = current_time
                
                # Track destination IP only if it passes filters
                if self._should_track_ip(dst) and dst not in self.discovered_hosts:
                    self.discovered_hosts[dst] = {
                        "first_seen": current_time,
                        "last_seen": current_time,
                        "mac_address": dst_mac
                    }
                elif dst in self.discovered_hosts:
                    self.discovered_hosts[dst]["last_seen"] = current_time
            
            # Determine protocol
            protocol = "OTHER"
            if TCP in packet:
                protocol = "TCP"
                packet_data["protocol"] = "TCP"
                packet_data["info"] = f"{packet[TCP].sport} -> {packet[TCP].dport} [{packet[TCP].flags}]"
                self.stats["protocols"]["TCP"] = self.stats["protocols"].get("TCP", 0) + 1
            elif UDP in packet:
                protocol = "UDP"
                packet_data["protocol"] = "UDP"
                packet_data["info"] = f"{packet[UDP].sport} -> {packet[UDP].dport}"
                self.stats["protocols"]["UDP"] = self.stats["protocols"].get("UDP", 0) + 1
            elif packet[IP].proto == 1:  # ICMP (Internet Control Message Protocol)
                protocol = "ICMP"
                packet_data["protocol"] = "ICMP"
                if ICMP in packet:
                    icmp_types = {0: "Echo Reply", 8: "Echo Request", 3: "Dest Unreachable", 11: "Time Exceeded"}
                    packet_data["info"] = icmp_types.get(packet[ICMP].type, f"Type {packet[ICMP].type}")
                else:
                    packet_data["info"] = "ICMP"
                self.stats["protocols"]["ICMP"] = self.stats["protocols"].get("ICMP", 0) + 1
            else:
                proto = packet[IP].proto
                protocol = f"IP_{proto}"
                self.stats["protocols"][str(proto)] = self.stats["protocols"].get(str(proto), 0) + 1
            
            # Track connections (src -> dst) with protocol info
            conn_key = f"{src}-{dst}"
            if conn_key not in self.stats["connections"]:
                self.stats["connections"][conn_key] = {"bytes": 0, "protocols": set()}
            self.stats["connections"][conn_key]["bytes"] += len(packet)
            self.stats["connections"][conn_key]["protocols"].add(protocol)

        if self.callback:
            self.callback(packet_data)

    def _run_sniff(self):
        try:
            sniff(
                iface=self.interface,
                prn=self._packet_callback,
                filter=self.filter,
                store=0,
                stop_filter=lambda p: not self.is_sniffing
            )
        except Exception as e:
            print(f"Sniffing error: {e}")
            self.is_sniffing = False

    def start_sniffing(self, interface: str, callback: Optional[Callable], filter_str: Optional[str] = None):
        if self.is_sniffing and self.interface == interface and self.filter == filter_str:
            # Just update callback if already sniffing on same interface/filter
            self.callback = callback
            return

        if self.is_sniffing:
            self.stop_sniffing()

        self.interface = interface
        self.callback = callback
        self.filter = filter_str
        self.is_sniffing = True
        self.captured_packets = []

        self.capture_thread = threading.Thread(target=self._run_sniff, daemon=True)
        self.capture_thread.start()

    def stop_sniffing(self):
        self.is_sniffing = False
        if self.capture_thread:
            self.capture_thread.join(timeout=1.0)
        self.callback = None

    def get_stats(self) -> Dict[str, Any]:
        # Sort top talkers and return top 5
        sorted_talkers = sorted(self.stats["top_talkers"].items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Format connections with protocol information
        connections = []
        for key, conn_data in self.stats["connections"].items():
            src, dst = key.split('-')
            connections.append({
                "source": src, 
                "target": dst, 
                "value": conn_data["bytes"],
                "protocols": list(conn_data["protocols"])
            })

        return {
            "total_flows": self.stats["total_flows"],
            "total_bytes": self.stats["total_bytes"],
            "top_talkers": [{"ip": ip, "bytes": b} for ip, b in sorted_talkers],
            "protocols": self.stats["protocols"],
            "traffic_history": self.traffic_history,
            "connections": connections
        }

    def export_pcap(self, filename: str = "capture.pcap") -> str:
        filepath = os.path.join("/app/evidence", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        wrpcap(filepath, self.captured_packets)
        return filepath

    def craft_and_send_packet(self, packet_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Craft and send a custom packet based on configuration
        Returns response packet and trace information
        """
        # TCP flag mapping
        TCP_FLAG_MAP = {
            "SYN": "S",
            "ACK": "A",
            "FIN": "F",
            "RST": "R",
            "PSH": "P",
            "URG": "U"
        }
        
        try:
            protocol = packet_config.get("protocol", "TCP")
            source_ip = packet_config.get("source_ip")
            dest_ip = packet_config.get("dest_ip")
            source_port = packet_config.get("source_port")
            dest_port = packet_config.get("dest_port")
            payload = packet_config.get("payload", "")
            payload_format = packet_config.get("payload_format", "ascii")
            flags = packet_config.get("flags", [])
            
            # Advanced header fields
            ttl = packet_config.get("ttl")
            ip_id = packet_config.get("ip_id")
            tos = packet_config.get("tos")
            tcp_seq = packet_config.get("tcp_seq")
            tcp_ack = packet_config.get("tcp_ack")
            tcp_window = packet_config.get("tcp_window")
            icmp_type = packet_config.get("icmp_type")
            icmp_code = packet_config.get("icmp_code")
            
            # Multi-packet sending parameters
            packet_count = packet_config.get("packet_count", 1)
            pps = packet_config.get("pps", 1)
            
            if not dest_ip:
                return {
                    "success": False,
                    "error": "Destination IP is required"
                }
            
            trace = []
            packet = None
            
            # Add multi-packet info to trace
            if packet_count == 0:
                trace.append(f"Mode: Continuous sending at {pps} packets/second")
            elif packet_count > 1:
                trace.append(f"Sending {packet_count} packets at {pps} packets/second")
            
            # Build the packet based on protocol
            if protocol == "TCP":
                if not source_port or not dest_port:
                    return {
                        "success": False,
                        "error": "Source and destination ports are required for TCP"
                    }
                
                # Convert flag names to scapy flag string using mapping
                flag_str = ""
                for flag_name in flags:
                    if flag_name in TCP_FLAG_MAP:
                        flag_str += TCP_FLAG_MAP[flag_name]
                if not flag_str:
                    flag_str = "S"  # Default to SYN
                
                trace.append(f"Building TCP packet: {source_ip or 'auto'}:{source_port} -> {dest_ip}:{dest_port}")
                trace.append(f"TCP Flags: {flag_str} ({', '.join(flags) if flags else 'SYN'})")
                
                # Build IP layer
                if source_ip:
                    ip_layer = IP(src=source_ip, dst=dest_ip)
                else:
                    ip_layer = IP(dst=dest_ip)
                
                # Apply IP header options
                if ttl:
                    ip_layer.ttl = ttl
                    trace.append(f"IP TTL: {ttl}")
                if ip_id:
                    ip_layer.id = ip_id
                    trace.append(f"IP ID: {ip_id}")
                if tos:
                    ip_layer.tos = tos
                    trace.append(f"IP TOS: {tos}")
                
                # Build TCP layer
                tcp_layer = TCP(sport=source_port, dport=dest_port, flags=flag_str)
                
                # Apply TCP header options
                if tcp_seq:
                    tcp_layer.seq = tcp_seq
                    trace.append(f"TCP Seq: {tcp_seq}")
                if tcp_ack:
                    tcp_layer.ack = tcp_ack
                    trace.append(f"TCP Ack: {tcp_ack}")
                if tcp_window:
                    tcp_layer.window = tcp_window
                    trace.append(f"TCP Window: {tcp_window}")
                
                packet = ip_layer / tcp_layer
                    
            elif protocol == "UDP":
                if not source_port or not dest_port:
                    return {
                        "success": False,
                        "error": "Source and destination ports are required for UDP"
                    }
                
                trace.append(f"Building UDP packet: {source_ip or 'auto'}:{source_port} -> {dest_ip}:{dest_port}")
                
                # Build IP layer
                if source_ip:
                    ip_layer = IP(src=source_ip, dst=dest_ip)
                else:
                    ip_layer = IP(dst=dest_ip)
                
                # Apply IP header options
                if ttl:
                    ip_layer.ttl = ttl
                    trace.append(f"IP TTL: {ttl}")
                if ip_id:
                    ip_layer.id = ip_id
                    trace.append(f"IP ID: {ip_id}")
                if tos:
                    ip_layer.tos = tos
                    trace.append(f"IP TOS: {tos}")
                
                packet = ip_layer / UDP(sport=source_port, dport=dest_port)
                    
            elif protocol == "ICMP":
                trace.append(f"Building ICMP packet: {source_ip or 'auto'} -> {dest_ip}")
                
                # Build IP layer
                if source_ip:
                    ip_layer = IP(src=source_ip, dst=dest_ip)
                else:
                    ip_layer = IP(dst=dest_ip)
                
                # Apply IP header options
                if ttl:
                    ip_layer.ttl = ttl
                    trace.append(f"IP TTL: {ttl}")
                if ip_id:
                    ip_layer.id = ip_id
                    trace.append(f"IP ID: {ip_id}")
                if tos:
                    ip_layer.tos = tos
                    trace.append(f"IP TOS: {tos}")
                
                # Build ICMP layer with custom type/code if provided
                icmp_layer = ICMP()
                if icmp_type is not None:
                    icmp_layer.type = icmp_type
                    trace.append(f"ICMP Type: {icmp_type}")
                if icmp_code is not None:
                    icmp_layer.code = icmp_code
                    trace.append(f"ICMP Code: {icmp_code}")
                
                packet = ip_layer / icmp_layer
                    
            elif protocol == "ARP":
                trace.append(f"Building ARP packet for {dest_ip}")
                packet = ARP(pdst=dest_ip)
                
            elif protocol == "IP":
                trace.append(f"Building raw IP packet: {source_ip or 'auto'} -> {dest_ip}")
                
                if source_ip:
                    ip_layer = IP(src=source_ip, dst=dest_ip)
                else:
                    ip_layer = IP(dst=dest_ip)
                
                # Apply IP header options
                if ttl:
                    ip_layer.ttl = ttl
                    trace.append(f"IP TTL: {ttl}")
                if ip_id:
                    ip_layer.id = ip_id
                    trace.append(f"IP ID: {ip_id}")
                if tos:
                    ip_layer.tos = tos
                    trace.append(f"IP TOS: {tos}")
                
                packet = ip_layer
            
            else:
                return {
                    "success": False,
                    "error": f"Unsupported protocol: {protocol}"
                }
            
            # Add payload if provided
            if payload and packet:
                # Process payload based on format
                if payload_format == "hex":
                    # Remove spaces and convert hex to bytes
                    hex_str = payload.replace(" ", "").replace("\n", "")
                    try:
                        payload_bytes = bytes.fromhex(hex_str)
                        trace.append(f"Adding hex payload: {len(payload_bytes)} bytes")
                        packet = packet / payload_bytes
                    except ValueError as e:
                        trace.append(f"Invalid hex payload: {str(e)}")
                        return {
                            "success": False,
                            "error": f"Invalid hex payload format: {str(e)}",
                            "trace": trace
                        }
                else:
                    # ASCII format
                    trace.append(f"Adding ASCII payload: {len(payload)} characters")
                    if isinstance(payload, str):
                        packet = packet / payload.encode()
                    else:
                        packet = packet / payload
            
            # Send the packet(s)
            trace.append("Sending packet...")
            trace.append(f"Packet summary: {packet.summary()}")
            start_time = time.time()
            
            # For continuous or multi-packet sending
            if packet_count == 0 or packet_count > 1:
                sent_count = 0
                delay = 1.0 / pps if pps > 0 else 0
                
                # For demo purposes, limit continuous to 100 packets per request
                max_packets = 100 if packet_count == 0 else packet_count
                
                trace.append(f"Multi-packet mode: sending up to {max_packets} packets")
                
                for i in range(max_packets):
                    try:
                        send(packet, verbose=0)
                        sent_count += 1
                        if delay > 0 and i < max_packets - 1:
                            time.sleep(delay)
                        
                        # Break for continuous mode after 100 (safety limit)
                        if packet_count == 0 and sent_count >= 100:
                            trace.append(f"Safety limit reached: sent {sent_count} packets")
                            break
                    except Exception as e:
                        trace.append(f"Error sending packet {i+1}: {str(e)}")
                        break
                
                elapsed = time.time() - start_time
                trace.append(f"Sent {sent_count} packets in {elapsed:.3f} seconds ({sent_count/elapsed:.1f} pps)")
                
                return {
                    "success": True,
                    "sent_packet": {
                        "protocol": protocol,
                        "source": packet[IP].src if IP in packet else "N/A",
                        "destination": packet[IP].dst if IP in packet else dest_ip,
                        "summary": packet.summary(),
                        "length": len(packet),
                        "count": sent_count
                    },
                    "response": None,
                    "trace": trace
                }
            
            # Single packet mode - wait for response
            try:
                # sr1 sends packet and receives first response
                response = sr1(packet, timeout=self.PACKET_SEND_TIMEOUT, verbose=0)
                elapsed = time.time() - start_time
                
                if response:
                    trace.append(f"Response received in {elapsed:.3f} seconds")
                    trace.append(f"Response summary: {response.summary()}")
                    
                    # Parse response details
                    response_data = {
                        "summary": response.summary(),
                        "protocol": None,
                        "source": None,
                        "destination": None,
                        "length": len(response),
                        "raw_hex": response.build().hex()[:self.RESPONSE_HEX_MAX_LENGTH]
                    }
                    
                    if IP in response:
                        response_data["source"] = response[IP].src
                        response_data["destination"] = response[IP].dst
                        
                        if TCP in response:
                            response_data["protocol"] = "TCP"
                            response_data["tcp_flags"] = str(response[TCP].flags)
                            response_data["sport"] = response[TCP].sport
                            response_data["dport"] = response[TCP].dport
                        elif UDP in response:
                            response_data["protocol"] = "UDP"
                            response_data["sport"] = response[UDP].sport
                            response_data["dport"] = response[UDP].dport
                        elif ICMP in response:
                            response_data["protocol"] = "ICMP"
                            response_data["icmp_type"] = response[ICMP].type
                            response_data["icmp_code"] = response[ICMP].code
                    
                    return {
                        "success": True,
                        "sent_packet": {
                            "protocol": protocol,
                            "source": packet[IP].src if IP in packet else "N/A",
                            "destination": packet[IP].dst if IP in packet else dest_ip,
                            "summary": packet.summary(),
                            "length": len(packet)
                        },
                        "response": response_data,
                        "trace": trace
                    }
                else:
                    trace.append(f"No response received (timeout: {self.PACKET_SEND_TIMEOUT}s)")
                    
                    # Add helpful note about why there might be no response
                    note = None
                    if protocol == "TCP" and flags and "SYN" in flags:
                        note = self.NOTE_TCP_SYN_NO_RESPONSE
                    elif protocol == "UDP":
                        note = self.NOTE_UDP_NO_RESPONSE
                    
                    result = {
                        "success": True,
                        "sent_packet": {
                            "protocol": protocol,
                            "source": packet[IP].src if IP in packet else "N/A",
                            "destination": packet[IP].dst if IP in packet else dest_ip,
                            "summary": packet.summary(),
                            "length": len(packet)
                        },
                        "response": None,
                        "trace": trace
                    }
                    
                    if note:
                        result["note"] = note
                        trace.append(note)
                    
                    return result
                    
            except Exception as send_err:
                trace.append(f"Error during send: {str(send_err)}")
                return {
                    "success": False,
                    "error": f"Failed to send packet: {str(send_err)}",
                    "trace": trace
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Packet crafting error: {str(e)}"
            }
    
    def start_storm(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Start a packet storm based on configuration
        """
        if self.is_storming:
            return {
                "success": False,
                "error": "Storm already in progress. Stop the current storm before starting a new one."
            }
        
        try:
            # Validate configuration
            packet_type = config.get("packet_type", "tcp")
            dest_ip = config.get("dest_ip")
            pps = config.get("pps", 100)
            interface = config.get("interface", "eth0")
            
            if not dest_ip:
                return {
                    "success": False,
                    "error": "Destination IP is required"
                }
            
            # Validate PPS
            if not isinstance(pps, int) or pps < 1 or pps > 10000000:
                return {
                    "success": False,
                    "error": "PPS must be between 1 and 10,000,000"
                }
            
            # Validate packet type
            valid_types = ["broadcast", "multicast", "tcp", "udp", "raw_ip"]
            if packet_type not in valid_types:
                return {
                    "success": False,
                    "error": f"Invalid packet type. Must be one of: {', '.join(valid_types)}"
                }
            
            # Validate ports for TCP/UDP
            if packet_type in ["tcp", "udp"]:
                dest_port = config.get("dest_port")
                if not dest_port:
                    return {
                        "success": False,
                        "error": f"Destination port is required for {packet_type.upper()}"
                    }
            
            # Store config
            self.storm_config = config
            self.storm_metrics = {
                "packets_sent": 0,
                "bytes_sent": 0,
                "start_time": time.time(),
                "duration_seconds": 0,
                "current_pps": 0,
                "target_pps": pps
            }
            
            # Start storm thread
            self.is_storming = True
            self.storm_thread = threading.Thread(target=self._run_storm, daemon=True)
            self.storm_thread.start()
            
            logger.info(f"Storm started: {packet_type} to {dest_ip} at {pps} PPS on {interface}")
            
            return {
                "success": True,
                "message": f"Storm started on {interface} targeting {dest_ip} at {pps} PPS"
            }
            
        except Exception as e:
            logger.error(f"Failed to start storm: {e}")
            return {
                "success": False,
                "error": f"Failed to start storm: {str(e)}"
            }
    
    def _run_storm(self):
        """
        Run the packet storm in a background thread with ultra-high-performance sending
        """
        try:
            config = self.storm_config
            packet_type = config.get("packet_type", "tcp")
            source_ip = config.get("source_ip")
            dest_ip = config.get("dest_ip")
            source_port = config.get("source_port")
            dest_port = config.get("dest_port", 80)
            pps = config.get("pps", 100)
            payload = config.get("payload", "")
            ttl = config.get("ttl", 64)
            tcp_flags = config.get("tcp_flags", ["SYN"])
            
            # Build packet template
            packet = None
            use_raw_socket = False
            use_layer2 = False  # Track if we need Ethernet layer
            
            if packet_type == "broadcast":
                # Broadcast can use either Layer 2 (Ether) or Layer 3 (IP broadcast)
                # For high PPS, use Layer 3 IP broadcast which supports raw sockets
                if pps >= 1000:
                    # High-rate IP broadcast (no Ether layer)
                    udp_layer = UDP(dport=dest_port)
                    if source_port:
                        udp_layer.sport = source_port
                    packet = IP(dst="255.255.255.255", ttl=ttl) / udp_layer
                    if payload:
                        packet = packet / Raw(load=payload)
                    use_raw_socket = True
                else:
                    # Low-rate Layer 2 broadcast
                    udp_layer = UDP(dport=dest_port)
                    if source_port:
                        udp_layer.sport = source_port
                    packet = Ether(dst="ff:ff:ff:ff:ff:ff") / IP(dst="255.255.255.255", ttl=ttl) / udp_layer
                    if payload:
                        packet = packet / Raw(load=payload)
                    use_layer2 = True
            
            elif packet_type == "multicast":
                # Multicast UDP packet
                udp_layer = UDP(dport=dest_port)
                if source_port:
                    udp_layer.sport = source_port
                packet = IP(dst="224.0.0.1", ttl=ttl) / udp_layer
                if payload:
                    packet = packet / Raw(load=payload)
                use_raw_socket = pps >= 1000  # Use raw socket for high-rate IP packets
            
            elif packet_type == "tcp":
                # TCP packet
                flag_str = "".join([{"SYN": "S", "ACK": "A", "FIN": "F", "RST": "R", "PSH": "P", "URG": "U"}.get(f, "") for f in tcp_flags])
                if not flag_str:
                    flag_str = "S"
                
                if source_ip:
                    ip_layer = IP(src=source_ip, dst=dest_ip, ttl=ttl)
                else:
                    ip_layer = IP(dst=dest_ip, ttl=ttl)
                
                tcp_layer = TCP(dport=dest_port, flags=flag_str)
                if source_port:
                    tcp_layer.sport = source_port
                
                packet = ip_layer / tcp_layer
                if payload:
                    packet = packet / Raw(load=payload)
                use_raw_socket = pps >= 1000
            
            elif packet_type == "udp":
                # UDP packet
                if source_ip:
                    ip_layer = IP(src=source_ip, dst=dest_ip, ttl=ttl)
                else:
                    ip_layer = IP(dst=dest_ip, ttl=ttl)
                
                udp_layer = UDP(dport=dest_port)
                if source_port:
                    udp_layer.sport = source_port
                
                packet = ip_layer / udp_layer
                if payload:
                    packet = packet / Raw(load=payload)
                use_raw_socket = pps >= 1000
            
            elif packet_type == "raw_ip":
                # Raw IP packet
                if source_ip:
                    packet = IP(src=source_ip, dst=dest_ip, ttl=ttl)
                else:
                    packet = IP(dst=dest_ip, ttl=ttl)
                if payload:
                    packet = packet / Raw(load=payload)
                use_raw_socket = pps >= 1000
            
            if not packet:
                logger.error(f"Failed to build packet for type: {packet_type}")
                self.is_storming = False
                return
            
            # Pre-build packet bytes for raw socket mode
            packet_bytes = bytes(packet) if use_raw_socket else None
            packet_size = len(packet)
            
            packet_count = 0
            bytes_count = 0
            last_metrics_update = time.time()
            
            logger.info(f"Starting storm: {packet_type} to {dest_ip} at {pps} PPS (raw_socket={use_raw_socket}, packet_bytes={'present' if packet_bytes else 'none'})")
            
            if use_raw_socket and packet_bytes:
                # Ultra-high-rate mode: Raw socket flooding with rate limiting
                try:
                    is_broadcast = dest_ip == "255.255.255.255"
                    
                    # For very high rates (>=50k PPS), use multi-threaded flooding
                    if pps >= 50000:
                        num_threads = min(4, max(2, pps // 25000))  # 2-4 threads based on target
                        logger.info(f"Multi-threaded flood mode: target {pps} PPS with {num_threads} threads")
                        
                        thread_packet_counts = [0] * num_threads
                        
                        def sender_thread(thread_id):
                            # Each thread has its own socket
                            sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_RAW)
                            sock.setsockopt(socket.SOL_IP, socket.IP_HDRINCL, 1)
                            if is_broadcast:
                                sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                            
                            local_count = 0
                            while self.is_storming:
                                sock.sendto(packet_bytes, (dest_ip, 0))
                                local_count += 1
                                # Update shared counter periodically
                                if local_count % 1000 == 0:
                                    thread_packet_counts[thread_id] = local_count
                            
                            thread_packet_counts[thread_id] = local_count
                            sock.close()
                        
                        # Start sender threads
                        threads = []
                        for i in range(num_threads):
                            t = threading.Thread(target=sender_thread, args=(i,), daemon=True)
                            t.start()
                            threads.append(t)
                        
                        # Monitor and update metrics
                        while self.is_storming:
                            time.sleep(0.25)
                            packet_count = sum(thread_packet_counts)
                            bytes_count = packet_count * packet_size
                            current_time = time.time()
                            elapsed = current_time - self.storm_metrics["start_time"]
                            self.storm_metrics["packets_sent"] = packet_count
                            self.storm_metrics["bytes_sent"] = bytes_count
                            self.storm_metrics["duration_seconds"] = int(elapsed)
                            if elapsed > 0:
                                self.storm_metrics["current_pps"] = int(packet_count / elapsed)
                        
                        # Wait for threads to stop
                        for t in threads:
                            t.join(timeout=1.0)
                        
                        packet_count = sum(thread_packet_counts)
                        bytes_count = packet_count * packet_size
                    
                    # For high rates (10k-50k PPS), use single-thread flood mode
                    elif pps >= 10000:
                        # Create raw socket
                        sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_RAW)
                        sock.setsockopt(socket.SOL_IP, socket.IP_HDRINCL, 1)
                        if is_broadcast:
                            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                        
                        logger.info(f"Flood mode: target {pps} PPS")
                        packets_per_check = max(100, pps // 10)  # Check every 1/10th second worth
                        check_interval = packets_per_check / pps  # Time allowed for this burst
                        
                        while self.is_storming:
                            burst_start = time.time()
                            
                            # Send burst as fast as possible
                            for _ in range(packets_per_check):
                                sock.sendto(packet_bytes, (dest_ip, 0))
                                packet_count += 1
                            
                            bytes_count = packet_count * packet_size
                            
                            # Update metrics
                            current_time = time.time()
                            if current_time - last_metrics_update >= 0.25:
                                elapsed = current_time - self.storm_metrics["start_time"]
                                self.storm_metrics["packets_sent"] = packet_count
                                self.storm_metrics["bytes_sent"] = bytes_count
                                self.storm_metrics["duration_seconds"] = int(elapsed)
                                if elapsed > 0:
                                    self.storm_metrics["current_pps"] = int(packet_count / elapsed)
                                last_metrics_update = current_time
                            
                            # Throttle to maintain target PPS
                            elapsed_burst = time.time() - burst_start
                            if elapsed_burst < check_interval:
                                time.sleep(check_interval - elapsed_burst)
                        
                        sock.close()
                    else:
                        # Medium rate (1k-10k): Tighter burst control
                        # Create raw socket for this mode
                        sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_RAW)
                        sock.setsockopt(socket.SOL_IP, socket.IP_HDRINCL, 1)
                        if is_broadcast:
                            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                        
                        burst_size = max(10, int(pps / 100))
                        burst_interval = burst_size / pps
                        
                        logger.info(f"Raw socket mode: burst_size={burst_size}, burst_interval={burst_interval:.6f}s")
                        
                        while self.is_storming:
                            start_burst = time.time()
                            
                            # Send burst
                            for _ in range(burst_size):
                                sock.sendto(packet_bytes, (dest_ip, 0))
                                packet_count += 1
                            
                            bytes_count = packet_count * packet_size
                            
                            # Update metrics periodically
                            current_time = time.time()
                            if current_time - last_metrics_update >= 0.5:
                                elapsed = current_time - self.storm_metrics["start_time"]
                                self.storm_metrics["packets_sent"] = packet_count
                                self.storm_metrics["bytes_sent"] = bytes_count
                                self.storm_metrics["duration_seconds"] = int(elapsed)
                                if elapsed > 0:
                                    self.storm_metrics["current_pps"] = int(packet_count / elapsed)
                                last_metrics_update = current_time
                            
                            # Sleep for remaining burst interval
                            elapsed_burst = time.time() - start_burst
                            sleep_time = burst_interval - elapsed_burst
                            if sleep_time > 0:
                                time.sleep(sleep_time)
                        
                        sock.close()
                    
                except Exception as e:
                    logger.error(f"Raw socket error: {e}")
                    # Fallback to scapy
                    use_raw_socket = False
            
            if not use_raw_socket:
                # Standard mode for low-rate or Layer 2 packets
                # If packet doesn't have Ether layer, add it for sendp()
                if not use_layer2 and not packet.haslayer(Ether):
                    packet = Ether() / packet
                
                if pps >= 1000:
                    # Medium-rate: sendp with batching
                    inter = 1.0 / pps
                    batch_size = min(100, int(pps / 10))  # Smaller batches, faster iteration
                    packet_batch = [packet] * batch_size
                    
                    logger.info(f"Batch mode: batch_size={batch_size}, inter={inter:.6f}s")
                    
                    while self.is_storming:
                        try:
                            sendp(packet_batch, inter=inter, verbose=False)
                            packet_count += batch_size
                            bytes_count += packet_size * batch_size
                            
                            current_time = time.time()
                            if current_time - last_metrics_update >= 0.5:
                                elapsed = current_time - self.storm_metrics["start_time"]
                                self.storm_metrics["packets_sent"] = packet_count
                                self.storm_metrics["bytes_sent"] = bytes_count
                                self.storm_metrics["duration_seconds"] = int(elapsed)
                                if elapsed > 0:
                                    self.storm_metrics["current_pps"] = int(packet_count / elapsed)
                                last_metrics_update = current_time
                        except Exception as e:
                            logger.error(f"Batch send error: {e}")
                            time.sleep(0.1)
                else:
                    # Low-rate: Individual sends
                    sleep_time = 1.0 / pps if pps > 0 else 0
                    packets_in_last_second = 0
                    last_pps_calc = time.time()
                    
                    while self.is_storming:
                        try:
                            send(packet, verbose=False)
                            packet_count += 1
                            bytes_count += packet_size
                            packets_in_last_second += 1
                            
                            current_time = time.time()
                            self.storm_metrics["packets_sent"] = packet_count
                            self.storm_metrics["bytes_sent"] = bytes_count
                            self.storm_metrics["duration_seconds"] = int(current_time - self.storm_metrics["start_time"])
                            
                            if current_time - last_pps_calc >= 1.0:
                                self.storm_metrics["current_pps"] = packets_in_last_second
                                packets_in_last_second = 0
                                last_pps_calc = current_time
                            
                            if sleep_time > 0:
                                time.sleep(sleep_time)
                        except Exception as e:
                            logger.error(f"Send error: {e}")
                            time.sleep(0.1)
            
            logger.info(f"Storm stopped: Sent {packet_count} packets ({bytes_count} bytes)")
            
        except Exception as e:
            logger.error(f"Storm thread error: {e}")
            self.is_storming = False
    
    def stop_storm(self) -> Dict[str, Any]:
        """
        Stop the current packet storm
        """
        if not self.is_storming:
            return {
                "success": False,
                "error": "No storm in progress"
            }
        
        self.is_storming = False
        
        if self.storm_thread:
            self.storm_thread.join(timeout=self.STORM_THREAD_STOP_TIMEOUT)
        
        return {
            "success": True,
            "message": "Storm stopped",
            "final_metrics": self.storm_metrics.copy()
        }
    
    def get_storm_metrics(self) -> Dict[str, Any]:
        """
        Get current storm metrics
        """
        if not self.is_storming and self.storm_metrics["start_time"] is None:
            return {
                "active": False,
                "packets_sent": 0,
                "bytes_sent": 0,
                "duration_seconds": 0,
                "current_pps": 0,
                "target_pps": 0,
                "start_time": ""
            }
        
        # Update duration if storm is active
        if self.is_storming and self.storm_metrics["start_time"]:
            self.storm_metrics["duration_seconds"] = int(time.time() - self.storm_metrics["start_time"])
        
        return {
            "active": self.is_storming,
            "packets_sent": self.storm_metrics["packets_sent"],
            "bytes_sent": self.storm_metrics["bytes_sent"],
            "duration_seconds": self.storm_metrics["duration_seconds"],
            "current_pps": self.storm_metrics["current_pps"],
            "target_pps": self.storm_metrics["target_pps"],
            "start_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.storm_metrics["start_time"])) if self.storm_metrics["start_time"] else ""
        }

sniffer_service = SnifferService()
