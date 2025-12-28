import asyncio
import json
import threading
import ipaddress
from typing import Dict, List, Optional, Callable, Any
from scapy.all import sniff, IP, TCP, UDP, ARP, Ether, ICMP, Raw, wrpcap
import psutil
import time
import os

class SnifferService:
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
        # Passive discovery tracking
        self.discovered_hosts = {}  # Format: {"ip": {"first_seen": timestamp, "last_seen": timestamp, "mac": str, "protocols": set()}}
        self.traffic_history = []
        self.interface_history = {} # Store history for each interface
        self.last_bytes_check = 0
        self.last_if_stats = {}
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
            "layers": {}
        }

        # Dissect Ethernet layer
        src_mac = None
        dst_mac = None
        if Ether in packet:
            packet_data["source"] = packet[Ether].src
            packet_data["destination"] = packet[Ether].dst
            src_mac = packet[Ether].src
            dst_mac = packet[Ether].dst
            ether_type = packet[Ether].type
            ether_type_name = {0x0800: "IPv4", 0x0806: "ARP", 0x86DD: "IPv6", 0x8100: "VLAN"}.get(ether_type, f"0x{ether_type:04x}")
            packet_data["layers"]["ethernet"] = {
                "src_mac": src_mac,
                "dst_mac": dst_mac,
                "type": ether_type_name
            }
        
        # Dissect ARP layer
        if ARP in packet:
            arp = packet[ARP]
            op_name = {1: "Request (who-has)", 2: "Reply (is-at)"}.get(arp.op, f"Unknown ({arp.op})")
            packet_data["protocol"] = "ARP"
            packet_data["info"] = f"{op_name}: {arp.psrc} -> {arp.pdst}"
            packet_data["layers"]["arp"] = {
                "hardware_type": "Ethernet" if arp.hwtype == 1 else str(arp.hwtype),
                "protocol_type": "IPv4" if arp.ptype == 0x0800 else f"0x{arp.ptype:04x}",
                "operation": op_name,
                "sender_mac": arp.hwsrc,
                "sender_ip": arp.psrc,
                "target_mac": arp.hwdst,
                "target_ip": arp.pdst
            }

        if IP in packet:
            packet_data["source"] = packet[IP].src
            packet_data["destination"] = packet[IP].dst
            
            # Dissect IP layer
            ip = packet[IP]
            proto_names = {1: "ICMP", 6: "TCP", 17: "UDP", 47: "GRE", 50: "ESP", 51: "AH", 89: "OSPF"}
            ip_flags = []
            if ip.flags.DF: ip_flags.append("DF")
            if ip.flags.MF: ip_flags.append("MF")
            packet_data["layers"]["ip"] = {
                "version": ip.version,
                "header_length": ip.ihl * 4,
                "tos": ip.tos,
                "total_length": ip.len,
                "identification": ip.id,
                "flags": ",".join(ip_flags) if ip_flags else "None",
                "fragment_offset": ip.frag,
                "ttl": ip.ttl,
                "protocol": ip.proto,
                "protocol_name": proto_names.get(ip.proto, f"Unknown ({ip.proto})"),
                "checksum": f"0x{ip.chksum:04x}",
                "src": ip.src,
                "dst": ip.dst
            }

            # Update stats
            self.stats["total_bytes"] += len(packet)
            self.stats["total_flows"] += 1

            src = packet[IP].src
            dst = packet[IP].dst
            self.stats["top_talkers"][src] = self.stats["top_talkers"].get(src, 0) + len(packet)
            
            # Passive discovery: Track discovered hosts
            current_time = time.time()
            
            # Track source IP
            if src not in self.discovered_hosts:
                self.discovered_hosts[src] = {
                    "first_seen": current_time,
                    "last_seen": current_time,
                    "mac": src_mac,
                    "protocols": set()
                }
            else:
                self.discovered_hosts[src]["last_seen"] = current_time
                if src_mac and not self.discovered_hosts[src]["mac"]:
                    self.discovered_hosts[src]["mac"] = src_mac
            
            # Track destination IP (only if it's not broadcast/multicast)
            if dst not in self.discovered_hosts and not self._is_broadcast_or_multicast(dst):
                self.discovered_hosts[dst] = {
                    "first_seen": current_time,
                    "last_seen": current_time,
                    "mac": dst_mac,
                    "protocols": set()
                }
            elif dst in self.discovered_hosts:
                self.discovered_hosts[dst]["last_seen"] = current_time
                if dst_mac and not self.discovered_hosts[dst]["mac"]:
                    self.discovered_hosts[dst]["mac"] = dst_mac
            
            # Determine protocol and dissect transport layer
            protocol = "OTHER"
            if TCP in packet:
                tcp = packet[TCP]
                protocol = "TCP"
                packet_data["protocol"] = "TCP"
                # Format TCP flags
                flags_list = []
                if tcp.flags.S: flags_list.append("SYN")
                if tcp.flags.A: flags_list.append("ACK")
                if tcp.flags.F: flags_list.append("FIN")
                if tcp.flags.R: flags_list.append("RST")
                if tcp.flags.P: flags_list.append("PSH")
                if tcp.flags.U: flags_list.append("URG")
                flags_str = ",".join(flags_list) if flags_list else "None"
                packet_data["info"] = f"{tcp.sport} → {tcp.dport} [{flags_str}] Seq={tcp.seq} Ack={tcp.ack}"
                packet_data["layers"]["tcp"] = {
                    "src_port": tcp.sport,
                    "dst_port": tcp.dport,
                    "seq": tcp.seq,
                    "ack": tcp.ack,
                    "data_offset": tcp.dataofs * 4,
                    "flags": flags_str,
                    "window": tcp.window,
                    "checksum": f"0x{tcp.chksum:04x}",
                    "urgent_pointer": tcp.urgptr
                }
                self.stats["protocols"]["TCP"] = self.stats["protocols"].get("TCP", 0) + 1
                # Track protocol for passive discovery
                if src in self.discovered_hosts:
                    self.discovered_hosts[src]["protocols"].add("TCP")
                if dst in self.discovered_hosts:
                    self.discovered_hosts[dst]["protocols"].add("TCP")
            elif UDP in packet:
                udp = packet[UDP]
                protocol = "UDP"
                packet_data["protocol"] = "UDP"
                packet_data["info"] = f"{udp.sport} → {udp.dport} Len={udp.len}"
                packet_data["layers"]["udp"] = {
                    "src_port": udp.sport,
                    "dst_port": udp.dport,
                    "length": udp.len,
                    "checksum": f"0x{udp.chksum:04x}"
                }
                self.stats["protocols"]["UDP"] = self.stats["protocols"].get("UDP", 0) + 1
                # Track protocol for passive discovery
                if src in self.discovered_hosts:
                    self.discovered_hosts[src]["protocols"].add("UDP")
                if dst in self.discovered_hosts:
                    self.discovered_hosts[dst]["protocols"].add("UDP")
            elif ICMP in packet:
                icmp = packet[ICMP]
                protocol = "ICMP"
                packet_data["protocol"] = "ICMP"
                icmp_types = {
                    0: "Echo Reply", 3: "Destination Unreachable", 4: "Source Quench",
                    5: "Redirect", 8: "Echo Request", 9: "Router Advertisement",
                    10: "Router Solicitation", 11: "Time Exceeded", 12: "Parameter Problem",
                    13: "Timestamp Request", 14: "Timestamp Reply"
                }
                type_name = icmp_types.get(icmp.type, f"Type {icmp.type}")
                packet_data["info"] = f"{type_name} (type={icmp.type}, code={icmp.code})"
                icmp_layer = {
                    "type": icmp.type,
                    "type_name": type_name,
                    "code": icmp.code,
                    "checksum": f"0x{icmp.chksum:04x}"
                }
                # Add identifier and sequence for echo request/reply
                if icmp.type in [0, 8]:
                    icmp_layer["identifier"] = icmp.id
                    icmp_layer["sequence"] = icmp.seq
                packet_data["layers"]["icmp"] = icmp_layer
                self.stats["protocols"]["ICMP"] = self.stats["protocols"].get("ICMP", 0) + 1
                # Track protocol for passive discovery
                if src in self.discovered_hosts:
                    self.discovered_hosts[src]["protocols"].add("ICMP")
                if dst in self.discovered_hosts:
                    self.discovered_hosts[dst]["protocols"].add("ICMP")
            else:
                proto = packet[IP].proto
                protocol = f"IP_{proto}"
                self.stats["protocols"][str(proto)] = self.stats["protocols"].get(str(proto), 0) + 1
            
            # Add payload information if present
            if Raw in packet:
                payload = packet[Raw].load
                # Create ASCII preview (printable chars only)
                preview = ''.join(chr(b) if 32 <= b < 127 else '.' for b in payload[:64])
                packet_data["layers"]["payload"] = {
                    "length": len(payload),
                    "preview": preview
                }
            
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

    def _is_broadcast_or_multicast(self, ip: str) -> bool:
        """Check if IP is broadcast or multicast address"""
        try:
            addr = ipaddress.ip_address(ip)
            return addr.is_multicast or addr.is_reserved or addr.is_loopback
        except ValueError:
            return True  # Invalid IP, skip it

    def get_discovered_hosts(self) -> List[Dict[str, Any]]:
        """Get list of passively discovered hosts from network traffic"""
        hosts = []
        for ip, data in self.discovered_hosts.items():
            hosts.append({
                "ip_address": ip,
                "mac_address": data.get("mac"),
                "first_seen": data.get("first_seen"),
                "last_seen": data.get("last_seen"),
                "protocols": list(data.get("protocols", set())),
                "discovery_method": "passive"
            })
        return hosts

    def clear_discovered_hosts(self):
        """Clear the discovered hosts cache"""
        self.discovered_hosts = {}

sniffer_service = SnifferService()
