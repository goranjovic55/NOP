#!/usr/bin/env python3
"""
Complete Network Observatory Platform (NOP) Test Suite
Tests all functionality: core API, discovery, scanning, traffic analysis, and access hub
"""

import requests
import json
import time
import sys
from typing import Dict, Any

# Configuration
BACKEND_URL = "http://localhost:12000"
FRONTEND_URL = "http://localhost:12001"
NTOPNG_URL = "http://localhost:3001"

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

def test_core_api():
    """Test core API functionality"""
    print("Testing core API functionality...")
    
    # Test health endpoint
    result = test_api_endpoint("/api/v1/health")
    if not result["success"]:
        print(f"[FAIL] Health check failed: {result['error']}")
        return False
    
    health_data = result["data"]
    if health_data.get("status") != "healthy":
        print(f"[FAIL] Health status not healthy: {health_data}")
        return False
    
    print("[PASS] Core API health check successful")
    return True

def test_frontend_access():
    """Test frontend accessibility"""
    print("Testing frontend accessibility...")
    try:
        response = requests.get(FRONTEND_URL, timeout=10)
        if response.status_code == 200:
            print("[PASS] Frontend is accessible")
            return True
        else:
            print(f"[FAIL] Frontend returned HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] Frontend access failed: {str(e)}")
        return False

def test_discovery_service():
    """Test discovery service functionality"""
    print("Testing discovery service...")
    
    # Test discovery status
    result = test_api_endpoint("/api/v1/discovery/status")
    if not result["success"]:
        print(f"[FAIL] Discovery status failed: {result['error']}")
        return False
    
    status = result["data"]
    if status.get("status") != "active":
        print(f"[FAIL] Discovery service not active: {status}")
        return False
    
    print("[PASS] Discovery service is active")
    return True

def test_network_scanning():
    """Test network scanning capabilities"""
    print("Testing network scanning...")
    
    # Test ping functionality
    result = test_api_endpoint("/api/v1/discovery/ping/172.19.0.10", "POST")
    if not result["success"]:
        print(f"[FAIL] Ping test failed: {result['error']}")
        return False
    
    ping_data = result["data"]
    if not ping_data.get("alive"):
        print(f"[FAIL] Ping test shows host not alive: {ping_data}")
        return False
    
    print("[PASS] Network scanning (ping) successful")
    return True

def test_port_scanning():
    """Test port scanning functionality"""
    print("Testing port scanning...")
    
    result = test_api_endpoint("/api/v1/discovery/port-scan/172.19.0.10?ports=80,443", "POST")
    if not result["success"]:
        print(f"[FAIL] Port scan failed: {result['error']}")
        return False
    
    scan_data = result["data"]
    if "hosts" not in scan_data or not scan_data["hosts"]:
        print(f"[FAIL] No hosts in port scan results: {scan_data}")
        return False
    
    host_data = scan_data["hosts"][0]
    open_ports = [p for p in host_data.get("ports", []) if p.get("state") == "open"]
    
    if not open_ports:
        print("[FAIL] No open ports found in scan")
        return False
    
    print(f"[PASS] Port scanning successful - {len(open_ports)} open ports found")
    return True

def test_traffic_analysis():
    """Test traffic analysis functionality"""
    print("Testing traffic analysis...")
    
    # Test ntopng accessibility
    try:
        response = requests.get(NTOPNG_URL, timeout=10, allow_redirects=False)
        if response.status_code not in [200, 302]:
            print(f"[FAIL] ntopng not accessible: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] ntopng access failed: {str(e)}")
        return False
    
    # Test traffic API endpoints
    result = test_api_endpoint("/api/v1/traffic")
    if not result["success"]:
        print(f"[FAIL] Traffic API failed: {result['error']}")
        return False
    
    print("[PASS] Traffic analysis (ntopng + API) accessible")
    return True

def test_access_hub():
    """Test access hub functionality"""
    print("Testing access hub...")
    
    # Test access hub status
    result = test_api_endpoint("/api/v1/access/status")
    if not result["success"]:
        print(f"[FAIL] Access hub status failed: {result['error']}")
        return False
    
    status = result["data"]
    if status.get("status") != "active":
        print(f"[FAIL] Access hub not active: {status}")
        return False
    
    # Test TCP connection functionality
    tcp_test = {
        "host": "172.19.0.10",
        "port": 80,
        "timeout": 5
    }
    result = test_api_endpoint("/api/v1/access/test/tcp", "POST", tcp_test)
    if not result["success"]:
        print(f"[FAIL] TCP connection test failed: {result['error']}")
        return False
    
    tcp_data = result["data"]
    if not tcp_data.get("success"):
        print(f"[FAIL] TCP connection unsuccessful: {tcp_data}")
        return False
    
    print("[PASS] Access hub functionality working")
    return True

def test_comprehensive_scan():
    """Test comprehensive network discovery"""
    print("Testing comprehensive network discovery...")
    
    scan_request = {
        "network": "172.19.0.0/24",
        "scan_type": "ping_only",
        "ports": "80,22,3306"
    }
    
    result = test_api_endpoint("/api/v1/discovery/scan", "POST", scan_request)
    if not result["success"]:
        print(f"[FAIL] Network discovery failed: {result['error']}")
        return False
    
    scan_info = result["data"]
    scan_id = scan_info.get("scan_id")
    
    # Wait for scan completion
    for i in range(10):
        time.sleep(3)
        status_result = test_api_endpoint(f"/api/v1/discovery/scans/{scan_id}")
        if status_result["success"]:
            scan_status = status_result["data"]
            if scan_status.get("status") == "completed":
                results = scan_status.get("results", {})
                live_hosts = results.get("live_hosts", [])
                if len(live_hosts) > 0:
                    print(f"[PASS] Comprehensive scan found {len(live_hosts)} live hosts")
                    return True
                else:
                    print("[FAIL] No live hosts found in comprehensive scan")
                    return False
            elif scan_status.get("status") == "failed":
                print(f"[FAIL] Comprehensive scan failed: {scan_status.get('error')}")
                return False
    
    print("[FAIL] Comprehensive scan timed out")
    return False

def test_service_discovery():
    """Test service discovery on test environment"""
    print("Testing service discovery...")
    
    result = test_api_endpoint("/api/v1/access/test-environment/services")
    if not result["success"]:
        print(f"[FAIL] Service discovery failed: {result['error']}")
        return False
    
    data = result["data"]
    hosts_scanned = data.get("hosts_scanned", 0)
    results = data.get("results", [])
    
    total_services = sum(len(result.get("services", [])) for result in results)
    
    if total_services == 0:
        print("[FAIL] No services discovered in test environment")
        return False
    
    print(f"[PASS] Service discovery found {total_services} services across {hosts_scanned} hosts")
    return True

def test_database_connectivity():
    """Test database connectivity through API"""
    print("Testing database connectivity...")
    
    # Test assets endpoint (requires database)
    result = test_api_endpoint("/api/v1/assets")
    if not result["success"]:
        print(f"[FAIL] Database connectivity test failed: {result['error']}")
        return False
    
    print("[PASS] Database connectivity working")
    return True

def main():
    """Run complete platform test suite"""
    print("=" * 70)
    print("Network Observatory Platform (NOP) - Complete Test Suite")
    print("=" * 70)
    print()
    
    test_suites = [
        ("Core API", test_core_api),
        ("Frontend Access", test_frontend_access),
        ("Discovery Service", test_discovery_service),
        ("Network Scanning", test_network_scanning),
        ("Port Scanning", test_port_scanning),
        ("Traffic Analysis", test_traffic_analysis),
        ("Access Hub", test_access_hub),
        ("Comprehensive Scan", test_comprehensive_scan),
        ("Service Discovery", test_service_discovery),
        ("Database Connectivity", test_database_connectivity),
    ]
    
    passed = 0
    total = len(test_suites)
    
    for test_name, test_func in test_suites:
        print(f"--- {test_name} ---")
        try:
            if test_func():
                passed += 1
            print()
        except Exception as e:
            print(f"[ERROR] Test {test_name} crashed: {str(e)}")
            print()
    
    print("=" * 70)
    print("COMPLETE PLATFORM TEST SUMMARY")
    print("=" * 70)
    print(f"Total Test Suites: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    print()
    
    if passed == total:
        print("🎉 ALL PLATFORM FEATURES ARE WORKING CORRECTLY!")
        print()
        print("✅ Network Observatory Platform (NOP) is fully operational:")
        print("   • Core API and database connectivity")
        print("   • Frontend React application")
        print("   • Advanced network discovery and scanning")
        print("   • Port scanning and service detection")
        print("   • Traffic analysis with ntopng")
        print("   • Access hub for remote connections")
        print("   • Comprehensive test environment")
        print()
        print("🌐 Access URLs:")
        print(f"   • Frontend: {FRONTEND_URL}")
        print(f"   • Backend API: {BACKEND_URL}")
        print(f"   • Traffic Analysis: {NTOPNG_URL}")
        print()
        return 0
    else:
        print(f"⚠️  {total - passed} platform features need attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())