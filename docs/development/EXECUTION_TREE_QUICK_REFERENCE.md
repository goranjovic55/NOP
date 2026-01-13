# Quick Reference: Workflow Execution Tree

## 📋 Components Overview

### WorkflowExecutionTree
**Location:** `frontend/src/components/workflow/WorkflowExecutionTree.tsx`

```tsx
<WorkflowExecutionTree execution={execution} />
```

**Props:**
- `execution: WorkflowExecution` - The workflow execution object

**Features:**
- Renders hierarchical tree of workflow blocks
- Color-coded status indicators
- Collapsible/expandable nodes
- Shows output from data blocks

### ExecutionOverlay
**Location:** `frontend/src/components/workflow/ExecutionOverlay.tsx`

Updated to include collapsible execution tree section.

**New Props:**
- `execution: WorkflowExecution | null`

**New Features:**
- "Execution Tree" expandable section
- Smooth integration with existing overlay

## 🎯 Template Quick Reference

### Available UI Testing Templates

#### 1. UI Testing - Login Form Validation
**Use Case:** Test form validation and submission

**Blocks:**
- Setup section: Initialize test and navigate
- Interaction section: Fill form and submit
- Verification section: Assert success

#### 2. UI Testing - Button Click Chain
**Use Case:** Test sequential button interactions

**Blocks:**
- Setup section: Initialize elements
- Interaction section: Click buttons in sequence
- Verification section: Assert state changes

#### 3. UI Testing - Form Input Validation
**Use Case:** Test real-time input validation

**Blocks:**
- Setup section: Initialize form
- Interaction section: Type invalid/valid inputs
- Verification section: Assert error messages

#### 4. UI Testing - Navigation Flow
**Use Case:** Test page navigation

**Blocks:**
- Setup section: Initialize navigation
- Interaction section: Navigate between pages
- Verification section: Assert URL and content

## 🔧 Data Block Pattern

### Basic Pass/Fail Pattern
```json
{
  "type": "data",
  "id": "assertion",
  "data": {
    "_pass": "${previousBlock.success === true}",
    "message": "Assertion passed"
  }
}
```

### With Output Capture
```json
{
  "type": "data",
  "id": "verify-result",
  "data": {
    "_pass": "${result.code === 200}",
    "status_code": "${result.code}",
    "response": "${result.body}",
    "timestamp": "${new Date().toISOString()}"
  }
}
```

### Complex Conditions
```json
{
  "type": "data",
  "id": "complex-check",
  "data": {
    "_pass": "${result.items.length > 0 && result.items[0].valid === true}",
    "item_count": "${result.items.length}",
    "first_item_valid": "${result.items[0].valid}"
  }
}
```

## 🎨 Status Colors

```
✓ Passed  → Green    (#10b981)
✗ Failed  → Red      (#ef4444)
⊙ Running → Yellow   (#fbbf24)
○ Pending → Gray     (#9ca3af)
```

## ⚡ Quick Actions

### Expand/Collapse Block
- **Click** the block row to toggle visibility
- **Keyboard:** Arrow keys for navigation
- **Mouse:** Hover shows subtle highlight

### View Block Output
- Expand the block to see data
- Output displayed in monospace font
- Truncated at 200 chars (click for full)

### Monitor Execution
1. Click "RUN" to start workflow
2. Watch progress bar fill
3. Click "Execution Tree" to expand
4. Watch status colors update in real-time
5. Click completed blocks to inspect results

## 📊 Tree Structure

```
Root Workflow
├─ Block Level 1
│  ├─ Block Level 2
│  │  └─ Data Block (assertion)
│  └─ Block Level 2
└─ Block Level 1
   └─ Data Block (output)
```

## 🚀 Usage Steps

### 1. Load Template
- Open Workflow Editor
- Select "UI Testing - [Name]" from templates
- Template loads with pre-configured blocks

### 2. Execute
- Click "RUN" button
- Execution overlay appears
- Progress bar updates in real-time

### 3. Inspect Results
- Click "Execution Tree" to expand
- Blocks colored by status
- Hover for execution time

### 4. Deep Dive
- Click block to expand children
- View output data from assertions
- Check error messages if failed

## 🔍 Troubleshooting

### Tree Not Showing
- **Solution:** Check if `execution` prop is null
- **Check:** Ensure workflow completed or is running

### All Blocks Showing Gray
- **Cause:** Workflow still executing
- **Solution:** Wait for execution to complete

### Data Not Visible
- **Cause:** Data block output is empty
- **Solution:** Ensure `_pass` and other fields are defined

### Performance Issues
- **Cause:** Too many nodes (500+)
- **Solution:** Collapse parent blocks to hide children

## 📝 Writing Custom Assertions

### Simple Equality
```json
"_pass": "${value === 'expected'}"
```

### Boolean Check
```json
"_pass": "${isTrue && otherCondition}"
```

### Array Length
```json
"_pass": "${items.length > 0}"
```

### Object Property
```json
"_pass": "${object.property.nested === 'value'}"
```

### Multiple Conditions
```json
"_pass": "${cond1 && (cond2 || cond3)}"
```

## 🐛 Debug Tips

1. **View Raw Output**
   - Right-click on block output
   - Select "Inspect Element"

2. **Check Pass Condition**
   - Look at `_pass` field in data block
   - Verify condition syntax

3. **Trace Execution Flow**
   - Follow blocks top to bottom
   - Check each block's status

4. **Monitor Variables**
   - Expand all data blocks
   - Review output values at each step

## 📚 Related Documentation

- [Execution Tree Integration](./EXECUTION_TREE_INTEGRATION.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Workflow Architecture](./WORKFLOW_ARCHITECTURE.md)
- [FlowBuilder Templates](./FLOWBUILDER_TEMPLATES.md)

## 🎓 Learning Resources

### Video Tutorials
- Execution Tree Overview (2 min)
- Creating Custom Templates (5 min)
- Debugging Failed Blocks (3 min)

### Code Examples
- See `FlowTemplates.tsx` for template examples
- See `WorkflowExecutionTree.tsx` for component usage

### Interactive Demo
- Load "UI Testing - Login Form Validation"
- Click "RUN" to see execution tree in action
- Expand blocks to inspect data and assertions

---

**Last Updated:** January 2025  
**Version:** 1.0
