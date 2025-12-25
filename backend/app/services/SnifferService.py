import asyncio
import json
import threading
from typing import Dict, List, Optional, Callable
from scapy.all import sniff, IP, TCP, UDP, ARP, Ether, wrpcap
import psutil
import time
import os

class SnifferService:
    def __init__(self):
        self.is_sniffing = False
        self.capture_thread: Optional[threading.Thread] = None
        self.callback: Optional[Callable] = None
        self.interface: Optional[str] = None
        self.filter: Optional[str] = None
        self.captured_packets = []
        self.max_stored_packets = 1000

    def get_interfaces(self) -> List[Dict[str, str]]:
        interfaces = []
        for iface, addrs in psutil.net_if_addrs().items():
            ip = "N/A"
            for addr in addrs:
                if addr.family == 2:  # AF_INET
                    ip = addr.address
            interfaces.append({"name": iface, "ip": ip})
        return interfaces

    def _packet_callback(self, packet):
        if not self.callback:
            return

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
            if TCP in packet:
                packet_data["protocol"] = "TCP"
                packet_data["info"] = f"{packet[TCP].sport} -> {packet[TCP].dport} [{packet[TCP].flags}]"
            elif UDP in packet:
                packet_data["protocol"] = "UDP"
                packet_data["info"] = f"{packet[UDP].sport} -> {packet[UDP].dport}"
            elif ARP in packet:
                packet_data["protocol"] = "ARP"
                packet_data["source"] = packet[ARP].psrc
                packet_data["destination"] = packet[ARP].pdst

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

    def start_sniffing(self, interface: str, callback: Callable, filter_str: Optional[str] = None):
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

    def export_pcap(self, filename: str = "capture.pcap") -> str:
        filepath = os.path.join("/app/evidence", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        wrpcap(filepath, self.captured_packets)
        return filepath

sniffer_service = SnifferService()
