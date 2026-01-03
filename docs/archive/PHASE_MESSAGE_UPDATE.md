# Phase Message Enhancement

## Summary
Enhanced AKIS phase emissions to include descriptive messages that provide context about what the agent is doing during each phase.

## Problem
Previously, phase emissions only displayed the phase name (e.g., "INTEGRATE") in the live AKIS monitor, which didn't provide enough context about the actual work being performed.

## Solution
Updated the AKIS framework to:
1. **Require descriptive messages** with every phase emission
2. **Display messages in the VSCode extension** alongside the phase name
3. **Add validation warnings** when phases are emitted without messages

## Changes Made

### 1. Instructions Updated
**File**: [.github/copilot-instructions.md](.github/copilot-instructions.md)
- Added requirement for phase messages in session commands
- Updated example format to show: `[PHASE: NAME | N/7 | "descriptive message"]`
- Added phase message examples

**File**: [.github/instructions/phases.md](.github/instructions/phases.md)
- Updated emit format to include message requirement
- Added practical examples:
  - `[PHASE: CONTEXT | 1/7 | "Loading API schema knowledge"]`
  - `[PHASE: PLAN | 2/7 | "Designing database migrations"]`
  - `[PHASE: INTEGRATE | 4/7 | "Implementing JWT auth"]`

### 2. Session Tracker Enhanced
**File**: [.github/scripts/session-tracker.js](.github/scripts/session-tracker.js)
- Added validation warning when phase emitted without message
- Stores `phaseMessage` in session state
- Updates `phaseVerbose` with full context

### 3. VSCode Extension Updated
**Files**:
- [vscode-extension/src/types/index.ts](vscode-extension/src/types/index.ts)
- [vscode-extension/src/parsers/LiveSessionParser.ts](vscode-extension/src/parsers/LiveSessionParser.ts)
- [vscode-extension/src/providers/LiveSessionViewProvider.ts](vscode-extension/src/providers/LiveSessionViewProvider.ts)

**Changes**:
- Added `phaseMessage` and `phaseVerbose` to LiveSession interface
- Parser extracts phase messages from session state
- Display shows: `PHASE: descriptive message...` with tooltip on hover
- Messages truncated to 30 chars in display, full text in tooltip

## Usage

### For Agents
When emitting phases, always include a descriptive message:

```javascript
// ❌ BAD - No context
node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7"

// ✅ GOOD - Clear context
node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7" "Implementing JWT authentication"
```

### In Chat Responses
```
[PHASE: INTEGRATE | 4/7 | "Adding phase messages to AKIS framework"]
```

### Warning Output
If you forget the message, you'll see:
```
Warning: Phase 'INTEGRATE' emitted without descriptive message. Please provide context.
```

## Example Output

### Before
```
Session: fix-exploit-builder
Phase: INTEGRATE
```

### After
```
Session: fix-exploit-builder
Phase: INTEGRATE: Adding phase messages to AKIS...
(tooltip shows: Adding phase messages to AKIS framework)
```

## Benefits
1. **Better visibility** - Users can see what's happening at a glance
2. **Improved debugging** - Easier to track where agents are in complex workflows
3. **Documentation** - Session logs now self-document the work performed
4. **Accountability** - Forces agents to be explicit about their current task

## Testing
```bash
# Test phase emission with message
node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7" "Testing phase messages"

# Check session state
cat .akis-session.json | jq '.phaseMessage, .phaseVerbose'

# Output:
# "Testing phase messages"
# "_DevTeam INTEGRATE - Testing phase messages | progress=4/7"
```

## Compatibility
- ✅ Backward compatible - old sessions without messages still work
- ✅ Extension rebuilt and reinstalled
- ✅ All existing functionality preserved
