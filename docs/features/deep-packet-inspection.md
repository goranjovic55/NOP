# Deep Packet Inspection (DPI) Feature

## Overview

The NOP (Network Operations Platform) now includes a comprehensive Deep Packet Inspection (DPI) system that provides multi-layer protocol analysis for network traffic. This feature enhances visibility into network communications by detecting application-layer protocols beyond basic transport-layer (TCP/UDP/ICMP) information.

## Features

### Protocol Detection
- **50+ built-in protocol signatures** including HTTP, HTTPS/TLS, SSH, SMB, DNS, FTP, SMTP, RDP, VNC, MySQL, PostgreSQL, Redis, MongoDB, and more
- **Three-tier detection methodology**:
  1. **Signature-based**: High confidence (95%) using payload pattern matching
  2. **Heuristic-based**: Medium confidence (60-70%) using entropy analysis and structure detection
  3. **Port-based**: Lower confidence (60%) fallback using common port assignments
- **Encrypted traffic detection**: Identifies TLS/SSL, SSH, and other encrypted protocols
- **Custom signatures**: User-defined protocol patterns stored in database

### Topology Visualization Enhancements
- **L7 protocol coloring**: Links colored by application protocol (HTTP=green, SSH=purple, DNS=orange, etc.)
- **Service labels**: Connection labels show detected service (e.g., "HTTP:80", "SSH:22")
- **Encryption indicators**: Lock icon (🔒) for encrypted connections
- **Enhanced legend**: Updated to show L4 and L7 protocol colors

### Traffic Page Enhancements
- **Service column**: New column showing detected protocol/service for each packet
- **DPI Inspector section**: Detailed DPI results in packet inspector sidebar
  - Detected protocol and confidence percentage
  - Detection method (signature/heuristic/port)
  - Encryption status
  - Entropy values for unknown protocols
  - Pattern match evidence

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/traffic/dpi/stats` | GET | Get DPI statistics (cache hits, detection rates) |
| `/api/v1/traffic/dpi/settings` | POST | Enable/disable DPI processing |
| `/api/v1/traffic/dpi/reset` | POST | Reset DPI statistics |
| `/api/v1/traffic/protocols` | GET | Get protocol breakdown by bytes/packets |

### Database Schema

Three new tables for DPI:

1. **protocol_signatures**: User-defined detection patterns
   - Pattern type: regex, bytes, or offset-based
   - Confidence score and priority
   - Category classification

2. **unknown_protocols**: Samples of unclassified traffic
   - Payload samples for analysis
   - Entropy calculations
   - Suggested patterns for detection

3. **protocol_stats**: Aggregated protocol metrics
   - Per-protocol packet/byte counts
   - Time-bucketed for trend analysis

Extended **flows** table with:
- `dpi_metadata` (JSONB): Protocol-specific fields
- `detected_protocol`: L7 protocol name
- `service_label`: Display label for topology
- `protocol_confidence`: Detection confidence score
- `is_multicast`/`is_broadcast`: Traffic type flags

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Topology   │  │   Traffic   │  │  Protocol Stats │ │
│  │  (colors,   │  │  (service   │  │  (breakdown,    │ │
│  │   labels)   │  │   column)   │  │   timeline)     │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
└─────────┼────────────────┼──────────────────┼──────────┘
          │                │                   │
          └────────────────┴───────────────────┘
                           │
                     WebSocket / REST
                           │
┌──────────────────────────┴──────────────────────────────┐
│                    Backend (FastAPI)                     │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │           DPI Orchestration Service                │  │
│  │  - Rate limiting (100/sec)                         │  │
│  │  - LRU caching (500 entries)                       │  │
│  │  - Protocol statistics                             │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │                               │
│  ┌───────────────────────┴───────────────────────────┐  │
│  │              Protocol Classifier                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │ Signature│ │Heuristic │ │  Port-based      │  │  │
│  │  │ Detector │ │Classifier│ │  Classifier      │  │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │                               │
│  ┌───────────────────────┴───────────────────────────┐  │
│  │              Sniffer Service                       │  │
│  │  - Packet capture (Scapy)                          │  │
│  │  - DPI integration                                 │  │
│  │  - Topology enrichment                             │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Performance Considerations

- **Rate limiting**: Max 100 deep inspections per second to prevent CPU overload
- **Payload size limit**: Max 2000 bytes analyzed per packet
- **Pattern length limit**: Max 256 bytes per signature pattern
- **LRU caching**: 500-entry cache for repeated traffic patterns
- **Cache key optimization**: Uses payload prefix + length + ports

## Security

- Pattern length validation prevents memory exhaustion attacks
- Custom signature count limited to 100 to prevent DoS
- Payload extraction size-limited to prevent large buffer attacks
- No execution of pattern content (patterns are for matching only)

## Usage Examples

### Enable/Disable DPI
```bash
# Enable DPI
curl -X POST http://localhost:8000/api/v1/traffic/dpi/settings \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Get DPI statistics
curl http://localhost:8000/api/v1/traffic/dpi/stats
```

### Protocol Breakdown
```bash
curl http://localhost:8000/api/v1/traffic/protocols
```

Response:
```json
{
  "protocols": [
    {"protocol": "HTTP", "packets": 1523, "bytes": 2456789, "packet_percentage": 45.2, "byte_percentage": 62.1},
    {"protocol": "TLS", "packets": 892, "bytes": 892345, "packet_percentage": 26.5, "byte_percentage": 22.5},
    {"protocol": "DNS", "packets": 345, "bytes": 45678, "packet_percentage": 10.2, "byte_percentage": 1.2}
  ],
  "total_protocols": 12,
  "dpi_enabled": true
}
```

## Supported Protocols

### Web
HTTP, HTTPS, HTTP-Alt (8080), HTTPS-Alt (8443)

### Remote Access
SSH, RDP, VNC, Telnet

### File Transfer
FTP, FTP-Data, TFTP, SMB, SMB2

### Mail
SMTP, SMTPS, POP3, POP3S, IMAP, IMAPS

### Database
MySQL, PostgreSQL, MongoDB, Redis, MSSQL, Oracle, Elasticsearch, Memcached

### Network Services
DNS, DHCP, NTP, SNMP, SNMP-Trap, LDAP, LDAPS, Syslog

### VoIP
SIP, SIPS

### Industrial (SCADA/ICS)
Modbus, S7comm, EtherNet/IP, BACnet

### Other
BitTorrent, SOCKS4, SOCKS5

## Future Enhancements

- [ ] Protocol timeline visualization
- [ ] Unknown protocol learning UI
- [ ] Custom signature editor in UI
- [ ] Protocol-specific field extraction (HTTP headers, DNS records)
- [ ] nDPI integration for 300+ protocol support
