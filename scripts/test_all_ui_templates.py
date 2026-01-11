#!/usr/bin/env python3
"""
Comprehensive UI Template Test Suite
Tests all templates as they would be used from the FlowTemplates panel in the UI.
"""

import requests
import json
import time
import sys
import uuid

BASE_URL = "http://localhost:12001/api/v1"

# All templates from FlowTemplates.tsx - exact copies
TEMPLATES = [
    # 1. Multi-Host Ping Monitor
    {
        "id": "multi-host-ping-monitor",
        "name": "Multi-Host Ping Monitor",
        "category": "traffic",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Define Hosts", "type": "control.variable_set", "category": "control", "parameters": {"name": "hosts", "value": '["192.168.1.1", "192.168.1.2", "192.168.1.3"]'}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "For Each Host", "type": "control.loop", "category": "control", "parameters": {"mode": "array", "array": "{{hosts}}", "variable": "host"}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Ping Host", "type": "traffic.ping", "category": "traffic", "parameters": {"host": "{{item}}", "count": 3, "timeout": 5}}},
            {"type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "Log Result", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"type": "block", "position": {"x": 100, "y": 550}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "iteration", "targetHandle": "in"},
            {"source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "5", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "6", "sourceHandle": "complete", "targetHandle": "in"},
        ],
    },
    # 2. Traffic Baseline Collection
    {
        "id": "traffic-baseline-collection",
        "name": "Traffic Baseline Collection",
        "category": "traffic",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Start Capture", "type": "traffic.start_capture", "category": "traffic", "parameters": {"interface": "eth0"}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Wait 2s", "type": "control.delay", "category": "control", "parameters": {"seconds": 2}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Stop Capture", "type": "traffic.stop_capture", "category": "traffic", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "Get Stats", "type": "traffic.get_stats", "category": "traffic", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 550}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "5", "target": "6", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    # 3. Network Discovery Pipeline
    {
        "id": "network-discovery-pipeline",
        "name": "Network Discovery Pipeline",
        "category": "scanning",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Define Network", "type": "control.variable_set", "category": "control", "parameters": {"name": "targets", "value": '["192.168.1.10", "192.168.1.20"]'}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "For Each Target", "type": "control.loop", "category": "control", "parameters": {"mode": "array", "array": "{{targets}}", "variable": "target"}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Port Scan", "type": "scanning.port_scan", "category": "scanning", "parameters": {"host": "{{item}}", "ports": "22,80,443"}}},
            {"type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "Version Detection", "type": "scanning.version_detect", "category": "scanning", "parameters": {"host": "{{item}}"}}},
            {"type": "block", "position": {"x": 100, "y": 550}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "iteration", "targetHandle": "in"},
            {"source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "5", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "6", "sourceHandle": "complete", "targetHandle": "in"},
        ],
    },
    # 4. Security Scan Pipeline (Conditional)
    {
        "id": "security-scan-pipeline",
        "name": "Security Scan Pipeline",
        "category": "scanning",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Set Target", "type": "control.variable_set", "category": "control", "parameters": {"name": "target", "value": "192.168.1.100"}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Port Scan", "type": "scanning.port_scan", "category": "scanning", "parameters": {"host": "{{target}}", "ports": "1-1000"}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Has Open Ports?", "type": "control.condition", "category": "control", "parameters": {"expression": "true"}}},
            {"type": "block", "position": {"x": 50, "y": 450}, "data": {"label": "Version Detection", "type": "scanning.version_detect", "category": "scanning", "parameters": {"host": "{{target}}"}}},
            {"type": "block", "position": {"x": 250, "y": 450}, "data": {"label": "No Services Found", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"type": "block", "position": {"x": 100, "y": 550}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "4", "target": "5", "sourceHandle": "true", "targetHandle": "in"},
            {"source": "4", "target": "6", "sourceHandle": "false", "targetHandle": "in"},
            {"source": "5", "target": "7", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "6", "target": "7", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    # 5. Connectivity Health Check (Parallel from loop - simplified to sequential for testing)
    {
        "id": "connectivity-health-check",
        "name": "Connectivity Health Check",
        "category": "access",
        "nodes": [
            {"type": "block", "position": {"x": 150, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 150, "y": 150}, "data": {"label": "Define Hosts", "type": "control.variable_set", "category": "control", "parameters": {"name": "hosts", "value": '["gateway", "server"]'}}},
            {"type": "block", "position": {"x": 150, "y": 250}, "data": {"label": "For Each Host", "type": "control.loop", "category": "control", "parameters": {"mode": "array", "array": "{{hosts}}", "variable": "host"}}},
            {"type": "block", "position": {"x": 150, "y": 350}, "data": {"label": "Ping", "type": "traffic.ping", "category": "traffic", "parameters": {"host": "{{item}}", "count": 2}}},
            {"type": "block", "position": {"x": 150, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "iteration", "targetHandle": "in"},
            {"source": "4", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "5", "sourceHandle": "complete", "targetHandle": "in"},
        ],
    },
    # 6. SSH Command Chain
    {
        "id": "ssh-command-chain",
        "name": "SSH Command Chain",
        "category": "access",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Test SSH", "type": "connection.ssh_test", "category": "connection", "parameters": {"host": "test-host", "port": 22, "username": "root"}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Get Hostname", "type": "command.ssh_execute", "category": "command", "parameters": {"host": "test-host", "command": "hostname"}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Get System Info", "type": "command.system_info", "category": "command", "parameters": {"host": "test-host"}}},
            {"type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "success", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    # 7. REP Ring Failover Test (Complex loop)
    {
        "id": "rep-ring-test",
        "name": "REP Ring Failover Test",
        "category": "access",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Define Switches", "type": "control.variable_set", "category": "control", "parameters": {"name": "switches", "value": '["192.168.1.1", "192.168.1.2"]'}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "For Each Switch", "type": "control.loop", "category": "control", "parameters": {"mode": "array", "array": "{{switches}}", "variable": "switch"}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "SSH Connect", "type": "connection.ssh_test", "category": "connection", "parameters": {"host": "{{item}}", "port": 22}}},
            {"type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "Shutdown Port", "type": "command.ssh_execute", "category": "command", "parameters": {"host": "{{item}}", "command": "shutdown"}}},
            {"type": "block", "position": {"x": 100, "y": 550}, "data": {"label": "Wait 2s", "type": "control.delay", "category": "control", "parameters": {"seconds": 2}}},
            {"type": "block", "position": {"x": 100, "y": 650}, "data": {"label": "Check REP Status", "type": "command.ssh_execute", "category": "command", "parameters": {"host": "{{item}}", "command": "show rep"}}},
            {"type": "block", "position": {"x": 100, "y": 750}, "data": {"label": "Enable Port", "type": "command.ssh_execute", "category": "command", "parameters": {"host": "{{item}}", "command": "no shutdown"}}},
            {"type": "block", "position": {"x": 100, "y": 850}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "iteration", "targetHandle": "in"},
            {"source": "4", "target": "5", "sourceHandle": "success", "targetHandle": "in"},
            {"source": "5", "target": "6", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "6", "target": "7", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "7", "target": "8", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "8", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "9", "sourceHandle": "complete", "targetHandle": "in"},
        ],
    },
    # 8. Agent Mass Deployment (Loop with conditional)
    {
        "id": "agent-mass-deployment",
        "name": "Agent Mass Deployment",
        "category": "agent",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Define Targets", "type": "control.variable_set", "category": "control", "parameters": {"name": "targets", "value": '["192.168.1.10", "192.168.1.15"]'}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "For Each Target", "type": "control.loop", "category": "control", "parameters": {"mode": "array", "array": "{{targets}}", "variable": "target"}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Test SSH", "type": "connection.ssh_test", "category": "connection", "parameters": {"host": "{{item}}", "port": 22}}},
            {"type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "Check SSH", "type": "control.condition", "category": "control", "parameters": {"expression": "true"}}},
            {"type": "block", "position": {"x": 50, "y": 550}, "data": {"label": "Generate Agent", "type": "agent.generate", "category": "agent", "parameters": {"platform": "linux-amd64"}}},
            {"type": "block", "position": {"x": 50, "y": 650}, "data": {"label": "Deploy Agent", "type": "agent.deploy", "category": "agent", "parameters": {"host": "{{item}}", "autoStart": True}}},
            {"type": "block", "position": {"x": 250, "y": 550}, "data": {"label": "Log Failed", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"type": "block", "position": {"x": 100, "y": 750}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "iteration", "targetHandle": "in"},
            {"source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "5", "target": "6", "sourceHandle": "true", "targetHandle": "in"},
            {"source": "5", "target": "8", "sourceHandle": "false", "targetHandle": "in"},
            {"source": "6", "target": "7", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "7", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "8", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "9", "sourceHandle": "complete", "targetHandle": "in"},
        ],
    },
    # 9. Agent POV Reconnaissance (Nested loop pattern)
    {
        "id": "agent-pov-recon",
        "name": "Agent POV Reconnaissance",
        "category": "agent",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Set Agent", "type": "control.variable_set", "category": "control", "parameters": {"name": "agent_id", "value": "test-agent"}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Set Network", "type": "control.variable_set", "category": "control", "parameters": {"name": "target_network", "value": "10.10.0.0/24"}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Ping via Agent", "type": "traffic.advanced_ping", "category": "traffic", "parameters": {"hosts": "{{target_network}}", "count": 1}}},
            {"type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "For Each Host", "type": "control.loop", "category": "control", "parameters": {"mode": "array", "array": '["10.10.0.1", "10.10.0.2"]', "variable": "host"}}},
            {"type": "block", "position": {"x": 100, "y": 550}, "data": {"label": "Port Scan", "type": "scanning.port_scan", "category": "scanning", "parameters": {"host": "{{item}}", "ports": "22,80,443"}}},
            {"type": "block", "position": {"x": 100, "y": 650}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "5", "target": "6", "sourceHandle": "iteration", "targetHandle": "in"},
            {"source": "6", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "5", "target": "7", "sourceHandle": "complete", "targetHandle": "in"},
        ],
    },
    # 10. Simple Count Loop (to test count mode)
    {
        "id": "count-loop-test",
        "name": "Count Loop Test",
        "category": "utility",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Loop 3x", "type": "control.loop", "category": "control", "parameters": {"mode": "count", "count": 3}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Delay", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "iteration", "targetHandle": "in"},
            {"source": "3", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "4", "sourceHandle": "complete", "targetHandle": "in"},
        ],
    },
]


def assign_ids(nodes, edges):
    """Simulate what the UI does when inserting a template"""
    id_map = {}
    new_nodes = []
    for i, node in enumerate(nodes):
        old_id = str(i + 1)
        new_id = str(uuid.uuid4())
        id_map[old_id] = new_id
        new_nodes.append({**node, "id": new_id})
    
    new_edges = []
    for edge in edges:
        new_edges.append({
            **edge,
            "id": str(uuid.uuid4()),
            "source": id_map.get(edge["source"], edge["source"]),
            "target": id_map.get(edge["target"], edge["target"]),
        })
    return new_nodes, new_edges


def test_template(template, timeout_seconds=60):
    name = template["name"]
    category = template.get("category", "unknown")
    print(f"\n{'='*60}")
    print(f"[{category.upper()}] {name}")
    print(f"{'='*60}")
    
    nodes, edges = assign_ids(template["nodes"], template["edges"])
    
    # 1. CREATE
    resp = requests.post(f"{BASE_URL}/workflows", json={
        "name": f"UI Test: {name}",
        "description": f"Automated UI test for {name}",
        "nodes": nodes,
        "edges": edges,
        "category": category,
    }, timeout=10)
    
    if resp.status_code not in [200, 201]:
        print(f"  ❌ CREATE FAILED: {resp.status_code} - {resp.text[:100]}")
        return {"name": name, "status": "create_failed", "error": resp.text[:100]}
    
    wf = resp.json()
    wf_id = wf["id"]
    print(f"  ✓ Created workflow: {wf_id[:8]}...")
    
    # 2. COMPILE
    resp = requests.post(f"{BASE_URL}/workflows/{wf_id}/compile", timeout=10)
    compile_result = resp.json()
    
    if not compile_result.get("valid"):
        errors = compile_result.get("errors", [])
        error_msgs = [e.get("message", str(e)) for e in errors]
        print(f"  ❌ COMPILE FAILED: {error_msgs}")
        return {"name": name, "status": "compile_failed", "error": error_msgs}
    
    print(f"  ✓ Compiled: {compile_result.get('total_levels', '?')} levels")
    
    # 3. EXECUTE
    resp = requests.post(f"{BASE_URL}/workflows/{wf_id}/execute", json={}, timeout=10)
    if resp.status_code not in [200, 201]:
        print(f"  ❌ EXECUTE FAILED: {resp.status_code} - {resp.text[:100]}")
        return {"name": name, "status": "execute_failed", "error": resp.text[:100]}
    
    exec_data = resp.json()
    exec_id = exec_data["id"]
    print(f"  ✓ Execution started: {exec_id[:8]}...")
    
    # 4. POLL FOR COMPLETION
    start_time = time.time()
    last_progress = ""
    
    while time.time() - start_time < timeout_seconds:
        time.sleep(0.5)
        try:
            resp = requests.get(f"{BASE_URL}/workflows/{wf_id}/executions/{exec_id}", timeout=10)
            if resp.status_code == 200:
                detail = resp.json()
                status = detail.get("status", "unknown")
                progress = detail.get("progress", {})
                completed = progress.get("completed", 0)
                total = progress.get("total", 0)
                pct = progress.get("percentage", 0)
                
                progress_str = f"{status}: {completed}/{total} ({pct:.0f}%)"
                if progress_str != last_progress:
                    elapsed = time.time() - start_time
                    print(f"    [{elapsed:.1f}s] {progress_str}")
                    last_progress = progress_str
                
                if status == "completed":
                    elapsed = time.time() - start_time
                    print(f"  ✓ SUCCESS in {elapsed:.1f}s")
                    return {"name": name, "status": "success", "time": elapsed}
                elif status == "failed":
                    errors = detail.get("errors", [])
                    error_msgs = [e.get("message", str(e)) for e in errors]
                    print(f"  ❌ EXECUTION FAILED: {error_msgs}")
                    return {"name": name, "status": "execution_failed", "error": error_msgs}
        except Exception as e:
            print(f"    Poll error: {e}")
    
    print(f"  ❌ TIMEOUT after {timeout_seconds}s")
    return {"name": name, "status": "timeout", "error": f"Exceeded {timeout_seconds}s"}


def main():
    print("\n" + "="*60)
    print("  COMPREHENSIVE UI TEMPLATE TEST SUITE")
    print("  Testing all FlowTemplates as used from the UI")
    print("="*60)
    
    # Check API availability
    try:
        resp = requests.get(f"{BASE_URL}/workflows", timeout=5)
        print(f"\n✓ API available (HTTP {resp.status_code})")
    except Exception as e:
        print(f"\n❌ API unavailable: {e}")
        print("Is the backend running?")
        sys.exit(1)
    
    results = []
    
    for template in TEMPLATES:
        result = test_template(template)
        results.append(result)
    
    # SUMMARY
    print("\n" + "="*60)
    print("  SUMMARY")
    print("="*60)
    
    success = [r for r in results if r["status"] == "success"]
    failed = [r for r in results if r["status"] != "success"]
    
    print(f"\n  Total templates tested: {len(results)}")
    print(f"  ✓ Passed: {len(success)}")
    print(f"  ❌ Failed: {len(failed)}")
    
    if success:
        print(f"\n  ✓ PASSED TEMPLATES:")
        for r in success:
            print(f"     - {r['name']} ({r.get('time', 0):.1f}s)")
    
    if failed:
        print(f"\n  ❌ FAILED TEMPLATES:")
        for r in failed:
            print(f"     - {r['name']}: {r['status']}")
            if r.get("error"):
                error_str = str(r["error"])[:80]
                print(f"       Error: {error_str}")
    
    print("\n" + "="*60)
    
    return 0 if len(failed) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
