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
exports.KnowledgeViewProvider = void 0;
const path = __importStar(require("path"));
const KnowledgeParser_1 = require("../parsers/KnowledgeParser");
class KnowledgeViewProvider {
    constructor(extensionUri, workspaceFolder) {
        this.extensionUri = extensionUri;
        this.workspaceFolder = workspaceFolder;
        this.knowledgeSource = 'project';
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
                case 'switchKnowledge':
                    this.knowledgeSource = message.source;
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
        const knowledgeFilename = this.knowledgeSource === 'global' ? '.github/global_knowledge.json' : 'project_knowledge.json';
        const knowledgePath = path.join(this.workspaceFolder.uri.fsPath, knowledgeFilename);
        const entities = KnowledgeParser_1.KnowledgeParser.parseKnowledgeFile(knowledgePath);
        const grouped = KnowledgeParser_1.KnowledgeParser.groupEntitiesByType(entities);
        const relationships = KnowledgeParser_1.KnowledgeParser.extractRelationships(entities);
        // Generate D3 force graph data
        const graphData = this.generateGraphData(entities, relationships);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Graph</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            margin: 0;
            overflow: hidden;
        }
        .controls {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
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
        #graph {
            width: 100%;
            height: 400px;
            background: var(--vscode-editor-background);
        }
        .node {
            cursor: pointer;
        }
        .node circle {
            stroke: #22c55e;
            stroke-width: 2px;
        }
        .node text {
            font-size: 10px;
            fill: var(--vscode-foreground);
            pointer-events: none;
        }
        .link {
            stroke: #06b6d4;
            stroke-opacity: 0.6;
            stroke-width: 1.5px;
        }
        .entity-stats {
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
        }
        .stat-label {
            color: var(--vscode-charts-green);
        }
        .stat-value {
            color: var(--vscode-descriptionForeground);
        }
        .no-data {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        .controls {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .control-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            margin: 0 4px;
            cursor: pointer;
            border-radius: 2px;
        }
        .control-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="controls">
        <button class="btn ${this.knowledgeSource === 'project' ? 'active' : ''}" onclick="switchSource('project')">Project Knowledge</button>
        <button class="btn ${this.knowledgeSource === 'global' ? 'active' : ''}" onclick="switchSource('global')">Global Knowledge</button>
        <button class="btn" onclick="resetZoom()">Reset View</button>
    </div>
    
    ${entities.length > 0 ? `
        <svg id="graph"></svg>
        <div class="entity-stats">
            <h3>Knowledge Statistics</h3>
            ${Array.from(grouped.entries()).map(([type, ents]) => `
                <div class="stat-item">
                    <span class="stat-label">${this.escapeHtml(type)}</span>
                    <span class="stat-value">${ents.length}</span>
                </div>
            `).join('')}
            <div class="stat-item">
                <span class="stat-label">Total Entities</span>
                <span class="stat-value">${entities.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Relationships</span>
                <span class="stat-value">${relationships.length}</span>
            </div>
        </div>
    ` : `<div class="no-data">No knowledge data found in ${knowledgeFilename}. Check file path.</div>`}
    
    <script>
        const vscode = acquireVsCodeApi();
        const graphData = ${JSON.stringify(graphData)};
        let simulation;

        function switchSource(source) {
            vscode.postMessage({ command: 'switchKnowledge', source: source });
        }

        function resetZoom() {
            if (simulation) {
                simulation.alpha(1).restart();
            }
        }
        
        if (graphData.nodes.length > 0) {
            const svg = d3.select("#graph");
            const container = svg.node().parentElement;
            const width = container.clientWidth;
            const height = 400;
            
            svg.attr("width", width).attr("height", height);
            svg.selectAll("*").remove();
            
            // Add zoom behavior
            const zoom = d3.zoom()
                .scaleExtent([0.1, 10])
                .on("zoom", (event) => {
                    g.attr("transform", event.transform);
                });
            
            svg.call(zoom);
            
            simulation = d3.forceSimulation(graphData.nodes)
                .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(100))
                .force("charge", d3.forceManyBody().strength(-300))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collision", d3.forceCollide().radius(35));
            
            const g = svg.append("g");
            
            const link = g.append("g")
                .selectAll("line")
                .data(graphData.links)
                .join("line")
                .attr("class", "link");
            
            const node = g.append("g")
                .selectAll("g")
                .data(graphData.nodes)
                .join("g")
                .attr("class", "node")
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));
            
            node.append("circle")
                .attr("r", d => d.size || 8)
                .attr("fill", d => d.color || "#22c55e");
            
            node.append("text")
                .text(d => d.label)
                .attr("x", 12)
                .attr("y", 4);
            
            node.append("title")
                .text(d => d.tooltip || d.label);
            
            simulation.on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);
                
                node.attr("transform", d => \`translate(\${d.x},\${d.y})\`);
            });
            
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }
            
            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }
            
            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
            
            window.resetZoom = function() {
                svg.transition().duration(750).call(
                    zoom.transform,
                    d3.zoomIdentity
                );
                simulation.alpha(1).restart();
            };
        }
    </script>
</body>
</html>`;
    }
    generateGraphData(entities, relationships) {
        // Limit to 100 entities for performance
        const limitedEntities = entities.slice(0, 100);
        const nodes = limitedEntities.map(entity => ({
            id: entity.name,
            label: entity.name.split('.').pop() || entity.name.substring(0, 20),
            tooltip: `${entity.name}\nType: ${entity.entityType}\nObservations: ${entity.observations?.length || 0}`,
            size: 8 + Math.min((entity.observations?.length || 0) * 2, 20),
            color: this.getColorByType(entity.entityType)
        }));
        // Create a set of valid node IDs
        const nodeIds = new Set(nodes.map(n => n.id));
        // Filter links to only include those where both source and target exist
        const validLinks = relationships
            .filter(rel => nodeIds.has(rel.source) && nodeIds.has(rel.target))
            .slice(0, 150)
            .map(rel => ({
            source: rel.source,
            target: rel.target,
            type: rel.type || 'relates'
        }));
        // If no valid links, create a simple hierarchy from entity names
        if (validLinks.length === 0 && nodes.length > 1) {
            const hierarchyLinks = [];
            const grouped = new Map();
            // Group by prefix (e.g., "NOP.Backend" -> "NOP")
            nodes.forEach(node => {
                const parts = node.id.split('.');
                if (parts.length > 1) {
                    const prefix = parts[0];
                    if (!grouped.has(prefix)) {
                        grouped.set(prefix, []);
                    }
                    grouped.get(prefix).push(node);
                }
            });
            // Create links within groups
            grouped.forEach((groupNodes, prefix) => {
                for (let i = 1; i < groupNodes.length; i++) {
                    hierarchyLinks.push({
                        source: groupNodes[0].id,
                        target: groupNodes[i].id,
                        type: 'hierarchy'
                    });
                }
            });
            return { nodes, links: hierarchyLinks };
        }
        return { nodes, links: validLinks };
    }
    getColorByType(type) {
        const colorMap = {
            'file': '#22c55e',
            'system': '#06b6d4',
            'module': '#8b5cf6',
            'feature': '#f59e0b',
            'service': '#ec4899',
            'component': '#3b82f6'
        };
        return colorMap[type] || '#6b7280';
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
exports.KnowledgeViewProvider = KnowledgeViewProvider;
//# sourceMappingURL=KnowledgeViewProvider.js.map