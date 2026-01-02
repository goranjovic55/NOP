# Workflow Logs

This directory contains session workflow logs from agent activities.

## Naming Convention

Logs are named with the pattern: `YYYY-MM-DD_HHMMSS_task-description.md`

Example: `2025-12-28_143022_implement-exploit-page-filters.md`

## Purpose

- **Session History**: Track what was done in each development session
- **Agent Context**: Future agents can review past decisions and implementations
- **Debugging**: Understand the evolution of features and fixes
- **Documentation**: Automatic documentation of development process

## Structure

Each log contains:
- **Task**: What was being accomplished
- **Agent Interactions**: Which agents were involved and what they did
- **Files Modified**: Complete list of changed files
- **Quality Gates**: Verification steps completed
- **Learnings**: Knowledge captured in project_knowledge.json

## Usage

Agents should:
1. Create a new log file at session start with timestamp and task name
2. Write workflow log at session completion
3. Reference previous logs when working on related features
4. Update logs if additional context is discovered

## Retention

- Keep all logs for project history
- Logs are .gitignore'd by default (stored locally only)
- Consider committing significant milestone logs to repository
