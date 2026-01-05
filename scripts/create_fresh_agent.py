#!/usr/bin/env python3
"""Create a fresh test agent with all modules enabled"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "admin"
PASSWORD = "admin123"

def get_token():
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": USERNAME, "password": PASSWORD}
    )
    if response.status_code != 200:
        print(f"❌ Auth failed: {response.status_code}")
        sys.exit(1)
    return response.json()["access_token"]

def create_agent(token):
    """Create new agent"""
    agent_data = {
        "name": "fresh_pov_test",
        "agent_type": "python",
        "description": "Fresh agent for POV testing - all modules enabled",
        "connection_url": "ws://172.28.0.1:8000/api/v1/agents/{agent_id}/connect",
        "obfuscate": False,
        "config": {
            "asset_discovery": True,
            "traffic_capture": True,
            "host_monitoring": True,
            "remote_access": True,
            "passive_discovery": True,
            "scan_subnet": "10.10.0.0/16",
            "sniff_interface": "eth1"
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/agents/",
        headers={"Authorization": f"Bearer {token}"},
        json=agent_data
    )
    
    if response.status_code != 201:
        print(f"❌ Agent creation failed: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    agent = response.json()
    print(f"✓ Agent created: {agent['name']} ({agent['id']})")
    return agent

def download_agent(token, agent_id):
    """Download agent file"""
    # Generate downloads the agent
    response = requests.post(
        f"{BASE_URL}/agents/{agent_id}/generate",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code != 200:
        print(f"❌ Generation failed: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    data = response.json()
    content = data.get("content")
    
    if not content:
        print(f"❌ No content in response")
        sys.exit(1)
    
    # Save to file
    with open("agent.py", "w") as f:
        f.write(content)
    
    print(f"✓ Agent generated: agent.py ({len(content)} bytes)")
    return True

def main():
    print("=" * 60)
    print("Creating Fresh POV Test Agent")
    print("=" * 60)
    
    token = get_token()
    print("✓ Authenticated")
    
    agent = create_agent(token)
    download_agent(token, agent["id"])
    
    print("\n" + "=" * 60)
    print(f"Agent ID: {agent['id']}")
    print(f"Agent Name: {agent['name']}")
    print("File: agent.py")
    print("=" * 60)
    print("\nNext steps:")
    print(f"1. Deploy: docker cp agent.py agent-pov-host:/downloads/")
    print(f"2. Run: docker exec -d agent-pov-host python3 /downloads/agent.py --backend-url http://backend:8000")
    print(f"3. Test POV mode with agent ID: {agent['id']}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
