#!/usr/bin/env python3
"""
End-to-End Template Test
Tests complete workflow templates as connected flows (not individual blocks).
Creates workflows from templates, executes them, and validates results.

Test Environment:
- SSH Server: 172.21.0.10:22 (vulnerable-ssh)
- Web Server: 172.21.0.20:80 (vulnerable-web)
"""

import requests
import json
import time
import uuid
import sys
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

API_BASE = "http://localhost:12001"
TIMEOUT = 30

# Real test hosts
SSH_HOST = "172.21.0.10"
WEB_HOST = "172.21.0.20"

@dataclass
class TemplateTestResult:
    template_id: str
    template_name: str
    workflow_id: Optional[str]
    execution_id: Optional[str]
    status: str  # 'pass', 'fail', 'error'
    duration_ms: int
    nodes_executed: int
    total_nodes: int
    error: Optional[str] = None


# Define all 9 templates with real test host IPs
TEMPLATES = [
    {
        "id": "multi-host-ping-monitor",
        "name": "Multi-Host Ping Monitor",
        "description": "Ping multiple hosts and collect reachability results",
        "category": "traffic",
        "nodes": [
            {"id": "1", "type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"id": "2", "type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Define Hosts", "type": "control.variable_set", "category": "control", "parameters": {"name": "hosts", "value": f'["{SSH_HOST}", "{WEB_HOST}"]'}}},
            {"id": "3", "type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Ping Host 1", "type": "traffic.ping", "category": "traffic", "parameters": {"host": SSH_HOST, "count": 2, "timeout": 5}}},
            {"id": "4", "type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Ping Host 2", "type": "traffic.ping", "category": "traffic", "parameters": {"host": WEB_HOST, "count": 2, "timeout": 5}}},
            {"id": "5", "type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2-3", "source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "reachable", "targetHandle": "in"},
            {"id": "e4-5", "source": "4", "target": "5", "sourceHandle": "reachable", "targetHandle": "in"},
        ],
    },
    {
        "id": "traffic-baseline-collection",
        "name": "Traffic Baseline Collection",
        "description": "Capture network traffic for baseline analysis",
        "category": "traffic",
        "nodes": [
            {"id": "1", "type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"id": "2", "type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Start Capture", "type": "traffic.start_capture", "category": "traffic", "parameters": {"interface": "eth0", "maxPackets": 100}}},
            {"id": "3", "type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Wait 2s", "type": "control.delay", "category": "control", "parameters": {"seconds": 2}}},
            {"id": "4", "type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Stop Capture", "type": "traffic.stop_capture", "category": "traffic", "parameters": {}}},
            {"id": "5", "type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "Get Stats", "type": "traffic.get_stats", "category": "traffic", "parameters": {"period": "1m"}}},
            {"id": "6", "type": "block", "position": {"x": 100, "y": 550}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2-3", "source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e4-5", "source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e5-6", "source": "5", "target": "6", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    {
        "id": "network-discovery-pipeline",
        "name": "Network Discovery Pipeline",
        "description": "Discover hosts, scan ports, detect services",
        "category": "scanning",
        "nodes": [
            {"id": "1", "type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"id": "2", "type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Set Target", "type": "control.variable_set", "category": "control", "parameters": {"name": "target", "value": SSH_HOST}}},
            {"id": "3", "type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Port Scan", "type": "scanning.port_scan", "category": "scanning", "parameters": {"host": SSH_HOST, "ports": "22,80"}}},
            {"id": "4", "type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Version Detection", "type": "scanning.version_detect", "category": "scanning", "parameters": {"host": SSH_HOST, "ports": "22"}}},
            {"id": "5", "type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2-3", "source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e4-5", "source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    {
        "id": "security-scan-pipeline",
        "name": "Security Scan Pipeline",
        "description": "Port scan with conditional version detection",
        "category": "scanning",
        "nodes": [
            {"id": "1", "type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"id": "2", "type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Port Scan", "type": "scanning.port_scan", "category": "scanning", "parameters": {"host": WEB_HOST, "ports": "80,443"}}},
            {"id": "3", "type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Has Ports?", "type": "control.condition", "category": "control", "parameters": {"expression": "true"}}},
            {"id": "4", "type": "block", "position": {"x": 50, "y": 350}, "data": {"label": "Version Detect", "type": "scanning.version_detect", "category": "scanning", "parameters": {"host": WEB_HOST}}},
            {"id": "5", "type": "block", "position": {"x": 200, "y": 350}, "data": {"label": "Skip", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"id": "6", "type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2-3", "source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "true", "targetHandle": "in"},
            {"id": "e3-5", "source": "3", "target": "5", "sourceHandle": "false", "targetHandle": "in"},
            {"id": "e4-6", "source": "4", "target": "6", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e5-6", "source": "5", "target": "6", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    {
        "id": "connectivity-health-check",
        "name": "Connectivity Health Check",
        "description": "Test SSH and TCP connectivity",
        "category": "access",
        "nodes": [
            {"id": "1", "type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"id": "2", "type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Ping Host", "type": "traffic.ping", "category": "traffic", "parameters": {"host": SSH_HOST, "count": 2}}},
            {"id": "3", "type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "SSH Test", "type": "connection.ssh_test", "category": "connection", "parameters": {"host": SSH_HOST, "port": 22}}},
            {"id": "4", "type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "HTTP Test", "type": "connection.tcp_test", "category": "connection", "parameters": {"host": WEB_HOST, "port": 80}}},
            {"id": "5", "type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2-3", "source": "2", "target": "3", "sourceHandle": "reachable", "targetHandle": "in"},
            {"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "success", "targetHandle": "in"},
            {"id": "e4-5", "source": "4", "target": "5", "sourceHandle": "success", "targetHandle": "in"},
        ],
    },
    {
        "id": "ssh-command-chain",
        "name": "SSH Command Chain",
        "description": "Execute multiple commands via SSH",
        "category": "access",
        "nodes": [
            {"id": "1", "type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"id": "2", "type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "SSH Test", "type": "connection.ssh_test", "category": "connection", "parameters": {"host": SSH_HOST, "port": 22}}},
            {"id": "3", "type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Get Hostname", "type": "command.ssh_execute", "category": "command", "parameters": {"host": SSH_HOST, "command": "hostname"}}},
            {"id": "4", "type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Get Uptime", "type": "command.ssh_execute", "category": "command", "parameters": {"host": SSH_HOST, "command": "uptime"}}},
            {"id": "5", "type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2-3", "source": "2", "target": "3", "sourceHandle": "success", "targetHandle": "in"},
            {"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e4-5", "source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    {
        "id": "rep-ring-test",
        "name": "REP Ring Test (Simplified)",
        "description": "Test switch connectivity simulation",
        "category": "access",
        "nodes": [
            {"id": "1", "type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"id": "2", "type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "SSH Connect", "type": "connection.ssh_test", "category": "connection", "parameters": {"host": SSH_HOST, "port": 22}}},
            {"id": "3", "type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Run Command", "type": "command.ssh_execute", "category": "command", "parameters": {"host": SSH_HOST, "command": "echo 'REP status OK'"}}},
            {"id": "4", "type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Wait", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"id": "5", "type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2-3", "source": "2", "target": "3", "sourceHandle": "success", "targetHandle": "in"},
            {"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e4-5", "source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    {
        "id": "agent-mass-deployment",
        "name": "Agent Mass Deployment",
        "description": "Generate and deploy agent",
        "category": "agent",
        "nodes": [
            {"id": "1", "type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"id": "2", "type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "SSH Test", "type": "connection.ssh_test", "category": "connection", "parameters": {"host": SSH_HOST, "port": 22}}},
            {"id": "3", "type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Check Access", "type": "control.condition", "category": "control", "parameters": {"expression": "true"}}},
            {"id": "4", "type": "block", "position": {"x": 50, "y": 350}, "data": {"label": "Generate Agent", "type": "agent.generate", "category": "agent", "parameters": {"agent_id": "test-agent", "platform": "linux-amd64"}}},
            {"id": "5", "type": "block", "position": {"x": 50, "y": 450}, "data": {"label": "Deploy Agent", "type": "agent.deploy", "category": "agent", "parameters": {"host": SSH_HOST, "remotePath": "/tmp/agent"}}},
            {"id": "6", "type": "block", "position": {"x": 200, "y": 350}, "data": {"label": "Skip", "type": "control.delay", "category": "control", "parameters": {"seconds": 1}}},
            {"id": "7", "type": "block", "position": {"x": 100, "y": 550}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2-3", "source": "2", "target": "3", "sourceHandle": "success", "targetHandle": "in"},
            {"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "true", "targetHandle": "in"},
            {"id": "e3-6", "source": "3", "target": "6", "sourceHandle": "false", "targetHandle": "in"},
            {"id": "e4-5", "source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e5-7", "source": "5", "target": "7", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e6-7", "source": "6", "target": "7", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
    {
        "id": "agent-pov-recon",
        "name": "Agent POV Reconnaissance",
        "description": "Scan via agent perspective",
        "category": "agent",
        "nodes": [
            {"id": "1", "type": "block", "position": {"x": 100, "y": 50}, "data": {"label": "Start", "type": "control.start", "category": "control", "parameters": {}}},
            {"id": "2", "type": "block", "position": {"x": 100, "y": 150}, "data": {"label": "Set Agent", "type": "control.variable_set", "category": "control", "parameters": {"name": "agent_id", "value": "pov-agent"}}},
            {"id": "3", "type": "block", "position": {"x": 100, "y": 250}, "data": {"label": "Ping Target", "type": "traffic.ping", "category": "traffic", "parameters": {"host": SSH_HOST, "count": 2}}},
            {"id": "4", "type": "block", "position": {"x": 100, "y": 350}, "data": {"label": "Port Scan", "type": "scanning.port_scan", "category": "scanning", "parameters": {"host": SSH_HOST, "ports": "22,80,443"}}},
            {"id": "5", "type": "block", "position": {"x": 100, "y": 450}, "data": {"label": "End", "type": "control.end", "category": "control", "parameters": {"status": "success"}}},
        ],
        "edges": [
            {"id": "e1-2", "source": "1", "target": "2", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e2-3", "source": "2", "target": "3", "sourceHandle": "out", "targetHandle": "in"},
            {"id": "e3-4", "source": "3", "target": "4", "sourceHandle": "reachable", "targetHandle": "in"},
            {"id": "e4-5", "source": "4", "target": "5", "sourceHandle": "out", "targetHandle": "in"},
        ],
    },
]


class TemplateE2ETester:
    def __init__(self):
        self.token = None
        self.results: List[TemplateTestResult] = []
        self.created_workflows = []
    
    def login(self) -> bool:
        """Get auth token"""
        try:
            resp = requests.post(
                f"{API_BASE}/api/v1/auth/login",
                data={"username": "admin", "password": "admin123"},
                timeout=TIMEOUT
            )
            if resp.status_code == 200:
                self.token = resp.json().get("access_token")
                print("✓ Authenticated")
                return True
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
    
    def create_workflow(self, template: Dict) -> Optional[str]:
        """Create workflow from template"""
        try:
            payload = {
                "name": f"Test: {template['name']}",
                "description": template['description'],
                "nodes": template['nodes'],
                "edges": template['edges'],
                "category": template.get('category', 'utility'),
                "settings": {"timeout": 300, "retryOnError": False},
                "variables": [],
                "tags": ["test", "template"]
            }
            
            resp = requests.post(
                f"{API_BASE}/api/v1/workflows/",
                headers=self.headers(),
                json=payload,
                timeout=TIMEOUT
            )
            
            if resp.status_code == 201:
                wf_id = resp.json().get("id")
                self.created_workflows.append(wf_id)
                return wf_id
            else:
                print(f"    Create failed: {resp.status_code} - {resp.text[:100]}")
                return None
        except Exception as e:
            print(f"    Create error: {e}")
            return None
    
    def execute_workflow(self, workflow_id: str) -> Dict:
        """Execute workflow and wait for completion"""
        try:
            # Start execution
            resp = requests.post(
                f"{API_BASE}/api/v1/workflows/{workflow_id}/execute",
                headers=self.headers(),
                json={"inputs": {}},
                timeout=TIMEOUT
            )
            
            if resp.status_code != 200:
                return {"error": f"Execute failed: {resp.status_code}", "status": "failed"}
            
            exec_data = resp.json()
            exec_id = exec_data.get("id")
            
            # Poll for completion
            max_wait = 60  # seconds
            poll_interval = 1
            waited = 0
            
            while waited < max_wait:
                time.sleep(poll_interval)
                waited += poll_interval
                
                status_resp = requests.get(
                    f"{API_BASE}/api/v1/workflows/{workflow_id}/executions/{exec_id}",
                    headers=self.headers(),
                    timeout=TIMEOUT
                )
                
                if status_resp.status_code != 200:
                    continue
                
                status_data = status_resp.json()
                status = status_data.get("status", "")
                
                if status in ["completed", "success", "COMPLETED", "SUCCESS"]:
                    return {
                        "execution_id": exec_id,
                        "status": "completed",
                        "node_statuses": status_data.get("node_statuses", {}),
                        "progress": status_data.get("progress", {})
                    }
                elif status in ["failed", "error", "FAILED", "ERROR"]:
                    return {
                        "execution_id": exec_id,
                        "status": "failed",
                        "errors": status_data.get("errors", [])
                    }
            
            return {"execution_id": exec_id, "status": "timeout"}
            
        except Exception as e:
            return {"error": str(e), "status": "error"}
    
    def test_template(self, template: Dict) -> TemplateTestResult:
        """Test a single template end-to-end"""
        start = time.time()
        
        # Create workflow
        workflow_id = self.create_workflow(template)
        if not workflow_id:
            return TemplateTestResult(
                template_id=template['id'],
                template_name=template['name'],
                workflow_id=None,
                execution_id=None,
                status='error',
                duration_ms=int((time.time() - start) * 1000),
                nodes_executed=0,
                total_nodes=len(template['nodes']),
                error="Failed to create workflow"
            )
        
        # Execute workflow
        result = self.execute_workflow(workflow_id)
        duration = int((time.time() - start) * 1000)
        
        if result.get("status") == "completed":
            progress = result.get("progress", {})
            return TemplateTestResult(
                template_id=template['id'],
                template_name=template['name'],
                workflow_id=workflow_id,
                execution_id=result.get("execution_id"),
                status='pass',
                duration_ms=duration,
                nodes_executed=progress.get("completed", len(template['nodes'])),
                total_nodes=len(template['nodes'])
            )
        else:
            return TemplateTestResult(
                template_id=template['id'],
                template_name=template['name'],
                workflow_id=workflow_id,
                execution_id=result.get("execution_id"),
                status='fail',
                duration_ms=duration,
                nodes_executed=0,
                total_nodes=len(template['nodes']),
                error=result.get("error") or result.get("status")
            )
    
    def cleanup(self):
        """Delete created test workflows"""
        for wf_id in self.created_workflows:
            try:
                requests.delete(
                    f"{API_BASE}/api/v1/workflows/{wf_id}",
                    headers=self.headers(),
                    timeout=10
                )
            except:
                pass
    
    def run_all_tests(self):
        """Run all template tests"""
        print("=" * 70)
        print("FLOW TEMPLATES END-TO-END TEST")
        print("Testing complete workflows with connected blocks")
        print("=" * 70)
        
        if not self.login():
            print("Cannot continue without authentication")
            return 1
        
        print(f"\nTesting {len(TEMPLATES)} templates against real hosts:")
        print(f"  SSH Server: {SSH_HOST}")
        print(f"  Web Server: {WEB_HOST}\n")
        
        for i, template in enumerate(TEMPLATES, 1):
            print(f"[{i}/{len(TEMPLATES)}] {template['name']}")
            print(f"    Nodes: {len(template['nodes'])} | Edges: {len(template['edges'])}")
            
            result = self.test_template(template)
            self.results.append(result)
            
            if result.status == 'pass':
                print(f"    ✓ PASS ({result.duration_ms}ms) - {result.nodes_executed}/{result.total_nodes} nodes")
            else:
                print(f"    ✗ FAIL ({result.duration_ms}ms) - {result.error}")
            print()
        
        # Summary
        self.print_summary()
        
        # Cleanup
        print("\nCleaning up test workflows...")
        self.cleanup()
        
        return 0 if all(r.status == 'pass' for r in self.results) else 1
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for r in self.results if r.status == 'pass')
        failed = len(self.results) - passed
        
        print(f"\nTotal: {len(self.results)} | Passed: {passed} | Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.results))*100:.0f}%")
        
        print("\n┌─────────────────────────────────────┬────────┬───────────┬────────┐")
        print("│ Template                            │ Status │ Nodes     │ Time   │")
        print("├─────────────────────────────────────┼────────┼───────────┼────────┤")
        
        for r in self.results:
            name = r.template_name[:35].ljust(35)
            status = "PASS" if r.status == 'pass' else "FAIL"
            nodes = f"{r.nodes_executed}/{r.total_nodes}".center(9)
            dur = f"{r.duration_ms}ms".rjust(6)
            print(f"│ {name} │ {status.center(6)} │ {nodes} │ {dur} │")
        
        print("└─────────────────────────────────────┴────────┴───────────┴────────┘")
        
        if failed > 0:
            print("\nFailed Templates:")
            for r in self.results:
                if r.status != 'pass':
                    print(f"  - {r.template_name}: {r.error}")


if __name__ == "__main__":
    tester = TemplateE2ETester()
    sys.exit(tester.run_all_tests())
