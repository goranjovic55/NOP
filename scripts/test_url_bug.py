#!/usr/bin/env python3
"""Debug script to trace the URL replacement bug"""
import requests
import json

# Get auth token
response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    data={"username": "admin", "password": "admin123"},
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create a test agent with a simple URL
test_url = "ws://testhost:8000/api/v1/agents/{agent_id}/connect"
create_response = requests.post(
    "http://localhost:8000/api/v1/agents/",
    headers=headers,
    json={
        "name": "URL Debug Test",
        "agent_type": "python",
        "connection_url": test_url
    }
)

if create_response.status_code not in (200, 201):
    print(f"Failed to create: {create_response.status_code}")
    print(create_response.text)
    exit(1)

agent_data = create_response.json()
agent_id = agent_data["id"]

print(f"Created agent: {agent_id}")
print(f"Sent connection_url: {test_url}")
print(f"Stored connection_url: {agent_data['connection_url']}")
print()

# Generate the agent
gen_response = requests.post(
    f"http://localhost:8000/api/v1/agents/{agent_id}/generate",
    headers=headers
)

if gen_response.status_code != 200:
    print(f"Failed to generate: {gen_response.status_code}")
    exit(1)

content = gen_response.json()["content"]

# Find the SERVER_URL line
for i, line in enumerate(content.split('\n'), 1):
    if line.strip().startswith('SERVER_URL ='):
        print(f"Line {i}: {line}")
        print()
        
        # What we expect
        expected = test_url.replace('{agent_id}', agent_id)
        print(f"Expected: SERVER_URL = \"{expected}\"")
        
        # What we got
        if expected in line:
            print("✅ URL replacement is CORRECT!")
        else:
            print("❌ URL replacement is WRONG!")
            print(f"   Got: {line.strip()}")
        break

# Cleanup
requests.delete(f"http://localhost:8000/api/v1/agents/{agent_id}", headers=headers)
