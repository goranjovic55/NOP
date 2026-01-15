---
session:
  id: "2026-01-13_single_block_execution_fix"
  date: "2026-01-13"
  complexity: medium
  domain: fullstack

skills:
  loaded: [frontend-react, backend-api, debugging]
  suggested: []

files:
  modified:
    - {path: "frontend/src/components/workflow/ConfigPanel.tsx", type: tsx, domain: frontend}
    - {path: "frontend/src/components/workflow/ExecutionConsole.tsx", type: tsx, domain: frontend}
    - {path: "frontend/src/store/workflowStore.ts", type: ts, domain: frontend}
  types: {tsx: 2, ts: 1}

agents:
  delegated: []

gotchas:
  - pattern: "401 Unauthorized on single block execution"
    warning: "ConfigPanel was using localStorage.getItem('auth_token') which doesn't exist"
    solution: "Use localStorage.getItem('nop-auth') and parse JSON to get state.token"
    applies_to: [frontend-react, backend-api]
  - pattern: "Console not showing single block logs"
    warning: "ExecutionConsole only watched workflow execution, not single block runs"
    solution: "Added shared consoleLogs to workflowStore, ExecutionConsole watches both"
    applies_to: [frontend-react]
  - pattern: "INPUT SOURCE label confusing"
    warning: "Users thought INPUT SOURCE controlled block parameters"
    solution: "Renamed to 'INJECT CONTEXT (optional)' with clarifying text"
    applies_to: [frontend-react]

root_causes:
  - problem: "Single block execution always returned 401 Unauthorized"
    solution: "Auth token was being read from wrong localStorage key. Changed from 'auth_token' to 'nop-auth' with proper JSON parsing (same pattern as workflowStore)"
    skill: frontend-react

gates:
  passed: [G0, G1, G2, G3, G4, G5, G6]
  violations: []
---

# Session Log: Single Block Execution Fix

## Summary
Fixed single block execution in workflow builder. The "Run Single Block" button was always failing with 401 Unauthorized because the auth token was being read from the wrong localStorage key. Also added console logging for single block executions and clarified the confusing "INPUT SOURCE" UI.

## Tasks Completed
- ✓ Investigated single block execution failure
- ✓ Fixed auth token retrieval in ConfigPanel (nop-auth key with JSON parsing)
- ✓ Added consoleLogs to workflowStore for shared logging
- ✓ Updated ExecutionConsole to show single block execution logs
- ✓ Renamed "INPUT SOURCE" to "INJECT CONTEXT (optional)" with clarification
- ✓ Verified fix works with real test (scanme.nmap.org ping)

## Root Cause Analysis
The `runSingleBlock` function in ConfigPanel was using:
```javascript
localStorage.getItem('auth_token')  // WRONG - doesn't exist
```

Should have been:
```javascript
const authData = localStorage.getItem('nop-auth');
const parsed = JSON.parse(authData);
return parsed.state?.token || null;
```

This pattern matches what workflowStore uses for workflow execution (which worked correctly).

## Key Changes
1. **ConfigPanel.tsx**: Added `getAuthToken()` helper with correct localStorage access
2. **workflowStore.ts**: Added `consoleLogs`, `addConsoleLog()`, `clearConsoleLogs()`
3. **ExecutionConsole.tsx**: Watches shared store logs, added 'single-block' log type styling

## Testing
- Single block execution now succeeds with proper authentication
- Console shows single block execution logs with orange styling
- UI clarifies that INJECT CONTEXT is for chaining, not parameters
