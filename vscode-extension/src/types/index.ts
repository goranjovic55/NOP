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
    phases: Phase[];
    skills: string[];
}

export interface Phase {
    phase: string;
    progress: string;
    timestamp?: string;
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

export interface LiveSession {
    isActive: boolean;
    task: string;
    phase: string;
    progress: string;
    agent: string;
    decisions: string[];
    emissions: SessionEmission[];
    startTime: Date;
    lastUpdate: Date;
}

export interface SessionEmission {
    timestamp: Date;
    type: 'PHASE' | 'DECISION' | 'DELEGATE' | 'TOOL' | 'SKILL' | 'SESSION' | 'COMPLETE';
    content: string;
}
