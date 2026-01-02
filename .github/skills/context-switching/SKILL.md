---
name: context-switching
description: Handling user interrupts and task switching with state preservation. Use when managing multiple concurrent tasks.
---

# Context Switching

## When to Use
- User interrupts current task
- Handling multiple concurrent requests
- Managing task priorities
- Preserving work state

## Pattern
[PAUSE] → Handle Interrupt → [RESUME]

## Checklist
- [ ] Emit [PAUSE: task=<current> | phase=<phase>]
- [ ] Handle interruption
- [ ] Emit [RESUME: task=<original> | phase=<phase>]
- [ ] Continue from saved state

## Example Flow
```markdown
# Main task in progress
[PHASE: INTEGRATE | progress=4/0]
Working on feature implementation...

# User interrupts with urgent bug fix
[PAUSE: task=feature-implementation | phase=INTEGRATE]
[STACK: push | task=bug-fix | depth=1 | parent=feature-implementation]

# Work on interrupt
[SESSION: Fix critical auth bug] @Developer
[PHASE: CONTEXT | progress=1/1]
[PHASE: INTEGRATE | progress=4/1]
[PHASE: COMPLETE | progress=7/1]

# Return to original task
[STACK: pop | task=bug-fix | depth=0 | result=auth-fixed]
[RESUME: task=feature-implementation | phase=INTEGRATE]

# Continue original work
[PHASE: INTEGRATE | progress=4/0]
Continuing feature implementation...
```

## Stack Depth
```
progress=4/0  → Main thread, phase 4, no stack
progress=1/1  → Interrupted at depth 1, phase 1 of nested task
progress=3/2  → Interrupted at depth 2, phase 3 of nested-nested task
```

**Max depth**: 3 levels

## State Preservation
```python
class TaskContext:
    def __init__(self, task_name: str, phase: str):
        self.task_name = task_name
        self.phase = phase
        self.data = {}
        self.timestamp = datetime.now()
    
    def pause(self) -> dict:
        """Save current state."""
        return {
            "task": self.task_name,
            "phase": self.phase,
            "data": self.data,
            "paused_at": self.timestamp
        }
    
    def resume(self, saved_state: dict):
        """Restore saved state."""
        self.task_name = saved_state["task"]
        self.phase = saved_state["phase"]
        self.data = saved_state["data"]
```
