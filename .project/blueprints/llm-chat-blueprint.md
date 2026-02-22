# LLM Chat Integration Blueprint

## Overview
Built-in chat interface for NOP with MiniMax/OpenAI integration.

## API Endpoints

### Configuration
- GET /api/v1/llm/config
- PUT /api/v1/llm/config  
- POST /api/v1/llm/test

### Chat
- POST /api/v1/llm/chat
- GET /api/v1/llm/chat/{session_id}
- DELETE /api/v1/llm/chat/{session_id}

### Functions
- GET /api/v1/llm/context
- POST /api/v1/llm/execute-function

## Configuration Schema

Request:
{
  "provider": "minimax",
  "api_endpoint": "https://api.minimax.io/anthropic",
  "api_key": "sk-...",
  "model": "MiniMax-M2.5",
  "max_tokens": 4096,
  "temperature": 0.7,
  "available_functions": [
    "list_assets",
    "start_discovery",
    "add_route",
    "start_scan"
  ]
}

## Function Schemas

Functions for LLM:
- list_assets: Search network assets
- add_route: Add temporary routing rule
- start_scan: Launch vulnerability scan
- get_traffic_stats: Get traffic statistics

## Frontend Components

- ChatInterface.tsx - Main chat UI
- FunctionCallDisplay.tsx - Show API calls made
- LLMConfigPanel.tsx - Configuration UI

## Implementation Steps

1. Create LLM controller service
2. Add API endpoints
3. Create chat UI components
4. Implement function calling
5. Add context management
