"""
Protocol Classifier Service for Deep Packet Inspection

Provides multi-tier protocol detection:
1. Signature-based detection using payload patterns
2. Heuristic analysis (entropy for encryption, structure detection)
3. Port-based classification as fallback

Based on research of Wireshark/tshark dissector architecture and Scapy capabilities.
"""

import re
import math
import logging
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from collections import Counter

logger = logging.getLogger(__name__)


@dataclass
class ProtocolMatch:
    """Result of protocol classification"""
    protocol: str
    confidence: float  # 0.0 - 1.0
    method: str  # "signature", "heuristic", "port", "unknown"
    evidence: Dict[str, Any]
    category: str  # "web", "mail", "database", "file-transfer", "remote-access", etc.
    is_encrypted: bool
    service_label: Optional[str] = None  # e.g., "HTTP:80", "SSH:22"


class SignatureDetector:
    """Pattern matching for known protocols based on payload content"""
    
    # Built-in protocol signatures (pattern: bytes, protocol name, category)
    SIGNATURES: List[Tuple[bytes, str, str]] = [
        # HTTP
        (b"GET ", "HTTP", "web"),
        (b"POST ", "HTTP", "web"),
        (b"PUT ", "HTTP", "web"),
        (b"DELETE ", "HTTP", "web"),
        (b"HEAD ", "HTTP", "web"),
        (b"OPTIONS ", "HTTP", "web"),
        (b"HTTP/1.0", "HTTP", "web"),
        (b"HTTP/1.1", "HTTP", "web"),
        (b"HTTP/2", "HTTP", "web"),
        
        # SSH
        (b"SSH-2.0", "SSH", "remote-access"),
        (b"SSH-1.", "SSH", "remote-access"),
        
        # TLS/SSL Handshake
        (b"\x16\x03\x01", "TLS", "encrypted"),  # TLS 1.0 ClientHello
        (b"\x16\x03\x02", "TLS", "encrypted"),  # TLS 1.1
        (b"\x16\x03\x03", "TLS", "encrypted"),  # TLS 1.2
        (b"\x16\x03\x04", "TLS", "encrypted"),  # TLS 1.3
        
        # SMB/CIFS
        (b"\xffSMB", "SMB", "file-transfer"),   # SMBv1
        (b"\xfeSMB", "SMB2", "file-transfer"),  # SMBv2/v3
        
        # DNS
        (b"\x00\x00\x01\x00\x00\x01", "DNS", "network"),  # Standard query
        
        # FTP
        (b"220 ", "FTP", "file-transfer"),  # FTP banner
        (b"USER ", "FTP", "file-transfer"),
        (b"PASS ", "FTP", "file-transfer"),
        (b"RETR ", "FTP", "file-transfer"),
        (b"STOR ", "FTP", "file-transfer"),
        
        # SMTP
        (b"220 ", "SMTP", "mail"),  # Also FTP, context matters
        (b"HELO ", "SMTP", "mail"),
        (b"EHLO ", "SMTP", "mail"),
        (b"MAIL FROM:", "SMTP", "mail"),
        (b"RCPT TO:", "SMTP", "mail"),
        
        # POP3
        (b"+OK ", "POP3", "mail"),
        (b"-ERR ", "POP3", "mail"),
        
        # IMAP
        (b"* OK ", "IMAP", "mail"),
        (b"* CAPABILITY", "IMAP", "mail"),
        
        # MySQL
        (b"\x00\x00\x00\x0a", "MySQL", "database"),  # MySQL greeting
        
        # PostgreSQL
        (b"\x00\x00\x00\x08\x04\xd2\x16\x2f", "PostgreSQL", "database"),  # Cancel request
        
        # Redis
        (b"+PONG\r\n", "Redis", "database"),
        (b"*", "Redis", "database"),  # Redis array prefix (partial)
        
        # MongoDB
        (b"\x41\x00\x00\x00", "MongoDB", "database"),  # MongoDB query
        
        # RDP
        (b"\x03\x00\x00", "RDP", "remote-access"),  # TPKT header
        
        # VNC
        (b"RFB ", "VNC", "remote-access"),  # VNC handshake
        
        # SNMP
        (b"\x30", "SNMP", "network"),  # ASN.1 SEQUENCE (partial)
        
        # NTP
        (b"\x1b", "NTP", "network"),  # NTP client request mode 3
        (b"\x1c", "NTP", "network"),  # NTP server mode 4
        
        # DHCP
        (b"\x01\x01\x06\x00", "DHCP", "network"),  # DHCP discover/request
        
        # SIP (VoIP)
        (b"INVITE ", "SIP", "voip"),
        (b"SIP/2.0", "SIP", "voip"),
        (b"REGISTER ", "SIP", "voip"),
        
        # BitTorrent
        (b"\x13BitTorrent protocol", "BitTorrent", "p2p"),
        
        # SOCKS
        (b"\x05\x01", "SOCKS5", "proxy"),
        (b"\x04\x01", "SOCKS4", "proxy"),
    ]
    
    def __init__(self, custom_signatures: Optional[List[Dict]] = None):
        """Initialize with optional custom signatures from database"""
        self.signatures = list(self.SIGNATURES)
        if custom_signatures:
            for sig in custom_signatures:
                try:
                    if sig.get('pattern_type') == 'bytes':
                        pattern = bytes.fromhex(sig['pattern'])
                    else:
                        pattern = sig['pattern'].encode()
                    self.signatures.append((
                        pattern,
                        sig['protocol'],
                        sig.get('category', 'custom')
                    ))
                except Exception as e:
                    logger.warning(f"Failed to load custom signature {sig.get('name')}: {e}")
    
    def match(self, payload: bytes) -> Optional[ProtocolMatch]:
        """Match payload against known signatures"""
        if not payload or len(payload) < 2:
            return None
        
        for pattern, protocol, category in self.signatures:
            if payload.startswith(pattern):
                return ProtocolMatch(
                    protocol=protocol,
                    confidence=0.95,  # High confidence for signature match
                    method="signature",
                    evidence={"matched_pattern": pattern.hex(), "offset": 0},
                    category=category,
                    is_encrypted=(protocol in ["TLS", "SSH", "HTTPS"])
                )
        
        return None


class HeuristicClassifier:
    """Statistical analysis for unknown protocols"""
    
    # Entropy thresholds
    ENTROPY_ENCRYPTED_THRESHOLD = 7.0  # > 7.0 likely encrypted/compressed
    ENTROPY_TEXT_THRESHOLD = 4.5       # < 4.5 likely text-based protocol
    ENTROPY_STRUCTURED_THRESHOLD = 5.5 # 4.5-5.5 structured binary
    
    @staticmethod
    def calculate_entropy(data: bytes) -> float:
        """Calculate Shannon entropy of byte data"""
        if not data:
            return 0.0
        
        # Count byte frequencies
        byte_counts = Counter(data)
        length = len(data)
        
        # Calculate entropy
        entropy = 0.0
        for count in byte_counts.values():
            if count > 0:
                probability = count / length
                entropy -= probability * math.log2(probability)
        
        return entropy
    
    @staticmethod
    def detect_periodicity(data: bytes, min_period: int = 2, max_period: int = 32) -> Optional[int]:
        """Detect repeating patterns in data"""
        if len(data) < min_period * 3:
            return None
        
        for period in range(min_period, min(max_period + 1, len(data) // 3)):
            matches = 0
            comparisons = 0
            for i in range(len(data) - period):
                if i + period < len(data):
                    comparisons += 1
                    if data[i] == data[i + period]:
                        matches += 1
            
            if comparisons > 0 and matches / comparisons > 0.8:
                return period
        
        return None
    
    @staticmethod
    def is_mostly_printable(data: bytes, threshold: float = 0.8) -> bool:
        """Check if data is mostly ASCII printable characters"""
        if not data:
            return False
        
        printable_count = sum(1 for b in data if 32 <= b <= 126 or b in [9, 10, 13])
        return printable_count / len(data) >= threshold
    
    @staticmethod
    def has_null_bytes(data: bytes) -> bool:
        """Check for null bytes (common in binary protocols)"""
        return b'\x00' in data
    
    def analyze(self, payload: bytes, sport: int, dport: int) -> ProtocolMatch:
        """Analyze payload using heuristics"""
        if not payload:
            return ProtocolMatch(
                protocol="Empty",
                confidence=0.0,
                method="heuristic",
                evidence={},
                category="unknown",
                is_encrypted=False
            )
        
        entropy = self.calculate_entropy(payload)
        period = self.detect_periodicity(payload)
        is_printable = self.is_mostly_printable(payload)
        has_nulls = self.has_null_bytes(payload)
        
        evidence = {
            "entropy": round(entropy, 2),
            "length": len(payload),
            "is_printable": is_printable,
            "has_null_bytes": has_nulls,
            "period": period
        }
        
        # High entropy = encrypted or compressed
        if entropy > self.ENTROPY_ENCRYPTED_THRESHOLD:
            return ProtocolMatch(
                protocol="Encrypted/Compressed",
                confidence=0.7,
                method="heuristic",
                evidence=evidence,
                category="encrypted",
                is_encrypted=True
            )
        
        # Text-based protocol
        if is_printable and entropy < self.ENTROPY_TEXT_THRESHOLD:
            return ProtocolMatch(
                protocol="Text-Based",
                confidence=0.6,
                method="heuristic",
                evidence=evidence,
                category="text",
                is_encrypted=False
            )
        
        # Structured binary (e.g., custom protocols with headers)
        if period and not is_printable:
            return ProtocolMatch(
                protocol="Structured-Binary",
                confidence=0.5,
                method="heuristic",
                evidence={**evidence, "detected_period": period},
                category="binary",
                is_encrypted=False
            )
        
        # Unknown binary
        return ProtocolMatch(
            protocol="Unknown-Binary",
            confidence=0.3,
            method="heuristic",
            evidence=evidence,
            category="unknown",
            is_encrypted=False
        )


class PortBasedClassifier:
    """Port-based protocol classification as fallback"""
    
    # Extended port mappings with categories
    PORT_MAP: Dict[int, Tuple[str, str, str]] = {
        # Port: (Protocol, Description, Category)
        20: ("FTP-Data", "File Transfer Protocol (Data)", "file-transfer"),
        21: ("FTP", "File Transfer Protocol", "file-transfer"),
        22: ("SSH", "Secure Shell", "remote-access"),
        23: ("Telnet", "Telnet", "remote-access"),
        25: ("SMTP", "Simple Mail Transfer Protocol", "mail"),
        53: ("DNS", "Domain Name System", "network"),
        67: ("DHCP", "Dynamic Host Configuration Protocol", "network"),
        68: ("DHCP", "Dynamic Host Configuration Protocol", "network"),
        69: ("TFTP", "Trivial File Transfer Protocol", "file-transfer"),
        80: ("HTTP", "Hypertext Transfer Protocol", "web"),
        110: ("POP3", "Post Office Protocol v3", "mail"),
        123: ("NTP", "Network Time Protocol", "network"),
        137: ("NetBIOS-NS", "NetBIOS Name Service", "network"),
        138: ("NetBIOS-DGM", "NetBIOS Datagram Service", "network"),
        139: ("NetBIOS-SSN", "NetBIOS Session Service", "network"),
        143: ("IMAP", "Internet Message Access Protocol", "mail"),
        161: ("SNMP", "Simple Network Management Protocol", "network"),
        162: ("SNMP-Trap", "SNMP Trap", "network"),
        389: ("LDAP", "Lightweight Directory Access Protocol", "directory"),
        443: ("HTTPS", "HTTP Secure", "web"),
        445: ("SMB", "Server Message Block", "file-transfer"),
        465: ("SMTPS", "SMTP Secure", "mail"),
        514: ("Syslog", "System Logging Protocol", "network"),
        587: ("SMTP-Submission", "SMTP Submission", "mail"),
        636: ("LDAPS", "LDAP Secure", "directory"),
        993: ("IMAPS", "IMAP Secure", "mail"),
        995: ("POP3S", "POP3 Secure", "mail"),
        1433: ("MSSQL", "Microsoft SQL Server", "database"),
        1521: ("Oracle", "Oracle Database", "database"),
        3306: ("MySQL", "MySQL Database", "database"),
        3389: ("RDP", "Remote Desktop Protocol", "remote-access"),
        5432: ("PostgreSQL", "PostgreSQL Database", "database"),
        5900: ("VNC", "Virtual Network Computing", "remote-access"),
        5901: ("VNC", "Virtual Network Computing", "remote-access"),
        5902: ("VNC", "Virtual Network Computing", "remote-access"),
        6379: ("Redis", "Redis Database", "database"),
        8080: ("HTTP-Alt", "HTTP Alternate", "web"),
        8443: ("HTTPS-Alt", "HTTPS Alternate", "web"),
        9200: ("Elasticsearch", "Elasticsearch REST", "database"),
        11211: ("Memcached", "Memcached", "database"),
        27017: ("MongoDB", "MongoDB Database", "database"),
        # Industrial protocols
        102: ("S7comm", "Siemens S7 Communication", "industrial"),
        502: ("Modbus", "Modbus", "industrial"),
        44818: ("EtherNet/IP", "EtherNet/IP", "industrial"),
        47808: ("BACnet", "BACnet", "industrial"),
        # VoIP
        5060: ("SIP", "Session Initiation Protocol", "voip"),
        5061: ("SIPS", "SIP over TLS", "voip"),
    }
    
    # Encrypted port indicators
    ENCRYPTED_PORTS = {443, 465, 636, 993, 995, 5061, 8443, 22}
    
    def classify(self, sport: int, dport: int) -> Optional[ProtocolMatch]:
        """Classify protocol based on port numbers"""
        for port in [dport, sport]:  # Check destination port first
            if port in self.PORT_MAP:
                protocol, description, category = self.PORT_MAP[port]
                return ProtocolMatch(
                    protocol=protocol,
                    confidence=0.6,  # Medium confidence for port-based
                    method="port",
                    evidence={"port": port, "description": description},
                    category=category,
                    is_encrypted=(port in self.ENCRYPTED_PORTS),
                    service_label=f"{protocol}:{port}"
                )
        
        return None


class ProtocolClassifier:
    """
    Main protocol classification service combining multiple detection methods.
    
    Detection priority:
    1. Signature-based (highest confidence)
    2. Heuristic analysis
    3. Port-based (fallback)
    """
    
    def __init__(self, custom_signatures: Optional[List[Dict]] = None):
        self.signature_detector = SignatureDetector(custom_signatures)
        self.heuristic_classifier = HeuristicClassifier()
        self.port_classifier = PortBasedClassifier()
    
    def classify(
        self,
        payload: bytes,
        sport: int,
        dport: int,
        transport_protocol: str = "TCP"
    ) -> ProtocolMatch:
        """
        Classify protocol using multi-tier detection.
        
        Args:
            payload: Packet payload bytes
            sport: Source port
            dport: Destination port
            transport_protocol: TCP or UDP
            
        Returns:
            ProtocolMatch with detection results
        """
        # Try signature-based detection first (highest confidence)
        result = self.signature_detector.match(payload)
        if result:
            # Add service label
            if not result.service_label:
                port = dport if dport in self.port_classifier.PORT_MAP else sport
                result.service_label = f"{result.protocol}:{port}"
            return result
        
        # Try port-based classification
        port_result = self.port_classifier.classify(sport, dport)
        
        # Combine with heuristic analysis if we have payload
        if payload and len(payload) > 0:
            heuristic_result = self.heuristic_classifier.analyze(payload, sport, dport)
            
            # If port detection found something but heuristics say encrypted
            if port_result and heuristic_result.is_encrypted:
                # Upgrade to encrypted version if available
                if port_result.protocol in ["HTTP"]:
                    port_result.protocol = "HTTPS"
                    port_result.is_encrypted = True
                elif not port_result.is_encrypted:
                    # Mark as potentially encrypted
                    port_result.evidence["heuristic_entropy"] = heuristic_result.evidence.get("entropy")
                    port_result.is_encrypted = True
                return port_result
            
            # If port detection found something, use it
            if port_result:
                return port_result
            
            # Use heuristic result
            heuristic_result.service_label = f"Unknown:{dport}"
            return heuristic_result
        
        # Port-based result if we have it
        if port_result:
            return port_result
        
        # Complete unknown
        return ProtocolMatch(
            protocol="Unknown",
            confidence=0.1,
            method="unknown",
            evidence={"sport": sport, "dport": dport, "transport": transport_protocol},
            category="unknown",
            is_encrypted=False,
            service_label=f"Unknown:{dport}"
        )
    
    def suggest_signature(self, samples: List[bytes], min_length: int = 4) -> Optional[str]:
        """
        Suggest a signature pattern from multiple payload samples.
        Uses longest common prefix detection.
        """
        if not samples or len(samples) < 2:
            return None
        
        # Find longest common prefix
        min_sample_len = min(len(s) for s in samples)
        if min_sample_len < min_length:
            return None
        
        common_prefix = []
        for i in range(min_sample_len):
            byte_val = samples[0][i]
            if all(s[i] == byte_val for s in samples):
                common_prefix.append(byte_val)
            else:
                break
        
        if len(common_prefix) >= min_length:
            return bytes(common_prefix).hex()
        
        return None
