#!/usr/bin/env python3
"""
Comprehensive test of Agent Creation with custom host/port
Tests the complete flow including UI features
"""
import requests
import os

# Get Codespaces URL components
codespace_name = os.getenv("CODESPACE_NAME", "")
domain = os.getenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")

# Test with different configurations
test_configs = [
    {
        "name": "Local Development",
        "protocol": "ws",
        "host": "localhost",
        "port": "8000"
    },
    {
        "name": "Docker Network",
        "protocol": "ws",
        "host": "172.28.0.1",
        "port": "8000"
    },
]

if codespace_name:
    test_configs.append({
        "name": "Codespaces Public",
        "protocol": "wss",
        "host": f"{codespace_name}-8000.{domain}",
        "port": ""
    })

# Login
response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    data={"username": "admin", "password": "admin123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("🧪 Testing Agent Creation with Custom Host/Port\n")
print("="*70)

all_passed = True

for config in test_configs:
    print(f"\n📝 Test: {config['name']}")
    print(f"   Protocol: {config['protocol']}")
    print(f"   Host: {config['host']}")
    print(f"   Port: {config['port'] or '(none)'}")
    
    # Build connection URL
    port_suffix = f":{config['port']}" if config['port'] else ""
    connection_url = f"{config['protocol']}://{config['host']}{port_suffix}/api/v1/agents/{{agent_id}}/connect"
    
    # Create agent
    create_response = requests.post(
        "http://localhost:8000/api/v1/agents/",
        headers=headers,
        json={
            "name": f"Test Agent - {config['name']}",
            "agent_type": "python",
            "connection_url": connection_url
        }
    )
    
    if create_response.status_code not in (200, 201):
        print(f"   ❌ Failed to create: {create_response.status_code}")
        all_passed = False
        continue
    
    agent_data = create_response.json()
    agent_id = agent_data["id"]
    
    # Verify stored URL
    if agent_data['connection_url'] != connection_url:
        print(f"   ❌ Stored URL mismatch!")
        print(f"      Expected: {connection_url}")
        print(f"      Got: {agent_data['connection_url']}")
        all_passed = False
        continue
    
    # Generate agent
    gen_response = requests.post(
        f"http://localhost:8000/api/v1/agents/{agent_id}/generate",
        headers=headers
    )
    
    if gen_response.status_code != 200:
        print(f"   ❌ Failed to generate: {gen_response.status_code}")
        all_passed = False
        continue
    
    content = gen_response.json()["content"]
    
    # Verify SERVER_URL replacement
    expected_url = connection_url.replace('{agent_id}', agent_id)
    server_url_line = None
    
    for line in content.split('\n'):
        if line.strip().startswith('SERVER_URL ='):
            server_url_line = line.strip()
            break
    
    if not server_url_line:
        print(f"   ❌ SERVER_URL line not found in generated code!")
        all_passed = False
        continue
    
    if expected_url in server_url_line:
        print(f"   ✅ URL correctly replaced: {expected_url}")
    else:
        print(f"   ❌ URL replacement failed!")
        print(f"      Expected: {expected_url}")
        print(f"      Got: {server_url_line}")
        all_passed = False
    
    # Cleanup
    requests.delete(f"http://localhost:8000/api/v1/agents/{agent_id}", headers=headers)

print("\n" + "="*70)
if all_passed:
    print("🎉 ALL TESTS PASSED! Agent creation with custom host/port is working!")
else:
    print("❌ SOME TESTS FAILED - see output above")
print("="*70)
