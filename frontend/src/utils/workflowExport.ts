/**
 * Workflow Export/Import Utilities
 */

import { WorkflowNode, WorkflowEdge, Workflow } from '../types/workflow';

export interface ExportedWorkflow {
  version: '1.0';
  exportedAt: string;
  workflow: {
    id?: string;
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    variables?: Record<string, any>;
  };
}

/**
 * Export workflow to JSON file
 */
export function exportWorkflow(
  name: string,
  description: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  variables?: Record<string, any>,
  workflowId?: string
): void {
  const data: ExportedWorkflow = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    workflow: {
      id: workflowId,
      name,
      description,
      nodes: nodes.map(n => ({
        ...n,
        selected: false,
        dragging: false,
      })),
      edges: edges.map(e => ({
        ...e,
        selected: false,
      })),
      variables: variables || {},
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import workflow from JSON file
 */
export async function importWorkflow(file: File): Promise<ExportedWorkflow> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as ExportedWorkflow;
        
        // Validate structure
        if (!data.version || !data.workflow) {
          throw new Error('Invalid workflow file format');
        }
        
        if (!data.workflow.nodes || !Array.isArray(data.workflow.nodes)) {
          throw new Error('Invalid workflow: missing nodes');
        }
        
        if (!data.workflow.edges || !Array.isArray(data.workflow.edges)) {
          throw new Error('Invalid workflow: missing edges');
        }
        
        // Validate nodes have required fields
        for (const node of data.workflow.nodes) {
          if (!node.id || !node.type || !node.position || !node.data) {
            throw new Error(`Invalid node: ${node.id || 'unknown'}`);
          }
        }
        
        resolve(data);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse workflow file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Generate new IDs for imported workflow to avoid conflicts
 */
export function regenerateIds(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const timestamp = Date.now();
  const idMap: Record<string, string> = {};
  
  // Create new node IDs
  const newNodes = nodes.map((node, index) => {
    const newId = `node-${timestamp}-${index}`;
    idMap[node.id] = newId;
    
    return {
      ...node,
      id: newId,
      selected: false,
    };
  });
  
  // Update edge references
  const newEdges = edges.map((edge, index) => ({
    ...edge,
    id: `edge-${timestamp}-${index}`,
    source: idMap[edge.source] || edge.source,
    target: idMap[edge.target] || edge.target,
    selected: false,
  }));
  
  return { nodes: newNodes, edges: newEdges };
}

/**
 * Create file input and trigger import
 */
export function triggerImport(): Promise<ExportedWorkflow> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      try {
        const data = await importWorkflow(file);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    input.click();
  });
}

/**
 * Validate workflow before execution
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (nodes.length === 0) {
    errors.push('Workflow has no nodes');
  }
  
  // Check for start node
  const hasStart = nodes.some(n => n.type === 'start');
  if (!hasStart) {
    errors.push('Workflow must have a Start node');
  }
  
  // Check for end node
  const hasEnd = nodes.some(n => n.type === 'end');
  if (!hasEnd) {
    errors.push('Workflow must have an End node');
  }
  
  // Check for orphan nodes (except start)
  const connectedNodes = new Set<string>();
  edges.forEach(e => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });
  
  const orphans = nodes.filter(
    n => n.type !== 'start' && !connectedNodes.has(n.id)
  );
  
  if (orphans.length > 0) {
    errors.push(`Disconnected nodes: ${orphans.map(n => n.data.label).join(', ')}`);
  }
  
  // Check for nodes with missing required config
  for (const node of nodes) {
    const type = node.data.type;
    const params = node.data.parameters;
    
    // SSH command nodes need host and command
    if (type === 'command.ssh_execute') {
      if (!params?.host || !params?.command) {
        errors.push(`SSH node "${node.data.label}" missing host or command`);
      }
    }
    // Condition nodes need expression
    if (type === 'control.condition') {
      if (!params?.expression) {
        errors.push(`Condition node "${node.data.label}" missing expression`);
      }
    }
    // Loop nodes need collection
    if (type === 'control.loop') {
      if (!params?.collection) {
        errors.push(`Loop node "${node.data.label}" missing collection`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
