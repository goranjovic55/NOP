import asyncio
import json
import logging
import threading
import multiprocessing
from typing import Dict, List, Optional, Callable, Any, Set
from scapy.all import sniff, IP, TCP, UDP, ARP, Ether, wrpcap, send, sendp, sendpfast, sr1, ICMP, Raw, Dot1Q, STP, LLC
import psutil
import time
import os
import socket
import struct

# Import L2 protocol layers for industrial/enterprise detection
try:
    from scapy.contrib.lldp import LLDPDU, LLDPDUChassisID, LLDPDUPortID, LLDPDUSystemName, LLDPDUSystemDescription, LLDPDUManagementAddress
    LLDP_AVAILABLE = True
except ImportError:
    LLDP_AVAILABLE = False

try:
    from scapy.contrib.cdp import CDPv2_HDR, CDPMsgDeviceID, CDPMsgAddr, CDPMsgPortID, CDPMsgPlatform
    CDP_AVAILABLE = True
except ImportError:
    CDP_AVAILABLE = False

# Import DPI service for deep packet inspection
from app.services.DPIOrchestrationService import dpi_service, DPIResult

logger = logging.getLogger(__name__)

class SnifferService:
    # Constants for packet crafting
    PACKET_SEND_TIMEOUT = 3  # seconds
    RESPONSE_HEX_MAX_LENGTH = 200  # characters
    STORM_THREAD_STOP_TIMEOUT = 2.0  # seconds
    
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
        
        # Passive scan - detect open ports from SYN/ACK responses
        self.passive_scan_enabled = False
        self.detected_services = {}  # Format: {host_ip: {port: {"service": name, "first_seen": ts, "last_seen": ts, "syn_ack_count": n}}}
        
        # Enhanced passive discovery - OS detection, hostnames, service versions
        self.host_os_info = {}  # Format: {ip: {"os": "Linux/Windows/...", "ttl": int, "confidence": float}}
        self.host_hostnames = {}  # Format: {ip: {"hostname": str, "source": "dns/netbios/mdns", "last_seen": ts}}
        self.service_versions = {}  # Format: {ip: {port: {"banner": str, "version": str, "last_seen": ts}}}
        
        # DPI (Deep Packet Inspection) settings
        self.dpi_enabled = True  # Enable DPI by default
        self.dpi_service = dpi_service  # Reference to singleton DPI service
        
        # L2 Layer tracking for switch detection and MAC-based topology
        self.l2_entities = {}  # Format: {mac: {"first_seen": ts, "last_seen": ts, "ips": set(), "vendors": str, "packets": int}}
        self.l2_connections = {}  # Format: {"src_mac-dst_mac": {"packets": int, "bytes": int, "ethertype": set()}}
        self.l2_switch_candidates = {}  # MACs that forward traffic between multiple other MACs
        self.l2_multicast_groups = {}  # Format: {multicast_mac: {"sources": set(), "packets": int}}
        
        # Enhanced L2 protocol tracking
        self.l2_vlans = {}  # Format: {vlan_id: {"name": str, "members": set(mac), "trunk_ports": set(), "packets": int}}
        self.l2_stp_bridges = {}  # Format: {bridge_mac: {"root_id": int, "bridge_id": int, "port_roles": {}, "state": str}}
        self.l2_lldp_neighbors = {}  # Format: {mac: {"system_name": str, "port_id": str, "mgmt_ip": str, "capabilities": []}}
        self.l2_cdp_neighbors = {}  # Format: {mac: {"device_id": str, "platform": str, "port_id": str, "ip": str}}
        self.l2_ring_topologies = {}  # Format: {"ring_id": {"protocol": str, "members": [], "state": str}}
        self.l2_lacp_groups = {}  # Format: {actor_key: {"members": set(mac), "partner": str, "state": str}}
        
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
        
        # Track whether sniffing is in "persistent" mode (started via API, not WebSocket)
        self.persistent_capture = False
        
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
    
    def get_l2_entities(self) -> List[Dict[str, Any]]:
        """Return list of L2 (MAC-level) entities for topology"""
        entities = []
        for mac, info in self.l2_entities.items():
            entities.append({
                "mac": mac,
                "first_seen": info.get("first_seen"),
                "last_seen": info.get("last_seen"),
                "ips": list(info.get("ips", set())),
                "packets": info.get("packets", 0),
                "bytes": info.get("bytes", 0)
            })
        return entities
    
    def get_l2_connections(self) -> List[Dict[str, Any]]:
        """Return L2 connections (MAC to MAC) for topology"""
        connections = []
        for conn_key, info in self.l2_connections.items():
            src_mac, dst_mac = conn_key.split("->")
            connections.append({
                "src_mac": src_mac,
                "dst_mac": dst_mac,
                "packets": info.get("packets", 0),
                "bytes": info.get("bytes", 0),
                "ethertypes": [hex(t) for t in info.get("ethertypes", set())],
                "l2_protocols": list(info.get("l2_protocols", set())),
                "is_control": info.get("is_control", False),
                "first_seen": info.get("first_seen"),
                "last_seen": info.get("last_seen")
            })
        return connections
    
    def get_l2_multicast_groups(self) -> List[Dict[str, Any]]:
        """Return multicast groups for bus/ring topology detection"""
        groups = []
        for group_mac, info in self.l2_multicast_groups.items():
            groups.append({
                "group_mac": group_mac,
                "sources": list(info.get("sources", set())),
                "source_count": len(info.get("sources", set())),
                "packets": info.get("packets", 0),
                "bytes": info.get("bytes", 0)
            })
        return groups
    
    def get_l2_topology(self) -> Dict[str, Any]:
        """Get complete L2 topology data for visualization"""
        return {
            "entities": self.get_l2_entities(),
            "connections": self.get_l2_connections(),
            "multicast_groups": self.get_l2_multicast_groups(),
            "vlans": self.get_l2_vlans(),
            "stp_bridges": self.get_l2_stp_bridges(),
            "lldp_neighbors": self.get_l2_lldp_neighbors(),
            "cdp_neighbors": self.get_l2_cdp_neighbors(),
            "ring_topologies": self.get_l2_ring_topologies(),
            "entity_count": len(self.l2_entities),
            "connection_count": len(self.l2_connections),
            "multicast_group_count": len(self.l2_multicast_groups)
        }
    
    def get_l2_vlans(self) -> List[Dict[str, Any]]:
        """Return detected VLANs with members"""
        vlans = []
        for vlan_id, info in self.l2_vlans.items():
            vlans.append({
                "vlan_id": vlan_id,
                "name": info.get("name", f"VLAN{vlan_id}"),
                "members": list(info.get("members", set())),
                "trunk_ports": list(info.get("trunk_ports", set())),
                "packets": info.get("packets", 0),
                "bytes": info.get("bytes", 0),
                "tagged": info.get("tagged", True)
            })
        return vlans
    
    def get_l2_stp_bridges(self) -> List[Dict[str, Any]]:
        """Return STP/RSTP/MSTP bridge information"""
        bridges = []
        for bridge_mac, info in self.l2_stp_bridges.items():
            bridges.append({
                "bridge_mac": bridge_mac,
                "root_id": info.get("root_id"),
                "root_mac": info.get("root_mac"),
                "bridge_id": info.get("bridge_id"),
                "path_cost": info.get("path_cost", 0),
                "port_id": info.get("port_id"),
                "is_root": info.get("is_root", False),
                "topology_change": info.get("topology_change", False),
                "protocol_version": info.get("version", "STP"),
                "last_seen": info.get("last_seen")
            })
        return bridges
    
    def get_l2_lldp_neighbors(self) -> List[Dict[str, Any]]:
        """Return LLDP neighbor information"""
        neighbors = []
        for mac, info in self.l2_lldp_neighbors.items():
            neighbors.append({
                "mac": mac,
                "chassis_id": info.get("chassis_id"),
                "port_id": info.get("port_id"),
                "system_name": info.get("system_name"),
                "system_description": info.get("system_description"),
                "mgmt_ip": info.get("mgmt_ip"),
                "capabilities": info.get("capabilities", []),
                "last_seen": info.get("last_seen")
            })
        return neighbors
    
    def get_l2_cdp_neighbors(self) -> List[Dict[str, Any]]:
        """Return CDP neighbor information (Cisco)"""
        neighbors = []
        for mac, info in self.l2_cdp_neighbors.items():
            neighbors.append({
                "mac": mac,
                "device_id": info.get("device_id"),
                "platform": info.get("platform"),
                "port_id": info.get("port_id"),
                "ip": info.get("ip"),
                "software_version": info.get("software_version"),
                "capabilities": info.get("capabilities", []),
                "last_seen": info.get("last_seen")
            })
        return neighbors
    
    def get_l2_ring_topologies(self) -> List[Dict[str, Any]]:
        """Return detected ring topologies (REP, MRP, DLR, etc.)"""
        rings = []
        for ring_id, info in self.l2_ring_topologies.items():
            rings.append({
                "ring_id": ring_id,
                "protocol": info.get("protocol", "Unknown"),
                "members": list(info.get("members", [])),
                "state": info.get("state", "unknown"),
                "primary_edge": info.get("primary_edge"),
                "secondary_edge": info.get("secondary_edge"),
                "vlan_id": info.get("vlan_id"),
                "last_seen": info.get("last_seen")
            })
        return rings
    
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
    
    def set_passive_scan_enabled(self, enabled: bool):
        """Enable or disable passive port scanning from SYN/ACK detection"""
        self.passive_scan_enabled = enabled
        logger.info(f"Passive scan enabled: {enabled}")
    
    def get_detected_services(self) -> Dict[str, Any]:
        """Return detected services from passive scan"""
        services = []
        for host_ip, ports in self.detected_services.items():
            for port, info in ports.items():
                services.append({
                    "host": host_ip,
                    "port": port,
                    "service": info.get("service", "unknown"),
                    "first_seen": info.get("first_seen"),
                    "last_seen": info.get("last_seen"),
                    "syn_ack_count": info.get("syn_ack_count", 0)
                })
        return {
            "enabled": self.passive_scan_enabled,
            "services": services,
            "host_count": len(self.detected_services),
            "total_services": len(services)
        }
    
    def clear_detected_services(self):
        """Clear all detected services from passive scan"""
        self.detected_services = {}
        logger.info("Cleared passive scan detected services")
    
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
    
    def _parse_l2_protocols(self, packet, src_mac: str, dst_mac: str, current_time: float, pkt_len: int):
        """Parse detailed L2 protocol information (VLAN, STP, LLDP, CDP, etc.)"""
        
        # ===== VLAN (802.1Q) parsing =====
        if Dot1Q in packet:
            vlan = packet[Dot1Q]
            vlan_id = vlan.vlan
            
            if vlan_id not in self.l2_vlans:
                self.l2_vlans[vlan_id] = {
                    "name": f"VLAN{vlan_id}",
                    "members": set(),
                    "trunk_ports": set(),
                    "packets": 0,
                    "bytes": 0,
                    "tagged": True,
                    "priority": vlan.prio,
                    "first_seen": current_time
                }
            self.l2_vlans[vlan_id]["members"].add(src_mac)
            if dst_mac != "ff:ff:ff:ff:ff:ff":
                self.l2_vlans[vlan_id]["members"].add(dst_mac)
            self.l2_vlans[vlan_id]["packets"] += 1
            self.l2_vlans[vlan_id]["bytes"] += pkt_len
            self.l2_vlans[vlan_id]["last_seen"] = current_time
            
            # Track trunk port (source that sends tagged traffic)
            self.l2_vlans[vlan_id]["trunk_ports"].add(src_mac)
            
            # Add VLAN info to L2 entity
            if src_mac in self.l2_entities:
                if "vlans" not in self.l2_entities[src_mac]:
                    self.l2_entities[src_mac]["vlans"] = set()
                self.l2_entities[src_mac]["vlans"].add(vlan_id)
        
        # ===== STP/RSTP/MSTP parsing =====
        if STP in packet:
            stp = packet[STP]
            bridge_mac = src_mac
            
            # Determine STP version
            version_names = {0: "STP", 2: "RSTP", 3: "MSTP"}
            version = version_names.get(stp.version, f"STP-v{stp.version}")
            
            # Check if this bridge is the root
            is_root = (stp.rootmac == stp.bridgemac) and (stp.rootid == stp.bridgeid)
            
            # Parse BPDU flags for topology change
            topology_change = bool(stp.bpduflags & 0x01)
            topology_change_ack = bool(stp.bpduflags & 0x80)
            
            self.l2_stp_bridges[bridge_mac] = {
                "root_id": stp.rootid,
                "root_mac": stp.rootmac,
                "bridge_id": stp.bridgeid,
                "bridge_mac": stp.bridgemac,
                "path_cost": stp.pathcost,
                "port_id": stp.portid,
                "is_root": is_root,
                "topology_change": topology_change,
                "topology_change_ack": topology_change_ack,
                "version": version,
                "max_age": stp.maxage / 256,  # Convert to seconds
                "hello_time": stp.hellotime / 256,
                "forward_delay": stp.fwddelay / 256,
                "last_seen": current_time
            }
            
            # Mark as network infrastructure in L2 entity
            if bridge_mac in self.l2_entities:
                self.l2_entities[bridge_mac]["device_type"] = "switch"
                self.l2_entities[bridge_mac]["stp_info"] = {
                    "is_root": is_root,
                    "version": version
                }
        
        # ===== LLDP parsing =====
        if LLDP_AVAILABLE and packet.haslayer('LLDPDU'):
            try:
                lldp = packet['LLDPDU']
                lldp_info = {
                    "last_seen": current_time
                }
                
                # Parse all LLDP TLVs
                current_layer = lldp
                while current_layer:
                    layer_name = current_layer.__class__.__name__
                    
                    if 'ChassisID' in layer_name:
                        lldp_info["chassis_id"] = str(current_layer.id) if hasattr(current_layer, 'id') else None
                    elif 'PortID' in layer_name:
                        lldp_info["port_id"] = str(current_layer.id) if hasattr(current_layer, 'id') else None
                    elif 'SystemName' in layer_name:
                        lldp_info["system_name"] = str(current_layer.system_name) if hasattr(current_layer, 'system_name') else None
                    elif 'SystemDescription' in layer_name:
                        lldp_info["system_description"] = str(current_layer.description) if hasattr(current_layer, 'description') else None
                    elif 'ManagementAddress' in layer_name:
                        if hasattr(current_layer, 'management_address'):
                            lldp_info["mgmt_ip"] = str(current_layer.management_address)
                    elif 'SystemCapabilities' in layer_name:
                        if hasattr(current_layer, 'capabilities'):
                            caps = []
                            cap_bits = current_layer.capabilities
                            if cap_bits & 0x0001: caps.append("Other")
                            if cap_bits & 0x0002: caps.append("Repeater")
                            if cap_bits & 0x0004: caps.append("Bridge")
                            if cap_bits & 0x0008: caps.append("WLAN-AP")
                            if cap_bits & 0x0010: caps.append("Router")
                            if cap_bits & 0x0020: caps.append("Telephone")
                            if cap_bits & 0x0040: caps.append("DOCSIS")
                            if cap_bits & 0x0080: caps.append("Station")
                            lldp_info["capabilities"] = caps
                    
                    current_layer = current_layer.payload if hasattr(current_layer, 'payload') and current_layer.payload else None
                
                self.l2_lldp_neighbors[src_mac] = lldp_info
                
                # Update L2 entity with LLDP info
                if src_mac in self.l2_entities:
                    self.l2_entities[src_mac]["device_type"] = "network_device"
                    if lldp_info.get("system_name"):
                        self.l2_entities[src_mac]["hostname"] = lldp_info["system_name"]
                    if lldp_info.get("mgmt_ip"):
                        self.l2_entities[src_mac]["ips"].add(lldp_info["mgmt_ip"])
                        
            except Exception as e:
                logger.debug(f"LLDP parsing error: {e}")
        
        # ===== CDP parsing (Cisco) =====
        if CDP_AVAILABLE and dst_mac == "01:00:0c:cc:cc:cc":
            try:
                # Try to parse CDP
                if packet.haslayer('CDPv2_HDR'):
                    cdp = packet['CDPv2_HDR']
                    cdp_info = {
                        "last_seen": current_time
                    }
                    
                    # Parse CDP TLVs
                    current_layer = cdp
                    while current_layer:
                        layer_name = current_layer.__class__.__name__
                        
                        if 'DeviceID' in layer_name:
                            cdp_info["device_id"] = str(current_layer.val) if hasattr(current_layer, 'val') else None
                        elif 'Platform' in layer_name:
                            cdp_info["platform"] = str(current_layer.val) if hasattr(current_layer, 'val') else None
                        elif 'PortID' in layer_name:
                            cdp_info["port_id"] = str(current_layer.iface) if hasattr(current_layer, 'iface') else None
                        elif 'Addr' in layer_name:
                            if hasattr(current_layer, 'addr'):
                                cdp_info["ip"] = str(current_layer.addr)
                        elif 'SoftwareVersion' in layer_name:
                            cdp_info["software_version"] = str(current_layer.val) if hasattr(current_layer, 'val') else None
                        elif 'Capabilities' in layer_name:
                            if hasattr(current_layer, 'cap'):
                                caps = []
                                cap_bits = current_layer.cap
                                if cap_bits & 0x01: caps.append("Router")
                                if cap_bits & 0x02: caps.append("TB-Bridge")
                                if cap_bits & 0x04: caps.append("SR-Bridge")
                                if cap_bits & 0x08: caps.append("Switch")
                                if cap_bits & 0x10: caps.append("Host")
                                if cap_bits & 0x20: caps.append("IGMP")
                                if cap_bits & 0x40: caps.append("Repeater")
                                cdp_info["capabilities"] = caps
                        
                        current_layer = current_layer.payload if hasattr(current_layer, 'payload') and current_layer.payload else None
                    
                    self.l2_cdp_neighbors[src_mac] = cdp_info
                    
                    # Update L2 entity with CDP info
                    if src_mac in self.l2_entities:
                        self.l2_entities[src_mac]["device_type"] = "cisco_device"
                        if cdp_info.get("device_id"):
                            self.l2_entities[src_mac]["hostname"] = cdp_info["device_id"]
                        if cdp_info.get("ip"):
                            self.l2_entities[src_mac]["ips"].add(cdp_info["ip"])
                        if cdp_info.get("platform"):
                            self.l2_entities[src_mac]["platform"] = cdp_info["platform"]
                            
            except Exception as e:
                logger.debug(f"CDP parsing error: {e}")
        
        # ===== Industrial Ring Protocol Detection =====
        # REP (Cisco Resilient Ethernet Protocol) - uses multicast 01:00:0c:cc:cc:cd
        # MRP (Media Redundancy Protocol - IEC 62439) - uses multicast 01:15:4e:00:00:xx
        # DLR (Device Level Ring - EtherNet/IP) - uses multicast 01:21:6c:00:00:xx
        
        is_rep = dst_mac == "01:00:0c:cc:cc:cd"
        is_mrp = dst_mac.startswith("01:15:4e:00:00:")
        is_dlr = dst_mac.startswith("01:21:6c:00:00:")
        is_prp = dst_mac == "01:15:4e:00:01:00"  # Parallel Redundancy Protocol
        is_hsr = dst_mac == "01:15:4e:00:01:01"  # High-availability Seamless Redundancy
        
        if is_rep or is_mrp or is_dlr or is_prp or is_hsr:
            # Determine protocol
            if is_rep:
                protocol = "REP"
                ring_id = "rep_ring"
            elif is_mrp:
                protocol = "MRP"
                ring_id = f"mrp_{dst_mac[-2:]}"
            elif is_dlr:
                protocol = "DLR"
                ring_id = f"dlr_{dst_mac[-2:]}"
            elif is_prp:
                protocol = "PRP"
                ring_id = "prp_ring"
            elif is_hsr:
                protocol = "HSR"
                ring_id = "hsr_ring"
            else:
                protocol = "Unknown"
                ring_id = "unknown_ring"
            
            if ring_id not in self.l2_ring_topologies:
                self.l2_ring_topologies[ring_id] = {
                    "protocol": protocol,
                    "members": set(),
                    "state": "unknown",
                    "first_seen": current_time
                }
            
            self.l2_ring_topologies[ring_id]["members"].add(src_mac)
            self.l2_ring_topologies[ring_id]["last_seen"] = current_time
            
            # Mark as ring member in L2 entity
            if src_mac in self.l2_entities:
                self.l2_entities[src_mac]["device_type"] = "ring_member"
                self.l2_entities[src_mac]["ring_protocol"] = protocol
                self.l2_entities[src_mac]["ring_id"] = ring_id
            
            # Add to connection protocols
            l2_ctrl_key = f"{src_mac}->CONTROL"
            if l2_ctrl_key in self.l2_connections:
                self.l2_connections[l2_ctrl_key]["l2_protocols"].add(protocol)

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
    
    # Maximum payload size to extract for DPI (prevents memory exhaustion)
    DPI_MAX_PAYLOAD_SIZE = 2000
    
    def _extract_payload(self, packet) -> bytes:
        """Extract payload bytes from packet for DPI analysis (size-limited)"""
        try:
            payload = b""
            
            # Try to get payload from TCP/UDP layer
            if TCP in packet and Raw in packet:
                payload = bytes(packet[Raw].load)
            elif UDP in packet and Raw in packet:
                payload = bytes(packet[Raw].load)
            elif Raw in packet:
                payload = bytes(packet[Raw].load)
            else:
                # Try nested payload access
                if hasattr(packet, 'payload') and hasattr(packet.payload, 'payload'):
                    if hasattr(packet.payload.payload, 'payload'):
                        inner = packet.payload.payload.payload
                        if inner and hasattr(inner, 'load'):
                            payload = bytes(inner.load)
                        elif inner:
                            payload = bytes(inner)
            
            # Truncate to prevent memory exhaustion from large payloads
            return payload[:self.DPI_MAX_PAYLOAD_SIZE] if payload else b""
        except Exception:
            return b""
    
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
    
    def _detect_service_by_port(self, port: int) -> str:
        """Map common ports to service names for passive scan detection"""
        service_map = {
            20: "ftp-data", 21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp",
            53: "dns", 67: "dhcp", 68: "dhcp", 69: "tftp", 80: "http",
            110: "pop3", 123: "ntp", 137: "netbios-ns", 138: "netbios-dgm",
            139: "netbios-ssn", 143: "imap", 161: "snmp", 162: "snmp-trap",
            389: "ldap", 443: "https", 445: "smb", 465: "smtps", 514: "syslog",
            587: "smtp", 636: "ldaps", 993: "imaps", 995: "pop3s",
            1433: "mssql", 1521: "oracle", 3306: "mysql", 3389: "rdp",
            5432: "postgresql", 5900: "vnc", 6379: "redis",
            8080: "http-alt", 8443: "https-alt", 27017: "mongodb"
        }
        return service_map.get(port, "unknown")

    def _detect_os_from_ttl(self, ip_address: str, ttl: int) -> None:
        """Detect OS based on TTL value (passive fingerprinting)"""
        if not self.passive_scan_enabled:
            return
            
        # Common default TTL values:
        # Linux/Unix: 64, Windows: 128, Cisco/Network devices: 255
        # Account for hops by checking ranges
        current_time = time.time()
        
        if ttl <= 64:
            os_guess = "Linux/Unix"
            confidence = 0.7 if ttl >= 60 else 0.5  # Higher confidence if close to 64
        elif ttl <= 128:
            os_guess = "Windows"
            confidence = 0.7 if ttl >= 120 else 0.5
        elif ttl <= 255:
            os_guess = "Network Device"  # Cisco, routers, etc.
            confidence = 0.6
        else:
            return
        
        # Only update if we have higher confidence or new entry
        if ip_address not in self.host_os_info or self.host_os_info[ip_address].get("confidence", 0) <= confidence:
            self.host_os_info[ip_address] = {
                "os": os_guess,
                "ttl": ttl,
                "confidence": confidence,
                "last_seen": current_time
            }

    def _extract_dns_hostname(self, packet) -> None:
        """Extract hostnames from DNS responses"""
        if not self.passive_scan_enabled:
            return
            
        try:
            from scapy.layers.dns import DNS, DNSRR
            if DNS not in packet:
                return
                
            dns = packet[DNS]
            # Only process DNS responses with answers
            if not dns.qr or dns.ancount == 0:
                return
                
            current_time = time.time()
            
            # Parse DNS answers
            for i in range(dns.ancount):
                try:
                    rr = dns.an[i]
                    if hasattr(rr, 'rrname') and hasattr(rr, 'rdata'):
                        hostname = rr.rrname.decode() if isinstance(rr.rrname, bytes) else str(rr.rrname)
                        hostname = hostname.rstrip('.')  # Remove trailing dot
                        
                        # Get the IP address from the DNS response
                        if rr.type == 1:  # A record (IPv4)
                            ip_addr = str(rr.rdata)
                            self.host_hostnames[ip_addr] = {
                                "hostname": hostname,
                                "source": "dns",
                                "last_seen": current_time
                            }
                            logger.debug(f"DNS hostname: {ip_addr} -> {hostname}")
                except Exception:
                    continue
        except Exception as e:
            logger.debug(f"DNS hostname extraction error: {e}")

    def _extract_service_banner(self, packet, src_ip: str, src_port: int) -> None:
        """Extract service version from response banners (HTTP, SSH, etc.)"""
        if not self.passive_scan_enabled:
            return
            
        if Raw not in packet:
            return
            
        try:
            payload = packet[Raw].load.decode('utf-8', errors='ignore')
            if not payload:
                return
                
            current_time = time.time()
            version_info = None
            banner = None
            
            # HTTP Server header
            if 'HTTP/' in payload and 'Server:' in payload:
                for line in payload.split('\r\n'):
                    if line.startswith('Server:'):
                        version_info = line[7:].strip()
                        banner = version_info[:100]  # Limit banner length
                        break
            
            # SSH banner (SSH-2.0-OpenSSH_8.9, etc.)
            elif payload.startswith('SSH-'):
                banner = payload.split('\r')[0].split('\n')[0][:100]
                version_info = banner
            
            # FTP banner
            elif src_port == 21 and payload.startswith('220'):
                banner = payload.split('\r')[0].split('\n')[0][:100]
                version_info = banner
            
            # SMTP banner
            elif src_port == 25 and payload.startswith('220'):
                banner = payload.split('\r')[0].split('\n')[0][:100]
                version_info = banner
            
            if version_info:
                if src_ip not in self.service_versions:
                    self.service_versions[src_ip] = {}
                self.service_versions[src_ip][src_port] = {
                    "banner": banner,
                    "version": version_info,
                    "last_seen": current_time
                }
                logger.debug(f"Service banner: {src_ip}:{src_port} -> {version_info}")
                
        except Exception as e:
            logger.debug(f"Service banner extraction error: {e}")

    def get_enhanced_host_info(self, ip_address: str) -> Dict[str, Any]:
        """Get all passively discovered info for a host"""
        return {
            "ip_address": ip_address,
            "os_info": self.host_os_info.get(ip_address),
            "hostname": self.host_hostnames.get(ip_address),
            "services": self.detected_services.get(ip_address, {}),
            "service_versions": self.service_versions.get(ip_address, {})
        }

    def get_all_enhanced_hosts(self) -> List[Dict[str, Any]]:
        """Get enhanced info for all passively discovered hosts"""
        all_ips = set(self.host_os_info.keys()) | set(self.host_hostnames.keys()) | set(self.detected_services.keys())
        return [self.get_enhanced_host_info(ip) for ip in all_ips]

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
            
            # ===== L2 Entity and Connection Tracking =====
            src_mac = packet[Ether].src
            dst_mac = packet[Ether].dst
            ether_type = packet[Ether].type
            current_time = time.time()
            pkt_len = len(packet)
            
            # Track source MAC entity
            if src_mac not in self.l2_entities:
                self.l2_entities[src_mac] = {
                    "first_seen": current_time,
                    "last_seen": current_time,
                    "ips": set(),
                    "packets": 0,
                    "bytes": 0
                }
            self.l2_entities[src_mac]["last_seen"] = current_time
            self.l2_entities[src_mac]["packets"] += 1
            self.l2_entities[src_mac]["bytes"] += pkt_len
            
            # Detect L2 control protocols by destination MAC
            is_stp = dst_mac.startswith("01:80:c2:00:00:")  # STP/RSTP/MSTP
            is_lldp = dst_mac in ("01:80:c2:00:00:0e", "01:80:c2:00:00:03", "01:80:c2:00:00:00")  # LLDP destinations
            is_cdp = dst_mac == "01:00:0c:cc:cc:cc"  # Cisco CDP
            is_pvst = dst_mac.startswith("01:00:0c:cc:cc:")  # Cisco PVST+
            
            # Track dst MAC for non-broadcast
            is_broadcast = dst_mac == "ff:ff:ff:ff:ff:ff"
            is_multicast = dst_mac.startswith(("01:00:5e", "33:33:"))  # IPv4/IPv6 multicast
            
            if not is_broadcast:
                if is_multicast:
                    # Track multicast group membership
                    if dst_mac not in self.l2_multicast_groups:
                        self.l2_multicast_groups[dst_mac] = {"sources": set(), "packets": 0, "bytes": 0}
                    self.l2_multicast_groups[dst_mac]["sources"].add(src_mac)
                    self.l2_multicast_groups[dst_mac]["packets"] += 1
                    self.l2_multicast_groups[dst_mac]["bytes"] += pkt_len
                else:
                    # Track unicast destination
                    if dst_mac not in self.l2_entities:
                        self.l2_entities[dst_mac] = {
                            "first_seen": current_time,
                            "last_seen": current_time,
                            "ips": set(),
                            "packets": 0,
                            "bytes": 0
                        }
                    self.l2_entities[dst_mac]["last_seen"] = current_time
                    
                    # Track L2 connection (src_mac -> dst_mac)
                    l2_conn_key = f"{src_mac}->{dst_mac}"
                    if l2_conn_key not in self.l2_connections:
                        self.l2_connections[l2_conn_key] = {
                            "packets": 0,
                            "bytes": 0,
                            "ethertypes": set(),
                            "l2_protocols": set(),  # Human-readable L2 protocol names
                            "first_seen": current_time,
                            "last_seen": current_time
                        }
                    self.l2_connections[l2_conn_key]["packets"] += 1
                    self.l2_connections[l2_conn_key]["bytes"] += pkt_len
                    self.l2_connections[l2_conn_key]["ethertypes"].add(ether_type)
                    self.l2_connections[l2_conn_key]["last_seen"] = current_time
                    
                    # Add detected L2 control protocols
                    if is_stp or is_pvst:
                        self.l2_connections[l2_conn_key]["l2_protocols"].add("STP")
                    if is_lldp:
                        self.l2_connections[l2_conn_key]["l2_protocols"].add("LLDP")
                    if is_cdp:
                        self.l2_connections[l2_conn_key]["l2_protocols"].add("CDP")
            
            # Track L2 control protocols even for multicast destinations
            if is_stp or is_pvst or is_lldp or is_cdp:
                # Create a pseudo-connection to track control protocol source
                l2_ctrl_key = f"{src_mac}->CONTROL"
                if l2_ctrl_key not in self.l2_connections:
                    self.l2_connections[l2_ctrl_key] = {
                        "packets": 0,
                        "bytes": 0,
                        "ethertypes": set(),
                        "l2_protocols": set(),
                        "first_seen": current_time,
                        "last_seen": current_time,
                        "is_control": True
                    }
                self.l2_connections[l2_ctrl_key]["packets"] += 1
                self.l2_connections[l2_ctrl_key]["bytes"] += pkt_len
                self.l2_connections[l2_ctrl_key]["ethertypes"].add(ether_type)
                self.l2_connections[l2_ctrl_key]["last_seen"] = current_time
                if is_stp or is_pvst:
                    self.l2_connections[l2_ctrl_key]["l2_protocols"].add("STP")
                if is_lldp:
                    self.l2_connections[l2_ctrl_key]["l2_protocols"].add("LLDP")
                if is_cdp:
                    self.l2_connections[l2_ctrl_key]["l2_protocols"].add("CDP")
            
            # ===== Parse detailed L2 protocol information =====
            self._parse_l2_protocols(packet, src_mac, dst_mac, current_time, pkt_len)

        if IP in packet:
            packet_data["source"] = packet[IP].src
            packet_data["destination"] = packet[IP].dst
            packet_data["src_ip"] = packet[IP].src
            packet_data["dst_ip"] = packet[IP].dst

            # Update stats
            self.stats["total_bytes"] += len(packet)
            self.stats["total_flows"] += 1

            src = packet[IP].src
            dst = packet[IP].dst
            self.stats["top_talkers"][src] = self.stats["top_talkers"].get(src, 0) + len(packet)
            
            # Associate IP with MAC in L2 entities
            if Ether in packet:
                src_mac = packet[Ether].src
                dst_mac = packet[Ether].dst
                if src_mac in self.l2_entities:
                    self.l2_entities[src_mac]["ips"].add(src)
                if dst_mac in self.l2_entities and dst_mac != "ff:ff:ff:ff:ff:ff":
                    self.l2_entities[dst_mac]["ips"].add(dst)
            
            # Enhanced passive discovery: OS detection from TTL
            self._detect_os_from_ttl(src, packet[IP].ttl)
            
            # Enhanced passive discovery: DNS hostname extraction
            self._extract_dns_hostname(packet)
            
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
                packet_data["src_port"] = packet[TCP].sport
                packet_data["dst_port"] = packet[TCP].dport
                packet_data["info"] = f"{packet[TCP].sport} -> {packet[TCP].dport} [{packet[TCP].flags}]"
                self.stats["protocols"]["TCP"] = self.stats["protocols"].get("TCP", 0) + 1
                
                # Passive scan: detect open ports from SYN+ACK responses
                if self.passive_scan_enabled:
                    tcp_layer = packet[TCP]
                    # Check for SYN+ACK (flags.S and flags.A both set)
                    if tcp_layer.flags.S and tcp_layer.flags.A:
                        # SYN+ACK means the source has an open port (sport)
                        host_ip = src  # The host responding with SYN+ACK
                        open_port = tcp_layer.sport  # The port that responded
                        
                        if host_ip not in self.detected_services:
                            self.detected_services[host_ip] = {}
                        
                        if open_port not in self.detected_services[host_ip]:
                            # New service detected
                            service_name = self._detect_service_by_port(open_port)
                            self.detected_services[host_ip][open_port] = {
                                "service": service_name,
                                "first_seen": current_time,
                                "last_seen": current_time,
                                "syn_ack_count": 1
                            }
                            logger.info(f"Passive scan: detected {service_name} on {host_ip}:{open_port}")
                        else:
                            # Update existing service
                            self.detected_services[host_ip][open_port]["last_seen"] = current_time
                            self.detected_services[host_ip][open_port]["syn_ack_count"] += 1
                    
                    # Extract service banners from response packets (HTTP headers, SSH banners, etc.)
                    self._extract_service_banner(packet, src, tcp_layer.sport)
            elif UDP in packet:
                protocol = "UDP"
                packet_data["protocol"] = "UDP"
                packet_data["src_port"] = packet[UDP].sport
                packet_data["dst_port"] = packet[UDP].dport
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
            
            # Track connections (src -> dst) with protocol info, timestamps, and ports
            conn_key = f"{src}-{dst}"
            current_time = time.time()
            if conn_key not in self.stats["connections"]:
                self.stats["connections"][conn_key] = {
                    "bytes": 0, 
                    "protocols": set(),
                    "ports": set(),
                    "first_seen": current_time,
                    "last_seen": current_time,
                    "packet_count": 0
                }
            self.stats["connections"][conn_key]["bytes"] += len(packet)
            self.stats["connections"][conn_key]["protocols"].add(protocol)
            self.stats["connections"][conn_key]["last_seen"] = current_time
            self.stats["connections"][conn_key]["packet_count"] += 1
            # Track ports if available
            if "src_port" in packet_data:
                self.stats["connections"][conn_key]["ports"].add(packet_data["src_port"])
            if "dst_port" in packet_data:
                self.stats["connections"][conn_key]["ports"].add(packet_data["dst_port"])
            
            # Also track in burst stats if burst capture is active
            if hasattr(self, 'burst_stats') and self.burst_stats is not None:
                if conn_key not in self.burst_stats["connections"]:
                    self.burst_stats["connections"][conn_key] = {
                        "bytes": 0, 
                        "protocols": set(),
                        "ports": set(),
                        "first_seen": current_time,
                        "last_seen": current_time,
                        "packet_count": 0
                    }
                self.burst_stats["connections"][conn_key]["bytes"] += len(packet)
                self.burst_stats["connections"][conn_key]["protocols"].add(protocol)
                self.burst_stats["connections"][conn_key]["last_seen"] = current_time
                self.burst_stats["connections"][conn_key]["packet_count"] += 1
                # Track ports in burst stats
                if "src_port" in packet_data:
                    self.burst_stats["connections"][conn_key]["ports"].add(packet_data["src_port"])
                if "dst_port" in packet_data:
                    self.burst_stats["connections"][conn_key]["ports"].add(packet_data["dst_port"])

        # ===== Deep Packet Inspection (DPI) =====
        # Run DPI if enabled and packet has relevant layers
        if self.dpi_enabled and IP in packet:
            try:
                # Extract payload for DPI analysis
                payload = self._extract_payload(packet)
                sport = packet_data.get("src_port", 0)
                dport = packet_data.get("dst_port", 0)
                transport = packet_data.get("protocol", "IP")
                src_ip = packet_data.get("src_ip", "")
                dst_ip = packet_data.get("dst_ip", "")
                timestamp = packet_data.get("timestamp")
                
                # Check if packet should be inspected
                packet_summary = {
                    "protocol": transport,
                    "length": len(payload) if payload else 0
                }
                
                if self.dpi_service.should_deep_inspect(packet_summary):
                    dpi_result = self.dpi_service.process_packet(
                        payload=payload,
                        sport=sport,
                        dport=dport,
                        transport_protocol=transport,
                        packet_length=len(packet),
                        src_ip=src_ip,
                        dst_ip=dst_ip,
                        timestamp=timestamp
                    )
                    
                    if dpi_result:
                        # Enrich packet data with DPI results
                        packet_data = self.dpi_service.enrich_topology_metadata(packet_data, dpi_result)
                        
                        # Update connection stats with L7 protocol
                        if conn_key in self.stats["connections"]:
                            if "detected_protocols" not in self.stats["connections"][conn_key]:
                                self.stats["connections"][conn_key]["detected_protocols"] = set()
                            self.stats["connections"][conn_key]["detected_protocols"].add(dpi_result.protocol)
                            self.stats["connections"][conn_key]["service_label"] = dpi_result.service_label
            except Exception as e:
                logger.debug(f"DPI processing error: {e}")

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

    def start_sniffing(self, interface: str, callback: Optional[Callable], filter_str: Optional[str] = None, persistent: bool = False):
        if self.is_sniffing and self.interface == interface and self.filter == filter_str:
            # Just update callback if already sniffing on same interface/filter
            self.callback = callback
            # If this is a persistent call on existing sniffing, mark it persistent
            if persistent:
                self.persistent_capture = True
            return

        if self.is_sniffing:
            self.stop_sniffing()

        self.interface = interface
        self.callback = callback
        self.filter = filter_str
        self.is_sniffing = True
        self.persistent_capture = persistent
        self.captured_packets = []

        self.capture_thread = threading.Thread(target=self._run_sniff, daemon=True)
        self.capture_thread.start()

    def stop_sniffing(self):
        self.is_sniffing = False
        self.persistent_capture = False
        if self.capture_thread:
            self.capture_thread.join(timeout=1.0)
        self.callback = None

    def get_stats(self) -> Dict[str, Any]:
        # Sort top talkers and return top 5
        sorted_talkers = sorted(self.stats["top_talkers"].items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Format connections with protocol and port information
        connections = []
        for key, conn_data in self.stats["connections"].items():
            src, dst = key.split('-')
            ports = list(conn_data.get("ports", set()))
            connections.append({
                "source": src, 
                "target": dst, 
                "value": conn_data["bytes"],
                "protocols": list(conn_data["protocols"]),
                "ports": ports,
                "source_port": ports[0] if ports else None,
                "dest_port": ports[1] if len(ports) > 1 else (ports[0] if ports else None),
                "last_seen": conn_data.get("last_seen"),
                "first_seen": conn_data.get("first_seen"),
                "packet_count": conn_data.get("packet_count", 0),
                # DPI enhancements
                "detected_protocols": list(conn_data.get("detected_protocols", set())),
                "service_label": conn_data.get("service_label")
            })

        return {
            "total_flows": self.stats["total_flows"],
            "total_bytes": self.stats["total_bytes"],
            "top_talkers": [{"ip": ip, "bytes": b} for ip, b in sorted_talkers],
            "protocols": self.stats["protocols"],
            "traffic_history": self.traffic_history,
            "connections": connections,
            "current_time": time.time(),
            "is_sniffing": self.is_sniffing,
            "interface": self.interface,
            # DPI stats
            "dpi_enabled": self.dpi_enabled,
            "dpi_stats": self.dpi_service.get_stats() if self.dpi_enabled else None,
            "protocol_breakdown": self.dpi_service.get_protocol_breakdown() if self.dpi_enabled else None
        }

    def set_dpi_enabled(self, enabled: bool):
        """Enable or disable Deep Packet Inspection"""
        self.dpi_enabled = enabled
        logger.info(f"DPI enabled: {enabled}")
    
    def get_dpi_stats(self) -> Dict[str, Any]:
        """Get DPI-specific statistics"""
        return {
            "enabled": self.dpi_enabled,
            "stats": self.dpi_service.get_stats(),
            "protocol_breakdown": self.dpi_service.get_protocol_breakdown()
        }
    
    def reset_dpi_stats(self):
        """Reset DPI statistics"""
        self.dpi_service.reset_stats()
        logger.info("DPI stats reset")

    def start_burst_capture(self, interface: str = None) -> None:
        """Start a burst capture session to collect fresh traffic data.
        If sniffer isn't running, start it temporarily for the burst.
        If interface is specified and different from current, restart on new interface."""
        self.burst_stats = {
            "connections": {},
            "start_time": time.time()
        }
        
        # Track if we started sniffing just for this burst
        self._burst_started_sniffer = False
        
        # Determine target interface
        target_interface = interface or self.interface or "eth0"
        
        # If already sniffing but on different interface, restart
        if self.is_sniffing and interface and self.interface != interface:
            self.stop_sniffing()
            self._burst_started_sniffer = True
            self.start_sniffing(target_interface, None, None)
        # If not already sniffing, start sniffing for the burst
        elif not self.is_sniffing:
            self._burst_started_sniffer = True
            self.start_sniffing(target_interface, None, None)

    def stop_burst_capture(self) -> Dict[str, Any]:
        """Stop burst capture and return captured connections.
        If we started sniffing just for this burst, stop it."""
        if not hasattr(self, 'burst_stats') or self.burst_stats is None:
            return {"connections": [], "duration": 0, "current_time": time.time()}
        
        current_time = time.time()
        duration = current_time - self.burst_stats.get("start_time", current_time)
        
        # Format burst connections with port information
        connections = []
        for key, conn_data in self.burst_stats["connections"].items():
            src, dst = key.split('-')
            ports = list(conn_data.get("ports", set()))
            connections.append({
                "source": src, 
                "target": dst, 
                "value": conn_data["bytes"],
                "protocols": list(conn_data["protocols"]),
                "ports": ports,
                "source_port": ports[0] if ports else None,
                "dest_port": ports[1] if len(ports) > 1 else (ports[0] if ports else None),
                "last_seen": conn_data.get("last_seen"),
                "first_seen": conn_data.get("first_seen"),
                "packet_count": conn_data.get("packet_count", 0)
            })
        
        result = {
            "connections": connections,
            "duration": duration,
            "current_time": current_time
        }
        
        # Clear burst stats
        self.burst_stats = None
        
        # If we started sniffing just for this burst, stop it
        if hasattr(self, '_burst_started_sniffer') and self._burst_started_sniffer:
            self.stop_sniffing()
            self._burst_started_sniffer = False
        
        return result

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
