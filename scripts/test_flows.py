#!/usr/bin/env python3
"""
Flow Test Script - Tests all standard workflows against real hosts
==================================================================
Tests T1-T9 workflows against real network hosts.
"""

import requests
import json
import time
from typing import Dict, Any, List
from dataclasses import dataclass

API_BASE = "http://localhost:12001/api/v1"

# Real test hosts
TEST_HOSTS = {
    "postgres": "172.29.0.10",
    "redis": "172.29.0.11",
    "external": "8.8.8.8",
}


@dataclass
class WorkflowTestResult:
    name: str
    success: bool
    status: str
    duration_ms: float
    blocks_executed: int
    output: Dict
    error: str = None


class FlowTester:
    def __init__(self):
        self.token = None
        self.results: List[WorkflowTestResult] = []
    
    def login(self) -> bool:
        resp = requests.post(
            f"{API_BASE}/auth/login",
            data={"username": "admin", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if resp.status_code == 200:
            self.token = resp.json().get("access_token")
            print("✓ Login successful")
            return True
        return False
    
    def headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}
    
    def get_workflows(self) -> List[Dict]:
        resp = requests.get(f"{API_BASE}/workflows/", headers=self.headers())
        return resp.json().get("workflows", [])
    
    def get_workflow_details(self, wf_id: str) -> Dict:
        resp = requests.get(f"{API_BASE}/workflows/{wf_id}", headers=self.headers())
        return resp.json()
    
    def execute_workflow(self, wf_id: str, variables: Dict = None) -> Dict:
        data = {"inputs": variables or {}}
        resp = requests.post(
            f"{API_BASE}/workflows/{wf_id}/execute",
            headers={**self.headers(), "Content-Type": "application/json"},
            json=data,
            timeout=120
        )
        execution = resp.json()
        
        # Poll for completion
        execution_id = execution.get("id")
        if execution_id:
            max_wait = 60  # seconds
            poll_interval = 0.5
            waited = 0
            
            while waited < max_wait:
                time.sleep(poll_interval)
                waited += poll_interval
                
                status_resp = requests.get(
                    f"{API_BASE}/workflows/{wf_id}/executions/{execution_id}",
                    headers=self.headers(),
                    timeout=10
                )
                
                if status_resp.status_code == 200:
                    status_data = status_resp.json()
                    status = status_data.get("status", "")
                    
                    if status in ["completed", "failed", "error"]:
                        return status_data
                    
            # Timeout
            execution["status"] = "timeout"
        
        return execution
    
    def test_workflow(self, wf: Dict, variables: Dict = None) -> WorkflowTestResult:
        wf_id = wf["id"]
        name = wf["name"]
        
        print(f"\n  Testing: {name}")
        start_time = time.time()
        
        try:
            result = self.execute_workflow(wf_id, variables)
            duration_ms = (time.time() - start_time) * 1000
            
            success = result.get("status") in ["completed", "success"]
            status = result.get("status", "unknown")
            blocks_executed = result.get("blocks_executed", 0)
            
            status_icon = "✓" if success else "✗"
            print(f"    {status_icon} Status: {status}")
            print(f"    Duration: {duration_ms:.0f}ms")
            print(f"    Blocks: {blocks_executed}")
            
            return WorkflowTestResult(
                name=name,
                success=success,
                status=status,
                duration_ms=duration_ms,
                blocks_executed=blocks_executed,
                output=result.get("output", {}),
            )
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            print(f"    ✗ Error: {str(e)}")
            return WorkflowTestResult(
                name=name,
                success=False,
                status="error",
                duration_ms=duration_ms,
                blocks_executed=0,
                output={},
                error=str(e)
            )
    
    def test_all_workflows(self):
        print("\n" + "="*60)
        print("STANDARD WORKFLOW TESTING")
        print("="*60)
        
        workflows = self.get_workflows()
        
        # Filter to standard T1-T9 workflows
        standard = [wf for wf in workflows if wf["name"].startswith("T")]
        standard.sort(key=lambda w: w["name"])
        
        print(f"\nFound {len(standard)} standard workflows")
        
        # Test each workflow with appropriate variables
        workflow_variables = {
            "T1-Ping": {"host": TEST_HOSTS["external"]},
            "T2-SSH": {"host": TEST_HOSTS["postgres"], "port": 22},
            "T3-TCP": {"host": TEST_HOSTS["external"], "port": 443},
            "T4-Delay-Cond": {},
            "T5-MultiPing": {"hosts": [TEST_HOSTS["postgres"], TEST_HOSTS["redis"]]},
            "T6-SSH-Cmd": {"host": TEST_HOSTS["postgres"], "command": "echo hello"},
            "T7-PortScan": {"host": TEST_HOSTS["postgres"], "ports": "22,80,443,5432"},
            "T8-Traffic": {"interface": "eth0"},
            "T9-SysInfo": {"host": TEST_HOSTS["postgres"]},
        }
        
        for wf in standard:
            name = wf["name"]
            variables = workflow_variables.get(name, {})
            result = self.test_workflow(wf, variables)
            self.results.append(result)
        
        self.print_summary()
    
    def print_summary(self):
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.results if r.success)
        failed = len(self.results) - passed
        
        print(f"\nTotal: {len(self.results)} | Passed: {passed} | Failed: {failed}")
        print(f"Success Rate: {passed/len(self.results)*100:.1f}%")
        
        print("\n" + "-"*50)
        print(f"{'Workflow':<20} {'Status':<15} {'Duration':<12} {'Blocks'}")
        print("-"*50)
        
        for r in self.results:
            status_icon = "🟢" if r.success else "🔴"
            print(f"{status_icon} {r.name:<17} {r.status:<15} {r.duration_ms:>8.0f}ms  {r.blocks_executed}")
        
        if failed > 0:
            print(f"\n❌ Failed Workflows:")
            for r in self.results:
                if not r.success:
                    print(f"  • {r.name}: {r.error or r.status}")


def main():
    print("\n" + "="*60)
    print("FLOW TESTING AGAINST REAL HOSTS")
    print("="*60)
    
    tester = FlowTester()
    if not tester.login():
        print("Login failed!")
        return
    
    tester.test_all_workflows()


if __name__ == "__main__":
    main()
