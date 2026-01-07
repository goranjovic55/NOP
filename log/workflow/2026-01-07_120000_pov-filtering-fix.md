# POV Filtering Fix - Access & Topology Pages

**Date**: 2026-01-07 12:00
**Branch**: copilot/create-agent-page

## Summary

Fixed two POV (Point of View) mode filtering issues:
1. Access page showing all assets instead of only POV-filtered assets
2. Topology page not showing connections between nodes in POV mode

## Root Causes

### Access Page
- `fetchAllAssets()` was calling `assetService.getAssets(authToken)` without the `agentPOV` parameter
- No dependency on `activeAgent` to refresh when POV changes

### Topology Page
- `dashboardService.getTrafficStats(token)` was not passing agent POV
- Assets were filtered by POV but connections were not, causing mismatches

## Changes Made

### frontend/src/pages/Access.tsx
- Added `usePOV` hook import
- Added `activeAgent` from POV context
- Updated `fetchAllAssets` to pass `activeAgent?.id` to asset service
- Added `activeAgent` to useEffect dependency arrays

### frontend/src/pages/Topology.tsx
- Added `activeAgent?.id` parameter to `getTrafficStats()` call

## Verification
- Frontend rebuilt successfully
- Backend already supports POV filtering via X-Agent-POV header
- Traffic stats endpoint properly filters flows by agent_id

## Worktree
```
<MAIN> ✓ Fix POV mode filtering issues
├─ <WORK> ✓ Analyze Access page POV filtering
├─ <WORK> ✓ Analyze Topology page connections  
├─ <WORK> ✓ Implement fixes
└─ <END> ✓ Review and approval
```
