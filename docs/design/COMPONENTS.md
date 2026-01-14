---
title: React Components
type: reference
category: design
auto_generated: true
last_updated: 2026-01-14
---

# React Components

## Overview

This document catalogs all React components in the frontend application.
Components are reusable UI elements used across pages.

## Components


### Common

| Component | File | Description |
|-----------|------|-------------|
| `AssetDetailsSidebar` | `frontend/src/components/AssetDetailsSidebar.tsx` | AssetDetailsSidebar |
| `ScanSettingsModal` | `frontend/src/components/ScanSettingsModal.tsx` | ScanSettingsModal |
| `CyberUI` | `frontend/src/components/CyberUI.tsx` | CyberCard, CyberPanel, CyberSectionHeader |
| `PacketCrafting` | `frontend/src/components/PacketCrafting.tsx` | COMMON_PORTS, PacketCrafting |
| `Layout` | `frontend/src/components/Layout.tsx` | Layout |
| `HostContextMenu` | `frontend/src/components/HostContextMenu.tsx` | HostContextMenu |
| `ProtocolConnection` | `frontend/src/components/ProtocolConnection.tsx` | ProtocolConnection |
| `ConnectionContextMenu` | `frontend/src/components/ConnectionContextMenu.tsx` | ConnectionContextMenu |


### Workflow

| Component | File | Description |
|-----------|------|-------------|
| `BlockNode` | `frontend/src/components/workflow/BlockNode.tsx` | Custom React Flow node with execution visualization (border glow, status text, hover tooltip) |
| `BlockDetailsPanel` | `frontend/src/components/workflow/BlockDetailsPanel.tsx` | Side panel for block execution details and output |
| `BlockPalette` | `frontend/src/components/workflow/BlockPalette.tsx` | Draggable block palette with categories |
| `ConfigPanel` | `frontend/src/components/workflow/ConfigPanel.tsx` | Node configuration panel with Run Single Block feature, input injection, and backend persistence |
| `DynamicDropdown` | `frontend/src/components/workflow/DynamicDropdown.tsx` | Dropdown with dynamic data from NOP (IPs, ports, credentials) |
| `ExecutionConsole` | `frontend/src/components/workflow/ExecutionConsole.tsx` | Real-time execution output with expandable rows |
| `ExecutionOverlay` | `frontend/src/components/workflow/ExecutionOverlay.tsx` | Execution status popup with progress, Reset Display button |
| `FlowTabs` | `frontend/src/components/workflow/FlowTabs.tsx` | Tab management for multiple workflow flows |
| `FlowTemplates` | `frontend/src/components/workflow/FlowTemplates.tsx` | UI Testing templates with shift+click selection |
| `WorkflowCanvas` | `frontend/src/components/workflow/WorkflowCanvas.tsx` | React Flow canvas with custom edge styling, Delete key support |
| `WorkflowExecutionTree` | `frontend/src/components/workflow/WorkflowExecutionTree.tsx` | Collapsible tree view of execution log |
| `WorkflowSidebar` | `frontend/src/components/workflow/WorkflowSidebar.tsx` | Block palette and templates sidebar |

