# Comprehensive Test Suite Documentation

## Overview

This comprehensive test suite validates all NOP features against live test hosts in a controlled test network environment. The suite ensures that every feature works correctly with real network services, not just mocks or simulations.

## Test Environment

### Network Configuration
- **Test Network**: `172.21.0.0/16`
- **Gateway**: `172.21.0.1`
- **Isolated Environment**: Tests run in Docker network `test-network`

### Test Hosts

| Service | IP Address | Port | Username | Password | Description |
|---------|-----------|------|----------|----------|-------------|
| SSH Server | 172.21.0.10 | 22 | testuser | testpass123 | Alpine Linux with OpenSSH |
| SSH Server | 172.21.0.10 | 22 | admin | admin123 | Admin user with elevated privileges |
| Web Server | 172.21.0.20 | 80 | - | - | Apache HTTP server |
| FTP Server | 172.21.0.30 | 21 | ftpuser | ftp123 | vsftpd server |
| MySQL DB | 172.21.0.40 | 3306 | dbuser | dbpass123 | MySQL 5.7 database |
| VNC Server | 172.21.0.50 | 5900 | - | password | X11VNC with Xvfb |
| RDP Server | 172.21.0.60 | 3389 | rdpuser | rdp123 | XRDP with XFCE desktop |
| SMB Server | 172.21.0.70 | 445 | smbuser | smbpass123 | Samba file server |

### Vulnerable Test Targets

| Service | IP Address | Vulnerability | CVE |
|---------|-----------|---------------|-----|
| vsftpd | 172.21.0.25 | Backdoor | CVE-2011-2523 |

## Test Suites

### 1. Comprehensive Live Hosts Test (`comprehensive-live-hosts.spec.ts`)

**Purpose**: Validate all major NOP features against live test hosts

**Test Coverage**:
- ✅ Authentication and session management
- ✅ Asset discovery against test network
- ✅ Credential vault management
- ✅ SSH access to test server
- ✅ VNC connection setup
- ✅ RDP connection setup
- ✅ FTP operations
- ✅ Web server interaction
- ✅ Database connectivity
- ✅ Network scanning (172.21.0.0/24)
- ✅ Vulnerability scanning
- ✅ Traffic analysis
- ✅ Workflow execution with real hosts
- ✅ Agent deployment and monitoring
- ✅ Dashboard overview
- ✅ API health checks
- ✅ Full end-to-end integration

**Total Tests**: 17 tests + environment validation

### 2. Live Connection Tests (`live-connection-tests.spec.ts`)

**Purpose**: Test actual connection functionality with real protocol interactions

**Test Coverage**:
- ✅ SSH connection form and setup
- ✅ VNC connection configuration
- ✅ RDP connection configuration
- ✅ FTP connection configuration
- ✅ Credential vault operations
- ✅ Asset discovery for test network range
- ✅ Port scanning against test hosts
- ✅ SSH workflow execution templates
- ✅ Traffic analysis visualization
- ✅ Dashboard host visibility
- ✅ Quick connect feature
- ✅ Report generation
- ✅ Settings configuration
- ✅ Complete workflow (discover → connect → execute)
- ✅ Performance testing (page load times)
- ✅ UI stability testing (rapid navigation)

**Total Tests**: 16 tests + network validation

## Running the Tests

### Quick Start

```bash
# Run comprehensive test suite with orchestration script
./run-comprehensive-tests.sh
```

This script will:
1. Start NOP main services
2. Start all test environment hosts
3. Verify test host connectivity
4. Install Playwright dependencies if needed
5. Run the complete test suite
6. Generate HTML report
7. Display test results

### Manual Execution

#### Start Services
```bash
# Start NOP platform
docker compose up -d

# Start test environment
cd test-environment
docker compose up -d
cd ..
```

#### Run Specific Test Suites
```bash
cd e2e

# Run comprehensive live hosts test
npx playwright test tests/comprehensive-live-hosts.spec.ts

# Run live connection tests
npx playwright test tests/live-connection-tests.spec.ts

# Run all tests
npx playwright test

# Run with UI mode for debugging
npx playwright test --ui

# Run in headed mode
npx playwright test --headed
```

#### View Test Reports
```bash
# Open HTML report
cd e2e
npx playwright show-report
```

### Environment Setup

#### Prerequisites
```bash
# Install Node.js dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

#### Verify Test Environment
```bash
# Check test hosts are running
cd test-environment
docker compose ps

# Check main services
cd ..
docker compose ps

# Test individual host connectivity
nc -zv 172.21.0.10 22  # SSH
nc -zv 172.21.0.20 80  # Web
nc -zv 172.21.0.30 21  # FTP
nc -zv 172.21.0.40 3306  # MySQL
nc -zv 172.21.0.50 5900  # VNC
nc -zv 172.21.0.60 3389  # RDP
nc -zv 172.21.0.70 445  # SMB
```

## Test Artifacts

### Screenshots
All tests generate screenshots in `e2e/test-results/`:
- `01-authenticated.png` - Authenticated state
- `02-asset-discovery.png` - Asset discovery page
- `03-credential-vault.png` - Credential vault
- `04-ssh-access.png` - SSH access hub
- `05-vnc-access.png` - VNC connection setup
- `06-rdp-access.png` - RDP connection setup
- `07-ftp-access.png` - FTP access
- `09-database-info.png` - Database configuration
- `10-network-scanning.png` - Network scanning
- `11-vulnerability-scanning.png` - Vulnerability scanning
- `12-traffic-analysis.png` - Traffic analysis
- `13-workflow-execution.png` - Workflow execution
- `14-agent-deployment.png` - Agent deployment
- `15-dashboard-overview.png` - Dashboard
- `17-full-integration.png` - Full integration test
- ... and many more from connection tests

### Reports
- **HTML Report**: `e2e/playwright-report/index.html`
- **JSON Results**: `e2e/test-results/*.json`
- **Videos**: `e2e/test-results/*/video.webm` (on failure)
- **Traces**: `e2e/test-results/*/trace.zip` (on retry)

## Test Scenarios

### Scenario 1: Initial Setup and Discovery
1. User logs into NOP
2. System performs network discovery on 172.21.0.0/24
3. All 7+ test hosts are discovered
4. Host details populated (OS, services, ports)

### Scenario 2: Credential Management
1. User navigates to credential vault
2. Adds credentials for test hosts
3. Credentials encrypted and stored
4. Quick connect uses stored credentials

### Scenario 3: Remote Access
1. User selects SSH host from assets
2. Clicks connect via SSH
3. Terminal opens with live connection
4. User executes commands on test host
5. Output displayed in real-time

### Scenario 4: Vulnerability Scanning
1. User initiates vulnerability scan on test network
2. Scanner detects vulnerable vsftpd (CVE-2011-2523)
3. Vulnerability details displayed
4. Exploit availability shown

### Scenario 5: Workflow Automation
1. User creates workflow with SSH nodes
2. Workflow targets test SSH server
3. Executes command on remote host
4. Results captured and displayed
5. Workflow completes successfully

## Continuous Integration

### GitHub Actions Integration

The test suite can be integrated into CI/CD pipeline:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Start services
        run: |
          docker compose up -d
          cd test-environment && docker compose up -d
          sleep 30
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: cd e2e && npx playwright test
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

## Debugging

### Failed Tests
```bash
# Run failed tests in debug mode
npx playwright test --debug

# Run specific test
npx playwright test tests/comprehensive-live-hosts.spec.ts:17 --debug

# Show trace viewer for failed test
npx playwright show-trace e2e/test-results/trace.zip
```

### Network Issues
```bash
# Check Docker networks
docker network ls
docker network inspect test-network

# Verify NOP backend connectivity
curl http://localhost:12001/api/v1/health

# Check test host connectivity from NOP backend
docker exec nop-backend ping -c 3 172.21.0.10
```

### Service Logs
```bash
# Backend logs
docker compose logs -f backend

# Frontend logs
docker compose logs -f frontend

# Test host logs
cd test-environment
docker compose logs ssh-server
docker compose logs vnc-server
docker compose logs rdp-server
```

## Coverage Report

### Feature Coverage Matrix

| Feature | Unit Tests | Integration Tests | E2E Tests | Manual Tests |
|---------|-----------|-------------------|-----------|--------------|
| Authentication | ✅ | ✅ | ✅ | ✅ |
| Asset Discovery | ⚠️ | ✅ | ✅ | ✅ |
| Credential Vault | ✅ | ✅ | ✅ | ✅ |
| SSH Access | ⚠️ | ✅ | ✅ | ✅ |
| VNC Access | ⚠️ | ⚠️ | ✅ | ✅ |
| RDP Access | ⚠️ | ⚠️ | ✅ | ✅ |
| FTP Access | ⚠️ | ⚠️ | ✅ | ✅ |
| Port Scanning | ⚠️ | ✅ | ✅ | ✅ |
| Vuln Scanning | ⚠️ | ⚠️ | ✅ | ✅ |
| Traffic Analysis | ⚠️ | ⚠️ | ✅ | ✅ |
| Workflows | ✅ | ✅ | ✅ | ✅ |
| Agents | ⚠️ | ⚠️ | ✅ | ✅ |
| Reports | ⚠️ | ⚠️ | ✅ | ✅ |

Legend: ✅ Complete | ⚠️ Partial | ❌ Missing

## Known Issues and Limitations

1. **VNC Password Prompt**: VNC connections may prompt for password even when saved in vault
2. **RDP Security Layer**: RDP requires `security=any` in Guacamole for xrdp compatibility
3. **Network Timing**: Some tests may need adjustment for slower systems
4. **Browser Compatibility**: Tests currently run only on Chromium

## Future Enhancements

1. **WebSocket Testing**: Real-time workflow execution monitoring
2. **File Upload/Download**: Test FTP and SMB file operations
3. **Multi-user Tests**: Concurrent user session testing
4. **Performance Benchmarks**: Automated performance regression testing
5. **Accessibility Tests**: ARIA and screen reader compatibility
6. **Mobile Testing**: Responsive design validation

## Contributing

To add new tests:

1. Create test file in `e2e/tests/`
2. Follow existing naming convention: `feature-name.spec.ts`
3. Use shared login helper
4. Add descriptive console logs
5. Generate screenshots for visual verification
6. Update this documentation

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review screenshots: `e2e/test-results/`
- View trace: `npx playwright show-trace <trace.zip>`
- Open issue on GitHub with:
  - Test output
  - Screenshots
  - Service logs
  - Environment details

## License

Same as main NOP project license.
