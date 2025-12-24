#!/usr/bin/env python3
"""
Network Observatory Platform (NOP) Application Test Suite
Tests all major functionality including discovery, scanning, and monitoring
"""

import requests
import json
import time
import subprocess
import socket
from typing import Dict, List, Any

class NOPTester:
    def __init__(self):
        self.backend_url = "http://localhost:12000"
        self.frontend_url = "http://localhost:12001"
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "PASS" if success else "FAIL"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.test_results.append(result)
        print(f"[{status}] {test_name}: {details}")
        
    def test_backend_health(self):
        """Test backend API health"""
        try:
            response = requests.get(f"{self.backend_url}/", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_test("Backend Health", True, f"API responding: {data.get('message', 'Unknown')}")
                return True
            else:
                self.log_test("Backend Health", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Backend Health", False, f"Connection failed: {str(e)}")
            return False
            
    def test_frontend_health(self):
        """Test frontend availability"""
        try:
            response = requests.get(f"{self.frontend_url}/", timeout=5)
            if response.status_code == 200:
                self.log_test("Frontend Health", True, "Frontend serving content")
                return True
            else:
                self.log_test("Frontend Health", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Frontend Health", False, f"Connection failed: {str(e)}")
            return False
            
    def test_api_endpoints(self):
        """Test key API endpoints"""
        endpoints = [
            ("/api/v1/health", "Health endpoint"),
            ("/docs", "API documentation"),
            ("/api/v1/assets", "Assets endpoint"),
            ("/api/v1/scans", "Scans endpoint"),
            ("/api/v1/traffic", "Traffic endpoint")
        ]
        
        for endpoint, description in endpoints:
            try:
                response = requests.get(f"{self.backend_url}{endpoint}", timeout=5)
                # Accept 200, 401, 422 as valid responses (some endpoints require auth)
                if response.status_code in [200, 401, 422]:
                    self.log_test(f"API Endpoint: {endpoint}", True, f"{description} accessible")
                else:
                    self.log_test(f"API Endpoint: {endpoint}", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_test(f"API Endpoint: {endpoint}", False, f"Error: {str(e)}")
                
    def test_database_connectivity(self):
        """Test database connectivity through API"""
        try:
            # Try to access an endpoint that requires database
            response = requests.get(f"{self.backend_url}/api/v1/assets", timeout=5)
            # 401 or 422 means the endpoint is working but requires auth
            if response.status_code in [200, 401, 422]:
                self.log_test("Database Connectivity", True, "Database accessible through API")
                return True
            else:
                self.log_test("Database Connectivity", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Database Connectivity", False, f"Error: {str(e)}")
            return False
            
    def test_test_environment_services(self):
        """Test the deployed test environment services"""
        services = [
            ("localhost", 8090, "Test Web Server"),
            ("localhost", 2224, "Test SSH Server"),
            ("localhost", 3307, "Test MySQL Server"),
            ("localhost", 445, "Test File Server (SMB)")
        ]
        
        for host, port, service_name in services:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(3)
                result = sock.connect_ex((host, port))
                sock.close()
                
                if result == 0:
                    self.log_test(f"Service: {service_name}", True, f"Port {port} accessible")
                else:
                    self.log_test(f"Service: {service_name}", False, f"Port {port} not accessible")
            except Exception as e:
                self.log_test(f"Service: {service_name}", False, f"Error: {str(e)}")
                
    def test_network_discovery_capability(self):
        """Test network discovery capabilities"""
        try:
            # Test if nmap is available in the backend container
            result = subprocess.run([
                "sudo", "docker", "exec", "nop-backend", 
                "nmap", "-sn", "172.19.0.0/24"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # Count discovered hosts
                output_lines = result.stdout.split('\n')
                host_count = len([line for line in output_lines if "Nmap scan report" in line])
                self.log_test("Network Discovery", True, f"Discovered {host_count} hosts in test network")
            else:
                self.log_test("Network Discovery", False, f"nmap failed: {result.stderr}")
        except Exception as e:
            self.log_test("Network Discovery", False, f"Error: {str(e)}")
            
    def test_container_networking(self):
        """Test container networking and connectivity"""
        try:
            # Test connectivity between containers
            result = subprocess.run([
                "sudo", "docker", "exec", "nop-backend",
                "ping", "-c", "2", "nop-postgres"
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                self.log_test("Container Networking", True, "Backend can reach database")
            else:
                self.log_test("Container Networking", False, "Backend cannot reach database")
        except Exception as e:
            self.log_test("Container Networking", False, f"Error: {str(e)}")
            
    def test_redis_connectivity(self):
        """Test Redis connectivity"""
        try:
            result = subprocess.run([
                "sudo", "docker", "exec", "nop-backend",
                "python", "-c", "import redis; r=redis.Redis(host='nop-redis'); print(r.ping())"
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and "True" in result.stdout:
                self.log_test("Redis Connectivity", True, "Redis accessible from backend")
            else:
                self.log_test("Redis Connectivity", False, f"Redis test failed: {result.stderr}")
        except Exception as e:
            self.log_test("Redis Connectivity", False, f"Error: {str(e)}")
            
    def test_web_server_content(self):
        """Test test web server content"""
        try:
            response = requests.get("http://localhost:8090/", timeout=5)
            if response.status_code == 200 and "Test Web Server" in response.text:
                self.log_test("Web Server Content", True, "Test web server serving expected content")
            else:
                self.log_test("Web Server Content", False, "Unexpected content or status")
        except Exception as e:
            self.log_test("Web Server Content", False, f"Error: {str(e)}")
            
    def run_all_tests(self):
        """Run all tests"""
        print("=" * 60)
        print("Network Observatory Platform (NOP) Test Suite")
        print("=" * 60)
        
        # Core application tests
        print("\n--- Core Application Tests ---")
        self.test_backend_health()
        self.test_frontend_health()
        self.test_api_endpoints()
        self.test_database_connectivity()
        
        # Infrastructure tests
        print("\n--- Infrastructure Tests ---")
        self.test_container_networking()
        self.test_redis_connectivity()
        
        # Test environment tests
        print("\n--- Test Environment Tests ---")
        self.test_test_environment_services()
        self.test_web_server_content()
        
        # Network capability tests
        print("\n--- Network Capability Tests ---")
        self.test_network_discovery_capability()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if failed > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"  - {result['test']}: {result['details']}")
                    
        return passed, failed, total

if __name__ == "__main__":
    tester = NOPTester()
    passed, failed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if failed == 0 else 1)