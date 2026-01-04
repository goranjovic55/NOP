# Agent/C2 Page - Screenshot Gallery

This document contains all the screenshots of the Agent/C2 page implementation.

## Overview

The Agent/C2 page provides a Command & Control interface for deploying and managing headless NOP agents on remote networks, with Point of View (POV) switching capabilities.

---

## Screenshots

### 1. Agents Page - Empty State

![Empty State](https://github.com/user-attachments/assets/86089662-fd64-4ad7-978b-204f3319f063)

**Description:**
- Clean empty state with centered call-to-action
- Large circular icon (◎) 
- "NO AGENTS DEPLOYED" heading
- Descriptive text: "Create your first agent to start remote network operations"
- Prominent "+ CREATE AGENT" button

**Use Case:** First-time user experience when no agents have been created yet.

---

### 2. Agents Page - Agent List View

![Agent List](https://github.com/user-attachments/assets/ce3aad74-c435-41e2-b0db-cdc6c3918a53)

**Description:**
- Grid layout showing 3 agent cards
- Each card displays:
  - **Agent icon** (🐍 for Python, ⚙ for C, position varies for type)
  - **Status indicator** (green dot = online, gray dot = offline) in top-right corner
  - **Agent name** in red with uppercase styling
  - **Description** in gray below name
  - **Details section** with Type, Status, Last Seen timestamp
  - **Capabilities badges** (color-coded: blue=Assets, purple=Traffic, green=Scans, yellow=Access)
  - **Action buttons** (Download, Switch POV, Delete)

**Agents Shown:**
1. **Remote Office Alpha** (Python, ONLINE)
   - Capabilities: Assets, Traffic, Scans
   - Description: "Monitoring remote branch"
   
2. **Datacenter Monitor** (C Binary, ONLINE)
   - Capabilities: Assets, Traffic, Scans, Access
   - Description: "Production DC monitoring"
   
3. **Branch Office B** (Python, OFFLINE)
   - Capabilities: Assets, Scans
   - No description

**Visual Elements:**
- Dark background (#0a0a0a)
- Card borders (#2a2a2a) with hover effects
- Status dots with glow effects for online agents
- Color-coded capability badges matching NOP theme

---

### 3. Create Agent Modal

![Create Modal](https://github.com/user-attachments/assets/7959438a-0572-4c25-aa5f-1ef02fefceb2)

**Description:**
- Full-screen modal overlay with dark background
- Red border around modal (#ff0040)
- Sticky header: "CREATE NEW AGENT" with close button (×)
- Scrollable content area with all configuration options

**Form Fields:**

1. **Agent Name** (required)
   - Text input with example: "Remote Office Alpha"
   - Gray border turning red on focus

2. **Description** (optional)
   - Textarea: "Monitoring remote branch office network"

3. **Agent Type** (required)
   - Three large button options:
     - **Python** (selected - red background, white text) 🐍
     - **C** (unselected - gray border) ⚙
     - **ASM** (unselected - gray border) ⚡

4. **Connection URL** (required)
   - Monospace input showing WebSocket URL
   - `ws://localhost:12001/api/v1/agents/{agent_id}/connect`

5. **Capabilities**
   - Checkbox list with colored labels:
     - ☑ **ASSET DISCOVERY** (blue - checked)
     - ☑ **TRAFFIC MONITORING** (purple - checked)
     - ☑ **SECURITY SCANNING** (green - checked - partially visible)
     - ☐ **REMOTE ACCESS** (yellow - unchecked - not fully visible in screenshot)

**Footer:**
- Cancel button (gray)
- Create Agent button (red with glow)

**UI Notes:**
- Modal is scrollable for all content
- All inputs follow cyberpunk theme
- Clear visual hierarchy with section labels

---

### 4. Agent POV - Dashboard View

![Agent POV Dashboard](https://github.com/user-attachments/assets/a9e5f75f-5df7-4451-960e-8a5f48cb818b)

**Description:**
This screenshot demonstrates the Point of View (POV) feature - viewing the NOP dashboard from the perspective of the "Remote Office Alpha" agent.

**Purple Banner (Top):**
- Background: Purple (#8b5cf6)
- Green pulsing dot + "AGENT POV ACTIVE: REMOTE OFFICE ALPHA"
- Description: "All data is now streamed from this agent's perspective"
- White "EXIT POV" button on right

**Header:**
- Title: "NOP - **REMOTE OFFICE ALPHA**" (agent name in purple)
- Status indicators:
  - Purple pulsing dot: "AGENT POV ACTIVE"
  - Green pulsing dot: "SYSTEM ONLINE"
  - Time: 14:32:15

**Statistics Cards (4 cards):**
- **Total Assets**: 24 (from agent's subnet)
- **Online Assets**: 18
- **Active Scans**: 2
- **Active Connections**: 0

All stats display data **from the agent's perspective** (192.168.50.x subnet), not the main NOP system.

**Content Grid:**

**Left Panel - Network Traffic:**
- Title: "NETWORK TRAFFIC"
- Subtitle: "Data from Remote Office Alpha"
- Placeholder: "[Traffic chart - Data from 192.168.50.x subnet]"

**Right Panel - Asset Distribution:**
- Title: "ASSET DISTRIBUTION"
- Subtitle: "Devices in 192.168.50.x"
- Asset counts:
  - 🖥️ Workstations: 15
  - 🖨️ Printers: 3
  - 📱 Mobile: 4
  - ❓ Unknown: 2

**Recent Events (Full Width):**
- Title: "RECENT EVENTS"
- Subtitle: "From Remote Office Alpha"
- Event list showing activities from the agent:
  - 14:30:15 - Asset discovered: 192.168.50.25 (PC-SALES-03)
  - 14:28:42 - Scan completed: 192.168.50.0/24 (0 vulnerabilities)
  - 14:25:18 - Traffic spike detected on interface eth0
  - 14:20:33 - Asset went offline: 192.168.50.100
  - 14:15:22 - New device detected: 192.168.50.150 (Unknown)

**Key POV Concept:**
- When POV is active, **ALL pages** (Dashboard, Assets, Traffic, Scans, etc.) show data from the selected agent
- The agent is deployed on a different subnet (192.168.50.x) than the main NOP system
- All processing happens on main NOP - agent just streams raw data
- User can exit POV at any time to return to main system view

---

## Color Legend

| Color | Hex | Usage |
|-------|-----|-------|
| Cyber Red | #ff0040 | Primary headings, errors, delete buttons, main branding |
| Cyber Purple | #8b5cf6 | Agent POV indicators, Traffic capability badge |
| Cyber Green | #00ff88 | Online status, success, Scans capability badge |
| Cyber Blue | #00d4ff | Info elements, Assets capability badge |
| Cyber Yellow | #ffff00 | Warnings, Access capability badge |
| Dark Background | #0a0a0a | Page background |
| Card Background | #111111 | Card/modal backgrounds |
| Border Gray | #2a2a2a | Borders and dividers |
| Text Gray | #3a3a3a | Secondary text |

---

## Status Indicators

| Indicator | Color | Meaning |
|-----------|-------|---------|
| ● Green dot | #00ff88 | Agent is online and connected |
| ● Gray dot | #2a2a2a | Agent is offline |
| ● Yellow dot | #ffff00 | Agent is disconnected (temporary) |
| ● Red dot | #ff0040 | Agent has an error |
| ● Purple pulsing dot | #8b5cf6 | Agent POV is currently active |

---

## Typography

- **Font Family**: JetBrains Mono (monospace)
- **Headings**: Uppercase, bold, letter-spacing increased
- **Status Text**: Uppercase, medium weight
- **Code/URLs**: Monospace, smaller font size
- **All text**: Slight letter-spacing (0.025em) for cyberpunk aesthetic

---

## Interactive Elements

### Buttons
- **Primary (Create Agent)**: Red background, white text, glow effect
- **Secondary (Download, Switch POV)**: Border only, colored text, hover fills
- **Danger (Delete)**: Red border, red text, hover fills red
- **Cancel**: Gray border, gray text

### Cards
- **Default**: Dark background, gray border
- **Hover**: Border changes to blue, slight elevation
- **Active (POV)**: Purple border, shadow glow

### Inputs
- **Default**: Black background, gray border
- **Focus**: Border changes to red, box shadow glow
- **Placeholder**: Italic, dark gray text

---

## Responsive Design

The implementation uses CSS Grid for responsive layouts:
- **3 columns** on large screens (>1024px)
- **2 columns** on medium screens (768-1024px)
- **1 column** on small screens (<768px)

Cards maintain their aspect ratio and content visibility across all breakpoints.

---

## Use Case Examples

### Example 1: Monitor Remote Office
1. Create agent "Remote Office Alpha" (Python)
2. Download generated script
3. Deploy to machine in remote subnet (192.168.50.10)
4. Agent connects back, shows ONLINE status
5. Click "Switch POV"
6. View Dashboard - see stats from 192.168.50.x subnet
7. Navigate to Assets - see devices in remote office
8. Exit POV to return to main view

### Example 2: Datacenter Monitoring
1. Create agent "Datacenter Monitor" (C Binary)
2. Enable all capabilities (Assets, Traffic, Scans, Access)
3. Compile and deploy to datacenter
4. Monitor production environment remotely
5. Switch POV to view datacenter perspective
6. Run scans from datacenter location

### Example 3: Multi-Site Deployment
1. Create multiple agents for different locations
2. Each agent monitors its local subnet
3. Sidebar badge shows count of online agents
4. Switch between agent POVs to view different subnets
5. Main NOP instance aggregates all data
6. No VPN needed - agents connect over internet

---

## Technical Implementation

### Frontend Components
- **Agents.tsx**: Main page with agent grid and modal
- **agentStore.ts**: Zustand state management
- **agentService.ts**: API client
- **Layout.tsx**: Navigation integration + POV header

### Backend Endpoints
- `GET /api/v1/agents/` - List all agents
- `POST /api/v1/agents/` - Create agent
- `POST /api/v1/agents/{id}/generate` - Download agent code
- `WS /api/v1/agents/{id}/connect` - Agent WebSocket connection

### Generated Agents
- **Python**: Full WebSocket client with asyncio
- **C**: Stub code ready for libwebsockets
- **ASM**: x86_64 assembly stub

---

## Documentation References

- **Complete Documentation**: `docs/AGENT_C2_PAGE_DOCUMENTATION.md`
- **Visual Mockups**: `docs/AGENT_C2_VISUAL_MOCKUPS.md`
- **Implementation Summary**: `docs/IMPLEMENTATION_SUMMARY_AGENTS.md`

---

## Commit History

- **3b2fc54**: Initial implementation (backend + frontend)
- **57789b4**: Comprehensive documentation
- **9af1750**: Implementation summary

---

*Screenshots generated: 2025-12-28*
*NOP Version: Agent/C2 Feature Branch*
