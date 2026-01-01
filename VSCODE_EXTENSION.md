# VSCode AKIS Monitor Extension

A Visual Studio Code extension for monitoring and visualizing the AKIS (Agents, Knowledge, Instructions, Skills) framework in real-time.

## Overview

AKIS Monitor provides three powerful visualization panels:
- **Workflow Tree**: Live view of agent workflows from log files
- **Decision Diagram**: Interactive Mermaid flowcharts of agent decisions
- **Knowledge Graph**: D3.js force-directed graph of project entities

## Quick Start

### Installation

```bash
cd vscode-extension
npm install
npm run compile
npm run package
code --install-extension akis-monitor-0.1.0.vsix
```

### Usage

1. Open the NOP workspace in VSCode
2. Click the AKIS hexagon icon in the Activity Bar
3. Explore the three visualization panels

## Features

### 🌲 Workflow Tree
- Real-time monitoring of `log/workflow/*.md` files
- Color-coded status indicators
- Agent attribution and timestamps
- Delegation tracking

### 🔀 Decision Diagram
- Mermaid.js flowcharts
- Decision point visualization
- Delegation flows
- Recent decisions list

### 🕸️ Knowledge Graph
- Interactive D3.js force layout
- Entity relationship mapping
- Type-based color coding
- Drag-and-drop exploration
- Statistics dashboard
- Memviz integration link

### ⚙️ Configuration

```json
{
  "akisMonitor.workflowLogsPath": "log/workflow",
  "akisMonitor.knowledgeFilePath": "project_knowledge.json",
  "akisMonitor.autoRefresh": true,
  "akisMonitor.refreshInterval": 2000
}
```

## Documentation

- [README.md](vscode-extension/README.md) - Full feature documentation
- [INSTALLATION.md](vscode-extension/INSTALLATION.md) - Setup instructions
- [USAGE.md](vscode-extension/USAGE.md) - Usage examples and scenarios

## Architecture

```
vscode-extension/
├── src/
│   ├── extension.ts              # Extension entry point
│   ├── providers/                # Webview providers
│   │   ├── WorkflowViewProvider.ts
│   │   ├── DecisionViewProvider.ts
│   │   └── KnowledgeViewProvider.ts
│   ├── parsers/                  # Data parsers
│   │   ├── WorkflowParser.ts     # Markdown workflow logs
│   │   └── KnowledgeParser.ts    # JSONL knowledge file
│   ├── watchers/                 # File system watchers
│   │   └── WorkflowWatcher.ts
│   └── types/                    # TypeScript interfaces
│       └── index.ts
├── resources/                    # Icons and assets
│   └── akis-icon.svg
└── package.json                  # Extension manifest
```

## Technologies

- **TypeScript** - Type-safe development
- **VSCode Webview API** - Sidebar panels
- **D3.js v7** - Knowledge graph visualization
- **Mermaid.js v10** - Decision diagram rendering
- **Node.js fs watchers** - Real-time file monitoring

## AKIS Integration

The extension visualizes the complete AKIS workflow:

### 7-Phase Framework
1. **CONTEXT** - Load knowledge and understand task
2. **PLAN** - Design approach and alternatives
3. **COORDINATE** - Delegate or prepare tools
4. **INTEGRATE** - Execute work and apply changes
5. **VERIFY** - Test and validate
6. **LEARN** - Update knowledge and extract patterns
7. **COMPLETE** - Final emission and workflow log

### Data Sources

**Workflow Logs** (`log/workflow/*.md`):
```markdown
**Agent**: _DevTeam
**Status**: Completed
[DECISIONS]
- Key decision with rationale
[DELEGATIONS]
agent=Developer | task=Implementation | result=Success
```

**Knowledge File** (`project_knowledge.json`):
```json
{"type": "entity", "name": "Backend.API", "entityType": "module", "observations": ["..."]}
```

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Lint
npm run lint

# Package
npm run package
```

### Debug Mode

1. Open `vscode-extension/` in VSCode
2. Press F5 to launch Extension Development Host
3. Test changes in the new window
4. Press Ctrl+R to reload after changes

## Contributing

Follow AKIS framework guidelines:
1. Use 7-phase workflow
2. Document decisions in workflow logs
3. Update knowledge graph with patterns
4. Maintain cyberpunk theme consistency

## License

MIT License - See LICENSE file

## Links

- [NOP Repository](https://github.com/goranjovic55/NOP)
- [AKIS Framework](https://github.com/goranjovic55/NOP/blob/main/.github/copilot-instructions.md)
- [Memviz](https://memviz.anthropic.com/)

## Screenshots

### Workflow Tree
Shows chronological list of all agent workflows with status, agent, and delegation information.

### Decision Diagram
Interactive Mermaid flowchart visualizing decision points and delegation flows.

### Knowledge Graph
D3.js force-directed graph with draggable nodes, color-coded by entity type, and relationship edges.

## Roadmap

- [ ] Export diagrams as PNG/SVG
- [ ] Filter workflows by agent/status
- [ ] Timeline view for workflow history
- [ ] Live chat monitoring
- [ ] Custom graph layouts
- [ ] GitHub Actions integration
- [ ] Anthropic memory format compatibility

## Support

- Issues: GitHub Issues with `akis-monitor` label
- Documentation: See README.md, INSTALLATION.md, USAGE.md
- Development: Follow AKIS framework in `.github/`
