import * as vscode from 'vscode';
import * as path from 'path';
import { WorkflowParser } from '../parsers/WorkflowParser';
import { RefreshableProvider } from '../watchers/WorkflowWatcher';

export class DecisionViewProvider implements vscode.WebviewViewProvider, RefreshableProvider {
    private view?: vscode.WebviewView;
    private selectedWorkflowIndex: number = -1;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly workspaceFolder: vscode.WorkspaceFolder
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getHtmlContent(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'selectWorkflow':
                        this.selectedWorkflowIndex = message.index;
                        this.refresh();
                        break;
                }
            }
        );
    }

    public refresh() {
        if (this.view) {
            this.view.webview.html = this.getHtmlContent(this.view.webview);
        }
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const config = vscode.workspace.getConfiguration('akisMonitor');
        const workflowPath = path.join(
            this.workspaceFolder.uri.fsPath,
            config.get<string>('workflowLogsPath', 'log/workflow')
        );

        const logs = WorkflowParser.parseAllWorkflowLogs(workflowPath);
        const selectedLog = this.selectedWorkflowIndex >= 0 ? logs[this.selectedWorkflowIndex] : null;
        const mermaidDiagram = selectedLog ? this.generateMermaidDiagram([selectedLog]) : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Decision Diagram</title>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'dark',
            themeVariables: {
                primaryColor: '#22c55e',
                primaryTextColor: '#fff',
                primaryBorderColor: '#16a34a',
                lineColor: '#06b6d4',
                secondaryColor: '#1f2937',
                tertiaryColor: '#374151'
            }
        });
        window.mermaid = mermaid;
    </script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
            margin: 0;
        }
        .controls {
            margin-bottom: 10px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 12px;
        }
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn.active {
            background: var(--vscode-button-secondaryBackground);
            border: 1px solid var(--vscode-charts-green);
        }
        .workflow-selector {
            flex: 1;
            background: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 4px 8px;
            border-radius: 2px;
        }
        #treeView, #mermaidView {
            display: none;
        }
        #treeView.active, #mermaidView.active {
            display: block;
        }
        .tree {
            margin: 10px 0;
        }
        .tree-node {
            margin-left: 20px;
            position: relative;
        }
        .tree-toggle {
            cursor: pointer;
            user-select: none;
            color: var(--vscode-charts-green);
        }
        .tree-content {
            padding: 4px 8px;
            margin: 4px 0;
            border-left: 2px solid var(--vscode-charts-purple);
            background: var(--vscode-editor-inactiveSelectionBackground);
        }
        .tree-children {
            margin-left: 15px;
        }
        .tree-children.collapsed {
            display: none;
        }
        .no-data {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        .diagram-container {
            width: 100%;
            overflow-x: auto;
        }
        pre.mermaid {
            background: transparent;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="controls">
        <button class="btn active" onclick="switchView('tree')">Tree View</button>
        <button class="btn" onclick="switchView('mermaid')">Mermaid Diagram</button>
        <select class="workflow-selector" onchange="selectWorkflow(this.value)">
            <option value="-1">Select Workflow...</option>
            ${logs.map((log, idx) => `
                <option value="${idx}" ${idx === this.selectedWorkflowIndex ? 'selected' : ''}>
                    ${this.escapeHtml(log.task)} - ${log.timestamp}
                </option>
            `).join('')}
        </select>
    </div>

    <div id="treeView" class="active">
        ${selectedLog ? this.generateTreeView(selectedLog) : '<div class="no-data">Select a workflow to view decision tree</div>'}
    </div>

    <div id="mermaidView">
        <div class="diagram-container">
            ${mermaidDiagram ? `<pre class="mermaid">${mermaidDiagram}</pre>` : '<div class="no-data">Select a workflow to view Mermaid diagram</div>'}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentView = 'tree';

        function switchView(view) {
            currentView = view;
            document.getElementById('treeView').classList.toggle('active', view === 'tree');
            document.getElementById('mermaidView').classList.toggle('active', view === 'mermaid');
            
            document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            if (view === 'mermaid' && window.mermaid) {
                window.mermaid.run();
            }
        }

        function selectWorkflow(index) {
            vscode.postMessage({ command: 'selectWorkflow', index: parseInt(index) });
        }

        function toggleNode(elem) {
            const children = elem.nextElementSibling;
            if (children && children.classList.contains('tree-children')) {
                children.classList.toggle('collapsed');
                const toggle = elem.querySelector('.tree-toggle');
                if (toggle) {
                    toggle.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
                }
            }
        }
    </script>
</body>
</html>`;
    }


    private generateTreeView(log: any): string {
        const buildTree = () => {
            let html = '<div class="tree">';
            html += `<div class="tree-node">`;
            html += `<div class="tree-content" onclick="toggleNode(this)">`;
            html += `<span class="tree-toggle">▼</span> <strong>Task:</strong> ${this.escapeHtml(log.task)}`;
            html += `</div>`;
            html += `<div class="tree-children">`;
            
            // Add phases
            if (log.phases && log.phases.length > 0) {
                html += `<div class="tree-node">`;
                html += `<div class="tree-content" onclick="toggleNode(this)">`;
                html += `<span class="tree-toggle">▼</span> <strong>Phases (${log.phases.length})</strong>`;
                html += `</div>`;
                html += `<div class="tree-children">`;
                log.phases.forEach((phase: any) => {
                    html += `<div class="tree-content">${this.escapeHtml(phase.phase)} - ${this.escapeHtml(phase.progress)}</div>`;
                });
                html += `</div></div>`;
            }
            
            // Add decisions
            if (log.decisions && log.decisions.length > 0) {
                html += `<div class="tree-node">`;
                html += `<div class="tree-content" onclick="toggleNode(this)">`;
                html += `<span class="tree-toggle">▼</span> <strong>Decisions (${log.decisions.length})</strong>`;
                html += `</div>`;
                html += `<div class="tree-children">`;
                log.decisions.forEach((decision: any) => {
                    html += `<div class="tree-content">📋 ${this.escapeHtml(decision.description)}</div>`;
                });
                html += `</div></div>`;
            }
            
            // Add delegations
            if (log.delegations && log.delegations.length > 0) {
                html += `<div class="tree-node">`;
                html += `<div class="tree-content" onclick="toggleNode(this)">`;
                html += `<span class="tree-toggle">▼</span> <strong>Delegations (${log.delegations.length})</strong>`;
                html += `</div>`;
                html += `<div class="tree-children">`;
                log.delegations.forEach((delegation: any) => {
                    html += `<div class="tree-content">👥 ${this.escapeHtml(delegation.agent)}: ${this.escapeHtml(delegation.task)}</div>`;
                });
                html += `</div></div>`;
            }
            
            // Add skills
            if (log.skills && log.skills.length > 0) {
                html += `<div class="tree-node">`;
                html += `<div class="tree-content" onclick="toggleNode(this)">`;
                html += `<span class="tree-toggle">▼</span> <strong>Skills (${log.skills.length})</strong>`;
                html += `</div>`;
                html += `<div class="tree-children">`;
                log.skills.forEach((skill: string) => {
                    html += `<div class="tree-content">🔧 ${this.escapeHtml(skill)}</div>`;
                });
                html += `</div></div>`;
            }
            
            html += `</div></div></div>`;
            return html;
        };

        return buildTree();
    }

    private generateMermaidDiagram(logs: any[]): string {
        if (logs.length === 0) return '';

        const log = logs[0]; // Single workflow
        let diagram = 'graph TD\n';
        
        const rootId = 'START';
        diagram += `    ${rootId}["${log.task}"]\n`;
        
        let nodeCount = 0;
        
        // Add phases
        if (log.phases && log.phases.length > 0) {
            log.phases.forEach((phase: any) => {
                const phaseId = `P${nodeCount++}`;
                diagram += `    ${rootId} --> ${phaseId}["${phase.phase} | ${phase.progress}"]\n`;
            });
        }
        
        // Add decisions
        if (log.decisions && log.decisions.length > 0) {
            log.decisions.forEach((decision: any) => {
                const decId = `D${nodeCount++}`;
                const decText = decision.description.substring(0, 50);
                diagram += `    ${rootId} --> ${decId}{"${decText}..."}\n`;
            });
        }

        // Add delegations
        if (log.delegations && log.delegations.length > 0) {
            log.delegations.forEach((delegation: any) => {
                const delId = `DEL${nodeCount++}`;
                diagram += `    ${rootId} --> ${delId}["→ ${delegation.agent}"]\n`;
            });
        }

        return diagram;
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}
