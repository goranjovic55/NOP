# Storm Functionality

Real-time network traffic generation for testing storm protection mechanisms.

## Features

- ✅ Multiple packet types: Broadcast, Multicast, TCP, UDP, Raw IP
- ✅ Configurable rate control (1-10M PPS)
- ✅ Real-time metrics and visualization
- ✅ Live PPS graphing with 60-second rolling window
- ✅ TCP flag customization
- ✅ Custom payload support

## Quick Start

```bash
# 1. Navigate to Traffic → Storm tab
# 2. Select packet type (e.g., TCP)
# 3. Configure destination IP and port
# 4. Set PPS rate (start low, e.g., 100)
# 5. Click START STORM
# 6. Monitor real-time metrics
# 7. Click STOP STORM when complete
```

## Usage

### Test Broadcast Storm Protection

```
Packet Type: Broadcast
PPS: 5000
Interface: eth0
```

### Test Firewall Connection Tracking

```
Packet Type: TCP
Destination: 10.0.0.1:443
TCP Flags: SYN, ACK
PPS: 2000
```

---

## Feature Details

### Packet Type Selection
Choose from five packet types:
- **Broadcast**: Ethernet broadcast packets to 255.255.255.255
- **Multicast**: Multicast UDP packets to 224.0.0.1
- **TCP**: TCP packets with configurable flags
- **UDP**: UDP packets
- **Raw IP**: Raw IP packets without transport layer

### Configuration Options

#### Network Configuration
- **Interface**: Select the network interface to send packets from
- **Source IP**: Optional source IP address (auto-detected if not specified)
- **Destination IP**: Target IP address
- **TTL**: Time-to-live value (1-255)

#### Transport Layer (TCP/UDP only)
- **Source Port**: Optional source port (random if not specified)
- **Destination Port**: Target port number

#### TCP-Specific
- **TCP Flags**: Select one or more flags (SYN, ACK, FIN, RST, PSH, URG)

#### Rate Control
- **PPS (Packets Per Second)**: Control traffic generation rate (1-10,000,000 PPS)

#### Payload
- **Optional payload data**: Add custom payload to packets

### Real-Time Metrics

While storm is active, the following metrics are displayed:

- **Packets Sent**: Total number of packets transmitted
- **Bytes Sent**: Total data volume transmitted
- **Current PPS**: Real-time packet rate
- **Target PPS**: Configured target rate
- **Duration**: Storm duration in HH:MM:SS format

### Visual Monitoring

- **Live PPS Graph**: 60-second rolling window showing packet rate over time
- **Status Indicator**: Visual indicator showing storm active/stopped
- **Average & Peak Statistics**: Calculated from historical data

---

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `interface` | Auto-detect | Network interface to send packets from |
| `pps` | 1000 | Packets per second (1-10,000,000) |
| `packet_type` | TCP | Type of packet to generate |
| `dest_ip` | Required | Target IP address |
| `dest_port` | Required | Target port (TCP/UDP only) |
| `ttl` | 64 | Time-to-live value (1-255) |

---

## Use Cases

### Storm Protection Testing
Test network devices' ability to handle and mitigate packet storms:
```
Packet Type: TCP
Destination: 192.168.1.1
Destination Port: 80
TCP Flags: SYN
PPS: 10000
```

### Broadcast Storm Testing
Test switch broadcast storm control:
```
Packet Type: Broadcast
PPS: 5000
```

### Rate Limiting Validation
Verify QoS and rate limiting configurations:
```
Packet Type: UDP
Destination: 192.168.1.100
Destination Port: 53
PPS: 1000
```

### Firewall Testing
Test firewall connection tracking under load:
```
Packet Type: TCP
Destination: 10.0.0.1
Destination Port: 443
TCP Flags: SYN, ACK
PPS: 2000
```

## Safety Features

1. **Validation**: Input validation prevents invalid configurations
2. **Warning Banner**: Prominent warning about responsible use
3. **Single Storm**: Only one storm can run at a time
4. **Manual Control**: Storm must be manually started and stopped
5. **Metrics Logging**: All storm activity is logged for audit

## Best Practices

1. **Start Low**: Begin with low PPS values (e.g., 100) and increase gradually
2. **Test Environment**: Use only in controlled test environments
3. **Monitor Impact**: Watch network device metrics during testing
4. **Document Results**: Record configurations and observations
5. **Coordinate**: Notify network team before storm testing

## API Endpoints

### Start Storm
```
POST /api/v1/traffic/storm/start
Content-Type: application/json

{
  "interface": "eth0",
  "packet_type": "tcp",
  "dest_ip": "192.168.1.1",
  "dest_port": 80,
  "pps": 1000,
  "tcp_flags": ["SYN"]
}
```

### Stop Storm
```
POST /api/v1/traffic/storm/stop
```

### Get Metrics
```
GET /api/v1/traffic/storm/metrics
```

Response:
```json
{
  "active": true,
  "packets_sent": 150000,
  "bytes_sent": 9000000,
  "duration_seconds": 150,
  "current_pps": 1000,
  "target_pps": 1000,
  "start_time": "2025-12-29 20:30:15"
}
```

## Technical Implementation

### Backend
- **Service**: `SnifferService` in `backend/app/services/SnifferService.py`
- **Thread**: Dedicated storm thread for packet generation
- **Library**: Scapy for packet crafting and sending
- **Metrics**: Real-time PPS calculation with 1-second granularity

### Frontend
- **Component**: `Storm.tsx` in `frontend/src/pages/`
- **Updates**: 1-second polling interval for metrics
- **Visualization**: SVG-based line chart for PPS history
- **State**: Local React state with cleanup on unmount

## Limitations

1. **Root Privileges**: Requires root/CAP_NET_RAW for raw socket access
2. **System Resources**: High PPS rates may impact system performance
3. **Network Capacity**: Limited by network interface bandwidth
4. **Single Storm**: Only one storm session supported at a time

## Security Considerations

⚠️ **WARNING**: This feature generates high-volume network traffic that can:
- Overwhelm network devices
- Trigger DoS protection mechanisms
- Impact production services
- Violate network policies

**Use only in authorized test environments with proper authorization.**

## Future Enhancements

Potential improvements for future releases:
- [ ] Multiple concurrent storms
- [ ] Saved storm profiles
- [ ] Scheduled storm execution
- [ ] Advanced payload patterns
- [ ] Export storm results to report
- [ ] Integration with vulnerability scanning
- [ ] Automatic rate ramping
- [ ] Response packet analysis

## Related Documentation

- [Traffic Filtering](GRANULAR_TRAFFIC_FILTERING.md) - Advanced filtering options
- [API Reference](../technical/API_rest_v1.md) - Complete API documentation
- [Deployment Guide](../guides/DEPLOYMENT.md) - Production setup

---

**Document Version**: 2.0  
**Last Updated**: 2026-01-05  
**Status**: Production Ready
