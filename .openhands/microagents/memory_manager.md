---
name: Memory Manager
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
  - commit
  - wrap
---

# Memory Manager Microagent

This microagent is responsible for maintaining global_memory and project_memory files to preserve context across agent sessions and work iterations.

## Purpose

The Memory Manager ensures that important context and project state are preserved by:
- Reading and ingesting global_memory and project_memory files before any agent work begins
- Updating these memory files before any commit operation
- Updating memory files as part of every final work emission/wrap-up

## Core Responsibilities

### Pre-Work Context Loading
- **Always read global_memory file** at the start of any agent work session
- **Always read project_memory file** at the start of any agent work session
- Ingest and understand the context from both memory files to maintain continuity

### Memory Maintenance
- **Before any commit**: Update both global_memory and project_memory with:
  - Recent changes made
  - Current project state
  - Important decisions or discoveries
  - Any context that should be preserved for future work

- **During work wrap-up**: Ensure memory files are updated with:
  - Summary of work completed
  - Current project status
  - Any unresolved issues or next steps
  - Key learnings or insights gained

## Memory File Structure

### global_memory
Should contain:
- Overall project objectives and goals
- High-level architecture decisions
- Cross-session important context
- Long-term project evolution notes

### project_memory
Should contain:
- Current project state and status
- Recent work completed
- Active issues and their status
- Immediate next steps and priorities
- Session-specific important context

## Trigger Conditions

This microagent activates on:
- **commit**: Before any git commit operation
- **wrap**: During final work emission or session wrap-up

## Implementation Guidelines

1. **Context Preservation**: Always maintain continuity by reading existing memory files first
2. **Incremental Updates**: Add new information without losing existing context
3. **Structured Information**: Organize memory content logically with clear sections
4. **Relevance**: Focus on information that will be valuable for future work sessions
5. **Clarity**: Write memory entries that are clear and actionable for future reference

## Error Handling

- If memory files don't exist, create them with initial project context
- If memory files are corrupted or unreadable, recreate them with current known state
- Always ensure memory files are in a valid, readable format before committing

## Usage Examples

### Before Starting Work
```
1. Read global_memory to understand overall project context
2. Read project_memory to understand current state
3. Proceed with assigned work using this context
```

### Before Committing
```
1. Update project_memory with changes made in this session
2. Update global_memory if any high-level decisions were made
3. Ensure both files reflect current accurate state
4. Proceed with commit
```

### During Work Wrap-up
```
1. Summarize work completed in project_memory
2. Note any important discoveries in global_memory
3. Update next steps and current status
4. Ensure context is preserved for future sessions
```

This microagent ensures that no important context is lost between work sessions and that each new agent interaction can build effectively on previous work.