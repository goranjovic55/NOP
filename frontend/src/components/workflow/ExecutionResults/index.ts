/**
 * ExecutionResults - Workflow execution visualization components
 * 
 * Components for displaying workflow execution results with the 3-output model:
 * - WorkflowExecutionTree: Main tree visualization with pass/fail/output badges
 * - ExecutionSummary: Summary dashboard (planned)
 * - ExecutionNode: Single node display (planned)
 * - LoopIterations: Loop iteration handler (planned)
 */

export { WorkflowExecutionTree } from './WorkflowExecutionTree';
export { default as WorkflowExecutionTreeDefault } from './WorkflowExecutionTree';

// Re-export types for convenience
export type {
  ExecutionResult,
  ExecutionNode,
  ExecutionMetrics,
  NodeStatus,
  BlockOutputs,
} from '../../../types/executionResults';
