"""
Control Flow Execution Service

Handles special control flow blocks: Condition, Loop, Parallel
with expression evaluation and context management.
"""

import re
import json
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ExpressionError(Exception):
    """Raised when expression evaluation fails."""
    pass


@dataclass
class LoopContext:
    """Context for loop iteration."""
    index: int
    item: Any
    total: int
    is_first: bool
    is_last: bool
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "item": self.item,
            "total": self.total,
            "isFirst": self.is_first,
            "isLast": self.is_last,
        }


@dataclass  
class ExecutionContext:
    """Extended execution context with control flow support."""
    variables: Dict[str, Any] = field(default_factory=dict)
    node_outputs: Dict[str, Any] = field(default_factory=dict)
    loop_stack: List[LoopContext] = field(default_factory=list)
    credentials: Dict[str, Dict[str, str]] = field(default_factory=dict)
    environment: Dict[str, str] = field(default_factory=dict)
    
    @property
    def current_loop(self) -> Optional[LoopContext]:
        """Get the current (innermost) loop context."""
        return self.loop_stack[-1] if self.loop_stack else None
    
    def push_loop(self, loop: LoopContext) -> None:
        """Push a new loop context onto the stack."""
        self.loop_stack.append(loop)
    
    def pop_loop(self) -> Optional[LoopContext]:
        """Pop the current loop context."""
        return self.loop_stack.pop() if self.loop_stack else None
    
    def get_previous_output(self, node_id: Optional[str] = None) -> Any:
        """Get output from a previous node."""
        if node_id:
            return self.node_outputs.get(node_id)
        # Get the most recent output
        if self.node_outputs:
            return list(self.node_outputs.values())[-1]
        return None


class ExpressionEvaluator:
    """
    Evaluates Mustache-style expressions with context.
    
    Supported patterns:
    - {{ $prev.field }}       - Previous node output
    - {{ $vars.name }}        - Workflow variable
    - {{ $loop.index }}       - Current loop index
    - {{ $loop.item }}        - Current loop item
    - {{ $env.NAME }}         - Environment variable
    - {{ $creds.name.field }} - Credential reference
    - {{ $node.id.field }}    - Specific node output
    
    Supported filters:
    - | trim                  - Remove whitespace
    - | lower                 - Lowercase
    - | upper                 - Uppercase
    - | length                - Array/string length
    - | default('value')      - Default value
    - | json                  - JSON stringify
    - | first                 - First element
    - | last                  - Last element
    """
    
    EXPRESSION_PATTERN = re.compile(r'\{\{\s*(.+?)\s*\}\}')
    FILTER_PATTERN = re.compile(r'\|\s*(\w+)(?:\(([^)]*)\))?')
    
    def __init__(self, context: ExecutionContext):
        self.context = context
    
    def evaluate(self, expression: str) -> Any:
        """
        Evaluate an expression string, replacing all {{ }} patterns.
        
        Returns the evaluated value. If expression contains a single
        {{ }} pattern, returns the actual value (not stringified).
        """
        if not expression:
            return expression
        
        # Check if entire string is a single expression
        match = self.EXPRESSION_PATTERN.fullmatch(expression.strip())
        if match:
            return self._evaluate_single(match.group(1))
        
        # Replace all expressions in the string
        def replace_expr(m: re.Match) -> str:
            result = self._evaluate_single(m.group(1))
            if result is None:
                return ''
            if isinstance(result, (dict, list)):
                return json.dumps(result)
            return str(result)
        
        return self.EXPRESSION_PATTERN.sub(replace_expr, expression)
    
    def evaluate_condition(self, expression: str) -> bool:
        """
        Evaluate an expression as a boolean condition.
        
        Supports:
        - {{ $prev.success }}
        - {{ $vars.count > 5 }}
        - $prev.status == 'ok'
        - true / false
        """
        if not expression:
            return True
        
        expr = expression.strip()
        
        # Handle simple boolean strings
        if expr.lower() in ('true', '1', 'yes'):
            return True
        if expr.lower() in ('false', '0', 'no', ''):
            return False
        
        # Evaluate expression
        result = self.evaluate(expr)
        
        # Convert result to boolean
        if isinstance(result, bool):
            return result
        if isinstance(result, str):
            return result.lower() not in ('false', '0', 'no', '')
        if isinstance(result, (int, float)):
            return result != 0
        if isinstance(result, (list, dict)):
            return len(result) > 0
        
        return bool(result)
    
    def _evaluate_single(self, expr: str) -> Any:
        """Evaluate a single expression (without {{ }})."""
        # Split expression and filters
        parts = expr.split('|')
        base_expr = parts[0].strip()
        filters = parts[1:] if len(parts) > 1 else []
        
        # Evaluate base expression
        value = self._evaluate_base(base_expr)
        
        # Apply filters
        for filter_str in filters:
            value = self._apply_filter(value, filter_str.strip())
        
        return value
    
    def _evaluate_base(self, expr: str) -> Any:
        """Evaluate the base expression (before filters)."""
        # Handle comparison operators
        for op in ['==', '!=', '>=', '<=', '>', '<']:
            if op in expr:
                left, right = expr.split(op, 1)
                left_val = self._evaluate_base(left.strip())
                right_val = self._evaluate_base(right.strip())
                
                # Try to parse right side as literal
                right_val = self._parse_literal(right_val) if isinstance(right_val, str) else right_val
                
                if op == '==':
                    return left_val == right_val
                elif op == '!=':
                    return left_val != right_val
                elif op == '>=':
                    return left_val >= right_val
                elif op == '<=':
                    return left_val <= right_val
                elif op == '>':
                    return left_val > right_val
                elif op == '<':
                    return left_val < right_val
        
        # Handle logical operators
        if ' && ' in expr:
            parts = expr.split(' && ')
            return all(self._evaluate_base(p.strip()) for p in parts)
        if ' || ' in expr:
            parts = expr.split(' || ')
            return any(self._evaluate_base(p.strip()) for p in parts)
        
        # Handle variable references
        if expr.startswith('$'):
            return self._evaluate_variable(expr)
        
        # Handle string literals
        if (expr.startswith("'") and expr.endswith("'")) or \
           (expr.startswith('"') and expr.endswith('"')):
            return expr[1:-1]
        
        # Handle numeric literals
        try:
            if '.' in expr:
                return float(expr)
            return int(expr)
        except ValueError:
            pass
        
        # Return as-is
        return expr
    
    def _evaluate_variable(self, expr: str) -> Any:
        """Evaluate a variable reference like $prev.field or $vars.name."""
        parts = expr.split('.')
        root = parts[0]
        path = parts[1:] if len(parts) > 1 else []
        
        # Get root value
        if root == '$prev':
            value = self.context.get_previous_output()
        elif root == '$vars':
            value = self.context.variables
        elif root == '$loop':
            loop = self.context.current_loop
            value = loop.to_dict() if loop else {}
        elif root == '$env':
            value = self.context.environment
        elif root == '$creds':
            value = self.context.credentials
        elif root.startswith('$node'):
            # $node.nodeId.field
            if len(parts) >= 2:
                node_id = parts[1]
                value = self.context.node_outputs.get(node_id, {})
                path = parts[2:]
            else:
                value = self.context.node_outputs
                path = []
        else:
            return expr  # Unknown variable type
        
        # Navigate path
        for key in path:
            if value is None:
                return None
            if isinstance(value, dict):
                value = value.get(key)
            elif isinstance(value, list) and key.isdigit():
                idx = int(key)
                value = value[idx] if 0 <= idx < len(value) else None
            elif hasattr(value, key):
                value = getattr(value, key)
            else:
                return None
        
        return value
    
    def _apply_filter(self, value: Any, filter_str: str) -> Any:
        """Apply a filter to a value."""
        # Parse filter name and args
        match = re.match(r'(\w+)(?:\(([^)]*)\))?', filter_str)
        if not match:
            return value
        
        filter_name = match.group(1)
        filter_args = match.group(2) or ''
        
        # Apply filter
        if filter_name == 'trim':
            return value.strip() if isinstance(value, str) else value
        
        elif filter_name == 'lower':
            return value.lower() if isinstance(value, str) else value
        
        elif filter_name == 'upper':
            return value.upper() if isinstance(value, str) else value
        
        elif filter_name == 'length':
            if isinstance(value, (str, list, dict)):
                return len(value)
            return 0
        
        elif filter_name == 'default':
            if value is None or value == '':
                # Parse default value
                default = filter_args.strip().strip("'\"")
                return default
            return value
        
        elif filter_name == 'json':
            return json.dumps(value)
        
        elif filter_name == 'first':
            if isinstance(value, (list, tuple)) and len(value) > 0:
                return value[0]
            return None
        
        elif filter_name == 'last':
            if isinstance(value, (list, tuple)) and len(value) > 0:
                return value[-1]
            return None
        
        elif filter_name == 'split':
            separator = filter_args.strip().strip("'\"") or ','
            if isinstance(value, str):
                return value.split(separator)
            return value
        
        elif filter_name == 'join':
            separator = filter_args.strip().strip("'\"") or ','
            if isinstance(value, list):
                return separator.join(str(v) for v in value)
            return value
        
        return value
    
    def _parse_literal(self, value: str) -> Any:
        """Parse a string as a literal value."""
        if not isinstance(value, str):
            return value
        
        value = value.strip()
        
        # String literal
        if (value.startswith("'") and value.endswith("'")) or \
           (value.startswith('"') and value.endswith('"')):
            return value[1:-1]
        
        # Boolean
        if value.lower() == 'true':
            return True
        if value.lower() == 'false':
            return False
        
        # Number
        try:
            if '.' in value:
                return float(value)
            return int(value)
        except ValueError:
            pass
        
        return value


class ControlFlowExecutor:
    """
    Handles execution of control flow blocks.
    """
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        self.evaluator = ExpressionEvaluator(context)
    
    async def execute_condition(
        self,
        parameters: Dict[str, Any]
    ) -> Tuple[bool, str]:
        """
        Execute a condition block.
        
        Returns: (result, output_handle) - result is boolean, output_handle is 'true' or 'false'
        """
        expression = parameters.get('expression', 'true')
        
        try:
            result = self.evaluator.evaluate_condition(expression)
            return result, 'true' if result else 'false'
        except Exception as e:
            logger.error(f"Condition evaluation failed: {e}")
            return False, 'false'
    
    async def execute_loop(
        self,
        parameters: Dict[str, Any],
        body_executor: Any  # Callable to execute loop body
    ) -> Dict[str, Any]:
        """
        Execute a loop block.
        
        Parameters:
        - mode: 'count' or 'array'
        - count: number of iterations (for count mode)
        - array: expression returning array (for array mode)
        
        Returns: aggregated results from all iterations
        """
        mode = parameters.get('mode', 'count')
        results = []
        
        if mode == 'count':
            count = int(parameters.get('count', 5))
            items = list(range(count))
        else:
            array_expr = parameters.get('array', '[]')
            items = self.evaluator.evaluate(array_expr)
            if not isinstance(items, list):
                items = [items] if items else []
        
        total = len(items)
        
        for idx, item in enumerate(items):
            # Create loop context
            loop_ctx = LoopContext(
                index=idx,
                item=item,
                total=total,
                is_first=(idx == 0),
                is_last=(idx == total - 1),
            )
            
            # Push onto stack
            self.context.push_loop(loop_ctx)
            
            try:
                # Execute loop body
                if body_executor:
                    result = await body_executor(loop_ctx)
                    results.append(result)
            finally:
                # Pop from stack
                self.context.pop_loop()
        
        return {
            'iterations': total,
            'results': results,
            'mode': mode,
        }
    
    async def execute_parallel(
        self,
        parameters: Dict[str, Any],
        branch_executors: List[Any]  # List of callables for each branch
    ) -> Dict[str, Any]:
        """
        Execute parallel branches concurrently.
        
        Returns: results from all branches
        """
        if not branch_executors:
            return {'branches': 0, 'results': []}
        
        # Execute all branches in parallel
        tasks = [executor() for executor in branch_executors]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        branch_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                branch_results.append({
                    'branch': i,
                    'success': False,
                    'error': str(result),
                })
            else:
                branch_results.append({
                    'branch': i,
                    'success': True,
                    'output': result,
                })
        
        return {
            'branches': len(branch_executors),
            'results': branch_results,
        }
    
    def set_variable(self, name: str, value: Any) -> None:
        """Set a workflow variable."""
        # Evaluate value if it's an expression
        if isinstance(value, str) and '{{' in value:
            value = self.evaluator.evaluate(value)
        
        self.context.variables[name] = value
    
    def get_variable(self, name: str, default: Any = None) -> Any:
        """Get a workflow variable."""
        return self.context.variables.get(name, default)
    
    def evaluate_parameters(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate all expressions in a parameters dictionary.
        
        This allows block parameters to reference variables, previous outputs, etc.
        """
        evaluated = {}
        
        for key, value in parameters.items():
            if isinstance(value, str) and '{{' in value:
                evaluated[key] = self.evaluator.evaluate(value)
            elif isinstance(value, dict):
                evaluated[key] = self.evaluate_parameters(value)
            elif isinstance(value, list):
                evaluated[key] = [
                    self.evaluator.evaluate(v) if isinstance(v, str) and '{{' in v else v
                    for v in value
                ]
            else:
                evaluated[key] = value
        
        return evaluated
