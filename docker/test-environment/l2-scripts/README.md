# L2 Protocol Test Environment

Scapy-based L2 protocol traffic generators for testing NOP's layer 2 detection capabilities.

## Quick Start

```bash
# Start the L2 test containers
docker compose -f docker/test-environment/docker-compose.l2-protocols.yml up -d

# Run E2E tests
cd e2e && npx playwright test l2-protocols.spec.ts
```

## Test Containers

| Container | IP | Protocol | Description |
|-----------|-----|----------|-------------|
| l2-protocol-master | 172.30.0.10 | All | Master generator (runs all scripts) |
| l2-stp-root | 172.30.0.11 | STP | Root bridge (priority 4096) |
| l2-stp-bridge1 | 172.30.0.12 | STP | Non-root bridge (priority 8192) |
| l2-stp-bridge2 | 172.30.0.13 | STP | Non-root bridge (priority 8192) |
| l2-lldp-switch1 | 172.30.0.20 | LLDP | Switch with mgmt IP 172.30.0.100 |
| l2-lldp-switch2 | 172.30.0.21 | LLDP | Switch with mgmt IP 172.30.0.101 |
| l2-vlan10-host1 | 172.30.0.30 | VLAN | VLAN 10 tagged traffic |
| l2-vlan10-host2 | 172.30.0.31 | VLAN | VLAN 10 tagged traffic |
| l2-vlan20-host1 | 172.30.0.32 | VLAN | VLAN 20 tagged traffic |
| l2-ring-node1 | 172.30.0.40 | REP | Ring protocol node 1 |
| l2-ring-node2 | 172.30.0.41 | MRP | Ring protocol node 2 |
| l2-ring-node3 | 172.30.0.42 | DLR | Ring protocol node 3 |
| l2-cdp-router | 172.30.0.50 | CDP | Cisco Discovery Protocol |
| l2-host-a | 172.30.0.60 | General | Regular L2 traffic host |
| l2-host-b | 172.30.0.61 | General | Regular L2 traffic host |

## Scripts

### stp_bridge.py
Generates STP BPDUs using scapy's STP layer with LLC encapsulation.

```bash
python3 stp_bridge.py --priority 32768 [--root]
```

### lldp_sender.py
Generates LLDP frames with System Name, Management IP, and Capabilities TLVs.

```bash
python3 lldp_sender.py --system-name "Switch-01" --mgmt-ip "192.168.1.1"
```

### vlan_traffic.py
Generates 802.1Q tagged frames (ICMP, UDP, or ARP).

```bash
python3 vlan_traffic.py --vlan-id 10 --mode icmp
```

### cdp_sender.py
Generates Cisco Discovery Protocol frames.

```bash
python3 cdp_sender.py --device-id "Router-01" --platform "Cisco IOS"
```

### ring_protocol.py
Generates ring protocol frames (REP, MRP, DLR, PRP, HSR).

```bash
python3 ring_protocol.py --protocol rep --node-id 1 --ring-id 1
```

### l2_traffic_generator.py
Master script that can run all protocols.

```bash
python3 l2_traffic_generator.py --mode all
python3 l2_traffic_generator.py --mode stp --stp-priority 4096
```

## Protocols Detected

| Protocol | Multicast MAC | Ethertype | Detection Method |
|----------|---------------|-----------|------------------|
| STP/RSTP/MSTP | 01:80:c2:00:00:00 | LLC 0x42 | BPDU parsing |
| LLDP | 01:80:c2:00:00:0e | 0x88cc | TLV parsing |
| CDP | 01:00:0c:cc:cc:cc | LLC/SNAP | TLV parsing |
| VLAN 802.1Q | - | 0x8100 | Dot1Q header |
| REP | 01:00:0c:cc:cc:cd | LLC/SNAP | MAC pattern |
| MRP | 01:15:4e:00:00:xx | 0x88e3 | MAC pattern |
| DLR | 01:21:6c:00:00:xx | 0x80e1 | MAC pattern |
| PRP | 01:15:4e:00:01:xx | 0x88fb | RCT trailer |
| HSR | 01:15:4e:00:01:xx | 0x892f | HSR tag |

## Network

- Network name: `nop-l2-test`
- Subnet: `172.30.0.0/24`
- Driver: `bridge`

## Testing

### API Endpoints

```bash
# L2 Topology (includes VLANs, STP, LLDP, CDP, Ring)
curl http://localhost:12000/api/v1/traffic/l2/topology

# L2 Entities
curl http://localhost:12000/api/v1/traffic/l2/entities

# L2 Connections
curl http://localhost:12000/api/v1/traffic/l2/connections
```

### E2E Tests

```bash
cd e2e
npx playwright test l2-protocols.spec.ts --headed
```

## Troubleshooting

### Containers not starting
```bash
# Check container logs
docker compose -f docker/test-environment/docker-compose.l2-protocols.yml logs

# Ensure scapy is available
docker exec l2-stp-root pip3 show scapy
```

### No L2 data in API
```bash
# Verify backend is capturing on correct interface
# The interface should be the bridge for nop-l2-test network
docker network inspect nop-l2-test | grep -A2 "com.docker.network.bridge.name"
```

### Protocol not detected
- Ensure traffic is being generated: `tcpdump -i any -n 'ether dst 01:80:c2:00:00:00'`
- Check backend logs for parsing errors
- Verify scapy has required contrib modules: `from scapy.contrib import lldp, cdp`
