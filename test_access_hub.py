#!/usr/bin/env python3
"""
Test Access Hub functionality
"""

import requests
import json
import sys

BACKEND_URL = "http://localhost:12000"

def test_access_hub_status():
    """Test access hub status"""
    print("Testing access hub status...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/access/status", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"[PASS] Access hub status: {data['status']}")
            print(f"  - Active connections: {data['active_connections']}")
            print(f"  - Services: {data['services']}")
            return True
        else:
            print(f"[FAIL] HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return False

def test_tcp_connection():
    """Test TCP connection functionality"""
    print("Testing TCP connection...")
    try:
        payload = {
            "host": "172.19.0.10",  # Test web server
            "port": 80,
            "timeout": 5
        }
        response = requests.post(f"{BACKEND_URL}/api/v1/access/test/tcp", json=payload, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print(f"[PASS] TCP connection to {payload['host']}:{payload['port']} successful")
                return True
            else:
                print(f"[FAIL] TCP connection failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"[FAIL] HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return False

def test_service_scan():
    """Test service scanning"""
    print("Testing service scanning...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/access/scan/services/172.19.0.10", timeout=30)
        if response.status_code == 200:
            data = response.json()
            services = data.get("services", [])
            print(f"[PASS] Service scan found {len(services)} open services:")
            for service in services:
                print(f"  - Port {service['port']}: {service['service']} ({service['status']})")
            return len(services) > 0
        else:
            print(f"[FAIL] HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return False

def test_ssh_connection():
    """Test SSH connection (will fail but should handle gracefully)"""
    print("Testing SSH connection (expected to fail gracefully)...")
    try:
        payload = {
            "host": "172.19.0.11",  # Test SSH server
            "port": 2222,
            "username": "testuser",
            "password": "testpass"
        }
        response = requests.post(f"{BACKEND_URL}/api/v1/access/test/ssh", json=payload, timeout=20)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("[PASS] SSH connection successful")
                return True
            else:
                print(f"[INFO] SSH connection failed as expected: {data.get('error', 'Unknown error')}")
                return True  # Expected failure is still a pass for the test
        else:
            print(f"[FAIL] HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return False

def test_test_environment_services():
    """Test scanning test environment services"""
    print("Testing test environment service scan...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/access/test-environment/services", timeout=60)
        if response.status_code == 200:
            data = response.json()
            hosts_scanned = data.get("hosts_scanned", 0)
            results = data.get("results", [])
            
            total_services = sum(len(result.get("services", [])) for result in results)
            print(f"[PASS] Test environment scan completed:")
            print(f"  - Hosts scanned: {hosts_scanned}")
            print(f"  - Total services found: {total_services}")
            
            for result in results:
                host = result.get("host")
                services = result.get("services", [])
                if services:
                    print(f"  - {host}: {len(services)} services")
                    for service in services:
                        print(f"    * Port {service['port']}: {service['service']}")
            
            return total_services > 0
        else:
            print(f"[FAIL] HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return False

def test_connection_history():
    """Test connection history"""
    print("Testing connection history...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/access/history", timeout=10)
        if response.status_code == 200:
            data = response.json()
            history = data.get("history", [])
            total = data.get("total", 0)
            print(f"[PASS] Connection history retrieved: {total} entries")
            return True
        else:
            print(f"[FAIL] HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return False

def main():
    """Run all access hub tests"""
    print("=" * 60)
    print("Network Observatory Platform (NOP) Access Hub Tests")
    print("=" * 60)
    print()
    
    tests = [
        ("Access Hub Status", test_access_hub_status),
        ("TCP Connection Test", test_tcp_connection),
        ("Service Scanning", test_service_scan),
        ("SSH Connection Test", test_ssh_connection),
        ("Test Environment Services", test_test_environment_services),
        ("Connection History", test_connection_history),
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
    print("ACCESS HUB TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 All access hub features are working correctly!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} access hub features need attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())