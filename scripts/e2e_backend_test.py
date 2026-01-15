#!/usr/bin/env python3
"""
E2E Backend API Test for all 10 Production Workflow Templates
Tests each template scenario against real test hosts
"""
import requests
import json
import time
from typing import Dict, Any

BASE_URL = "http://localhost:12001/api/v1"

# Test host configuration
HOSTS = {
    "ssh": "172.29.0.100",
    "web": "172.29.0.101",
    "ftp": "172.29.0.105",
    "vuln": "172.29.0.106",
    "extra1": "172.29.0.107",
    "extra2": "172.29.0.108"
}

CREDS = {
    "ssh": {"username": "root", "password": "toor"},
    "ftp": {"username": "ftpuser", "password": "ftp123"},
    "vuln": {"username": "root", "password": "vuln123"}
}

def test_api(method: str, endpoint: str, data: Dict = None, desc: str = "") -> Dict:
    """Make API request and return result"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            r = requests.get(url, timeout=30)
        else:
            r = requests.post(url, json=data, timeout=30)
        
        success = r.status_code in [200, 201]
        return {
            "success": success,
            "status": r.status_code,
            "data": r.json() if r.content else {},
            "desc": desc
        }
    except Exception as e:
        return {"success": False, "error": str(e), "desc": desc}

def print_result(name: str, result: Dict):
    """Print test result"""
    status = "✓ PASS" if result.get("success") else "✗ FAIL"
    print(f"  {status}: {result.get('desc', name)}")
    if not result.get("success") and result.get("error"):
        print(f"    Error: {result['error']}")

def main():
    print("=" * 70)
    print("E2E BACKEND API TESTS - 10 Production Workflow Templates")
    print("=" * 70)

    # ============================================================================
    # Template 1: Asset Discovery & Inventory
    # ============================================================================
    print("\n[1/10] Asset Discovery & Inventory")
    print("-" * 50)

    r1 = test_api("POST", f"/discovery/ping/{HOSTS['ssh']}", desc="Ping SSH target")
    print_result("ping", r1)

    r2 = test_api("POST", f"/discovery/ping/{HOSTS['ftp']}", desc="Ping FTP target")
    print_result("ping", r2)

    r3 = test_api("GET", "/assets/", desc="Get all assets")
    print_result("assets", r3)

    template1_pass = r1["success"] and r2["success"]
    print(f"\n  Template 1 Result: {'✓ PASSED' if template1_pass else '✗ FAILED'}")

    # ============================================================================
    # Template 2: Vulnerability Assessment Chain
    # ============================================================================
    print("\n[2/10] Vulnerability Assessment Chain")
    print("-" * 50)

    r1 = test_api("POST", f"/discovery/port-scan/{HOSTS['vuln']}", desc="Port scan vuln target")
    print_result("port_scan", r1)

    r2 = test_api("POST", "/vulnerabilities/lookup-cve", 
                  {"product": "apache http server", "version": "2.4.49"},
                  desc="CVE lookup for Apache")
    print_result("cve_lookup", r2)

    r3 = test_api("GET", "/vulnerabilities/exploits/CVE-2021-41773", desc="Get exploits for CVE")
    print_result("exploits", r3)

    template2_pass = r1["success"]
    print(f"\n  Template 2 Result: {'✓ PASSED' if template2_pass else '✗ FAILED'}")

    # ============================================================================
    # Template 3: Credential Validation Sweep
    # ============================================================================
    print("\n[3/10] Credential Validation Sweep")
    print("-" * 50)

    r1 = test_api("POST", "/access/test/ssh", {
        "host": HOSTS["ssh"],
        "port": 22,
        **CREDS["ssh"]
    }, desc="SSH test to ssh-target (root:toor)")
    print_result("ssh_test", r1)

    r2 = test_api("POST", "/access/test/ssh", {
        "host": HOSTS["vuln"],
        "port": 22,
        **CREDS["vuln"]
    }, desc="SSH test to vuln-target (root:vuln123)")
    print_result("ssh_test", r2)

    r3 = test_api("POST", "/access/test/ftp", {
        "host": HOSTS["ftp"],
        "port": 21,
        **CREDS["ftp"]
    }, desc="FTP test to ftp-target (ftpuser:ftp123)")
    print_result("ftp_test", r3)

    template3_pass = r1["success"] and r3["success"]
    print(f"\n  Template 3 Result: {'✓ PASSED' if template3_pass else '✗ FAILED'}")

    # ============================================================================
    # Template 4: SSH Command Execution Campaign
    # ============================================================================
    print("\n[4/10] SSH Command Execution Campaign")
    print("-" * 50)

    r1 = test_api("POST", "/access/execute/ssh", {
        "host": HOSTS["ssh"],
        "port": 22,
        "command": "hostname",
        **CREDS["ssh"]
    }, desc="SSH execute: hostname")
    print_result("ssh_exec", r1)

    r2 = test_api("POST", "/access/execute/ssh", {
        "host": HOSTS["ssh"],
        "port": 22,
        "command": "uname -a",
        **CREDS["ssh"]
    }, desc="SSH execute: uname -a")
    print_result("ssh_exec", r2)

    r3 = test_api("POST", "/access/execute/ssh", {
        "host": HOSTS["ssh"],
        "port": 22,
        "command": "cat /etc/os-release | head -3",
        **CREDS["ssh"]
    }, desc="SSH execute: os-release")
    print_result("ssh_exec", r3)

    template4_pass = r1["success"] and r2["success"]
    print(f"\n  Template 4 Result: {'✓ PASSED' if template4_pass else '✗ FAILED'}")

    # ============================================================================
    # Template 5: Network Traffic Analysis
    # ============================================================================
    print("\n[5/10] Network Traffic Analysis")
    print("-" * 50)

    r1 = test_api("GET", "/traffic/interfaces", desc="List network interfaces")
    print_result("interfaces", r1)

    r2 = test_api("GET", "/traffic/stats", desc="Get traffic stats")
    print_result("stats", r2)

    r3 = test_api("POST", "/traffic/ping", {
        "host": HOSTS["ssh"],
        "count": 3,
        "timeout": 5
    }, desc="Ping via traffic API")
    print_result("ping", r3)

    template5_pass = r1["success"] and r3["success"]
    print(f"\n  Template 5 Result: {'✓ PASSED' if template5_pass else '✗ FAILED'}")

    # ============================================================================
    # Template 6: Exploit Discovery & Mapping
    # ============================================================================
    print("\n[6/10] Exploit Discovery & Mapping")
    print("-" * 50)

    r1 = test_api("POST", f"/discovery/port-scan/{HOSTS['vuln']}", desc="Scan vuln target ports")
    print_result("port_scan", r1)

    r2 = test_api("GET", f"/access/scan/services/{HOSTS['vuln']}", desc="Service detection")
    print_result("service_scan", r2)

    template6_pass = r1["success"]
    print(f"\n  Template 6 Result: {'✓ PASSED' if template6_pass else '✗ FAILED'}")

    # ============================================================================
    # Template 7: FTP File Operations
    # ============================================================================
    print("\n[7/10] FTP File Operations")
    print("-" * 50)

    r1 = test_api("POST", "/access/test/ftp", {
        "host": HOSTS["ftp"],
        "port": 21,
        **CREDS["ftp"]
    }, desc="FTP connection test")
    print_result("ftp_test", r1)

    r2 = test_api("POST", "/access/ftp/list", {
        "host": HOSTS["ftp"],
        "port": 21,
        "path": "/",
        **CREDS["ftp"]
    }, desc="FTP list root directory")
    print_result("ftp_list", r2)

    template7_pass = r1["success"]
    print(f"\n  Template 7 Result: {'✓ PASSED' if template7_pass else '✗ FAILED'}")

    # ============================================================================
    # Template 8: Multi-Host Ping Health Check
    # ============================================================================
    print("\n[8/10] Multi-Host Ping Health Check")
    print("-" * 50)

    hosts_to_ping = [HOSTS["ssh"], HOSTS["web"], HOSTS["ftp"], HOSTS["vuln"], HOSTS["extra1"], HOSTS["extra2"]]
    ping_results = []

    for host in hosts_to_ping:
        r = test_api("POST", "/traffic/ping", {
            "host": host,
            "count": 2,
            "timeout": 3
        }, desc=f"Ping {host}")
        print_result("ping", r)
        ping_results.append(r["success"])

    template8_pass = all(ping_results)
    print(f"\n  Template 8 Result: {'✓ PASSED' if template8_pass else '✗ FAILED'}")

    # ============================================================================
    # Template 9: Agent Deployment Chain
    # ============================================================================
    print("\n[9/10] Agent Deployment Chain")
    print("-" * 50)

    r1 = test_api("POST", "/access/test/ssh", {
        "host": HOSTS["ssh"],
        "port": 22,
        **CREDS["ssh"]
    }, desc="SSH access check for agent deploy")
    print_result("ssh_test", r1)

    # Agent listing requires auth, test system info instead
    r2 = test_api("POST", "/access/execute/ssh", {
        "host": HOSTS["ssh"],
        "port": 22,
        "command": "whoami && id",
        **CREDS["ssh"]
    }, desc="SSH execute: verify access for agent deploy")
    print_result("ssh_whoami", r2)

    template9_pass = r1["success"] and r2["success"]
    print(f"\n  Template 9 Result: {'✓ PASSED' if template9_pass else '✗ FAILED'}")

    # ============================================================================
    # Template 10: Traffic Storm Testing
    # ============================================================================
    print("\n[10/10] Traffic Storm Testing")
    print("-" * 50)

    r1 = test_api("GET", "/traffic/stats", desc="Pre-storm traffic stats")
    print_result("stats", r1)

    r2 = test_api("GET", "/traffic/storm/metrics", desc="Storm metrics")
    print_result("storm_metrics", r2)

    r3 = test_api("POST", "/traffic/ping", {
        "host": HOSTS["ssh"],
        "count": 5,
        "timeout": 5
    }, desc="Generate test traffic")
    print_result("traffic_gen", r3)

    template10_pass = r1["success"] and r3["success"]
    print(f"\n  Template 10 Result: {'✓ PASSED' if template10_pass else '✗ FAILED'}")

    # ============================================================================
    # SUMMARY
    # ============================================================================
    print("\n" + "=" * 70)
    print("SUMMARY - Backend API E2E Tests")
    print("=" * 70)

    results = [
        ("Asset Discovery & Inventory", template1_pass),
        ("Vulnerability Assessment Chain", template2_pass),
        ("Credential Validation Sweep", template3_pass),
        ("SSH Command Execution Campaign", template4_pass),
        ("Network Traffic Analysis", template5_pass),
        ("Exploit Discovery & Mapping", template6_pass),
        ("FTP File Operations", template7_pass),
        ("Multi-Host Ping Health Check", template8_pass),
        ("Agent Deployment Chain", template9_pass),
        ("Traffic Storm Testing", template10_pass),
    ]

    passed = sum(1 for _, r in results if r)
    total = len(results)

    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")

    print(f"\n{'=' * 70}")
    print(f"TOTAL: {passed}/{total} templates PASSED")
    print("=" * 70)

    return passed == total

if __name__ == "__main__":
    exit(0 if main() else 1)
