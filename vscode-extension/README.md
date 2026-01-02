# AKIS Monitor - VS Code Extension

Visual Studio Code extension for monitoring and visualizing AKIS agent workflows and knowledge graphs.

## Features

### 📊 Knowledge Graph Visualization
- Interactive force-directed graph visualization
- Zoom in/out controls
- Pan and navigate the graph
- Click on nodes to view detailed information
- Color-coded entity types:
  - 🔵 Service - Blue
  - 🟢 Feature - Green
  - 🟠 Module - Orange
  - 🔴 Tool - Pink
  - 🟣 System - Purple
  - ⚪ Other - Gray
- Search functionality to find entities
- Toggle physics simulation on/off
- Side panel with entity details and relationships

## Installation

### From Source

1. Clone the repository
2. Navigate to the `vscode-extension` folder
3. Run `npm install`
4. Run `npm run compile`
5. Press F5 in VS Code to open Extension Development Host

### Package and Install

```bash
cd vscode-extension
npm install
npm run compile
npx vsce package
code --install-extension akis-monitor-0.1.0.vsix
```

## Usage

1. Open a workspace containing `project_knowledge.json`
2. Open the AKIS Monitor view from the Activity Bar (left sidebar)
3. Click on "Knowledge Graph" to visualize your project knowledge
4. Use the controls to zoom and navigate:
   - **Zoom In/Out** - Use the buttons or mouse wheel
   - **Pan** - Click and drag the background
   - **Select Node** - Click on any entity node
   - **Search** - Type in the search box to find entities
   - **Toggle Physics** - Turn simulation on/off for static/dynamic layout

## Configuration

Configure the extension via VS Code settings:

- `akisMonitor.knowledgeFilePath` - Path to knowledge file (default: `project_knowledge.json`)
- `akisMonitor.autoRefresh` - Auto-refresh when files change (default: `true`)
- `akisMonitor.refreshInterval` - Refresh interval in ms (default: `2000`)

## Development

### Build

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Lint

```bash
npm run lint
```

## Requirements

- VS Code 1.85.0 or higher
- Workspace with `project_knowledge.json` file

## Knowledge Graph Format

The extension reads JSONL format with three entry types:

```json
{"type":"entity","name":"Module.Component","entityType":"service","observations":["description"]}
{"type":"relation","from":"ComponentA","to":"ComponentB","relationType":"USES"}
{"type":"codegraph","name":"file.ext","nodeType":"module","dependencies":["X"],"dependents":["Y"]}
```

## License

MIT
