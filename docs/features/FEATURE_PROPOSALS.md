---
title: Feature Proposals
type: explanation
category: planning
last_updated: 2026-01-14
---

# Feature Proposals

Proposed enhancements for Network Observatory Platform.

## Proposed Features

### High Priority

- **Multi-Agent POV** - Aggregate data from multiple agents simultaneously
- **Agent Metrics Dashboard** - CPU, memory, bandwidth usage for deployed agents
- **Scheduled Scans** - Automated vulnerability scanning on schedule
- **Alert Routing** - Route alerts through specific agents to remote networks
- **Continuous Ping** - Live ping with real-time graphing
- **Traceroute Integration** - Visual path tracing with hop analysis

### Medium Priority

- **Agent Clustering** - Load balancing across multiple agents
- **Push Code Updates** - Remote agent software updates
- **Export Topology** - Export network diagrams as PNG/SVG
- **Historical Traffic Replay** - Replay captured traffic patterns
- **Batch Ping** - Ping multiple targets simultaneously
- **Custom Protocol Ping** - DNS, SMTP, FTP connectivity tests

### Low Priority

- **Agent Groups/Tags** - Organize agents by location/purpose
- **Saved Storm Profiles** - Reusable packet storm configurations
- **Advanced Payload Patterns** - Custom packet payload generation
- **Port Information in Tooltips** - Show open ports on topology nodes
- **Time-Series Traffic Graphs** - Historical traffic visualization
- **Anomaly Highlighting** - Automatic detection of unusual patterns

---

## Under Consideration

### Credential Vault Enhancement

**Status**: Proposed  
**Complexity**: Medium

Enhanced password manager for Access Hub with:
- Encrypted credential storage (AES-256)
- Quick access from sidebar
- One-click connection with saved credentials
- Password generation
- Credential sharing between users

**Use Case**: Quickly connect to frequently accessed hosts without re-entering credentials.

### Recent Access Widget

**Status**: Proposed  
**Complexity**: Low

Quick-access widget showing:
- Last 5 accessed hosts
- Connection type (SSH/RDP/VNC)
- Last access timestamp
- One-click reconnect

**Use Case**: Rapidly reconnect to recently used systems.

### Advanced Network Scanning

**Status**: Proposed  
**Complexity**: High

Extended scanning capabilities:
- Service version detection
- OS fingerprinting enhancement
- Custom NSE script integration
- Scheduled scan jobs
- Scan result comparison
- Export to industry formats (NIST, DISA STIG)

**Use Case**: Comprehensive security assessment and compliance reporting.

---

## Voting & Feedback

Submit feature requests and vote on proposals:
- **GitHub Issues**: Tag with `enhancement`
- **Discussions**: Feature request category
- **Priority**: Vote with 👍 on GitHub

---

## Implementation Criteria

Features are evaluated based on:
1. **User Value**: Solves real problems
2. **Complexity**: Development effort required
3. **Maintenance**: Long-term support burden
4. **Security**: No new vulnerabilities
5. **Performance**: Minimal impact on existing features

---

## Related Documentation

- [Implemented Features](IMPLEMENTED_FEATURES.md) - Current feature set
- [Roadmap](../development/ROADMAP.md) - Development timeline
- [Contributing](../development/CONTRIBUTING.md) - How to contribute

---

**Document Version**: 1.1  
**Last Updated**: 2026-01-05  
**Status**: Draft
