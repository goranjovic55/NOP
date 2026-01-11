#!/usr/bin/env python3
"""
Test Flow Templates Against Real Test Hosts
Tests each block type used in the practical flow templates.

Test Environment:
- SSH Server: 172.21.0.10:22 (vulnerable-ssh)
- Web Server: 172.21.0.20:80 (vulnerable-web)
- FTP Server: 172.21.0.30:21 (vulnerable-ftp)
"""

import requests
import json
import time
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

# Configuration
API_BASE = "http://localhost:12001"
TEST_HOSTS = {
    "ssh": "172.21.0.10",
    "web": "172.21.0.20",
    "ftp": "172.21.0.30",
}

@dataclass
class TestResult:
    block_type: str
    success: bool
    duration_ms: int
    output: Dict[str, Any]
    error: Optional[str] = None

class FlowTemplatesTester:
    def __init__(self):
        self.token = None
        self.results: List[TestResult] = []
        
    def login(self) -> bool:
        """Get auth token"""
        try:
            resp = requests.post(
                f"{API_BASE}/api/v1/auth/login",
                data={"username": "admin", "password": "admin123"},
                timeout=10
            )
            if resp.status_code == 200:
                self.token = resp.json().get("access_token")
                print(f"✓ Logged in successfully")
                return True
            else:
                print(f"✗ Login failed: {resp.status_code}")
                return False
        except Exception as e:
            print(f"✗ Login error: {e}")
            return False
    
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def execute_block(self, block_type: str, params: Dict[str, Any], context: Dict[str, Any] = None) -> TestResult:
        """Execute a single block and return result"""
        start = time.time()
        try:
            resp = requests.post(
                f"{API_BASE}/api/v1/workflows/block/execute",
                headers=self.headers(),
                json={
                    "block_type": block_type,
                    "parameters": params,
                    "context": context or {}
                },
                timeout=15
            )
            duration = int((time.time() - start) * 1000)
            
            if resp.status_code == 200:
                data = resp.json()
                return TestResult(
                    block_type=block_type,
                    success=data.get("success", False),
                    duration_ms=duration,
                    output=data.get("output", {}),
                    error=data.get("error")
                )
            else:
                return TestResult(
                    block_type=block_type,
                    success=False,
                    duration_ms=duration,
                    output={},
                    error=f"HTTP {resp.status_code}: {resp.text[:100]}"
                )
        except Exception as e:
            return TestResult(
                block_type=block_type,
                success=False,
                duration_ms=int((time.time() - start) * 1000),
                output={},
                error=str(e)
            )
    
    def test_traffic_blocks(self):
        """Test traffic domain blocks"""
        print("\n" + "="*60)
        print("TRAFFIC DOMAIN TESTS")
        print("="*60)
        
        # traffic.ping - Multi-Host Ping Monitor
        print("\n[1/4] traffic.ping - Ping SSH server")
        result = self.execute_block("traffic.ping", {
            "host": TEST_HOSTS["ssh"],
            "count": 3,
            "timeout": 5
        })
        self.results.append(result)
        self._print_result(result)
        
        # traffic.ping - Ping Web server
        print("\n[2/4] traffic.ping - Ping Web server")
        result = self.execute_block("traffic.ping", {
            "host": TEST_HOSTS["web"],
            "count": 2,
            "timeout": 5
        })
        self.results.append(result)
        self._print_result(result)
        
        # traffic.start_capture / traffic.stop_capture - Traffic Baseline
        print("\n[3/4] traffic.start_capture - Start capture")
        result = self.execute_block("traffic.start_capture", {
            "interface": "eth0",
            "maxPackets": 100
        })
        self.results.append(result)
        self._print_result(result)
        
        print("\n[4/4] traffic.get_stats - Get traffic stats")
        result = self.execute_block("traffic.get_stats", {
            "period": "1m"
        })
        self.results.append(result)
        self._print_result(result)
    
    def test_scanning_blocks(self):
        """Test scanning domain blocks"""
        print("\n" + "="*60)
        print("SCANNING DOMAIN TESTS")
        print("="*60)
        
        # scanning.port_scan - Network Discovery Pipeline
        print("\n[1/2] scanning.port_scan - Scan SSH server")
        result = self.execute_block("scanning.port_scan", {
            "host": TEST_HOSTS["ssh"],
            "ports": "22,80,443",
            "scanType": "custom"
        })
        self.results.append(result)
        self._print_result(result)
        
        # scanning.version_detect - Security Scan Pipeline
        print("\n[2/2] scanning.version_detect - Version detection on web server")
        result = self.execute_block("scanning.version_detect", {
            "host": TEST_HOSTS["web"],
            "ports": "80",
            "timeout": 60
        })
        self.results.append(result)
        self._print_result(result)
    
    def test_access_blocks(self):
        """Test access domain blocks"""
        print("\n" + "="*60)
        print("ACCESS DOMAIN TESTS")
        print("="*60)
        
        # connection.ssh_test - SSH Command Chain
        print("\n[1/4] connection.ssh_test - Test SSH connectivity")
        result = self.execute_block("connection.ssh_test", {
            "host": TEST_HOSTS["ssh"],
            "port": 22,
            "username": "root",
            "password": "vulnerable",
            "timeout": 10
        })
        self.results.append(result)
        self._print_result(result)
        
        # connection.tcp_test - Connectivity Health Check
        print("\n[2/4] connection.tcp_test - Test HTTP port")
        result = self.execute_block("connection.tcp_test", {
            "host": TEST_HOSTS["web"],
            "port": 80,
            "timeout": 5
        })
        self.results.append(result)
        self._print_result(result)
        
        # command.ssh_execute - REP Ring Test simulation
        print("\n[3/4] command.ssh_execute - Execute command via SSH")
        result = self.execute_block("command.ssh_execute", {
            "host": TEST_HOSTS["ssh"],
            "port": 22,
            "username": "root",
            "password": "vulnerable",
            "command": "hostname && uname -a",
            "timeout": 30
        })
        self.results.append(result)
        self._print_result(result)
        
        # command.system_info - System info
        print("\n[4/4] command.system_info - Get system info")
        result = self.execute_block("command.system_info", {
            "host": TEST_HOSTS["ssh"],
            "username": "root",
            "password": "vulnerable",
            "infoType": "all"
        })
        self.results.append(result)
        self._print_result(result)
    
    def test_control_blocks(self):
        """Test control flow blocks"""
        print("\n" + "="*60)
        print("CONTROL FLOW TESTS")
        print("="*60)
        
        # control.start
        print("\n[1/5] control.start - Workflow start")
        result = self.execute_block("control.start", {
            "name": "Test Workflow"
        })
        self.results.append(result)
        self._print_result(result)
        
        # control.variable_set
        print("\n[2/5] control.variable_set - Set variable")
        result = self.execute_block("control.variable_set", {
            "name": "hosts",
            "value": '["172.21.0.10", "172.21.0.20"]'
        })
        self.results.append(result)
        self._print_result(result)
        
        # control.loop
        print("\n[3/5] control.loop - Loop iteration")
        result = self.execute_block("control.loop", {
            "mode": "array",
            "array": '["172.21.0.10", "172.21.0.20"]',
            "variable": "host"
        })
        self.results.append(result)
        self._print_result(result)
        
        # control.condition
        print("\n[4/5] control.condition - Conditional branch")
        result = self.execute_block("control.condition", {
            "expression": "true"
        })
        self.results.append(result)
        self._print_result(result)
        
        # control.delay
        print("\n[5/5] control.delay - Delay 1 second")
        result = self.execute_block("control.delay", {
            "seconds": 1
        })
        self.results.append(result)
        self._print_result(result)
    
    def test_agent_blocks(self):
        """Test agent domain blocks"""
        print("\n" + "="*60)
        print("AGENT DOMAIN TESTS")
        print("="*60)
        
        # Note: Agent blocks may need actual agent setup
        print("\n[1/2] agent.generate - Generate agent (simulated)")
        result = self.execute_block("agent.generate", {
            "agent_id": "test-agent",
            "platform": "linux-amd64",
            "obfuscate": False
        })
        self.results.append(result)
        self._print_result(result)
        
        print("\n[2/2] agent.deploy - Deploy agent (simulated)")
        result = self.execute_block("agent.deploy", {
            "host": TEST_HOSTS["ssh"],
            "username": "root",
            "password": "vulnerable",
            "remotePath": "/tmp/agent",
            "autoStart": False
        })
        self.results.append(result)
        self._print_result(result)
    
    def _print_result(self, result: TestResult):
        """Pretty print a test result"""
        status = "✓" if result.success else "✗"
        print(f"  {status} {result.block_type}")
        print(f"    Duration: {result.duration_ms}ms")
        if result.error:
            print(f"    Error: {result.error}")
        else:
            output_str = json.dumps(result.output, indent=6)[:200]
            print(f"    Output: {output_str}...")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        total = len(self.results)
        passed = sum(1 for r in self.results if r.success)
        failed = total - passed
        
        print(f"\nTotal: {total} | Passed: {passed} | Failed: {failed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        print("\n┌─────────────────────────────────┬────────┬──────────┐")
        print("│ Block Type                      │ Status │ Duration │")
        print("├─────────────────────────────────┼────────┼──────────┤")
        
        for r in self.results:
            status = "PASS" if r.success else "FAIL"
            block = r.block_type[:31].ljust(31)
            dur = f"{r.duration_ms}ms".rjust(8)
            print(f"│ {block} │ {status.center(6)} │ {dur} │")
        
        print("└─────────────────────────────────┴────────┴──────────┘")
        
        if failed > 0:
            print("\nFailed Tests:")
            for r in self.results:
                if not r.success:
                    print(f"  - {r.block_type}: {r.error}")
    
    def run_all_tests(self):
        """Run all template block tests"""
        print("="*60)
        print("FLOW TEMPLATES TEST SUITE")
        print("Testing block types against real test hosts")
        print("="*60)
        
        if not self.login():
            print("Cannot continue without authentication")
            return
        
        # Test each domain
        self.test_control_blocks()
        self.test_traffic_blocks()
        self.test_scanning_blocks()
        self.test_access_blocks()
        self.test_agent_blocks()
        
        # Summary
        self.print_summary()


if __name__ == "__main__":
    tester = FlowTemplatesTester()
    tester.run_all_tests()
