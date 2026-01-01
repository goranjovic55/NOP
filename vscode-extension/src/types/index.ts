export interface WorkflowLog {
    filename: string;
    timestamp: string;
    task: string;
    agent: string;
    status: string;
    summary: string;
    decisions: Decision[];
    tools: ToolUsage[];
    delegations: Delegation[];
    files: string[];
}

export interface Decision {
    description: string;
    rationale: string;
    alternatives?: string[];
}

export interface ToolUsage {
    tool: string;
    calls: number;
    purpose: string;
}

export interface Delegation {
    agent: string;
    task: string;
    result: string;
}

export interface KnowledgeEntity {
    type: string;
    name: string;
    entityType: string;
    observations: string[];
}

export interface WorkflowNode {
    id: string;
    phase: string;
    progress: string;
    timestamp?: string;
    children?: WorkflowNode[];
}
