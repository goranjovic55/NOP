import * as vscode from 'vscode';
import * as path from 'path';
import { WorkflowParser } from '../parsers/WorkflowParser';
import { RefreshableProvider } from '../watchers/WorkflowWatcher';

export class DecisionViewProvider implements vscode.WebviewViewProvider, RefreshableProvider {
    private view?: vscode.WebviewView;

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

        // Generate Mermaid diagram
        const mermaidDiagram = this.generateMermaidDiagram(logs);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Decision Diagram</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
            margin: 0;
        }
        .diagram-container {
            width: 100%;
            overflow-x: auto;
        }
        .mermaid {
            text-align: center;
        }
        .no-data {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        .decision-list {
            margin-top: 20px;
        }
        .decision-item {
            margin: 8px 0;
            padding: 8px;
            border-left: 3px solid var(--vscode-charts-purple);
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 3px;
        }
        .decision-desc {
            font-weight: bold;
            color: var(--vscode-charts-purple);
        }
        .decision-from {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="diagram-container">
        ${mermaidDiagram ? `
            <div class="mermaid">
                ${mermaidDiagram}
            </div>
        ` : '<div class="no-data">No decisions found in workflow logs.</div>'}
    </div>
    
    <div class="decision-list">
        <h3>Recent Decisions</h3>
        ${logs.flatMap(log => 
            log.decisions.map(decision => `
                <div class="decision-item">
                    <div class="decision-desc">${this.escapeHtml(decision.description)}</div>
                    <div class="decision-from">From: ${this.escapeHtml(log.task)} (${log.timestamp.replace('_', ' ')})</div>
                </div>
            `)
        ).join('') || '<div class="no-data">No decisions recorded yet.</div>'}
    </div>
    
    <script>
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
    </script>
</body>
</html>`;
    }

    private generateMermaidDiagram(logs: any[]): string {
        if (logs.length === 0) return '';

        const recentLogs = logs.slice(0, 5); // Show last 5 workflows
        let diagram = 'graph TD\n';
        
        recentLogs.forEach((log, index) => {
            const nodeId = `W${index}`;
            diagram += `    ${nodeId}["${log.task.substring(0, 30)}..."]\n`;
            
            log.decisions.forEach((decision: any, decIndex: number) => {
                const decId = `${nodeId}_D${decIndex}`;
                const decText = decision.description.substring(0, 40);
                diagram += `    ${nodeId} --> ${decId}{"${decText}..."}\n`;
            });

            if (log.delegations.length > 0) {
                log.delegations.forEach((delegation: any, delIndex: number) => {
                    const delId = `${nodeId}_DEL${delIndex}`;
                    diagram += `    ${nodeId} --> ${delId}["Delegate to ${delegation.agent}"]\n`;
                });
            }
        });

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
