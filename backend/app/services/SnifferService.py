import asyncio
import json
import threading
from typing import Dict, List, Optional, Callable, Any
from scapy.all import sniff, IP, TCP, UDP, ARP, Ether, wrpcap, send, sr1, ICMP
import psutil
import time
import os

class SnifferService:
    # Constants for packet crafting
    PACKET_SEND_TIMEOUT = 3  # seconds
    RESPONSE_HEX_MAX_LENGTH = 200  # characters
    
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
            "raw": packet.build().hex()
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
                packet_data["info"] = "ICMP Echo/Reply"
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
            
            if not dest_ip:
                return {
                    "success": False,
                    "error": "Destination IP is required"
                }
            
            trace = []
            packet = None
            
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
                trace.append(f"Adding payload: {len(payload)} characters")
                if isinstance(payload, str):
                    packet = packet / payload.encode()
                else:
                    packet = packet / payload
            
            # Send the packet and wait for response
            trace.append("Sending packet...")
            start_time = time.time()
            
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
                    return {
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

sniffer_service = SnifferService()
