# AKIS Skills Integration Update

**Date**: 2025-12-31  
**Status**: ✅ COMPLETE

## Changes Made

### 1. Renamed "AKIS Init" → "AKIS Prompt"
**Reason**: Triggers at each prompt/response, not just initialization

### 2. Added "HOW" Component
**AKIS Prompt now requires**:
- **WHAT**: [PHASE: NAME | progress=H/V]
- **WHO**: [@AgentMode] OR [DELEGATE: agent=Name]
- **HOW**: [SKILLS: skill-name, skill-name] OR [METHOD: approach]

### 3. Skills Listed at Session Start
**Before**:
```
[AKIS_LOADED] entities, patterns, skills
```

**After**:
```
[AKIS_LOADED] 
  entities: N entities from project_knowledge.json
  skills: skill-name, skill-name, skill-name (relevant to task)
  patterns: pattern1, pattern2
```

### 4. Skills Tracked Throughout Workflow

**Phase 1 - CONTEXT**:
- Query relevant skills from `.github/skills/`
- Emit [AKIS_LOADED] with skill names

**Phase 2 - PLAN**:
- Identify which skills to use for the task

**Phase 3 - COORDINATE**:
- Emit [SKILLS: skill-name, skill-name] or [METHOD: approach]

**Phase 4 - INTEGRATE**:
- Follow skill patterns during implementation

**Phase 6 - LEARN**:
- Suggest new skills if patterns discovered

**Phase 7 - COMPLETE**:
- Emit [SKILLS_USED] listing all skills applied
- Update [AKIS_UPDATED] with skill names

## Example Workflow

```
[SESSION: Add error handling to API endpoint] @Developer
[CONTEXT] Add proper error handling to /api/scans endpoint
[AKIS_LOADED]
  entities: 3 entities (Scan, User, Host)
  skills: error-handling, fastapi-endpoint, security
  patterns: HTTP error codes, exception handling

[PHASE: CONTEXT | progress=1/0]
[PHASE: PLAN | progress=2/0]
  → Will use error-handling and fastapi-endpoint skills

[PHASE: COORDINATE | progress=3/0]
[SKILLS: error-handling, fastapi-endpoint]

[PHASE: INTEGRATE | progress=4/0]
  → Following error-handling checklist:
    ✓ Custom exception classes
    ✓ Consistent JSON format
    ✓ Proper HTTP codes
    ✓ Context logging

[PHASE: VERIFY | progress=5/0]
[→VERIFY: awaiting user confirmation]

[PHASE: COMPLETE | progress=7/0]
[COMPLETE: task=add-error-handling | result=complete]
[SKILLS_USED] error-handling, fastapi-endpoint
[AKIS_UPDATED] knowledge: added=0/updated=1 | skills: used=error-handling,fastapi-endpoint
```

## Files Updated

1. [.github/copilot-instructions.md](.github/copilot-instructions.md)
   - Renamed "AKIS Init" → "AKIS Prompt"
   - Added HOW component
   - Updated session boundary format
   - Added skills tracking to phase checklist
   - Updated completion format

2. [.github/instructions/phases.md](.github/instructions/phases.md)
   - Updated phase checklist with skill actions

## Benefits

1. **Visibility**: Clear tracking of which skills are being used
2. **Accountability**: Each phase shows HOW work is being done
3. **Learning**: Skill usage patterns inform future optimizations
4. **Progressive Disclosure**: Only loads relevant skills for each task
5. **Quality**: Following skill checklists ensures consistency

## Integration with Agent Skills

Works seamlessly with VS Code Insiders Agent Skills:
- **Level 1**: Copilot scans skill descriptions in YAML frontmatter
- **Level 2**: Loads SKILL.md body if relevant
- **Level 3**: Accesses skill resources if needed

AKIS framework now explicitly tracks which skills were activated by Copilot.

---

**Related**: See [.github/skills/README.md](.github/skills/README.md) for skill documentation
