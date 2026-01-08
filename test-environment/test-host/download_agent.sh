#!/bin/bash
# Download and start agent from NOP backend

# Configuration
BACKEND_URL="${BACKEND_URL:-http://172.28.0.1:8000}"
DOWNLOAD_TOKEN="${DOWNLOAD_TOKEN:-}"
AGENT_FILE="/opt/agent/downloaded_agent.py"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== NOP Agent Downloader ===${NC}"
echo "Backend URL: $BACKEND_URL"
echo "Download Token: $DOWNLOAD_TOKEN"
echo ""

if [ -z "$DOWNLOAD_TOKEN" ]; then
    echo -e "${RED}Error: DOWNLOAD_TOKEN environment variable not set${NC}"
    echo "Usage: DOWNLOAD_TOKEN=<token> BACKEND_URL=<url> $0"
    exit 1
fi

# Download agent
echo -e "${YELLOW}Downloading agent...${NC}"
DOWNLOAD_URL="${BACKEND_URL}/api/v1/agents/download/${DOWNLOAD_TOKEN}"
echo "URL: $DOWNLOAD_URL"

if curl -f -o "$AGENT_FILE" "$DOWNLOAD_URL"; then
    echo -e "${GREEN}✓ Agent downloaded successfully${NC}"
    chmod +x "$AGENT_FILE"
    
    # Show agent info
    echo ""
    echo -e "${YELLOW}Agent Information:${NC}"
    head -n 20 "$AGENT_FILE" | grep -E "^#|Generated:|Type:|AGENT_ID|AGENT_NAME"
    
    echo ""
    echo -e "${GREEN}Agent ready to run: $AGENT_FILE${NC}"
    echo "To start: python3 $AGENT_FILE"
    
else
    echo -e "${RED}✗ Failed to download agent${NC}"
    exit 1
fi
