import * as vscode from 'vscode';
import { LiveSessionParser, LiveSession, MultiSessionData, SessionAction } from '../parsers/LiveSessionParser';
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
        const data = LiveSessionParser.parseAllSessions(this.workspaceFolder);
        const hasActiveSessions = data.sessions.some(s => s.isActive);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Sessions</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
            margin: 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .header-title {
            font-weight: bold;
            font-size: 1.1em;
        }
        .session-count {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-badge-background);
            padding: 2px 8px;
            border-radius: 10px;
        }
        .sessions-list {
            max-height: calc(100vh - 100px);
            overflow-y: auto;
        }
        .session-item {
            margin: 8px 0;
            border-radius: 4px;
            overflow: hidden;
        }
        .session-header {
            padding: 10px 12px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 4px solid var(--vscode-charts-green);
        }
        .session-header.inactive {
            border-left-color: var(--vscode-charts-gray);
        }
        .session-header.completed {
            border-left-color: var(--vscode-charts-blue);
        }
        .session-header:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .session-title {
            font-weight: bold;
            flex: 1;
        }
        .session-meta {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .status-badge {
            font-size: 0.75em;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
        }
        .status-badge.active {
            background: var(--vscode-charts-green);
            color: var(--vscode-editor-background);
            animation: pulse 2s infinite;
        }
        .status-badge.completed {
            background: var(--vscode-charts-blue);
            color: var(--vscode-editor-background);
        }
        .status-badge.idle {
            background: var(--vscode-charts-gray);
            color: var(--vscode-editor-background);
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .phase-badge {
            font-size: 0.75em;
            padding: 2px 6px;
            border-radius: 3px;
            background: var(--vscode-charts-cyan);
            color: var(--vscode-editor-background);
        }
        .toggle-icon {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-right: 8px;
        }
        .session-body {
            display: none;
            padding: 0 12px 12px;
            background: rgba(100, 100, 100, 0.05);
        }
        .session-body.expanded {
            display: block;
        }
        .session-info {
            padding: 8px 0;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 8px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
        }
        .actions-tree {
            margin-top: 8px;
        }
        .action-item {
            padding: 6px 10px;
            margin: 4px 0;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 3px solid var(--vscode-charts-blue);
            border-radius: 2px;
            cursor: pointer;
            transition: background 0.15s;
        }
        .action-item:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .action-item.SESSION_START { border-left-color: var(--vscode-charts-green); }
        .action-item.PHASE_CHANGE { border-left-color: var(--vscode-charts-cyan); }
        .action-item.DECISION { border-left-color: var(--vscode-charts-purple); }
        .action-item.DELEGATE { border-left-color: var(--vscode-charts-orange); }
        .action-item.FILE_CHANGE { border-left-color: var(--vscode-charts-yellow); }
        .action-item.COMPLETE { border-left-color: var(--vscode-charts-blue); }
        .action-item.CONTEXT { border-left-color: var(--vscode-charts-red); }
        .action-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .action-type {
            font-size: 0.75em;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 2px;
            background: rgba(100, 100, 100, 0.2);
        }
        .action-time {
            font-size: 0.75em;
            color: var(--vscode-descriptionForeground);
        }
        .action-desc {
            margin-top: 4px;
            font-size: 0.9em;
        }
        .action-reason {
            margin-top: 4px;
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        .no-sessions {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .refresh-indicator {
            text-align: center;
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            margin-top: 16px;
            opacity: 0.7;
        }
        .detail-panel {
            position: fixed;
            top: 0;
            right: -400px;
            width: 350px;
            height: 100vh;
            background: var(--vscode-editor-background);
            border-left: 2px solid var(--vscode-charts-green);
            padding: 16px;
            overflow-y: auto;
            transition: right 0.3s ease;
            z-index: 1000;
            box-shadow: -4px 0 8px rgba(0,0,0,0.3);
        }
        .detail-panel.open {
            right: 0;
        }
        .detail-close {
            float: right;
            cursor: pointer;
            font-size: 20px;
            color: var(--vscode-charts-red);
            padding: 4px;
        }
        .detail-close:hover {
            background: var(--vscode-list-hoverBackground);
            border-radius: 4px;
        }
        .detail-title {
            font-size: 1.1em;
            font-weight: bold;
            color: var(--vscode-charts-green);
            margin-bottom: 16px;
            padding-right: 30px;
        }
        .detail-section {
            margin: 12px 0;
            padding: 10px;
            background: rgba(100, 100, 100, 0.1);
            border-left: 3px solid var(--vscode-charts-blue);
            border-radius: 2px;
        }
        .detail-label {
            font-weight: bold;
            color: var(--vscode-charts-cyan);
            margin-bottom: 6px;
            font-size: 0.9em;
        }
        .detail-content {
            color: var(--vscode-foreground);
            line-height: 1.5;
            font-size: 0.9em;
        }
        .context-section {
            margin-top: 12px;
            padding: 10px;
            background: rgba(100, 100, 100, 0.1);
            border-radius: 4px;
        }
        .context-title {
            font-weight: bold;
            font-size: 0.9em;
            margin-bottom: 8px;
            color: var(--vscode-charts-purple);
        }
        .context-item {
            font-size: 0.85em;
            padding: 2px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="header-title">🔄 Live Sessions</span>
        <span class="session-count">${data.sessions.length} session${data.sessions.length !== 1 ? 's' : ''}</span>
    </div>

    ${data.sessions.length > 0 ? `
        <div class="sessions-list">
            ${data.sessions.map((session, idx) => this.renderSession(session, idx, session.id === data.currentSessionId)).join('')}
        </div>
    ` : `
        <div class="no-sessions">
            <p>No active AKIS sessions detected.</p>
            <p style="font-size: 0.9em; margin-top: 12px;">
                Sessions will appear here when an agent starts working.
            </p>
        </div>
    `}

    <div class="refresh-indicator">
        ${hasActiveSessions ? 'Auto-refreshing every 2 seconds' : 'Monitoring for new sessions...'}
    </div>

    <div id="detailPanel" class="detail-panel">
        <span class="detail-close" onclick="closeDetail()">×</span>
        <div id="detailContent"></div>
    </div>

    <script>
        const sessionsData = ${JSON.stringify(data.sessions)};
        
        function toggleSession(idx) {
            const body = document.getElementById('session-body-' + idx);
            const icon = document.getElementById('toggle-icon-' + idx);
            if (body) {
                body.classList.toggle('expanded');
                icon.textContent = body.classList.contains('expanded') ? '▼' : '▶';
            }
        }
        
        function showActionDetail(sessionIdx, actionIdx) {
            const session = sessionsData[sessionIdx];
            const action = session.actions[actionIdx];
            if (!action) return;
            
            const panel = document.getElementById('detailPanel');
            const content = document.getElementById('detailContent');
            
            let html = '<div class="detail-title">' + action.type.replace(/_/g, ' ') + '</div>';
            
            html += '<div class="detail-section">';
            html += '<div class="detail-label">Description</div>';
            html += '<div class="detail-content">' + escapeHtml(action.description) + '</div>';
            html += '</div>';
            
            if (action.reason) {
                html += '<div class="detail-section">';
                html += '<div class="detail-label">Reason</div>';
                html += '<div class="detail-content">' + escapeHtml(action.reason) + '</div>';
                html += '</div>';
            }
            
            html += '<div class="detail-section">';
            html += '<div class="detail-label">Timestamp</div>';
            html += '<div class="detail-content">' + new Date(action.timestamp).toLocaleString() + '</div>';
            html += '</div>';
            
            if (action.details) {
                html += '<div class="detail-section">';
                html += '<div class="detail-label">Details</div>';
                html += '<div class="detail-content"><pre style="font-size: 0.85em; overflow-x: auto;">' + JSON.stringify(action.details, null, 2) + '</pre></div>';
                html += '</div>';
            }
            
            // Show surrounding context
            const allActions = session.actions;
            if (allActions.length > 1) {
                html += '<div class="detail-section">';
                html += '<div class="detail-label">Timeline Context</div>';
                html += '<div class="detail-content">';
                const start = Math.max(0, actionIdx - 2);
                const end = Math.min(allActions.length, actionIdx + 3);
                for (let i = start; i < end; i++) {
                    const a = allActions[i];
                    const isCurrent = i === actionIdx;
                    html += '<div style="padding: 6px; margin: 4px 0; background: ' + (isCurrent ? 'var(--vscode-list-activeSelectionBackground)' : 'rgba(100,100,100,0.1)') + '; border-left: 2px solid ' + (isCurrent ? 'var(--vscode-charts-green)' : 'var(--vscode-charts-blue)') + ';">';
                    html += '<strong>[' + a.type + ']</strong> ' + escapeHtml(a.description.substring(0, 60)) + (a.description.length > 60 ? '...' : '');
                    html += '</div>';
                }
                html += '</div></div>';
            }
            
            content.innerHTML = html;
            panel.classList.add('open');
        }
        
        function closeDetail() {
            document.getElementById('detailPanel').classList.remove('open');
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
            return String(text).replace(/[&<>"']/g, m => map[m]);
        }
        
        // Auto-expand current session
        document.querySelectorAll('.session-item.current').forEach((el, idx) => {
            const body = el.querySelector('.session-body');
            const icon = el.querySelector('.toggle-icon');
            if (body && icon) {
                body.classList.add('expanded');
                icon.textContent = '▼';
            }
        });
    </script>
</body>
</html>`;
    }

    private renderSession(session: LiveSession, idx: number, isCurrent: boolean): string {
        const statusClass = session.isActive ? 'active' : (session.phase === 'COMPLETE' ? 'completed' : 'idle');
        const statusLabel = session.isActive ? 'ACTIVE' : (session.phase === 'COMPLETE' ? 'DONE' : 'IDLE');
        
        return `
        <div class="session-item ${isCurrent ? 'current' : ''}" id="session-${idx}">
            <div class="session-header ${statusClass}" onclick="toggleSession(${idx})">
                <span class="toggle-icon" id="toggle-icon-${idx}">${isCurrent ? '▼' : '▶'}</span>
                <span class="session-title">${this.escapeHtml(session.task)}</span>
                <div class="session-meta">
                    <span class="phase-badge">${session.phase}</span>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </div>
            </div>
            <div class="session-body ${isCurrent ? 'expanded' : ''}" id="session-body-${idx}">
                <div class="session-info">
                    <div class="info-row">
                        <span>Agent:</span>
                        <span>${this.escapeHtml(session.agent)}</span>
                    </div>
                    <div class="info-row">
                        <span>Progress:</span>
                        <span>${session.progress}</span>
                    </div>
                    <div class="info-row">
                        <span>Last Update:</span>
                        <span>${this.formatTime(session.lastUpdate)}</span>
                    </div>
                </div>
                
                ${session.context ? `
                <div class="context-section">
                    <div class="context-title">📊 AKIS Context</div>
                    <div class="context-item">Entities: ${session.context.entities}</div>
                    ${session.context.skills.length > 0 ? `<div class="context-item">Skills: ${session.context.skills.join(', ')}</div>` : ''}
                    ${session.context.files.length > 0 ? `<div class="context-item">Files: ${session.context.files.length} tracked</div>` : ''}
                </div>
                ` : ''}
                
                <div class="actions-tree">
                    ${session.actions.length > 0 ? 
                        session.actions.slice(-20).map((action, actionIdx) => 
                            this.renderAction(action, idx, actionIdx)
                        ).join('') 
                        : '<div style="color: var(--vscode-descriptionForeground); font-size: 0.9em; padding: 8px;">No actions recorded yet</div>'
                    }
                </div>
            </div>
        </div>`;
    }

    private renderAction(action: SessionAction, sessionIdx: number, actionIdx: number): string {
        const typeIcon = this.getActionIcon(action.type);
        
        return `
        <div class="action-item ${action.type}" onclick="showActionDetail(${sessionIdx}, ${actionIdx})">
            <div class="action-header">
                <span class="action-type">${typeIcon} ${action.type.replace(/_/g, ' ')}</span>
                <span class="action-time">${this.formatTime(new Date(action.timestamp))}</span>
            </div>
            <div class="action-desc">${this.escapeHtml(action.description.substring(0, 80))}${action.description.length > 80 ? '...' : ''}</div>
            ${action.reason ? `<div class="action-reason">${this.escapeHtml(action.reason.substring(0, 60))}${action.reason.length > 60 ? '...' : ''}</div>` : ''}
        </div>`;
    }

    private getActionIcon(type: string): string {
        const icons: Record<string, string> = {
            'SESSION_START': '🚀',
            'PHASE_CHANGE': '📍',
            'DECISION': '💡',
            'DETAIL': '📝',
            'FILE_CHANGE': '📄',
            'CONTEXT': '📊',
            'DELEGATE': '🤝',
            'COMPLETE': '✅'
        };
        return icons[type] || '•';
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
        if (!text) return '';
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
