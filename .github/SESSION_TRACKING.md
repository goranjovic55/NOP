# AKIS Session Tracker

Auto-increments session counter and triggers maintenance every 10 sessions.

**State:** `.github/.session-tracker.json` (committed to git)
```json
{"current_session": 15, "last_maintenance_session": 10, "last_updated": "2026-01-04T13:56:37"}
```

## Commands

```bash
# Check current
python .github/scripts/session_tracker.py current

# Increment (auto in session_end.py)
python .github/scripts/session_tracker.py increment

# Check if maintenance due
python .github/scripts/session_tracker.py check-maintenance

# Mark maintenance complete
python .github/scripts/session_tracker.py mark-maintenance-done
```

**Session number in workflow logs:**
```markdown
**Date**: 2026-01-04 14:00
**Session**: #15
**Duration**: ~30 minutes
```

---

*Maintenance every 10 sessions keeps framework optimized. Customize interval in `session_tracker.py`.*
