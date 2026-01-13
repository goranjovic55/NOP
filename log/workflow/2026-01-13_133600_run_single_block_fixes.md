---
session:
  id: "2026-01-13_run_single_block_fixes"
  date: "2026-01-13"
  complexity: medium
  domain: fullstack

skills:
  loaded: [frontend-react, backend-api]
  suggested: []

files:
  modified:
    - {path: "frontend/src/components/workflow/ConfigPanel.tsx", type: tsx, domain: frontend}
    - {path: "frontend/src/components/workflow/FlowTemplates.tsx", type: tsx, domain: frontend}
    - {path: "backend/app/api/v1/endpoints/workflows.py", type: py, domain: backend}
  types: {tsx: 2, py: 1}

agents:
  delegated: []

gotchas:
  - pattern: "localStorage.getItem('token') returns null"
    warning: "Auth token stored under 'auth_token' not 'token'"
    solution: "Use localStorage.getItem('auth_token') consistently"
    applies_to: [frontend-react]
  - pattern: "React state captured before async operation completes"
    warning: "updateNode triggers re-render which resets localParams via useEffect"
    solution: "Capture params with { ...localParams } before any state updates or async calls"
    applies_to: [frontend-react]
  - pattern: "ConfigPanel save only updates Zustand store"
    warning: "Changes lost on page refresh because backend not updated"
    solution: "Call saveCurrentWorkflow() after updateNode to persist to backend"
    applies_to: [frontend-react]
  - pattern: "Block executor returns hardcoded mock data"
    warning: "scanning.port_scan was mocked, always returned same ports"
    solution: "Use real NetworkScanner service for actual nmap scan"
    applies_to: [backend-api]

root_causes:
  - problem: "Run Single Block returned 401 Unauthorized"
    solution: "Changed localStorage key from 'token' to 'auth_token'"
    skill: frontend-react
  - problem: "Changed parameters reverted when running block"
    solution: "Capture localParams at start of function before any state updates"
    skill: frontend-react
  - problem: "Saved changes lost on page refresh"
    solution: "Added saveCurrentWorkflow() call to persist to backend API"
    skill: frontend-react
  - problem: "Port scan always showed same 5 ports regardless of settings"
    solution: "Replaced mock with real NetworkScanner.port_scan() call"
    skill: backend-api

gates:
  passed: [G0, G1, G2, G3, G5]
  violations: []
---

# Session Log: Run Single Block Fixes

## Summary
Fixed multiple issues with the "Run Single Block" feature in the ConfigPanel, including authentication, parameter persistence, and mock scanning.

## Tasks Completed
- ✓ Fixed 401 Unauthorized error (wrong localStorage key 'token' → 'auth_token')
- ✓ Fixed race condition where params reverted to old values during execution
- ✓ Fixed "Save Changes" to persist to backend API (not just Zustand store)
- ✓ Replaced mock port_scan with real NetworkScanner implementation
- ✓ Fixed FlowTemplates invalid 'agent.command' type → 'command.ssh_execute'

## Key Changes

### ConfigPanel.tsx
1. Changed auth token key: `localStorage.getItem('auth_token')`
2. Capture params at function start: `const paramsToUse = { ...localParams }`
3. Added `saveCurrentWorkflow()` call after `updateNode()` to persist to backend
4. Added validation before running single block

### workflows.py (Backend)
1. Added import: `from app.services.scanner import NetworkScanner`
2. Replaced mock port_scan with real implementation using NetworkScanner
3. Added scan_type handling (quick/full/custom port ranges)

## Verification
- ✓ Build successful
- ✓ Backend restart successful
- ✓ No syntax errors
