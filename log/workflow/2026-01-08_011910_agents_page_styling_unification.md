# Agents Page Styling Unification | 2026-01-08 | ~45min

## Summary
Unified the Agents page styling to match Access and Scans pages. Added hover effects, visible button outlines, Edit Template button, and unified modal colors/icons with cyberpunk theme.

## Files Modified
| File | Changes |
|------|---------|
| `frontend/src/pages/Agents.tsx` | Sidebar: compact p-3 padding, hover effects, 2x2/3x4 grids, visible button outlines, Edit button; Modal: unified red theme, cyberpunk icons |
| `.github/copilot-instructions.md` | Fixed script path to `.github/scripts/` |
| `.github/agents/akis.agent.md` | Fixed script path to `.github/scripts/` |

## Skills Used
- frontend-react/SKILL.md (for Agents.tsx styling)
- documentation/SKILL.md (for instruction files)

## Changes Detail

### Sidebar UX Improvements
- **Hover effects**: All sections now have `hover:border-cyber-red hover:bg-cyber-dark/80 transition-all`
- **Compact layout**: Changed `p-4` to `p-3`, `space-y-4` to `space-y-3`
- **Horizontal grids**: 
  - Status: `grid grid-cols-2` for Name/Status/Uptime/LastSeen
  - Modules: `grid grid-cols-4` for compact Asset/Traffic/Host/Access
  - Schedule: `grid grid-cols-2` for timing values
  - Security: `grid grid-cols-3` for Obfuscate/Persist/Startup
  - Actions: `grid grid-cols-3` for Edit/Download/Delete
  - Download: `grid grid-cols-2` for wget/curl buttons

### Button Visibility
- All clickable buttons: `border-2 border-cyber-gray` base outline
- Hover states: `hover:border-cyber-red/green/blue/purple` based on action
- Icons added: ◈ Edit, ▼ Download, ✕ Delete, ◎ Enter POV, ◉ Exit POV

### Edit Template Button
- New button in Actions section
- Populates Create Modal with template data
- Parses connection_url to set protocol/host/port fields

### Modal Unification
- Header: `◆ Create New Agent`
- Labels: `text-cyber-red font-bold` with icons (◆◈)
- Platform icons: Changed emoji (🐧🪟🍎) to cyberpunk (◆◇◈◉◊)
- Selection buttons: Unified red theme `border-cyber-red bg-cyber-red/20`
- Module checkboxes: White text with icons (◆◈◉⬡)
- Footer: `✕ Cancel` (red hover), `◆ Create Agent` (green hover)

### AKIS Path Fix
- Updated script paths from `scripts/` to `.github/scripts/`
