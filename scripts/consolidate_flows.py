#!/usr/bin/env python3
"""
Workflow Consolidation Script
=============================
Removes duplicate workflows and standardizes naming.
Creates a clean set of standard workflows for testing.
"""

import requests
import json
from typing import Dict, List, Any

API_BASE = "http://localhost:12001/api/v1"

# Standard workflow definitions to keep/create
STANDARD_WORKFLOWS = {
    # Keep these unique workflows
    "T1-Ping": "Basic ping test workflow",
    "T2-SSH": "SSH connection test workflow",
    "T3-TCP": "TCP connection test workflow",
    "T4-Delay-Cond": "Delay and condition test workflow",
    "T5-MultiPing": "Multi-host ping test workflow",
    "T6-SSH-Cmd": "SSH command execution workflow",
    "T7-PortScan": "Port scanning workflow",
    "T8-Traffic": "Traffic capture workflow",
    "T9-SysInfo": "System information workflow",
}

# Workflows to delete (duplicates and test artifacts)
DELETE_PATTERNS = [
    "UI Test:",
    "Test:",
    "API Block Test",
    "Template Test",
    "Real Host Ping Test",
    "TestFlow",
    "qqq",
]


def login() -> str:
    """Authenticate and return token"""
    resp = requests.post(
        f"{API_BASE}/auth/login",
        data={"username": "admin", "password": "admin123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if resp.status_code == 200:
        return resp.json().get("access_token")
    raise Exception(f"Login failed: {resp.status_code}")


def get_workflows(token: str) -> List[Dict]:
    """Get all workflows"""
    resp = requests.get(
        f"{API_BASE}/workflows/",
        headers={"Authorization": f"Bearer {token}"}
    )
    return resp.json().get("workflows", [])


def delete_workflow(token: str, workflow_id: str, name: str) -> bool:
    """Delete a workflow"""
    resp = requests.delete(
        f"{API_BASE}/workflows/{workflow_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    if resp.status_code in [200, 204]:
        print(f"  ✓ Deleted: {name}")
        return True
    else:
        print(f"  ✗ Failed to delete: {name} ({resp.status_code})")
        return False


def should_delete(name: str) -> bool:
    """Check if workflow should be deleted based on patterns"""
    for pattern in DELETE_PATTERNS:
        if pattern in name:
            return True
    return False


def consolidate_workflows(token: str, dry_run: bool = True):
    """Consolidate workflows by removing duplicates"""
    workflows = get_workflows(token)
    
    print(f"\n{'='*60}")
    print(f"WORKFLOW CONSOLIDATION {'(DRY RUN)' if dry_run else '(LIVE)'}")
    print(f"{'='*60}")
    print(f"\nTotal workflows found: {len(workflows)}")
    
    to_keep = []
    to_delete = []
    seen_names = {}
    
    for wf in workflows:
        wf_id = wf["id"]
        name = wf["name"]
        
        # Check if should delete based on patterns
        if should_delete(name):
            to_delete.append((wf_id, name, "Matches delete pattern"))
            continue
        
        # Check for duplicates
        if name in seen_names:
            to_delete.append((wf_id, name, f"Duplicate of {seen_names[name]}"))
            continue
        
        # Keep this one
        seen_names[name] = wf_id
        to_keep.append((wf_id, name))
    
    print(f"\nWorkflows to KEEP: {len(to_keep)}")
    for wf_id, name in to_keep:
        print(f"  🟢 {name}")
    
    print(f"\nWorkflows to DELETE: {len(to_delete)}")
    for wf_id, name, reason in to_delete:
        print(f"  🔴 {name} ({reason})")
    
    if not dry_run and to_delete:
        print(f"\n{'='*60}")
        print("DELETING WORKFLOWS...")
        print(f"{'='*60}")
        
        deleted = 0
        for wf_id, name, reason in to_delete:
            if delete_workflow(token, wf_id, name):
                deleted += 1
        
        print(f"\nDeleted {deleted}/{len(to_delete)} workflows")
    
    return to_keep, to_delete


def create_standard_workflows(token: str):
    """Create standard test workflows if they don't exist"""
    existing = get_workflows(token)
    existing_names = {wf["name"] for wf in existing}
    
    print(f"\n{'='*60}")
    print("STANDARD WORKFLOW CHECK")
    print(f"{'='*60}")
    
    for name, description in STANDARD_WORKFLOWS.items():
        if name in existing_names:
            print(f"  ✓ Exists: {name}")
        else:
            print(f"  ○ Missing: {name}")


def main():
    import sys
    
    dry_run = "--live" not in sys.argv
    
    print("\n" + "="*60)
    print("WORKFLOW CONSOLIDATION SCRIPT")
    print("="*60)
    
    if dry_run:
        print("\n⚠️  DRY RUN MODE - No changes will be made")
        print("   Run with --live to actually delete duplicates")
    
    token = login()
    print("✓ Login successful")
    
    to_keep, to_delete = consolidate_workflows(token, dry_run)
    create_standard_workflows(token)
    
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Workflows to keep: {len(to_keep)}")
    print(f"Workflows to delete: {len(to_delete)}")
    
    if dry_run and to_delete:
        print(f"\n⚠️  Run with --live to delete {len(to_delete)} duplicate workflows")


if __name__ == "__main__":
    main()
