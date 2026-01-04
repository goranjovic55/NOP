# AKIS Session Tracker

## Overview

The session tracker automatically counts sessions and triggers maintenance workflows every 10 sessions. This ensures the AKIS framework stays organized and optimized based on actual usage patterns.

## How It Works

1. **Session Increment**: Every time you complete a session (COMPLETE phase), the session counter increments
2. **Maintenance Check**: After incrementing, checks if maintenance is due (every 10 sessions)
3. **User Prompt**: If due, prompts user whether to run cross-session maintenance
4. **Maintenance Workflow**: If user approves, triggers `.github/prompts/akis-workflow-analyzer.md`
5. **Mark Complete**: After maintenance, marks it as done to reset the counter

## State File

**Location**: `.github/.session-tracker.json`

**Format**:
```json
{
  "current_session": 15,
  "last_maintenance_session": 10,
  "last_updated": "2026-01-04T13:56:37.680316",
  "sessions": [
    {"session_number": 1, "timestamp": "2026-01-01T10:00:00"},
    {"session_number": 2, "timestamp": "2026-01-01T14:30:00"},
    ...
  ]
}
```

**Committed to Git**: Yes - this file should be committed so session count persists across environments and team members

## Commands

### Check Current Session
```bash
python .github/scripts/session_tracker.py current
```
Output: `Session 15`

### Increment Session (used in COMPLETE phase)
```bash
python .github/scripts/session_tracker.py increment
```
Output: `Session 16`

### Check if Maintenance is Due
```bash
python .github/scripts/session_tracker.py check-maintenance
```
Output (if due):
```
Maintenance due: 10 sessions since last maintenance
Current session: 20
Last maintenance: 10
```
Exit code: 0

Output (if not due):
```
Maintenance not due: 3/10 sessions
```
Exit code: 1

### Mark Maintenance as Complete
```bash
python .github/scripts/session_tracker.py mark-maintenance-done
```
Output: `Maintenance marked complete at session 20`

### Reset Counter (use with caution)
```bash
python .github/scripts/session_tracker.py reset
```
Output: `Session tracker reset to 0`

## Integration with AKIS Workflow

### COMPLETE Phase (every session)

```bash
# 1. Increment session counter
python .github/scripts/session_tracker.py increment

# 2. Check if maintenance is due
if python .github/scripts/session_tracker.py check-maintenance; then
    echo "Maintenance is due! Would you like to run cross-session maintenance?"
    # Wait for user response
    # If user approves:
    #   - Follow .github/prompts/akis-workflow-analyzer.md
    #   - After completion: python .github/scripts/session_tracker.py mark-maintenance-done
fi

# 3. Commit all changes
```

### Workflow Log Template

Include session number in workflow logs:
```markdown
**Date**: 2026-01-04 14:00
**Session**: #15
**Duration**: ~30 minutes
```

## Maintenance Interval

**Default**: Every 10 sessions

**Why 10 sessions?**
- Not too frequent (allows patterns to emerge)
- Not too infrequent (catches issues early)
- Balances maintenance overhead with framework quality

**Customization**: Edit `MAINTENANCE_INTERVAL` in `.github/scripts/session_tracker.py`

## Example Session Flow

### Session 1-9 (Normal Sessions)
```
Session 1: COMPLETE → Increment (1/10) → No maintenance
Session 2: COMPLETE → Increment (2/10) → No maintenance
...
Session 9: COMPLETE → Increment (9/10) → No maintenance
```

### Session 10 (Maintenance Triggered)
```
Session 10: COMPLETE → Increment (10/10) → Maintenance DUE!
  ↓
  Prompt user: "Run cross-session maintenance?"
  ↓ (user approves)
  Follow akis-workflow-analyzer.md:
    - Analyze all 10 sessions
    - Identify patterns
    - Propose improvements
    - Update skills/docs/instructions
  ↓
  Mark maintenance done
  ↓
Session counter: 10, last_maintenance: 10
```

### Session 11-20 (Next Cycle)
```
Session 11: COMPLETE → Increment (1/10 since maintenance) → No maintenance
Session 12: COMPLETE → Increment (2/10 since maintenance) → No maintenance
...
Session 20: COMPLETE → Increment (10/10 since maintenance) → Maintenance DUE!
```

## Benefits

✅ **Automatic tracking**: No manual counting needed
✅ **Regular maintenance**: Framework stays optimized
✅ **Pattern detection**: Identifies trends across 10 sessions
✅ **User control**: User decides whether to run maintenance
✅ **State persistence**: Session count survives across environments
✅ **Audit trail**: Last 100 sessions recorded with timestamps

## Troubleshooting

### Session count seems wrong
```bash
# Check current state
python .github/scripts/session_tracker.py current
cat .github/.session-tracker.json

# If incorrect, reset (use with caution)
python .github/scripts/session_tracker.py reset
```

### Maintenance not triggering
```bash
# Manually check maintenance status
python .github/scripts/session_tracker.py check-maintenance

# Check last maintenance session
cat .github/.session-tracker.json | grep last_maintenance_session
```

### Want to trigger maintenance manually
Just follow `.github/prompts/akis-workflow-analyzer.md` directly - no need to wait for automatic trigger

## Related Files

- **Script**: `.github/scripts/session_tracker.py`
- **State**: `.github/.session-tracker.json`
- **Workflow Prompt**: `.github/prompts/akis-workflow-analyzer.md`
- **Instructions**: `.github/copilot-instructions.md` (COMPLETE phase)
- **Template**: `.github/templates/workflow-log.md` (includes session number)

---

*Session tracking enables automatic, periodic maintenance to keep the AKIS framework optimized based on actual usage patterns.*
