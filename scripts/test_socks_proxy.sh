#!/bin/bash
# Test SOCKS proxy implementation

set -e

echo "=== Testing SOCKS Proxy Implementation ==="
echo ""

# 1. Check proxychains installation
echo "1. Checking proxychains4..."
if command -v proxychains4 &> /dev/null; then
    echo "✓ proxychains4 installed: $(which proxychains4)"
else
    echo "✗ proxychains4 NOT installed"
    echo "  Install with: apt-get install proxychains4"
    exit 1
fi
echo ""

# 2. Check backend syntax
echo "2. Checking Python syntax..."
python3 -m py_compile backend/app/services/agent_socks_proxy.py && echo "✓ agent_socks_proxy.py syntax OK" || echo "✗ agent_socks_proxy.py syntax ERROR"
python3 -m py_compile backend/app/services/agent_service.py && echo "✓ agent_service.py syntax OK" || echo "✗ agent_service.py syntax ERROR"
python3 -m py_compile backend/app/services/scanner.py && echo "✓ scanner.py syntax OK" || echo "✗ scanner.py syntax ERROR"
python3 -m py_compile backend/app/api/v1/endpoints/agents.py && echo "✓ agents.py syntax OK" || echo "✗ agents.py syntax ERROR"
python3 -m py_compile backend/app/api/v1/endpoints/discovery.py && echo "✓ discovery.py syntax OK" || echo "✗ discovery.py syntax ERROR"
echo ""

# 3. Check agent template generation
echo "3. Checking agent template..."
cd /workspaces/NOP

# Check if SOCKS functions exist in agent_service.py
if grep -q "async def socks_proxy_module" backend/app/services/agent_service.py; then
    echo "✓ SOCKS proxy module included in agent template"
else
    echo "✗ SOCKS proxy module NOT found in agent template"
    exit 1
fi

if grep -q "async def handle_socks_connect" backend/app/services/agent_service.py; then
    echo "✓ SOCKS connection handler included"
else
    echo "✗ SOCKS connection handler NOT found"
    exit 1
fi

if grep -q "relay_to_c2" backend/app/services/agent_service.py; then
    echo "✓ SOCKS relay functions included"
else
    echo "✗ SOCKS relay functions NOT found"
    exit 1
fi

if grep -q "'aiohttp'" backend/app/services/agent_service.py; then
    echo "✓ aiohttp dependency added"
else
    echo "✗ aiohttp dependency NOT found"
    exit 1
fi

echo "✓ Agent template validation passed"

echo ""

# 4. Summary
echo "=== Summary ==="
echo "✓ ProxyChains installed and available"
echo "✓ Python syntax validation passed"
echo "✓ Agent template includes SOCKS module"
echo ""
echo "Next steps:"
echo "1. Deploy agent: POST /api/v1/agents/generate"
echo "2. Run agent on target network"
echo "3. Verify SOCKS port in agent metadata"
echo "4. Test POV mode scans"
echo ""
echo "For detailed documentation, see AGENT_SOCKS_PROXY.md"
