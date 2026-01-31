---
session:
  id: "2026-01-31_topology-connection-colors"
  complexity: simple

skills:
  loaded: [debugging, frontend-react]

files:
  modified:
    - {path: "frontend/src/pages/Topology.tsx", domain: frontend}

root_causes:
  - problem: "Asset list connection count badges always showing violet regardless of link type"
    solution: "getLayerColorForNode() was checking node.details?.detected_protocols which is never set on nodes (only on links). Added dominantLayer property calculated from actual connected links."

gotchas:
  - pattern: "Connection badges ignoring link layer"
    solution: "Calculate dominantLayer per node from connected links, use in getLayerColorForNode()"
---

# Session: Topology Connection Colors Fix

## Summary
Fixed issue where asset list connection count badges were always violet, ignoring the actual link/connection types.

## Root Cause
The `getLayerColorForNode()` function checked `node.details?.detected_protocols` which was never set on nodes - `detected_protocols` is only set on links. This caused most nodes to fall through to violet color.

## Solution
1. Added `dominantLayer` property to `GraphNode` interface
2. Calculate dominant layer per node during link processing (tracks L2/L4/L5/L7 counts)
3. Updated `getLayerColorForNode()` to use `node.dominantLayer` for badge coloring

## Tasks
- ✓ Investigated and identified root cause
- ✓ Added dominantLayer to GraphNode interface
- ✓ Calculated dominant layer from connected links
- ✓ Updated getLayerColorForNode() to use dominantLayer
- ✓ Verified syntax
