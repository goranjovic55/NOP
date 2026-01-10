"""
Workflow Executor Service

Executes compiled workflow DAGs with real-time progress tracking
and result collection.
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import uuid
import traceback

from .workflow_compiler import CompiledDAG, CompiledNode, NodeType
from .control_flow import (
    ControlFlowExecutor,
    ExpressionEvaluator,
    ExecutionContext as ControlFlowContext,
    LoopContext,
)


logger = logging.getLogger(__name__)


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILURE = "failure"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"
    PAUSED = "paused"


@dataclass
class NodeResult:
    """Result of executing a single node."""
    node_id: str
    status: ExecutionStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    output: Any = None
    error: Optional[str] = None
    duration_ms: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodeId": self.node_id,
            "status": self.status.value,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
            "output": self.output,
            "error": self.error,
            "durationMs": self.duration_ms,
        }


@dataclass
class ExecutionContext:
    """Context passed through workflow execution."""
    execution_id: str
    workflow_id: str
    variables: Dict[str, Any] = field(default_factory=dict)
    node_results: Dict[str, NodeResult] = field(default_factory=dict)
    node_outputs: Dict[str, Any] = field(default_factory=dict)  # For expression evaluation
    current_node_id: Optional[str] = None
    previous_output: Any = None
    loop_stack: List[LoopContext] = field(default_factory=list)
    credentials: Dict[str, Dict[str, str]] = field(default_factory=dict)
    environment: Dict[str, str] = field(default_factory=dict)
    
    def get_var(self, name: str, default: Any = None) -> Any:
        return self.variables.get(name, default)
    
    def set_var(self, name: str, value: Any) -> None:
        self.variables[name] = value
    
    def get_node_output(self, node_id: str) -> Any:
        result = self.node_results.get(node_id)
        return result.output if result else None
    
    @property
    def current_loop(self) -> Optional[LoopContext]:
        return self.loop_stack[-1] if self.loop_stack else None
    
    def push_loop(self, loop: LoopContext) -> None:
        self.loop_stack.append(loop)
    
    def pop_loop(self) -> Optional[LoopContext]:
        return self.loop_stack.pop() if self.loop_stack else None
    
    def get_previous_output(self, node_id: Optional[str] = None) -> Any:
        if node_id:
            return self.node_outputs.get(node_id)
        return self.previous_output


@dataclass
class ExecutionState:
    """Overall execution state."""
    execution_id: str
    workflow_id: str
    status: ExecutionStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    current_level: int = 0
    total_levels: int = 0
    node_states: Dict[str, ExecutionStatus] = field(default_factory=dict)
    node_results: Dict[str, NodeResult] = field(default_factory=dict)
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "executionId": self.execution_id,
            "workflowId": self.workflow_id,
            "status": self.status.value,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
            "currentLevel": self.current_level,
            "totalLevels": self.total_levels,
            "nodeStates": {k: v.value for k, v in self.node_states.items()},
            "nodeResults": {k: v.to_dict() for k, v in self.node_results.items()},
            "error": self.error,
        }


# Type for event callbacks
EventCallback = Callable[[str, Dict[str, Any]], Awaitable[None]]


class WorkflowExecutor:
    """
    Executes workflows with support for:
    - Parallel node execution at each level
    - Real-time progress updates
    - Pause/resume/cancel
    - Variable passing between nodes
    - Condition/loop handling
    """
    
    def __init__(
        self,
        block_executor: Optional[Callable[[CompiledNode, ExecutionContext], Awaitable[NodeResult]]] = None
    ):
        self.block_executor = block_executor or self._default_block_executor
        self._active_executions: Dict[str, ExecutionState] = {}
        self._cancelled: set = set()
        self._paused: set = set()
        self._event_callbacks: Dict[str, List[EventCallback]] = {}
    
    async def execute(
        self,
        dag: CompiledDAG,
        workflow_id: str,
        initial_variables: Optional[Dict[str, Any]] = None,
        on_event: Optional[EventCallback] = None,
    ) -> ExecutionState:
        """
        Execute a compiled DAG.
        
        Args:
            dag: The compiled workflow DAG
            workflow_id: ID of the workflow being executed
            initial_variables: Initial variable values
            on_event: Callback for execution events
            
        Returns:
            Final execution state
        """
        if not dag.is_valid:
            raise ValueError(f"Cannot execute invalid DAG: {[e.message for e in dag.errors]}")
        
        execution_id = str(uuid.uuid4())
        
        # Initialize state
        state = ExecutionState(
            execution_id=execution_id,
            workflow_id=workflow_id,
            status=ExecutionStatus.RUNNING,
            started_at=datetime.utcnow(),
            total_levels=len(dag.execution_order),
            node_states={node_id: ExecutionStatus.PENDING for node_id in dag.nodes},
        )
        
        self._active_executions[execution_id] = state
        
        # Initialize context
        context = ExecutionContext(
            execution_id=execution_id,
            workflow_id=workflow_id,
            variables=initial_variables or {},
        )
        
        try:
            await self._emit_event(on_event, "execution_started", {
                "executionId": execution_id,
                "workflowId": workflow_id,
                "totalLevels": state.total_levels,
            })
            
            # Execute level by level
            for level_idx, level_nodes in enumerate(dag.execution_order):
                if execution_id in self._cancelled:
                    state.status = ExecutionStatus.CANCELLED
                    break
                
                # Handle pause
                while execution_id in self._paused:
                    await asyncio.sleep(0.5)
                    if execution_id in self._cancelled:
                        state.status = ExecutionStatus.CANCELLED
                        break
                
                if state.status == ExecutionStatus.CANCELLED:
                    break
                
                state.current_level = level_idx
                
                await self._emit_event(on_event, "level_started", {
                    "executionId": execution_id,
                    "level": level_idx,
                    "nodes": level_nodes,
                })
                
                # Execute nodes at this level in parallel
                results = await self._execute_level(
                    dag, level_nodes, context, state, on_event
                )
                
                # Check for failures
                failed_nodes = [
                    node_id for node_id, result in results.items()
                    if result.status == ExecutionStatus.FAILURE
                ]
                
                if failed_nodes:
                    # For now, fail fast on first error
                    # TODO: Add error handling modes (continue, retry, etc.)
                    state.status = ExecutionStatus.FAILURE
                    state.error = f"Nodes failed: {', '.join(failed_nodes)}"
                    break
                
                await self._emit_event(on_event, "level_completed", {
                    "executionId": execution_id,
                    "level": level_idx,
                    "results": {k: v.to_dict() for k, v in results.items()},
                })
            
            if state.status == ExecutionStatus.RUNNING:
                state.status = ExecutionStatus.SUCCESS
            
        except Exception as e:
            logger.exception(f"Execution failed: {e}")
            state.status = ExecutionStatus.FAILURE
            state.error = str(e)
            
        finally:
            state.completed_at = datetime.utcnow()
            state.node_results = context.node_results
            
            await self._emit_event(on_event, "execution_completed", {
                "executionId": execution_id,
                "status": state.status.value,
                "duration": (state.completed_at - state.started_at).total_seconds() * 1000
                if state.started_at else 0,
            })
            
            # Cleanup
            self._cancelled.discard(execution_id)
            self._paused.discard(execution_id)
            if execution_id in self._active_executions:
                del self._active_executions[execution_id]
        
        return state
    
    async def _execute_level(
        self,
        dag: CompiledDAG,
        node_ids: List[str],
        context: ExecutionContext,
        state: ExecutionState,
        on_event: Optional[EventCallback],
    ) -> Dict[str, NodeResult]:
        """Execute all nodes at a single level in parallel."""
        tasks = []
        
        for node_id in node_ids:
            node = dag.nodes.get(node_id)
            if not node:
                continue
            
            # Check if dependencies are satisfied
            deps_satisfied = all(
                context.node_results.get(dep_id, NodeResult(dep_id, ExecutionStatus.PENDING)).status == ExecutionStatus.SUCCESS
                for dep_id in node.dependencies
            )
            
            if not deps_satisfied:
                # Skip this node if dependencies failed
                result = NodeResult(
                    node_id=node_id,
                    status=ExecutionStatus.SKIPPED,
                )
                context.node_results[node_id] = result
                state.node_states[node_id] = ExecutionStatus.SKIPPED
                continue
            
            tasks.append(self._execute_node(node, context, state, on_event))
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Node execution error: {result}")
                elif isinstance(result, NodeResult):
                    context.node_results[result.node_id] = result
        
        return {node_id: context.node_results.get(node_id, NodeResult(node_id, ExecutionStatus.PENDING))
                for node_id in node_ids}
    
    async def _execute_node(
        self,
        node: CompiledNode,
        context: ExecutionContext,
        state: ExecutionState,
        on_event: Optional[EventCallback],
    ) -> NodeResult:
        """Execute a single node."""
        state.node_states[node.id] = ExecutionStatus.RUNNING
        context.current_node_id = node.id
        
        await self._emit_event(on_event, "node_started", {
            "executionId": context.execution_id,
            "nodeId": node.id,
            "nodeType": node.type,
            "nodeLabel": node.label,
        })
        
        started_at = datetime.utcnow()
        
        try:
            # Create expression evaluator for this context
            cf_context = ControlFlowContext(
                variables=context.variables,
                node_outputs=context.node_outputs,
                loop_stack=context.loop_stack,
                credentials=context.credentials,
                environment=context.environment,
            )
            evaluator = ExpressionEvaluator(cf_context)
            
            # Evaluate parameters with expressions
            evaluated_params = {}
            for key, value in node.parameters.items():
                if isinstance(value, str) and '{{' in value:
                    evaluated_params[key] = evaluator.evaluate(value)
                else:
                    evaluated_params[key] = value
            
            # Handle control flow nodes specially
            if node.type == NodeType.START:
                result = NodeResult(
                    node_id=node.id,
                    status=ExecutionStatus.SUCCESS,
                    started_at=started_at,
                    completed_at=datetime.utcnow(),
                    output={"message": "Workflow started"},
                )
            elif node.type == NodeType.END:
                result = NodeResult(
                    node_id=node.id,
                    status=ExecutionStatus.SUCCESS,
                    started_at=started_at,
                    completed_at=datetime.utcnow(),
                    output={"message": "Workflow completed"},
                )
            elif node.type == NodeType.DELAY:
                delay_ms = evaluated_params.get("delay", 1000)
                await asyncio.sleep(delay_ms / 1000.0)
                result = NodeResult(
                    node_id=node.id,
                    status=ExecutionStatus.SUCCESS,
                    started_at=started_at,
                    completed_at=datetime.utcnow(),
                    output={"delayed": delay_ms},
                )
            elif node.type == NodeType.CONDITION:
                # Evaluate condition expression
                expression = evaluated_params.get("expression", "true")
                condition_result = evaluator.evaluate_condition(expression)
                output_handle = "true" if condition_result else "false"
                result = NodeResult(
                    node_id=node.id,
                    status=ExecutionStatus.SUCCESS,
                    started_at=started_at,
                    completed_at=datetime.utcnow(),
                    output={
                        "expression": expression,
                        "result": condition_result,
                        "route": output_handle,
                    },
                )
            elif node.type == NodeType.LOOP:
                # Handle loop - returns iteration info
                mode = evaluated_params.get("mode", "count")
                if mode == "count":
                    count = int(evaluated_params.get("count", 5))
                    items = list(range(count))
                else:
                    array_expr = evaluated_params.get("array", "[]")
                    items = evaluator.evaluate(array_expr)
                    if not isinstance(items, list):
                        items = [items] if items else []
                
                result = NodeResult(
                    node_id=node.id,
                    status=ExecutionStatus.SUCCESS,
                    started_at=started_at,
                    completed_at=datetime.utcnow(),
                    output={
                        "mode": mode,
                        "iterations": len(items),
                        "items": items,
                        "route": "iteration" if items else "complete",
                    },
                )
            elif node.type == NodeType.PARALLEL:
                # Parallel block just signals parallel execution
                result = NodeResult(
                    node_id=node.id,
                    status=ExecutionStatus.SUCCESS,
                    started_at=started_at,
                    completed_at=datetime.utcnow(),
                    output={"parallel": True, "branches": 3},
                )
            elif node.type == NodeType.VARIABLE_SET:
                var_name = evaluated_params.get("name", "")
                var_value = evaluated_params.get("value", "")
                context.set_var(var_name, var_value)
                result = NodeResult(
                    node_id=node.id,
                    status=ExecutionStatus.SUCCESS,
                    started_at=started_at,
                    completed_at=datetime.utcnow(),
                    output={"variable": var_name, "value": var_value},
                )
            elif node.type == NodeType.VARIABLE_GET:
                var_name = evaluated_params.get("name", "")
                var_value = context.get_var(var_name)
                result = NodeResult(
                    node_id=node.id,
                    status=ExecutionStatus.SUCCESS,
                    started_at=started_at,
                    completed_at=datetime.utcnow(),
                    output={"variable": var_name, "value": var_value},
                )
            else:
                # Execute block via block executor with evaluated params
                node_with_evaluated = CompiledNode(
                    id=node.id,
                    type=node.type,
                    category=node.category,
                    label=node.label,
                    parameters=evaluated_params,
                    level=node.level,
                    dependencies=node.dependencies,
                    dependents=node.dependents,
                    output_handles=node.output_handles,
                )
                result = await self.block_executor(node_with_evaluated, context)
                result.started_at = started_at
                result.completed_at = datetime.utcnow()
            
            result.duration_ms = int(
                (result.completed_at - started_at).total_seconds() * 1000
            ) if result.completed_at else 0
            
        except Exception as e:
            logger.exception(f"Node {node.id} execution failed: {e}")
            result = NodeResult(
                node_id=node.id,
                status=ExecutionStatus.FAILURE,
                started_at=started_at,
                completed_at=datetime.utcnow(),
                error=str(e),
            )
            result.duration_ms = int(
                (result.completed_at - started_at).total_seconds() * 1000
            )
        
        # Update state
        state.node_states[node.id] = result.status
        context.node_results[node.id] = result
        context.node_outputs[node.id] = result.output  # Store for expression evaluation
        context.previous_output = result.output
        
        await self._emit_event(on_event, "node_completed", {
            "executionId": context.execution_id,
            "nodeId": node.id,
            "status": result.status.value,
            "durationMs": result.duration_ms,
            "output": result.output,
            "error": result.error,
        })
        
        return result
    
    async def _default_block_executor(
        self,
        node: CompiledNode,
        context: ExecutionContext
    ) -> NodeResult:
        """Default block executor - simulates execution."""
        # In production, this would call actual APIs
        await asyncio.sleep(0.1)  # Simulate some work
        
        return NodeResult(
            node_id=node.id,
            status=ExecutionStatus.SUCCESS,
            output={
                "simulated": True,
                "type": node.type,
                "parameters": node.parameters,
            },
        )
    
    async def _emit_event(
        self,
        callback: Optional[EventCallback],
        event_type: str,
        data: Dict[str, Any]
    ) -> None:
        """Emit an event to the callback."""
        if callback:
            try:
                await callback(event_type, data)
            except Exception as e:
                logger.error(f"Event callback error: {e}")
    
    def pause(self, execution_id: str) -> bool:
        """Pause an active execution."""
        if execution_id in self._active_executions:
            self._paused.add(execution_id)
            return True
        return False
    
    def resume(self, execution_id: str) -> bool:
        """Resume a paused execution."""
        if execution_id in self._paused:
            self._paused.discard(execution_id)
            return True
        return False
    
    def cancel(self, execution_id: str) -> bool:
        """Cancel an active execution."""
        if execution_id in self._active_executions:
            self._cancelled.add(execution_id)
            self._paused.discard(execution_id)  # Unpause if paused
            return True
        return False
    
    def get_state(self, execution_id: str) -> Optional[ExecutionState]:
        """Get the current state of an execution."""
        return self._active_executions.get(execution_id)
    
    def list_active(self) -> List[str]:
        """List all active execution IDs."""
        return list(self._active_executions.keys())
