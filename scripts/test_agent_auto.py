#!/usr/bin/env python3
"""
Automated test for Python agent generation and connectivity
"""
import os
import sys
import requests
import subprocess
import time
import tempfile
import json

# Determine the correct C2 URL
codespace_name = os.getenv("CODESPACE_NAME", "")
if codespace_name:
    # Use Codespaces public URL
    domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")
    c2_url = f"https://{codespace_name}-8000.{domain}"
else:
    # Use localhost
    c2_url = "http://localhost:8000"

print(f"🔍 Testing agent with C2 URL: {c2_url}")

# Step 1: Create an agent via API
print("\n📝 Step 1: Creating agent via API...")
create_payload = {
    "name": "AutoTest Python Agent",
    "agent_type": "python",
    "connection_url": c2_url
}

try:
    response = requests.post(
        f"{c2_url}/api/v1/agents",
        json=create_payload,
        timeout=10
    )
    response.raise_for_status()
    agent_data = response.json()
    agent_id = agent_data["id"]
    print(f"✅ Agent created with ID: {agent_id}")
except Exception as e:
    print(f"❌ Failed to create agent: {e}")
    sys.exit(1)

# Step 2: Download the agent code
print(f"\n📥 Step 2: Downloading agent code...")
try:
    download_response = requests.get(
        f"{c2_url}/api/v1/agents/{agent_id}/download",
        timeout=10
    )
    download_response.raise_for_status()
    agent_code = download_response.text
    print(f"✅ Downloaded {len(agent_code)} bytes of agent code")
    
    # Verify URL replacement
    if f"{c2_url}/api/v1/agents/{agent_id}/connect" in agent_code:
        print(f"✅ WebSocket URL correctly includes agent ID: {agent_id}")
    else:
        print(f"⚠️  Warning: WebSocket URL may not be correctly formatted")
        print(f"   Looking for: {c2_url}/api/v1/agents/{agent_id}/connect")
        # Print relevant lines
        for i, line in enumerate(agent_code.split('\n'), 1):
            if 'ws_url' in line or 'connect' in line:
                print(f"   Line {i}: {line.strip()}")
    
except Exception as e:
    print(f"❌ Failed to download agent: {e}")
    sys.exit(1)

# Step 3: Save and test run the agent
print(f"\n🚀 Step 3: Testing agent execution...")
with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
    agent_file = f.name
    f.write(agent_code)

try:
    # Run agent for 5 seconds to test connectivity
    print(f"   Running agent for 5 seconds...")
    proc = subprocess.Popen(
        [sys.executable, agent_file],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    time.sleep(5)
    proc.terminate()
    
    stdout, stderr = proc.communicate(timeout=2)
    
    print(f"\n📊 Agent Output:")
    print(f"--- STDOUT ---")
    print(stdout if stdout else "(no output)")
    print(f"--- STDERR ---")
    print(stderr if stderr else "(no errors)")
    
    # Check if agent connected
    if "Connected to C2" in stdout or "connected" in stdout.lower():
        print(f"\n✅ Agent successfully connected!")
    elif "error" in stderr.lower() or "failed" in stderr.lower():
        print(f"\n⚠️  Agent encountered errors (see above)")
    else:
        print(f"\n⚠️  Connection status unclear (check output above)")
    
except Exception as e:
    print(f"❌ Failed to run agent: {e}")
finally:
    os.unlink(agent_file)

# Step 4: Check agent status via API
print(f"\n🔍 Step 4: Checking agent status via API...")
try:
    status_response = requests.get(
        f"{c2_url}/api/v1/agents/{agent_id}",
        timeout=10
    )
    status_response.raise_for_status()
    status_data = status_response.json()
    
    print(f"   Status: {status_data.get('status', 'unknown')}")
    print(f"   Last seen: {status_data.get('last_seen', 'never')}")
    
    if status_data.get('status') == 'active':
        print(f"✅ Agent is ACTIVE!")
    else:
        print(f"⚠️  Agent status: {status_data.get('status')}")
    
except Exception as e:
    print(f"❌ Failed to check status: {e}")

# Step 5: Cleanup
print(f"\n🧹 Step 5: Cleaning up...")
try:
    delete_response = requests.delete(
        f"{c2_url}/api/v1/agents/{agent_id}",
        timeout=10
    )
    delete_response.raise_for_status()
    print(f"✅ Agent deleted")
except Exception as e:
    print(f"⚠️  Failed to delete agent: {e}")

print(f"\n{'='*60}")
print(f"🎯 Test Summary:")
print(f"   C2 URL: {c2_url}")
print(f"   Agent ID: {agent_id}")
print(f"   Result: Check output above")
print(f"{'='*60}")
