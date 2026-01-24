# Test System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Test Orchestration Layer                      │
│  ┌────────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ run-comprehensive  │  │ validate-test   │  │ NPM Scripts  │ │
│  │    -tests.sh       │  │   -hosts.sh     │  │   (package)  │ │
│  └─────────┬──────────┘  └────────┬─────────┘  └──────┬───────┘ │
└────────────┼────────────────────────┼────────────────────┼────────┘
             │                        │                    │
             ▼                        ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Playwright Test Suite                        │
│  ┌──────────────────────────────┐  ┌────────────────────────┐   │
│  │ comprehensive-live-hosts     │  │ live-connection-tests  │   │
│  │         .spec.ts             │  │      .spec.ts          │   │
│  │                              │  │                        │   │
│  │  • 17 Feature Tests          │  │  • 16 Connection Tests │   │
│  │  • Authentication            │  │  • SSH Forms           │   │
│  │  • Asset Discovery           │  │  • VNC Setup           │   │
│  │  • Credential Vault          │  │  • RDP Config          │   │
│  │  • Remote Access             │  │  • FTP Operations      │   │
│  │  • Network Scanning          │  │  • Performance         │   │
│  │  • Vulnerabilities           │  │  • Stability           │   │
│  │  • Traffic Analysis          │  │  • Workflows           │   │
│  │  • Workflow Execution        │  │  • Reports             │   │
│  │  • Agent Deployment          │  │                        │   │
│  │  • Dashboard                 │  │  + 1 Validation Test   │   │
│  │  • API Health                │  │                        │   │
│  └──────────────┬───────────────┘  └──────────┬─────────────┘   │
└─────────────────┼─────────────────────────────┼─────────────────┘
                  │                             │
                  └──────────┬──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NOP Platform (Docker)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Frontend   │  │   Backend    │  │  PostgreSQL + Redis  │  │
│  │ React/TypeScript│ │   FastAPI    │  │    Data Layer        │  │
│  │ localhost:12000 │ │localhost:12001│ │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
└─────────┼──────────────────┼────────────────────────────────────┘
          │                  │
          │                  │ API Calls
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Test Environment (test-network 172.21.0.0/16)      │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │  SSH Server    │  │  VNC Server    │  │  RDP Server    │   │
│  │ 172.21.0.10:22 │  │172.21.0.50:5900│  │172.21.0.60:3389│   │
│  │ Alpine + SSH   │  │ X11VNC + Xvfb  │  │ XRDP + XFCE    │   │
│  │ testuser:pass  │  │ password       │  │ rdpuser:rdp123 │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │  Web Server    │  │  FTP Server    │  │  MySQL Server  │   │
│  │ 172.21.0.20:80 │  │ 172.21.0.30:21 │  │172.21.0.40:3306│   │
│  │ Apache HTTP    │  │   vsftpd       │  │   MySQL 5.7    │   │
│  │     (HTML)     │  │ ftpuser:ftp123 │  │ dbuser:dbpass  │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐                        │
│  │  SMB Server    │  │ vsftpd Vuln    │                        │
│  │172.21.0.70:445 │  │ 172.21.0.25:21 │                        │
│  │     Samba      │  │ CVE-2011-2523  │                        │
│  │ smbuser:smb123 │  │   Backdoor     │                        │
│  └────────────────┘  └────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Test Flow:
==========

1. Orchestration Script Starts:
   • Start NOP platform (docker compose up -d)
   • Start test environment (cd test-environment && docker compose up -d)
   • Wait for health checks
   • Validate all hosts reachable

2. Playwright Tests Execute:
   • Login to NOP (http://localhost:12000)
   • Navigate through all pages
   • Test each feature against live hosts
   • Verify connections to SSH, VNC, RDP, FTP
   • Execute workflows
   • Monitor traffic
   • Scan for vulnerabilities
   • Capture screenshots at each step

3. Validation:
   • All tests pass ✓
   • Screenshots saved ✓
   • HTML report generated ✓
   • Metrics collected ✓

4. Cleanup:
   • Services keep running for manual testing
   • Or stop with: docker compose down

Test Coverage Matrix:
====================

Feature                     | Unit | Integration | E2E | Manual
----------------------------|------|-------------|-----|--------
Authentication              | ✅   | ✅          | ✅  | ✅
Asset Discovery             | ⚠️   | ✅          | ✅  | ✅
Credential Vault            | ✅   | ✅          | ✅  | ✅
SSH Access                  | ⚠️   | ✅          | ✅  | ✅
VNC Access                  | ⚠️   | ⚠️          | ✅  | ✅
RDP Access                  | ⚠️   | ⚠️          | ✅  | ✅
FTP Access                  | ⚠️   | ⚠️          | ✅  | ✅
Network Scanning            | ⚠️   | ✅          | ✅  | ✅
Vulnerability Scanning      | ⚠️   | ⚠️          | ✅  | ✅
Traffic Analysis            | ⚠️   | ⚠️          | ✅  | ✅
Workflow Execution          | ✅   | ✅          | ✅  | ✅
Agent Management            | ⚠️   | ⚠️          | ✅  | ✅
Dashboard/Reporting         | ⚠️   | ⚠️          | ✅  | ✅

Legend: ✅ Complete | ⚠️ Partial | ❌ Missing

Key Benefits:
=============

1. Real Testing - Not mocks, actual network services
2. Complete Coverage - All major features validated
3. Easy Execution - Single command to run everything
4. Visual Proof - Screenshots for every test
5. CI/CD Ready - Can integrate into pipelines
6. Well Documented - 3 comprehensive docs
7. Maintainable - Clear structure and patterns

Commands Quick Reference:
========================

# Run everything
./run-comprehensive-tests.sh

# Validate hosts
./validate-test-hosts.sh

# Run specific tests
npm run test:comprehensive
npm run test:connections

# View report
npm run test:report

# Debug mode
npm run test:ui

# Manual testing
docker compose up -d
cd test-environment && docker compose up -d
# Open: http://localhost:12000
# Login: admin / admin123
```
