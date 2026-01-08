#!/usr/bin/env python3
"""Quick test of Python agent with Codespaces URL"""
import os
import sys
import requests
import subprocess
import time
import tempfile

# Get Codespaces URL (use localhost for API calls, but Codespaces URL for agent connection)
codespace_name = os.getenv("CODESPACE_NAME", "")
domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")

# Always use localhost for API calls (within container network)
c2_url = "http://localhost:8000"

if codespace_name:
    # Agent will connect via public Codespaces URL
    ws_url = f"wss://{codespace_name}-8000.{domain}"
else:
    ws_url = "ws://localhost:8000"

print(f"🔍 Testing agent with C2: {c2_url}")
print(f"   WebSocket: {ws_url}")

# Login first
print("\n🔐 Logging in...")
login_response = requests.post(
    f"{c2_url}/api/v1/auth/login",
    data={"username": "admin", "password": "admin123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    timeout=10
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    sys.exit(1)

token = login_response.json()["access_token"]
print(f"✅ Logged in successfully")

headers = {"Authorization": f"Bearer {token}"}

# Create agent
print("\n📝 Creating agent...")
response = requests.post(
    f"{c2_url}/api/v1/agents",
    headers=headers,
    json={
        "name": "QuickTest Python Agent",
        "agent_type": "python",
        "connection_url": f"{ws_url}/api/v1/agents/{{agent_id}}/connect"
    },
    timeout=10
)

if response.status_code not in (200, 201):
    print(f"❌ Failed to create agent: {response.status_code}")
    print(response.text)
    sys.exit(1)

agent_data = response.json()
agent_id = agent_data["id"]
print(f"✅ Agent created: {agent_id}")

# Download agent
print("\n📥 Downloading agent...")
download_response = requests.post(
    f"{c2_url}/api/v1/agents/{agent_id}/generate",
    headers=headers,
    timeout=10
)

if download_response.status_code != 200:
    print(f"❌ Failed to download: {download_response.status_code}")
    sys.exit(1)

# Parse JSON response
download_data = download_response.json()
agent_code = download_data.get("content", "")
filename = download_data.get("filename", "agent.py")
print(f"✅ Downloaded {len(agent_code)} bytes")

# Save to file for inspection
with open('/tmp/generated_agent.py', 'w') as f:
    f.write(agent_code)
print(f"💾 Saved to /tmp/generated_agent.py for inspection")

# Verify URL replacement
expected_ws = f"{ws_url}/api/v1/agents/{agent_id}/connect"
if expected_ws in agent_code:
    print(f"✅ WebSocket URL correctly includes agent ID")
else:
    print(f"⚠️  WebSocket URL not found!")
    print(f"   Expected: {expected_ws}")
    # Find what was actually used
    for i, line in enumerate(agent_code.split('\n'), 1):
        if 'SERVER_URL' in line and '=' in line:
            print(f"   Found (line {i}): {line.strip()}")

# Test run agent for 5 seconds
print(f"\n🚀 Testing agent execution (5 seconds)...")
with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
    agent_file = f.name
    f.write(agent_code)

try:
    proc = subprocess.Popen(
        [sys.executable, agent_file],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    time.sleep(5)
    proc.terminate()
    stdout, stderr = proc.communicate(timeout=2)
    
    print("\n📊 Output:")
    if stdout:
        print(stdout[:500])
    if stderr:
        print("Errors:", stderr[:500])
    
    if "Connected" in stdout or "connected" in stdout.lower():
        print("\n✅ SUCCESS: Agent connected!")
    else:
        print("\n⚠️  Agent ran but connection status unclear")
        
finally:
    os.unlink(agent_file)
    # Cleanup
    requests.delete(f"{c2_url}/api/v1/agents/{agent_id}", headers=headers, timeout=5)

print("\n" + "="*60)
print(f"✅ Test complete!")
print("="*60)
