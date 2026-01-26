"""
Pattern Detection Service for Unknown/Proprietary Protocols

Detects communication patterns and protocol structures without hardcoded signatures.
Designed for industrial networks with encapsulated bus/ring over L4 multicast.

Key capabilities:
1. Structural analysis - header patterns, field detection
2. Communication patterns - cyclic, master-slave, multicast bus
3. Encapsulation detection - L7 inside UDP/TCP
4. Learning mode - build pattern signatures from traffic samples
"""

import logging
import math
import struct
from typing import Dict, Any, Optional, List, Tuple, Set
from dataclasses import dataclass, field
from collections import defaultdict, Counter
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)


@dataclass
class StructureAnalysis:
    """Detected structure in payload"""
    has_fixed_header: bool = False
    header_length: int = 0
    has_length_field: bool = False
    length_field_offset: int = 0
    length_field_size: int = 0  # 1, 2, or 4 bytes
    has_message_type: bool = False
    message_type_offset: int = 0
    detected_types: Set[int] = field(default_factory=set)
    has_sequence_number: bool = False
    sequence_offset: int = 0
    payload_entropy: float = 0.0
    is_binary: bool = True
    field_boundaries: List[int] = field(default_factory=list)


@dataclass
class CommunicationPattern:
    """Detected communication pattern"""
    pattern_type: str  # "cyclic", "request-response", "master-slave", "multicast-bus", "token-ring"
    confidence: float
    evidence: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EncapsulationInfo:
    """Detected encapsulation layers"""
    is_encapsulated: bool = False
    outer_protocol: str = ""  # e.g., "UDP" 
    inner_type: str = ""  # "structured-binary", "text-based", etc.
    inner_header_offset: int = 0
    framing_pattern: Optional[bytes] = None
    inner_structure: Optional[StructureAnalysis] = None


@dataclass
class PatternDetectionResult:
    """Complete pattern detection result"""
    structure: StructureAnalysis
    communication: Optional[CommunicationPattern]
    encapsulation: EncapsulationInfo
    protocol_fingerprint: str  # Hash of structural characteristics
    classification: str  # Human-readable classification
    confidence: float
    evidence: Dict[str, Any] = field(default_factory=dict)


class FlowTracker:
    """Tracks flows to detect communication patterns"""
    
    def __init__(self, max_flows: int = 10000, window_seconds: int = 60):
        self.max_flows = max_flows
        self.window = timedelta(seconds=window_seconds)
        self.flows: Dict[str, Dict] = {}  # flow_key -> flow data
        self.multicast_groups: Dict[str, Set[str]] = defaultdict(set)  # group_ip -> set of sources
        self.timing_samples: Dict[str, List[float]] = defaultdict(list)  # flow_key -> timestamps
        
    def _flow_key(self, src_ip: str, dst_ip: str, sport: int, dport: int) -> str:
        """Generate bidirectional flow key"""
        endpoints = sorted([(src_ip, sport), (dst_ip, dport)])
        return f"{endpoints[0][0]}:{endpoints[0][1]}-{endpoints[1][0]}:{endpoints[1][1]}"
    
    def _is_multicast(self, ip: str) -> bool:
        """Check if IP is multicast (224.0.0.0 - 239.255.255.255)"""
        try:
            parts = ip.split('.')
            first_octet = int(parts[0])
            return 224 <= first_octet <= 239
        except:
            return False
    
    def record_packet(self, src_ip: str, dst_ip: str, sport: int, dport: int, 
                      payload_len: int, timestamp: float) -> None:
        """Record packet for pattern analysis"""
        # Cleanup old flows if needed
        if len(self.flows) > self.max_flows:
            self._cleanup_old_flows()
        
        flow_key = self._flow_key(src_ip, dst_ip, sport, dport)
        
        # Track multicast
        if self._is_multicast(dst_ip):
            self.multicast_groups[dst_ip].add(src_ip)
        
        # Track flow
        if flow_key not in self.flows:
            self.flows[flow_key] = {
                'first_seen': timestamp,
                'last_seen': timestamp,
                'packet_count': 0,
                'bytes': 0,
                'src_packets': 0,
                'dst_packets': 0,
                'sizes': [],
                'src_ip': src_ip,
                'dst_ip': dst_ip
            }
        
        flow = self.flows[flow_key]
        flow['last_seen'] = timestamp
        flow['packet_count'] += 1
        flow['bytes'] += payload_len
        flow['sizes'].append(payload_len)
        
        if src_ip == flow['src_ip']:
            flow['src_packets'] += 1
        else:
            flow['dst_packets'] += 1
        
        # Track timing
        self.timing_samples[flow_key].append(timestamp)
        # Keep only last 100 samples
        if len(self.timing_samples[flow_key]) > 100:
            self.timing_samples[flow_key] = self.timing_samples[flow_key][-100:]
    
    def _cleanup_old_flows(self) -> None:
        """Remove flows older than window"""
        now = datetime.now().timestamp()
        cutoff = now - self.window.total_seconds()
        
        old_keys = [k for k, v in self.flows.items() if v['last_seen'] < cutoff]
        for key in old_keys:
            del self.flows[key]
            if key in self.timing_samples:
                del self.timing_samples[key]
    
    def detect_cyclic_pattern(self, flow_key: str) -> Optional[Dict[str, Any]]:
        """Detect cyclic/periodic communication pattern"""
        if flow_key not in self.timing_samples:
            return None
        
        timestamps = self.timing_samples[flow_key]
        if len(timestamps) < 5:
            return None
        
        # Calculate inter-packet intervals
        intervals = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps)-1)]
        
        if not intervals:
            return None
        
        avg_interval = sum(intervals) / len(intervals)
        if avg_interval <= 0:
            return None
        
        # Calculate coefficient of variation
        variance = sum((i - avg_interval) ** 2 for i in intervals) / len(intervals)
        std_dev = math.sqrt(variance)
        cv = std_dev / avg_interval if avg_interval > 0 else float('inf')
        
        # Low CV = regular/cyclic pattern
        if cv < 0.3:  # Less than 30% variation
            return {
                'is_cyclic': True,
                'period_ms': avg_interval * 1000,
                'regularity': 1 - cv,
                'samples': len(timestamps)
            }
        
        return None
    
    def detect_master_slave(self, flow_key: str) -> Optional[Dict[str, Any]]:
        """Detect master-slave/polling pattern"""
        if flow_key not in self.flows:
            return None
        
        flow = self.flows[flow_key]
        if flow['packet_count'] < 10:
            return None
        
        # Check for request-response pattern (roughly 1:1 ratio)
        ratio = flow['src_packets'] / max(flow['dst_packets'], 1)
        
        if 0.8 <= ratio <= 1.2:
            # Check for consistent packet sizes (common in polling)
            sizes = flow['sizes']
            size_counter = Counter(sizes)
            most_common_sizes = size_counter.most_common(3)
            
            if len(most_common_sizes) <= 3 and most_common_sizes[0][1] / len(sizes) > 0.3:
                return {
                    'is_master_slave': True,
                    'request_response_ratio': ratio,
                    'common_sizes': [s[0] for s in most_common_sizes],
                    'samples': flow['packet_count']
                }
        
        return None
    
    def detect_multicast_bus(self) -> Dict[str, Dict[str, Any]]:
        """Detect multicast bus patterns (multiple sources to same group)"""
        bus_patterns = {}
        
        for group_ip, sources in self.multicast_groups.items():
            if len(sources) >= 2:
                bus_patterns[group_ip] = {
                    'is_bus': True,
                    'group_address': group_ip,
                    'participant_count': len(sources),
                    'participants': list(sources)[:10]  # Limit for display
                }
        
        return bus_patterns


class StructureAnalyzer:
    """Analyzes payload structure for pattern detection"""
    
    @staticmethod
    def calculate_entropy(data: bytes) -> float:
        """Calculate Shannon entropy"""
        if not data:
            return 0.0
        
        byte_counts = Counter(data)
        length = len(data)
        entropy = 0.0
        
        for count in byte_counts.values():
            if count > 0:
                prob = count / length
                entropy -= prob * math.log2(prob)
        
        return entropy
    
    @staticmethod
    def is_printable(data: bytes, threshold: float = 0.8) -> bool:
        """Check if data is mostly printable ASCII"""
        if not data:
            return False
        printable = sum(1 for b in data if 32 <= b <= 126 or b in [9, 10, 13])
        return printable / len(data) >= threshold
    
    def detect_length_field(self, samples: List[bytes]) -> Optional[Tuple[int, int]]:
        """
        Detect if there's a length field by correlating field values with payload sizes.
        Returns (offset, size) if found.
        """
        if len(samples) < 3:
            return None
        
        min_len = min(len(s) for s in samples)
        if min_len < 4:
            return None
        
        # Try common length field positions and sizes
        for size in [2, 1, 4]:  # Most common: 2 bytes, then 1, then 4
            for offset in range(min(8, min_len - size)):
                correlations = []
                
                for sample in samples:
                    if size == 1:
                        field_val = sample[offset]
                    elif size == 2:
                        # Try both endianness
                        field_val_be = struct.unpack('>H', sample[offset:offset+2])[0]
                        field_val_le = struct.unpack('<H', sample[offset:offset+2])[0]
                        # Pick whichever is closer to remaining length
                        remaining = len(sample) - offset - 2
                        field_val = field_val_be if abs(field_val_be - remaining) < abs(field_val_le - remaining) else field_val_le
                    else:  # 4 bytes
                        field_val_be = struct.unpack('>I', sample[offset:offset+4])[0]
                        field_val_le = struct.unpack('<I', sample[offset:offset+4])[0]
                        remaining = len(sample) - offset - 4
                        field_val = field_val_be if abs(field_val_be - remaining) < abs(field_val_le - remaining) else field_val_le
                    
                    # Check if field value relates to payload length
                    remaining_len = len(sample) - offset - size
                    if remaining_len > 0:
                        # Allow for variations: field could be total len, remaining len, etc.
                        if abs(field_val - remaining_len) <= 2 or abs(field_val - len(sample)) <= 2:
                            correlations.append(True)
                        else:
                            correlations.append(False)
                
                if correlations and sum(correlations) / len(correlations) >= 0.7:
                    return (offset, size)
        
        return None
    
    def detect_message_type_field(self, samples: List[bytes]) -> Optional[Tuple[int, Set[int]]]:
        """
        Detect message type field by looking for position with limited distinct values.
        Returns (offset, set of observed types) if found.
        """
        if len(samples) < 3:
            return None
        
        min_len = min(len(s) for s in samples)
        if min_len < 2:
            return None
        
        # Look for a byte position with limited unique values (likely message type)
        for offset in range(min(16, min_len)):
            values = set(s[offset] for s in samples)
            
            # Good message type field: few distinct values, not all same, reasonable ratio
            if 2 <= len(values) <= min(16, len(samples) // 2):
                return (offset, values)
        
        return None
    
    def detect_sequence_field(self, samples: List[bytes]) -> Optional[int]:
        """
        Detect sequence number field by looking for incrementing values.
        Returns offset if found.
        """
        if len(samples) < 3:
            return None
        
        min_len = min(len(s) for s in samples)
        if min_len < 2:
            return None
        
        # Try 1-byte and 2-byte sequence fields
        for size in [1, 2]:
            for offset in range(min(8, min_len - size)):
                values = []
                for sample in samples:
                    if size == 1:
                        values.append(sample[offset])
                    else:
                        values.append(struct.unpack('>H', sample[offset:offset+2])[0])
                
                # Check for incrementing pattern (with wrapping)
                increments = 0
                for i in range(len(values) - 1):
                    diff = (values[i+1] - values[i]) % (256 if size == 1 else 65536)
                    if diff == 1:
                        increments += 1
                
                if increments / (len(values) - 1) >= 0.6:
                    return offset
        
        return None
    
    def detect_field_boundaries(self, samples: List[bytes]) -> List[int]:
        """
        Detect likely field boundaries by analyzing byte patterns across samples.
        Returns list of byte offsets that appear to be field starts.
        """
        if len(samples) < 3:
            return []
        
        min_len = min(len(s) for s in samples)
        if min_len < 4:
            return []
        
        boundaries = [0]  # Start is always a boundary
        
        for offset in range(1, min_len - 1):
            # Check if this position has characteristics of a field boundary
            
            # 1. Low variance at this position (constant header byte)
            values_at_offset = [s[offset] for s in samples]
            unique_count = len(set(values_at_offset))
            
            # If mostly constant (potential header field start)
            if unique_count == 1 and offset > 0:
                # Check if previous position had more variance
                prev_values = [s[offset-1] for s in samples]
                if len(set(prev_values)) > unique_count:
                    boundaries.append(offset)
                    continue
            
            # 2. Check for alignment patterns (common at 2, 4, 8 byte boundaries)
            if offset in [2, 4, 8, 12, 16]:
                values_here = [s[offset] for s in samples]
                # If this looks like start of variable data after fixed header
                if len(set(values_here)) > 3:
                    boundaries.append(offset)
        
        return sorted(set(boundaries))
    
    def analyze(self, payload: bytes, samples: Optional[List[bytes]] = None) -> StructureAnalysis:
        """
        Analyze payload structure.
        
        Args:
            payload: Current packet payload
            samples: Optional list of related payloads for better analysis
        """
        result = StructureAnalysis()
        
        if not payload:
            return result
        
        result.payload_entropy = self.calculate_entropy(payload)
        result.is_binary = not self.is_printable(payload)
        
        all_samples = [payload] + (samples or [])
        
        # Detect length field
        length_info = self.detect_length_field(all_samples)
        if length_info:
            result.has_length_field = True
            result.length_field_offset, result.length_field_size = length_info
            result.has_fixed_header = True
            result.header_length = result.length_field_offset + result.length_field_size
        
        # Detect message type field
        type_info = self.detect_message_type_field(all_samples)
        if type_info:
            result.has_message_type = True
            result.message_type_offset, result.detected_types = type_info
            if not result.has_fixed_header:
                result.has_fixed_header = True
                result.header_length = max(result.header_length, result.message_type_offset + 1)
        
        # Detect sequence field
        seq_offset = self.detect_sequence_field(all_samples)
        if seq_offset is not None:
            result.has_sequence_number = True
            result.sequence_offset = seq_offset
        
        # Detect field boundaries
        result.field_boundaries = self.detect_field_boundaries(all_samples)
        
        return result


class EncapsulationDetector:
    """Detects encapsulation (e.g., L7 inside UDP)"""
    
    # Common framing patterns for encapsulated protocols
    FRAMING_PATTERNS = [
        (b'\x00\x00', "null-terminated"),
        (b'\xff\xff', "ff-framing"),
        (b'\x7e', "HDLC-like"),  # PPP/HDLC framing
    ]
    
    def __init__(self, structure_analyzer: StructureAnalyzer):
        self.structure_analyzer = structure_analyzer
    
    def detect(self, payload: bytes, transport: str = "UDP", 
               samples: Optional[List[bytes]] = None) -> EncapsulationInfo:
        """Detect if payload contains encapsulated protocol"""
        result = EncapsulationInfo()
        result.outer_protocol = transport
        
        if not payload or len(payload) < 4:
            return result
        
        # Check for framing patterns
        for pattern, name in self.FRAMING_PATTERNS:
            if payload.startswith(pattern):
                result.framing_pattern = pattern
                result.inner_header_offset = len(pattern)
                result.is_encapsulated = True
                break
        
        # Analyze internal structure
        if len(payload) > 8:
            # Skip potential outer header and analyze inner payload
            inner_payloads = []
            for offset in [0, 2, 4, 8]:
                if offset < len(payload) - 4:
                    inner_payloads.append(payload[offset:])
            
            # Find the offset with best structure detection
            best_offset = 0
            best_structure = self.structure_analyzer.analyze(payload)
            
            for offset in [2, 4, 8]:
                if offset < len(payload) - 4:
                    inner_samples = [s[offset:] for s in (samples or []) if len(s) > offset + 4]
                    inner_samples.append(payload[offset:])
                    test_structure = self.structure_analyzer.analyze(
                        payload[offset:], inner_samples
                    )
                    
                    # Better structure = more detected features
                    score = sum([
                        test_structure.has_length_field * 2,
                        test_structure.has_message_type * 2,
                        test_structure.has_sequence_number * 1,
                        test_structure.has_fixed_header * 1,
                    ])
                    best_score = sum([
                        best_structure.has_length_field * 2,
                        best_structure.has_message_type * 2,
                        best_structure.has_sequence_number * 1,
                        best_structure.has_fixed_header * 1,
                    ])
                    
                    if score > best_score:
                        best_offset = offset
                        best_structure = test_structure
            
            if best_offset > 0:
                result.is_encapsulated = True
                result.inner_header_offset = best_offset
                result.inner_structure = best_structure
        
        # Classify inner type
        entropy = self.structure_analyzer.calculate_entropy(payload[result.inner_header_offset:])
        if entropy > 7.0:
            result.inner_type = "encrypted/compressed"
        elif self.structure_analyzer.is_printable(payload[result.inner_header_offset:]):
            result.inner_type = "text-based"
        elif best_structure and best_structure.has_fixed_header:
            result.inner_type = "structured-binary"
        else:
            result.inner_type = "raw-binary"
        
        return result


class PatternDetectionService:
    """
    Main service for pattern-based protocol detection.
    
    Designed for industrial/proprietary protocols without hardcoded signatures.
    """
    
    def __init__(self):
        self.flow_tracker = FlowTracker()
        self.structure_analyzer = StructureAnalyzer()
        self.encapsulation_detector = EncapsulationDetector(self.structure_analyzer)
        
        # Sample cache for learning patterns per flow
        self.payload_samples: Dict[str, List[bytes]] = defaultdict(list)
        self.max_samples_per_flow = 20
        
        # Learned fingerprints (could persist to DB)
        self.known_fingerprints: Dict[str, str] = {}  # fingerprint -> label
    
    def _flow_key(self, src_ip: str, dst_ip: str, sport: int, dport: int) -> str:
        """Generate flow key"""
        endpoints = sorted([(src_ip, sport), (dst_ip, dport)])
        return f"{endpoints[0][0]}:{endpoints[0][1]}-{endpoints[1][0]}:{endpoints[1][1]}"
    
    def _generate_fingerprint(self, structure: StructureAnalysis, 
                              encapsulation: EncapsulationInfo) -> str:
        """Generate protocol fingerprint from detected characteristics"""
        parts = []
        
        if structure.has_fixed_header:
            parts.append(f"hdr{structure.header_length}")
        if structure.has_length_field:
            parts.append(f"len@{structure.length_field_offset}:{structure.length_field_size}")
        if structure.has_message_type:
            parts.append(f"type@{structure.message_type_offset}")
        if structure.has_sequence_number:
            parts.append(f"seq@{structure.sequence_offset}")
        if encapsulation.is_encapsulated:
            parts.append(f"encap@{encapsulation.inner_header_offset}")
        
        parts.append("bin" if structure.is_binary else "txt")
        parts.append(f"ent{int(structure.payload_entropy * 10)}")
        
        fingerprint_str = "|".join(parts)
        return hashlib.md5(fingerprint_str.encode()).hexdigest()[:12]
    
    def _classify_pattern(self, structure: StructureAnalysis,
                          communication: Optional[CommunicationPattern],
                          encapsulation: EncapsulationInfo) -> str:
        """Generate human-readable classification"""
        parts = []
        
        # Protocol type
        if encapsulation.is_encapsulated:
            parts.append(f"Encapsulated-{encapsulation.inner_type.title()}")
        elif structure.is_binary:
            if structure.has_fixed_header:
                parts.append("Structured-Binary")
            else:
                parts.append("Raw-Binary")
        else:
            parts.append("Text-Based")
        
        # Communication pattern
        if communication:
            if communication.pattern_type == "cyclic":
                period = communication.evidence.get('period_ms', 0)
                parts.append(f"Cyclic-{int(period)}ms")
            elif communication.pattern_type == "master-slave":
                parts.append("Polling")
            elif communication.pattern_type == "multicast-bus":
                count = communication.evidence.get('participant_count', 0)
                parts.append(f"Bus-{count}nodes")
        
        # Structure details
        if structure.has_sequence_number:
            parts.append("Sequenced")
        
        return " / ".join(parts) if parts else "Unknown"
    
    def analyze_packet(
        self,
        payload: bytes,
        src_ip: str,
        dst_ip: str,
        sport: int,
        dport: int,
        transport: str = "UDP",
        timestamp: Optional[float] = None
    ) -> PatternDetectionResult:
        """
        Analyze packet for patterns without signature matching.
        
        Returns detected structure, communication patterns, and encapsulation info.
        """
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        
        flow_key = self._flow_key(src_ip, dst_ip, sport, dport)
        
        # Track flow for communication pattern detection
        self.flow_tracker.record_packet(src_ip, dst_ip, sport, dport, len(payload), timestamp)
        
        # Cache payload sample
        if payload and len(payload) > 0:
            samples = self.payload_samples[flow_key]
            if len(samples) < self.max_samples_per_flow:
                samples.append(payload)
            elif len(samples) == self.max_samples_per_flow:
                # Rotate samples, keeping variety
                samples.pop(0)
                samples.append(payload)
        
        samples = self.payload_samples.get(flow_key, [])
        
        # Analyze structure
        structure = self.structure_analyzer.analyze(payload, samples)
        
        # Detect encapsulation
        encapsulation = self.encapsulation_detector.detect(payload, transport, samples)
        
        # Detect communication patterns
        communication = None
        
        # Check for cyclic pattern
        cyclic = self.flow_tracker.detect_cyclic_pattern(flow_key)
        if cyclic and cyclic.get('is_cyclic'):
            communication = CommunicationPattern(
                pattern_type="cyclic",
                confidence=cyclic.get('regularity', 0.5),
                evidence=cyclic
            )
        
        # Check for master-slave if not cyclic
        if not communication:
            ms = self.flow_tracker.detect_master_slave(flow_key)
            if ms and ms.get('is_master_slave'):
                communication = CommunicationPattern(
                    pattern_type="master-slave",
                    confidence=0.7,
                    evidence=ms
                )
        
        # Check for multicast bus (check destination)
        if self.flow_tracker._is_multicast(dst_ip):
            bus_patterns = self.flow_tracker.detect_multicast_bus()
            if dst_ip in bus_patterns:
                communication = CommunicationPattern(
                    pattern_type="multicast-bus",
                    confidence=0.85,
                    evidence=bus_patterns[dst_ip]
                )
        
        # Generate fingerprint and classification
        fingerprint = self._generate_fingerprint(structure, encapsulation)
        classification = self._classify_pattern(structure, communication, encapsulation)
        
        # Calculate overall confidence
        confidence = 0.3  # Base
        if structure.has_fixed_header:
            confidence += 0.2
        if structure.has_length_field or structure.has_message_type:
            confidence += 0.2
        if communication:
            confidence += 0.2
        confidence = min(confidence, 0.95)
        
        # Build evidence
        evidence = {
            'payload_length': len(payload) if payload else 0,
            'sample_count': len(samples),
            'flow_key': flow_key,
        }
        
        if structure.has_fixed_header:
            evidence['header_length'] = structure.header_length
        if structure.detected_types:
            evidence['message_types'] = list(structure.detected_types)
        if structure.field_boundaries:
            evidence['field_boundaries'] = structure.field_boundaries
        
        return PatternDetectionResult(
            structure=structure,
            communication=communication,
            encapsulation=encapsulation,
            protocol_fingerprint=fingerprint,
            classification=classification,
            confidence=confidence,
            evidence=evidence
        )
    
    def get_multicast_bus_topology(self) -> Dict[str, Any]:
        """Get detected multicast bus groups and participants"""
        return self.flow_tracker.detect_multicast_bus()
    
    def get_flow_patterns(self) -> Dict[str, Dict]:
        """Get all detected flow patterns"""
        patterns = {}
        
        for flow_key in self.flow_tracker.flows:
            flow_data = self.flow_tracker.flows[flow_key]
            
            pattern = {
                'packet_count': flow_data['packet_count'],
                'bytes': flow_data['bytes'],
            }
            
            # Check cyclic
            cyclic = self.flow_tracker.detect_cyclic_pattern(flow_key)
            if cyclic:
                pattern['cyclic'] = cyclic
            
            # Check master-slave
            ms = self.flow_tracker.detect_master_slave(flow_key)
            if ms:
                pattern['master_slave'] = ms
            
            patterns[flow_key] = pattern
        
        return patterns
    
    def label_fingerprint(self, fingerprint: str, label: str) -> None:
        """
        Associate a human-readable label with a fingerprint.
        For learning/training detected patterns.
        """
        self.known_fingerprints[fingerprint] = label
    
    def get_label_for_fingerprint(self, fingerprint: str) -> Optional[str]:
        """Get learned label for a fingerprint"""
        return self.known_fingerprints.get(fingerprint)


# Singleton instance
pattern_detection_service = PatternDetectionService()
