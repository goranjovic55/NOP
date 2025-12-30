# Granular Traffic Filtering Feature

## Overview
Added granular filtering controls for passive discovery to allow fine-tuned detection of hosts based on traffic type.

## Features Implemented

### 1. Track Source Only Toggle
- **Default**: Enabled (safe mode)
- **Description**: When enabled, only tracks hosts that send traffic (source IPs)
- **When disabled**: Tracks both source and destination IPs with granular filtering

### 2. Granular Destination Filters (when source-only disabled)

#### Unicast Filter
- **Default**: Disabled
- **Description**: Filter point-to-point traffic
- **Use case**: Disable to detect passive listeners receiving unicast traffic

#### Multicast Filter  
- **Default**: Enabled
- **Description**: Filter group traffic (224.0.0.0/4)
- **Recommended**: Keep enabled to avoid noise

#### Broadcast Filter
- **Default**: Enabled  
- **Description**: Filter network-wide traffic
- **Recommended**: Keep enabled to avoid noise

## Backend Changes

### Schema (`backend/app/schemas/settings.py`)
```python
track_source_only: bool = Field(default=True)
filter_unicast: bool = Field(default=False)
filter_multicast: bool = Field(default=True)
filter_broadcast: bool = Field(default=True)
```

### Service (`backend/app/services/SnifferService.py`)
- Added filter attributes to `__init__`
- Added setter methods for each filter
- Updated `_should_track_ip()` with granular filtering logic
- Filters checked in order: link-local → broadcast → multicast → unicast

### API (`backend/app/api/v1/endpoints/settings.py`)
- Apply all filter settings when discovery settings are updated

### Startup (`backend/app/main.py`)
- Load all filter settings from database on startup
- Apply to sniffer service before starting

## Frontend Changes

### TypeScript Interface (`frontend/src/pages/Settings.tsx`)
```typescript
interface DiscoverySettings {
  track_source_only: boolean;
  filter_unicast: boolean;
  filter_multicast: boolean;
  filter_broadcast: boolean;
  // ... other fields
}
```

### UI Components
- Main toggle: "Track Source IPs Only"
- Conditional sub-panel with 3 filter toggles (only shown when source-only disabled)
- Simplified labels and descriptions for space efficiency

## Testing

### Traffic Generator Script
**Location**: `scripts/generate_test_traffic.py`

Generates:
- Unicast packets (to specific IP)
- Multicast packets (224.0.0.251, 239.255.255.250)
- Broadcast packets (255.255.255.255 and network broadcast)
- ARP broadcast
- Link-local traffic (169.254.x.x)

**Usage**:
```bash
# Generate all traffic types
sudo python3 scripts/generate_test_traffic.py --type all --target 172.21.0.10

# Generate specific type
sudo python3 scripts/generate_test_traffic.py --type unicast --target 172.21.0.10 --count 20
sudo python3 scripts/generate_test_traffic.py --type multicast --count 10
sudo python3 scripts/generate_test_traffic.py --type broadcast --network 172.21.0.255
```

### Test Script
**Location**: `scripts/test_filtering.sh`

Interactive script that:
1. Explains the test procedure
2. Runs traffic generator
3. Provides instructions for verification

**Usage**:
```bash
./scripts/test_filtering.sh
```

## Use Cases

### Detecting Passive UDP Listeners
1. Disable "Track Source IPs Only"
2. Disable "Unicast" filter
3. Enable "Multicast" and "Broadcast" filters
4. Generate traffic to target
5. Check if destination IP appears in discovered hosts

### Safe Discovery (Default)
1. Enable "Track Source IPs Only"
2. All filters ignored
3. Only hosts that send traffic are discovered

### Custom Scenarios
Mix and match filters based on network requirements:
- Disable unicast + enable multicast/broadcast = Detect passive listeners without noise
- Disable all filters = See all traffic (lots of noise)
- Enable all filters = Most restrictive (may miss some hosts)

## Configuration Persistence

Settings are stored in database (Settings table, discovery category) and loaded on:
- Application startup
- Settings update via API
- Discovery settings reset

## API Endpoints

### Get Discovery Settings
```bash
curl http://localhost:12001/api/v1/settings/discovery
```

### Update Discovery Settings
```bash
curl -X PUT http://localhost:12001/api/v1/settings/discovery \
  -H "Content-Type: application/json" \
  -d '{
    "track_source_only": false,
    "filter_unicast": false,
    "filter_multicast": true,
    "filter_broadcast": true
  }'
```

### Reset to Defaults
```bash
curl -X POST http://localhost:12001/api/v1/settings/reset/discovery
```

## Notes

- Link-local addresses (169.254.0.0/16) are ALWAYS filtered regardless of settings
- Filters only apply when `track_source_only` is disabled
- UI automatically hides filter options when source-only mode is enabled
- Backend logs show current filter configuration on startup
