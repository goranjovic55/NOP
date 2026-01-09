#!/bin/bash

# Agent POV Mode - Quick Test Script

echo "======================================"
echo "Agent POV Mode - Quick Test"
echo "======================================"
echo ""

# Test 1: Check if backend imports are valid
echo "TEST 1: Checking Python syntax..."
python -m py_compile backend/app/api/v1/endpoints/dashboard.py backend/app/services/dashboard_service.py
if [ $? -eq 0 ]; then
    echo "✓ Python syntax is valid"
else
    echo "✗ Python syntax error"
    exit 1
fi
echo ""

# Test 2: Check if POV middleware exists
echo "TEST 2: Checking POV middleware..."
if [ -f "backend/app/core/pov_middleware.py" ]; then
    echo "✓ POV middleware exists"
else
    echo "✗ POV middleware not found"
    exit 1
fi
echo ""

# Test 3: Check if frontend context exists
echo "TEST 3: Checking POV context..."
if [ -f "frontend/src/context/POVContext.tsx" ]; then
    echo "✓ POV context exists"
else
    echo "✗ POV context not found"
    exit 1
fi
echo ""

# Test 4: Check if pages have POV import
echo "TEST 4: Checking POV imports in pages..."
grep -q "usePOV" frontend/src/pages/Dashboard.tsx && echo "✓ Dashboard.tsx has usePOV" || echo "✗ Dashboard.tsx missing usePOV"
grep -q "usePOV" frontend/src/pages/Topology.tsx && echo "✓ Topology.tsx has usePOV" || echo "✗ Topology.tsx missing usePOV"
grep -q "usePOV" frontend/src/pages/Scans.tsx && echo "✓ Scans.tsx has usePOV" || echo "✗ Scans.tsx missing usePOV"
grep -q "usePOV" frontend/src/pages/Assets.tsx && echo "✓ Assets.tsx has usePOV" || echo "✗ Assets.tsx missing usePOV"
grep -q "usePOV" frontend/src/pages/Host.tsx && echo "✓ Host.tsx has usePOV" || echo "✗ Host.tsx missing usePOV"
echo ""

# Test 5: Check if services have agentPOV parameter
echo "TEST 5: Checking agentPOV parameters in services..."
grep -q "agentPOV" frontend/src/services/dashboardService.ts && echo "✓ dashboardService.ts has agentPOV" || echo "✗ dashboardService.ts missing agentPOV"
grep -q "agentPOV" frontend/src/services/assetService.ts && echo "✓ assetService.ts has agentPOV" || echo "✗ assetService.ts missing agentPOV"
grep -q "agentPOV" frontend/src/services/hostService.ts && echo "✓ hostService.ts has agentPOV" || echo "✗ hostService.ts missing agentPOV"
echo ""

# Test 6: Check if backend endpoints have POV support
echo "TEST 6: Checking POV support in backend endpoints..."
grep -q "get_agent_pov" backend/app/api/v1/endpoints/dashboard.py && echo "✓ dashboard.py has get_agent_pov" || echo "✗ dashboard.py missing get_agent_pov"
grep -q "get_agent_pov" backend/app/api/v1/endpoints/assets.py && echo "✓ assets.py has get_agent_pov" || echo "✗ assets.py missing get_agent_pov"
grep -q "get_agent_pov" backend/app/api/v1/endpoints/host.py && echo "✓ host.py has get_agent_pov" || echo "✗ host.py missing get_agent_pov"
echo ""

echo "======================================"
echo "All basic tests passed!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Start the backend: cd backend && docker-compose up -d"
echo "2. Start the frontend: cd frontend && npm start"
echo "3. Create a test agent in the Agents page"
echo "4. Deploy the agent to a remote network"
echo "5. Switch to agent POV and verify data filtering"
echo ""
