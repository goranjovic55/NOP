/**
 * Workflow API Client
 */

import {
  Workflow,
  WorkflowCreate,
  WorkflowUpdate,
  WorkflowExecution,
  ExecutionOptions,
  CompileResult,
} from '../types/workflow';

const API_BASE = '/api/v1/workflows';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const workflowApi = {
  // List all workflows
  async list(params?: { status?: string; category?: string }): Promise<{ workflows: Workflow[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    
    const response = await fetch(`${API_BASE}?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get single workflow
  async get(id: string): Promise<Workflow> {
    const response = await fetch(`${API_BASE}/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Create workflow
  async create(data: WorkflowCreate): Promise<Workflow> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Update workflow
  async update(id: string, data: WorkflowUpdate): Promise<Workflow> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Delete workflow
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete workflow');
    }
  },

  // Compile workflow (validate DAG)
  async compile(id: string): Promise<CompileResult> {
    const response = await fetch(`${API_BASE}/${id}/compile`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Start execution
  async execute(id: string, options?: ExecutionOptions): Promise<WorkflowExecution> {
    const response = await fetch(`${API_BASE}/${id}/execute`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(options || {}),
    });
    return handleResponse(response);
  },

  // List executions
  async listExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    const response = await fetch(`${API_BASE}/${workflowId}/executions`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Get execution details
  async getExecution(workflowId: string, executionId: string): Promise<WorkflowExecution> {
    const response = await fetch(`${API_BASE}/${workflowId}/executions/${executionId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Cancel execution
  async cancelExecution(workflowId: string, executionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${workflowId}/executions/${executionId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to cancel execution');
    }
  },
};
