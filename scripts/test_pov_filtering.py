#!/usr/bin/env python3
"""
POV Filtering Test Script
Tests all endpoints that should support agent POV filtering
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "admin"
PASSWORD = "admin123"
AGENT_ID = "7b17de60-3e63-4951-831d-684cdfc9bd20"

def get_token():
    """Authenticate and get token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": USERNAME, "password": PASSWORD}
    )
    if response.status_code != 200:
        print(f"❌ Authentication failed: {response.status_code}")
        print(f"   Response: {response.text}")
        sys.exit(1)
    token = response.json()["access_token"]
    print(f"✓ Authenticated successfully")
    return token

def test_endpoint(name, url, headers, expected_pov_indicator=None):
    """Test an endpoint with and without POV"""
    print(f"\n📡 Testing: {name}")
    
    # Test without POV
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"  ❌ Failed without POV: {response.status_code}")
        return False
    data_without_pov = response.json()
    print(f"  ✓ Without POV: {response.status_code}")
    
    # Test with POV
    pov_headers = {**headers, "X-Agent-POV": AGENT_ID}
    response = requests.get(url, headers=pov_headers)
    if response.status_code != 200:
        print(f"  ❌ Failed with POV: {response.status_code}")
        return False
    data_with_pov = response.json()
    print(f"  ✓ With POV: {response.status_code}")
    
    # Check if POV filtering is working
    if expected_pov_indicator:
        if expected_pov_indicator in str(data_with_pov):
            print(f"  ✓ POV filtering working (found '{expected_pov_indicator}')")
        else:
            print(f"  ⚠ POV response may not be filtered correctly")
            print(f"    Data: {json.dumps(data_with_pov, indent=2)[:200]}...")
    
    return True

def main():
    print("=" * 60)
    print("POV Filtering Test Suite")
    print("=" * 60)
    
    # Authenticate
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test endpoints
    tests = [
        ("Host System Info", f"{BASE_URL}/host/system/info", "_source"),
        ("Host System Metrics", f"{BASE_URL}/host/system/metrics", "_source"),
        ("Host Processes", f"{BASE_URL}/host/system/processes", None),
        ("Host Connections", f"{BASE_URL}/host/system/connections", None),
        ("Host Disk I/O", f"{BASE_URL}/host/system/disk-io", None),
        ("Traffic Interfaces", f"{BASE_URL}/traffic/interfaces", None),
        ("Dashboard Metrics", f"{BASE_URL}/dashboard/metrics", None),
        ("Assets List", f"{BASE_URL}/assets", None),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, url, indicator in tests:
        try:
            if test_endpoint(test_name, url, headers, indicator):
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")
            failed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
