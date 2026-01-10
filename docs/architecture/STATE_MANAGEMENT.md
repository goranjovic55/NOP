# State Management

**Category**: architecture | **Auto-generated**: yes

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

