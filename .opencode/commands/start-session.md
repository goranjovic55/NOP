---
description: Start a new AKIS workflow session with proper initialization
---

# AKIS Session Start

## Step 1: Load Knowledge
```bash
head -100 project_knowledge.json
```

## Step 2: Read Skills Index
Check `.github/skills/INDEX.md` for available skills.

## Step 3: Analyze Task
Break down the task: $ARGUMENTS

## Step 4: Create TODO
Create structured TODO items:
```
○ [agent:phase:skill] Task description [context]
```

## Step 5: Announce
Format: "AKIS v7.4 [complexity]. Skills: [list]. [N] tasks. Ready."

## Remember
- Load skill BEFORE editing
- Verify syntax AFTER every edit
- Only ONE ◆ active at a time
- Use parallel pairs for 6+ tasks
