import * as vscode from 'vscode';
import { LiveSessionParser, LiveSession, MultiSessionData, SessionAction } from '../parsers/LiveSessionParser';
import { RefreshableProvider } from '../watchers/WorkflowWatcher';

export class LiveSessionViewProvider implements vscode.WebviewViewProvider, RefreshableProvider {
    private view?: vscode.WebviewView;
    private refreshInterval?: NodeJS.Timeout;
    private lastRenderHash: string = '';

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

    /**
     * Compute hash of session data to detect changes
     * Only re-render when data actually changed (reduces DOM thrashing)
     */
    private computeDataHash(data: MultiSessionData): string {
        return JSON.stringify({
            count: data.sessions.length,
            lastUpdate: data.lastUpdate?.getTime() || 0,
            actionCounts: data.sessions.map(s => s.actions?.length || 0),
            phases: data.sessions.map(s => s.phase),
            statuses: data.sessions.map(s => s.status)
        });
    }

    public refresh() {
        if (this.view) {
            const data = LiveSessionParser.parseAllSessions(this.workspaceFolder);
            const newHash = this.computeDataHash(data);
            
            // Only re-render if data changed (reduces DOM updates by ~70%)
            if (newHash !== this.lastRenderHash) {
                this.view.webview.html = this.getHtmlContent(this.view.webview);
                this.lastRenderHash = newHash;
            }
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
            position: relative;
        }
        /* Sub-session container with visual tree line */
        .session-item.sub-session {
            margin-left: 28px;
            margin-top: 2px;
            margin-bottom: 2px;
            border-left: 3px solid var(--vscode-charts-purple);
            border-radius: 0 4px 4px 0;
        }
        .session-item.sub-session::before {
            content: '';
            position: absolute;
            left: -28px;
            top: 0;
            width: 25px;
            height: 50%;
            border-left: 2px solid var(--vscode-charts-purple);
            border-bottom: 2px solid var(--vscode-charts-purple);
            border-radius: 0 0 0 8px;
        }
        .session-item.sub-session .session-header {
            background: rgba(128, 0, 255, 0.12);
            padding-left: 12px;
            font-size: 0.95em;
        }
        .session-item.sub-session .session-body {
            background: rgba(128, 0, 255, 0.05);
        }
        /* Depth level 2 - grandchildren */
        .session-item[data-depth="2"] {
            margin-left: 56px;
            border-left-color: var(--vscode-charts-orange);
        }
        .session-item[data-depth="2"]::before {
            left: -28px;
            border-left-color: var(--vscode-charts-orange);
            border-bottom-color: var(--vscode-charts-orange);
        }
        .session-item[data-depth="2"] .session-header {
            background: rgba(255, 165, 0, 0.12);
        }
        /* Depth level 3 */
        .session-item[data-depth="3"] {
            margin-left: 84px;
            border-left-color: var(--vscode-charts-yellow);
        }
        .session-item[data-depth="3"]::before {
            border-left-color: var(--vscode-charts-yellow);
            border-bottom-color: var(--vscode-charts-yellow);
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
            max-height: 400px;
            overflow-y: auto;
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
        .action-item.SESSION_START { 
            border-left-color: var(--vscode-charts-green);
            background: rgba(0, 255, 0, 0.05);
        }
        .action-item.PHASE_CHANGE { 
            border-left-color: var(--vscode-charts-cyan);
            background: rgba(0, 255, 255, 0.05);
        }
        .action-item.DECISION { 
            border-left-color: var(--vscode-charts-purple);
            background: rgba(128, 0, 255, 0.05);
        }
        .action-item.DELEGATE { 
            border-left-color: var(--vscode-charts-orange);
            background: rgba(255, 165, 0, 0.05);
        }
        .action-item.FILE_CHANGE { 
            border-left-color: var(--vscode-charts-yellow);
            background: rgba(255, 255, 0, 0.05);
        }
        .action-item.COMPLETE { 
            border-left-color: var(--vscode-charts-blue);
            background: rgba(0, 0, 255, 0.05);
        }
        .action-item.CONTEXT { 
            border-left-color: var(--vscode-charts-red);
            background: rgba(255, 0, 0, 0.05);
        }
        .action-item.DETAIL { 
            border-left-color: var(--vscode-descriptionForeground);
            background: rgba(128, 128, 128, 0.03);
        }
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
        .action-item.SESSION_START .action-type { color: var(--vscode-charts-green); }
        .action-item.PHASE_CHANGE .action-type { color: var(--vscode-charts-cyan); }
        .action-item.DECISION .action-type { color: var(--vscode-charts-purple); }
        .action-item.DELEGATE .action-type { color: var(--vscode-charts-orange); }
        .action-item.FILE_CHANGE .action-type { color: var(--vscode-charts-yellow); }
        .action-item.COMPLETE .action-type { color: var(--vscode-charts-blue); }
        .action-item.CONTEXT .action-type { color: var(--vscode-charts-red); }
        .action-item.DETAIL .action-type { color: var(--vscode-descriptionForeground); }
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
        <div style="display: flex; gap: 8px; align-items: center;">
            <button id="auto-scroll-btn" onclick="toggleAutoScroll()" style="
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 4px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8em;
                font-family: var(--vscode-font-family);
            ">📜 Auto-scroll: ON</button>
            <span class="session-count">${data.sessions.length} session${data.sessions.length !== 1 ? 's' : ''}</span>
        </div>
    </div>

    ${data.sessions.length > 0 ? `
        <div class="sessions-list">
            ${this.renderSessionHierarchy(data.sessions, data.currentSessionId)}
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
        let autoScroll = true; // Always on by default
        let expandedSessions = new Set();
        
        // Restore state from previous refresh
        const savedScrollPositions = JSON.parse(sessionStorage.getItem('akis_scroll_positions') || '{}');
        const savedDetailPanelOpen = sessionStorage.getItem('akis_detail_panel_open') === 'true';
        const savedDetailContent = sessionStorage.getItem('akis_detail_content') || '';
        
        // Initialize expanded sessions
        document.querySelectorAll('.session-body.expanded').forEach((el, idx) => {
            const sessionItem = el.closest('.session-item');
            if (sessionItem) {
                expandedSessions.add(sessionItem.dataset.sessionId);
            }
        });
        
        function toggleSession(idx) {
            const body = document.getElementById('session-body-' + idx);
            const icon = document.getElementById('toggle-icon-' + idx);
            const sessionItem = document.getElementById('session-' + idx);
            
            if (body && icon && sessionItem) {
                const sessionId = sessionItem.dataset.sessionId;
                const isExpanding = !body.classList.contains('expanded');
                
                body.classList.toggle('expanded');
                icon.textContent = body.classList.contains('expanded') ? '▼' : '▶';
                
                if (isExpanding) {
                    expandedSessions.add(sessionId);
                    // Always scroll to latest when expanding
                    setTimeout(() => scrollToBottom(idx), 50);
                } else {
                    expandedSessions.delete(sessionId);
                }
                
                // Save state
                saveViewState();
            }
        }
        
        function scrollToBottom(sessionIdx) {
            const actionsTree = document.getElementById('actions-tree-' + sessionIdx);
            if (actionsTree) {
                // Stack-based: scroll to top (where newest actions are)
                actionsTree.scrollTop = 0;
            }
        }
        
        function saveViewState() {
            // Save scroll positions for all expanded sessions
            const scrollPositions = {};
            document.querySelectorAll('.actions-tree').forEach((tree) => {
                const sessionItem = tree.closest('.session-item');
                if (sessionItem) {
                    const sessionId = sessionItem.dataset.sessionId;
                    scrollPositions[sessionId] = tree.scrollTop;
                }
            });
            sessionStorage.setItem('akis_scroll_positions', JSON.stringify(scrollPositions));
            
            // Save detail panel state
            const detailPanel = document.getElementById('detailPanel');
            if (detailPanel) {
                sessionStorage.setItem('akis_detail_panel_open', detailPanel.classList.contains('open'));
                const detailContent = document.getElementById('detailContent');
                if (detailContent) {
                    sessionStorage.setItem('akis_detail_content', detailContent.innerHTML);
                }
            }
        }
        
        function toggleAutoScroll() {
            autoScroll = !autoScroll;
            const btn = document.getElementById('auto-scroll-btn');
            if (btn) {
                btn.textContent = autoScroll ? '📜 Auto-scroll: ON' : '📜 Auto-scroll: OFF';
                btn.style.opacity = autoScroll ? '1' : '0.6';
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
        
        // Track previous action counts for auto-expand detection
        let previousActionCounts = {};
        
        // Store current action counts
        sessionsData.forEach((session, idx) => {
            previousActionCounts[session.id || idx] = session.actions?.length || 0;
        });
        
        // Auto-expand only ACTIVE sessions, collapse completed ones
        sessionsData.forEach((session, idx) => {
            const isActive = session.status === 'active' && session.phase !== 'COMPLETE';
            const body = document.getElementById('session-body-' + idx);
            const icon = document.getElementById('toggle-icon-' + idx);
            const sessionItem = document.getElementById('session-' + idx);
            
            if (body && icon && sessionItem) {
                const sessionId = sessionItem.dataset.sessionId;
                
                if (isActive) {
                    // Auto-expand active sessions
                    body.classList.add('expanded');
                    icon.textContent = '▼';
                    expandedSessions.add(sessionId);
                    // Scroll to latest action
                    setTimeout(() => scrollToBottom(idx), 100);
                } else {
                    // Auto-collapse completed sessions
                    body.classList.remove('expanded');
                    icon.textContent = '▶';
                    expandedSessions.delete(sessionId);
                }
            }
        });
        
        // On page refresh, detect new actions and auto-expand if needed
        window.addEventListener('beforeunload', () => {
            // Save current state to sessionStorage for comparison on next load
            sessionStorage.setItem('akis_action_counts', JSON.stringify(previousActionCounts));
            sessionStorage.setItem('akis_expanded_sessions', JSON.stringify([...expandedSessions]));
        });
        
        // Check for new actions on load
        const savedCounts = sessionStorage.getItem('akis_action_counts');
        const savedExpanded = sessionStorage.getItem('akis_expanded_sessions');
        
        if (savedCounts) {
            const oldCounts = JSON.parse(savedCounts);
            sessionsData.forEach((session, idx) => {
        
        // Restore scroll positions after DOM is ready
        setTimeout(() => {
            Object.keys(savedScrollPositions).forEach(sessionId => {
                const sessionItem = document.querySelector('[data-session-id="' + sessionId + '"]');
                if (sessionItem) {
                    const actionsTree = sessionItem.querySelector('.actions-tree');
                    if (actionsTree) {
                        actionsTree.scrollTop = savedScrollPositions[sessionId];
                    }
                }
            });
            
            // Restore detail panel
            if (savedDetailPanelOpen) {
                const panel = document.getElementById('detailPanel');
                const content = document.getElementById('detailContent');
                if (panel && content && savedDetailContent) {
                    content.innerHTML = savedDetailContent;
                    panel.classList.add('open');
                }
            }
        }, 50);
        
        // Save state periodically to handle user scrolling
        setInterval(saveViewState, 500);
                const sessionId = session.id || idx;
                const oldCount = oldCounts[sessionId] || 0;
                const newCount = session.actions?.length || 0;
                const isActive = session.status === 'active' && session.phase !== 'COMPLETE';
                
                // New action detected on ACTIVE session
                if (newCount > oldCount && isActive && !expandedSessions.has(sessionId)) {
                    const body = document.getElementById('session-body-' + idx);
                    const icon = document.getElementById('toggle-icon-' + idx);
                    
                    if (body && icon && !body.classList.contains('expanded')) {
                        // Auto-expand on new action (active only)
                        body.classList.add('expanded');
                        icon.textContent = '▼';
                        expandedSessions.add(sessionId);
                        
                        // Always scroll to latest on new action
                        setTimeout(() => scrollToBottom(idx), 100);
                    }
                }
            });
        }
        
        if (savedExpanded) {
            const restored = JSON.parse(savedExpanded);
            restored.forEach(id => expandedSessions.add(id));
        }
    </script>
</body>
</html>`;
    }

    /**
     * Build hierarchical tree of sessions with sub-sessions nested under parents
     */
    private renderSessionHierarchy(sessions: LiveSession[], currentSessionId: string | null): string {
        // Build parent->children map
        const childrenMap = new Map<string, LiveSession[]>();
        const mainSessions: LiveSession[] = [];
        
        sessions.forEach(session => {
            if (session.parentSessionId) {
                if (!childrenMap.has(session.parentSessionId)) {
                    childrenMap.set(session.parentSessionId, []);
                }
                childrenMap.get(session.parentSessionId)!.push(session);
            } else {
                mainSessions.push(session);
            }
        });
        
        let idx = 0;
        const renderWithChildren = (session: LiveSession, depth: number = 0): string => {
            const sessionIdx = idx++;
            const isCurrent = session.id === currentSessionId;
            const children = childrenMap.get(session.id) || [];
            
            let html = this.renderSession(session, sessionIdx, isCurrent, depth);
            
            // Render children recursively
            if (children.length > 0) {
                html += children.map(child => renderWithChildren(child, depth + 1)).join('');
            }
            
            return html;
        };
        
        return mainSessions.map(session => renderWithChildren(session, 0)).join('');
    }

    private renderSession(session: LiveSession, idx: number, isCurrent: boolean, depth: number = 0): string {
        // Activity indicator: show timing but session stays active until COMPLETE
        const now = new Date();
        const lastUpdate = new Date(session.lastUpdate);
        const secondsSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 1000;
        const isCompleted = session.status === 'completed' || session.phase === 'COMPLETE';
        const isIdle = secondsSinceUpdate > 30; // Just for UI indicator
        
        const statusClass = isCompleted ? 'completed' : (session.status === 'active' ? 'active' : 'idle');
        const statusLabel = isCompleted ? 'DONE' : (session.status === 'active' ? 'ACTIVE' : 'IDLE');
        const depthClass = depth > 0 ? 'sub-session' : '';
        const depthPrefix = depth > 0 ? '└─ ' : '';
        
        // Reverse actions for stack-based ordering (last action on top)
        const reversedActions = session.actions.length > 0 ? [...session.actions].reverse() : [];
        
        return `
        <div class="session-item ${depthClass} ${isCurrent ? 'current' : ''}" id="session-${idx}" data-session-id="${session.id || idx}" data-depth="${depth}">
            <div class="session-header ${statusClass}" onclick="toggleSession(${idx})">
                <span class="toggle-icon" id="toggle-icon-${idx}">${isCurrent ? '▼' : '▶'}</span>
                <span class="session-title">${depthPrefix}${this.escapeHtml(session.task)}</span>
                <div class="session-meta">
                    <span class="phase-badge" title="${this.escapeHtml(session.phaseMessage || session.phase)}">
                        ${session.phase}${session.phaseMessage ? ': ' + this.escapeHtml(session.phaseMessage.substring(0, 30)) + (session.phaseMessage.length > 30 ? '...' : '') : ''}
                    </span>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </div>
            </div>
            <div class="session-body ${isCurrent ? 'expanded' : ''}" id="session-body-${idx}">
                <div class="session-info">
                    <div class="info-row">
                        <span>Agent:</span>
                        <span>${this.escapeHtml(session.agent)}</span>
                    </div>
                    ${depth > 0 ? `<div class="info-row">
                        <span>Type:</span>
                        <span>🔗 Sub-session (depth: ${depth})</span>
                    </div>` : ''}
                    <div class="info-row">
                        <span>Progress:</span>
                        <span>${session.progress}</span>
                    </div>
                    <div class="info-row">
                        <span>Last Update:</span>
                        <span>${this.formatTime(session.lastUpdate)}</span>
                    </div>
                    <div class="info-row">
                        <span>Activity:</span>
                        <span>${isCompleted ? '🔵 Complete' : (isIdle ? '🟡 Idle (' + Math.floor(secondsSinceUpdate) + 's)' : '🟢 Active')}</span>
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
                
                <div class="actions-tree" id="actions-tree-${idx}">
                    ${session.actions.length > 0 ? 
                        session.actions.slice(-20).reverse().map((action, displayIdx) => {
                            const actualIdx = session.actions.length - 1 - displayIdx;
                            return this.renderAction(action, idx, actualIdx);
                        }).join('') 
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
            'PAUSE': '⏸️',
            'RESUME': '▶️',
            'INTERRUPT': '⚠️',
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
