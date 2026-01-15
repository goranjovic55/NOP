#!/usr/bin/env python3
"""
Quick Template Test - Tests each template by executing key blocks only
No workflow execution, just block-by-block validation with timeouts
"""

import requests
import json
import sys
from typing import Dict, Any

API_BASE = "http://localhost:12001"
TIMEOUT = 10  # 10 second timeout per request

# Test hosts
SSH_HOST = "172.21.0.10"
WEB_HOST = "172.21.0.20"

def get_token():
    """Get auth token"""
    try:
        resp = requests.post(
            f"{API_BASE}/api/v1/auth/login",
            data={"username": "admin", "password": "admin123"},
            timeout=TIMEOUT
        )
        return resp.json().get("access_token")
    except Exception as e:
        print(f"✗ Login failed: {e}")
        return None

def test_block(token: str, block_type: str, params: Dict[str, Any], name: str) -> bool:
    """Test a single block"""
    try:
        resp = requests.post(
            f"{API_BASE}/api/v1/workflows/block/execute",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"block_type": block_type, "parameters": params, "context": {}},
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            success = data.get("success", False)
            print(f"  {'✓' if success else '✗'} {name}: {block_type}")
            return success
        else:
            print(f"  ✗ {name}: HTTP {resp.status_code}")
            return False
    except requests.Timeout:
        print(f"  ✗ {name}: TIMEOUT")
        return False
    except Exception as e:
        print(f"  ✗ {name}: {str(e)[:50]}")
        return False

def main():
    print("=" * 60)
    print("FLOW TEMPLATES QUICK TEST")
    print("=" * 60)
    
    token = get_token()
    if not token:
        sys.exit(1)
    print("✓ Authenticated\n")
    
    results = {"passed": 0, "failed": 0}
    
    # Template 1: Multi-Host Ping Monitor
    print("[1/9] Multi-Host Ping Monitor")
    if test_block(token, "traffic.ping", {"host": SSH_HOST, "count": 2}, "Ping SSH"):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Template 2: Traffic Baseline Collection
    print("\n[2/9] Traffic Baseline Collection")
    if test_block(token, "traffic.start_capture", {"interface": "eth0"}, "Start Capture"):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Template 3: Network Discovery Pipeline
    print("\n[3/9] Network Discovery Pipeline")
    if test_block(token, "scanning.port_scan", {"host": SSH_HOST, "ports": "22,80"}, "Port Scan"):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Template 4: Security Scan Pipeline
    print("\n[4/9] Security Scan Pipeline")
    if test_block(token, "scanning.version_detect", {"host": WEB_HOST, "ports": "80"}, "Version Detect"):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Template 5: Connectivity Health Check
    print("\n[5/9] Connectivity Health Check")
    if test_block(token, "connection.tcp_test", {"host": WEB_HOST, "port": 80}, "TCP Test"):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Template 6: SSH Command Chain
    print("\n[6/9] SSH Command Chain")
    if test_block(token, "connection.ssh_test", {"host": SSH_HOST, "port": 22}, "SSH Test"):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Template 7: REP Ring Failover Test
    print("\n[7/9] REP Ring Failover Test")
    if test_block(token, "command.ssh_execute", {"host": SSH_HOST, "command": "hostname"}, "SSH Execute"):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Template 8: Agent Mass Deployment
    print("\n[8/9] Agent Mass Deployment")
    if test_block(token, "agent.generate", {"agent_id": "test", "platform": "linux-amd64"}, "Generate Agent"):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Template 9: Agent POV Reconnaissance
    print("\n[9/9] Agent POV Reconnaissance")
    if test_block(token, "traffic.advanced_ping", {"host": SSH_HOST, "count": 1}, "Advanced Ping"):
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    total = results["passed"] + results["failed"]
    print(f"Passed: {results['passed']}/{total}")
    print(f"Failed: {results['failed']}/{total}")
    print(f"Success Rate: {(results['passed']/total)*100:.0f}%")
    
    return 0 if results["failed"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
