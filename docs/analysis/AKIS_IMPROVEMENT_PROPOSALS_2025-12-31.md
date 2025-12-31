# AKIS Protocol Improvement Proposals

**Date**: 2025-12-31  
**Source**: Session analysis of parallel-ping-traffic-indicators workflow

## Problem Statement

During a multi-hour session, the agent lost AKIS protocol compliance after the conversation context was summarized by the system. Key emissions were lost, phases weren't tracked, and the session closed prematurely without proper verification.

## Root Cause Analysis

1. **Context Summarization is an Implicit Interrupt**: When the system summarizes conversation history, this is effectively an interrupt that resets the agent's working memory. The current AKIS protocol doesn't address this scenario.

2. **No Recovery Mechanism**: There's no instruction for how to recover context after summarization - the agent just continued working without re-establishing AKIS context.

3. **Emissions Not Anchored to Response Start**: AKIS emissions can appear anywhere in a response, making them easy to skip.

## Proposed Changes to copilot-instructions.md

### Change 1: Response Prefix Enforcement

**Current**: "MANDATORY on every prompt/response: Before proceeding..."

**Proposed**: Add explicit first-line requirement:
```markdown
**MANDATORY RESPONSE PREFIX** (FIRST 3 lines of EVERY response):
```
[PHASE: NAME | progress=H/V] @AgentMode
[SKILLS: skill1, skill2] OR [METHOD: approach]
<empty line, then continue with content>
```

Skip prefix ONLY for: Single Q&A without any file reads or edits.
```

### Change 2: Context Recovery After Summarization

Add new section after "Session Boundaries":
```markdown
## Context Recovery (Post-Summarization)

When conversation history is summarized by the system, treat as implicit interrupt:

**MANDATORY after summarization**:
```
[RESUME: task=<from summary> | phase=<last known or INTEGRATE>]
[AKIS_LOADED] entities: <re-read project_knowledge.json>, skills: <relevant>
```

Then continue from the appropriate phase. Do NOT jump directly to code without re-establishing context.
```

### Change 3: VERIFY Gate Explicit Blocking

**Current**: "Wait for user confirmation at VERIFY phase before proceeding"

**Proposed**: Make blocking explicit:
```markdown
**VERIFY PHASE GATE** (100% MANDATORY):
```
[→VERIFY: awaiting user confirmation]
Summary: <what was done>
Questions: <if any>
```

**DO NOT PROCEED** to LEARN or COMPLETE until user responds.
This is a HARD BLOCK, not a soft suggestion.
```

### Change 4: Statelessness Reminder for Long Sessions

Add to "Session Boundaries":
```markdown
**Long Session Warning**:
Sessions >1 hour may trigger context summarization. After any summarization:
1. Re-read this file's AKIS Prompt section
2. Emit [RESUME] with task context from summary
3. Re-load project_knowledge.json
4. Continue from last known phase
```

## Implementation Priority

| Change | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Response Prefix | HIGH | Low | Prevents skipped emissions |
| Context Recovery | HIGH | Medium | Handles summarization events |
| VERIFY Gate | MEDIUM | Low | Prevents premature completion |
| Long Session Warning | LOW | Low | Awareness for edge case |

## Validation

After implementing these changes, run compliance check:
```bash
./scripts/check_workflow_compliance.sh log/workflow/
```

Should see improvement in:
- [AKIS_LOADED] presence after summarization
- [SKILLS:] or [METHOD:] on every response
- [→VERIFY] before [COMPLETE]

---

**Action**: Review and merge into `.github/copilot-instructions.md` if approved.
