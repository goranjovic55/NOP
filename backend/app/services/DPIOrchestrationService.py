"""
DPI Orchestration Service

Coordinates the Deep Packet Inspection pipeline:
1. Manages dissection priority (top talkers first)
2. Throttles CPU-intensive operations
3. Caches dissection results for repeated patterns
4. Provides enriched packet data for topology visualization

Integrates with SnifferService for real-time packet analysis.
"""

import time
import logging
import hashlib
from typing import Dict, Any, Optional, List
from collections import OrderedDict
from dataclasses import dataclass, asdict
from threading import Lock

from app.services.ProtocolClassifier import ProtocolClassifier, ProtocolMatch
from app.services.PatternDetectionService import (
    PatternDetectionService, 
    PatternDetectionResult,
    pattern_detection_service
)

logger = logging.getLogger(__name__)


@dataclass
class DPIResult:
    """Result of deep packet inspection"""
    protocol: str
    confidence: float
    method: str
    category: str
    is_encrypted: bool
    service_label: str
    evidence: Dict[str, Any]
    # Pattern detection fields (for unknown/proprietary protocols)
    pattern_info: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        # Clean up None values
        return {k: v for k, v in result.items() if v is not None}


class LRUCache:
    """Thread-safe LRU cache for DPI results"""
    
    def __init__(self, max_size: int = 500):
        self.max_size = max_size
        self.cache: OrderedDict = OrderedDict()
        self.lock = Lock()
    
    def get(self, key: str) -> Optional[DPIResult]:
        with self.lock:
            if key in self.cache:
                # Move to end (most recently used)
                self.cache.move_to_end(key)
                return self.cache[key]
        return None
    
    def put(self, key: str, value: DPIResult):
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            else:
                if len(self.cache) >= self.max_size:
                    # Remove oldest item
                    self.cache.popitem(last=False)
            self.cache[key] = value
    
    def clear(self):
        with self.lock:
            self.cache.clear()


class DPIOrchestrationService:
    """
    Orchestrates deep packet inspection for the NOP platform.
    
    Features:
    - Priority-based inspection (configurable)
    - Rate limiting to prevent CPU overload
    - Result caching for repeated patterns
    - Protocol statistics aggregation
    """
    
    # Configuration
    DEFAULT_CONFIG = {
        "max_deep_inspect_per_second": 100,  # Rate limit
        "priority_protocols": ["TCP", "UDP"],  # Always inspect these
        "cache_size": 500,  # Pattern cache size
        "enable_heuristics": True,
        "enable_signatures": True,
        "min_payload_length": 4,  # Minimum payload to analyze
        "max_payload_length": 2000,  # Maximum payload to analyze (avoid large transfers)
    }
    
    def __init__(self, config: Optional[Dict] = None, custom_signatures: Optional[List[Dict]] = None):
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.classifier = ProtocolClassifier(custom_signatures)
        self.pattern_detector = pattern_detection_service
        self.cache = LRUCache(self.config["cache_size"])
        
        # Rate limiting
        self.inspect_count = 0
        self.last_reset = time.time()
        self.rate_lock = Lock()
        
        # Statistics
        self.stats = {
            "total_inspected": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "signature_matches": 0,
            "heuristic_matches": 0,
            "port_matches": 0,
            "unknown_protocols": 0,
            "rate_limited": 0
        }
        self.stats_lock = Lock()
        
        # Protocol breakdown
        self.protocol_counts: Dict[str, int] = {}
        self.protocol_bytes: Dict[str, int] = {}
        
        logger.info(f"DPI Orchestration Service initialized with config: {self.config}")
    
    def _generate_cache_key(self, payload: bytes, sport: int, dport: int) -> str:
        """Generate cache key from payload prefix, length, and ports"""
        # Use first 32 bytes of payload + length + ports for caching
        # Include length to avoid cache collisions for payloads with same prefix
        payload_prefix = payload[:32] if payload else b""
        payload_len = len(payload) if payload else 0
        key_data = f"{payload_prefix.hex()}:{payload_len}:{sport}:{dport}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _check_rate_limit(self) -> bool:
        """Check if we're within rate limits"""
        with self.rate_lock:
            current_time = time.time()
            
            # Reset counter every second
            if current_time - self.last_reset >= 1.0:
                self.inspect_count = 0
                self.last_reset = current_time
            
            if self.inspect_count >= self.config["max_deep_inspect_per_second"]:
                return False
            
            self.inspect_count += 1
            return True
    
    def should_deep_inspect(self, packet_summary: Dict) -> bool:
        """
        Determine if a packet should undergo deep inspection.
        
        Args:
            packet_summary: Basic packet info (protocol, src, dst, length, etc.)
            
        Returns:
            True if packet should be deeply inspected
        """
        # Always inspect priority protocols
        protocol = packet_summary.get("protocol", "")
        if protocol in self.config["priority_protocols"]:
            return True
        
        # Skip very small or very large packets
        length = packet_summary.get("length", 0)
        if length < self.config["min_payload_length"]:
            return False
        if length > self.config["max_payload_length"]:
            return False
        
        return True
    
    def process_packet(
        self,
        payload: bytes,
        sport: int,
        dport: int,
        transport_protocol: str = "TCP",
        packet_length: int = 0,
        src_ip: str = "",
        dst_ip: str = "",
        timestamp: Optional[float] = None
    ) -> Optional[DPIResult]:
        """
        Process a packet through the DPI pipeline.
        
        Args:
            payload: Packet payload bytes
            sport: Source port
            dport: Destination port
            transport_protocol: TCP or UDP
            packet_length: Total packet length for statistics
            src_ip: Source IP for pattern tracking
            dst_ip: Destination IP for pattern tracking
            timestamp: Packet timestamp for timing analysis
            
        Returns:
            DPIResult with protocol classification and pattern analysis
        """
        # Check rate limit
        if not self._check_rate_limit():
            with self.stats_lock:
                self.stats["rate_limited"] += 1
            return None
        
        # Check cache first
        cache_key = self._generate_cache_key(payload, sport, dport)
        cached_result = self.cache.get(cache_key)
        if cached_result:
            with self.stats_lock:
                self.stats["cache_hits"] += 1
            # Update protocol bytes count
            self._update_protocol_stats(cached_result.protocol, packet_length)
            return cached_result
        
        with self.stats_lock:
            self.stats["cache_misses"] += 1
            self.stats["total_inspected"] += 1
        
        # Run classification
        try:
            match = self.classifier.classify(
                payload=payload,
                sport=sport,
                dport=dport,
                transport_protocol=transport_protocol
            )
            
            result = DPIResult(
                protocol=match.protocol,
                confidence=match.confidence,
                method=match.method,
                category=match.category,
                is_encrypted=match.is_encrypted,
                service_label=match.service_label or f"{match.protocol}:{dport}",
                evidence=match.evidence,
                pattern_info=None
            )
            
            # For unknown/low-confidence protocols, run pattern detection
            if (match.method in ["heuristic", "unknown"] or match.confidence < 0.5) and src_ip and dst_ip:
                try:
                    pattern_result = self.pattern_detector.analyze_packet(
                        payload=payload,
                        src_ip=src_ip,
                        dst_ip=dst_ip,
                        sport=sport,
                        dport=dport,
                        transport=transport_protocol,
                        timestamp=timestamp
                    )
                    
                    result.pattern_info = {
                        'classification': pattern_result.classification,
                        'fingerprint': pattern_result.protocol_fingerprint,
                        'confidence': pattern_result.confidence,
                        'structure': {
                            'has_fixed_header': pattern_result.structure.has_fixed_header,
                            'header_length': pattern_result.structure.header_length,
                            'has_length_field': pattern_result.structure.has_length_field,
                            'has_message_type': pattern_result.structure.has_message_type,
                            'has_sequence': pattern_result.structure.has_sequence_number,
                            'is_binary': pattern_result.structure.is_binary,
                            'entropy': round(pattern_result.structure.payload_entropy, 2)
                        },
                        'evidence': pattern_result.evidence
                    }
                    
                    # Add communication pattern if detected
                    if pattern_result.communication:
                        result.pattern_info['communication'] = {
                            'type': pattern_result.communication.pattern_type,
                            'confidence': pattern_result.communication.confidence,
                            'details': pattern_result.communication.evidence
                        }
                    
                    # Add encapsulation info if detected
                    if pattern_result.encapsulation.is_encapsulated:
                        result.pattern_info['encapsulation'] = {
                            'outer': pattern_result.encapsulation.outer_protocol,
                            'inner_type': pattern_result.encapsulation.inner_type,
                            'inner_offset': pattern_result.encapsulation.inner_header_offset
                        }
                    
                    # Use pattern classification as protocol if more specific
                    if pattern_result.classification != "Unknown":
                        result.protocol = pattern_result.classification
                        result.confidence = max(result.confidence, pattern_result.confidence)
                        result.method = "pattern"
                        
                except Exception as e:
                    logger.debug(f"Pattern detection error: {e}")
            
            # Update statistics
            with self.stats_lock:
                if match.method == "signature":
                    self.stats["signature_matches"] += 1
                elif match.method == "heuristic":
                    self.stats["heuristic_matches"] += 1
                elif match.method == "port":
                    self.stats["port_matches"] += 1
                else:
                    self.stats["unknown_protocols"] += 1
            
            # Update protocol stats
            self._update_protocol_stats(result.protocol, packet_length)
            
            # Cache result
            self.cache.put(cache_key, result)
            
            return result
            
        except Exception as e:
            logger.warning(f"DPI classification error: {e}")
            return None
    
    def _update_protocol_stats(self, protocol: str, packet_length: int):
        """Update per-protocol statistics"""
        with self.stats_lock:
            if protocol not in self.protocol_counts:
                self.protocol_counts[protocol] = 0
                self.protocol_bytes[protocol] = 0
            
            self.protocol_counts[protocol] += 1
            self.protocol_bytes[protocol] += packet_length
    
    def get_stats(self) -> Dict[str, Any]:
        """Get DPI statistics"""
        with self.stats_lock:
            total = self.stats["total_inspected"]
            return {
                **self.stats,
                "cache_hit_rate": (
                    self.stats["cache_hits"] / (self.stats["cache_hits"] + self.stats["cache_misses"])
                    if (self.stats["cache_hits"] + self.stats["cache_misses"]) > 0 else 0
                ),
                "detection_rate": (
                    (self.stats["signature_matches"] + self.stats["heuristic_matches"] + self.stats["port_matches"]) / total
                    if total > 0 else 0
                )
            }
    
    def get_protocol_breakdown(self) -> Dict[str, Dict[str, Any]]:
        """Get protocol breakdown with percentages"""
        with self.stats_lock:
            total_packets = sum(self.protocol_counts.values()) or 1
            total_bytes = sum(self.protocol_bytes.values()) or 1
            
            breakdown = {}
            for protocol in self.protocol_counts:
                breakdown[protocol] = {
                    "packets": self.protocol_counts[protocol],
                    "bytes": self.protocol_bytes[protocol],
                    "packet_percentage": round(self.protocol_counts[protocol] / total_packets * 100, 2),
                    "byte_percentage": round(self.protocol_bytes[protocol] / total_bytes * 100, 2)
                }
            
            # Sort by bytes descending
            return dict(sorted(
                breakdown.items(),
                key=lambda x: x[1]["bytes"],
                reverse=True
            ))
    
    def reset_stats(self):
        """Reset all statistics"""
        with self.stats_lock:
            self.stats = {
                "total_inspected": 0,
                "cache_hits": 0,
                "cache_misses": 0,
                "signature_matches": 0,
                "heuristic_matches": 0,
                "port_matches": 0,
                "unknown_protocols": 0,
                "rate_limited": 0
            }
            self.protocol_counts.clear()
            self.protocol_bytes.clear()
        self.cache.clear()
    
    def add_custom_signature(self, signature: Dict):
        """Add a custom signature at runtime"""
        self.classifier.signature_detector.signatures.append((
            bytes.fromhex(signature['pattern']) if signature.get('pattern_type') == 'bytes' 
            else signature['pattern'].encode(),
            signature['protocol'],
            signature.get('category', 'custom')
        ))
        logger.info(f"Added custom signature: {signature.get('name', 'unknown')}")
    
    def enrich_topology_metadata(self, packet_data: Dict, dpi_result: Optional[DPIResult]) -> Dict:
        """
        Enrich packet data with topology-relevant DPI metadata.
        
        Args:
            packet_data: Basic packet data from SnifferService
            dpi_result: DPI classification result
            
        Returns:
            Enriched packet data with DPI fields
        """
        if not dpi_result:
            return packet_data
        
        # Add DPI metadata
        packet_data["dpi"] = dpi_result.to_dict()
        
        # Add service label for topology visualization
        packet_data["service_label"] = dpi_result.service_label
        
        # Add detected protocol (L7)
        packet_data["detected_protocol"] = dpi_result.protocol
        
        # Add encryption status
        packet_data["is_encrypted"] = dpi_result.is_encrypted
        
        # Add protocol category
        packet_data["protocol_category"] = dpi_result.category
        
        # Add pattern info for L7 layer display
        if dpi_result.pattern_info:
            packet_data["pattern_analysis"] = dpi_result.pattern_info
            
            # Add communication pattern type for topology visualization
            if 'communication' in dpi_result.pattern_info:
                packet_data["communication_pattern"] = dpi_result.pattern_info['communication']['type']
        
        return packet_data
    
    def get_multicast_bus_topology(self) -> Dict[str, Any]:
        """Get detected multicast bus groups for topology visualization"""
        return self.pattern_detector.get_multicast_bus_topology()
    
    def get_flow_patterns(self) -> Dict[str, Dict]:
        """Get all detected flow patterns (cyclic, master-slave, etc.)"""
        return self.pattern_detector.get_flow_patterns()
    
    def label_protocol_fingerprint(self, fingerprint: str, label: str) -> None:
        """
        Associate a human-readable label with a protocol fingerprint.
        Allows users to name detected proprietary protocols.
        """
        self.pattern_detector.label_fingerprint(fingerprint, label)


# Singleton instance
dpi_service = DPIOrchestrationService()
