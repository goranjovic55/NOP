#!/usr/bin/env python3
"""Test workflow templates via API"""

import requests
import json
import time
import sys
import uuid

BASE_URL = "http://localhost:12001/api/v1"

TEMPLATES = [
    {
        "id": "linear-test",
        "name": "Linear Test (Simple)",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Wait", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    {
        "id": "loop-test",
        "name": "Loop Test (3 items)",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Set Hosts", "type": "control.variable_set", "category": "control", "parameters": {"name": "hosts", "value": '["a", "b", "c"]'}}},
            {"type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Loop", "type": "control.loop", "category": "control", "parameters": {"mode": "array", "array": "{{hosts}}", "variable": "host"}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Delay", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "4", "sourceHandle": "iteration", "targetHandle": "in"},
            {"source": "4", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "3", "target": "5", "sourceHandle": "complete", "targetHandle": "in"},
        ],
    },
    {
        "id": "condition-test",
        "name": "Condition Test",
        "nodes": [
            {"type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Check", "type": "control.condition", "category": "control", "parameters": {"expression": "true"}}},
            {"type": "block", "position": {"x": 50, "y": 250}, "data": {"label": "True", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"type": "block", "position": {"x": 200, "y": 250}, "data": {"label": "False", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "2", "target": "3", "sourceHandle": "true", "targetHandle": "in"},
            {"source": "2", "target": "4", "sourceHandle": "false", "targetHandle": "in"},
            {"source": "3", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
            {"source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
]


def assign_ids(nodes, edges):
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


def test_template(template):
    name = template["name"]
    print(f"\n=== Testing: {name} ===")
    
    nodes, edges = assign_ids(template["nodes"], template["edges"])
    
    # Create
    resp = requests.post(f"{BASE_URL}/workflows", json={
        "name": f"Test: {name}",
        "nodes": nodes,
        "edges": edges,
    }, timeout=10)
    
    if resp.status_code not in [200, 201]:
        print(f"  ❌ Create failed: {resp.status_code} - {resp.text[:100]}")
        return False
    
    wf = resp.json()
    wf_id = wf["id"]
    print(f"  ✓ Created: {wf_id}")
    
    # Compile
    resp = requests.post(f"{BASE_URL}/workflows/{wf_id}/compile", timeout=10)
    compile_result = resp.json()
    
    if not compile_result.get("valid"):
        print(f"  ❌ Compile failed: {compile_result.get('errors')}")
        return False
    print(f"  ✓ Compiled")
    
    # Execute
    resp = requests.post(f"{BASE_URL}/workflows/{wf_id}/execute", json={}, timeout=10)
    if resp.status_code not in [200, 201]:
        print(f"  ❌ Execute failed: {resp.status_code}")
        return False
    
    exec_data = resp.json()
    exec_id = exec_data["id"]
    print(f"  ✓ Execution started: {exec_id}")
    
    # Poll
    for i in range(30):
        time.sleep(1)
        try:
            resp = requests.get(f"{BASE_URL}/workflows/{wf_id}/executions/{exec_id}", timeout=10)
            if resp.status_code == 200:
                detail = resp.json()
                status = detail.get("status", "unknown")
                progress = detail.get("progress", {})
                print(f"    {i+1}s: {status} - {progress.get('completed', 0)}/{progress.get('total', 0)}")
                
                if status == "completed":
                    print(f"  ✓ SUCCESS!")
                    return True
                elif status == "failed":
                    print(f"  ❌ FAILED: {detail.get('errors')}")
                    return False
        except Exception as e:
            print(f"    Poll error: {e}")
    
    print(f"  ❌ TIMEOUT")
    return False


def main():
    print("WORKFLOW TEMPLATE TESTS")
    print("=" * 60)
    
    results = []
    for t in TEMPLATES:
        results.append(test_template(t))
    
    print("\n" + "=" * 60)
    print("=== SUMMARY ===")
    passed = sum(results)
    print(f"Passed: {passed}/{len(results)}")
    
    if passed < len(results):
        print("\nFailed tests:")
        for i, (t, r) in enumerate(zip(TEMPLATES, results)):
            if not r:
                print(f"  - {t['name']}")
    
    return 0 if passed == len(results) else 1

if __name__ == "__main__":
    sys.exit(main())
