#!/bin/bash

# Login
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  --data-urlencode "username=admin" \
  --data-urlencode "password=admin" \
  | jq -r '.access_token')

echo "=== C2 Interfaces (no POV) ==="
curl -s "http://localhost:8000/api/v1/traffic/interfaces" \
  -H "Authorization: Bearer $TOKEN" | jq -c '.[] | {name, ip}'

echo -e "\n=== Agent POV Interfaces ==="
curl -s "http://localhost:8000/api/v1/traffic/interfaces" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-POV: 7b17de60-3e63-4951-831d-684cdfc9bd20" | jq -c '.[] | {name, ip}'
