import * as vscode from 'vscode';
import { LiveSessionParser, LiveSession } from '../parsers/LiveSessionParser';
import { RefreshableProvider } from '../watchers/WorkflowWatcher';

export class LiveSessionViewProvider implements vscode.WebviewViewProvider, RefreshableProvider {
    private view?: vscode.WebviewView;
    private refreshInterval?: NodeJS.Timeout;

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

        // Auto-refresh every 2 seconds for live updates
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 2000);

        webviewView.onDidDispose(() => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
        });
    }

    public refresh() {
        if (this.view) {
            this.view.webview.html = this.getHtmlContent(this.view.webview);
        }
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const session = LiveSessionParser.parseCurrentSession(this.workspaceFolder);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Session</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
            margin: 0;
        }
        .session-header {
            border-left: 4px solid var(--vscode-charts-green);
            padding-left: 12px;
            margin-bottom: 16px;
        }
        .session-header.inactive {
            border-left-color: var(--vscode-charts-gray);
        }
        .session-title {
            font-size: 1.1em;
            font-weight: bold;
            color: var(--vscode-charts-green);
            margin-bottom: 4px;
        }
        .session-title.inactive {
            color: var(--vscode-descriptionForeground);
        }
        .session-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 8px 0;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .status-badge.active {
            background-color: var(--vscode-charts-green);
            color: var(--vscode-editor-background);
            animation: pulse 2s infinite;
        }
        .status-badge.inactive {
            background-color: var(--vscode-charts-gray);
            color: var(--vscode-editor-background);
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .phase-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 12px 0;
            padding: 8px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }
        .phase-name {
            font-weight: bold;
            color: var(--vscode-charts-cyan);
            font-size: 1.1em;
        }
        .phase-progress {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }
        .decisions-section {
            margin-top: 16px;
        }
        .section-title {
            font-weight: bold;
            color: var(--vscode-charts-purple);
            margin-bottom: 8px;
            font-size: 0.95em;
        }
        .decision-item {
            padding: 6px 8px;
            margin: 4px 0;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 3px solid var(--vscode-charts-purple);
            border-radius: 2px;
            font-size: 0.9em;
        }
        .emissions-timeline {
            margin-top: 16px;
            max-height: 300px;
            overflow-y: auto;
        }
        .emission-item {
            padding: 4px 8px;
            margin: 3px 0;
            font-size: 0.85em;
            border-left: 2px solid var(--vscode-charts-blue);
            background-color: rgba(100, 100, 100, 0.1);
        }
        .emission-type {
            font-weight: bold;
            color: var(--vscode-charts-blue);
            margin-right: 4px;
        }
        .emission-type.PHASE { color: var(--vscode-charts-cyan); }
        .emission-type.DECISION { color: var(--vscode-charts-purple); }
        .emission-type.DELEGATE { color: var(--vscode-charts-orange); }
        .emission-type.SKILL { color: var(--vscode-charts-green); }
        .no-session {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .agent-info {
            font-size: 0.9em;
            color: var(--vscode-charts-blue);
            margin: 4px 0;
        }
        .time-info {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin: 4px 0;
        }
        .refresh-indicator {
            text-align: center;
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            margin-top: 16px;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    ${session.isActive ? `
        <div class="session-header">
            <div class="session-title">${this.escapeHtml(session.task)}</div>
            <div class="agent-info">Agent: ${this.escapeHtml(session.agent)}</div>
            <div class="time-info">Last update: ${this.formatTime(session.lastUpdate)}</div>
        </div>

        <div class="session-status">
            <span class="status-badge active">● ACTIVE</span>
        </div>

        <div class="phase-indicator">
            <div>
                <span class="phase-name">${session.phase}</span>
                <div class="phase-progress">Progress: ${session.progress}</div>
            </div>
        </div>

        ${session.decisions.length > 0 ? `
            <div class="decisions-section">
                <div class="section-title">Decisions So Far</div>
                ${session.decisions.map(decision => `
                    <div class="decision-item">${this.escapeHtml(decision)}</div>
                `).join('')}
            </div>
        ` : ''}

        ${session.emissions.length > 0 ? `
            <div class="emissions-timeline">
                <div class="section-title">Session Timeline</div>
                ${session.emissions.slice(-10).reverse().map(emission => `
                    <div class="emission-item">
                        <span class="emission-type ${emission.type}">[${emission.type}]</span>
                        ${this.escapeHtml(emission.content)}
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="refresh-indicator">
            Auto-refreshing every 2 seconds
        </div>
    ` : `
        <div class="session-header inactive">
            <div class="session-title inactive">No Active Session</div>
        </div>

        <div class="session-status">
            <span class="status-badge inactive">○ IDLE</span>
        </div>

        <div class="no-session">
            <p>No active AKIS agent session detected.</p>
            <p style="font-size: 0.9em; margin-top: 12px;">
                A session will appear here when an agent starts working
                (workflow log modified in the last 5 minutes).
            </p>
        </div>

        <div class="refresh-indicator">
            Checking for active sessions...
        </div>
    `}
</body>
</html>`;
    }

    private formatTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        
        if (diffSec < 10) return 'just now';
        if (diffSec < 60) return `${diffSec}s ago`;
        
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        
        const diffHour = Math.floor(diffMin / 60);
        return `${diffHour}h ago`;
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
