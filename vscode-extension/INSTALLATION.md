# AKIS Monitor Extension - Installation Guide

## Quick Start

### 1. Build the Extension

```bash
cd vscode-extension
npm install
npm run compile
npm run package
```

This will create a `.vsix` file (e.g., `akis-monitor-0.1.0.vsix`)

### 2. Install in VSCode

**Method A: Via VSCode UI**
1. Open Visual Studio Code
2. Go to Extensions view (Ctrl+Shift+X or Cmd+Shift+X)
3. Click the "..." menu at the top-right
4. Select "Install from VSIX..."
5. Navigate to `vscode-extension/` and select the `.vsix` file

**Method B: Via Command Line**
```bash
code --install-extension akis-monitor-0.1.0.vsix
```

### 3. Open Your Workspace

Open the NOP repository folder in VSCode:
```bash
code /path/to/NOP
```

### 4. Activate AKIS Monitor

1. Look for the AKIS icon (hexagon with network nodes) in the Activity Bar (left sidebar)
2. Click it to open the AKIS Monitor panel
3. You'll see three views:
   - **Workflow Tree** - All workflow logs
   - **Decision Diagram** - Mermaid flowcharts
   - **Knowledge Graph** - D3.js interactive graph

## Features Demo

### Workflow Tree
- Shows all workflow logs from `log/workflow/`
- Color-coded by status (completed, in-progress)
- Click refresh to update
- Auto-updates when new logs are created

### Decision Diagram
- Generates Mermaid diagrams from workflow decisions
- Shows delegation flows
- Lists recent decisions with context

### Knowledge Graph
- Interactive D3.js force-directed graph
- Nodes represent entities from `project_knowledge.json`
- Edges show relationships
- Drag nodes to explore
- Statistics panel shows entity counts by type
- "Open Memviz" button for Anthropic memory visualization

## Configuration

Press Ctrl+, (Cmd+, on Mac) and search "AKIS Monitor":

```json
{
  "akisMonitor.workflowLogsPath": "log/workflow",
  "akisMonitor.knowledgeFilePath": "project_knowledge.json",
  "akisMonitor.autoRefresh": true,
  "akisMonitor.refreshInterval": 2000
}
```

## Troubleshooting

### Extension not appearing
- Restart VSCode after installation
- Check Extensions view to ensure it's enabled
- Look for errors in Developer: Show Logs → Extension Host

### No data showing
- Ensure you've opened the NOP workspace folder
- Verify `log/workflow/` and `project_knowledge.json` exist
- Check paths in settings match your structure

### Compilation errors
```bash
cd vscode-extension
rm -rf node_modules out
npm install
npm run compile
```

## Development Mode

To develop/debug the extension:

1. Open `vscode-extension/` folder in VSCode
2. Press F5 to launch Extension Development Host
3. A new VSCode window opens with the extension loaded
4. Make changes to TypeScript files
5. Press Ctrl+R in the Extension Development Host to reload

## File Watchers

The extension automatically watches:
- `log/workflow/*.md` - Workflow logs
- `project_knowledge.json` - Knowledge entities

Changes trigger auto-refresh (configurable delay: 2000ms default)

## Keyboard Shortcuts

You can assign custom shortcuts to:
- `akis-monitor.refreshWorkflow`
- `akis-monitor.refreshDecisions`
- `akis-monitor.refreshKnowledge`

File → Preferences → Keyboard Shortcuts → Search "AKIS"

## Integration Tips

### With GitHub Copilot
The extension visualizes AKIS workflows that GitHub Copilot agents create. Work alongside the extension to see your agent's decision tree in real-time.

### With Memviz
1. Export knowledge data from the Knowledge Graph view
2. Visit https://memviz.anthropic.com/
3. Upload your data for advanced memory visualization

### With CI/CD
Workflow logs are created during CI runs. Monitor builds by watching the Workflow Tree view.

## Updating the Extension

When a new version is released:

```bash
cd vscode-extension
git pull
npm install
npm run compile
npm run package
code --install-extension akis-monitor-X.Y.Z.vsix
```

Restart VSCode to complete the update.

## Uninstalling

1. Go to Extensions view
2. Find "AKIS Monitor"
3. Click the gear icon → Uninstall
4. Restart VSCode

## Support

For issues, feature requests, or contributions:
- Open an issue in the NOP repository
- Follow AKIS framework guidelines for contributions
- Check workflow logs for debugging agent behavior
