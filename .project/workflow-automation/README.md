# NOP Workflow Automation Blueprints

> **Project**: Network Operations Platform - Scripts/Workflow Automation Page Redesign  
> **Status**: Draft for Team Review  
> **Created**: 2026-01-10  
> **Author**: Architecture Team

## Overview

These blueprints define the complete architecture for transforming NOP's Scripts page into a visual workflow automation builder, similar to n8n or Node-RED. The system enables users to create, configure, and execute network operations workflows using a drag-and-drop interface.

## Blueprint Documents

| Document | Description | Audience |
|----------|-------------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | High-level system design, data flow, component layers | All team members |
| [BLOCKS.md](./BLOCKS.md) | Complete catalog of 28+ workflow blocks with API mappings | Frontend, Backend |
| [EXECUTION.md](./EXECUTION.md) | DAG execution engine, parallel processing, error handling | Backend |
| [UI_COMPONENTS.md](./UI_COMPONENTS.md) | React component hierarchy, React Flow configuration | Frontend |
| [DATA_MODELS.md](./DATA_MODELS.md) | TypeScript interfaces, Pydantic schemas, SQLAlchemy models | Full-stack |
| [PHASES.md](./PHASES.md) | 10-week implementation plan with sprint breakdowns | PM, All team |

## Quick Links

### For Backend Developers
- [Execution Engine Design](./EXECUTION.md)
- [API Endpoints](./ARCHITECTURE.md#backend-api-endpoints)
- [Pydantic Schemas](./DATA_MODELS.md#backend-pythonpydantic-schemas)
- [SQLAlchemy Models](./DATA_MODELS.md#sqlalchemy-models)

### For Frontend Developers
- [Component Hierarchy](./UI_COMPONENTS.md)
- [React Flow Configuration](./UI_COMPONENTS.md#react-flow-canvas-configuration)
- [Zustand Store](./DATA_MODELS.md#zustand-store-schema)
- [TypeScript Interfaces](./DATA_MODELS.md#frontend-typescript-interfaces)

### For Project Managers
- [Phase Timeline](./PHASES.md)
- [Risk Assessment](./PHASES.md#risk-assessment)
- [Success Metrics](./PHASES.md#success-metrics)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canvas Library | React Flow (xyflow) | Industry standard, excellent DX, MIT licensed |
| State Management | Zustand | Simpler than Redux, works well with React Flow |
| Execution Model | DAG (Directed Acyclic Graph) | Prevents infinite loops, enables parallel execution |
| Expression Syntax | Mustache (`{{ }}`) | Simple, familiar, easy to implement |
| Real-time Updates | WebSocket | Low latency, bi-directional communication |

## Technology Stack

```
Frontend:
├── React 18+
├── React Flow (@xyflow/react) 12+
├── Zustand 4+
├── TypeScript 5+
└── Tailwind CSS 3+

Backend:
├── FastAPI
├── SQLAlchemy (async)
├── PostgreSQL
├── WebSockets
└── Python 3.11+
```

## Block Categories

| Category | Blocks | Color |
|----------|--------|-------|
| Connection | SSH, RDP, VNC, FTP, TCP Test | Blue `#3B82F6` |
| Command | SSH Execute, System Info, FTP ops | Green `#10B981` |
| Traffic | Capture, Stats, Ping, Storm | Purple `#8B5CF6` |
| Scanning | Version Detect, Port Scan | Amber `#F59E0B` |
| Agent | Generate, Deploy, Terminate | Red `#EF4444` |
| Control | Delay, Condition, Loop, Parallel, Variables | Gray `#6B7280` |

## Review Checklist

Before implementation begins, confirm:

- [ ] All block definitions reviewed and approved
- [ ] API mappings verified against existing endpoints
- [ ] Data models reviewed by backend team
- [ ] UI components reviewed by frontend team
- [ ] Phase timeline accepted by PM
- [ ] Security considerations addressed
- [ ] Performance requirements understood

## Questions for Review

1. **Block Priority**: Should we prioritize certain block types for Phase 3?
2. **Credential Integration**: Use existing credential store or build new?
3. **Execution History**: How long should we retain execution logs?
4. **Parallel Limits**: Default max concurrent executions per workflow?
5. **Template Library**: Include pre-built templates at launch?

## Feedback

Please add comments and feedback to this directory or discuss in the #nop-workflow channel.

---

*These blueprints are living documents and will be updated based on team feedback and implementation discoveries.*
