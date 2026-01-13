#!/usr/bin/env python3
"""
Flow Block API Testing Script
Tests all block types against real endpoints
"""

import requests
import json
import time
import sys
from dataclasses import dataclass
from typing import Optional, Dict, Any, List

API_BASE = "http://localhost:12001/api/v1"

# Test targets - adjust these based on your environment
TEST_HOSTS = {
    "postgres": "172.29.0.10",      # Postgres container (port 5432)
    "redis": "172.29.0.11",         # Redis container (port 6379)
    "localhost": "127.0.0.1",       # Localhost
    "external": "8.8.8.8",          # Google DNS (for ping tests)
}

@dataclass
class TestResult:
    block_type: str
    endpoint: str
    success: bool
    status_code: int
    response: Optional[Dict]
    error: Optional[str]
    duration_ms: float

class BlockTester:
    def __init__(self):
        self.token = None
        self.results: List[TestResult] = []
        
    def login(self) -> bool:
        """Get auth token"""
        try:
            resp = requests.post(
                f"{API_BASE}/auth/login",
                data={"username": "admin", "password": "admin123"},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if resp.status_code == 200:
                self.token = resp.json()["access_token"]
                print(f"✓ Login successful")
                return True
            else:
                print(f"✗ Login failed: {resp.status_code}")
                return False
        except Exception as e:
            print(f"✗ Login error: {e}")
            return False
    
    def headers(self) -> Dict[str, str]:
        """Get auth headers"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_endpoint(self, block_type: str, method: str, endpoint: str, 
                      data: Optional[Dict] = None, params: Optional[Dict] = None) -> TestResult:
        """Test a single endpoint"""
        start = time.time()
        try:
            url = f"{API_BASE}{endpoint}"
            print(f"\n  Testing: {method} {endpoint}")
            
            if method == "GET":
                resp = requests.get(url, headers=self.headers(), params=params, timeout=60)
            elif method == "POST":
                resp = requests.post(url, headers=self.headers(), json=data, timeout=60)
            elif method == "DELETE":
                resp = requests.delete(url, headers=self.headers(), timeout=60)
            elif method == "PUT":
                resp = requests.put(url, headers=self.headers(), json=data, timeout=60)
            else:
                raise ValueError(f"Unknown method: {method}")
            
            duration_ms = (time.time() - start) * 1000
            
            try:
                response_data = resp.json()
            except:
                response_data = {"raw": resp.text[:500]}
            
            success = resp.status_code in [200, 201, 204]
            result = TestResult(
                block_type=block_type,
                endpoint=endpoint,
                success=success,
                status_code=resp.status_code,
                response=response_data,
                error=None if success else str(response_data),
                duration_ms=duration_ms
            )
            
            if success:
                print(f"    ✓ {resp.status_code} - {duration_ms:.0f}ms")
            else:
                print(f"    ✗ {resp.status_code} - {json.dumps(response_data)[:200]}")
                
            self.results.append(result)
            return result
            
        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            result = TestResult(
                block_type=block_type,
                endpoint=endpoint,
                success=False,
                status_code=0,
                response=None,
                error=str(e),
                duration_ms=duration_ms
            )
            print(f"    ✗ Exception: {e}")
            self.results.append(result)
            return result

    # ============================================
    # CONNECTION BLOCK TESTS
    # ============================================
    
    def test_connection_blocks(self):
        """Test all connection blocks"""
        print("\n" + "="*60)
        print("TESTING CONNECTION BLOCKS")
        print("="*60)
        
        # TCP Test - should work against known ports
        self.test_endpoint(
            "connection.tcp_test",
            "POST",
            "/access/test/tcp",
            data={"host": TEST_HOSTS["postgres"], "port": 5432, "timeout": 5}
        )
        
        self.test_endpoint(
            "connection.tcp_test",
            "POST", 
            "/access/test/tcp",
            data={"host": TEST_HOSTS["redis"], "port": 6379, "timeout": 5}
        )
        
        # SSH Test - will fail but tests endpoint
        self.test_endpoint(
            "connection.ssh_test",
            "POST",
            "/access/test/ssh",
            data={
                "host": TEST_HOSTS["localhost"],
                "port": 22,
                "username": "test",
                "password": "test",
                "timeout": 5
            }
        )
        
        # RDP Test
        self.test_endpoint(
            "connection.rdp_test",
            "POST",
            "/access/test/rdp",
            data={
                "host": TEST_HOSTS["localhost"],
                "port": 3389,
                "username": "test",
                "password": "test"
            }
        )
        
        # VNC Test
        self.test_endpoint(
            "connection.vnc_test",
            "POST",
            "/access/test/vnc",
            data={
                "host": TEST_HOSTS["localhost"],
                "port": 5900,
                "password": "test"
            }
        )
        
        # FTP Test
        self.test_endpoint(
            "connection.ftp_test",
            "POST",
            "/access/test/ftp",
            data={
                "host": TEST_HOSTS["localhost"],
                "port": 21,
                "username": "test",
                "password": "test"
            }
        )

    # ============================================
    # COMMAND BLOCK TESTS
    # ============================================
    
    def test_command_blocks(self):
        """Test all command blocks"""
        print("\n" + "="*60)
        print("TESTING COMMAND BLOCKS")
        print("="*60)
        
        # SSH Execute
        self.test_endpoint(
            "command.ssh_execute",
            "POST",
            "/access/execute/ssh",
            data={
                "host": TEST_HOSTS["localhost"],
                "port": 22,
                "username": "test",
                "password": "test",
                "command": "whoami",
                "timeout": 10
            }
        )
        
        # System Info
        self.test_endpoint(
            "command.system_info",
            "POST",
            "/access/system-info",
            data={
                "host": TEST_HOSTS["localhost"],
                "username": "test",
                "password": "test",
                "infoType": "all"
            }
        )
        
        # FTP List
        self.test_endpoint(
            "command.ftp_list",
            "POST",
            "/access/ftp/list",
            data={
                "host": TEST_HOSTS["localhost"],
                "port": 21,
                "username": "anonymous",
                "password": "anonymous@",
                "path": "/"
            }
        )

    # ============================================
    # TRAFFIC BLOCK TESTS
    # ============================================
    
    def test_traffic_blocks(self):
        """Test all traffic blocks"""
        print("\n" + "="*60)
        print("TESTING TRAFFIC BLOCKS")
        print("="*60)
        
        # Get Traffic Stats
        self.test_endpoint(
            "traffic.get_stats",
            "GET",
            "/traffic/stats"
        )
        
        # Ping
        self.test_endpoint(
            "traffic.ping",
            "POST",
            "/traffic/ping",
            data={
                "host": TEST_HOSTS["external"]
            }
        )
        
        # Advanced Ping (correct endpoint path)
        self.test_endpoint(
            "traffic.advanced_ping",
            "POST",
            "/traffic/ping/advanced",
            data={
                "target": TEST_HOSTS["external"],
                "protocol": "icmp",
                "count": 2,
                "timeout": 5,
                "packet_size": 64
            }
        )
        
        # Get interfaces
        self.test_endpoint(
            "traffic.interfaces",
            "GET",
            "/traffic/interfaces"
        )
        
        # Burst Capture (short)
        self.test_endpoint(
            "traffic.burst_capture",
            "POST",
            "/traffic/burst-capture",
            data={
                "duration_seconds": 1
            }
        )
        
        # Start/Stop capture
        result = self.test_endpoint(
            "traffic.start_capture",
            "POST",
            "/traffic/start-capture",
            data={
                "interface": "eth0",
                "filter": ""
            }
        )
        
        if result.success:
            time.sleep(1)
            self.test_endpoint(
                "traffic.stop_capture",
                "POST",
                "/traffic/stop-capture",
                data={}
            )

    # ============================================
    # SCANNING BLOCK TESTS
    # ============================================
    
    def test_scanning_blocks(self):
        """Test all scanning blocks"""
        print("\n" + "="*60)
        print("TESTING SCANNING BLOCKS")
        print("="*60)
        
        # Network Discovery
        self.test_endpoint(
            "scanning.network_discovery",
            "POST",
            "/discovery/scan",
            data={
                "network": "172.29.0.0/24",
                "scan_type": "basic",
                "ports": "22,80,443,5432,6379"
            }
        )
        
        # Host Scan
        self.test_endpoint(
            "scanning.host_scan",
            "POST",
            "/discovery/scan/host",
            data={
                "host": TEST_HOSTS["postgres"],
                "scan_type": "comprehensive",
                "ports": "5432"
            }
        )
        
        # Ping Host
        self.test_endpoint(
            "scanning.ping_sweep",
            "POST",
            f"/discovery/ping/{TEST_HOSTS['external']}",
            data={}
        )
        
        # Service Scan
        self.test_endpoint(
            "scanning.service_scan",
            "GET",
            f"/access/scan/services/{TEST_HOSTS['postgres']}"
        )
        
        # Port Scan (correct endpoint path)
        self.test_endpoint(
            "scanning.port_scan",
            "POST",
            "/scans/default/port-scan",
            data={
                "host": TEST_HOSTS["postgres"],
                "scanType": "custom",
                "ports": "5432,6379",
                "technique": "connect"
            }
        )
        
        # Version Detection (correct format - ports as list)
        self.test_endpoint(
            "scanning.version_detect",
            "POST",
            "/scans/default/version-detection",
            data={
                "host": TEST_HOSTS["postgres"],
                "ports": [5432]
            }
        )
        
        # CVE Lookup (by product)
        self.test_endpoint(
            "vulnerability.cve_lookup",
            "POST",
            "/vulnerabilities/lookup-cve",
            data={
                "product": "postgresql",
                "version": "15.0"
            }
        )
        
        # Get Exploits for CVE
        self.test_endpoint(
            "vulnerability.get_exploits",
            "GET",
            "/vulnerabilities/exploits/CVE-2023-2454"
        )
        
        # List Assets
        self.test_endpoint(
            "asset.list_assets",
            "GET",
            "/assets/",
            params={"page": 1, "size": 10}
        )
        
        # Asset Stats
        self.test_endpoint(
            "asset.get_stats",
            "GET",
            "/assets/stats"
        )

    # ============================================
    # AGENT BLOCK TESTS
    # ============================================
    
    def test_agent_blocks(self):
        """Test all agent blocks"""
        print("\n" + "="*60)
        print("TESTING AGENT BLOCKS")
        print("="*60)
        
        # List Agents
        result = self.test_endpoint(
            "agent.list",
            "GET",
            "/agents/"
        )
        
        # Create Agent (for generation test)
        create_result = self.test_endpoint(
            "agent.create",
            "POST",
            "/agents/",
            data={
                "name": "Test Flow Agent",
                "description": "Agent for flow testing",
                "agent_type": "python",
                "connection_url": "ws://localhost:12001/ws/agent"
            }
        )
        
        if create_result.success and create_result.response:
            agent_id = create_result.response.get("id")
            if agent_id:
                # Generate Agent
                self.test_endpoint(
                    "agent.generate",
                    "POST",
                    f"/agents/{agent_id}/generate",
                    data={
                        "platform": "linux-amd64",
                        "obfuscate": False,
                        "compress": False
                    }
                )
                
                # Get Agent Source
                self.test_endpoint(
                    "agent.get_source",
                    "GET",
                    f"/agents/{agent_id}/source"
                )
                
                # Terminate (cleanup)
                self.test_endpoint(
                    "agent.terminate",
                    "POST",
                    f"/agents/{agent_id}/terminate",
                    data={"force": True, "cleanup": True}
                )
                
                # Delete Agent
                self.test_endpoint(
                    "agent.delete",
                    "DELETE",
                    f"/agents/{agent_id}"
                )

    # ============================================
    # CONTROL/DATA BLOCK TESTS
    # ============================================
    
    def test_control_data_blocks(self):
        """Test control and data processing blocks"""
        print("\n" + "="*60)
        print("TESTING CONTROL & DATA BLOCKS")
        print("="*60)
        
        # Delay block
        self.test_endpoint(
            "control.delay",
            "POST",
            "/workflows/block/delay",
            data={"seconds": 1}
        )
        
        # Code block evaluation
        self.test_endpoint(
            "data.code",
            "POST",
            "/workflows/block/code",
            data={
                "context": {"input": "Ring is OK"},
                "passCode": "return /Ring is OK/i.test(context.input);",
                "outputCode": "return { status: 'passed', input: context.input };"
            }
        )

    # ============================================
    # WORKFLOW EXECUTION TEST
    # ============================================
    
    def test_workflow_execution(self):
        """Test complete workflow creation and execution"""
        print("\n" + "="*60)
        print("TESTING WORKFLOW EXECUTION")
        print("="*60)
        
        # Create workflow with correct schema
        workflow_data = {
            "name": "API Block Test Workflow",
            "description": "Workflow created by API test script",
            "nodes": [
                {
                    "id": "start-1",
                    "type": "block",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "label": "Start",
                        "type": "control.start",
                        "category": "control",
                        "parameters": {"name": "Test"}
                    }
                },
                {
                    "id": "ping-1",
                    "type": "block",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "label": "Ping Test",
                        "type": "traffic.ping",
                        "category": "traffic",
                        "parameters": {
                            "host": TEST_HOSTS["external"]
                        }
                    }
                },
                {
                    "id": "end-1",
                    "type": "block",
                    "position": {"x": 500, "y": 100},
                    "data": {
                        "label": "End",
                        "type": "control.end",
                        "category": "control",
                        "parameters": {"status": "success"}
                    }
                }
            ],
            "edges": [
                {"id": "e1", "source": "start-1", "target": "ping-1", "sourceHandle": "out", "targetHandle": "in"},
                {"id": "e2", "source": "ping-1", "target": "end-1", "sourceHandle": "pass", "targetHandle": "in"}
            ]
        }
        
        create_result = self.test_endpoint(
            "workflow.create",
            "POST",
            "/workflows/",
            data=workflow_data
        )
        
        if create_result.success and create_result.response:
            workflow_id = create_result.response.get("id")
            if workflow_id:
                # Execute workflow
                exec_result = self.test_endpoint(
                    "workflow.execute",
                    "POST",
                    f"/workflows/{workflow_id}/execute",
                    data={}
                )
                
                if exec_result.success:
                    execution_id = exec_result.response.get("execution_id")
                    if execution_id:
                        # Wait and check status
                        time.sleep(3)
                        self.test_endpoint(
                            "workflow.status",
                            "GET",
                            f"/workflows/{workflow_id}/execution/{execution_id}"
                        )
                
                # Delete workflow
                self.test_endpoint(
                    "workflow.delete",
                    "DELETE",
                    f"/workflows/{workflow_id}"
                )

    def test_delete(self, block_type: str, endpoint: str):
        """Test DELETE endpoint"""
        start = time.time()
        try:
            url = f"{API_BASE}{endpoint}"
            print(f"\n  Testing: DELETE {endpoint}")
            
            resp = requests.delete(url, headers=self.headers(), timeout=30)
            duration_ms = (time.time() - start) * 1000
            
            try:
                response_data = resp.json()
            except:
                response_data = {"raw": resp.text[:500]}
            
            success = resp.status_code in [200, 204]
            result = TestResult(
                block_type=block_type,
                endpoint=endpoint,
                success=success,
                status_code=resp.status_code,
                response=response_data,
                error=None if success else str(response_data),
                duration_ms=duration_ms
            )
            
            if success:
                print(f"    ✓ {resp.status_code} - {duration_ms:.0f}ms")
            else:
                print(f"    ✗ {resp.status_code} - {json.dumps(response_data)[:200]}")
                
            self.results.append(result)
            return result
            
        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            result = TestResult(
                block_type=block_type,
                endpoint=endpoint,
                success=False,
                status_code=0,
                response=None,
                error=str(e),
                duration_ms=duration_ms
            )
            print(f"    ✗ Exception: {e}")
            self.results.append(result)
            return result

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.results if r.success)
        failed = sum(1 for r in self.results if not r.success)
        total = len(self.results)
        
        print(f"\nTotal: {total} | Passed: {passed} | Failed: {failed}")
        print(f"Success Rate: {passed/total*100:.1f}%" if total > 0 else "N/A")
        
        if failed > 0:
            print("\n❌ Failed Tests:")
            for r in self.results:
                if not r.success:
                    print(f"  • {r.block_type}: {r.endpoint}")
                    print(f"    Status: {r.status_code}, Error: {r.error[:100] if r.error else 'N/A'}")
        
        print("\n✓ Passed Tests:")
        for r in self.results:
            if r.success:
                print(f"  • {r.block_type}: {r.endpoint} ({r.duration_ms:.0f}ms)")

    def run_all_tests(self):
        """Run all block tests"""
        print("\n" + "="*60)
        print("FLOW BLOCK API TESTING")
        print("="*60)
        
        if not self.login():
            print("Cannot proceed without authentication")
            return
        
        self.test_connection_blocks()
        self.test_command_blocks()
        self.test_traffic_blocks()
        self.test_scanning_blocks()
        self.test_agent_blocks()
        self.test_control_data_blocks()
        self.test_workflow_execution()
        
        self.print_summary()


def main():
    tester = BlockTester()
    
    if len(sys.argv) > 1:
        test_type = sys.argv[1]
        if not tester.login():
            return
            
        if test_type == "connection":
            tester.test_connection_blocks()
        elif test_type == "command":
            tester.test_command_blocks()
        elif test_type == "traffic":
            tester.test_traffic_blocks()
        elif test_type == "scanning":
            tester.test_scanning_blocks()
        elif test_type == "agent":
            tester.test_agent_blocks()
        elif test_type == "control":
            tester.test_control_data_blocks()
        elif test_type == "workflow":
            tester.test_workflow_execution()
        else:
            print(f"Unknown test type: {test_type}")
            print("Valid types: connection, command, traffic, scanning, agent, control, workflow")
            return
            
        tester.print_summary()
    else:
        tester.run_all_tests()


if __name__ == "__main__":
    main()
