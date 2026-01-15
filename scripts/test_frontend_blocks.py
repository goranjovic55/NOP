#!/usr/bin/env python3
"""
Frontend Block Execution Test Script
=====================================
Simulates pressing "Run This Block" button from the frontend ConfigPanel.
Tests the /api/v1/workflows/block/execute endpoint with frontend-style requests.

This verifies:
1. Each block type executes correctly via the unified execute endpoint
2. Response contains correct status (success/failure)
3. Response contains correct route (pass/fail/out/etc.)
4. Response contains appropriate output data
5. Console log shows correctly formatted status
"""

import requests
import json
import time
import urllib3
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
API_BASE = "http://localhost:12001/api/v1"
EXECUTE_ENDPOINT = "/workflows/block/execute"

# Test hosts
TEST_HOSTS = {
    "external": "8.8.8.8",
    "postgres": "172.29.0.10",
    "redis": "172.29.0.11",
}


@dataclass
class BlockTestResult:
    """Result of a single block test"""
    block_type: str
    category: str
    success: bool
    api_success: bool  # Was the API call successful (200)?
    block_success: bool  # Did the block execute successfully?
    route: Optional[str] = None
    output: Optional[Dict] = None
    duration_ms: Optional[float] = None
    error: Optional[str] = None
    console_log: str = ""


class FrontendBlockTester:
    """Tests blocks as if frontend "Run This Block" button was pressed"""
    
    def __init__(self):
        self.token = None
        self.results: List[BlockTestResult] = []
        
    def login(self) -> bool:
        """Authenticate and get token"""
        try:
            resp = requests.post(
                f"{API_BASE}/auth/login",
                data={"username": "admin", "password": "admin123"},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("access_token")
                print("✓ Login successful")
                return True
            print(f"✗ Login failed: {resp.status_code}")
            return False
        except Exception as e:
            print(f"✗ Login error: {e}")
            return False
    
    def headers(self) -> Dict[str, str]:
        """Get request headers with auth token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}" if self.token else ""
        }
    
    def execute_block(
        self,
        block_type: str,
        parameters: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
        category: str = "unknown"
    ) -> BlockTestResult:
        """
        Execute a block via the /workflows/block/execute endpoint.
        This is exactly what the frontend ConfigPanel.runSingleBlock() does.
        """
        start_time = time.time()
        
        try:
            url = f"{API_BASE}{EXECUTE_ENDPOINT}"
            
            # Build request exactly like frontend does
            request_body = {
                "block_type": block_type,
                "parameters": parameters,
                "context": context or {}
            }
            
            # Console log: Request
            console_log = f"\n[{datetime.now().strftime('%H:%M:%S')}] ▶ RUN THIS BLOCK: {block_type}\n"
            console_log += f"  Parameters: {json.dumps(parameters, indent=2)[:200]}\n"
            
            resp = requests.post(
                url,
                headers=self.headers(),
                json=request_body,
                timeout=60
            )
            
            duration_ms = (time.time() - start_time) * 1000
            
            if resp.status_code != 200:
                console_log += f"  ✗ API Error: {resp.status_code} - {resp.text[:200]}\n"
                return BlockTestResult(
                    block_type=block_type,
                    category=category,
                    success=False,
                    api_success=False,
                    block_success=False,
                    error=f"HTTP {resp.status_code}: {resp.text[:200]}",
                    duration_ms=duration_ms,
                    console_log=console_log
                )
            
            result = resp.json()
            
            # Console log: Response
            block_success = result.get("success", False)
            route = result.get("route", "out")
            output = result.get("output", {})
            error = result.get("error")
            result_duration = result.get("duration_ms") or duration_ms
            
            status_icon = "✓" if block_success else "✗"
            console_log += f"  {status_icon} Status: {'SUCCESS' if block_success else 'FAILED'}\n"
            console_log += f"  Route: {route}\n"
            console_log += f"  Duration: {result_duration:.0f}ms\n"
            if output:
                console_log += f"  Output: {json.dumps(output, indent=2)[:300]}\n"
            if error:
                console_log += f"  Error: {error}\n"
            
            return BlockTestResult(
                block_type=block_type,
                category=category,
                success=True,
                api_success=True,
                block_success=block_success,
                route=route,
                output=output,
                duration_ms=result_duration,
                error=error,
                console_log=console_log
            )
            
        except Exception as e:
            console_log = f"\n[{datetime.now().strftime('%H:%M:%S')}] ✗ EXCEPTION: {block_type}\n"
            console_log += f"  Error: {str(e)}\n"
            return BlockTestResult(
                block_type=block_type,
                category=category,
                success=False,
                api_success=False,
                block_success=False,
                error=str(e),
                duration_ms=(time.time() - start_time) * 1000,
                console_log=console_log
            )
    
    def test_all_blocks(self):
        """Test all block types via the unified execute endpoint"""
        
        print("\n" + "="*70)
        print("FRONTEND BLOCK EXECUTION TESTS")
        print("Simulating 'Run This Block' button press for each block type")
        print("="*70)
        
        # ========================================
        # CONTROL BLOCKS
        # ========================================
        print("\n" + "-"*50)
        print("CONTROL BLOCKS")
        print("-"*50)
        
        self.run_test("control.start", "control", {
            "name": "Test Workflow"
        })
        
        self.run_test("control.end", "control", {
            "status": "success",
            "message": "Completed successfully"
        })
        
        self.run_test("control.delay", "control", {
            "seconds": 1
        })
        
        self.run_test("control.condition", "control", {
            "expression": "true"
        })
        
        self.run_test("control.loop", "control", {
            "mode": "count",
            "count": 3
        })
        
        self.run_test("control.variable_set", "control", {
            "name": "testVar",
            "value": "Hello World"
        })
        
        self.run_test("control.variable_get", "control", {
            "name": "testVar"
        }, context={"variables": {"testVar": "Hello World"}})
        
        # ========================================
        # CONNECTION BLOCKS
        # ========================================
        print("\n" + "-"*50)
        print("CONNECTION BLOCKS")
        print("-"*50)
        
        self.run_test("connection.tcp_test", "connection", {
            "host": TEST_HOSTS["external"],
            "port": 443
        })
        
        self.run_test("connection.ssh_test", "connection", {
            "host": TEST_HOSTS["postgres"],
            "port": 22
        })
        
        self.run_test("connection.rdp_test", "connection", {
            "host": TEST_HOSTS["external"],
            "port": 3389
        })
        
        self.run_test("connection.vnc_test", "connection", {
            "host": TEST_HOSTS["external"],
            "port": 5900
        })
        
        self.run_test("connection.ftp_test", "connection", {
            "host": TEST_HOSTS["external"],
            "port": 21
        })
        
        # ========================================
        # COMMAND BLOCKS
        # ========================================
        print("\n" + "-"*50)
        print("COMMAND BLOCKS")
        print("-"*50)
        
        self.run_test("command.ssh_execute", "command", {
            "host": TEST_HOSTS["postgres"],
            "command": "uname -a",
            "username": "test"
        })
        
        self.run_test("command.system_info", "command", {
            "host": TEST_HOSTS["postgres"],
            "infoType": "all"
        })
        
        self.run_test("command.ftp_list", "command", {
            "host": TEST_HOSTS["external"],
            "path": "/"
        })
        
        self.run_test("command.ftp_download", "command", {
            "host": TEST_HOSTS["external"],
            "remotePath": "/file.txt",
            "localPath": "/tmp/file.txt"
        })
        
        self.run_test("command.ftp_upload", "command", {
            "host": TEST_HOSTS["external"],
            "localPath": "/tmp/file.txt",
            "remotePath": "/file.txt"
        })
        
        # ========================================
        # TRAFFIC BLOCKS
        # ========================================
        print("\n" + "-"*50)
        print("TRAFFIC BLOCKS")
        print("-"*50)
        
        self.run_test("traffic.ping", "traffic", {
            "host": TEST_HOSTS["external"],
            "count": 2
        })
        
        self.run_test("traffic.advanced_ping", "traffic", {
            "host": TEST_HOSTS["external"],
            "count": 2,
            "size": 64
        })
        
        self.run_test("traffic.get_stats", "traffic", {
            "interface": "eth0"
        })
        
        self.run_test("traffic.burst_capture", "traffic", {
            "interface": "eth0",
            "duration_seconds": 1
        })
        
        self.run_test("traffic.start_capture", "traffic", {
            "interface": "eth0",
            "duration_seconds": 1
        })
        
        self.run_test("traffic.stop_capture", "traffic", {
            "captureId": "test_capture"
        })
        
        self.run_test("traffic.storm", "traffic", {
            "interface": "eth0",
            "type": "broadcast",
            "duration": 1
        })
        
        # ========================================
        # SCANNING BLOCKS
        # ========================================
        print("\n" + "-"*50)
        print("SCANNING BLOCKS")
        print("-"*50)
        
        self.run_test("scanning.network_discovery", "scanning", {
            "network": "172.29.0.0/24",
            "timeout": 5
        })
        
        self.run_test("scanning.host_scan", "scanning", {
            "host": TEST_HOSTS["external"]
        })
        
        self.run_test("scanning.ping_sweep", "scanning", {
            "network": "8.8.8.0/30"
        })
        
        self.run_test("scanning.port_scan", "scanning", {
            "host": TEST_HOSTS["external"],
            "ports": "22,80,443"
        })
        
        self.run_test("scanning.version_detect", "scanning", {
            "host": TEST_HOSTS["postgres"],
            "ports": "5432"
        })
        
        self.run_test("scanning.service_scan", "scanning", {
            "host": TEST_HOSTS["postgres"],
            "ports": "5432"
        })
        
        # ========================================
        # AGENT BLOCKS
        # ========================================
        print("\n" + "-"*50)
        print("AGENT BLOCKS")
        print("-"*50)
        
        self.run_test("agent.list", "agent", {})
        
        self.run_test("agent.create", "agent", {
            "name": "TestAgent",
            "os": "linux"
        })
        
        self.run_test("agent.terminate", "agent", {
            "agentId": "test-agent-id"
        })
        
        # ========================================
        # DATA BLOCKS
        # ========================================
        print("\n" + "-"*50)
        print("DATA BLOCKS")
        print("-"*50)
        
        self.run_test("data.code", "data", {
            "language": "javascript",
            "code": "return { result: 42 };"
        }, context={"input": {"value": 10}})
        
        self.run_test("data.http_request", "data", {
            "url": "https://httpbin.org/get",
            "method": "GET"
        })
        
        self.run_test("data.json_transform", "data", {
            "input": '{"name": "test"}',
            "expression": "$.name"
        })
        
        self.run_test("data.database_query", "data", {
            "connectionString": "postgresql://...",
            "query": "SELECT 1"
        })
    
    def run_test(self, block_type: str, category: str, params: Dict, context: Dict = None):
        """Run a single block test and display results"""
        result = self.execute_block(block_type, params, context, category)
        self.results.append(result)
        
        # Display console log (simulating frontend console output)
        print(result.console_log)
        
        # Show visual block status indicator
        if result.api_success:
            status_style = "🟢" if result.block_success else "🔴"
            route_info = f" → [{result.route}]" if result.route else ""
            print(f"  Block Status: {status_style} {block_type}{route_info}")
        else:
            print(f"  Block Status: ⚠️ {block_type} (API Error)")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        
        # Group by category
        categories = {}
        for result in self.results:
            if result.category not in categories:
                categories[result.category] = {"passed": 0, "failed": 0, "results": []}
            
            if result.api_success and result.block_success:
                categories[result.category]["passed"] += 1
            else:
                categories[result.category]["failed"] += 1
            categories[result.category]["results"].append(result)
        
        total_passed = sum(c["passed"] for c in categories.values())
        total_failed = sum(c["failed"] for c in categories.values())
        total = total_passed + total_failed
        
        print(f"\nTotal: {total} | Passed: {total_passed} | Failed: {total_failed}")
        print(f"Success Rate: {total_passed/total*100:.1f}%\n")
        
        # Summary table by category
        print("-"*50)
        print(f"{'Category':<15} {'Passed':<10} {'Failed':<10} {'Status'}")
        print("-"*50)
        
        for cat, data in categories.items():
            status = "✅" if data["failed"] == 0 else "⚠️"
            print(f"{cat:<15} {data['passed']:<10} {data['failed']:<10} {status}")
        
        print("-"*50)
        
        # List failed tests
        failed = [r for r in self.results if not (r.api_success and r.block_success)]
        if failed:
            print("\n❌ Failed/Error Tests:")
            for r in failed:
                error_msg = r.error or "Block returned failure"
                print(f"  • {r.block_type}: {error_msg[:60]}")
        
        # List successful tests
        print("\n✓ Successful Tests:")
        passed = [r for r in self.results if r.api_success and r.block_success]
        for r in passed:
            route = f" → {r.route}" if r.route else ""
            print(f"  • {r.block_type}{route} ({r.duration_ms:.0f}ms)")
        
        print("\n" + "="*70)
        print("FRONTEND BLOCK STATUS VERIFICATION")
        print("="*70)
        print("\nBlock visual status indicators (as shown in UI):")
        print("-"*50)
        
        for r in self.results:
            if r.api_success:
                if r.block_success:
                    icon = "🟢"
                    status = "completed"
                else:
                    icon = "🔴"
                    status = "failed"
            else:
                icon = "⚠️"
                status = "error"
            
            route_info = f"[{r.route}]" if r.route else ""
            print(f"  {icon} {r.block_type:<30} {status:<12} {route_info}")


def main():
    print("\n" + "="*70)
    print("FRONTEND BLOCK TESTING")
    print("Simulating User Pressing 'Run This Block' Button")
    print("="*70)
    
    tester = FrontendBlockTester()
    
    if not tester.login():
        print("Failed to login. Exiting.")
        return
    
    tester.test_all_blocks()
    tester.print_summary()


if __name__ == "__main__":
    main()
