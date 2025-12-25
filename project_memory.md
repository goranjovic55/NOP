# Project Memory

## Current Status
Active development on Dashboard features, specifically Asset management, auto-discovery, and Network Topology.

## Recent Work
- **Infrastructure**:
    - Fixed `docker-compose.yml` network configuration to support test environment subnets.
    - Started test environment containers.
- **Dashboard**:
    - Updated Dashboard to display real data for assets, traffic, and active connections.
    - Replaced 'vulnerables' metric with 'active connections'.
- **Assets Page**:
    - Implemented auto-refresh functionality.
    - Fixed auto-discovery logic by correcting timer implementation and state management in `Assets.tsx`.
    - Confirmed auto-discovery is working.
    - Updated `assetService.ts` to support scan status polling.
    - Enhanced `ScanSettingsModal` for better configuration.
- **Topology Page**:
    - Implemented interactive network topology visualization using `react-force-graph-2d`.
    - Added Force, Circular, and Hierarchical layouts.
    - Implemented traffic flow animation.
    - Integrated real-time asset and connection data.
    - Refined visualization with constant node sizes, better separation, and hover details.
    - Implemented dynamic link thickness based on traffic volume (logarithmic scale).
- **Access Hub**:
    - Implemented embedded FTP client.
    - Fixed UI input locking issues.
    - Resolved VNC and RDP connection stability.
- **Backend**:
    - Updated `SnifferService` to track connection pairs for topology generation.

## Active Issues
- None currently reported.

## Next Steps
- Verify auto-discovery in a live environment.
- Continue enhancing dashboard analytics.
