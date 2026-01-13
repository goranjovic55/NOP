#!/usr/bin/env python3
"""
End-to-End Block Testing Script
Tests all workflow blocks with real hosts through the API
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:12001/api/v1"

# Test hosts (Docker containers)
TEST_HOSTS = {
    "postgresql": {"ip": "172.29.0.10", "port": 5432},
    "redis": {"ip": "172.29.0.11", "port": 6379},
    "ssh": {"ip": "172.21.0.10", "port": 22},
}


def get_auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={"username": "admin", "password": "admin123"}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    raise Exception(f"Auth failed: {response.text}")


def execute_block(token, block_type, parameters):
    """Execute a single block and return result"""
    response = requests.post(
        f"{BASE_URL}/workflows/block/execute",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        json={"block_type": block_type, "parameters": parameters},
        timeout=60
    )
    return response.json()


def test_block(token, block_type, parameters, expected_check=None, description=""):
    """Test a block and verify the result"""
    print(f"  Testing {block_type}...", end=" ")
    try:
        result = execute_block(token, block_type, parameters)
        success = result.get("success", False)
        output = result.get("output", {})
        error = result.get("error")
        
        # Check expected condition if provided
        check_passed = True
        if expected_check and callable(expected_check):
            check_passed = expected_check(result)
        
        if success and check_passed:
            print(f"✓ PASS - {description or json.dumps(output)[:60]}")
            return True, result
        else:
            print(f"✗ FAIL - {error or 'Check failed'}")
            return False, result
    except Exception as e:
        print(f"✗ ERROR - {str(e)}")
        return False, {"error": str(e)}


def run_all_tests():
    """Run all block tests"""
    print("=" * 70)
    print("E2E BLOCK TESTING WITH REAL HOSTS")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # Get auth token
    print("\n🔐 Authenticating...")
    try:
        token = get_auth_token()
        print(f"  ✓ Token obtained (length: {len(token)})")
    except Exception as e:
        print(f"  ✗ Auth failed: {e}")
        return 1
    
    results = {"passed": 0, "failed": 0, "tests": []}
    
    # ========================================
    # CONNECTION BLOCKS
    # ========================================
    print("\n📡 CONNECTION BLOCKS")
    print("-" * 50)
    
    # TCP Test - Open Port
    passed, _ = test_block(token, "connection.tcp_test", 
        {"host": TEST_HOSTS["postgresql"]["ip"], "port": 5432},
        lambda r: r.get("output", {}).get("open") == True,
        "PostgreSQL port 5432 is OPEN")
    results["passed" if passed else "failed"] += 1
    
    # TCP Test - Closed Port
    passed, _ = test_block(token, "connection.tcp_test",
        {"host": TEST_HOSTS["postgresql"]["ip"], "port": 9999},
        lambda r: r.get("output", {}).get("open") == False,
        "Port 9999 is CLOSED")
    results["passed" if passed else "failed"] += 1
    
    # SSH Test
    passed, _ = test_block(token, "connection.ssh_test",
        {"host": TEST_HOSTS["ssh"]["ip"], "port": 22},
        lambda r: r.get("output", {}).get("connected") == True,
        "SSH port 22 is connected")
    results["passed" if passed else "failed"] += 1
    
    # TCP Test - Redis
    passed, _ = test_block(token, "connection.tcp_test",
        {"host": TEST_HOSTS["redis"]["ip"], "port": 6379},
        lambda r: r.get("output", {}).get("open") == True,
        "Redis port 6379 is OPEN")
    results["passed" if passed else "failed"] += 1
    
    # ========================================
    # TRAFFIC BLOCKS
    # ========================================
    print("\n🌐 TRAFFIC BLOCKS")
    print("-" * 50)
    
    # Ping
    passed, _ = test_block(token, "traffic.ping",
        {"host": TEST_HOSTS["postgresql"]["ip"], "count": 2},
        lambda r: r.get("output", {}).get("reachable") == True,
        "PostgreSQL is reachable")
    results["passed" if passed else "failed"] += 1
    
    # Ping - SSH Host
    passed, _ = test_block(token, "traffic.ping",
        {"host": TEST_HOSTS["ssh"]["ip"], "count": 2},
        lambda r: r.get("output", {}).get("packets_received", 0) > 0,
        "SSH host responds to ping")
    results["passed" if passed else "failed"] += 1
    
    # ========================================
    # SCANNING BLOCKS
    # ========================================
    print("\n🔍 SCANNING BLOCKS")
    print("-" * 50)
    
    # Port Scan - SSH
    passed, _ = test_block(token, "scanning.port_scan",
        {"host": TEST_HOSTS["ssh"]["ip"], "scanType": "custom", "customPorts": "22"},
        lambda r: 22 in r.get("output", {}).get("open_ports", []),
        "Port 22 found open on SSH host")
    results["passed" if passed else "failed"] += 1
    
    # Port Scan - PostgreSQL
    passed, _ = test_block(token, "scanning.port_scan",
        {"host": TEST_HOSTS["postgresql"]["ip"], "scanType": "custom", "customPorts": "5432"},
        lambda r: 5432 in r.get("output", {}).get("open_ports", []),
        "Port 5432 found open on PostgreSQL")
    results["passed" if passed else "failed"] += 1
    
    # Port Scan - Redis
    passed, _ = test_block(token, "scanning.port_scan",
        {"host": TEST_HOSTS["redis"]["ip"], "scanType": "custom", "customPorts": "6379"},
        lambda r: 6379 in r.get("output", {}).get("open_ports", []),
        "Port 6379 found open on Redis")
    results["passed" if passed else "failed"] += 1
    
    # Ping Sweep
    passed, result = test_block(token, "scanning.ping_sweep",
        {"network": "172.21.0.0/28"},
        lambda r: len(r.get("output", {}).get("alive_hosts", [])) > 0,
        "Found alive hosts in network")
    if passed:
        hosts = result.get("output", {}).get("alive_hosts", [])
        print(f"    → Found hosts: {hosts}")
    results["passed" if passed else "failed"] += 1
    
    # Service Scan
    passed, result = test_block(token, "scanning.service_scan",
        {"host": TEST_HOSTS["ssh"]["ip"], "ports": "22"},
        lambda r: any(s.get("service") == "ssh" for s in r.get("output", {}).get("services", [])),
        "Detected SSH service")
    results["passed" if passed else "failed"] += 1
    
    # Network Discovery
    passed, result = test_block(token, "scanning.network_discovery",
        {"network": "172.29.0.0/28"},
        lambda r: len(r.get("output", {}).get("hosts", [])) > 0,
        "Discovered hosts on network")
    if passed:
        hosts = result.get("output", {}).get("hosts", [])
        print(f"    → Discovered {len(hosts)} hosts")
    results["passed" if passed else "failed"] += 1
    
    # Host Scan
    passed, _ = test_block(token, "scanning.host_scan",
        {"host": TEST_HOSTS["ssh"]["ip"]},
        lambda r: len(r.get("output", {}).get("ports", [])) > 0,  # Has open ports = host is up
        "Host has open ports")
    results["passed" if passed else "failed"] += 1
    
    # ========================================
    # ASSETS BLOCKS
    # ========================================
    print("\n📦 ASSETS BLOCKS")
    print("-" * 50)
    
    # Check Online
    passed, result = test_block(token, "assets.check_online",
        {"host": TEST_HOSTS["postgresql"]["ip"], "method": "ping"},
        lambda r: r.get("output", {}).get("online") == True,
        "PostgreSQL host is online")
    if passed:
        latency = result.get("output", {}).get("latency_ms")
        print(f"    → Latency: {latency}ms")
    results["passed" if passed else "failed"] += 1
    
    # Discover Ping
    passed, result = test_block(token, "assets.discover_ping",
        {"subnet": "172.21.0.0/28"},
        lambda r: len(r.get("output", {}).get("discovered", [])) > 0,
        "Discovered hosts via ping")
    if passed:
        count = result.get("output", {}).get("count", 0)
        print(f"    → Discovered {count} hosts")
    results["passed" if passed else "failed"] += 1
    
    # Get All Assets
    passed, result = test_block(token, "assets.get_all",
        {"includeOffline": True},
        lambda r: isinstance(r.get("output", {}).get("assets"), list),
        "Retrieved assets from database")
    if passed:
        count = result.get("output", {}).get("count", 0)
        print(f"    → {count} assets in database")
    results["passed" if passed else "failed"] += 1
    
    # ========================================
    # CONTROL BLOCKS
    # ========================================
    print("\n⚙️ CONTROL BLOCKS")
    print("-" * 50)
    
    # Start
    passed, _ = test_block(token, "control.start",
        {},
        lambda r: r.get("output", {}).get("started") == True,
        "Workflow started")
    results["passed" if passed else "failed"] += 1
    
    # End
    passed, _ = test_block(token, "control.end",
        {"status": "success", "message": "Test completed"},
        lambda r: r.get("output", {}).get("status") == "success",
        "Workflow ended")
    results["passed" if passed else "failed"] += 1
    
    # Delay
    passed, _ = test_block(token, "control.delay",
        {"seconds": 1},
        lambda r: r.get("output", {}).get("delayed") == 1,
        "Delayed 1 second")
    results["passed" if passed else "failed"] += 1
    
    # Condition
    passed, _ = test_block(token, "control.condition",
        {"expression": "1 > 0"},
        lambda r: r.get("output", {}).get("result") == True,
        "Condition evaluated true")
    results["passed" if passed else "failed"] += 1
    
    # Loop
    passed, _ = test_block(token, "control.loop",
        {"mode": "count", "count": 3},
        lambda r: r.get("output", {}).get("iteration") == 1,
        "Loop iteration 1")
    results["passed" if passed else "failed"] += 1
    
    # Variable Set
    passed, _ = test_block(token, "control.variable_set",
        {"name": "test_var", "value": "hello"},
        lambda r: r.get("output", {}).get("value") == "hello",
        "Variable set")
    results["passed" if passed else "failed"] += 1
    
    # ========================================
    # DATA BLOCKS
    # ========================================
    print("\n📊 DATA BLOCKS")
    print("-" * 50)
    
    # JSON Transform
    passed, _ = test_block(token, "data.json_transform",
        {"input": {"key": "value"}, "expression": "$"},
        lambda r: r.get("success") == True,
        "JSON transformed")
    results["passed" if passed else "failed"] += 1
    
    # ========================================
    # SUMMARY
    # ========================================
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    total = results["passed"] + results["failed"]
    print(f"  Total Tests:  {total}")
    print(f"  Passed:       {results['passed']} ✓")
    print(f"  Failed:       {results['failed']} ✗")
    print(f"  Pass Rate:    {results['passed']/total*100:.1f}%")
    print("=" * 70)
    
    return 0 if results["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(run_all_tests())
