# AKIS Improvements (Implemented + Proposed)

## ✅ IMPLEMENTED

### 1. Hard Depth Limit ✅
**Issue**: Stress tests reached depth 26+ without limits
**Fix**: Configurable max depth via `AKIS_MAX_DEPTH` env var

```bash
# Set max depth (default: 10)
export AKIS_MAX_DEPTH=5
node .github/scripts/session-tracker.js start "task" "Agent"
# Error: "Max session depth 5 exceeded. Complete parent sessions first."
```

**Location**: `session-tracker.js:59-76`

### 2. Validation on Load ✅  
**Issue**: Corruption not detected until access
**Fix**: Automatic validation + recovery from backup

```javascript
// Now in getAllSessions()
try {
    const data = JSON.parse(...)
    if (!data || !Array.isArray(data.sessions)) {
        throw new Error('Invalid session file structure');
    }
} catch (error) {
    // Auto-recover from .backup file
    return this.recoverFromBackup();
}
```

**Location**: `session-tracker.js:28-67`

### 3. Stale Session Cleanup ✅
**Issue**: Sessions >1hr old remain active  
**Fix**: Archive stale sessions via CLI

```bash
# Archive sessions older than 2 hours
node .github/scripts/session-tracker.js archive-stale 2
# Output: "Archived 3 stale session(s) older than 2h"
```

**Location**: `session-tracker.js:1234-1260`

### 4. Health Check API ✅
**Issue**: No programmatic validation
**Fix**: Comprehensive health check

```bash
node .github/scripts/session-tracker.js health
# Returns: { healthy, sessionCount, activeCount, issues, stale }
```

**Checks**:
- Orphaned sessions (parent missing)
- Depth consistency (parent.depth + 1)
- Stale active sessions (>1hr)

**Location**: `session-tracker.js:1262-1309`

---

## 📋 PROPOSED (Not Yet Implemented)

### 5. Action Compression
**Issue**: Stress tests reached depth 26+ without limits
**Fix**: Add configurable max depth (default: 10)

```javascript
// In session-tracker.js start()
const MAX_DEPTH = parseInt(process.env.AKIS_MAX_DEPTH || '10');
if (depth >= MAX_DEPTH) {
    throw new Error(`Max session depth ${MAX_DEPTH} exceeded. Complete parent sessions first.`);
}
```

## 2. Stale Session Cleanup
**Issue**: Sessions >1hr old remain active
**Fix**: Auto-archive stale sessions

```javascript
// Add to session-tracker.js
archiveStale(hoursOld = 1) {
    const cutoff = Date.now() - (hoursOld * 3600000);
    const allSessions = this.getAllSessions();
    allSessions.sessions.forEach(s => {
        if (s.status === 'active' && new Date(s.lastUpdate) < cutoff) {
            s.status = 'stale';
            s.archivedAt = new Date().toISOString();
        }
    });
    this.saveAllSessions(allSessions);
}
```

## 3. Parent Resume Clarification
**Issue**: Stack-based behavior not obvious
**Fix**: Add explicit resume mode

```javascript
// session-tracker.js start()
start(sessionData, options = {}) {
    const parentMode = options.parentMode || 'stack'; // 'stack' | 'current'
    
    if (parentMode === 'current') {
        // Use currentSessionId as parent
        parentSessionId = allSessions.currentSessionId;
    } else {
        // Use last active (stack mode - default)
        parentSessionId = activeSessions[activeSessions.length - 1]?.id;
    }
}
```

## 4. Action Compression
**Issue**: 500 action limit can truncate early history
**Fix**: Compress old actions to summaries

```javascript
// After action rotation
if (session.actions.length > MAX_ACTIONS * 0.8) {
    const toCompress = session.actions.slice(0, 100);
    session.actionSummary = {
        count: toCompress.length,
        phases: [...new Set(toCompress.map(a => a.phase))],
        types: toCompress.reduce((acc, a) => {
            acc[a.type] = (acc[a.type] || 0) + 1;
            return acc;
        }, {})
    };
    session.actions = session.actions.slice(100);
}
```

## 5. Validation on Load
**Issue**: Corruption not detected until access
**Fix**: Add schema validation

```javascript
const Ajv = require('ajv');
const schema = {
    type: 'object',
    required: ['sessions', 'currentSessionId'],
    properties: {
        sessions: { type: 'array' },
        currentSessionId: { type: ['string', 'null'] }
    }
};

getAllSessions() {
    const data = JSON.parse(fs.readFileSync(this.multiSessionPath, 'utf-8'));
    const ajv = new Ajv();
    if (!ajv.validate(schema, data)) {
        console.warn('Corrupted session file, restoring from backup');
        return this.recoverFromBackup();
    }
    return data;
}
```

## 6. Resume by Name/Pattern
**Issue**: Must use session ID
**Fix**: Add fuzzy matching

```javascript
resume(identifier) {
    const sessions = this.getAllSessions().sessions;
    
    // Try exact ID first
    let session = sessions.find(s => s.id === identifier);
    
    // Fallback: match task name
    if (!session) {
        session = sessions.find(s => 
            s.task.toLowerCase().includes(identifier.toLowerCase())
        );
    }
    
    if (!session) {
        throw new Error(`No session matching "${identifier}"`);
    }
    // ... resume logic
}
```

## 7. Session Metrics
**Issue**: No performance insights
**Fix**: Add timing metrics

```javascript
// In session object
metrics: {
    startTime: timestamp,
    endTime: null,
    durationMs: 0,
    actionCount: 0,
    phaseTimings: {
        CONTEXT: { start, end, duration },
        PLAN: { start, end, duration },
        // ...
    },
    avgActionInterval: 0
}
```

## 8. Incremental Export
**Issue**: Large exports can timeout
**Fix**: Stream-based export

```javascript
exportToWorkflowLog(outputPath) {
    const stream = fs.createWriteStream(outputPath);
    const sessions = this.getAllSessions().sessions;
    
    stream.write('# AKIS Workflow Log\n\n');
    
    for (const session of sessions) {
        stream.write(`## ${session.task}\n\n`);
        // Write incrementally
        for (const action of session.actions) {
            stream.write(`- ${action.title}: ${action.description}\n`);
        }
    }
    
    stream.end();
}
```

## 9. Interrupt Budgets
**Issue**: Unlimited interrupt depth
**Fix**: Per-session interrupt quota

```javascript
// In session object
interruptBudget: 3,  // Max child sessions allowed

start(sessionData) {
    if (parentSession && parentSession.interruptBudget <= 0) {
        throw new Error('Parent session interrupt budget exceeded');
    }
    
    session.interruptBudget = 3;
    if (parentSession) {
        parentSession.interruptBudget--;
    }
}
```

## 10. Health Check API
**Issue**: No programmatic validation
**Fix**: Add health endpoint

```javascript
healthCheck() {
    const sessions = this.getAllSessions().sessions;
    const issues = [];
    
    // Check parent references
    sessions.forEach(s => {
        if (s.parentSessionId && !sessions.find(p => p.id === s.parentSessionId)) {
            issues.push({ session: s.id, issue: 'orphaned' });
        }
    });
    
    // Check depth consistency
    sessions.forEach(s => {
        const parent = sessions.find(p => p.id === s.parentSessionId);
        if (parent && s.depth !== parent.depth + 1) {
            issues.push({ session: s.id, issue: 'depth_mismatch' });
        }
    });
    
    return {
        healthy: issues.length === 0,
        sessionCount: sessions.length,
        activeCount: sessions.filter(s => s.status === 'active').length,
        issues
    };
}
```

## Priority Order

1. **Hard Depth Limit** (prevents runaway nesting)
2. **Validation on Load** (prevents corruption issues)
3. **Stale Session Cleanup** (prevents memory bloat)
4. **Action Compression** (preserves early history)
5. **Health Check API** (enables monitoring)

## Implementation Notes

- All changes backward compatible
- Add env vars for configuration
- Default values maintain current behavior
- Validation is opt-in via flag
