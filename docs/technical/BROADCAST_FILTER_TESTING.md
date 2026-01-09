# Broadcast Filter Testing Guide

## Overview
Test the passive discovery broadcast filtering feature to ensure it correctly filters broadcast and multicast traffic.

## Test Scripts

### 1. `test_broadcast_filter.py`
Generates various types of network traffic:
- **Unicast**: Normal traffic to legitimate IPs (should always be discovered)
- **Broadcast**: Traffic to x.x.x.255 and 255.255.255.255 (should be filtered when enabled)
- **Multicast**: Traffic to 224.x.x.x range (should be filtered when enabled)
- **Link-local**: Traffic to 169.254.x.x (should be filtered when enabled)

### 2. `clear_discovered_hosts.py`
Check current status and discovered hosts.

## Testing Procedure

### Test 1: Filter DISABLED (should discover everything)

1. **Disable the broadcast filter**:
   ```bash
   # In UI: Settings > Discovery > Disable "Filter Broadcast from Passive Discovery"
   # Or via API:
   curl -X PUT http://localhost:8000/api/settings/discovery \
     -H "Content-Type: application/json" \
     -d '{"filter_broadcast_from_passive_discovery": false, ...other settings...}'
   ```

2. **Restart backend to clear discovered hosts**:
   ```bash
   docker-compose restart backend
   ```

3. **Check current status**:
   ```bash
   python3 scripts/clear_discovered_hosts.py
   ```

4. **Generate test traffic**:
   ```bash
   # Run from backend container to ensure packets are captured
   docker-compose exec backend python3 /app/scripts/test_broadcast_filter.py --all
   
   # Or run specific types:
   docker-compose exec backend python3 /app/scripts/test_broadcast_filter.py --broadcast 10
   ```

5. **Wait a few seconds, then check discovered hosts**:
   ```bash
   python3 scripts/clear_discovered_hosts.py
   ```

6. **Expected Result**: 
   - Should see ~15-20 discovered IPs
   - Includes broadcast addresses (x.x.x.255, 255.255.255.255)
   - Includes multicast addresses (224.x.x.x)
   - Includes link-local addresses (169.254.x.x)
   - Includes legitimate unicast IPs

### Test 2: Filter ENABLED (should filter broadcast/multicast)

1. **Enable the broadcast filter**:
   ```bash
   # In UI: Settings > Discovery > Enable "Filter Broadcast from Passive Discovery"
   ```

2. **Restart backend to clear discovered hosts**:
   ```bash
   docker-compose restart backend
   ```

3. **Check current status**:
   ```bash
   python3 scripts/clear_discovered_hosts.py
   ```
   Should show: "Broadcast filter is ENABLED"

4. **Generate test traffic again**:
   ```bash
   docker-compose exec backend python3 /app/scripts/test_broadcast_filter.py --all
   ```

5. **Wait a few seconds, then check discovered hosts**:
   ```bash
   python3 scripts/clear_discovered_hosts.py
   ```

6. **Expected Result**:
   - Should see only ~5-7 discovered IPs
   - Should NOT include broadcast addresses
   - Should NOT include multicast addresses
   - Should NOT include link-local addresses
   - Should ONLY include legitimate unicast IPs (e.g., 8.8.8.8, 1.1.1.1, local subnet IPs)

## Quick Test Commands

```bash
# Check status
python3 scripts/clear_discovered_hosts.py

# Generate all types of traffic
docker-compose exec backend python3 /app/scripts/test_broadcast_filter.py --all

# Generate specific traffic types
docker-compose exec backend python3 /app/scripts/test_broadcast_filter.py --unicast 10
docker-compose exec backend python3 /app/scripts/test_broadcast_filter.py --broadcast 10
docker-compose exec backend python3 /app/scripts/test_broadcast_filter.py --multicast 10

# Check via API
curl http://localhost:8000/api/discovery/passive-discovery | jq

# Check discovery settings
curl http://localhost:8000/api/settings | jq '.discovery.filter_broadcast_from_passive_discovery'
```

## Verification Checklist

- [ ] Filter OFF: Discovers broadcast addresses (x.x.x.255, 255.255.255.255)
- [ ] Filter OFF: Discovers multicast addresses (224.x.x.x)
- [ ] Filter OFF: Discovers link-local addresses (169.254.x.x)
- [ ] Filter ON: Does NOT discover broadcast addresses
- [ ] Filter ON: Does NOT discover multicast addresses
- [ ] Filter ON: Does NOT discover link-local addresses
- [ ] Filter ON: Still discovers legitimate unicast addresses
- [ ] Setting persists across backend restarts
- [ ] Setting change applies immediately without restart

## Troubleshooting

**No hosts discovered at all:**
- Ensure passive discovery is enabled in settings
- Check that the sniffer service is running
- Verify traffic is being generated on the correct interface

**All hosts still discovered with filter ON:**
- Check the setting value via API: `curl http://localhost:8000/api/settings`
- Restart backend after changing setting
- Verify the filter is being applied in SnifferService

**Cannot run test script:**
- Install scapy: `pip install scapy`
- Run as root or with CAP_NET_RAW capability
- Run from inside backend container where scapy is already installed
