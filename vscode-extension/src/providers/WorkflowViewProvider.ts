import * as vscode from 'vscode';
import * as path from 'path';
import { WorkflowParser } from '../parsers/WorkflowParser';
import { RefreshableProvider } from '../watchers/WorkflowWatcher';

export class WorkflowViewProvider implements vscode.WebviewViewProvider, RefreshableProvider {
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

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Tree</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
            margin: 0;
        }
        .workflow-tree {
            list-style-type: none;
            padding-left: 0;
        }
        .workflow-item {
            margin: 8px 0;
            padding: 8px;
            border-left: 3px solid var(--vscode-charts-green);
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 3px;
        }
        .workflow-item.completed {
            border-left-color: var(--vscode-charts-green);
        }
        .workflow-item.in-progress {
            border-left-color: var(--vscode-charts-yellow);
        }
        .workflow-item.failed {
            border-left-color: var(--vscode-charts-red);
        }
        .workflow-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }
        .workflow-task {
            font-weight: bold;
            color: var(--vscode-charts-green);
        }
        .workflow-timestamp {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
        }
        .workflow-agent {
            font-size: 0.9em;
            color: var(--vscode-charts-blue);
        }
        .workflow-summary {
            font-size: 0.9em;
            margin-top: 4px;
            color: var(--vscode-descriptionForeground);
        }
        .no-data {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            margin-left: 8px;
        }
        .badge.completed {
            background-color: var(--vscode-charts-green);
            color: var(--vscode-editor-background);
        }
        .badge.in-progress {
            background-color: var(--vscode-charts-yellow);
            color: var(--vscode-editor-background);
        }
    </style>
</head>
<body>
    <div class="workflow-tree">
        ${logs.length > 0 ? logs.map(log => `
            <div class="workflow-item ${log.status.toLowerCase().replace(/\s+/g, '-')}">
                <div class="workflow-header">
                    <span class="workflow-task">${this.escapeHtml(log.task)}</span>
                    <span class="badge ${log.status.toLowerCase().replace(/\s+/g, '-')}">${this.escapeHtml(log.status)}</span>
                </div>
                <div class="workflow-timestamp">${log.timestamp.replace('_', ' ')}</div>
                <div class="workflow-agent">Agent: ${this.escapeHtml(log.agent)}</div>
                ${log.summary ? `<div class="workflow-summary">${this.escapeHtml(log.summary.substring(0, 150))}...</div>` : ''}
                ${log.delegations.length > 0 ? `<div class="workflow-summary">Delegations: ${log.delegations.map(d => d.agent).join(', ')}</div>` : ''}
            </div>
        `).join('') : '<div class="no-data">No workflow logs found. Start working with AKIS agents to see workflows here.</div>'}
    </div>
</body>
</html>`;
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
