#!/bin/bash
echo "=== AKIS Monitor Extension Testing ==="
echo ""

echo "1. Checking extension installation..."
if code --list-extensions | grep -q "nop-team.akis-monitor"; then
    echo "✓ Extension installed"
    code --list-extensions --show-versions | grep akis
else
    echo "✗ Extension not found"
    exit 1
fi

echo ""
echo "2. Checking required files..."
files=(
    ".akis-session.json"
    "project_knowledge.json"
    "log/workflow"
)

for file in "${files[@]}"; do
    if [ -e "$file" ]; then
        echo "✓ $file exists"
    else
        echo "⚠ $file missing (will be created during session)"
    fi
done

echo ""
echo "3. Testing session file reading..."
if [ -f ".akis-session.json" ]; then
    echo "Session file content:"
    cat .akis-session.json | jq '.' 2>/dev/null || cat .akis-session.json
else
    echo "⚠ No active session file"
fi

echo ""
echo "4. Checking knowledge file..."
if [ -f "project_knowledge.json" ]; then
    echo "Knowledge entries: $(grep -c '^{' project_knowledge.json)"
    echo "Sample entry:"
    head -3 project_knowledge.json
else
    echo "⚠ No knowledge file"
fi

echo ""
echo "5. Checking workflow logs..."
if [ -d "log/workflow" ]; then
    echo "Workflow files: $(ls -1 log/workflow/*.md 2>/dev/null | wc -l)"
    echo "Latest:"
    ls -1t log/workflow/*.md 2>/dev/null | head -1
else
    echo "⚠ No workflow directory"
fi

echo ""
echo "6. Extension views should be visible in Activity Bar:"
echo "   - Live Session"
echo "   - Historical Diagram"
echo "   - Knowledge Graph"
echo ""
echo "Manual checks needed:"
echo "   □ Icon visible in Activity Bar"
echo "   □ Click icon opens AKIS Monitor panel"
echo "   □ Live Session view loads"
echo "   □ Historical Diagram renders"
echo "   □ Knowledge Graph displays"
echo "   □ Refresh buttons work"
echo ""
echo "=== Test Complete ==="
