---
title: Live Traffic Topology
type: explanation
category: concepts
last_updated: 2026-01-14
---

# Live Traffic Topology View

## Overview

The Network Topology view provides real-time visualization of network traffic with EtherApe-style visual effects. Connections are dynamically styled based on traffic volume, recency, and protocol type.

## Features

### Visual Indicators

| Visual Element | Meaning |
|----------------|---------|
| **Link Thickness** | Traffic volume (logarithmic scale, 0.3-3px) |
| **Link Brightness** | Recency of traffic (brighter = more recent) |
| **Node Size** | Number of connections (more connections = larger) |
| **Link Color** | Protocol type (see below) |
| **Particles** | Active traffic flow (when animation enabled) |

### Protocol Colors

| Protocol | Color |
|----------|-------|
| TCP | Green (#00ff41) |
| UDP | Cyan (#00f0ff) |
| ICMP | Yellow (#ffff00) |
| Other IP | Magenta (#ff00ff) |

### Toolbar Controls

| Control | Function |
|---------|----------|
| **Force/Circ/Hier** | Layout mode (force-directed, circular, hierarchical) |
| **All/Subnet** | Filter mode (all subnets or discovery subnet only) |
| **IP Filter** | Filter by IP address pattern (in All mode) |
| **Subnet Dropdown** | Select specific subnet (in Subnet mode) |
| **Min Traffic** | Minimum traffic threshold to display link (All/1K/100K/1M) |
| **Interval** | Auto-refresh interval (1s/5s/10s/30s) |
| **●AUTO/○MAN** | Toggle automatic data refresh |
| **▶/⏸** | Toggle flow animation (particles) |
| **↻** | Manual refresh |
| **N/L** | Node and Link counts |

## Architecture

### Backend Components

#### `/backend/app/api/v1/endpoints/traffic.py`
- **`POST /burst-capture`**: Short burst capture endpoint
  - Parameters: `duration` (1-10 seconds), `agent_id` (optional)
  - Returns fresh connections with timestamps

#### `/backend/app/services/SnifferService.py`
- Extended with burst capture methods
- Tracks `last_seen`, `first_seen`, `packet_count` per connection
- Thread-safe burst capture with stop signal

### Frontend Components

#### `/frontend/src/pages/Topology.tsx`
Main topology visualization component with:
- **ForceGraph2D**: D3-based force-directed graph
- **Collision detection**: Prevents node overlaps using `forceCollide`
- **Position persistence**: Preserves node positions during auto-refresh
- **Custom rendering**: Canvas-based node and link drawing

#### `/frontend/src/services/trafficService.ts`
Traffic service helper:
- `burstCapture()`: Triggers backend burst capture
- `getStats()`: Gets current traffic statistics
- `calculateLinkVisuals()`: Computes link width/opacity
- `calculateNodeSize()`: Computes node size from connections

#### `/frontend/src/services/dashboardService.ts`
Extended TrafficStats interface with:
- `current_time`: Server timestamp for recency calculations
- Connection timestamps (`last_seen`, `first_seen`, `packet_count`)

## Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Auto-Refresh  │────▶│  Burst Capture   │────▶│  Update Graph   │
│   (interval)    │     │  (2-5 seconds)   │     │  (no re-layout) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Merge with      │────▶│  Visual Update  │
                        │  Existing Data   │     │  (colors/sizes) │
                        └──────────────────┘     └─────────────────┘
```

## Force Simulation Settings

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Charge Strength | -500 to -3000 | Node repulsion (scales with node count) |
| Link Distance | 100-400 | Preferred link length |
| Link Strength | 0.1 | How rigidly links maintain distance |
| Center Strength | 0.005 | Pull toward canvas center |
| Collision Radius | 30-70px | Minimum spacing between nodes |

## Filtering Logic

### IP Validation
Only valid IPv4 addresses (x.x.x.x format) are processed. UUIDs and hash identifiers are filtered out to keep the view clean.

### Subnet Mode
- Shows only nodes within the selected /24 subnet
- External connections to/from subnet nodes are included
- Uses first detected subnet with online assets by default

### All Mode with IP Filter
- Partial IP matching (e.g., "192.168" matches all in that range)
- Hostname matching (case-insensitive)
- Clears with ✕ button

## Labels

- Always visible but dimmed when many nodes (>30)
- Font size scales with zoom and node count
- Highlighted on hover with neon glow effect
- IP addresses shown for all nodes

## Performance Considerations

- **Node positions persisted**: Uses `nodePositionsRef` to prevent layout jumps
- **Simulation runs once**: `simulationCompleteRef` prevents re-simulation on data refresh
- **Conditional burst capture**: Duration scales with refresh rate
- **Label throttling**: Smaller/dimmer labels when many nodes

## Related Files

- `frontend/src/pages/Topology.tsx` - Main component
- `frontend/src/services/trafficService.ts` - Traffic API service
- `frontend/src/services/dashboardService.ts` - Dashboard service
- `backend/app/api/v1/endpoints/traffic.py` - Traffic API
- `backend/app/services/SnifferService.py` - Packet capture service
