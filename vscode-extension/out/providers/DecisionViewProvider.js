"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const WorkflowParser_1 = require("../parsers/WorkflowParser");
class DecisionViewProvider {
    constructor(extensionUri, workspaceFolder) {
        this.extensionUri = extensionUri;
        this.workspaceFolder = workspaceFolder;
        this.selectedWorkflowIndex = -1;
    }
    resolveWebviewView(webviewView, context, token) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'selectWorkflow':
                    this.selectedWorkflowIndex = message.index;
                    this.refresh();
                    break;
            }
        });
    }
    refresh() {
        if (this.view) {
            this.view.webview.html = this.getHtmlContent(this.view.webview);
        }
    }
    getHtmlContent(webview) {
        const config = vscode.workspace.getConfiguration('akisMonitor');
        const workflowPath = path.join(this.workspaceFolder.uri.fsPath, config.get('workflowLogsPath', 'log/workflow'));
        const logs = WorkflowParser_1.WorkflowParser.parseAllWorkflowLogs(workflowPath);
        const selectedLog = this.selectedWorkflowIndex >= 0 ? logs[this.selectedWorkflowIndex] : null;
        const mermaidDiagram = selectedLog ? this.generateMermaidDiagram([selectedLog]) : '';
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historical Diagram</title>
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
            cursor: pointer;
            transition: background 0.2s;
        }
        .tree-content:hover {
            background: var(--vscode-list-hoverBackground);
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
            height: 500px;
            overflow: hidden;
            position: relative;
            border: 1px solid var(--vscode-panel-border);
            cursor: grab;
        }
        .diagram-container:active {
            cursor: grabbing;
        }
        .diagram-container svg {
            width: 100%;
            height: 100%;
        }
        pre.mermaid {
            background: transparent;
            text-align: center;
            margin: 0;
            padding: 20px;
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
                setTimeout(() => {
                    window.mermaid.run();
                    initMermaidZoom();
                }, 100);
            }
        }

        function selectWorkflow(index) {
            vscode.postMessage({ command: 'selectWorkflow', index: parseInt(index) });
        }
        
        // Auto-run mermaid when view loads if mermaid view is active
        if (currentView === 'mermaid' && window.mermaid) {
            setTimeout(() => {
                window.mermaid.run();
                initMermaidZoom();
            }, 100);
        }
        
        function initMermaidZoom() {
            const container = document.querySelector('.diagram-container');
            const svg = container?.querySelector('svg');
            if (!svg) return;
            
            let scale = 1;
            let translateX = 0;
            let translateY = 0;
            let isDragging = false;
            let startX, startY;
            
            // Mousewheel zoom from cursor position
            container.addEventListener('wheel', (e) => {
                e.preventDefault();
                
                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // Calculate the position in the transformed coordinate system
                const transformedMouseX = (mouseX - translateX) / scale;
                const transformedMouseY = (mouseY - translateY) / scale;
                
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                const newScale = Math.max(0.1, Math.min(10, scale * delta));
                
                // Adjust translation to keep the mouse position fixed
                translateX = mouseX - transformedMouseX * newScale;
                translateY = mouseY - transformedMouseY * newScale;
                scale = newScale;
                
                updateTransform();
            });
            
            // Pan with mouse drag
            container.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                container.style.cursor = 'grabbing';
            });
            
            container.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                updateTransform();
            });
            
            container.addEventListener('mouseup', () => {
                isDragging = false;
                container.style.cursor = 'grab';
            });
            
            container.addEventListener('mouseleave', () => {
                isDragging = false;
                container.style.cursor = 'grab';
            });
            
            // Set initial cursor
            container.style.cursor = 'grab';
            
            function updateTransform() {
                svg.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
                svg.style.transformOrigin = 'center center';
            }
        }
        
        // Init zoom for initially loaded diagram
        if (currentView === 'mermaid') {
            setTimeout(() => initMermaidZoom(), 100);
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
    generateTreeView(log) {
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
                log.phases.forEach((phase) => {
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
                log.decisions.forEach((decision) => {
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
                log.delegations.forEach((delegation) => {
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
                log.skills.forEach((skill) => {
                    html += `<div class="tree-content">🔧 ${this.escapeHtml(skill)}</div>`;
                });
                html += `</div></div>`;
            }
            html += `</div></div></div>`;
            return html;
        };
        return buildTree();
    }
    generateMermaidDiagram(logs) {
        if (logs.length === 0)
            return '';
        const log = logs[0]; // Single workflow
        let diagram = 'graph TD\n';
        const rootId = 'START';
        const taskText = (log.task || 'Workflow').replace(/"/g, "'");
        diagram += `    ${rootId}["${taskText}"]\n`;
        let nodeCount = 0;
        let hasNodes = false;
        // Add phases
        if (log.phases && Array.isArray(log.phases) && log.phases.length > 0) {
            log.phases.forEach((phase) => {
                if (phase && phase.phase) {
                    const phaseId = `P${nodeCount++}`;
                    const phaseName = phase.phase.replace(/"/g, "'");
                    const progress = phase.progress || '';
                    diagram += `    ${rootId} --> ${phaseId}["${phaseName} | ${progress}"]\n`;
                    hasNodes = true;
                }
            });
        }
        // Add decisions
        if (log.decisions && Array.isArray(log.decisions) && log.decisions.length > 0) {
            log.decisions.forEach((decision) => {
                if (decision) {
                    const decId = `D${nodeCount++}`;
                    const decText = (typeof decision === 'string' ? decision : decision.description || 'Decision');
                    const sanitized = decText.substring(0, 50).replace(/"/g, "'");
                    diagram += `    ${rootId} --> ${decId}{"${sanitized}..."}\n`;
                    hasNodes = true;
                }
            });
        }
        // Add delegations
        if (log.delegations && Array.isArray(log.delegations) && log.delegations.length > 0) {
            log.delegations.forEach((delegation) => {
                if (delegation && delegation.agent) {
                    const delId = `DEL${nodeCount++}`;
                    const agent = delegation.agent.replace(/"/g, "'");
                    diagram += `    ${rootId} --> ${delId}["→ ${agent}"]\n`;
                    hasNodes = true;
                }
            });
        }
        // Add skills
        if (log.skills && Array.isArray(log.skills) && log.skills.length > 0) {
            log.skills.forEach((skill) => {
                if (skill) {
                    const skillId = `S${nodeCount++}`;
                    const skillText = (typeof skill === 'string' ? skill : 'Skill').replace(/"/g, "'");
                    diagram += `    ${rootId} --> ${skillId}["🎯 ${skillText}"]\n`;
                    hasNodes = true;
                }
            });
        }
        // If no nodes were added, add a placeholder
        if (!hasNodes) {
            diagram += `    ${rootId} --> INFO["No detailed information available"]\n`;
        }
        return diagram;
    }
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}
exports.DecisionViewProvider = DecisionViewProvider;
//# sourceMappingURL=DecisionViewProvider.js.map