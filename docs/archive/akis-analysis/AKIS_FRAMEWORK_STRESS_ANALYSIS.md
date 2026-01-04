# AKIS Framework Stress Analysis & Optimization Plan

**Date:** January 2, 2026
**Status:** Analysis Complete
**Scope:** Concurrency, Depth, Performance, Context Switching

## 1. Stress Test Results

We executed a stress test suite (`scripts/akis-stress-test.js`) against the current AKIS session tracker.

| Test Case | Scenario | Result | Impact |
|-----------|----------|--------|--------|
| **Concurrency** | 20 parallel session updates | ❌ **FAILED** | Race conditions detected. Updates from parallel agents (or rapid CLI calls) are lost due to lack of file locking. |
| **Max Depth** | 4 nested sessions | ❌ **FAILED** | Framework warned but allowed 4th session (Depth 3). Hard limit of 3 not enforced strictly. |
| **Data Bloat** | 5MB Context Object | ⚠️ **WARNING** | Write times spiked to ~80ms. Linear degradation. Large context objects will slow down every CLI interaction. |
| **Context Switch** | Rapid switching | ⚠️ **RISK** | No specific failure, but "Context Restoration" is currently manual/terse. |

### Detailed Findings

#### A. Race Condition (Critical)
The `session-tracker.js` uses a simple `read -> modify -> write` pattern.
```javascript
const session = JSON.parse(fs.readFileSync(path)); // Read
// ... modify ...
fs.writeFileSync(path, JSON.stringify(session));   // Write
```
**Failure Mode:** If two agents (or terminal processes) call the tracker within milliseconds, Process B reads the file *before* Process A writes its changes. Process A's changes are overwritten by Process B.
**Evidence:** Test confirmed "Process A update lost".

#### B. Session Depth Overflow (High)
The logic checked `activeSessions.length >= 3` but only emitted a `console.warn`.
**Failure Mode:** Infinite recursion is possible if agents keep spawning sub-agents.
**Evidence:** Test created Depth 0, 1, 2, and 3 (4 total).

#### C. Performance / Bloat (Medium)
The entire session state is monolithic.
**Failure Mode:** As `context` grows (e.g., large file dumps), every `emit` or `phase` update rewrites the entire JSON file.
**Evidence:** 5MB file took ~80ms to write. In a tight loop, this adds perceptible latency.

---

## 2. Proposed Solutions

### Fix 1: Atomic File Locking (Concurrency)
**Strategy:** Implement a directory-based lock (`mkdir` is atomic on POSIX/Windows) around all write operations.
**Implementation:**
- Wrap `start`, `update`, `emit` in a `_transaction()` method.
- Retry logic: If locked, wait 20ms and retry (up to 1s).
- **Status:** *Partially applied in previous step (needs verification).*

### Fix 2: Hard Depth Limit (Stability)
**Strategy:** Convert the warning to a hard Error.
**Implementation:**
- If `depth >= 3`, throw `AKIS_MAX_DEPTH_EXCEEDED`.
- Prevent new session creation until parent completes.

### Fix 3: Context Segmentation (Performance)
**Strategy:** Don't store massive blobs in the main session file.
**Implementation:**
- Store large context (file contents, diffs) in separate files: `.akis/context/{sessionId}.json`.
- Keep `.akis-session.json` lightweight (metadata only).
- **Trade-off:** Increases complexity of "Restore".

### Fix 4: Automated Context Restoration
**Strategy:** Make `resume` smarter.
**Implementation:**
- When resuming, automatically read the segmented context files.
- Re-populate the agent's working memory (variables).

---

## 3. Recommended Action Plan

1.  **Verify Locking:** Confirm the `_transaction` wrapper (applied in last step) fixes the race condition test.
2.  **Enforce Depth:** Change the warning to a `throw Error` in `start()`.
3.  **Optimize Storage:** (Optional for now) Move large context data to separate files if performance degrades further.

**Decision Needed:**
Shall we proceed with **Enforcing Depth** and **Verifying Locking**?
