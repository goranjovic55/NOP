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
exports.KnowledgeGraphProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class KnowledgeGraphProvider {
    constructor(context, workspaceFolder) {
        this.context = context;
        this.workspaceFolder = workspaceFolder;
    }
    resolveWebviewView(webviewView, context, _token) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'getGraphData':
                    this.sendGraphData();
                    break;
                case 'entityClicked':
                    this.handleEntityClick(message.entityName);
                    break;
            }
        }, undefined, this.context.subscriptions);
        // Send initial data
        this.sendGraphData();
    }
    refresh() {
        this.sendGraphData();
    }
    sendGraphData() {
        if (!this.view) {
            return;
        }
        const config = vscode.workspace.getConfiguration('akisMonitor');
        const knowledgePath = config.get('knowledgeFilePath', 'project_knowledge.json');
        const fullPath = path.join(this.workspaceFolder.uri.fsPath, knowledgePath);
        if (!fs.existsSync(fullPath)) {
            this.view.webview.postMessage({
                command: 'updateGraph',
                data: { nodes: [], links: [] }
            });
            return;
        }
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const graphData = this.parseKnowledgeGraph(content);
            this.view.webview.postMessage({
                command: 'updateGraph',
                data: graphData
            });
        }
        catch (error) {
            console.error('Error reading knowledge graph:', error);
        }
    }
    parseKnowledgeGraph(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const entities = new Map();
        const links = [];
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                if (entry.type === 'entity' && entry.name) {
                    entities.set(entry.name, {
                        id: entry.name,
                        name: entry.name,
                        type: entry.entityType || 'unknown',
                        observations: entry.observations || [],
                        group: this.getGroupFromName(entry.name)
                    });
                }
                else if (entry.type === 'relation' && entry.from && entry.to) {
                    links.push({
                        source: entry.from,
                        target: entry.to,
                        relationType: entry.relationType || 'RELATED',
                        value: 1
                    });
                }
                else if (entry.type === 'codegraph' && entry.name) {
                    entities.set(entry.name, {
                        id: entry.name,
                        name: entry.name,
                        type: entry.nodeType || 'module',
                        observations: [`Dependencies: ${entry.dependencies?.length || 0}`, `Dependents: ${entry.dependents?.length || 0}`],
                        group: 'codegraph'
                    });
                    // Add dependency links
                    if (entry.dependencies) {
                        for (const dep of entry.dependencies) {
                            links.push({
                                source: entry.name,
                                target: dep,
                                relationType: 'DEPENDS_ON',
                                value: 1
                            });
                        }
                    }
                }
            }
            catch (e) {
                console.error('Error parsing line:', line, e);
            }
        }
        return {
            nodes: Array.from(entities.values()),
            links: links
        };
    }
    getGroupFromName(name) {
        const parts = name.split('.');
        if (parts.length > 1) {
            return parts[0]; // Use first part as group (e.g., "NOP", "Frontend", "Backend")
        }
        return 'other';
    }
    handleEntityClick(entityName) {
        if (!this.view) {
            return;
        }
        const config = vscode.workspace.getConfiguration('akisMonitor');
        const knowledgePath = config.get('knowledgeFilePath', 'project_knowledge.json');
        const fullPath = path.join(this.workspaceFolder.uri.fsPath, knowledgePath);
        if (!fs.existsSync(fullPath)) {
            return;
        }
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            let entityDetails = null;
            const relatedEntities = [];
            for (const line of lines) {
                const entry = JSON.parse(line);
                if (entry.type === 'entity' && entry.name === entityName) {
                    entityDetails = entry;
                }
                else if (entry.type === 'relation') {
                    if (entry.from === entityName) {
                        relatedEntities.push(`→ ${entry.to} (${entry.relationType})`);
                    }
                    else if (entry.to === entityName) {
                        relatedEntities.push(`← ${entry.from} (${entry.relationType})`);
                    }
                }
            }
            this.view.webview.postMessage({
                command: 'showEntityDetails',
                entity: entityDetails,
                relations: relatedEntities
            });
        }
        catch (error) {
            console.error('Error loading entity details:', error);
        }
    }
    getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Graph</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            overflow: hidden;
        }
        #container {
            display: flex;
            height: 100vh;
            width: 100vw;
        }
        #graph-container {
            flex: 1;
            position: relative;
            overflow: hidden;
        }
        #details-pane {
            width: 300px;
            background-color: var(--vscode-sideBar-background);
            border-left: 1px solid var(--vscode-panel-border);
            overflow-y: auto;
            padding: 16px;
            display: none;
        }
        #details-pane.visible {
            display: block;
        }
        #details-pane h3 {
            margin-bottom: 12px;
            color: var(--vscode-textLink-foreground);
            font-size: 14px;
        }
        #details-pane .detail-section {
            margin-bottom: 16px;
        }
        #details-pane .detail-label {
            font-size: 11px;
            text-transform: uppercase;
            opacity: 0.7;
            margin-bottom: 4px;
        }
        #details-pane .detail-value {
            font-size: 13px;
            margin-bottom: 8px;
        }
        #details-pane ul {
            list-style: none;
            padding-left: 0;
        }
        #details-pane li {
            font-size: 12px;
            padding: 4px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        #details-pane li:last-child {
            border-bottom: none;
        }
        .close-btn {
            float: right;
            cursor: pointer;
            opacity: 0.7;
            font-size: 16px;
        }
        .close-btn:hover {
            opacity: 1;
        }
        canvas {
            display: block;
        }
        .controls {
            position: absolute;
            top: 10px;
            left: 10px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px;
            display: flex;
            gap: 8px;
        }
        .controls button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        }
        .controls button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        #search-box {
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 6px 12px;
            border-radius: 3px;
            font-size: 12px;
            width: 200px;
        }
        #legend {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            font-size: 11px;
            max-width: 250px;
        }
        #legend h4 {
            margin-bottom: 8px;
            font-size: 12px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
        }
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 2px;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="graph-container">
            <div class="controls">
                <button id="zoom-in">Zoom In</button>
                <button id="zoom-out">Zoom Out</button>
                <button id="reset-view">Reset View</button>
                <button id="toggle-physics">Physics: ON</button>
            </div>
            <input type="text" id="search-box" placeholder="Search entities..." />
            <div id="legend">
                <h4>Entity Types</h4>
                <div class="legend-item"><div class="legend-color" style="background-color: #4fc3f7;"></div>Service</div>
                <div class="legend-item"><div class="legend-color" style="background-color: #81c784;"></div>Feature</div>
                <div class="legend-item"><div class="legend-color" style="background-color: #ffb74d;"></div>Module</div>
                <div class="legend-item"><div class="legend-color" style="background-color: #f06292;"></div>Tool</div>
                <div class="legend-item"><div class="legend-color" style="background-color: #9575cd;"></div>System</div>
                <div class="legend-item"><div class="legend-color" style="background-color: #90a4ae;"></div>Other</div>
            </div>
            <canvas id="graph-canvas"></canvas>
        </div>
        <div id="details-pane">
            <span class="close-btn" id="close-details">✕</span>
            <div id="details-content"></div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        let nodes = [];
        let links = [];
        let transform = { x: 0, y: 0, scale: 1 };
        let physicsEnabled = true;
        let selectedNode = null;

        const canvas = document.getElementById('graph-canvas');
        const ctx = canvas.getContext('2d');
        const detailsPane = document.getElementById('details-pane');
        const searchBox = document.getElementById('search-box');

        // Color mapping for entity types
        const typeColors = {
            'Service': '#4fc3f7',
            'service': '#4fc3f7',
            'Feature': '#81c784',
            'feature': '#81c784',
            'Module': '#ffb74d',
            'module': '#ffb74d',
            'Tool': '#f06292',
            'tool': '#f06292',
            'System': '#9575cd',
            'system': '#9575cd',
            'unknown': '#90a4ae',
            'other': '#90a4ae'
        };

        function resizeCanvas() {
            const container = document.getElementById('graph-container');
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            render();
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'updateGraph':
                    updateGraph(message.data);
                    break;
                case 'showEntityDetails':
                    showEntityDetails(message.entity, message.relations);
                    break;
            }
        });

        function updateGraph(data) {
            nodes = data.nodes.map(node => ({
                ...node,
                x: node.x || Math.random() * canvas.width,
                y: node.y || Math.random() * canvas.height,
                vx: 0,
                vy: 0,
                radius: 8
            }));
            
            links = data.links;
            
            if (physicsEnabled) {
                requestAnimationFrame(simulate);
            } else {
                render();
            }
        }

        function simulate() {
            if (!physicsEnabled) {
                render();
                return;
            }

            const alpha = 0.3;
            const linkStrength = 0.5;
            const chargeStrength = -300;
            const centerStrength = 0.05;

            // Apply forces
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                
                // Center force
                node.vx += (canvas.width / 2 - node.x) * centerStrength;
                node.vy += (canvas.height / 2 - node.y) * centerStrength;

                // Repulsion between nodes
                for (let j = i + 1; j < nodes.length; j++) {
                    const other = nodes[j];
                    const dx = other.x - node.x;
                    const dy = other.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = chargeStrength / (dist * dist);
                    
                    node.vx -= (dx / dist) * force;
                    node.vy -= (dy / dist) * force;
                    other.vx += (dx / dist) * force;
                    other.vy += (dy / dist) * force;
                }
            }

            // Link forces
            for (const link of links) {
                const source = nodes.find(n => n.id === link.source);
                const target = nodes.find(n => n.id === link.target);
                
                if (source && target) {
                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const idealDist = 100;
                    const force = (dist - idealDist) * linkStrength;
                    
                    source.vx += (dx / dist) * force;
                    source.vy += (dy / dist) * force;
                    target.vx -= (dx / dist) * force;
                    target.vy -= (dy / dist) * force;
                }
            }

            // Update positions
            for (const node of nodes) {
                node.x += node.vx * alpha;
                node.y += node.vy * alpha;
                node.vx *= 0.8;
                node.vy *= 0.8;
            }

            render();
            requestAnimationFrame(simulate);
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();

            // Apply transform
            ctx.translate(transform.x, transform.y);
            ctx.scale(transform.scale, transform.scale);

            // Draw links
            ctx.strokeStyle = 'rgba(136, 136, 136, 0.4)';
            ctx.lineWidth = 1;
            for (const link of links) {
                const source = nodes.find(n => n.id === link.source);
                const target = nodes.find(n => n.id === link.target);
                
                if (source && target) {
                    ctx.beginPath();
                    ctx.moveTo(source.x, source.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.stroke();
                }
            }

            // Draw nodes
            for (const node of nodes) {
                const color = typeColors[node.type] || typeColors['other'];
                
                ctx.fillStyle = selectedNode === node ? '#ffeb3b' : color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
                ctx.fill();
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw label
                ctx.fillStyle = '#fff';
                ctx.font = '10px var(--vscode-font-family)';
                ctx.textAlign = 'center';
                ctx.fillText(node.name.split('.').pop(), node.x, node.y + node.radius + 12);
            }

            ctx.restore();
        }

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            transform.scale *= 1.2;
            render();
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            transform.scale /= 1.2;
            render();
        });

        document.getElementById('reset-view').addEventListener('click', () => {
            transform = { x: 0, y: 0, scale: 1 };
            render();
        });

        document.getElementById('toggle-physics').addEventListener('click', (e) => {
            physicsEnabled = !physicsEnabled;
            e.target.textContent = 'Physics: ' + (physicsEnabled ? 'ON' : 'OFF');
            if (physicsEnabled) {
                requestAnimationFrame(simulate);
            }
        });

        // Pan functionality
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - transform.x) / transform.scale;
            const y = (e.clientY - rect.top - transform.y) / transform.scale;

            // Check if clicking on a node
            const clickedNode = nodes.find(node => {
                const dx = x - node.x;
                const dy = y - node.y;
                return Math.sqrt(dx * dx + dy * dy) <= node.radius;
            });

            if (clickedNode) {
                selectedNode = clickedNode;
                vscode.postMessage({
                    command: 'entityClicked',
                    entityName: clickedNode.id
                });
                render();
            } else {
                isDragging = true;
                dragStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                transform.x = e.clientX - dragStart.x;
                transform.y = e.clientY - dragStart.y;
                render();
            }
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Search functionality
        searchBox.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (!query) {
                selectedNode = null;
                render();
                return;
            }

            const found = nodes.find(node => 
                node.name.toLowerCase().includes(query) || 
                node.type.toLowerCase().includes(query)
            );

            if (found) {
                selectedNode = found;
                // Center on found node
                transform.x = canvas.width / 2 - found.x * transform.scale;
                transform.y = canvas.height / 2 - found.y * transform.scale;
                render();
            }
        });

        // Close details pane
        document.getElementById('close-details').addEventListener('click', () => {
            detailsPane.classList.remove('visible');
            selectedNode = null;
            render();
        });

        function showEntityDetails(entity, relations) {
            if (!entity) return;

            const content = document.getElementById('details-content');
            content.innerHTML = \`
                <h3>\${entity.name}</h3>
                <div class="detail-section">
                    <div class="detail-label">Type</div>
                    <div class="detail-value">\${entity.entityType || 'Unknown'}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Observations</div>
                    <ul>
                        \${(entity.observations || []).map(obs => \`<li>\${obs}</li>\`).join('')}
                    </ul>
                </div>
                \${relations.length > 0 ? \`
                    <div class="detail-section">
                        <div class="detail-label">Relations</div>
                        <ul>
                            \${relations.map(rel => \`<li>\${rel}</li>\`).join('')}
                        </ul>
                    </div>
                \` : ''}
            \`;
            
            detailsPane.classList.add('visible');
        }

        // Request initial data
        vscode.postMessage({ command: 'getGraphData' });
    </script>
</body>
</html>`;
    }
}
exports.KnowledgeGraphProvider = KnowledgeGraphProvider;
//# sourceMappingURL=KnowledgeGraphProvider.js.map