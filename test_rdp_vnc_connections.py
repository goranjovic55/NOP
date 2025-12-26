#!/usr/bin/env python3
"""
Comprehensive test script for RDP and VNC connections through the Access Hub
This script tests the complete connection flow including guacd connectivity
"""

import requests
import socket
import time
import sys
import json
import subprocess

BACKEND_URL = "http://localhost:12000"
BACKEND_API_URL = "http://localhost:12001"

# Test environment host details
RDP_HOST = "172.21.0.50"
RDP_PORT = 3389
RDP_USERNAME = "rdpuser"
RDP_PASSWORD = "rdp123"

VNC_HOST = "172.21.0.51"
VNC_PORT = 5900
VNC_PASSWORD = "vnc123"

GUACD_HOST = "localhost"
GUACD_PORT = 4822


def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_test(text):
    """Print a test name"""
    print(f"\n>>> {text}")


def print_result(success, message):
    """Print a test result"""
    if success:
        print(f"  ✓ [PASS] {message}")
    else:
        print(f"  ✗ [FAIL] {message}")
    return success


def test_tcp_connection(host, port, service_name):
    """Test basic TCP connectivity to a host and port"""
    print_test(f"Testing TCP connectivity to {service_name} ({host}:{port})")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            return print_result(True, f"TCP connection successful to {host}:{port}")
        else:
            return print_result(False, f"TCP connection failed to {host}:{port} - Port not reachable (error {result})")
    except Exception as e:
        return print_result(False, f"TCP connection error: {str(e)}")


def test_guacd_connectivity():
    """Test connectivity to guacd daemon"""
    print_test(f"Testing guacd connectivity ({GUACD_HOST}:{GUACD_PORT})")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((GUACD_HOST, GUACD_PORT))
        
        if result == 0:
            # Try to send a basic guacamole instruction
            sock.sendall(b"6.select,3.vnc;")
            data = sock.recv(1024)
            sock.close()
            
            if data:
                return print_result(True, f"guacd is running and responding (received {len(data)} bytes)")
            else:
                return print_result(False, "guacd connected but not responding")
        else:
            sock.close()
            return print_result(False, f"Cannot connect to guacd (error {result}) - Is guacd container running?")
    except Exception as e:
        return print_result(False, f"guacd connection error: {str(e)}")


def test_docker_container_status():
    """Check if required Docker containers are running"""
    print_test("Checking Docker container status")
    
    required_containers = [
        "nop-custom-rdp",
        "nop-custom-vnc",
    ]
    
    all_running = True
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            timeout=10
        )
        running_containers = result.stdout.strip().split('\n')
        
        for container in required_containers:
            if container in running_containers:
                print_result(True, f"Container {container} is running")
            else:
                print_result(False, f"Container {container} is NOT running")
                all_running = False
                
        # Also check for guacd
        if any('guacd' in c for c in running_containers):
            print_result(True, "guacd container is running")
        else:
            print_result(False, "guacd container is NOT running")
            all_running = False
            
    except subprocess.TimeoutExpired:
        print_result(False, "Docker command timed out")
        all_running = False
    except FileNotFoundError:
        print_result(False, "Docker command not found - is Docker installed?")
        all_running = False
    except Exception as e:
        print_result(False, f"Error checking containers: {str(e)}")
        all_running = False
        
    return all_running


def test_backend_api_status():
    """Test if backend API is accessible"""
    print_test("Testing backend API status")
    try:
        response = requests.get(f"{BACKEND_API_URL}/api/v1/access/status", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print_result(True, f"Backend API is accessible - Status: {data.get('status')}")
            return True
        else:
            return print_result(False, f"Backend API returned {response.status_code}")
    except Exception as e:
        return print_result(False, f"Backend API error: {str(e)}")


def test_rdp_via_api():
    """Test RDP connection via backend API"""
    print_test(f"Testing RDP connection via API to {RDP_HOST}")
    try:
        payload = {
            "host": RDP_HOST,
            "port": RDP_PORT,
            "username": RDP_USERNAME,
            "password": RDP_PASSWORD
        }
        print(f"  Request: POST /api/v1/access/test/rdp")
        print(f"  Payload: host={RDP_HOST}, port={RDP_PORT}, user={RDP_USERNAME}")
        
        response = requests.post(
            f"{BACKEND_API_URL}/api/v1/access/test/rdp",
            json=payload,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_result(True, f"RDP API test successful: {data.get('message')}")
                return True
            else:
                print_result(False, f"RDP API test failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print_result(False, f"API returned {response.status_code}: {response.text}")
            return False
    except Exception as e:
        return print_result(False, f"API request error: {str(e)}")


def test_vnc_tcp_connection():
    """Test VNC TCP connectivity"""
    print_test(f"Testing VNC TCP connectivity to {VNC_HOST}:{VNC_PORT}")
    try:
        payload = {
            "host": VNC_HOST,
            "port": VNC_PORT,
            "timeout": 5
        }
        
        response = requests.post(
            f"{BACKEND_API_URL}/api/v1/access/test/tcp",
            json=payload,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_result(True, f"VNC TCP connection successful")
                return True
            else:
                print_result(False, f"VNC TCP connection failed: {data.get('error')}")
                return False
        else:
            return print_result(False, f"API returned {response.status_code}")
    except Exception as e:
        return print_result(False, f"API request error: {str(e)}")


def test_guacamole_protocol_support():
    """Test that guacd supports RDP and VNC protocols"""
    print_test("Testing guacd protocol support")
    
    protocols_supported = []
    
    # Test RDP
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((GUACD_HOST, GUACD_PORT))
        sock.sendall(b"6.select,3.rdp;")
        data = sock.recv(1024).decode('utf-8', errors='ignore')
        sock.close()
        
        if 'args' in data.lower():
            print_result(True, "RDP protocol is supported by guacd")
            protocols_supported.append('rdp')
        else:
            print_result(False, f"RDP protocol not properly supported (response: {data[:50]})")
    except Exception as e:
        print_result(False, f"RDP protocol test error: {str(e)}")
    
    # Test VNC
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((GUACD_HOST, GUACD_PORT))
        sock.sendall(b"6.select,3.vnc;")
        data = sock.recv(1024).decode('utf-8', errors='ignore')
        sock.close()
        
        if 'args' in data.lower():
            print_result(True, "VNC protocol is supported by guacd")
            protocols_supported.append('vnc')
        else:
            print_result(False, f"VNC protocol not properly supported (response: {data[:50]})")
    except Exception as e:
        print_result(False, f"VNC protocol test error: {str(e)}")
    
    return len(protocols_supported) == 2


def print_diagnostic_info():
    """Print diagnostic information"""
    print_header("DIAGNOSTIC INFORMATION")
    
    print("\n📋 Test Environment Configuration:")
    print(f"  RDP Server: {RDP_HOST}:{RDP_PORT} (user: {RDP_USERNAME})")
    print(f"  VNC Server: {VNC_HOST}:{VNC_PORT}")
    print(f"  guacd: {GUACD_HOST}:{GUACD_PORT}")
    print(f"  Backend API: {BACKEND_API_URL}")
    print(f"  Frontend: {BACKEND_URL}")
    
    print("\n🔍 Network Test Results:")
    # Quick network checks
    rdp_reachable = test_tcp_connection(RDP_HOST, RDP_PORT, "RDP Server")
    vnc_reachable = test_tcp_connection(VNC_HOST, VNC_PORT, "VNC Server")
    guacd_reachable = test_tcp_connection(GUACD_HOST, GUACD_PORT, "guacd")
    
    print("\n📝 Next Steps:")
    if not rdp_reachable or not vnc_reachable:
        print("  1. Ensure test environment containers are running:")
        print("     docker-compose -f docker-compose.test.yml up -d")
        print("  2. Check that the test network exists:")
        print("     docker network ls | grep nop_test-network")
    
    if not guacd_reachable:
        print("  1. Ensure main application containers are running:")
        print("     docker-compose up -d")
        print("  2. Check guacd logs:")
        print("     docker logs $(docker ps -q -f name=guacd)")


def main():
    """Run comprehensive RDP and VNC connection tests"""
    print_header("RDP AND VNC CONNECTION TEST SUITE")
    print("Testing complete connection flow for remote desktop access")
    
    all_tests_passed = True
    
    # 1. Prerequisites
    print_header("PHASE 1: PREREQUISITES")
    all_tests_passed &= test_docker_container_status()
    all_tests_passed &= test_guacd_connectivity()
    all_tests_passed &= test_backend_api_status()
    
    # 2. Network Connectivity
    print_header("PHASE 2: NETWORK CONNECTIVITY")
    all_tests_passed &= test_tcp_connection(RDP_HOST, RDP_PORT, "RDP Server")
    all_tests_passed &= test_tcp_connection(VNC_HOST, VNC_PORT, "VNC Server")
    
    # 3. Protocol Support
    print_header("PHASE 3: PROTOCOL SUPPORT")
    all_tests_passed &= test_guacamole_protocol_support()
    
    # 4. API Tests
    print_header("PHASE 4: API CONNECTION TESTS")
    all_tests_passed &= test_rdp_via_api()
    all_tests_passed &= test_vnc_tcp_connection()
    
    # Print diagnostic info
    print_diagnostic_info()
    
    # Summary
    print_header("TEST SUMMARY")
    if all_tests_passed:
        print("\n✅ ALL TESTS PASSED!")
        print("\n🎯 Next Steps:")
        print("  1. Access the frontend at: " + BACKEND_URL)
        print("  2. Navigate to Access Hub")
        print("  3. Create new connection:")
        print(f"     - RDP: {RDP_HOST} with user '{RDP_USERNAME}' and password '{RDP_PASSWORD}'")
        print(f"     - VNC: {VNC_HOST} with password '{VNC_PASSWORD}'")
        print("  4. The connection should display the remote desktop in the browser")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED")
        print("\n🔧 Troubleshooting:")
        print("  1. Check the diagnostic information above")
        print("  2. Review Docker container logs")
        print("  3. Verify network connectivity between containers")
        print("  4. Check backend logs for detailed error messages")
        return 1


if __name__ == "__main__":
    sys.exit(main())
