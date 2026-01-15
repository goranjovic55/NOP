#!/usr/bin/env python3
"""
Comprehensive Block and Workflow Testing Script
Tests all blocks by creating workflows with them and executing against real hosts.
Simulates frontend operations: select block → add to canvas → execute → verify
"""

import requests
import json
import time
import sys
from datetime import datetime

BASE_URL = "http://localhost:12001/api/v1"
TOKEN = None

# Real test hosts
TEST_HOSTS = {
    "external": "8.8.8.8",
    "postgres": "172.29.0.10",
    "redis": "172.29.0.11",
    "localhost": "127.0.0.1"
}

def login():
    """Get authentication token"""
    global TOKEN
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if resp.status_code == 200:
        TOKEN = resp.json().get("access_token")
        return True
    return False

def headers():
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def create_test_workflow(name, block_type, block_params, description=""):
    """Create a workflow with a single block for testing"""
    workflow = {
        "name": name,
        "description": description or f"Test workflow for {block_type}",
        "category": "test",
        "tags": ["test", "automated"],
        "nodes": [
            {
                "id": "start",
                "type": "block",
                "position": {"x": 50, "y": 100},
                "data": {
                    "label": "Start",
                    "type": "control.start",
                    "category": "control",
                    "parameters": {}
                }
            },
            {
                "id": "test_block",
                "type": "block",
                "position": {"x": 250, "y": 100},
                "data": {
                    "label": f"Test {block_type}",
                    "type": block_type,
                    "category": block_type.split(".")[0],
                    "parameters": block_params
                }
            },
            {
                "id": "end",
                "type": "block",
                "position": {"x": 450, "y": 100},
                "data": {
                    "label": "End",
                    "type": "control.end",
                    "category": "control",
                    "parameters": {}
                }
            }
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "test_block", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2", "source": "test_block", "target": "end", "sourceHandle": "out", "targetHandle": "in"}
        ],
        "settings": {"timeout": 30, "on_error": "stop"}
    }
    
    resp = requests.post(f"{BASE_URL}/workflows/", headers=headers(), json=workflow)
    if resp.status_code in [200, 201]:
        return resp.json().get("id")
    else:
        print(f"    ✗ Failed to create workflow: {resp.text[:200]}")
        return None

def execute_workflow(workflow_id, variables=None):
    """Execute a workflow and wait for completion"""
    resp = requests.post(
        f"{BASE_URL}/workflows/{workflow_id}/execute",
        headers=headers(),
        json={"variables": variables or {}}
    )
    
    if resp.status_code not in [200, 201]:
        return {"status": "error", "error": resp.text[:200]}
    
    exec_data = resp.json()
    exec_id = exec_data.get("id")
    
    # Poll for completion (max 30 seconds)
    for _ in range(60):
        time.sleep(0.5)
        status_resp = requests.get(
            f"{BASE_URL}/workflows/{workflow_id}/executions/{exec_id}",
            headers=headers()
        )
        if status_resp.status_code == 200:
            result = status_resp.json()
            status = result.get("status")
            if status not in ["pending", "running"]:
                return result
    
    return {"status": "timeout"}

def delete_workflow(workflow_id):
    """Delete a test workflow"""
    requests.delete(f"{BASE_URL}/workflows/{workflow_id}", headers=headers())

def test_block(block_type, params, description=""):
    """Test a single block type"""
    name = f"_test_{block_type.replace('.', '_')}_{int(time.time())}"
    
    # Create workflow
    wf_id = create_test_workflow(name, block_type, params, description)
    if not wf_id:
        return {"status": "create_failed", "block": block_type}
    
    # Execute
    result = execute_workflow(wf_id)
    
    # Cleanup
    delete_workflow(wf_id)
    
    return {
        "block": block_type,
        "status": result.get("status", "unknown"),
        "success": result.get("status") == "completed",
        "node_results": result.get("node_results", {}),
        "errors": result.get("errors", [])
    }

# ============================================
# BLOCK TEST DEFINITIONS
# Each block type with appropriate test parameters
# ============================================

BLOCK_TESTS = [
    # === ASSETS BLOCKS ===
    ("assets.get_all", {"includeOffline": True, "limit": 10}, "Get all assets from inventory"),
    ("assets.get_by_filter", {"type": "server", "status": "online"}, "Filter assets by type"),
    ("assets.check_online", {"host": TEST_HOSTS["external"], "method": "icmp", "timeout": 5}, "Check if host is online"),
    ("assets.get_credentials", {"assetId": "test-asset-1", "credentialType": "ssh"}, "Get credentials from vault"),
    
    # === CONNECTION BLOCKS ===
    ("connection.ping", {"host": TEST_HOSTS["external"], "count": 2, "timeout": 3}, "Ping external host"),
    ("connection.tcp_test", {"host": TEST_HOSTS["postgres"], "port": 5432, "timeout": 5}, "TCP connection to PostgreSQL"),
    ("connection.ssh_test", {"host": TEST_HOSTS["localhost"], "port": 22, "timeout": 5}, "SSH connection test"),
    ("connection.http_test", {"url": "http://localhost:12001/api/v1/health", "method": "GET"}, "HTTP health check"),
    ("connection.telnet_test", {"host": TEST_HOSTS["redis"], "port": 6379, "timeout": 5}, "Telnet to Redis"),
    
    # === COMMAND BLOCKS ===
    ("command.ssh_execute", {"host": TEST_HOSTS["localhost"], "command": "echo 'test'", "timeout": 10}, "Execute SSH command"),
    ("command.http_request", {"url": "http://localhost:12001/api/v1/health", "method": "GET"}, "HTTP API request"),
    ("command.local_execute", {"command": "echo 'hello world'"}, "Execute local command"),
    ("command.snmp_get", {"host": TEST_HOSTS["localhost"], "oid": "1.3.6.1.2.1.1.1.0", "community": "public"}, "SNMP GET"),
    ("command.script_run", {"script": "print('test')", "language": "python"}, "Run inline script"),
    
    # === TRAFFIC BLOCKS ===
    ("traffic.capture_start", {"interface": "eth0", "filter": "icmp", "duration": 5}, "Start packet capture"),
    ("traffic.analyze", {"protocol": "tcp", "source": "any"}, "Analyze traffic"),
    ("traffic.replay", {"file": "test.pcap", "interface": "eth0"}, "Replay captured traffic"),
    ("traffic.bandwidth_test", {"target": TEST_HOSTS["external"], "duration": 2}, "Bandwidth test"),
    ("traffic.latency_test", {"target": TEST_HOSTS["external"], "count": 3}, "Latency test"),
    ("traffic.dns_query", {"domain": "google.com", "server": "8.8.8.8"}, "DNS query"),
    ("traffic.traceroute", {"target": TEST_HOSTS["external"], "max_hops": 5}, "Traceroute"),
    
    # === SCANNING BLOCKS ===
    ("scanning.port_scan", {"target": TEST_HOSTS["postgres"], "ports": "5432,6379,22", "timeout": 10}, "Port scan"),
    ("scanning.network_discovery", {"subnet": "172.29.0.0/24", "method": "ping"}, "Network discovery"),
    ("scanning.vulnerability_scan", {"target": TEST_HOSTS["localhost"], "scan_type": "quick"}, "Vulnerability scan"),
    ("scanning.nmap", {"target": TEST_HOSTS["postgres"], "options": "-sT -p 5432"}, "Nmap scan"),
    ("scanning.service_detection", {"target": TEST_HOSTS["postgres"], "port": 5432}, "Service detection"),
    ("scanning.os_detection", {"target": TEST_HOSTS["postgres"]}, "OS detection"),
    ("scanning.ssl_scan", {"target": "google.com", "port": 443}, "SSL/TLS scan"),
    ("scanning.dns_enum", {"domain": "google.com"}, "DNS enumeration"),
    ("scanning.web_scan", {"url": "http://localhost:12001"}, "Web scan"),
    ("scanning.smb_enum", {"target": TEST_HOSTS["localhost"]}, "SMB enumeration"),
    ("scanning.snmp_walk", {"target": TEST_HOSTS["localhost"], "community": "public"}, "SNMP walk"),
    
    # === AGENT BLOCKS ===
    ("agent.deploy", {"target": TEST_HOSTS["localhost"], "agent_type": "monitoring"}, "Deploy agent"),
    ("agent.check_status", {"target": TEST_HOSTS["localhost"]}, "Check agent status"),
    ("agent.remove", {"target": TEST_HOSTS["localhost"]}, "Remove agent"),
    ("agent.update", {"target": TEST_HOSTS["localhost"], "version": "latest"}, "Update agent"),
    
    # === CONTROL BLOCKS ===
    ("control.delay", {"seconds": 1}, "Delay for 1 second"),
    ("control.condition", {"expression": "true"}, "Conditional check"),
    ("control.loop", {"mode": "count", "count": 3}, "Loop 3 times"),
    ("control.variable_set", {"name": "test_var", "value": "hello"}, "Set variable"),
    ("control.parallel", {"branches": 2}, "Parallel execution"),
    
    # === DATA BLOCKS ===
    ("data.parse_json", {"input": '{"key": "value"}', "path": "$.key"}, "Parse JSON"),
    ("data.transform", {"input": "hello", "operation": "uppercase"}, "Transform data"),
    ("data.aggregate", {"operation": "count", "field": "items"}, "Aggregate data"),
    ("data.filter", {"expression": "value > 10"}, "Filter data"),
    
    # === NOTIFICATION BLOCKS ===
    ("notification.log", {"message": "Test log message", "level": "info"}, "Log message"),
    ("notification.alert", {"message": "Test alert", "severity": "low"}, "Send alert"),
    ("notification.email", {"to": "test@example.com", "subject": "Test", "body": "Test email"}, "Send email"),
    ("notification.webhook", {"url": "http://localhost:12001/api/v1/health", "method": "GET"}, "Webhook"),
]

def run_block_tests():
    """Run all block tests"""
    print("\n" + "=" * 70)
    print("COMPREHENSIVE BLOCK TESTING - Frontend Simulation")
    print("=" * 70)
    
    results = []
    passed = 0
    failed = 0
    
    for block_type, params, description in BLOCK_TESTS:
        category = block_type.split(".")[0].upper()
        print(f"\n[{category}] Testing: {block_type}")
        print(f"  Description: {description}")
        print(f"  Parameters: {json.dumps(params, indent=2)[:100]}...")
        
        result = test_block(block_type, params, description)
        results.append(result)
        
        if result["success"]:
            print(f"  ✓ PASSED - Status: {result['status']}")
            passed += 1
        else:
            print(f"  ✗ FAILED - Status: {result['status']}")
            if result.get("errors"):
                print(f"  Errors: {result['errors'][:200]}")
            failed += 1
    
    # Summary
    print("\n" + "=" * 70)
    print("BLOCK TEST SUMMARY")
    print("=" * 70)
    print(f"Total: {len(results)} | Passed: {passed} | Failed: {failed}")
    print(f"Success Rate: {100*passed/len(results):.1f}%")
    
    # By category
    print("\nBy Category:")
    categories = {}
    for r in results:
        cat = r["block"].split(".")[0]
        if cat not in categories:
            categories[cat] = {"passed": 0, "failed": 0}
        if r["success"]:
            categories[cat]["passed"] += 1
        else:
            categories[cat]["failed"] += 1
    
    for cat, stats in sorted(categories.items()):
        total = stats["passed"] + stats["failed"]
        pct = 100 * stats["passed"] / total
        status = "✓" if pct == 100 else "◐" if pct >= 50 else "✗"
        print(f"  {status} {cat.upper():12} {stats['passed']}/{total} ({pct:.0f}%)")
    
    return results

def test_all_workflows():
    """Test all existing workflows"""
    print("\n" + "=" * 70)
    print("WORKFLOW TEMPLATE TESTING")
    print("=" * 70)
    
    # Get all workflows
    resp = requests.get(f"{BASE_URL}/workflows/", headers=headers())
    if resp.status_code != 200:
        print("Failed to get workflows")
        return []
    
    workflows = resp.json().get("workflows", [])
    standard_wfs = [w for w in workflows if w.get("name", "").startswith("T")]
    
    print(f"\nFound {len(standard_wfs)} standard workflows")
    
    results = []
    for wf in sorted(standard_wfs, key=lambda x: x.get("name", "")):
        name = wf.get("name")
        wf_id = wf.get("id")
        print(f"\n  Testing: {name}")
        
        # Execute workflow
        start = time.time()
        result = execute_workflow(wf_id, {"targets": [TEST_HOSTS["external"]]})
        duration = int((time.time() - start) * 1000)
        
        status = result.get("status", "unknown")
        success = status == "completed"
        
        results.append({
            "name": name,
            "status": status,
            "success": success,
            "duration_ms": duration
        })
        
        if success:
            print(f"    ✓ Status: {status} ({duration}ms)")
        else:
            print(f"    ✗ Status: {status} ({duration}ms)")
            if result.get("errors"):
                print(f"    Errors: {result['errors'][:100]}")
    
    # Summary
    passed = sum(1 for r in results if r["success"])
    print("\n" + "-" * 50)
    print(f"Workflow Summary: {passed}/{len(results)} passed ({100*passed/len(results):.0f}%)")
    
    return results

def main():
    print("\n" + "=" * 70)
    print("NOP COMPREHENSIVE FRONTEND TESTING")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 70)
    
    # Login
    print("\n[AUTH] Logging in...")
    if not login():
        print("✗ Login failed!")
        sys.exit(1)
    print("✓ Login successful")
    
    # Test all blocks
    block_results = run_block_tests()
    
    # Test all workflows
    workflow_results = test_all_workflows()
    
    # Final summary
    print("\n" + "=" * 70)
    print("FINAL SUMMARY")
    print("=" * 70)
    
    block_passed = sum(1 for r in block_results if r["success"])
    wf_passed = sum(1 for r in workflow_results if r["success"])
    
    print(f"\nBlocks:    {block_passed}/{len(block_results)} passed ({100*block_passed/len(block_results):.1f}%)")
    print(f"Workflows: {wf_passed}/{len(workflow_results)} passed ({100*wf_passed/len(workflow_results):.1f}%)")
    
    total = len(block_results) + len(workflow_results)
    total_passed = block_passed + wf_passed
    print(f"\nOVERALL:   {total_passed}/{total} passed ({100*total_passed/total:.1f}%)")
    
    print(f"\nCompleted: {datetime.now().isoformat()}")
    
    # Return exit code
    if total_passed == total:
        print("\n✓ ALL TESTS PASSED")
        return 0
    else:
        print(f"\n✗ {total - total_passed} TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
