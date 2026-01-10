"""
Workflow DAG Compiler

Compiles workflow nodes and edges into a Directed Acyclic Graph (DAG)
with validation, cycle detection, and topological sorting for execution.
"""

from typing import Dict, List, Set, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict


class CompilationError(Exception):
    """Raised when workflow compilation fails."""
    pass


class NodeType(str, Enum):
    START = "control.start"
    END = "control.end"
    DELAY = "control.delay"
    CONDITION = "control.condition"
    LOOP = "control.loop"
    PARALLEL = "control.parallel"
    VARIABLE_SET = "control.variable_set"
    VARIABLE_GET = "control.variable_get"
    
    # Connection blocks
    SSH_TEST = "connection.ssh_test"
    RDP_TEST = "connection.rdp_test"
    VNC_TEST = "connection.vnc_test"
    FTP_TEST = "connection.ftp_test"
    TCP_TEST = "connection.tcp_test"
    
    # Command blocks
    SSH_EXECUTE = "command.ssh_execute"
    SYSTEM_INFO = "command.system_info"
    FTP_LIST = "command.ftp_list"
    FTP_DOWNLOAD = "command.ftp_download"
    FTP_UPLOAD = "command.ftp_upload"
    
    # Traffic blocks
    TRAFFIC_START = "traffic.start_capture"
    TRAFFIC_STOP = "traffic.stop_capture"
    TRAFFIC_BURST = "traffic.burst_capture"
    TRAFFIC_STATS = "traffic.traffic_stats"
    TRAFFIC_PING = "traffic.ping"
    TRAFFIC_ADVANCED_PING = "traffic.advanced_ping"
    TRAFFIC_STORM = "traffic.storm"
    
    # Scanning blocks
    SCAN_VERSION = "scanning.version_detect"
    SCAN_PORT = "scanning.port_scan"
    
    # Agent blocks
    AGENT_GENERATE = "agent.generate"
    AGENT_DEPLOY = "agent.deploy"
    AGENT_TERMINATE = "agent.terminate"


@dataclass
class CompiledNode:
    """Represents a node in the compiled DAG."""
    id: str
    type: str
    category: str
    label: str
    parameters: Dict[str, Any]
    level: int = 0  # Execution level (0 = first)
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    output_handles: Dict[str, List[str]] = field(default_factory=dict)
    
    def __hash__(self):
        return hash(self.id)


@dataclass
class CompiledEdge:
    """Represents an edge in the compiled DAG."""
    id: str
    source: str
    target: str
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None


@dataclass
class ValidationError:
    """Represents a validation error."""
    node_id: Optional[str]
    message: str
    severity: str = "error"  # error, warning


@dataclass
class CompiledDAG:
    """The compiled workflow DAG."""
    nodes: Dict[str, CompiledNode]
    edges: List[CompiledEdge]
    execution_order: List[List[str]]  # Levels of nodes to execute
    start_node_id: Optional[str]
    end_node_ids: List[str]
    is_valid: bool
    errors: List[ValidationError]
    variables: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "nodes": {
                node_id: {
                    "id": node.id,
                    "type": node.type,
                    "category": node.category,
                    "label": node.label,
                    "parameters": node.parameters,
                    "level": node.level,
                    "dependencies": list(node.dependencies),
                    "dependents": list(node.dependents),
                }
                for node_id, node in self.nodes.items()
            },
            "edges": [
                {
                    "id": edge.id,
                    "source": edge.source,
                    "target": edge.target,
                    "sourceHandle": edge.source_handle,
                    "targetHandle": edge.target_handle,
                }
                for edge in self.edges
            ],
            "executionOrder": self.execution_order,
            "startNodeId": self.start_node_id,
            "endNodeIds": self.end_node_ids,
            "isValid": self.is_valid,
            "errors": [
                {
                    "nodeId": err.node_id,
                    "message": err.message,
                    "severity": err.severity,
                }
                for err in self.errors
            ],
            "variables": self.variables,
        }


class WorkflowCompiler:
    """
    Compiles workflow definitions into executable DAGs.
    
    Responsibilities:
    - Parse nodes and edges
    - Build dependency graph
    - Detect cycles
    - Compute topological order
    - Validate workflow structure
    """
    
    def __init__(self):
        self.errors: List[ValidationError] = []
    
    def compile(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> CompiledDAG:
        """
        Compile workflow nodes and edges into a DAG.
        
        Args:
            nodes: List of node definitions
            edges: List of edge definitions
            
        Returns:
            CompiledDAG with execution order and validation results
        """
        self.errors = []
        
        # Parse nodes
        compiled_nodes = self._parse_nodes(nodes)
        compiled_edges = self._parse_edges(edges)
        
        # Build dependency graph
        self._build_dependencies(compiled_nodes, compiled_edges)
        
        # Find start and end nodes
        start_node_id = self._find_start_node(compiled_nodes)
        end_node_ids = self._find_end_nodes(compiled_nodes)
        
        # Validate structure
        self._validate_structure(compiled_nodes, start_node_id, end_node_ids)
        
        # Detect cycles
        has_cycle = self._detect_cycle(compiled_nodes)
        if has_cycle:
            self.errors.append(ValidationError(
                node_id=None,
                message="Workflow contains a cycle - execution would loop forever",
                severity="error"
            ))
        
        # Compute execution order (topological sort)
        execution_order = []
        if not has_cycle:
            execution_order = self._topological_sort(compiled_nodes, start_node_id)
        
        is_valid = len([e for e in self.errors if e.severity == "error"]) == 0
        
        return CompiledDAG(
            nodes=compiled_nodes,
            edges=compiled_edges,
            execution_order=execution_order,
            start_node_id=start_node_id,
            end_node_ids=end_node_ids,
            is_valid=is_valid,
            errors=self.errors,
        )
    
    def _parse_nodes(self, nodes: List[Dict[str, Any]]) -> Dict[str, CompiledNode]:
        """Parse raw node definitions into CompiledNode objects."""
        compiled = {}
        for node in nodes:
            node_data = node.get("data", {})
            compiled_node = CompiledNode(
                id=node.get("id", ""),
                type=node_data.get("type", ""),
                category=node_data.get("category", ""),
                label=node_data.get("label", ""),
                parameters=node_data.get("parameters", {}),
            )
            compiled[compiled_node.id] = compiled_node
        return compiled
    
    def _parse_edges(self, edges: List[Dict[str, Any]]) -> List[CompiledEdge]:
        """Parse raw edge definitions into CompiledEdge objects."""
        compiled = []
        for edge in edges:
            compiled_edge = CompiledEdge(
                id=edge.get("id", ""),
                source=edge.get("source", ""),
                target=edge.get("target", ""),
                source_handle=edge.get("sourceHandle"),
                target_handle=edge.get("targetHandle"),
            )
            compiled.append(compiled_edge)
        return compiled
    
    def _build_dependencies(
        self,
        nodes: Dict[str, CompiledNode],
        edges: List[CompiledEdge]
    ) -> None:
        """Build dependency relationships between nodes."""
        for edge in edges:
            source_node = nodes.get(edge.source)
            target_node = nodes.get(edge.target)
            
            if source_node and target_node:
                # Target depends on source
                target_node.dependencies.add(edge.source)
                source_node.dependents.add(edge.target)
                
                # Track output handles
                handle = edge.source_handle or "default"
                if handle not in source_node.output_handles:
                    source_node.output_handles[handle] = []
                source_node.output_handles[handle].append(edge.target)
            else:
                if not source_node:
                    self.errors.append(ValidationError(
                        node_id=edge.source,
                        message=f"Edge references non-existent source node: {edge.source}",
                        severity="error"
                    ))
                if not target_node:
                    self.errors.append(ValidationError(
                        node_id=edge.target,
                        message=f"Edge references non-existent target node: {edge.target}",
                        severity="error"
                    ))
    
    def _find_start_node(self, nodes: Dict[str, CompiledNode]) -> Optional[str]:
        """Find the START node in the workflow."""
        start_nodes = [
            node_id for node_id, node in nodes.items()
            if node.type == NodeType.START
        ]
        
        if len(start_nodes) == 0:
            # Try to find nodes with no dependencies
            root_nodes = [
                node_id for node_id, node in nodes.items()
                if len(node.dependencies) == 0
            ]
            if len(root_nodes) == 1:
                return root_nodes[0]
            elif len(root_nodes) > 1:
                self.errors.append(ValidationError(
                    node_id=None,
                    message="Workflow has multiple root nodes - add a START block",
                    severity="warning"
                ))
                return root_nodes[0]
            return None
        elif len(start_nodes) > 1:
            self.errors.append(ValidationError(
                node_id=None,
                message="Workflow has multiple START nodes - only one is allowed",
                severity="error"
            ))
            return start_nodes[0]
        
        return start_nodes[0]
    
    def _find_end_nodes(self, nodes: Dict[str, CompiledNode]) -> List[str]:
        """Find END nodes or leaf nodes in the workflow."""
        end_nodes = [
            node_id for node_id, node in nodes.items()
            if node.type == NodeType.END
        ]
        
        if not end_nodes:
            # Find leaf nodes (no dependents)
            end_nodes = [
                node_id for node_id, node in nodes.items()
                if len(node.dependents) == 0
            ]
        
        return end_nodes
    
    def _validate_structure(
        self,
        nodes: Dict[str, CompiledNode],
        start_node_id: Optional[str],
        end_node_ids: List[str]
    ) -> None:
        """Validate workflow structure."""
        if not nodes:
            self.errors.append(ValidationError(
                node_id=None,
                message="Workflow is empty - add some blocks",
                severity="error"
            ))
            return
        
        if not start_node_id:
            self.errors.append(ValidationError(
                node_id=None,
                message="Workflow has no start point - add a START block or ensure one root node",
                severity="warning"
            ))
        
        if not end_node_ids:
            self.errors.append(ValidationError(
                node_id=None,
                message="Workflow has no end point - this may cause issues",
                severity="warning"
            ))
        
        # Check for disconnected nodes
        if start_node_id:
            reachable = self._get_reachable_nodes(nodes, start_node_id)
            for node_id in nodes:
                if node_id not in reachable and node_id != start_node_id:
                    self.errors.append(ValidationError(
                        node_id=node_id,
                        message=f"Node '{nodes[node_id].label}' is not reachable from start",
                        severity="warning"
                    ))
        
        # Validate required parameters
        for node_id, node in nodes.items():
            self._validate_node_parameters(node)
    
    def _validate_node_parameters(self, node: CompiledNode) -> None:
        """Validate that required parameters are set."""
        # Define required parameters per block type
        required_params = {
            NodeType.SSH_TEST: ["host"],
            NodeType.RDP_TEST: ["host"],
            NodeType.VNC_TEST: ["host"],
            NodeType.FTP_TEST: ["host"],
            NodeType.TCP_TEST: ["host", "port"],
            NodeType.SSH_EXECUTE: ["host", "command"],
            NodeType.FTP_LIST: ["host"],
            NodeType.FTP_DOWNLOAD: ["host", "remotePath"],
            NodeType.FTP_UPLOAD: ["host", "localPath", "remotePath"],
            NodeType.TRAFFIC_START: ["interface"],
            NodeType.TRAFFIC_PING: ["target"],
            NodeType.TRAFFIC_ADVANCED_PING: ["target"],
            NodeType.SCAN_PORT: ["target"],
            NodeType.SCAN_VERSION: ["target"],
        }
        
        try:
            node_type = NodeType(node.type)
        except ValueError:
            return  # Unknown type, skip validation
        
        if node_type in required_params:
            for param in required_params[node_type]:
                if param not in node.parameters or not node.parameters[param]:
                    self.errors.append(ValidationError(
                        node_id=node.id,
                        message=f"Required parameter '{param}' is missing",
                        severity="error"
                    ))
    
    def _get_reachable_nodes(
        self,
        nodes: Dict[str, CompiledNode],
        start_id: str
    ) -> Set[str]:
        """Get all nodes reachable from start using BFS."""
        reachable = set()
        queue = [start_id]
        
        while queue:
            current = queue.pop(0)
            if current in reachable:
                continue
            reachable.add(current)
            
            node = nodes.get(current)
            if node:
                for dependent in node.dependents:
                    if dependent not in reachable:
                        queue.append(dependent)
        
        return reachable
    
    def _detect_cycle(self, nodes: Dict[str, CompiledNode]) -> bool:
        """
        Detect if the graph contains a cycle using DFS.
        
        Returns True if a cycle is found.
        """
        WHITE = 0  # Not visited
        GRAY = 1   # Being processed
        BLACK = 2  # Fully processed
        
        colors = {node_id: WHITE for node_id in nodes}
        
        def dfs(node_id: str) -> bool:
            colors[node_id] = GRAY
            
            node = nodes.get(node_id)
            if node:
                for dependent in node.dependents:
                    if colors.get(dependent) == GRAY:
                        # Back edge found - cycle!
                        return True
                    if colors.get(dependent) == WHITE:
                        if dfs(dependent):
                            return True
            
            colors[node_id] = BLACK
            return False
        
        for node_id in nodes:
            if colors[node_id] == WHITE:
                if dfs(node_id):
                    return True
        
        return False
    
    def _topological_sort(
        self,
        nodes: Dict[str, CompiledNode],
        start_id: Optional[str]
    ) -> List[List[str]]:
        """
        Compute topological sort, grouping nodes by execution level.
        
        Nodes at the same level can be executed in parallel.
        
        Returns:
            List of levels, each containing node IDs that can run in parallel.
        """
        if not nodes:
            return []
        
        # Calculate in-degree for each node
        in_degree = {node_id: 0 for node_id in nodes}
        for node in nodes.values():
            for dependent in node.dependents:
                if dependent in in_degree:
                    in_degree[dependent] += 1
        
        # Start with nodes that have no dependencies
        if start_id and start_id in in_degree:
            current_level = [start_id]
        else:
            current_level = [
                node_id for node_id, degree in in_degree.items()
                if degree == 0
            ]
        
        levels = []
        processed = set()
        
        while current_level:
            # Assign level to current nodes
            for node_id in current_level:
                if node_id in nodes:
                    nodes[node_id].level = len(levels)
                processed.update(current_level)
            
            levels.append(current_level)
            
            # Find next level
            next_level = []
            for node_id in current_level:
                node = nodes.get(node_id)
                if node:
                    for dependent in node.dependents:
                        if dependent not in processed:
                            in_degree[dependent] -= 1
                            if in_degree[dependent] == 0:
                                next_level.append(dependent)
            
            current_level = next_level
        
        return levels
