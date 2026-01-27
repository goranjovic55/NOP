---
session:
  id: "2026-01-27_topology_settings"
  complexity: medium

skills:
  loaded: [frontend-react]

files:
  modified:
    - {path: "frontend/src/store/scanStore.ts", domain: frontend}
    - {path: "frontend/src/store/topologyStore.ts", domain: frontend}
    - {path: "frontend/src/pages/Topology.tsx", domain: frontend}
    - {path: "frontend/src/pages/Settings.tsx", domain: frontend}

agents:
  delegated: []

root_causes: []

gotchas:
  - problem: "Topology performance degrades with large graphs"
    solution: "Added performanceMode with auto/quality/balanced/performance settings, adaptive particle and simulation config"
---

# Session: Topology Settings & Performance

## Summary
Added adjustable topology settings to the Settings page. Created new topologyStore for persisted settings. Implemented performance mode that can be configured (auto/quality/balanced/performance) along with particle controls, node/link limits, and simulation parameters. Also changed passive scan default to ON.

## Tasks
- ✓ Change passive scan default to ON (scanStore.ts)
- ✓ Optimize topology with parallel API calls (Topology.tsx)
- ✓ Create topologyStore with performance settings (new file)
- ✓ Add Topology tab to Settings page
- ✓ Create TopologySettingsPanel component
- ✓ Update Topology page to use store's getPerformanceConfig()
- ✓ Rebuild frontend and verify

## Changes

### New File: frontend/src/store/topologyStore.ts
- TopologySettings interface with performance, animation, display, simulation sections
- defaultTopologySettings with sensible defaults
- useTopologyStore Zustand store with persist middleware
- getPerformanceConfig() method for dynamic performance based on mode and graph size

### Modified: frontend/src/pages/Settings.tsx
- Added topology tab with icon
- Created TopologySettingsPanel with 4 sections:
  - Performance (mode, particles, max nodes/links)
  - Animation (enabled, auto-refresh, rate)
  - Display Filters (traffic threshold, speed filter)
  - Simulation (cooldown/warmup ticks, time)
- Integrated with topologyStore for persistence

### Modified: frontend/src/pages/Topology.tsx
- Import and use useTopologyStore
- performanceMode useMemo now uses store's getPerformanceConfig()
- Respects user's performance mode preference

### Modified: frontend/src/store/scanStore.ts
- Changed passiveScanEnabled default from false to true
