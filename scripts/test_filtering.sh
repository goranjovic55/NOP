#!/bin/bash
# Quick test script for traffic filtering

echo "=================================="
echo "PASSIVE DISCOVERY FILTERING TEST"
echo "=================================="
echo ""
echo "This will generate test traffic to verify filtering works:"
echo "  1. Unicast traffic (normal traffic)"
echo "  2. Multicast traffic (224.0.0.0/4)"
echo "  3. Broadcast traffic (255.255.255.255)"
echo ""
echo "Instructions:"
echo "  1. Disable 'Track Source IPs Only' in Settings > Discovery"
echo "  2. Enable/disable individual filters (Unicast/Multicast/Broadcast)"
echo "  3. Run this script: sudo python3 scripts/generate_test_traffic.py"
echo "  4. Check Assets page to see which IPs appear"
echo ""
echo "Expected results:"
echo "  - Filter enabled  = IP should NOT appear as discovered host"
echo "  - Filter disabled = IP SHOULD appear as discovered host"
echo ""
echo "Ready to run? Press Enter to start traffic generator..."
read

sudo python3 /workspaces/NOP/scripts/generate_test_traffic.py --type all --target 172.21.0.10 --network 172.21.0.255 --count 10

echo ""
echo "✓ Traffic generated!"
echo ""
echo "Check the Assets page now to see discovered hosts."
echo "Compare with your filter settings to verify filtering works."
