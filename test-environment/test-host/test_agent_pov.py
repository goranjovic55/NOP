#!/usr/bin/env python3
"""
Test Agent POV - Verify agent sees correct network perspective
This script tests what the agent running on test-host can observe
"""

import subprocess
import socket
import json
import requests
from datetime import datetime

def run_cmd(cmd):
    """Run shell command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return result.stdout.strip()
    except Exception as e:
        return f"Error: {e}"

def test_network_perspective():
    """Test what networks/hosts are visible from this POV"""
    print("=" * 60)
    print("NETWORK PERSPECTIVE TEST - Agent POV")
    print("=" * 60)
    print()
    
    # 1. Local host info
    print("1. LOCAL HOST INFORMATION")
    print("-" * 40)
    hostname = socket.gethostname()
    print(f"Hostname: {hostname}")
    print(f"IP Addresses:")
    print(run_cmd("hostname -I"))
    print()
    
    # 2. Routing table
    print("2. ROUTING TABLE")
    print("-" * 40)
    print(run_cmd("ip route"))
    print()
    
    # 3. Network interfaces
    print("3. NETWORK INTERFACES")
    print("-" * 40)
    print(run_cmd("ip addr show | grep -E '^[0-9]|inet '"))
    print()
    
    # 4. Test connectivity to different networks
    print("4. NETWORK CONNECTIVITY TESTS")
    print("-" * 40)
    
    test_targets = {
        "Backend (nop-internal)": "172.28.0.1",
        "Postgres (nop-internal)": "172.28.0.10",
        "SSH Server (test-network)": "172.21.0.10",
        "Web Server (test-network)": "172.21.0.20",
        "VNC Server (test-network)": "172.21.0.50",
    }
    
    for name, ip in test_targets.items():
        result = run_cmd(f"ping -c 1 -W 1 {ip} 2>&1 | grep -E 'bytes from|100% packet loss'")
        status = "✓ REACHABLE" if "bytes from" in result else "✗ UNREACHABLE"
        print(f"{name:30} {ip:15} {status}")
    print()
    
    # 5. Quick port scan of local network
    print("5. LOCAL NETWORK SCAN (Quick)")
    print("-" * 40)
    print("Scanning 172.21.0.0/24 for active hosts...")
    scan_result = run_cmd("nmap -sn 172.21.0.0/24 -oG - | grep 'Host:' | head -10")
    print(scan_result if scan_result else "No hosts found")
    print()
    
    # 6. Test backend API access
    print("6. BACKEND API ACCESS TEST")
    print("-" * 40)
    backend_url = "http://172.54.0.1:12001"
    try:
        response = requests.get(f"{backend_url}/api/health", timeout=5)
        print(f"Backend API: ✓ ACCESSIBLE (Status: {response.status_code})")
    except Exception as e:
        print(f"Backend API: ✗ FAILED ({e})")
    print()
    
    # 7. Summary
    print("=" * 60)
    print("EXPECTED BEHAVIOR:")
    print("-" * 60)
    print("✓ Should see test-network (172.21.0.0/16) hosts")
    print("✓ Should NOT see full nop-internal network")
    print("✓ Should reach backend API for C2 connection")
    print("✓ Should reach SSH/RDP/VNC targets in test-network")
    print("=" * 60)

if __name__ == "__main__":
    test_network_perspective()
