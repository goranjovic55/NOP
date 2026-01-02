# AKIS Monitor Extension - UI Verification Guide

## 🔄 Step 1: Reload VS Code

**Option A - Command Palette:**
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Reload Window"
3. Press Enter

**Option B - Developer Command:**
Run: `Ctrl+R` or execute: `workbench.action.reloadWindow`

---

## 👁️ Step 2: Visual Checks

### Check 1: Activity Bar Icon
**Location**: Left sidebar (Activity Bar)

**What to look for**:
- [ ] AKIS Monitor icon visible (should be at bottom of activity bar)
- [ ] Icon shows hexagonal frame with glowing "A" 
- [ ] Icon has cyan/teal color scheme
- [ ] NOT just a plain circle or missing

**If missing**: 
- Check Extensions view (`Ctrl+Shift+X`)
- Verify "AKIS Monitor" is enabled
- Try reloading window again

---

### Check 2: Open AKIS Monitor Panel
**Action**: Click the AKIS icon in Activity Bar

**Expected result**:
- [ ] Panel opens on the left side
- [ ] Shows "AKIS Monitor" title
- [ ] Three sections visible:
  - Live Session
  - Historical Diagram  
  - Knowledge Graph

---

### Check 3: Live Session View

**Click**: "Live Session" section

**Should display**:
- [ ] Current session info card
- [ ] Session ID: `rebuild-test-extension`
- [ ] Agent: `_DevTeam`
- [ ] Phase: `CONTEXT 1/0`
- [ ] Status badge (green/active)
- [ ] Timeline with session start action
- [ ] Auto-refreshes every 2 seconds

**Visual elements**:
- Cyan/dark cyberpunk theme
- Bordered cards
- Glowing status badges
- Timeline with events

---

### Check 4: Historical Diagram View

**Click**: "Historical Diagram" section

**Should display**:
- [ ] Dropdown to select workflow file
- [ ] Mermaid diagram rendering
- [ ] Shows session flow with nodes and arrows
- [ ] Includes:
  - Session starts
  - Phase transitions
  - Decisions (if any)
  - Delegations (if any)

**Try**:
- [ ] Select different workflow from dropdown
- [ ] Diagram updates
- [ ] Click refresh button (↻ icon)

---

### Check 5: Knowledge Graph View

**Click**: "Knowledge Graph" section

**Should display**:
- [ ] Interactive force-directed graph
- [ ] Network of nodes (286 entities)
- [ ] Nodes represent:
  - System entities (larger nodes)
  - Services
  - Components
- [ ] Lines connecting related nodes
- [ ] Cyan/teal color scheme

**Interaction tests**:
- [ ] **Zoom**: Mouse wheel or pinch
- [ ] **Pan**: Click and drag background
- [ ] **Nodes move**: Physics simulation
- [ ] **Click node**: Highlights connections
- [ ] Auto-layout with force simulation

---

## 🧪 Step 3: Functionality Tests

### Test Refresh Buttons
Each view has a refresh button (↻) in the title bar

**Test**:
1. Click refresh on Live Session → Shows "refreshed" message
2. Click refresh on Historical Diagram → Reloads diagram
3. Click refresh on Knowledge Graph → Reloads graph

### Test Auto-Refresh
**Live Session auto-refreshes every 2 seconds**

**Test**:
1. Keep Live Session view open
2. In terminal, create a new session action:
   ```bash
   node .github/scripts/session-tracker.js phase "TEST" "2/7"
   ```
3. Watch Live Session view - should update within 2 seconds
4. New phase should appear in timeline

### Test File Watching
**Extension monitors files and auto-refreshes**

**Test Knowledge Graph**:
1. Open Knowledge Graph view
2. Add entry to `project_knowledge.json`:
   ```bash
   echo '{"type":"entity","name":"Test.Entity","entityType":"test","observations":["test"]}' >> project_knowledge.json
   ```
3. Graph should reload automatically

---

## ✅ Success Criteria

All checks should pass:
- ✅ Icon visible and looks good (hexagon with "A")
- ✅ Three views accessible
- ✅ Live Session shows real-time data
- ✅ Historical Diagram renders Mermaid charts
- ✅ Knowledge Graph interactive and zoomable
- ✅ Refresh buttons functional
- ✅ Auto-refresh working (2s interval)
- ✅ File watchers trigger updates

---

## 🐛 Troubleshooting

### Icon not showing
- Reload window: `Ctrl+Shift+P` → "Reload Window"
- Check extension is enabled in Extensions view
- Verify file exists: `vscode-extension/resources/akis-icon-128.png`

### Views not loading
- Open Developer Tools: `Help` → `Toggle Developer Tools`
- Check Console tab for errors
- Look for webview-related errors

### Data not appearing
- Verify files exist:
  - `.akis-session.json`
  - `project_knowledge.json`
  - `log/workflow/*.md`
- Check file permissions
- Try manual refresh

### Auto-refresh not working
- Check settings: `Ctrl+,` → search "AKIS"
- Verify `akisMonitor.autoRefresh` is `true`
- Check `akisMonitor.refreshInterval` (default: 2000ms)

---

## 📊 Quick Test Script

```bash
# Run this to generate test data
cd /workspaces/NOP

# Create test session activity
node .github/scripts/session-tracker.js phase "PLAN" "2/7"
sleep 2
node .github/scripts/session-tracker.js decision "Test decision to verify diagram rendering"
sleep 2
node .github/scripts/session-tracker.js phase "INTEGRATE" "4/7"

# Watch Live Session view - should update in real-time!
```

