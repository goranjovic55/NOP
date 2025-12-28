# Exploit Page Screenshots

This directory contains visual documentation for the NOP Exploit Page feature.

## Screenshot Overview

### 1. exploit_page_targets.png
**Description**: The Targets tab showing exploitable assets discovered from network scans.

**Features shown**:
- Grid layout of asset cards
- Asset information (IP, hostname, OS, open ports)
- Service detection with visual icons
- Target selection interface
- Visual indicators for selected targets

**Usage**: This screenshot demonstrates how users can view and select vulnerable targets for exploitation.

---

### 2. exploit_page_builder.png
**Description**: The Builder tab for configuring and building exploit modules.

**Features shown**:
- Module information section (name, description)
- Payload configuration interface
- Payload type selector (Reverse Shell, Bind Shell, Meterpreter, Custom)
- Target service and port configuration
- Listener IP and port settings
- Real-time payload preview
- Build and Execute buttons

**Usage**: This screenshot shows the comprehensive exploit building interface where users can construct custom exploit modules.

---

### 3. exploit_page_console.png
**Description**: The Console tab with an active shell session.

**Features shown**:
- Multiple session tabs with status indicators
- Color-coded terminal output
  - Green [+] for success messages
  - Blue [*] for informational messages
  - Red [!] for warnings/errors
- Interactive command input
- Full command history
- Session management controls

**Usage**: This screenshot demonstrates the interactive shell console where users can execute commands on compromised systems.

---

## How to Use These Screenshots

These screenshots are referenced in:
- Main project README.md
- docs/EXPLOIT_PAGE_DOCUMENTATION.md
- Pull request descriptions
- User documentation

## Regenerating Screenshots

If you need to regenerate these screenshots (e.g., after UI changes):

```bash
python3 /tmp/generate_screenshots.py
```

Note: The generation script creates mockup images that represent the UI design. For actual screenshots of the running application, use the browser automation tools or manual screenshots.
