import * as vscode from 'vscode';
import * as path from 'path';
import { KnowledgeParser } from '../parsers/KnowledgeParser';
import { RefreshableProvider } from '../watchers/WorkflowWatcher';

export class KnowledgeViewProvider implements vscode.WebviewViewProvider, RefreshableProvider {
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
        const knowledgePath = path.join(
            this.workspaceFolder.uri.fsPath,
            config.get<string>('knowledgeFilePath', 'project_knowledge.json')
        );

        const entities = KnowledgeParser.parseKnowledgeFile(knowledgePath);
        const grouped = KnowledgeParser.groupEntitiesByType(entities);
        const relationships = KnowledgeParser.extractRelationships(entities);

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
        }
        #graph {
            width: 100%;
            height: 400px;
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
    ${entities.length > 0 ? `
        <div class="controls">
            <button class="control-button" onclick="resetZoom()">Reset View</button>
            <button class="control-button" onclick="window.open('https://memviz.anthropic.com/', '_blank')">Open Memviz</button>
        </div>
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
    ` : '<div class="no-data">No knowledge data found. Check project_knowledge.json path.</div>'}
    
    <script>
        const graphData = ${JSON.stringify(graphData)};
        
        if (graphData.nodes.length > 0) {
            const svg = d3.select("#graph");
            const width = svg.node().getBoundingClientRect().width;
            const height = 400;
            
            svg.attr("viewBox", [0, 0, width, height]);
            
            const simulation = d3.forceSimulation(graphData.nodes)
                .force("link", d3.forceLink(graphData.links).id(d => d.id).distance(80))
                .force("charge", d3.forceManyBody().strength(-200))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collision", d3.forceCollide().radius(30));
            
            const link = svg.append("g")
                .selectAll("line")
                .data(graphData.links)
                .join("line")
                .attr("class", "link");
            
            const node = svg.append("g")
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
                simulation.alpha(1).restart();
            };
        }
    </script>
</body>
</html>`;
    }

    private generateGraphData(entities: any[], relationships: any[]): any {
        const nodes = entities.slice(0, 50).map(entity => ({
            id: entity.name,
            label: entity.name.split('.').pop() || entity.name.substring(0, 20),
            tooltip: entity.name,
            size: 8 + (entity.observations?.length || 0),
            color: this.getColorByType(entity.entityType)
        }));

        const links = relationships.slice(0, 100).map(rel => ({
            source: rel.source,
            target: rel.target,
            type: rel.type
        }));

        return { nodes, links };
    }

    private getColorByType(type: string): string {
        const colorMap: { [key: string]: string } = {
            'file': '#22c55e',
            'system': '#06b6d4',
            'module': '#8b5cf6',
            'feature': '#f59e0b',
            'service': '#ec4899',
            'component': '#3b82f6'
        };
        return colorMap[type] || '#6b7280';
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
