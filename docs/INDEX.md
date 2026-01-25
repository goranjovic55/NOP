---
title: NOP Documentation Index
type: index
last_updated: 2026-01-14
---

# NOP Documentation

Welcome to the Network Observatory Platform documentation. This documentation follows the [Diátaxis framework](https://diataxis.fr/) for clear, user-oriented organization.

**Quick Links:** [Getting Started](#tutorials) | [How-To Guides](#guides) | [API Reference](#reference) | [Architecture](#explanation)

---

## 📚 Documentation Structure

| Section | Purpose | Audience |
|---------|---------|----------|
| [**Tutorials**](#tutorials) | Learn NOP step-by-step | New users |
| [**Guides**](#guides) | Accomplish specific tasks | All users |
| [**Reference**](#reference) | Look up technical details | Developers |
| [**Explanation**](#explanation) | Understand concepts | Architects |
| [**Contributing**](#contributing) | Join development | Contributors |
| [**Analysis**](#analysis) | Project reports | Maintainers |

---

## Tutorials

> **Learning-oriented** - Start here if you're new to NOP

| Tutorial | Description | Time |
|----------|-------------|------|
| [Quick Start Guide](guides/QUICK_START.md) | Get NOP running in 10 minutes | 10 min |

---

## Guides

> **Task-oriented** - Step-by-step instructions for specific tasks

### Deployment & Setup

| Guide | Description |
|-------|-------------|
| [Deployment Guide](guides/DEPLOYMENT.md) ⭐ | Production deployment with Docker |
| [Configuration Reference](guides/CONFIGURATION.md) | Environment variables and settings |
| [Test Environment Setup](guides/SETUP-COMPLETE.md) | Set up test targets |

### Agent & C2 Testing

| Guide | Description |
|-------|-------------|
| [Agent Testing Guide](guides/AGENT-TESTING-GUIDE.md) | Test agent deployment and C2 |
| [Agent POV Testing](guides/AGENT-POV-TESTING.md) | Test POV switching functionality |
| [SOCKS Relay Testing](guides/SOCKS_TESTING_GUIDE.md) | Test SOCKS proxy tunneling |

---

## Reference

> **Information-oriented** - Technical specifications and API details

### API Reference

| Document | Description |
|----------|-------------|
| [REST API v1](technical/API_rest_v1.md) ⭐ | Complete REST API specification |
| [Backend Services](technical/SERVICES.md) | Service layer documentation |

### Architecture Reference

| Document | Description |
|----------|-------------|
| [System Architecture](architecture/ARCH_system_v1.md) ⭐ | Full system design |
| [State Management](architecture/STATE_MANAGEMENT.md) | Frontend state patterns |
| [Agent C2 Architecture](architecture/agent-c2-architecture.md) | Agent/C2 system design |

### Technical Specifications

| Document | Description |
|----------|-------------|
| [Broadcast Filter Testing](technical/BROADCAST_FILTER_TESTING.md) | Filter configuration specs |
| [SOCKS Integration](technical/SOCKS_INTEGRATION_COMPLETE.md) | SOCKS proxy implementation |
| [SOCKS E2E Results](technical/SOCKS_E2E_TEST_RESULTS.md) | End-to-end test results |
| [Stress Test Framework](technical/STRESS_TEST_FRAMEWORK.md) | Performance testing |

---

## Explanation

> **Understanding-oriented** - Concepts, architecture decisions, and design rationale

### Concepts

| Document | Description |
|----------|-------------|
| [Agent & C2 System](features/AGENTS_C2.md) | How agents and C2 work |
| [Storm Feature](features/STORM_FEATURE.md) | Traffic generation engine |
| [Granular Traffic Filtering](features/GRANULAR_TRAFFIC_FILTERING.md) | Filter system explained |
| [Live Traffic Topology](features/live-traffic-topology.md) | Real-time visualization |
| [Deep Packet Inspection](features/deep-packet-inspection.md) ⭐ | DPI for L7 protocol analysis |
| [Implemented Features](features/IMPLEMENTED_FEATURES.md) | Complete feature list |
| [Feature Proposals](features/FEATURE_PROPOSALS.md) | Planned enhancements |

### Design

| Document | Description |
|----------|-------------|
| [React Components](design/COMPONENTS.md) | Frontend component library |
| [UI/UX Specification](design/UI_UX_SPEC.md) | Interface design patterns |
| [Unified Style Guide](design/UNIFIED_STYLE_GUIDE.md) | Visual design system |

---

## Contributing

> **For developers** - Join the NOP development community

| Document | Description |
|----------|-------------|
| [Contributing Guide](development/CONTRIBUTING.md) ⭐ | How to contribute |
| [Development Roadmap](development/ROADMAP.md) | Project direction |
| [Testing Guide](development/TESTING.md) | Writing and running tests |
| [Scripts Reference](development/SCRIPTS.md) | Automation scripts |
| [Agent Improvements Roadmap](development/agent-improvements-roadmap.md) | Agent system plans |

### Implementation References

| Document | Description |
|----------|-------------|
| [Execution Tree Integration](development/EXECUTION_TREE_INTEGRATION.md) | Workflow execution UI |
| [Execution Tree Quick Reference](development/EXECUTION_TREE_QUICK_REFERENCE.md) | Quick lookup |
| [Implementation Summary](development/IMPLEMENTATION_SUMMARY.md) | Recent implementations |

---

## Analysis

> **Project-specific** - Analysis reports and metrics (AKIS framework)

### Framework Analysis

| Document | Description | Status |
|----------|-------------|--------|
| [AKIS Comprehensive Analysis](analysis/AKIS_COMPREHENSIVE_ANALYSIS_100K.md) ⭐ | Full metrics analysis | Final |
| [AKIS v7 Framework Audit](analysis/AKIS_V7_FRAMEWORK_AUDIT.md) | Before/after metrics | Final |
| [100k Simulation Results](analysis/SIMULATION_100K_RESULTS.md) | Comprehensive simulation | Final |
| [AKIS Compliance Audit](analysis/AKIS_COMPLIANCE_AUDIT_100K.md) | Compliance metrics | Final |
| [Custom Agent 100k Simulation](analysis/CUSTOM_AGENT_100K_SIMULATION_REPORT.md) | Agent delegation tests | Final |
| [Knowledge System Analysis](analysis/KNOWLEDGE_ANALYSIS.md) | Knowledge graph analysis | Final |

### Implementation Analysis

| Document | Description | Status |
|----------|-------------|--------|
| [Agent Ecosystem Analysis](analysis/AGENT_ECOSYSTEM_ANALYSIS.md) | Agent capabilities | Final |
| [Agent Architecture Gap](analysis/AGENT_ARCHITECTURE_GAP_ANALYSIS.md) | Gap analysis | Final |
| [Agent POV Implementation](analysis/AGENT_POV_IMPLEMENTATION.md) | POV system | Final |
| [Agent SOCKS Proxy](analysis/AGENT_SOCKS_PROXY.md) | SOCKS implementation | Final |
| [Agent Parallelism Best Practices](analysis/AGENT_PARALLELISM_BEST_PRACTICES.md) | Concurrency patterns | Final |
| [SOCKS Implementation Summary](analysis/SOCKS_IMPLEMENTATION_SUMMARY.md) | Implementation details | Final |

### Status Reports

| Document | Description | Status |
|----------|-------------|--------|
| [Production Ready](analysis/PRODUCTION_READY.md) | Production status | Final |
| [POV Mode Status](analysis/POV_MODE_STATUS.md) | POV implementation | Final |
| [POV SOCKS Usage](analysis/POV_SOCKS_USAGE.md) | SOCKS + POV | Final |
| [POV Verification](analysis/POV_VERIFICATION_USER_CONFIRMATION_REQUIRED.md) | Verification status | Final |
| [Bug Fix Summary](analysis/BUG_FIX_SUMMARY.md) | Bug fixes | Final |
| [Ecosystem Measurements](analysis/ECOSYSTEM_MEASUREMENTS.md) | System metrics | Final |
| [Audit-Optimize Analysis](analysis/audit-optimize-analysis.md) | Optimization | Final |
| [Analysis README](analysis/README.md) | Analysis overview | - |

---

## Archive

> **Historical** - Superseded documentation preserved for reference

See the [Archive Index](archive/INDEX.md) for historical documentation from completed implementation phases.

---

## Documentation Templates

For contributors creating new documentation, use the templates in [`.github/templates/`](../.github/templates/README.md):

| Template | Use For | Target Location |
|----------|---------|-----------------|
| [doc_tutorial.md](../.github/templates/doc_tutorial.md) | Step-by-step learning guides | `docs/guides/` |
| [doc_guide.md](../.github/templates/doc_guide.md) | Task-oriented how-to docs | `docs/guides/` |
| [doc_reference.md](../.github/templates/doc_reference.md) | API and config references | `docs/technical/` |
| [doc_explanation.md](../.github/templates/doc_explanation.md) | Concept explanations | `docs/architecture/`, `docs/features/` |
| [doc_analysis.md](../.github/templates/doc_analysis.md) | Analysis reports | `docs/analysis/` |

---

## Finding What You Need

| If you want to... | Go to |
|-------------------|-------|
| Get started with NOP | [Quick Start](guides/QUICK_START.md) |
| Deploy to production | [Deployment Guide](guides/DEPLOYMENT.md) |
| Learn about the API | [API Reference](technical/API_rest_v1.md) |
| Understand the architecture | [System Architecture](architecture/ARCH_system_v1.md) |
| Contribute code | [Contributing Guide](development/CONTRIBUTING.md) |
| Find historical docs | [Archive](archive/INDEX.md) |

---

## Document Standards

All NOP documentation follows:

1. **[Diátaxis Framework](https://diataxis.fr/)** - Four types of documentation
2. **[Google Developer Documentation Style Guide](https://developers.google.com/style)** - Writing style
3. **YAML Frontmatter** - Metadata for each document
4. **Templates** - Consistent structure using `.github/templates/doc_*.md`

---

**Documentation Version:** 3.0  
**Last Updated:** 2026-01-14  
**Total Active Documents:** 56  
**Status:** Production

