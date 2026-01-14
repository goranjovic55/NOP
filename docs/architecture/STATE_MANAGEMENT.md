---
title: State Management
type: reference
category: architecture
auto_generated: true
last_updated: 2026-01-14
---

# State Management

## Overview

This document describes the frontend state management architecture.
The application uses Zustand for state management.

## Stores


### agentStore
**File**: `frontend/src/store/agentStore.ts` | **Updated**: 2026-01-09


### trafficStore
**File**: `frontend/src/store/trafficStore.ts` | **Updated**: 2026-01-09


### exploitStore
**File**: `frontend/src/store/exploitStore.ts` | **Updated**: 2026-01-09


### authStore
**File**: `frontend/src/store/authStore.ts` | **Updated**: 2026-01-10

| State | Type | Description |
|-------|------|-------------|
| `token` | `string \| null` | JWT authentication token |
| `username` | `string \| null` | Logged-in username |
| `_hasHydrated` | `boolean` | Tracks Zustand persist hydration from localStorage |

| Action | Description |
|--------|-------------|
| `login(token, username)` | Store token and username after auth |
| `logout()` | Clear auth state and redirect to login |
| `setHasHydrated(state)` | Mark hydration complete |

**Persistence:** Uses Zustand persist middleware with localStorage.

**Gotcha:** Must check `_hasHydrated` before accessing `token` to avoid race conditions where token appears null before localStorage hydration completes. Use `onRehydrateStorage` callback to set flag.


### scanStore
**File**: `frontend/src/store/scanStore.ts` | **Updated**: 2026-01-09


### accessStore
**File**: `frontend/src/store/accessStore.ts` | **Updated**: 2026-01-09


### discoveryStore
**File**: `frontend/src/store/discoveryStore.ts` | **Updated**: 2026-01-09


### workflowStore
**File**: `frontend/src/store/workflowStore.ts` | **Updated**: 2026-01-11

| State | Type | Description |
|-------|------|-------------|
| `workflows` | `Workflow[]` | List of all workflows/flows |
| `currentWorkflowId` | `string \| null` | Currently selected workflow ID |
| `nodes` | `Node[]` | React Flow nodes for current workflow |
| `edges` | `Edge[]` | React Flow edges for current workflow |
| `selectedNodes` | `string[]` | Currently selected node IDs |
| `selectedEdges` | `string[]` | Currently selected edge IDs |

| Action | Description |
|--------|-------------|
| `setCurrentWorkflow(id)` | Switch to different workflow |
| `addNode(node)` | Add new block to canvas |
| `updateNode(id, changes)` | Update existing node |
| `addEdge(edge)` | Connect two nodes |
| `setSelectedNodes(ids)` | Update node selection |
| `setSelectedEdges(ids)` | Update edge selection |
| `saveWorkflow()` | Persist current workflow to backend |
| `loadWorkflows()` | Fetch all workflows from API |
| `updateNode(id, data)` | Update node data including execution state |

**Features:** Multi-select with Shift+click, edge selection styling, persistent storage via API.

**Execution Tracking (via WorkflowBuilder):**
| State | Type | Description |
|-------|------|-------------|
| `nodeExecutionData` | `Record<string, ExecutionData>` | Per-node execution input/output/status/count |

| Callback | Description |
|----------|-------------|
| `onNodeStatusChange(nodeId, status, result)` | Updates node.data with execution status and result |
| `clearNodeExecutionStates()` | Reset all execution display states |

