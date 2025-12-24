#!/usr/bin/env python3
"""
Advanced Network Observatory Platform (NOP) Feature Test Suite
Tests the advanced scanning, discovery, and traffic analysis features
"""

import requests
import json
import time
import sys
from typing import Dict, Any

# Configuration
BACKEND_URL = "http://localhost:12000"
NTOPNG_URL = "http://localhost:3001"
TEST_HOSTS = [
    "172.19.0.10",  # Test web server
    "172.19.0.11",  # Test SSH server
    "172.19.0.12",  # Test database
    "172.19.0.13"   # Test SMB server
]

def test_api_endpoint(endpoint: str, method: str = "GET", data: Dict = None) -> Dict[str, Any]:
    """Test an API endpoint and return results"""
    try:
        url = f"{BACKEND_URL}{endpoint}"
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=30)
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def test_discovery_status():
    """Test discovery service status"""
    print("Testing discovery service status...")
    result = test_api_endpoint("/api/v1/discovery/status")
    if result["success"]:
        status = result["data"]
        if status.get("status") == "active" and status.get("scanner_available"):
            print("[PASS] Discovery service is active and scanner available")
            return True
        else:
            print(f"[FAIL] Discovery service status: {status}")
            return False
    else:
        print(f"[FAIL] Discovery status check failed: {result['error']}")
        return False

def test_ping_hosts():
    """Test ping functionality on test hosts"""
    print("Testing ping functionality...")
    passed = 0
    total = len(TEST_HOSTS)
    
    for host in TEST_HOSTS:
        result = test_api_endpoint(f"/api/v1/discovery/ping/{host}", "POST")
        if result["success"]:
            ping_result = result["data"]
            if ping_result.get("alive"):
                print(f"[PASS] Ping {host}: Host is alive")
                passed += 1
            else:
                print(f"[FAIL] Ping {host}: Host not responding")
        else:
            print(f"[FAIL] Ping {host} failed: {result['error']}")
    
    print(f"Ping test summary: {passed}/{total} hosts responding")
    return passed > 0

def test_port_scanning():
    """Test port scanning functionality"""
    print("Testing port scanning...")
    # Test web server port 80
    result = test_api_endpoint("/api/v1/discovery/port-scan/172.19.0.10?ports=80,443,8080", "POST")
    
    if result["success"]:
        scan_data = result["data"]
        if "hosts" in scan_data and len(scan_data["hosts"]) > 0:
            host_data = scan_data["hosts"][0]
            open_ports = [p for p in host_data.get("ports", []) if p.get("state") == "open"]
            if open_ports:
                print(f"[PASS] Port scan found {len(open_ports)} open ports")
                for port in open_ports:
                    print(f"  - Port {port['portid']}/{port['protocol']}: {port['state']}")
                return True
            else:
                print("[FAIL] No open ports found in scan")
                return False
        else:
            print("[FAIL] No host data in scan results")
            return False
    else:
        print(f"[FAIL] Port scan failed: {result['error']}")
        return False

def test_network_discovery():
    """Test network discovery scan"""
    print("Testing network discovery...")
    
    # Start a network discovery scan
    scan_request = {
        "network": "172.19.0.0/24",
        "scan_type": "ping_only",
        "ports": "1-1000"
    }
    
    result = test_api_endpoint("/api/v1/discovery/scan", "POST", scan_request)
    
    if result["success"]:
        scan_info = result["data"]
        scan_id = scan_info.get("scan_id")
        print(f"[INFO] Started network discovery scan: {scan_id}")
        
        # Wait for scan to complete
        for i in range(10):  # Wait up to 30 seconds
            time.sleep(3)
            status_result = test_api_endpoint(f"/api/v1/discovery/scans/{scan_id}")
            if status_result["success"]:
                scan_status = status_result["data"]
                if scan_status.get("status") == "completed":
                    results = scan_status.get("results", {})
                    live_hosts = results.get("live_hosts", [])
                    print(f"[PASS] Network discovery completed: {len(live_hosts)} live hosts found")
                    for host in live_hosts:
                        print(f"  - {host}")
                    return len(live_hosts) > 0
                elif scan_status.get("status") == "failed":
                    print(f"[FAIL] Network discovery failed: {scan_status.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"[FAIL] Failed to check scan status: {status_result['error']}")
                return False
        
        print("[FAIL] Network discovery scan timed out")
        return False
    else:
        print(f"[FAIL] Failed to start network discovery: {result['error']}")
        return False

def test_host_scanning():
    """Test comprehensive host scanning"""
    print("Testing comprehensive host scanning...")
    
    scan_request = {
        "host": "172.19.0.10",
        "scan_type": "ports",
        "ports": "80,443,22,3306"
    }
    
    result = test_api_endpoint("/api/v1/discovery/scan/host", "POST", scan_request)
    
    if result["success"]:
        scan_info = result["data"]
        scan_id = scan_info.get("scan_id")
        print(f"[INFO] Started host scan: {scan_id}")
        
        # Wait for scan to complete
        for i in range(10):  # Wait up to 30 seconds
            time.sleep(3)
            status_result = test_api_endpoint(f"/api/v1/discovery/scans/{scan_id}")
            if status_result["success"]:
                scan_status = status_result["data"]
                if scan_status.get("status") == "completed":
                    results = scan_status.get("results", {})
                    if "hosts" in results and results["hosts"]:
                        host_data = results["hosts"][0]
                        ports = host_data.get("ports", [])
                        print(f"[PASS] Host scan completed: {len(ports)} ports scanned")
                        open_ports = [p for p in ports if p.get("state") == "open"]
                        print(f"  - {len(open_ports)} open ports found")
                        return True
                    else:
                        print("[FAIL] No host data in scan results")
                        return False
                elif scan_status.get("status") == "failed":
                    print(f"[FAIL] Host scan failed: {scan_status.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"[FAIL] Failed to check scan status: {status_result['error']}")
                return False
        
        print("[FAIL] Host scan timed out")
        return False
    else:
        print(f"[FAIL] Failed to start host scan: {result['error']}")
        return False

def test_ntopng_access():
    """Test ntopng traffic analysis interface"""
    print("Testing ntopng traffic analysis...")
    
    try:
        response = requests.get(NTOPNG_URL, timeout=10, allow_redirects=False)
        if response.status_code in [200, 302]:  # 302 is redirect to login
            print("[PASS] ntopng interface is accessible")
            return True
        else:
            print(f"[FAIL] ntopng returned HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] ntopng access failed: {str(e)}")
        return False

def test_traffic_endpoints():
    """Test traffic analysis API endpoints"""
    print("Testing traffic analysis API endpoints...")
    
    # Test traffic overview
    result = test_api_endpoint("/api/v1/traffic")
    if result["success"]:
        traffic_data = result["data"]
        if "message" in traffic_data and "endpoints" in traffic_data:
            print("[PASS] Traffic overview endpoint accessible")
        else:
            print("[FAIL] Traffic overview missing expected data")
            return False
    else:
        print(f"[FAIL] Traffic overview failed: {result['error']}")
        return False
    
    # Test traffic flows
    result = test_api_endpoint("/api/v1/traffic/flows")
    if result["success"]:
        flows_data = result["data"]
        if "flows" in flows_data and "total" in flows_data:
            print("[PASS] Traffic flows endpoint accessible")
            return True
        else:
            print("[FAIL] Traffic flows missing expected data")
            return False
    else:
        print(f"[FAIL] Traffic flows failed: {result['error']}")
        return False

def main():
    """Run all advanced feature tests"""
    print("=" * 60)
    print("Network Observatory Platform (NOP) Advanced Feature Tests")
    print("=" * 60)
    print()
    
    tests = [
        ("Discovery Service Status", test_discovery_status),
        ("Ping Functionality", test_ping_hosts),
        ("Port Scanning", test_port_scanning),
        ("Network Discovery", test_network_discovery),
        ("Host Scanning", test_host_scanning),
        ("ntopng Access", test_ntopng_access),
        ("Traffic Analysis APIs", test_traffic_endpoints),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"--- {test_name} ---")
        try:
            if test_func():
                passed += 1
            print()
        except Exception as e:
            print(f"[ERROR] Test {test_name} crashed: {str(e)}")
            print()
    
    print("=" * 60)
    print("ADVANCED FEATURE TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 All advanced features are working correctly!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} advanced features need attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())