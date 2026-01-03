# Quick Start Guide - AKIS Knowledge Graph Extension

## Installation

The AKIS Monitor extension is already configured in your workspace!

## How to Use

### 1. Launch the Extension

Press **F5** in VS Code to open a new Extension Development Host window with the extension loaded.

### 2. Open the Knowledge Graph View

In the Extension Development Host window:
1. Look for the AKIS icon in the Activity Bar (left sidebar)
2. Click on it to open the AKIS Monitor panel
3. Click on "Knowledge Graph" to see your knowledge graph visualization

### 3. Interact with the Graph

**Zoom & Pan:**
- Click "Zoom In" / "Zoom Out" buttons
- Or use mouse wheel to zoom
- Click and drag the background to pan

**Select Entities:**
- Click on any node (colored circle) to select it
- The side panel will show detailed information
- Relations to other entities are listed

**Search:**
- Type in the search box to find specific entities
- The graph will center on the found entity

**Physics Simulation:**
- Toggle "Physics: ON/OFF" to enable/disable force simulation
- When ON: nodes automatically organize themselves
- When OFF: nodes stay in place (better for precise viewing)

### 4. Understanding the Colors

Each entity type has a unique color:
- 🔵 **Blue** - Services (FastAPI, GuacamoleService, etc.)
- 🟢 **Green** - Features (VaultFeature, PacketCrafting, etc.)
- 🟠 **Orange** - Modules (Security, Core components)
- 🔴 **Pink** - Tools (AKIS Monitor, CLI tools)
- 🟣 **Purple** - Systems (Architecture, top-level)
- ⚪ **Gray** - Other/Unknown types

### 5. View Entity Details

When you click on a node, the right panel shows:
- **Entity Name** - Full hierarchical name
- **Type** - Entity classification
- **Observations** - All recorded information about this entity
- **Relations** - Connections to other entities (→ outgoing, ← incoming)

## Troubleshooting

### Extension doesn't load
- Make sure you're in the `/workspaces/NOP` workspace
- Run `cd vscode-extension && npm run compile` to rebuild
- Check the Debug Console for errors

### Knowledge graph is empty
- Verify `project_knowledge.json` exists in workspace root
- Check file path in settings: `akisMonitor.knowledgeFilePath`
- Make sure the JSON is valid JSONL format

### Graph doesn't update
- Click the refresh button (↻) in the view title
- Check `akisMonitor.autoRefresh` setting is enabled
- Verify file watcher is working (check console logs)

## Development

To modify the extension:

1. Edit files in `vscode-extension/src/`
2. Run compile: `npm run compile` (or use watch mode: `npm run watch`)
3. Press F5 to test changes
4. Reload the Extension Development Host window (Ctrl+R)

## Next Steps

- Customize colors in KnowledgeGraphProvider.ts (typeColors object)
- Adjust physics parameters for different layouts
- Add new entity type categories
- Implement export/import features
